import Link from "next/link";

export default function NotFound() {
  return (
    <main className="paper-shell">
      <section className="notice">
        <p className="kicker">404</p>
        <h1>Article Not Found</h1>
        <p>The requested article is not in the current edition.</p>
        <Link className="button" href="/">Return home</Link>
      </section>
    </main>
  );
}
