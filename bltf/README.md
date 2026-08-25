# Big Little Things Foundation — Web Platform
## Complete Setup & Deployment Guide

---

## Project Structure

```
bltf/
├── index.html                  ← Homepage
├── about.html                  ← About Us
├── projects.html               ← Projects & Drives
├── gallery.html                ← Photo Gallery
├── volunteer.html              ← Volunteer Registration
├── donate.html                 ← Donation Page
├── contact.html                ← Contact Page
├── login.html                  ← Login (Volunteer + Admin)
│
├── dashboard/
│   ├── volunteer.html          ← Volunteer Dashboard
│   ├── admin.html              ← Admin Control Panel
│   └── css/
│       └── dashboard.css       ← Dashboard Styles
│
└── public/
    ├── css/
    │   ├── main.css            ← Global Brand Styles
    │   └── home.css            ← Homepage Styles
    └── js/
        ├── config.js           ← Supabase + Utilities
        └── home.js             ← Homepage Scripts
```

---

## How to Run Locally

### Option 1 — VS Code Live Server (Recommended)
1. Open the `bltf/` folder in VS Code
2. Install the **Live Server** extension (Ritwick Dey)
3. Right-click `index.html` → **Open with Live Server**
4. Opens at `http://127.0.0.1:5500`

### Option 2 — Python
```bash
cd bltf
python -m http.server 8000
# Visit http://localhost:8000
```

### Option 3 — Node.js
```bash
cd bltf
npx serve .
```

---

## Demo Login Credentials

| Role      | Email                                  | Password      |
|-----------|----------------------------------------|---------------|
| Admin     | admin@biglittlethings.org.za           | Admin@2025!   |
| Volunteer | volunteer@biglittlethings.org.za       | Vol@2025!     |

> Click the **demo buttons** on the login page for one-click fill.

---

## System Flow

```
Visitor visits website
        ↓
Volunteers via /volunteer.html → Account created (pending)
        ↓
Admin approves via /dashboard/admin.html → Volunteer Management
        ↓
Volunteer logs hours via /dashboard/volunteer.html → Log Hours
        ↓
Admin approves hours → Hour Approvals tab
        ↓
System auto-generates certificate at 10/25/50/100 hours
        ↓
Volunteer downloads PDF certificate from their dashboard
```

---

## Connecting Supabase (Production Backend)

### Step 1 — Create Supabase Project
1. Go to https://supabase.com → New Project
2. Choose a name (e.g. `bltf-platform`) and region (South Africa if available, else EU West)
3. Copy your **Project URL** and **Anon Key**

### Step 2 — Update config.js
Open `public/js/config.js` and replace:
```js
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_KEY = 'YOUR_ANON_KEY';
```

### Step 3 — Create Database Tables
Run this SQL in the Supabase SQL Editor:

```sql
-- Users (auth managed by Supabase Auth)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  city TEXT,
  skills TEXT,
  role TEXT DEFAULT 'volunteer' CHECK (role IN ('volunteer', 'admin')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Volunteers (extended profile)
CREATE TABLE volunteers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  city TEXT,
  skills TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Volunteer Hours
CREATE TABLE volunteer_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  date DATE NOT NULL,
  hours NUMERIC(5,1) NOT NULL,
  location TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Donations
CREATE TABLE donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('money', 'food', 'clothing', 'sanitary')),
  amount NUMERIC(12,2),
  item_description TEXT,
  city TEXT,
  message TEXT,
  anonymous BOOLEAN DEFAULT FALSE,
  date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  date DATE NOT NULL,
  location TEXT NOT NULL,
  description TEXT,
  slots INTEGER DEFAULT 30,
  filled INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  location TEXT,
  goal NUMERIC(12,2) NOT NULL,
  collected NUMERIC(12,2) DEFAULT 0,
  unit TEXT DEFAULT 'items',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Certificates
CREATE TABLE certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  level TEXT NOT NULL,
  hours_at_issue NUMERIC(6,1) NOT NULL,
  issued_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gallery Images
CREATE TABLE gallery_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  caption TEXT,
  event_name TEXT,
  date DATE,
  category TEXT,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

-- Volunteers can see/update their own data
CREATE POLICY "Own data" ON users FOR ALL USING (auth.uid() = id);
CREATE POLICY "Own hours" ON volunteer_hours FOR ALL USING (auth.uid() = user_id);

-- Public can read events, projects, gallery
CREATE POLICY "Public events" ON events FOR SELECT USING (true);
CREATE POLICY "Public projects" ON projects FOR SELECT USING (true);
CREATE POLICY "Public gallery" ON gallery_images FOR SELECT USING (true);
```

### Step 4 — Seed Demo Admin
```sql
-- Run after setting up Supabase Auth
INSERT INTO users (name, email, role, status)
VALUES ('Admin Director', 'admin@biglittlethings.org.za', 'admin', 'approved');
```

---

