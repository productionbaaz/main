# Baaz Portal — React app

Real React project (Vite). GitHub builds it automatically on every push —
you never run a build command yourself.

## One-time setup on GitHub

1. **Replace everything in your repo** with the contents of this folder
   (all files and folders, including the hidden `.github` folder and
   `.gitignore` — don't skip those, the workflow lives in `.github`).
2. Go to **Settings → Pages** in your repo.
3. Under **Build and deployment → Source**, change it from
   "Deploy from a branch" to **"GitHub Actions"**. This is required —
   the old branch-based Pages setup won't run the build.
4. Push/commit. Go to the **Actions** tab and watch the "Build and
   deploy Baaz Portal" workflow run (takes ~1 minute). Once it's green,
   your site is live.

## After that

Every time you (or I) push a change to the `main` branch, GitHub
automatically reinstalls dependencies, rebuilds the app, and redeploys
it — no manual build step, ever.

- Employee login: `https://<you>.github.io/main/`
- Manager/CEO login: `https://<you>.github.io/main/manager.html`

## If the Actions build fails

Click into the failed run in the **Actions** tab, open the red step,
and copy the error text — send it over and it can be fixed directly in
the source, no local setup needed on your end.

## Backend

Unrelated to this repo — the Apps Script backend (`Code.gs` /
`SeedData.gs`) still lives in Google Apps Script and is updated there
directly, the same way as before.
