create or replace function public.enforce_evidence_item_limit()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  existing_count integer;
begin
  -- Serialize evidence creation for this incident.
  perform 1
  from public.incidents
  where id = new.incident_id
  for update;

  select count(*)
  into existing_count
  from public.evidence_items
  where incident_id = new.incident_id;

  if existing_count >= 20 then
    raise exception 'Maximum 20 evidence items per incident'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists evidence_items_limit_per_incident
on public.evidence_items;

create trigger evidence_items_limit_per_incident
before insert on public.evidence_items
for each row
execute function public.enforce_evidence_item_limit();

revoke all on function public.enforce_evidence_item_limit()
from public, anon, authenticated;

grant execute on function public.enforce_evidence_item_limit()
to service_role;
