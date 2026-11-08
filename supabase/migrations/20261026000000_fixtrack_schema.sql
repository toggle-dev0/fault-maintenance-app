-- FixTrack schema: three roles only (user, technician, admin).
-- Follow-up to 20261025231000_initial_schema.sql. It replaces the generic
-- maintenance_requests table with the FixTrack fault model.
-- WARNING: drops maintenance_requests. Only safe while it holds no real data.

drop table if exists public.maintenance_requests cascade;

-- ---------------------------------------------------------------------------
-- profiles: keep as is, swap phone for the sign-up field "hostel or organization"
-- ---------------------------------------------------------------------------
alter table public.profiles drop column if exists phone;
alter table public.profiles add column if not exists organization text;

-- Sign-up always creates a 'user'. Role is never read from user-supplied metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, organization)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'organization'
  );
  return new;
end;
$$;

-- The caller's role, read without triggering profiles RLS (avoids recursion).
create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid())
$$;

revoke all on function public.current_app_role() from public, anon;
grant execute on function public.current_app_role() to authenticated;

-- ---------------------------------------------------------------------------
-- faults
-- ---------------------------------------------------------------------------
create table public.faults (
  id uuid primary key default gen_random_uuid(),
  ref_number bigint generated always as identity unique,
  reported_by uuid not null references public.profiles (id),
  assigned_to uuid references public.profiles (id),
  title text not null check (char_length(title) between 3 and 120),
  description text not null check (char_length(description) between 1 and 2000),
  category text not null default 'other'
    check (category in ('furniture', 'electrical', 'plumbing', 'lift', 'other')),
  building text not null check (char_length(building) between 1 and 120),
  location_detail text check (char_length(location_detail) <= 200),
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'critical')),
  status text not null default 'reported'
    check (status in ('reported', 'assigned', 'in_progress', 'resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint faults_assignment_matches_status check (
    (status = 'reported' and assigned_to is null)
    or (status <> 'reported' and assigned_to is not null)
  )
);

create index faults_reported_by_idx on public.faults (reported_by);
create index faults_assigned_to_idx on public.faults (assigned_to);
create index faults_status_idx on public.faults (status);

create table public.fault_updates (
  id uuid primary key default gen_random_uuid(),
  fault_id uuid not null references public.faults (id) on delete cascade,
  author_id uuid references public.profiles (id),
  kind text not null check (kind in ('reported', 'assigned', 'status_changed', 'note')),
  assignee_id uuid references public.profiles (id),
  from_status text,
  to_status text,
  note text check (char_length(note) <= 2000),
  created_at timestamptz not null default now(),
  constraint fault_updates_note_required check (kind <> 'note' or note is not null)
);

create index fault_updates_fault_idx on public.fault_updates (fault_id, created_at);

create table public.fault_feedback (
  id uuid primary key default gen_random_uuid(),
  fault_id uuid not null unique references public.faults (id) on delete cascade,
  user_id uuid not null references public.profiles (id),
  rating smallint not null check (rating between 1 and 5),
  comment text check (char_length(comment) <= 1000),
  created_at timestamptz not null default now()
);