## Payment Integration (PayFast)

To enable real donations via PayFast:

1. Register at https://www.payfast.co.za
2. Get your **Merchant ID** and **Merchant Key**
3. In `donate.html`, replace the `submitDonation()` function with:

```js
function submitDonation() {
  // ... validation code stays the same ...

  const form = document.createElement('form');
  form.method = 'POST';
  form.action = 'https://www.payfast.co.za/eng/process'; // Use sandbox for testing

  const fields = {
    merchant_id: 'YOUR_MERCHANT_ID',
    merchant_key: 'YOUR_MERCHANT_KEY',
    return_url: 'https://yoursite.com/donate-success.html',
    cancel_url: 'https://yoursite.com/donate.html',
    notify_url: 'https://yoursite.com/api/payfast-webhook',
    name_first: donorName.split(' ')[0],
    email_address: donorEmail,
    amount: selectedAmount.toFixed(2),
    item_name: 'BLTF Donation',
    item_description: 'Big Little Things Foundation Donation'
  };

  Object.entries(fields).forEach(([k, v]) => {
    const input = document.createElement('input');
    input.type = 'hidden'; input.name = k; input.value = v;
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
}
```

**Sandbox URL for testing:** `https://sandbox.payfast.co.za/eng/process`

---

## Deployment Options

### Option A — Netlify (Free, Easiest)
1. Go to https://netlify.com → New Site
2. Drag and drop the `bltf/` folder
3. Done! Gets a free `.netlify.app` domain

### Option B — Vercel (Free)
```bash
npm install -g vercel
cd bltf
vercel
```

### Option C — GitHub Pages (Free)
1. Push `bltf/` to a GitHub repo
2. Settings → Pages → Source: main branch → /root
3. Site lives at `username.github.io/repo-name`

---

## Key Features Summary

| Feature | Location | Status |
|---------|----------|--------|
| Public Homepage | index.html | ✅ Complete |
| About Us | about.html | ✅ Complete |
| Projects + Progress Bars | projects.html | ✅ Complete |
| Gallery + Lightbox + Filters | gallery.html | ✅ Complete |
| Volunteer Registration | volunteer.html | ✅ Complete |
| Donation Page | donate.html | ✅ Complete |
| Contact + FAQ | contact.html | ✅ Complete |
| Login (Volunteer + Admin) | login.html | ✅ Complete |
| Volunteer Dashboard | dashboard/volunteer.html | ✅ Complete |
| Admin Control Panel | dashboard/admin.html | ✅ Complete |
| Certificate Generation (PDF) | Volunteer Dashboard | ✅ Complete |
| Hour Logging + Approval | Both Dashboards | ✅ Complete |
| Donation Tracking | Admin Dashboard | ✅ Complete |
| Event Management | Admin Dashboard | ✅ Complete |
| Project Management | Admin Dashboard | ✅ Complete |
| Report Generation | Admin Dashboard | ✅ Complete |
| Scroll Animations | All pages | ✅ Complete |
| Mobile Responsive | All pages | ✅ Complete |
| Local Storage (Demo Mode) | All pages | ✅ Complete |
| Supabase Integration | config.js | ⚙️ Configure |
| PayFast Payments | donate.html | ⚙️ Configure |
| Email Automation | Supabase Edge Functions | ⚙️ Configure |

---

## Email Automation (Supabase Edge Functions)

Create a Supabase Edge Function for automated emails:

```bash
# Install Supabase CLI
npm install -g supabase
supabase functions new send-email

# In supabase/functions/send-email/index.ts
# Use Resend.com (free tier: 3000 emails/month)
```

Trigger emails on:
- Volunteer signup → Welcome email
- Hours approved → Confirmation + certificate notification
- Donation received → Receipt email

---

## Customisation Checklist

- [ ] Replace placeholder team photos with real photos
- [ ] Update contact details (email, phone, address)
- [ ] Update NPO registration number
- [ ] Add real social media links
- [ ] Configure Supabase project URL and key
- [ ] Set up PayFast merchant account
- [ ] Add Google Maps embed to contact page
- [ ] Upload real gallery photos via admin dashboard
- [ ] Create real events and projects via admin dashboard
- [ ] Set up domain name (e.g. biglittlethings.org.za)

---

## Tech Stack

| Layer | Technology | Cost |
|-------|-----------|------|
| Frontend | HTML5, CSS3, Vanilla JS | Free |
| Backend | Supabase (PostgreSQL) | Free tier |
| Auth | Supabase Auth | Free tier |
| Storage | Supabase Storage | Free tier |
| Hosting | Netlify / Vercel | Free tier |
| Payments | PayFast | % per transaction |
| Emails | Resend.com | Free up to 3000/mo |
| Fonts | Google Fonts | Free |

**Total cost to run: R0/month on free tiers** ✅

---

*Built for Big Little Things Foundation — Empowering communities through youth-driven initiatives.*
