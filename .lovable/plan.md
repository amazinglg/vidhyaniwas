# Plan: 7 Fixes & Improvements

## 1. Easier PWA install on iPhone
iOS doesn't allow programmatic install — only Safari → Share → Add to Home Screen works (it's an Apple restriction). What we **can** do is make the path foolproof:

- Build a new **`IosInstallGuideDialog`** with a 3-step illustrated walkthrough (Share icon → "Add to Home Screen" → Add), plus a "Open in Safari" warning if user is in Chrome/in-app browser on iOS (since install only works in Safari).
- Auto-detect non-Safari iOS browsers (Chrome iOS, Instagram/FB in-app webview) and show a banner: "To install, open this page in Safari" with a copy-link button.
- Replace the current `toast.info` iOS fallback in `TopBar` and `MyProfile` with this dialog.
- Add a small "?" help icon next to install buttons that always opens the guide.

## 2. iOS sticky top bar
On iOS PWA, the top bar isn't sticking properly because the hamburger button uses `position: fixed` while the rest of the bar uses `position: sticky` — these compete on iOS Safari/PWA.

Fix in `TopBar.tsx` + `AppSidebar.tsx`:
- Move the mobile hamburger **into** the `TopBar` header (so it scrolls/sticks together with the rest of the controls).
- Add `iOS-friendly` classes: keep `sticky top-0`, add `transform: translateZ(0)` and explicit `paddingTop: env(safe-area-inset-top)` to the header so iOS notch is respected and the whole bar stays pinned.
- Remove the standalone `fixed` hamburger from `AppSidebar`.

## 3. Hide yearly maintenance amount from non-admins (Residents tab)
In `Residents.tsx` (both mobile card view and desktop table):
- Wrap the "Maintenance (₹/yr)" cell/row in `{isAdmin && (...)}`.
- Hide the "Maintenance (₹/yr)" `<TableHead>` for non-admins and adjust the column count.

## 4. Auto-generate next FY pending entries
Add a Postgres scheduled job (pg_cron) that runs on **April 1 at 00:05 IST** every year, plus a safety check on app load:

- Create SQL function `generate_new_fy_dues()` that:
  - Iterates all active owner residents.
  - For each, computes carry-over dues from previous FY (sum of `due_amount` where `paid_date < new FY start` AND `status != 'paid'`).
  - Inserts a new `maintenance_collections` row for the new FY: `month='Annual'`, `year=<new FY start year>`, `total_maintenance = resident.maintenance_amount + carry_over_dues`, `due_amount = same`, `status='pending'`.
  - Skips residents who already have an Annual entry for the new FY (idempotent).
- Schedule via `pg_cron` to run yearly on April 1.
- Add a "Run FY rollover now" admin button in Settings as manual fallback (calls the same SQL function via RPC).

## 5. Reorganize My Profile (cleaner placement)
Currently 4 separate big cards (Notifications / Install / APK / Hard Refresh) stack vertically. Replace with a single compact **"App Settings" card** containing:
- Notifications row: status pill + small "Enable" / "Disable" button.
- Install App row (only when not installed): small "Install" button + "?" iOS help.
- Hard Refresh row (only when standalone): small icon button.
- APK Download row (master admin only, collapsed under "Advanced").

Layout: each row is a flex row (icon + label + small action button on the right), separated by dividers. This collapses 4 large cards into one tidy card (~40% less vertical space).

## 6. Fix Dashboard StatCard truncation (mobile)
At 363px width, titles like "TOTAL RESIDENTS" and values like "₹12,665" get cut off. In `StatCard.tsx`:
- Drop the icon to a smaller size on mobile (`h-9 w-9`) to free horizontal space.
- Make title smaller (`text-[10px]`) and allow 2 lines (`line-clamp-2`, remove `truncate`).
- Make value `text-base` on mobile, scale `clamp` for long currency values; remove `truncate` and use `break-words` so `₹12,665` shows fully.
- Stack icon **below** title on very narrow screens (move icon to top-right corner as a small floating chip instead of a big square).

## 7. Enforce 10K/year limit on Residents tab
The check exists in `Maintenance.tsx` and `BulkMaintenanceDialog.tsx` but not in:
- `Residents.tsx` → `saveMaintAmount` (per-resident pencil edit)
- `BulkUpdateAmountDialog.tsx` (bulk amount setter)

For both:
- Compute projected total due: `new amount + existing unpaid dues from prior FYs` for that resident.
- If `> 10000`: show a confirm dialog "This will breach the ₹10,000 / FY cap. Continue anyway?" with **Cancel** / **Override & Save** buttons.
- Only proceed on override.

---

## Technical notes

**Files to edit:**
- `src/components/IosInstallGuideDialog.tsx` (new)
- `src/components/layout/TopBar.tsx` (move hamburger in, fix iOS sticky)
- `src/components/layout/AppSidebar.tsx` (remove fixed hamburger, expose `onMenuClick`)
- `src/pages/Residents.tsx` (hide ₹/yr for non-admin, add 10K confirm in `saveMaintAmount`)
- `src/components/BulkUpdateAmountDialog.tsx` (add 10K confirm)
- `src/pages/MyProfile.tsx` (consolidate 4 cards into one App Settings card)
- `src/components/dashboard/StatCard.tsx` (mobile sizing/wrapping)
- `supabase/migrations/<new>.sql` (FY rollover function + pg_cron schedule)
- `src/pages/SocietySettings.tsx` (manual "Run FY rollover" button — master admin only)

**No breaking schema changes** — only one new SQL function and a cron entry.
