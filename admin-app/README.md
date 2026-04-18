# Matsal App Admin — admin-app

This is the React source for the Matsal admin dashboard. See the [root README](../README.md) for a full project overview.

## Quick start

```bash
# From the admin-app/ directory
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## Available scripts

| Command | What it does |
|---------|-------------|
| `npm run dev` | Starts the Vite dev server with hot reload |
| `npm run build` | Builds the production bundle into `dist/` |
| `npm run preview` | Serves the production build locally to test before deploying |
| `npm run deploy` | Deploys `dist/` to the `gh-pages` branch on GitHub |
| `npm run lint` | Runs ESLint on all source files |

## Key files

| File | Purpose |
|------|---------|
| `src/App.jsx` | Main dashboard — data fetching, history table, chart, PDF export, auth |
| `src/login.jsx` | Login and register form |
| `src/supabaseClient.js` | Initialises the Supabase client |
| `vite.config.js` | Vite config — sets base path to `/Matsal_app_admin/` for GitHub Pages |

## Notes

- The Supabase URL and anon key are stored directly in `supabaseClient.js`. The anon key is safe to expose in browser code.
- Login requires an account with `approved = true` set in the `profiles` table in Supabase. Set this manually in the Supabase dashboard for any new admin users.
- PDF generation renders hidden off-screen pie charts and captures them with `html2canvas`. If the PDF charts are missing, check the browser console for canvas capture errors.
