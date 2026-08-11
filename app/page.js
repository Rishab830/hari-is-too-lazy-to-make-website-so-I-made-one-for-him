import Link from "next/link";
import { ArticleError, getArticles } from "@/lib/articles";

export const dynamic = "force-dynamic";

function formatDate(value) {
  if (!value) {
    return "Undated";
  }

  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(new Date(`${value}T00:00:00`));
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
      <Link className="button" href="/publish">Open publish desk</Link>
    </section>
  );
}

export default async function HomePage() {
  let articles = [];
  let error = null;

  try {
    articles = await getArticles();
  } catch (caught) {
    error = caught;
  }

  const lead = articles[0];
  const rest = articles.slice(1);

  return (
    <main className="paper-shell">
      <header className="masthead">
        <div className="masthead-top">
          <span>Independent Edition</span>
          <span>{formatDate(new Date().toISOString().slice(0, 10))}</span>
          <Link href="/publish">Publish</Link>
        </div>
        <h1>The Hari Herald</h1>
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

          {rest.length > 0 && (
            <section className="article-grid" aria-label="More articles">
              {rest.map((article) => (
                <article key={article.slug} className="article-card">
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
              ))}
            </section>
          )}
        </>
      )}
    </main>
  );
}
