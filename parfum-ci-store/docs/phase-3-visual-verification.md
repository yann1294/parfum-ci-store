# Phase 3 Visual Verification

Do not record passwords, OAuth codes, cookies, access tokens, refresh tokens, Supabase keys, or real customer data in this document.

Tester:
Date:
Environment:
Git commit:
Supabase project environment:
Browser:
Automated-test results:
Unresolved defects:

## A. Environment Startup

- [ ] PASS / [ ] FAIL Confirm `.env.local` exists in the project root. Actual result:
- [ ] PASS / [ ] FAIL Confirm `NEXT_PUBLIC_SUPABASE_URL` is set without copying its value. Actual result:
- [ ] PASS / [ ] FAIL Confirm `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is set without copying its value. Actual result:
- [ ] PASS / [ ] FAIL Confirm `.env.local` and `.env.test.local` are ignored by Git. Actual result:
- [ ] PASS / [ ] FAIL Delete `.next`. Actual result:
- [ ] PASS / [ ] FAIL Run `pnpm dev`. Actual result:
- [ ] PASS / [ ] FAIL Confirm no environment validation error appears. Actual result:
- [ ] PASS / [ ] FAIL Open `/` and confirm the storefront renders. Actual result:

## B. Supabase Profile Checks

Dashboard steps:

1. Open Supabase Dashboard -> Authentication -> Users.
2. Copy each test user's UUID without copying tokens or session details.
3. Open Table Editor -> `profiles`.
4. Confirm the matching `profiles.id` equals the Auth user UUID.
5. Confirm `role` is the intended staff role.
6. Confirm `active` is correct.
7. Keep one inactive test profile with `active = false`.
8. To test a user without approved staff access, create an Auth user and leave the generated profile inactive, or remove only that test profile in a disposable environment.

Read-only SQL verification:

```sql
select
  users.id,
  users.email,
  profiles.role,
  profiles.active,
  profiles.created_at
