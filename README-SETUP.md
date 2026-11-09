# LAUNDRY account + receipt backend

## What it provides
- Name + room number + password accounts (no email account required)
- bcrypt password hashing and signed 7-day JWT sessions
- Server-side recovery phrase verification
- Private per-user receipt history with compressed photos
- PostgreSQL persistence

## Deploy
1. Create a Render Blueprint from the repository and choose branch `feature/accounts-history-camera`.
2. Review the proposed free Singapore web service and free PostgreSQL database.
3. Set the required `RESET_PHRASE` secret to the recovery phrase agreed by the project owner. Never put it in frontend files or commit it.
4. Apply the Blueprint. Wait for the API health check to pass at `/api/health`.
5. Confirm the API URL and update `config.js` if Render assigned a different hostname.
6. Enable GitHub Pages for this branch only after testing, or merge the branch after verification.

## Important notes
- Render's free database plan may have retention/expiry and availability limits. Do not use it as the only copy of important records without regular backups.
- The shared recovery phrase is a weak account-recovery factor: anyone who knows it and a user's name/room can reset that account. A unique recovery code per account is safer.
- The frontend stores the session token in browser local storage for cross-page persistence. Users should log out on shared devices.
- The API allows the GitHub Pages origin only. Update `CORS_ORIGIN` if the frontend's published origin changes.
