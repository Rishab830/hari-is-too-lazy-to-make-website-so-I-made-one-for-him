# Newspaper Article Website Plan

## Summary
Build a real Next.js app from the empty workspace, deployed on Vercel, with a public newspaper-style article reader and a passcode-protected upload page. There will be no user accounts. Uploaded `.md` files will be committed to a GitHub repository, then read back from GitHub for public display.

## Key Changes
- Create a Next.js app with:
  - Public home page showing all full articles in a computed newspaper layout.
  - Protected `/publish` page with an admin passcode, metadata fields, and Markdown file upload.
- Use a rich cream paper visual style:
  - Paper-texture background using CSS.
  - Times New Roman headings.
  - Clean serif editorial layout.
  - Elevated buttons with sharp, pointed shadows.
- Store articles in GitHub under an `articles/` directory as Markdown files with frontmatter:
  - `title`, `author`, `category`, `date`, `slug`.
  - Body content comes directly from the uploaded Markdown file.
- Add server routes:
  - `GET /api/articles` lists full articles from GitHub.
  - `POST /api/articles` validates passcode, validates the `.md` upload, normalizes frontmatter, and commits it to GitHub.
- Add a server-side layout engine:
  - Sort articles by date, extract Markdown images, assign 6-column grid widths by recency, pack blocks with a guillotine-style rectangle allocator, and spill text continuations onto later newspaper pages.

## Implementation Details
- Use Vercel environment variables:
  - `ADMIN_PASSCODE`
  - `GITHUB_TOKEN`
  - `GITHUB_OWNER`
  - `GITHUB_REPO`
  - `GITHUB_BRANCH`
- Use the GitHub Contents API from server-side code only; no GitHub token is exposed to the browser.
- Accept only `.md` files.
- Generate URL-safe slugs from titles, with duplicate handling by appending the date or a numeric suffix.
- If the uploaded Markdown already has frontmatter, merge it with the publish form fields, with form fields taking priority.
- Show helpful upload errors for invalid passcode, unsupported file type, missing metadata, duplicate commit conflicts, or GitHub API failure.

## Test Plan
- Verify public users can read all article contents on the homepage without any passcode.
- Verify upload rejects wrong passcodes and non-`.md` files.
- Verify valid Markdown upload creates a file in GitHub and appears in the article list.
- Verify Markdown frontmatter is parsed and normalized correctly.
- Verify duplicate titles do not overwrite existing articles.
- Verify production build succeeds locally before deployment.

## Assumptions
- The GitHub repository will be used as the source of truth for articles.
- Only one trusted publisher needs access, protected by a shared admin passcode.
- Uploaded Markdown files are stored directly after frontmatter normalization.
- DOCX and TXT upload support is removed.
- Vercel is the deployment target.
