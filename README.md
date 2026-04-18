# Matsal App Admin

The admin dashboard for the [Matsal App](https://github.com/luckan/Matsal_app). Shows food waste statistics collected from the kiosk — per day, as pie charts, and as downloadable PDF reports.

## What it does

- Displays today's button-click totals in a summary table at the top
- Shows a scrollable history table for the last 7, 14, 30, 90, 180, or 365 days, sorted newest first
- Lets you click any row to see a pie chart showing the distribution of responses for that day
- Generates a styled PDF report for the selected date range — one page per day, with a header, pie chart, and colour-coded statistics

Access is restricted: only Supabase users with `approved = true` in the `profiles` table can log in.

## Tech stack

- **React 19** — UI framework
- **Vite** — build tool and dev server
- **Supabase** — reads from the same PostgreSQL database as the kiosk app
- **Recharts** — pie chart rendering
- **jsPDF** — PDF document creation
- **html2canvas** — captures rendered pie charts as images for embedding in PDFs
- **GitHub Pages** — hosting

## Project structure

```
Matsal_app_admin/
└── admin-app/               # The React application
    ├── src/
    │   ├── main.jsx         # React entry point
    │   ├── App.jsx          # Dashboard — data fetching, charts, PDF export, auth
    │   ├── App.css          # Dashboard styling
    │   ├── login.jsx        # Login / register form
    │   ├── login.css        # Login styling
    │   ├── index.css        # Global styles
    │   └── supabaseClient.js# Supabase client initialisation
    ├── index.html
    ├── package.json
    └── vite.config.js       # Base path set to /Matsal_app_admin/ for GitHub Pages
```

## How the code works

### Authentication

The same auth flow as the kiosk app: checks `supabase.auth.getSession()`, verifies `profiles.approved = true`, and signs out any unapproved user. An `onAuthStateChange` listener keeps session state live.

### Data fetching

`fetchClicks(limitDays)` in `App.jsx` queries the `daily_clicks` table ordered by date descending and limited to the selected number of days. The result drives both the history table and the pie chart.

### History table

Rows are displayed newest-first. Clicking a row selects that day and switches to the chart view. The currently selected row is highlighted in blue.

### Chart view

Uses Recharts `PieChart` with four colour-coded slices — one per button from the kiosk. Percentage labels are rendered directly on the slices. Below the chart, a summary section shows the counts for the selected day and, if different, the totals across the whole selected period.

### PDF generation

When "Ladda ner data" is clicked, a popup lets you choose how many days to include (7 – 365) and give the PDF a custom filename.

Generating the PDF:
1. A set of hidden `DailyPieChartForPDF` components is always rendered off-screen — one per day in the current range. These are full-size pie charts that `html2canvas` can capture cleanly.
2. `generatePDF` loops over each day and adds a new page for it. Each page has:
   - A purple header bar with "Matsal Statistik"
   - The full date in Swedish (weekday, day, month, year)
   - A "Totalt: X svar" badge
   - The pie chart (captured from the hidden component and embedded as an image)
   - Four coloured stat rows showing the count and percentage for each reason
3. The PDF is saved with the chosen filename.

### Database tables

Both tables are shared with the kiosk app:

**`profiles`**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Matches the Supabase auth user ID |
| approved | boolean | Must be `true` to access the dashboard |

**`daily_clicks`**
| Column | Type | Description |
|--------|------|-------------|
| day | date | Primary key — one row per calendar day |
| one | integer | Count for "Hann inte äta" |
| two | integer | Count for "Tog för mycket" |
| three | integer | Count for "Ogillade maten" |
| four | integer | Count for "Slängde inte" |

## Running locally

### Requirements

- [Node.js](https://nodejs.org/) (v18 or newer)
- [npm](https://www.npmjs.com/) (included with Node.js)
- A code editor — [Visual Studio Code](https://code.visualstudio.com/) is recommended

### Steps

1. Clone the repository:
   ```bash
   git clone https://github.com/<your-username>/Matsal_app_admin.git
   cd Matsal_app_admin/admin-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and go to `http://localhost:5173`

The dev server supports Hot Module Replacement (HMR) — changes are reflected instantly without a full page reload.

### In Visual Studio Code

1. Open the `Matsal_app_admin` folder in VS Code (`File > Open Folder`).
2. Open the integrated terminal (`Ctrl + `` ` ``).
3. Navigate into the app folder and run the commands above:
   ```bash
   cd admin-app
   npm install
   npm run dev
   ```
4. Click the `http://localhost:5173` link that appears in the terminal, or open it manually in your browser.

## Deployment

```bash
cd admin-app
npm run build   # Builds the production bundle into dist/
npm run deploy  # Pushes dist/ to the gh-pages branch on GitHub
```

The `vite.config.js` sets `base: "/Matsal_app_admin/"` so all asset paths match the GitHub Pages URL.
