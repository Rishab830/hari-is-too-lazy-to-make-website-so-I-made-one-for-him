import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArticleError, getArticleBySlug } from "@/lib/articles";

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

export default async function ArticlePage({ params }) {
  const { slug } = await params;
  let article;

  try {
    article = await getArticleBySlug(slug);
  } catch (error) {
    if (error instanceof ArticleError && error.status === 404) {
      notFound();
    }

    throw error;
  }

  return (
    <main className="paper-shell article-shell">
      <header className="article-header">
        <Link className="back-link" href="/">Back to front page</Link>
        <p className="kicker">{article.category}</p>
        <h1>{article.title}</h1>
        <p className="summary">{article.summary}</p>
        <div className="byline">
          <span>{article.author}</span>
          <span>{formatDate(article.date)}</span>
        </div>
      </header>
      <article className="article-body">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{article.content}</ReactMarkdown>
      </article>
    </main>
  );
}
