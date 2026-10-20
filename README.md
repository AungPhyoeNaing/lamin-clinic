# La Min Clinic Ledger — လမင်း ဆေးခန်း

A mobile-first daily ledger for La Min traditional clinic, Mandalay. Replaces the paper book:
record patient name (လူနာအမည်), age (အသက်), diagnosis (ရောဂါ), and fee (ကုသခ) — with a daily
total, monthly reports, CSV/print exports, offline/local support, and optional cloud sync with Supabase.

- **Bilingual**: Burmese + English throughout
- **Two operating modes**:
  - **Local Mode (Default)**: Zero setup, works instantly, stores data in browser `localStorage`.
  - **Cloud Sync Mode**: Uses Supabase (PostgreSQL + Auth + Row Level Security).
- **Installable (PWA)**: Add it to the phone home screen and it opens full-screen like a native app.
- **Offline support**: Service worker caches the app shell and assets.
- **Zero or ultra-low cost**: Runs on Supabase free tier (500MB database, 50,000 monthly active users).

---

## 1. Quick Start (Local Mode — No Account Needed)

To run the app immediately on your computer without configuring any database:

```sh
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev
```

Open `http://localhost:5173` in your browser.
- The app runs in **Local Mode** whenever `VITE_SUPABASE_URL` is empty.
- Data is stored locally in your browser's `localStorage`.
- You can navigate to `/login` or use the staff shield in the feed header to access `/admin`.
- In Local Mode, entering any email/password logs in locally as admin.
- Use **Settings → Backup (JSON / CSV)** to export your data.

---

## 2. Cloud Sync Setup (Supabase)

To enable multi-device sync, secure authentication, and cloud storage:

