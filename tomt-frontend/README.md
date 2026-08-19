# TOMP Frontend — Phase 3.2: React Frontend Foundation

Connects to the Phase 3.1 `tomp-backend` API. Ports the original app's
loading screen, auth screens, dashboard, and hub screen pixel-for-pixel.
Business modules (schedule, monitoring, targets, placement, diary, etc.)
are **not** included in this phase - see the approved implementation order.

## What's ported exactly, and what's new

| Original file | React equivalent | Status |
|---|---|---|
| `loading_page.html` | `src/pages/LoadingPage.jsx` + `.css` | Pixel-identical port |
| `password_page.html` (SET_PASSWORD) | `src/pages/RegisterPage.jsx` | Pixel-identical port |
| `password_page.html` (LOGIN / RESET_PASSWORD) | `src/pages/LoginPage.jsx` | Pixel-identical port |
| `dashboard.html` | `src/pages/DashboardPage.jsx` + `.css` | Pixel-identical port, **plus one added Logout button** (see below) |
| `index.html` | `src/pages/HubPage.jsx` + `.css` | Pixel-identical port |

**Two deliberate, minimal, clearly-scoped additions** beyond a pure port -
both required by the architecture change from localStorage to a real
backend session, neither touches any ported page's existing look:

1. **`GET /api/auth/status`** (backend, `tomp-backend/src/controllers/authController.js`) -
   a read-only, unauthenticated check for whether the single account
   exists yet. The original decided this synchronously via
   `localStorage.getItem(...)`; now it's a server round-trip. Reveals
   nothing beyond a boolean.
2. **A Logout button on DashboardPage** - the original app had no concept
   of a login *session* (just a static localStorage flag), so there was
   nothing to log out of. With real JWT sessions, an authenticated user
   needs a way to end one. Styled with the page's own existing
   `.add-tag-btn` class - no new visual language introduced.

Everything else - colors, fonts, spacing, animations, layout, responsive
breakpoints, copy, validation rules, error message text, SVG icons, the
motivational-tag terminal widget (kept on localStorage exactly as the
original - it's page-local UI, not one of the excluded business modules) -
is byte-for-byte the same as the original HTML/CSS.

## Folder structure

```
tomp-frontend/
├── index.html                  Vite entry HTML (Google Fonts link ported from password_page.html)
├── vite.config.js
├── package.json
├── .env.example                 Copy to .env
├── src/
│   ├── main.jsx                 Mounts <App> inside <BrowserRouter> + <AuthProvider>
│   ├── App.jsx                   React Router route table
│   ├── styles/
│   │   └── global.css            Structural-only reset (no design decisions - see file comments)
│   ├── api/
│   │   ├── axiosClient.js        Axios instance, in-memory token, single-flight refresh-on-401
│   │   └── authService.js        Thin wrapper over /api/auth/* endpoints
│   ├── context/
│   │   └── AuthContext.jsx       Session state, bootstrap-via-refresh-cookie, login/setup/logout/reset
│   ├── routes/
│   │   └── ProtectedRoute.jsx    Redirects to /login unless authenticated
│   ├── components/                Shared, reusable, NOT page-specific
│   │   ├── LoadingSpinner.jsx/.css
│   │   └── ErrorMessage.jsx/.css
│   ├── layout/                    Scaffold for Phase 3.3+ module pages (see note below)
│   │   ├── Header.jsx/.css
│   │   ├── Sidebar.jsx/.css
│   │   └── DashboardLayout.jsx/.css
│   └── pages/
│       ├── LoadingPage.jsx/.css
│       ├── LoginPage.jsx
│       ├── RegisterPage.jsx
│       ├── AuthPage.css          Shared by Login + Register (ported from password_page.html)
│       ├── DashboardPage.jsx/.css
│       ├── HubPage.jsx/.css
│       └── NotFoundPage.jsx/.css  Placeholder for unbuilt module routes
```

### Why Header/Sidebar/DashboardLayout exist but aren't visible yet

The original app has **no persistent header or sidebar** - every page
(`dashboard.html`, `index.html`, etc.) is a standalone full-page design
with its own background, fonts, and layout. Wrapping those in a shared
header/sidebar shell would be a visual change, not a port - so
`LoadingPage`, `LoginPage`, `RegisterPage`, `DashboardPage`, and `HubPage`
render standalone, exactly like the originals, with **no** layout wrapper.

`Header`, `Sidebar`, and `DashboardLayout` are real, working components
built now (per the Phase 1 React Component Plan, Section 7) so that when
business modules land in Phase 3.3+, they have a shell to render into
immediately. Right now they're exercised by `NotFoundPage` - the
placeholder every not-yet-built module route resolves to - so they're
genuinely wired into the app, not unused scaffolding.

## Local setup

```bash
cd tomp-frontend
npm install
cp .env.example .env
# edit .env if your backend isn't on http://localhost:5000

npm run dev
# open http://localhost:5173
```

Requires `tomp-backend` (Phase 3.1) running with CORS's `CLIENT_ORIGIN` set
to `http://localhost:5173` (the `.env.example` default already matches).

## Flow you should see

1. `/` - the liquid-loader splash, exactly timed as the original (~4.5s
   total), then routes to `/register` (first run) or `/login`.
2. First run: **Register** screen ("SET ACCESS CREDENTIALS") - create an
   access name + password, redirected to `/dashboard`.
3. Subsequent visits: **Login** screen ("AUTHORIZATION REQUIRED") - same
   neon/glitch styling, "FORGOT PASSWORD?" toggles the recovery form in
   place exactly like the original.
4. `/dashboard` - the quick-access screen, motivational tag widget,
   Notifications/Remember/Targets buttons (all placeholders for now), and
   the new Logout button.
5. `/hub` - the full 9-card module grid, all placeholders for now.
6. Any module card - lands on the neutral "Not available yet" screen,
   inside the Header/Sidebar shell, with a way back to Dashboard or Hub.

## What is intentionally NOT here yet

No business-module pages (schedule, monitoring, targets, placement,
diary, etc.) - Phase 3.3+, per the approved implementation order.
