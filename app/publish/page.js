import Link from "next/link";
import { notFound } from "next/navigation";
import { hasAdminSession } from "@/lib/admin";
import PublishForm from "./PublishForm";

export const dynamic = "force-dynamic";

export default async function PublishPage() {
  if (!(await hasAdminSession())) {
    notFound();
  }

  return (
    <main className="paper-shell publish-shell">
      <header className="article-header">
        <Link className="back-link" href="/">Back to front page</Link>
        <p className="kicker">Publish Desk</p>
        <h1>File The Story</h1>
      </header>

      <PublishForm />
    </main>
  );
}
