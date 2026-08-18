-- Harden cross-parent ownership for incidents, evidence, and reminders.

drop policy if exists "incidents own insert" on public.incidents;
drop policy if exists "incidents own update" on public.incidents;

create policy "incidents own insert"
on public.incidents
for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.cases c
    where c.id = incidents.case_id
      and c.user_id = auth.uid()
  )
);

create policy "incidents own update"
on public.incidents
for update
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.cases c
    where c.id = incidents.case_id
      and c.user_id = auth.uid()
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.cases c
    where c.id = incidents.case_id
      and c.user_id = auth.uid()
  )
);


drop policy if exists "ev own insert" on public.evidence_items;
drop policy if exists "ev own update" on public.evidence_items;

create policy "ev own insert"
on public.evidence_items
for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.incidents i
    where i.id = evidence_items.incident_id
      and i.user_id = auth.uid()
  )
);

create policy "ev own update"
on public.evidence_items
for update
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.incidents i
    where i.id = evidence_items.incident_id
      and i.user_id = auth.uid()
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.incidents i
    where i.id = evidence_items.incident_id
      and i.user_id = auth.uid()
  )
);


drop policy if exists "rem own insert" on public.reminders;
drop policy if exists "rem own update" on public.reminders;

create policy "rem own insert"
on public.reminders
for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.cases c
    where c.id = reminders.case_id
      and c.user_id = auth.uid()
  )
  and (
    incident_id is null
    or exists (
      select 1
      from public.incidents i
      where i.id = reminders.incident_id
        and i.case_id = reminders.case_id
        and i.user_id = auth.uid()
    )
  )
);

create policy "rem own update"
on public.reminders
for update
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.cases c
    where c.id = reminders.case_id
      and c.user_id = auth.uid()
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.cases c
    where c.id = reminders.case_id
      and c.user_id = auth.uid()
  )
  and (
    incident_id is null
    or exists (
      select 1
      from public.incidents i
      where i.id = reminders.incident_id
        and i.case_id = reminders.case_id
        and i.user_id = auth.uid()
    )
  )
);

-- Defense in depth: anonymous callers do not need this RPC.
revoke execute
on function public.replace_incident_entity_extraction(uuid, uuid, jsonb, jsonb)
from anon;
