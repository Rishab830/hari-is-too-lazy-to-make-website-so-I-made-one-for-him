import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArticleError, getArticles } from "@/lib/articles";
import MastheadUnlock from "@/app/components/MastheadUnlock";

export const dynamic = "force-dynamic";

const NEWSPAPER_PAGE_LENGTH_BUDGET = 4200;

function formatDate(value) {
  if (!value) {
    return "Undated";
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return "Undated";
  }

  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function SetupNotice({ message }) {
  return (
    <section className="notice">
      <p className="kicker">Configuration</p>
      <h2>GitHub article source is not connected</h2>
      <p>{message}</p>
      <p>Add the values from <code>.env.example</code> in Vercel or <code>.env.local</code>.</p>
    </section>
  );
}

function EmptyState() {
  return (
    <section className="notice">
      <p className="kicker">No Articles</p>
      <h2>The press is quiet</h2>
      <p>Published Markdown files from the GitHub <code>articles/</code> directory will appear here.</p>
    </section>
  );
}

function pageNumberFrom(value) {
  const pageValue = Array.isArray(value) ? value[0] : value;
  const page = Number.parseInt(pageValue || "1", 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

function articleLengthScore(article) {
  return (
    170 +
    String(article.title || "").length * 1.6 +
    Math.min(Number(article.articleLength) || 0, 2400) * 0.85
  );
}

function paginateArticlesByLength(articles) {
  const pages = [];
  let page = [];
  let pageLength = 0;

  articles.forEach((article) => {
    const articleLength = articleLengthScore(article);

    if (page.length > 0 && pageLength + articleLength > NEWSPAPER_PAGE_LENGTH_BUDGET) {
      pages.push(page);
      page = [];
      pageLength = 0;
    }

    page.push(article);
    pageLength += articleLength;
  });

  if (page.length > 0) {
    pages.push(page);
  }

  return pages;
}

function articleLayout(article, index) {
  const score = articleLengthScore(article);
  const shouldGoSplash = score > 1100 || index === 3;
  const shouldGoWide = score > 760 || index % 4 === 1;
  const shouldGoColumn = score < 620 && index % 3 !== 0;

  if (shouldGoSplash) {
    return "article-card-splash";
  }

  if (shouldGoWide) {
    return "article-card-wide";
  }

  if (shouldGoColumn) {
    return "article-card-column";
  }

  return "article-card-standard";
}

function articleBodyColumns(article) {
  const length = Number(article.articleLength) || 0;

  if (length > 950) {
    return "article-card-body-3";
  }

  if (length > 560) {
    return "article-card-body-2";
  }

  return "article-card-body-1";
}

export default async function HomePage({ searchParams }) {
  let articles = [];
  let error = null;
  const requestedPage = pageNumberFrom((await searchParams)?.page);

  try {
    articles = await getArticles();
  } catch (caught) {
    error = caught;
  }

  const lead = articles[0];
  const rest = articles.slice(1);
  const articlePages = paginateArticlesByLength(rest);
  const totalPages = Math.max(1, articlePages.length);
  const currentPage = Math.min(requestedPage, totalPages);
  const pageArticles = articlePages[currentPage - 1] || [];

  return (
    <main className="paper-shell">
      <header className="masthead">
        <div className="masthead-top">
          <span>Independent Edition</span>
          <span>{formatDate(new Date().toISOString().slice(0, 10))}</span>
          <span>Public Dispatch</span>
        </div>
        <MastheadUnlock />
        <p>News, notes, and dispatches</p>
      </header>

      {error ? (
        <SetupNotice message={error instanceof ArticleError ? error.message : "Unable to load articles."} />
      ) : articles.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <section className="lead-grid">
            <article className="lead-story">
              <h2>{lead.title}</h2>
              <div className={`article-card-body ${articleBodyColumns(lead)}`}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{lead.content}</ReactMarkdown>
              </div>
            </article>
            <aside className="index-box">
              <p className="kicker">Index</p>
              {articles.slice(0, 6).map((article) => (
                <div key={article.slug}>
                  <span>{article.category}</span>
                  {article.title}
                </div>
              ))}
            </aside>
          </section>

          {pageArticles.length > 0 && (
            <section className="article-grid" aria-label="More articles">
              {pageArticles.map((article, index) => {
                const layout = articleLayout(article, index);

                return (
                  <article key={article.slug} className={`article-card ${layout}`}>
                    <h2>{article.title}</h2>
                    <div className={`article-card-body ${articleBodyColumns(article)}`}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{article.content}</ReactMarkdown>
                    </div>
                  </article>
                );
              })}
            </section>
          )}

          {totalPages > 1 && (
            <nav className="edition-pagination" aria-label="Newspaper pages">
              <Link
                className={currentPage === 1 ? "pagination-link disabled" : "pagination-link"}
                href={currentPage === 1 ? "/" : `/?page=${currentPage - 1}`}
                aria-disabled={currentPage === 1}
              >
                Previous page
              </Link>
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <Link
                className={currentPage === totalPages ? "pagination-link disabled" : "pagination-link"}
                href={currentPage === totalPages ? `/?page=${currentPage}` : `/?page=${currentPage + 1}`}
                aria-disabled={currentPage === totalPages}
              >
                Next page
              </Link>
            </nav>
          )}
        </>
      )}
    </main>
  );
}
