# LAUNDRY account + receipt backend

## Features
- Name + room number + password accounts (no email login)
- bcrypt password hashing and signed 7-day sessions
- Server-side recovery phrase verification
- Private per-user receipt history with compressed photos
- PostgreSQL persistence

## Database
Use a persistent PostgreSQL provider such as Neon for the database. Render's Free Postgres databases expire after 30 days and do not include backups, so this project intentionally does not provision one.

1. Create a Neon Postgres project on its free plan.
2. Copy the pooled connection string (the URL beginning with `postgresql://`).
3. Keep it private. Do not paste it into GitHub or frontend files.

## Deploy the API on Render
1. Open Render and create a Blueprint from this repository.
2. Select branch `feature/accounts-history-camera` and the root `render.yaml`.
3. Review the proposed `laundari-api` free web service. It does not create a Render database.
4. Apply the Blueprint.
5. In the new service's Environment page, set:
   - `DATABASE_URL`: the private Neon connection string
   - `RESET_PHRASE`: the recovery phrase agreed by the project owner
   - `CORS_ORIGIN`: `https://aizen-1862.github.io`
   `JWT_SECRET` is generated automatically by Render.
6. Save and deploy. Wait for `/api/health` to return `{ "ok": true }`.
7. Check the API URL. If Render assigns a different hostname, update `config.js` to that URL and commit the change to this branch.

## Important security notes
- The shared recovery phrase is a weak account-recovery factor: anyone who knows it and a user's name/room can reset that account. A unique recovery code per account is safer.
- The recovery phrase is stored only as a Render environment variable, never in frontend JavaScript.
- The frontend stores the session token in browser local storage. Users should log out on shared devices.
- The API limits authentication and password-reset attempts and only returns receipts belonging to the signed-in user.
- Back up important database data regularly. Free-tier limits and availability can change.


## Warden admin portal

The separate warden dashboard is available at `/admin.html` on the deployed website. It uses a dedicated admin username and password; student accounts cannot access admin endpoints.

In the Render API service's **Environment** settings, add:

- `ADMIN_USERNAME`: a private username for the warden (at least 3 characters)
- `ADMIN_PASSWORD`: a unique password of at least 12 characters

Keep both values private and do not put them in GitHub, frontend files, QR posters, or student messages. Save the environment changes and let Render redeploy the API. The server hashes the configured password for login verification and issues a separate, shorter-lived admin session.

The admin portal shows student names, room numbers, submission dates, quantities, receipt numbers, and receipt photos. Only requests carrying a valid admin-role token can access the admin overview and all-student receipt endpoints. The student API rejects admin tokens.

Students should be told that the warden can view their laundry submission history and any photos they attach. Share the student website QR code publicly; give the private `/admin.html` link and credentials only to the warden.
