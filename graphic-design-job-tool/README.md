# Design Apply Hub

A zero-API-key, browser-only global graphic design job application tool.

## Local preview

Run from this folder:

```powershell
python -m http.server 5500
```

Open:

- http://localhost:5500/index.html

## Free hosting options

## 1) Vercel (recommended, no config)
1. Upload this folder to GitHub as a repo (all files in repo root).
2. Go to [https://vercel.com/new](https://vercel.com/new) and import that repo.
3. Set:
   - Framework preset: `Other`
   - Root Directory: `.`
   - Build Command: *(leave empty)*
   - Output Directory: *(leave empty)*
4. Click Deploy.

## 2) GitHub Pages (free)
1. Create a GitHub repo and upload all files in this folder.
2. Repo Settings -> Pages -> Deploy from `main` branch root.
3. Your app URL will be `https://<username>.github.io/<repo>/`.

## 3) Cloudflare Pages (free)
1. Create a Pages project.
2. Connect GitHub repo.
3. Build command: none, Output directory: `/`.

## Notes
- No backend is required.
- Browser localStorage keeps profile and progress private on the same browser.
- If one feed fails due to CORS, fallback jobs and curated links still keep app usable.
- No `vercel.json` or `netlify.toml` is required.
