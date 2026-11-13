# Security Checklist

| # | Control | Status | Evidence |
|---|---|---|---|
| 1 | Keep `.env` and credentials out of version control and container build context. | ĐÃ LÀM | `.gitignore` excludes `.env`; `.dockerignore` excludes `.env`; `git ls-files .env` returns no tracked file. |
| 2 | Replace sample database, root, and application passwords before deployment. | CHƯA LÀM | `.env.example` intentionally contains `change_this_*` placeholders; no deployment secret store is configured in this repository. |
| 3 | Require HTTPS and secure cookies for production traffic. | CHƯA LÀM | `src/backend/auth.js` sets `Secure` only when `NODE_ENV=production`; this repository does not provision TLS or an HTTPS reverse proxy. |
| 4 | Require authentication for protected parts, inventory, and warranty-ticket routes. | ĐÃ LÀM | `src/backend/app.js` applies `auth.requireAuth` to all three route groups; `docs/test-report.md`, TC-10, records an unauthenticated `401`. |
| 5 | Enforce per-user roles and record ownership. | KHÔNG ÁP DỤNG | The app has one configured shared account and no role or record-ownership model; the test report documents this limitation. |
| 6 | Restrict the database account to the minimum privileges required. | CHƯA LÀM | Compose uses a non-root app account scoped to the application database, but the MySQL image grants that account all privileges on that database; narrower grants are not configured. |
| 7 | Use parameterized database queries and test injection-like input. | ĐÃ LÀM | Repositories use `?` placeholders; `docs/test-report.md`, TC-11, records the injection-like inventory search returning HTTP 200 without database changes. |
