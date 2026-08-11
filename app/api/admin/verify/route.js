import { ArticleError } from "@/lib/articles";
import { isValidAdminPasscode, setAdminSessionCookie } from "@/lib/admin";

export async function POST(request) {
  try {
    const payload = await request.json();

    if (!isValidAdminPasscode(payload?.passcode)) {
      throw new ArticleError("Invalid admin password.", 401);
    }

    await setAdminSessionCookie();
    return Response.json({ ok: true });
  } catch (error) {
    const status = error instanceof ArticleError ? error.status : 400;
    const message = error instanceof Error ? error.message : "Unable to verify admin password.";
    return Response.json({ error: message }, { status });
  }
}
