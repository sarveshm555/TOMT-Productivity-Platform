# TOMP Backend — Phase 3.1: Backend Foundation

Express + MongoDB (Mongoose) + JWT auth + GridFS. Business modules (schedule,
targets, monitoring, placement, diary, notifications, etc.) are **not**
included in this phase by design — see the approved architecture docs.

## Folder structure

```
tomp-backend/
├── server.js                 Entry point: connects DB, starts HTTP server
├── package.json
├── .env.example               Copy to .env and fill in real values
├── src/
│   ├── app.js                 Express app factory (middleware + routes)
│   ├── config/
│   │   └── db.js               Mongoose connection + GridFS bucket setup
│   ├── models/
│   │   └── User.js             Single-user-today, multi-user-ready schema
│   ├── controllers/
│   │   └── authController.js   setup / login / refresh / logout / reset / me
│   ├── routes/
│   │   ├── index.js            Mounts /api/health, /api/auth
│   │   └── authRoutes.js
│   ├── middleware/
│   │   ├── auth.js             JWT "requireAuth" guard
│   │   ├── notFound.js         404 handler
│   │   └── errorHandler.js     Central error -> JSON response mapper
│   └── utils/
│       ├── ApiError.js         Error class carrying an HTTP status code
│       ├── asyncHandler.js     Wraps async route handlers
│       ├── jwt.js              Access/refresh token sign + verify helpers
│       └── gridfs.js           Upload/download/delete helpers (ready for
│                                Phase 3.2+, not wired to any route yet)
```

## Local setup

```bash
cd tomp-backend
npm install
cp .env.example .env
# edit .env: set MONGO_URI (Atlas), JWT_ACCESS_SECRET, JWT_REFRESH_SECRET

npm run dev        # nodemon, auto-restarts on file changes
# or
npm start
```

Generate strong JWT secrets with:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Run it twice — `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` must be different values.

## Verifying it's alive

```bash
curl http://localhost:5000/api/health
# {"success":true,"message":"API is running."}
```

## Auth flow (matches the original password_page.html behavior)

Checking whether an account already exists (added in Phase 3.2, for the frontend's login/register routing):
```bash
curl http://localhost:5000/api/auth/status
# {"success":true,"setupComplete":false}
```

First run (no account exists yet):
```bash
curl -i -X POST http://localhost:5000/api/auth/setup \
  -H "Content-Type: application/json" \
  -d '{"username":"yourname","password":"yourpassword"}'
```
Returns an `accessToken` in the JSON body and sets an httpOnly `refreshToken`
cookie, scoped to `/api/auth`.

Subsequent logins:
```bash
curl -i -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"yourpassword"}'
```

Calling a protected endpoint:
```bash
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer <accessToken>"
```

Refreshing an expired access token (requires the cookie from login/setup):
```bash
curl -i -X POST http://localhost:5000/api/auth/refresh -b cookies.txt -c cookies.txt
```

Resetting the password:
```bash
curl -i -X POST http://localhost:5000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"username":"yourname","newPassword":"newpass123","confirmPassword":"newpass123"}'
```

Logging out (clears the refresh session):
```bash
curl -i -X POST http://localhost:5000/api/auth/logout -b cookies.txt
```

## What is intentionally NOT here yet

- No business-module routes/models/controllers (schedule, targets, monitoring,
  wardrobe, routines, placement, diary, notifications) — Phase 3.2+.
- No file-upload routes wired to GridFS yet — the helpers in `src/utils/gridfs.js`
  are ready and unit-testable, but nothing calls them until a module needs uploads
  (documents, wardrobe photos, diary covers, note images).
- No localStorage → MongoDB import script yet — that ships alongside the first
  business module it depends on, per the Phase 2 migration strategy.
