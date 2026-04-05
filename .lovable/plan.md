

# Implementation Plan: 10 Fixes and Features

## Overview
This plan addresses 10 items: sync fixes, UI additions, sign-up flow changes, dashboard personalization, a new Society Management tab, a new Pending Signup tab, and misc cleanups.

---

## Phase 1: Database Changes

**Migration SQL:**
- Create `society_management` table (id, name, role_title, photo_url, display_order, created_at, updated_at) with RLS for admin CRUD and authenticated read
- Add `status` column to `complaints` table to support `withdrawn` value (already exists as text, no change needed)
- Update `assign_default_role()` trigger function: if the signing-up user's mobile matches an existing resident, auto-set `is_approved = true` (skip pending approval)

---

## Phase 2: Sign-up & Sync Fixes (Items 1, 4, 9)

**Auth.tsx:**
- Remove the email field from sign-up form; auto-generate email as `{mobile}@society.local` (current pattern)
- After successful sign-up, if mobile already exists in `residents` table, the trigger will auto-approve

**assign_default_role trigger update:**
- Check if mobile exists in `residents` table; if yes, set `is_approved = true` on the profile
- This ensures pre-existing residents don't need manual approval

**Sync fix (Item 1):**
- In `SocietySettings.tsx`, after approving a user, also invalidate `residents` and `all_residents` query keys
- Add realtime subscription to `profiles` table in the settings page to auto-refresh user list

---

## Phase 3: User Management & Resident Tab (Item 2)

**SocietySettings.tsx - Manage Users tab:**
- Add "Add User" button that opens a dialog with fields: Name, House No, Lane No, Mobile, Email, Resident Type (Owner/Member/Tenant/NA)
- This inserts directly into `residents` table

**Residents.tsx - Add Resident:**
- Add `resident_type` selector (Owner/Member/Tenant) to the add/edit resident dialog

---

## Phase 4: Pending Approvals (Items 3, 10)

**Remove role column** from the pending signup table display (Item 3)

**New Pending Signups tab in sidebar (Item 10):**
- Create `src/pages/PendingSignups.tsx` — move the pending approvals UI from `SocietySettings.tsx` to this new page
- Add route `/pending-signups` in `App.tsx`, protected by admin roles (not just master_admin)
- Add sidebar nav item visible to admin roles (master_admin, president, VP, treasury_head, secretary)
- Remove the "approvals" tab from `SocietySettings.tsx`
- Settings tab remains visible only to master_admin

---

## Phase 5: My Profile Enhancements (Items 4, 5)

**Email editing (Item 4):**
- Add email field to the profile edit form in `MyProfile.tsx`
- Save email to the `profiles` table (add email column if needed, or use residents table)

**Family/Tenant/Vehicle management for owners (Item 5):**
- In `MyProfile.tsx`, if the logged-in user is a house owner, show sections to add/edit/remove:
  - Family members (already exists)
  - Tenants — add tenant management section; when a tenant is added, create a record in `residents` with `resident_type = 'tenant'` and `owner_id` pointing to the owner. This syncs with the tenant icon in Residents tab
  - Vehicles (already exists)

**Withdraw complaint (Item 5):**
- In `MyComplaints.tsx`, add a "Withdraw" button on open complaints
- Update complaint status to `withdrawn` and add RLS policy allowing residents to update their own complaints

---

## Phase 6: Dashboard for Non-Admin Users (Item 6)

**Dashboard.tsx:**
- Detect user role; if resident/coordinator/NA:
  - Show personal maintenance summary: total paid, total pending, payment history
  - Read-only view of their own maintenance records
  - Hide society-wide financial stats and charts
- If admin: show existing dashboard (unchanged)
- Default year selection to current year (2026)

---

## Phase 7: Society Management Tab (Item 7)

**Create `src/pages/SocietyManagement.tsx`:**
- Table/card list showing society management members with name, role title, and photo
- Admin can add/edit/delete members (upload photo to Supabase storage)
- Read-only for other roles
- Add sidebar nav item below "Manage Complaints" for admin roles

---

## Phase 8: Year Selector Cleanup (Item 8)

**Dashboard.tsx:**
- Remove 2024 from the year dropdown
- Default `selectedYear` to `'2026'` (current year)

---

## Files to Create
- `src/pages/PendingSignups.tsx`
- `src/pages/SocietyManagement.tsx`
- Migration SQL file

## Files to Modify
- `src/pages/Auth.tsx` — remove email, auto-approve logic
- `src/pages/SocietySettings.tsx` — remove approvals tab, add user creation, sync fixes
- `src/pages/Dashboard.tsx` — personalized view for residents, remove 2024, default 2026
- `src/pages/MyProfile.tsx` — email editing, tenant management for owners
- `src/pages/MyComplaints.tsx` — withdraw complaint button
- `src/pages/Residents.tsx` — resident_type in add/edit dialog
- `src/components/layout/AppSidebar.tsx` — add Society Management and Pending Signups nav items
- `src/App.tsx` — add new routes
- `src/contexts/LanguageContext.tsx` — new translation keys
- `src/types/society.ts` — no changes needed
- `supabase/functions/` — trigger function update via migration

## Estimated Scope
- 2 new pages, 1 migration, ~10 file edits
- Medium-large change set, implementable in one pass

