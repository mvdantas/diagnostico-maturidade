-- Supabase schema for Diagnóstico de Maturidade Digital leads
-- Apply in Supabase SQL editor or via Supabase CLI.
-- This migration creates the primary lead table only. It does not send emails
-- and does not integrate with HubSpot.

create extension if not exists pgcrypto;

create table if not exists public.diagnostic_leads (
  id uuid primary key default gen_random_uuid(),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Origin and attribution. These fields have defaults and are not required in
  -- the client payload.
  source text not null default 'diagnostico-maturidade-digital',
  campaign text not null default 'onda-01-ia-saude',
  page_url text,
  referrer text,

  -- Lead identity. These fields must be provided by the backend payload.
  name text not null,
  email text not null,
  whatsapp text not null,
  city text not null,
  specialty text not null,

  -- Diagnostic result. These fields must be provided by the backend payload.
  final_score integer not null check (final_score >= 0 and final_score <= 100),
  total_got integer,
  total_max integer,
  maturity_stage_label text not null,
  maturity_stage_min integer,
  maturity_stage_max integer,

  -- Diagnostic details. These fields must be provided by the backend payload.
  dimension_scores jsonb not null default '{}'::jsonb,
  answers jsonb not null default '{}'::jsonb,

  -- UTM attribution
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  utm_id text,

  -- LGPD consent
  lgpd_consent boolean not null default false,
  lgpd_consent_text text,
  lgpd_consent_version text,
  lgpd_consent_at timestamptz,
  privacy_policy_url text,
  marketing_consent boolean not null default false,
  marketing_consent_at timestamptz,

  -- Technical audit data
  user_agent text,
  ip_hash text,

  -- Commercial workflow. These fields have defaults and are not required in
  -- the client payload.
  wants_consulting boolean not null default false,
  lead_status text not null default 'new',

  -- Future integrations. These fields are placeholders only; no integration is
  -- implemented in this migration.
  hubspot_status text not null default 'not_sent',
  hubspot_contact_id text,
  hubspot_last_error text,
  resend_status text not null default 'not_sent',
  resend_last_error text
);

create index if not exists diagnostic_leads_created_at_idx
  on public.diagnostic_leads (created_at desc);

create index if not exists diagnostic_leads_email_idx
  on public.diagnostic_leads (lower(email));

create index if not exists diagnostic_leads_whatsapp_idx
  on public.diagnostic_leads (whatsapp);

create index if not exists diagnostic_leads_stage_idx
  on public.diagnostic_leads (maturity_stage_label);

create index if not exists diagnostic_leads_utm_campaign_idx
  on public.diagnostic_leads (utm_campaign);

create index if not exists diagnostic_leads_lead_status_idx
  on public.diagnostic_leads (lead_status);

alter table public.diagnostic_leads enable row level security;

-- No public insert/select/update/delete policies are created on purpose.
-- The application should insert through a Vercel backend route using
-- SUPABASE_SERVICE_ROLE_KEY, never directly from the browser.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists diagnostic_leads_set_updated_at on public.diagnostic_leads;

create trigger diagnostic_leads_set_updated_at
before update on public.diagnostic_leads
for each row
execute function public.set_updated_at();
