"use client";

import Link from "next/link";
import { useState } from "react";

const initialState = {
  title: "",
  author: "",
  category: "",
  summary: "",
  date: new Date().toISOString().slice(0, 10),
  passcode: ""
};

export default function PublishPage() {
  const [fields, setFields] = useState(initialState);
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState({ type: "idle", message: "" });
  const [published, setPublished] = useState(null);

  function updateField(event) {
    setFields((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  }

  async function submitArticle(event) {
    event.preventDefault();
    setStatus({ type: "loading", message: "Publishing article..." });
    setPublished(null);

    const formData = new FormData();
    Object.entries(fields).forEach(([key, value]) => formData.append(key, value));

    if (file) {
      formData.append("file", file);
    }

    const response = await fetch("/api/articles", {
      method: "POST",
      body: formData
    });
    const payload = await response.json();

    if (!response.ok) {
      setStatus({ type: "error", message: payload.error || "Publishing failed." });
      return;
    }

    setStatus({ type: "success", message: "Article published." });
    setPublished(payload.article);
    setFields(initialState);
    setFile(null);
    event.currentTarget.reset();
  }

  return (
    <main className="paper-shell publish-shell">
      <header className="article-header">
        <Link className="back-link" href="/">Back to front page</Link>
        <p className="kicker">Publish Desk</p>
        <h1>File The Story</h1>
      </header>

      <form className="publish-form" onSubmit={submitArticle}>
        <label>
          Title
          <input name="title" value={fields.title} onChange={updateField} required />
        </label>

        <div className="form-grid">
          <label>
            Author
            <input name="author" value={fields.author} onChange={updateField} required />
          </label>
          <label>
            Category
            <input name="category" value={fields.category} onChange={updateField} required />
          </label>
        </div>

        <label>
          Summary
          <textarea name="summary" value={fields.summary} onChange={updateField} rows="4" required />
        </label>

        <div className="form-grid">
          <label>
            Date
            <input name="date" type="date" value={fields.date} onChange={updateField} required />
          </label>
          <label>
            Passcode
            <input name="passcode" type="password" value={fields.passcode} onChange={updateField} required />
          </label>
        </div>

        <label>
          Markdown file
          <input
            name="file"
            type="file"
            accept=".md,text/markdown"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
            required
          />
        </label>

        <button className="button" type="submit" disabled={status.type === "loading"}>
          {status.type === "loading" ? "Publishing..." : "Publish article"}
        </button>

        {status.message && (
          <p className={`form-status ${status.type}`} role="status">
            {status.message}
          </p>
        )}

        {published && (
          <Link className="published-link" href={`/article/${published.slug}`}>
            Read {published.title}
          </Link>
        )}
      </form>
    </main>
  );
}