from auth.users
left join public.profiles on profiles.id = users.id
order by users.created_at desc;
```

- [ ] PASS / [ ] FAIL Dashboard-created users receive a profile. Actual result:
- [ ] PASS / [ ] FAIL New profiles are inactive by default. Actual result:
- [ ] PASS / [ ] FAIL Existing owner/admin roles are unchanged by backfill. Actual result:

## C. Public Visitor

- [ ] PASS / [ ] FAIL `/` renders without an account. Actual result:
- [ ] PASS / [ ] FAIL `/catalogue` renders without an account. Actual result:
- [ ] PASS / [ ] FAIL Product detail pages: not present in the current route tree; mark PASS only if future product routes render publicly. Actual result:
- [ ] PASS / [ ] FAIL `/connexion` renders without an account. Actual result:
- [ ] PASS / [ ] FAIL Public pages do not show admin navigation. Actual result:
- [ ] PASS / [ ] FAIL Anonymous `/admin` redirects to `/connexion?retour=%2Fadmin`. Actual result:

## D. OWNER

- [ ] PASS / [ ] FAIL Password login succeeds. Actual result:
- [ ] PASS / [ ] FAIL Account menu shows name and `Propriétaire`. Actual result:
- [ ] PASS / [ ] FAIL All modules are visible: Tableau de bord, Catalogue, Inventaire, Commandes, Clients, Paiements, Messages, Analytics, Design system, Paramètres. Actual result:
- [ ] PASS / [ ] FAIL `/admin` is accessible. Actual result:
- [ ] PASS / [ ] FAIL `/admin/design-system` is accessible in development. Actual result:
- [ ] PASS / [ ] FAIL Owner-only settings/security controls are accessible where implemented. Actual result:
- [ ] PASS / [ ] FAIL Logout succeeds. Actual result:

## E. ADMIN

- [ ] PASS / [ ] FAIL Operational modules are visible. Actual result:
- [ ] PASS / [ ] FAIL Owner-only security controls are hidden where implemented. Actual result:
- [ ] PASS / [ ] FAIL Manually entering owner-only routes is denied where implemented. Actual result:
- [ ] PASS / [ ] FAIL Direct owner-only mutation is denied where implemented. Actual result:

## F. INVENTORY_MANAGER

- [ ] PASS / [ ] FAIL Catalogue/product read module is visible. Actual result:
- [ ] PASS / [ ] FAIL Inventory module is visible. Actual result:
- [ ] PASS / [ ] FAIL Inventory actions are allowed where implemented. Actual result:
- [ ] PASS / [ ] FAIL `/admin/commandes` is denied. Actual result:
- [ ] PASS / [ ] FAIL `/admin/messages` is denied. Actual result:
- [ ] PASS / [ ] FAIL `/admin/parametres` is denied. Actual result:
- [ ] PASS / [ ] FAIL Direct prohibited URLs show `Accès refusé`. Actual result:

## G. ORDER_MANAGER

- [ ] PASS / [ ] FAIL Orders are visible. Actual result:
- [ ] PASS / [ ] FAIL Customers are visible. Actual result:
- [ ] PASS / [ ] FAIL Payment verification is visible. Actual result:
- [ ] PASS / [ ] FAIL `/admin/inventaire` is denied. Actual result:
- [ ] PASS / [ ] FAIL `/admin/messages` is denied. Actual result:
- [ ] PASS / [ ] FAIL `/admin/parametres` is denied. Actual result:

## H. CUSTOMER_SUPPORT

- [ ] PASS / [ ] FAIL Orders read access is visible. Actual result:
- [ ] PASS / [ ] FAIL Messages are visible. Actual result:
- [ ] PASS / [ ] FAIL `/admin/paiements` is denied. Actual result:
- [ ] PASS / [ ] FAIL `/admin/inventaire` is denied. Actual result:
- [ ] PASS / [ ] FAIL `/admin/parametres` is denied. Actual result:
- [ ] PASS / [ ] FAIL Prohibited order mutations are denied where implemented. Actual result:

## I. Inactive Staff

- [ ] PASS / [ ] FAIL Login identity may succeed. Actual result:
- [ ] PASS / [ ] FAIL Admin authorization fails. Actual result:
- [ ] PASS / [ ] FAIL `Accès refusé` appears. Actual result:
- [ ] PASS / [ ] FAIL `/admin` remains inaccessible. Actual result:
- [ ] PASS / [ ] FAIL Protected content does not flash before denial. Actual result:

## J. User Without An Approved Staff Profile

- [ ] PASS / [ ] FAIL No automatic privileged role is assigned. Actual result:
- [ ] PASS / [ ] FAIL No automatic activation occurs. Actual result:
- [ ] PASS / [ ] FAIL Admin access is denied. Actual result:
- [ ] PASS / [ ] FAIL No active privileged profile is created. Actual result:

## K. Logout

1. Log in.
2. Open `/admin`.
3. Log out from the account menu.
4. Press browser Back.
5. Refresh.
6. Reopen `/admin`.
7. Confirm protected data remains inaccessible.

- [ ] PASS / [ ] FAIL Logout flow protects admin content after Back and refresh. Actual result:

## L. Google OAuth

- [ ] PASS / [ ] FAIL Existing active OWNER with the same verified Google email can sign in. Actual result:
- [ ] PASS / [ ] FAIL Active inventory manager can sign in and only sees permitted modules. Actual result:
- [ ] PASS / [ ] FAIL Inactive user is redirected to `Accès refusé`. Actual result:
- [ ] PASS / [ ] FAIL Google user without approved staff access is denied. Actual result:
- [ ] PASS / [ ] FAIL Cancelled Google consent returns a generic French failure. Actual result:
- [ ] PASS / [ ] FAIL Malicious return path falls back to `/admin`. Actual result:
- [ ] PASS / [ ] FAIL Supabase Authentication -> Users -> Identities shows the expected linked Google identity. Actual result:
- [ ] PASS / [ ] FAIL Role remains unchanged after Google login. Actual result:

Google Console redirect URI: `https://PROJECT_REF.supabase.co/auth/v1/callback`.
Supabase application callback allow-list: `http://localhost:3000/auth/callback` and production equivalent.

## M. Rate Limiting

Use a known test email and intentionally incorrect passwords. Do not write the password in notes.

- [ ] PASS / [ ] FAIL Repeated failures show generic errors. Actual result:
- [ ] PASS / [ ] FAIL Temporary blocking occurs after configured attempts. Actual result:
- [ ] PASS / [ ] FAIL Errors do not disclose whether the account exists. Actual result:
- [ ] PASS / [ ] FAIL Logs do not contain passwords. Actual result:

## N. Browser Developer Tools

- [ ] PASS / [ ] FAIL Network tab shows expected redirects without copying cookie values. Actual result:
- [ ] PASS / [ ] FAIL Response statuses match redirects or denied pages. Actual result:
- [ ] PASS / [ ] FAIL Cookies exist only as browser-managed session cookies; values are not copied. Actual result:
- [ ] PASS / [ ] FAIL Console has no relevant errors. Actual result:
- [ ] PASS / [ ] FAIL Browser JavaScript bundles do not expose Supabase secret keys. Actual result:
- [ ] PASS / [ ] FAIL Protected page responses are absent after logout. Actual result:

## O. Final Role Matrix

