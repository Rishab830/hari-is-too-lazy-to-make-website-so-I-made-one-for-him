# The Hari Herald

A newspaper-style Next.js site for reading public Markdown articles and publishing new articles into a GitHub repository.

The front page uses a server-side computed layout engine. Articles are sorted by date, assigned widths on a 6-column grid, packed into fixed-height newspaper pages, and continued onto later pages when they overflow.

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local` from `.env.example`:

   ```bash
   ADMIN_PASSCODE=change-this-passcode
   GITHUB_TOKEN=github_pat_with_contents_write_access
   GITHUB_OWNER=your-github-username-or-org
   GITHUB_REPO=your-articles-repo
   GITHUB_BRANCH=main
   ```

3. Run the app:

   ```bash
   npm run dev
   ```

## Article Storage

Articles are stored as Markdown files in the configured GitHub repository under:

```text
articles/
```

The publish form accepts only `.md` files. It writes normalized frontmatter with `title`, `author`, `category`, `date`, and `slug`.

To open the publish form, click the masthead title five times within five seconds and enter the admin password in the newspaper-styled access form.

## Validation

```bash
npm run lint
npm run build
npm audit
```
