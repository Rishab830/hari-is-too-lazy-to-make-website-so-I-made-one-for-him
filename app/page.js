import { ArticleError, getArticles } from "@/lib/articles";
import MastheadUnlock from "@/app/components/MastheadUnlock";
import NewspaperLayout from "@/app/components/NewspaperLayout";

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

export default async function HomePage({ searchParams }) {
  let articles = [];
  let error = null;
  const requestedPage = pageNumberFrom((await searchParams)?.page);

  try {
    articles = await getArticles();
  } catch (caught) {
    error = caught;
  }

  return (
    <main className="paper-shell">
      <header className={requestedPage > 1 ? "masthead masthead-compact" : "masthead"}>
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
        <NewspaperLayout articles={articles} requestedPage={requestedPage} />
      )}
    </main>
  );
}
