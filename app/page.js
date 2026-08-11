import Link from "next/link";
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
    String(article.summary || "").length * 1.35 +
    Math.min(Number(article.articleLength) || 0, 1200) * 0.28
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
  const rows = Math.max(4, Math.min(9, Math.round(score / 82)));
  const shouldGoWide = score > 575 || (score > 470 && index % 3 === 1);
  const shouldGoTall = score > 500 || index % 5 === 2;

  return {
    className: shouldGoWide ? "article-card-wide" : "article-card-narrow",
    style: {
      "--story-rows": shouldGoTall ? rows + 1 : rows
    }
  };
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
              <p className="kicker">{lead.category}</p>
              <h2>
                <Link href={`/article/${lead.slug}`}>{lead.title}</Link>
              </h2>
              <p className="summary">{lead.summary}</p>
              <div className="byline">
                <span>{lead.author}</span>
                <span>{formatDate(lead.date)}</span>
              </div>
            </article>
            <aside className="index-box">
              <p className="kicker">Index</p>
              {articles.slice(0, 6).map((article) => (
                <Link key={article.slug} href={`/article/${article.slug}`}>
                  <span>{article.category}</span>
                  {article.title}
                </Link>
              ))}
            </aside>
          </section>

          {pageArticles.length > 0 && (
            <section className="article-grid" aria-label="More articles">
              {pageArticles.map((article, index) => {
                const layout = articleLayout(article, index);

                return (
                <article key={article.slug} className={`article-card ${layout.className}`} style={layout.style}>
                  <p className="kicker">{article.category}</p>
                  <h2>
                    <Link href={`/article/${article.slug}`}>{article.title}</Link>
                  </h2>
                  <p>{article.summary}</p>
                  <div className="byline">
                    <span>{article.author}</span>
                    <span>{formatDate(article.date)}</span>
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
