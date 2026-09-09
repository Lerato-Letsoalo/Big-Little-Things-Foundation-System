-- Run in Supabase SQL editor. Core tables for auth-linked users, volunteer
-- hours, and certificates. Run sql/donations.sql separately for donations.

create table if not exists users (
    id         uuid primary key references auth.users(id) on delete cascade,
    name       text not null,
    email      text not null unique,
    role       text not null default 'volunteer',   -- 'volunteer' | 'admin'
    status     text not null default 'pending',      -- 'pending' | 'approved' | 'suspended'
    created_at timestamptz not null default now()
);

create table if not exists volunteer_hours (
    id           uuid primary key default gen_random_uuid(),
    user_id      uuid not null references users(id) on delete cascade,
    event_name   text not null,
    date         date not null,
    hours        numeric(4,1) not null check (hours >= 0.5 and hours <= 24),
    status       text not null default 'pending',    -- 'pending' | 'approved' | 'rejected'
    submitted_at timestamptz not null default now()
);

create table if not exists certificates (
    id              uuid primary key default gen_random_uuid(),
    user_id         uuid not null references users(id) on delete cascade,
    level           text not null,                    -- 'Bronze' | 'Silver' | 'Gold' | 'Platinum'
    hours_at_issue  numeric(6,1) not null,
    file_path       text not null,                     -- path inside the 'certificates' storage bucket
    issued_at       timestamptz not null default now(),
    unique (user_id, level)                             -- prevents duplicate issuance at the DB level too
);

create index if not exists idx_volunteer_hours_user   on volunteer_hours (user_id);
create index if not exists idx_volunteer_hours_status on volunteer_hours (status);
create index if not exists idx_certificates_user      on certificates (user_id);

-- Row-level security: volunteers can only see/insert their own rows;
-- admins (checked via the users table) can see everything.
alter table volunteer_hours enable row level security;
alter table certificates enable row level security;

create policy "Volunteers manage their own hours"
    on volunteer_hours for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "Volunteers view their own certificates"
    on certificates for select
    using (auth.uid() = user_id);

-- Note: the Flask backend uses the service_role key, which bypasses RLS
-- entirely for admin actions (listing all hours, approving, issuing
-- certificates) — these policies only govern any direct-from-browser access.

-- Also create a Storage bucket named 'certificates' (Storage -> New bucket,
-- keep it private) so signed URLs can be issued for downloads.
