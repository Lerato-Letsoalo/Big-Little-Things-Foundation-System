-- Run in Supabase SQL editor. Extends the donations table used by donate.html
-- with the fields the PayFast backend needs.

create table if not exists donations (
    id                 uuid primary key default gen_random_uuid(),
    donor_name         text not null,
    donor_email        text not null,
    type               text not null,               -- 'money' | 'goods' | etc.
    amount             numeric(10,2),                -- null for non-money donations
    item_description   text,
    city               text,
    message            text,
    anonymous          boolean default false,
    status             text not null default 'pending',  -- pending | complete | failed | recorded
    payfast_payment_id text,                          -- PayFast's own transaction id (pf_payment_id)
    verification_note  text,                          -- why verify_itn() passed/failed, for debugging
    created_at         timestamptz not null default now()
);

create index if not exists idx_donations_status on donations (status);
