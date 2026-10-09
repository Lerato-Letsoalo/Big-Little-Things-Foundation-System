# Big Little Things Foundation

Website and API for Big Little Things Foundation. The static pages are served by the Node.js backend; application data and authentication use MySQL and signed JWT sessions.

## Requirements

- Node.js 18 or newer
- MySQL 8 or compatible MySQL server

## Local setup

1. Create the database and tables:

   ```sh
   mysql -u root -p < backend/sql/schema.sql
   ```

2. Copy the environment template:

   ```sh
   cp backend/.env.example backend/.env
   ```

   On Windows Command Prompt, use `copy backend\.env.example backend\.env`.

3. Edit `backend/.env` with your MySQL credentials and a unique JWT secret of at least 32 characters. Generate one with:

   ```sh
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

4. Install dependencies and create the first administrator:

   ```sh
   cd backend
   npm ci
   npm run seed-admin
   ```

   Set `INITIAL_ADMIN_NAME`, `INITIAL_ADMIN_EMAIL`, and `INITIAL_ADMIN_PASSWORD` in `backend/.env` for this one-time command. The initial password must be at least 12 characters. The bootstrap command refuses to overwrite an existing account.

5. Start the site and API:

   ```sh
   npm run dev
   ```

6. Open `http://localhost:3000`.

The backend serves both the site and `/api`, so the browser uses the same origin. `ALLOWED_ORIGINS` is available for deployments that serve the frontend separately. Never commit `.env` or put database passwords/JWT secrets in frontend files.

## Environment variables

See [backend/.env.example](backend/.env.example). Required settings are `DB_HOST`, `DB_USER`, `DB_NAME`, and `JWT_SECRET`; set the database password and port for your MySQL installation. `PORT`, `NODE_ENV`, `JWT_EXPIRES_IN`, and `ALLOWED_ORIGINS` can be adjusted for the runtime environment.

## Roles and accounts

- Public visitors can view public website content and submit donation details.
- Volunteer accounts are created with pending approval and cannot sign in until approved.
- Admin accounts are created through the one-time bootstrap command. Admin API routes require an authenticated administrator; volunteer routes require an approved volunteer.

Passwords are hashed by the backend. The browser stores the short-lived JWT for API requests; the server verifies the token and enforces role access on protected routes.

## API and checks

The backend exposes `/api/health`, `/api/auth`, `/api/volunteer`, `/api/admin`, `/api/projects`, `/api/events`, and `/api/donations`. Protected admin mutations and volunteer operations are authorized by the backend.

Run backend tests from the repository root:

```sh
cd backend
npm test
```

## Donations

Money donations are made by bank transfer using the details shown on the donation page. Online card processing is not enabled. Donors may optionally attach a transaction proof or item photo.

## Project layout

- `backend/`: Express API, MySQL schema, environment template, auth, and management endpoints.
- `dashboard/`: Admin and volunteer dashboard pages.
- `public/`: Shared CSS, JavaScript, icons, and images.
- Root HTML files: public website pages.
