import matter from "gray-matter";

const ARTICLES_DIR = "articles";
const GITHUB_API = "https://api.github.com";

export class ArticleError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.name = "ArticleError";
    this.status = status;
  }
}

function getGithubConfig({ requireToken = false } = {}) {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";
  const token = process.env.GITHUB_TOKEN;

  if (!owner || !repo) {
    throw new ArticleError("GitHub repository settings are missing.", 503);
  }

  if (requireToken && !token) {
    throw new ArticleError("GitHub write token is missing.", 503);
  }

  return { owner, repo, branch, token };
}

async function githubRequest(endpoint, options = {}) {
  const { requireToken = false, method = "GET", body } = options;
  const { token } = getGithubConfig({ requireToken });

  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "hari-newspaper",
    "X-GitHub-Api-Version": "2022-11-28"
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${GITHUB_API}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store"
  });

  if (!response.ok) {
    let message = `GitHub request failed with status ${response.status}.`;

    try {
      const payload = await response.json();
      if (payload?.message) {
        message = payload.message;
      }
    } catch {
      const text = await response.text();
      if (text) {
        message = text;
      }
    }

    throw new ArticleError(message, response.status);
  }

  return response.json();
}

function repoContentEndpoint(path, branch) {
  const { owner, repo } = getGithubConfig();
  return `/repos/${owner}/${repo}/contents/${path}?ref=${encodeURIComponent(branch)}`;
}

function repoWriteEndpoint(path) {
  const { owner, repo } = getGithubConfig();
  return `/repos/${owner}/${repo}/contents/${path}`;
}

function decodeBase64(value) {
  return Buffer.from(value.replace(/\n/g, ""), "base64").toString("utf8");
}

function encodeBase64(value) {
  return Buffer.from(value, "utf8").toString("base64");
}

function cleanText(value) {
  return String(value || "").trim();
}

function cleanDate(value) {
  if (!value) {
    return "";
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "" : value.toISOString().slice(0, 10);
  }

  const text = cleanText(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? text : parsed.toISOString().slice(0, 10);
}

function firstMarkdownHeading(content) {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? cleanText(match[1]) : "";
}

export function slugify(value) {
  const slug = cleanText(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return slug || "article";
}

function normalizeArticle(raw, fallbackSlug = "") {
  const parsed = matter(raw);
  const slug = slugify(parsed.data.slug || fallbackSlug);
  const title = cleanText(parsed.data.title) || firstMarkdownHeading(parsed.content) || fallbackSlug;
  const date = cleanDate(parsed.data.date);

  return {
    title: title || "Untitled Article",
    author: cleanText(parsed.data.author) || "Staff",
    category: cleanText(parsed.data.category) || "News",
    summary: cleanText(parsed.data.summary) || firstParagraph(parsed.content),
    date,
    slug,
    content: parsed.content.trim()
  };
}

function firstParagraph(content) {
  return (
    content
      .split(/\n{2,}/)
      .map((part) => part.replace(/^#+\s*/, "").trim())
      .find(Boolean) || ""
  );
}

async function listArticleFiles() {
  const { branch } = getGithubConfig();

  try {
    const contents = await githubRequest(repoContentEndpoint(ARTICLES_DIR, branch));
    if (!Array.isArray(contents)) {
      return [];
    }

    return contents.filter((item) => item.type === "file" && item.name.endsWith(".md"));
  } catch (error) {
    if (error instanceof ArticleError && error.status === 404) {
      return [];
    }

    throw error;
  }
}

async function fetchArticleFile(path) {
  const { branch } = getGithubConfig();
  const file = await githubRequest(repoContentEndpoint(path, branch));

  if (!file?.content) {
    throw new ArticleError("Article file has no readable content.", 502);
  }

  return decodeBase64(file.content);
}

export async function getArticles() {
  const files = await listArticleFiles();
  const articles = await Promise.all(
    files.map(async (file) => {
      const raw = await fetchArticleFile(file.path);
      return normalizeArticle(raw, file.name.replace(/\.md$/, ""));
    })
  );

  return articles
    .map(({ content, ...metadata }) => metadata)
    .sort((a, b) => {
      const dateCompare = String(b.date || "").localeCompare(String(a.date || ""));
      return dateCompare || a.title.localeCompare(b.title);
    });
}

export async function getArticleBySlug(slug) {
  const safeSlug = slugify(slug);
  const raw = await fetchArticleFile(`${ARTICLES_DIR}/${safeSlug}.md`);
  return normalizeArticle(raw, safeSlug);
}

async function uniqueSlug(baseSlug) {
  const files = await listArticleFiles();
  const used = new Set(files.map((file) => file.name.replace(/\.md$/, "")));

  if (!used.has(baseSlug)) {
    return baseSlug;
  }

  let index = 2;
  while (used.has(`${baseSlug}-${index}`)) {
    index += 1;
  }

  return `${baseSlug}-${index}`;
}

export async function publishMarkdownArticle({ fileName, source, fields }) {
  if (!fileName || !fileName.toLowerCase().endsWith(".md")) {
    throw new ArticleError("Only Markdown .md files can be uploaded.", 400);
  }

  const parsed = matter(source || "");
  const title = cleanText(fields.title) || cleanText(parsed.data.title) || firstMarkdownHeading(parsed.content);
  const author = cleanText(fields.author) || cleanText(parsed.data.author);
  const category = cleanText(fields.category) || cleanText(parsed.data.category);
  const summary = cleanText(fields.summary) || cleanText(parsed.data.summary);
  const date = cleanDate(fields.date) || cleanDate(parsed.data.date) || new Date().toISOString().slice(0, 10);

  if (!title || !author || !category || !summary) {
    throw new ArticleError("Title, author, category, and summary are required.", 400);
  }

  const slug = await uniqueSlug(slugify(title));
  const normalized = matter.stringify(`${parsed.content.trim()}\n`, {
    ...parsed.data,
    title,
    author,
    category,
    summary,
    date,
    slug
  });

  const { branch } = getGithubConfig({ requireToken: true });
  const path = `${ARTICLES_DIR}/${slug}.md`;
  const result = await githubRequest(repoWriteEndpoint(path), {
    method: "PUT",
    requireToken: true,
    body: {
      message: `Publish article: ${title}`,
      content: encodeBase64(normalized),
      branch
    }
  });

  return {
    title,
    author,
    category,
    summary,
    date,
    slug,
    path,
    commit: result.commit?.sha || ""
  };
}
