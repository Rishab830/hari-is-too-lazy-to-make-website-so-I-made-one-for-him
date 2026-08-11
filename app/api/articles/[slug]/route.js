import { ArticleError, getArticleBySlug } from "@/lib/articles";

export const dynamic = "force-dynamic";

export async function GET(_request, context) {
  try {
    const { slug } = await context.params;
    const article = await getArticleBySlug(slug);
    return Response.json({ article });
  } catch (error) {
    const status = error instanceof ArticleError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return Response.json({ error: message }, { status });
  }
}