### Step 1: Create a Supabase Project
1. Go to [supabase.com](https://supabase.com) and create an account or sign in.
2. Click **New Project**.
3. Choose a name (e.g. `la-min-clinic`), a strong database password, and choose a region close to Myanmar (e.g., **Singapore / Southeast Asia**).
4. Wait 1–2 minutes for the database to provision.

### Step 2: Initialize Database Schema & RLS Policies
1. In your Supabase dashboard, click on the **SQL Editor** tab (left sidebar).
2. Open the file `supabase/schema.sql` from this repository.
3. Paste the contents into the SQL Editor and click **Run**.
   - This creates the `visits` and `articles` tables.
   - This enables Row Level Security (RLS) so that patient visit records are private to authenticated staff, while articles can be read publicly.
4. Run `supabase/feed.sql` next to enable the knowledge feed, media bucket, and view counters. Existing deployments also need this migration before deploying the updated app.

### Step 3: Create the Doctor / Admin Account
1. In the Supabase dashboard, go to **Authentication** (left sidebar) → **Users**.
2. Click **Add User** → **Create User**.
3. Enter the doctor's email (e.g. `doctor@laminclinic.com`) and password.
4. Disable **Allow new users to sign up** in Supabase Authentication settings. Keep email confirmation enabled.
5. Approve each staff account in the SQL editor after creating it:
   ```sql
   insert into public.staff (user_id)
   select id from auth.users where email = 'doctor@laminclinic.com'
   on conflict do nothing;
   ```
   Signing in alone does not grant access. Only approved staff can access visits or write articles.

For an existing deployment, rerun `supabase/schema.sql` and approve staff **before deploying the updated app**. The script replaces the original broad policies, adds the staff check and atomic restore function, and preserves existing records. Back up existing data first. New validation constraints check future writes; review legacy data before validating them across existing rows.

### Step 4: Configure Environment Variables
1. In your Supabase dashboard, go to **Project Settings** (gear icon) → **API**.
2. Copy the **Project URL** and the **anon (public)** key.
3. In the project root folder, copy `.env.example` to `.env`:
   ```sh
   cp .env.example .env
   ```
4. Edit `.env` and fill in your values:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...your-anon-key
   ```

### Step 5: Start the App & Sign In
```sh
npm run dev
```
1. Open `http://localhost:5173`.
2. Use the staff shield in the feed header (or go to `/login`).
3. Sign in using the doctor email and password created in Step 3.
4. You will be redirected to `/admin` with full access to the Ledger, Reports, and Settings!

---

## 3. Production Deployment (Vercel)

The repository includes `vercel.json` with client-side routing and a same-origin Supabase proxy. Browser requests to `/clinic-api/auth/v1`, `/clinic-api/rest/v1`, and `/clinic-api/storage/v1` are forwarded by Vercel to the existing Supabase project. Sign-in, staff checks, feed data, view counts, uploads, and generated image/video URLs all use the website domain. Existing accounts, data, RLS policies, and project-specific browser sessions are preserved. Only the public anon key is used; never add a service-role key to Vite variables.

The three external rewrite destinations are pinned to the current project. Keep `VITE_SUPABASE_URL` set to the original Supabase project URL, not the website URL or `/clinic-api`. If you change projects, update all three destinations in `vercel.json` too; the build rejects mismatches. Vite development and preview servers proxy the same paths using the environment URL.

Proxy responses disable browser/CDN caching, and the service worker excludes proxy paths from its HTML navigation fallback. These are external rewrites rather than Vercel Functions, so uploads do not pass through a Function's 4.5 MB payload limit. The app's existing 8 MB photo / 30 MB video limits still apply. Vercel's external proxy timeout is 120 seconds; slow uploads can still time out, and proxy traffic uses the deployment's bandwidth allocation. The app reports stalled connections instead of leaving sign-in loading indefinitely.

### Deploying via Vercel Dashboard:
1. Push your repository to GitHub, GitLab, or Bitbucket.
2. Go to [vercel.com](https://vercel.com) and click **Add New Project** → Import your repository.
3. In the project settings:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL` = `your_supabase_project_url`
   - `VITE_SUPABASE_ANON_KEY` = `your_supabase_anon_key`
5. Click **Deploy**.

After pushing these changes, redeploy the latest commit (environment-variable changes also require a new build). On both Wi-Fi and mobile data with VPN off, verify the feed and photos/videos load, then sign in as approved staff, publish a test attachment, and delete it. Browser network requests should use your website's `/clinic-api/...` paths; an API response must be JSON, not the SPA HTML. Video seeking should return partial content (`206`) where supported. Regional reachability must be checked on the actual affected networks; a local test cannot confirm it. If an installed PWA shows the older version, close and reopen it after the update, or refresh the website.

---

## 4. Installing on Mobile as an App (PWA)

Once deployed or opened in a mobile browser over HTTPS:
- **Android (Chrome)**: Tap the menu (⋮) → **Install App** or **Add to Home screen**.
- **iPhone / iPad (Safari)**: Tap the Share button (square with arrow up) → **Add to Home Screen**.

The app can now be launched directly from the phone's home screen in standalone full-screen mode.

---

## 5. Available Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Starts Vite local development server |
| `npm run build` | Typechecks and compiles production build into `dist/` |
| `npm run preview` | Previews the production build locally |
| `npm test` | Runs unit and feature tests with Vitest |
| `npm run typecheck` | Validates TypeScript types across the project |
| `npm run lint` | Runs ESLint check |
| `npm run icons` | Re-generates PWA icons from `public/logo.svg` |

---

## 6. Project Structure

```
├── public/                 # Static assets & PWA manifest icons
├── src/
│   ├── app/                # App shell, routing, auth & settings providers
│   ├── components/         # Reusable UI components & form fields
│   ├── data/               # Data layer (Local storage + Supabase implementations)
│   ├── features/
│   │   ├── auth/           # Doctor login screen
│   │   ├── feed/           # Public article feed (guest view)
│   │   ├── ledger/         # Daily clinic ledger (patient visits, fee, diagnosis)
│   │   ├── reports/        # Monthly summary reports & print view
│   │   └── settings/       # App settings (bilingual switcher, default fee, backups)
│   └── lib/                # i18n dictionary (Burmese/English), formatting, CSV export
├── supabase/
│   └── schema.sql          # PostgreSQL table schemas and RLS security policies
└── vercel.json             # SPA routing rewrite rule
```

---

## 7. Backup & Data Safety

- In `/admin/settings`, use **Backup (JSON)** to download all patient visit records. Articles, accounts, and device settings are excluded.
- Restore validates records before writing and imports only records newer than the stored version. Cloud restores run in one database transaction.
- Local mode provides no login protection; use a trusted device and browser profile. Clearing browser data removes local records.
- Local mode works offline after the app is cached. Cloud reads and writes require internet. Failed writes are not queued or automatically synchronized later; keep the form open and retry.
- Cloud storage is shared between devices, but open screens do not update live. Reload or revisit a screen to fetch changes.
- Use **All records (CSV)** to open patient records in Microsoft Excel or Google Sheets.
- We recommend performing a monthly JSON backup for safekeeping.

## 8. Mobile knowledge feed

- Guests can browse, search titles, filter photos/videos, open individual `/posts/:id` links, and share posts. Guests cannot publish, edit, delete, or upload. Approved staff use **Write a post** and can edit or delete from a post page.
- Run `supabase/schema.sql`, then `supabase/feed.sql` in Supabase SQL Editor. The latter is a rerunnable migration that preserves existing articles, creates the public `article-media` bucket, limits uploads to approved staff, validates published attachments, and hides author email addresses from public reads. The migration has local PostgreSQL regression tests; applying it to the hosted project is a separate deployment step.
- Attach up to four photos or videos per post. Photos accept JPEG, PNG, and WebP up to 8 MB each. They are decoded and resized to a maximum 1,600 px edge and re-encoded for mobile delivery. Videos accept MP4 and WebM up to 30 MB each and are not downloaded automatically on public pages. Images require descriptions. Media is public; patient-record backups do not include it.
- Text drafts are saved in the current browser tab’s session storage. File selections must be made again after leaving/reloading. Uploads happen only when publishing. A failed publish attempts to remove uploaded files and retains the text draft. Hard-closing a tab mid-upload or a failed cleanup can leave unused objects; administrators can remove these from Storage. Do not remove objects referenced by live posts.
- View counts start at zero when the feature is installed. An opened post counts after 1.5 seconds in a visible tab, at most once per anonymous browser ID per UTC day. Counts are atomic and cumulative; returning to the feed refreshes totals. These are recorded views, not verified unique people or bot-filtered analytics. The random ID is kept in local storage (or in memory when storage is unavailable); reader IDs cannot be queried through the public API.
- `article_readers` stores daily deduplication keys. Old rows can be pruned periodically, for example `delete from public.article_readers where view_day < current_date - 30;`; cumulative post totals remain intact.
- Local mode starts as a guest. Signing in with any email/password enables a device-only demo; it is not secure authentication or public hosting. Local media is limited to images up to 1 MB; use Supabase for real publication, shared counters, video uploads, and server-enforced staff permissions.
- Automated checks include guest/nonstaff SQL permissions, storage policies, migration reruns, media validation, deduplicated view counts, pagination, and the publication flow. The PostgreSQL test runtime is a development dependency and is not included in the app bundle.
