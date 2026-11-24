create or replace function public.get_technician_assignments(
  p_view text default 'active',
  p_limit integer default 100,
  p_offset integer default 0
)
returns table (
  id uuid,
  title text,
  ref_number bigint,
  building text,
  location_detail text,
  priority text,
  status text,
  created_at timestamptz,
  resolved_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    f.id,
    f.title,
    f.ref_number,
    f.building,
    f.location_detail,
    f.priority,
    f.status,
    f.created_at,
    f.resolved_at
  from public.faults f
  where f.assigned_to = (select auth.uid())
    and (
      (p_view = 'todo' and f.status = 'assigned')
      or (
        p_view = 'done'
        and f.status = 'resolved'
        and f.resolved_at >= (now() - interval '7 days')
      )
      or (p_view = 'active' and f.status in ('assigned', 'in_progress'))
    )
  order by
    case
      when p_view in ('active', 'todo') then
        case f.priority
          when 'critical' then 3
          when 'medium' then 2
          when 'low' then 1
          else 0
        end
    end desc nulls last,
    case
      when p_view in ('active', 'todo') then f.created_at
    end asc nulls last,
    case
      when p_view = 'done' then f.resolved_at
    end desc nulls last,
    f.id asc
  limit least(greatest(p_limit, 1), 100)
  offset greatest(p_offset, 0);
$$;

revoke all on function public.get_technician_assignments(text, integer, integer) from public, anon;
grant execute on function public.get_technician_assignments(text, integer, integer) to authenticated;
