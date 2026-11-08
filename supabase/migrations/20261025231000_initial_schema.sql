create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  phone text,
  role text not null default 'user'
    check (role in ('user', 'technician', 'admin')),
  created_at timestamptz not null default now()
);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles (id),
  assigned_to uuid references public.profiles (id),
  title text not null,
  description text not null,
  property_address text not null,
  issue_type text not null default 'other'
    check (issue_type in ('plumbing', 'electrical', 'heating', 'appliance', 'structural', 'other')),
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'urgent')),
  status text not null default 'open'
    check (status in ('open', 'assigned', 'in_progress', 'resolved', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger maintenance_requests_updated_at
  before update on public.maintenance_requests
  for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.maintenance_requests enable row level security;

grant select, update (display_name, phone) on public.profiles to authenticated;
grant select, insert, update on public.maintenance_requests to authenticated;

create policy "Users can view their own profile"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

create policy "Users can update their own contact details"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "Users can view relevant maintenance requests"
  on public.maintenance_requests for select
  to authenticated
  using (
    created_by = (select auth.uid())
    or assigned_to = (select auth.uid())
    or exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'admin'
    )
  );

create policy "Users can create requests for themselves"
  on public.maintenance_requests for insert
  to authenticated
  with check (created_by = (select auth.uid()));

create policy "Technicians and admins can update requests"
  on public.maintenance_requests for update
  to authenticated
  using (
    assigned_to = (select auth.uid())
    or exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role in ('technician', 'admin')
    )
  )
  with check (
    assigned_to = (select auth.uid())
    or exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role in ('technician', 'admin')
    )
  );
