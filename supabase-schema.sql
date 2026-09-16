-- DATAKU - Database Schema for Supabase SQL Editor
-- Create all tables with standard relationships and indexes

-- Enable UUID extension if not already present
create extension if not exists "uuid-ossp";

-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  full_name text not null,
  phone text,
  email text,
  avatar_url text,
  role text default 'mandor',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Profiles
alter table public.profiles enable row level security;
create policy "Allow public read-access to profiles" on public.profiles for select using (true);
create policy "Allow users to update own profile" on public.profiles for update using (auth.uid() = id);

-- 2. PROJECTS TABLE
create table if not exists public.projects (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  owner_name text not null,
  location text not null,
  start_date date not null,
  target_date date not null,
  budget numeric(15,2) not null check (budget >= 0),
  description text,
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Projects
alter table public.projects enable row level security;
create policy "Users can CRUD projects they created" on public.projects for all using (auth.uid() = created_by);

-- 3. FUNDS / DANA MASUK TABLE
create table if not exists public.funds (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  amount numeric(15,2) not null check (amount > 0),
  source text not null, -- Modal Pemilik, Uang Muka Proyek, Pembayaran Termin, etc.
  payment_method text not null,
  transaction_date date not null,
  description text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Funds
alter table public.funds enable row level security;
create policy "Users can manage funds of their projects" on public.funds for all using (
  exists (select 1 from public.projects where id = funds.project_id and created_by = auth.uid())
);

-- 4. TRANSACTIONS / PENGELUARAN TABLE
create table if not exists public.transactions (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  type text not null check (type in ('income', 'expense')),
  category text not null, -- material, wages, transport, consumption, etc.
  amount numeric(15,2) not null check (amount > 0),
  recipient text not null,
  description text,
  transaction_date date not null,
  reference_id uuid, -- Optional reference
  display_order integer default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Transactions
alter table public.transactions enable row level security;
create policy "Users can manage transactions of their projects" on public.transactions for all using (
  exists (select 1 from public.projects where id = transactions.project_id and created_by = auth.uid())
);

-- 5. MATERIALS TABLE
create table if not exists public.materials (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  name text not null,
  category text not null, -- Semen, Pasir, Batu, etc.
  unit text not null,
  stock numeric(12,2) default 0.00 not null,
  minimum_stock numeric(12,2) default 0.00 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (project_id, name)
);

-- Enable RLS for Materials
alter table public.materials enable row level security;
create policy "Users can manage materials of their projects" on public.materials for all using (
  exists (select 1 from public.projects where id = materials.project_id and created_by = auth.uid())
);

-- 6. MATERIAL TRANSACTIONS TABLE
create table if not exists public.material_transactions (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  material_id uuid references public.materials(id) on delete cascade not null,
  type text not null check (type in ('in', 'out', 'used')),
  quantity numeric(12,2) not null check (quantity > 0),
  unit_price numeric(15,2) check (unit_price >= 0),
  supplier text,
  purpose text,
  transaction_date date not null,
  description text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Material Transactions
alter table public.material_transactions enable row level security;
create policy "Users can manage material logs of their projects" on public.material_transactions for all using (
  exists (select 1 from public.projects where id = material_transactions.project_id and created_by = auth.uid())
);

-- 7. WORKERS TABLE
create table if not exists public.workers (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  name text not null,
  position text not null,
  phone text,
  daily_rate numeric(15,2) not null check (daily_rate >= 0),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Workers
alter table public.workers enable row level security;
create policy "Users can manage workers of their projects" on public.workers for all using (
  exists (select 1 from public.projects where id = workers.project_id and created_by = auth.uid())
);

-- 8. WORKER PAYMENTS TABLE
create table if not exists public.worker_payments (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  worker_id uuid references public.workers(id) on delete cascade not null,
  work_days numeric(5,1) not null check (work_days >= 0),
  daily_rate numeric(15,2) not null,
  bonus numeric(15,2) default 0.00 not null check (bonus >= 0),
  deduction numeric(15,2) default 0.00 not null check (deduction >= 0),
  total_amount numeric(15,2) not null,
  payment_date date not null,
  payment_method text not null,
  status text not null default 'unpaid' check (status in ('unpaid', 'partial', 'paid')),
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Worker Payments
alter table public.worker_payments enable row level security;
create policy "Users can manage worker payments of their projects" on public.worker_payments for all using (
  exists (select 1 from public.projects where id = worker_payments.project_id and created_by = auth.uid())
);

-- 9. DAILY REPORTS TABLE
create table if not exists public.daily_reports (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  report_date date not null,
  weather text not null,
  worker_count integer default 0 not null,
  work_description text not null,
  materials_used text,
  obstacles text,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (project_id, report_date)
);

-- Enable RLS for Daily Reports
alter table public.daily_reports enable row level security;
create policy "Users can manage reports of their projects" on public.daily_reports for all using (
  exists (select 1 from public.projects where id = daily_reports.project_id and created_by = auth.uid())
);

-- 10. ATTACHMENTS TABLE
create table if not exists public.attachments (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  reference_type text not null check (reference_type in ('fund', 'material', 'transaction', 'worker_payment', 'daily_report', 'profile')),
  reference_id uuid not null,
  file_url text not null,
  file_name text not null,
  file_type text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Attachments
alter table public.attachments enable row level security;
create policy "Users can manage attachments of their projects" on public.attachments for all using (
  exists (select 1 from public.projects where id = attachments.project_id and created_by = auth.uid())
);

-- Create bucket via Storage API or manually in Supabase Console
-- Bucket Name: "dataku-files"
