# Consolidated Prompt: SAMA Account Login & Sign-Up Process

Use this prompt when building or reviewing the account login and sign-up flow for the SAMA Fire & Safety ERP.

## Scope

This prompt covers the entire account lifecycle from first sign-up to daily login, including role assignment, approval gating, password management, and post-login routing. It applies to all department accounts: Management, Sales, Project Manager, Inventory/Store, Installation & Maintenance, Accounts, and Technician.

## Sign-Up Flow

1. **Public sign-up page** accessible from the landing page.
2. **Required fields:** full name, email address, password (minimum 6 characters), and a **Designation dropdown**.
3. **Designation dropdown must contain exactly these options:**
   - Sales
   - Project Manager
   - Inventory/Store
   - Installation & Maintenance
   - Accounts
   - Technician
4. **Role derivation:** the system maps the selected designation to the corresponding department role and also assigns the legacy `employee` role.
5. **Approval requirement:** after successful sign-up, the user is **NOT** automatically signed in. The account is created in a **pending** status and requires approval by a Management login before the user can access the system.
6. **Email confirmation:** keep email confirmation enabled (default). Do not enable auto-confirm unless explicitly requested.
7. **Duplicate prevention:** if the email already exists in Auth, show a clear error and do not allow re-registration.

## Login Flow

1. **Login page** with email and password fields.
2. **Pending users blocked:** if the user's profile status is `pending`, show a message that the account is awaiting Management approval and deny access.
3. **Approved users:** after successful authentication, route the user to the correct default screen based on their primary role:
   - **Management:** Overview / Management dashboard
   - **Sales:** Sales dashboard (Quotations section)
   - **Project Manager:** Dashboard / Maintenance overview
   - **Inventory/Store:** Stock section
   - **Installation & Maintenance:** Maintenance / job execution area
   - **Accounts:** Accounts / finance section
   - **Technician:** Maintenance report area
4. **Session state:** use a single `onAuthStateChange` listener at the root level to refresh route context and invalidate cached queries on sign-in and sign-out.
5. **Sign-out hygiene:** on sign-out, cancel in-flight queries, clear the query cache, call `supabase.auth.signOut()`, and navigate to `/auth` with history replacement.

## Password Management

1. **Forgot password:** provide a "Forgot password?" link that calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/reset-password' })`.
2. **Reset password page:** a public `/reset-password` route that detects `type=recovery` in the URL hash and calls `supabase.auth.updateUser({ password })` without requiring the current password.
3. **Signed-in password change:** when a logged-in user changes their password, collect the current password and call `supabase.auth.updateUser({ password, current_password })`.

## Role & Permission Handling

1. **Management accounts:** have full visibility and do not require approval for their own actions. Management-created records auto-approve with a confirmation notification.
2. **Department accounts:** can only access screens and perform actions allowed by their department capability matrix.
3. **No cross-department creation:** only the allowed roles may create specific records (for example, customer numbers only by Sales/Management, job numbers only by Project Manager/Installation & Maintenance/Management, item codes only by Project Manager).
4. **Approval notifications:** pending sign-ups and pending record approvals must generate notifications visible to Management.

## Notifications on Login

1. On successful login, show a popup or dropdown listing unread/pending notifications.
2. Notifications include: pending approvals, new sign-up requests, rejection/clarification requests, and system confirmations.
3. Provide "Mark as read" and "Mark all as read" actions.

## Security & UX Requirements

1. Never store roles or approval status in client-side storage; always verify server-side.
2. Never expose service-role keys or raw Supabase credentials in the client bundle.
3. Auth-gated routes must use the integration-managed `_authenticated` layout with `ssr: false`.
4. Show clear, human-readable error messages for invalid credentials, pending approval, network failures, and duplicate registrations.
5. The login/sign-up UI must match the navy SAMA theme and use the same sidebar navigation style as the rest of the application.

## Deliverables When Implementing

- Updated `src/routes/auth.tsx` with designation dropdown and pending-state handling.
- Updated `src/routes/_authenticated/route.tsx` to enforce authentication.
- Updated `src/routes/__root.tsx` for session refresh and notification integration.
- `/reset-password` public route.
- Management employee-approval UI with approve/reject actions.
- Role-based default landing route logic.
