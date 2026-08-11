import { ArticleError, getArticles, publishMarkdownArticle } from "@/lib/articles";
import { hasAdminSession } from "@/lib/admin";

export const dynamic = "force-dynamic";

function jsonError(error) {
  const status = error instanceof ArticleError ? error.status : 500;
  const message = error instanceof Error ? error.message : "Unexpected server error.";
  return Response.json({ error: message }, { status });
}

export async function GET() {
  try {
    const articles = await getArticles();
    return Response.json({ articles });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request) {
  try {
    const formData = await request.formData();

    if (!(await hasAdminSession())) {
      throw new ArticleError("Admin session required.", 401);
    }

    const file = formData.get("file");
    if (!file || typeof file.text !== "function") {
      throw new ArticleError("A Markdown file is required.", 400);
    }

    const article = await publishMarkdownArticle({
      fileName: file.name,
      source: await file.text(),
      fields: {
        title: formData.get("title"),
        author: formData.get("author"),
        category: formData.get("category"),
        summary: formData.get("summary"),
        date: formData.get("date")
      }
    });

    return Response.json({ article }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
