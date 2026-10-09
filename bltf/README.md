# Big Little Things Foundation

Static HTML/CSS/JavaScript frontend connected to the Flask and SQLite backend.

## Local Setup

Run these steps from the backend project directory:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
python -c "import sqlite3; db=sqlite3.connect('bltf.db'); db.executescript(open('sql/schema.sql', encoding='utf-8').read()); db.executescript(open('sql/donations.sql', encoding='utf-8').read()); db.close()"
flask --app app create-admin
python app.py
```

The admin command prompts for a name, email, and password. It stores a password hash in SQLite; no demo credentials are built into the website.

In a second terminal, serve the `bltf/` folder with VS Code Live Server or:

```powershell
python -m http.server 5500 --directory "path\to\bltf"
```

Open `http://127.0.0.1:5500`. The frontend uses `http://127.0.0.1:5000/api` by default. Set `window.BLTF_API_URL` before loading `public/js/config.js` when the API is hosted elsewhere.

For an existing database, run `sql/migrate_frontend_profile_fields.sql` once before starting the updated backend.

## Account And Certificate Flow

1. Volunteer registration saves the account and profile details in SQLite with `pending` status. Passwords are hashed by the backend.
2. An administrator signs in and approves the account in Volunteer Management.
3. The volunteer signs in, submits hours, and the submission is stored as `pending`.
4. An administrator approves the submission in Hour Approvals. That UI action issues one PDF certificate on the backend and stores its record and file.
5. The volunteer opens My Certificates and downloads the issued PDF. The backend checks the session and certificate ownership.

Only authentication, volunteer profiles, hour submissions, approvals, and certificates currently use the backend. Events, projects, donations, and other demo content remain browser-local until their APIs are connected.