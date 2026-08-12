import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArticleError, getArticles } from "@/lib/articles";
import { createNewspaperPages, GRID_COLUMNS, PAGE_HEIGHT } from "@/lib/layout";
import MastheadUnlock from "@/app/components/MastheadUnlock";

export const dynamic = "force-dynamic";

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
      <p>
        Add the values from <code>.env.example</code> in Vercel or <code>.env.local</code>.
      </p>
    </section>
  );
}

function EmptyState() {
  return (
    <section className="notice">
      <p className="kicker">No Articles</p>
      <h2>The press is quiet</h2>
      <p>
        Published Markdown files from the GitHub <code>articles/</code> directory will appear here.
      </p>
    </section>
  );
}

function pageNumberFrom(value) {
  const pageValue = Array.isArray(value) ? value[0] : value;
  const page = Number.parseInt(pageValue || "1", 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

function blockStyle(block) {
  return {
    "--block-left": `${(block.x / GRID_COLUMNS) * 100}%`,
    "--block-top": `${block.y}px`,
    "--block-width": `${(block.w / GRID_COLUMNS) * 100}%`,
    "--block-height": `${block.h}px`,
    "--body-columns": block.bodyColumns || 1
  };
}

function ArticleBlock({ block }) {
  const title = block.continued ? `${block.article.title}, continued` : block.article.title;

  return (
    <article
      className={`layout-block layout-article layout-priority-${Math.min(block.index, 4)}`}
      style={blockStyle(block)}
    >
      {block.showTitle && <h2>{title}</h2>}
      <div className="layout-article-body">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.content}</ReactMarkdown>
      </div>
    </article>
  );
}

function ImageBlock({ block }) {
  return (
    <figure className="layout-block layout-image" style={blockStyle(block)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={block.image.src} alt={block.image.alt} />
      {block.image.title && <figcaption>{block.image.title}</figcaption>}
    </figure>
  );
}

function NewspaperPage({ page, pageNumber, totalPages }) {
  return (
    <section
      className="computed-newspaper-page"
      style={{ "--page-height": `${PAGE_HEIGHT}px` }}
      aria-label={`Newspaper page ${pageNumber}`}
    >
      {page.blocks.map((block) =>
        block.kind === "image" ? (
          <ImageBlock key={`${block.id}-${block.x}-${block.y}`} block={block} />
        ) : (
          <ArticleBlock key={`${block.id}-${block.x}-${block.y}`} block={block} />
        )
      )}

      <div className="computed-page-folio">
        Page {pageNumber} of {totalPages}
      </div>
    </section>
  );
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

  const pages = error || articles.length === 0 ? [] : createNewspaperPages(articles);
  const totalPages = Math.max(1, pages.length);
  const currentPage = Math.min(requestedPage, totalPages);
  const page = pages[currentPage - 1];

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
          <NewspaperPage page={page} pageNumber={currentPage} totalPages={totalPages} />

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
