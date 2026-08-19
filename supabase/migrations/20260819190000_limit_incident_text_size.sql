alter table public.incidents
  drop constraint if exists incidents_title_length_check;

alter table public.incidents
  add constraint incidents_title_length_check
  check (char_length(title) <= 300);

alter table public.incidents
  drop constraint if exists incidents_raw_narrative_length_check;

alter table public.incidents
  add constraint incidents_raw_narrative_length_check
  check (char_length(raw_narrative) <= 50000);
