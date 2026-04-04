
## Phase 1: Database & Role Changes
1. **Remove supervisor role** from the app_role enum and all related code
2. **Add sign-up approval system** - add `is_approved` column to profiles, update auth flow to block unapproved users
3. **Add tenant support** - add `resident_type` (owner/member/tenant) and `owner_id` columns to residents table
4. **Add real-time sync** - enable realtime on key tables
5. **Update sign-up form** - add house_no, lane_no, resident_type fields; validate owner exists for members/tenants

## Phase 2: UI & Permission Changes  
1. **Update Residents tab** - show tenant icon, clickable names opening detail modal with tenant info
2. **Update sign-up approval UI** in Settings > Manage Users
3. **Lock house_no/lane_no editing** for non-admin roles
4. **Owner can manage their own tenants/members**
5. **Don't create new resident rows on member/tenant signup** - link to owner instead

I'll start with Phase 1 (database migration) now.