| Route/module                         | OWNER | ADMIN | INVENTORY_MANAGER | ORDER_MANAGER | CUSTOMER_SUPPORT | Expected permission        | Actual result | PASS/FAIL |
| ------------------------------------ | ----- | ----- | ----------------- | ------------- | ---------------- | -------------------------- | ------------- | --------- |
| `/admin` Tableau de bord             | Yes   | Yes   | Yes               | Yes           | Yes              | Active staff only          |               |           |
| `/admin/catalogue` Catalogue         | Yes   | Yes   | Yes               | No            | No               | Product read roles         |               |           |
| `/admin/inventaire` Inventaire       | Yes   | Yes   | Yes               | No            | No               | Inventory managers         |               |           |
| `/admin/commandes` Commandes         | Yes   | Yes   | No                | Yes           | Read             | Order roles                |               |           |
| `/admin/clients` Clients             | Yes   | Yes   | No                | Yes           | No               | Order managers             |               |           |
| `/admin/paiements` Paiements         | Yes   | Yes   | No                | Yes           | No               | Payment verification roles |               |           |
| `/admin/messages` Messages           | Yes   | Yes   | No                | No            | Yes              | Message managers           |               |           |
| `/admin/analytics` Analytics         | Yes   | Yes   | Yes               | Yes           | Yes              | Active staff only          |               |           |
| `/admin/design-system` Design system | Yes   | Yes   | Yes               | Yes           | Yes              | Development active staff   |               |           |
| `/admin/parametres` Paramètres       | Yes   | Yes   | No                | No            | No               | Settings managers          |               |           |

Current module pages are protected placeholders. They verify authentication and authorization persistence but do not expose business data or mutations yet.

## P. Evidence

Screenshots must not contain passwords, tokens, OAuth codes, cookies, real customer addresses, or real payment data.

Evidence links or filenames:
Defects:
Retest notes:

## Q. Phase 3 Regression: Account Dropdown

1. Log in as OWNER.
2. Open the account button in the admin top bar.
3. Confirm no runtime error appears.
4. Confirm the staff name is visible.
5. Confirm `Propriétaire` is visible.
6. Confirm `Déconnexion` is visible.
7. Use keyboard navigation to reach the menu item.
8. Close with Escape.

Expected: The Base UI menu opens without `MenuGroupContext` errors and remains keyboard accessible.
Actual:

- [ ] PASS / [ ] FAIL

## R. Phase 3 Regression: Password Session Persistence

1. Log in as OWNER.
2. Open `/admin`.
3. Click every visible navigation item.
4. Record each resulting URL.
5. Confirm no route redirects to `/connexion`.
6. Refresh every route.
7. Return to dashboard.
8. Open a second tab to `/admin`.
9. Confirm both tabs remain authenticated.
10. Inspect Network without copying cookie values.
11. Confirm protected requests do not repeatedly return login redirects.

Expected: Session cookies persist across client navigation, full refresh and a second tab.
Actual:

- [ ] PASS / [ ] FAIL

## S. Phase 3 Regression: Google OAuth

1. Start from a fresh incognito window.
2. Open `/connexion`.
3. Click `Continuer avec Google`.
4. Select `dev.yann12@gmail.com`.
5. Complete consent if requested.
6. Confirm the browser passes through Supabase.
7. Confirm `/auth/callback` runs.
8. Confirm `/admin` loads.
9. Open the account menu.
10. Navigate across admin routes.
11. Refresh.
12. Confirm the session persists.
13. Verify the Google identity in Supabase Authentication -> Users -> Identities.
14. Confirm the database role remains `OWNER`.
15. Do not record OAuth codes, tokens or cookies.

Expected: OAuth creates a normal Supabase browser session and staff authorization still comes only from `public.profiles`.
Actual:

- [ ] PASS / [ ] FAIL

## T. Phase 3 Regression: Google Failure Inspection

Inspect only request names, statuses and safe development event codes. Do not copy query values, cookies, codes or tokens.

| Symptom                                           | Likely area                            | Evidence to inspect                                                              |
| ------------------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------- |
| Provider initiation failure                       | Browser Supabase OAuth call            | `GOOGLE_OAUTH_INIT_FAILED`, `/connexion` UI message                              |
| Google redirect mismatch                          | Google Cloud or Supabase provider URLs | `/auth/v1/authorize` status and Supabase Auth logs                               |
| Code exchange failure                             | `/auth/callback` exchange              | `GOOGLE_CODE_EXCHANGE_FAILED`, final `/connexion?erreur=oauth`                   |
| Profile missing                                   | Staff approval/profile sync            | `GOOGLE_PROFILE_DENIED`, `profiles` row absent                                   |
| Inactive profile                                  | Staff approval                         | `GOOGLE_PROFILE_DENIED`, `active = false`                                        |
| Profile lookup failure                            | Database/RLS/service issue             | `STAFF_PROFILE_LOOKUP_FAILED`, final generic OAuth error                         |
| Successful authentication followed by cookie loss | Callback or proxy cookie propagation   | `Set-Cookie` presence without copying values, no repeated `/connexion` redirects |

Actual:

- [ ] PASS / [ ] FAIL