create table public.fault_photos (
  id uuid primary key default gen_random_uuid(),
  fault_id uuid not null references public.faults (id) on delete cascade,
  storage_path text not null unique,
  uploaded_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create index fault_photos_fault_idx on public.fault_photos (fault_id);

-- ---------------------------------------------------------------------------
-- Triggers: who may change what on a fault, and the repair log
-- ---------------------------------------------------------------------------
create or replace function public.guard_fault_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  actor_role text := public.current_app_role();
begin
  -- No signed-in user (service role, migrations): not restricted here.
  if actor is not null then
    if new.id <> old.id or new.ref_number <> old.ref_number
       or new.reported_by <> old.reported_by or new.created_at <> old.created_at then
      raise exception 'Immutable fault column' using errcode = '42501';
    end if;

    if actor_role = 'admin' then
      if new.assigned_to is distinct from old.assigned_to then
        if new.assigned_to is null
           or (select role from public.profiles where id = new.assigned_to) is distinct from 'technician' then
          raise exception 'Faults can only be assigned to a technician' using errcode = '23514';
        end if;
        if old.status = 'reported' then
          new.status := 'assigned';
        end if;
      end if;

    elsif actor_role = 'technician' then
      if actor is distinct from old.assigned_to then
        raise exception 'Fault is not assigned to you' using errcode = '42501';
      end if;
      if (new.title, new.description, new.category, new.building,
          new.location_detail, new.priority, new.assigned_to)
         is distinct from
         (old.title, old.description, old.category, old.building,
          old.location_detail, old.priority, old.assigned_to) then
        raise exception 'Technicians can only change the status' using errcode = '42501';
      end if;
      if new.status is distinct from old.status and not (
           (old.status = 'assigned' and new.status = 'in_progress')
        or (old.status = 'in_progress' and new.status = 'resolved')
      ) then
        raise exception 'Invalid status change' using errcode = '23514';
      end if;

    else
      raise exception 'Not allowed to update faults' using errcode = '42501';
    end if;
  end if;

  new.updated_at := now();
  new.resolved_at := case when new.status = 'resolved' then coalesce(old.resolved_at, now()) else null end;
  return new;
end;
$$;

create trigger faults_guard
  before update on public.faults
  for each row execute function public.guard_fault_update();

create or replace function public.log_fault_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.fault_updates (fault_id, author_id, kind, to_status)
    values (new.id, new.reported_by, 'reported', new.status);
  elsif new.assigned_to is distinct from old.assigned_to then
    insert into public.fault_updates (fault_id, author_id, kind, assignee_id, from_status, to_status)
    values (new.id, (select auth.uid()), 'assigned', new.assigned_to, old.status, new.status);
  elsif new.status is distinct from old.status then
    insert into public.fault_updates (fault_id, author_id, kind, from_status, to_status)
    values (new.id, (select auth.uid()), 'status_changed', old.status, new.status);
  end if;
  return null;
end;
$$;

create trigger faults_log
  after insert or update on public.faults
  for each row execute function public.log_fault_change();

-- ---------------------------------------------------------------------------
-- Privileges: nothing for anon; minimal for authenticated (RLS does the rest)
-- ---------------------------------------------------------------------------
revoke all on public.profiles, public.faults, public.fault_updates,
  public.fault_feedback, public.fault_photos from anon;
revoke all on public.faults, public.fault_updates,
  public.fault_feedback, public.fault_photos from authenticated;
revoke update on public.profiles from authenticated;

grant select on public.profiles to authenticated;
grant update (display_name, organization) on public.profiles to authenticated;

grant select on public.faults to authenticated;
grant insert (reported_by, title, description, category, building, location_detail, priority)
  on public.faults to authenticated;
grant update (title, description, category, building, location_detail, priority, status, assigned_to)
  on public.faults to authenticated;

grant select on public.fault_updates to authenticated;
grant insert (fault_id, author_id, kind, note) on public.fault_updates to authenticated;

grant select on public.fault_feedback to authenticated;
grant insert (fault_id, user_id, rating, comment) on public.fault_feedback to authenticated;

grant select on public.fault_photos to authenticated;
grant insert (fault_id, storage_path, uploaded_by) on public.fault_photos to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.faults enable row level security;
alter table public.fault_updates enable row level security;
alter table public.fault_feedback enable row level security;
alter table public.fault_photos enable row level security;

-- profiles: own row (existing policies) + admins see everyone
-- + people on faults I can see (so users see their technician and vice versa)
create policy "Admins can view all profiles"
  on public.profiles for select to authenticated
  using (public.current_app_role() = 'admin');

create policy "People on faults I can see are visible"
  on public.profiles for select to authenticated
  using (
    exists (
      select 1 from public.faults f
      where f.assigned_to = profiles.id or f.reported_by = profiles.id
    )
  );

-- faults
create policy "View own, assigned, or all as admin"
  on public.faults for select to authenticated
  using (
    reported_by = (select auth.uid())
    or assigned_to = (select auth.uid())
    or public.current_app_role() = 'admin'
  );

create policy "Report a fault as yourself"
  on public.faults for insert to authenticated
  with check (
    reported_by = (select auth.uid())
    and status = 'reported'
    and assigned_to is null
  );

create policy "Admins and the assigned technician can update"
  on public.faults for update to authenticated
  using (assigned_to = (select auth.uid()) or public.current_app_role() = 'admin')
  with check (assigned_to = (select auth.uid()) or public.current_app_role() = 'admin');

-- fault_updates (repair log). System entries come from triggers.
create policy "View the log of faults I can see"
  on public.fault_updates for select to authenticated
  using (exists (select 1 from public.faults f where f.id = fault_id));

create policy "Technician or admin can add a note"
  on public.fault_updates for insert to authenticated
  with check (
    kind = 'note'
    and author_id = (select auth.uid())
    and exists (
      select 1 from public.faults f
      where f.id = fault_id
        and (f.assigned_to = (select auth.uid()) or public.current_app_role() = 'admin')
    )
  );

-- fault_feedback: reporter, once, after the fault is resolved
create policy "View my feedback, feedback on my assignments, or all as admin"
  on public.fault_feedback for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.current_app_role() = 'admin'
    or exists (select 1 from public.faults f where f.id = fault_id and f.assigned_to = (select auth.uid()))
  );

create policy "Reporter can rate a resolved fault"
  on public.fault_feedback for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.faults f
      where f.id = fault_id
        and f.reported_by = (select auth.uid())
        and f.status = 'resolved'
    )
  );

-- fault_photos
create policy "View photos of faults I can see"
  on public.fault_photos for select to authenticated
  using (exists (select 1 from public.faults f where f.id = fault_id));

create policy "Add photos to faults I can see"
  on public.fault_photos for insert to authenticated
  with check (
    uploaded_by = (select auth.uid())
    and exists (select 1 from public.faults f where f.id = fault_id)
  );

-- ---------------------------------------------------------------------------
-- Storage: private bucket, files stored as <fault_id>/<filename>
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fault-photos', 'fault-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Read photos of faults I can see"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'fault-photos'
    and exists (select 1 from public.faults f where f.id::text = (storage.foldername(name))[1])
  );

create policy "Upload photos to faults I can see"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'fault-photos'
    and exists (select 1 from public.faults f where f.id::text = (storage.foldername(name))[1])
  );
