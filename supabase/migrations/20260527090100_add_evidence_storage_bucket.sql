-- Private evidence storage bucket and RLS policies
-- Path convention enforced by policy: <user_id>/<case_id>/<incident_id>/<file>

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'evidence',
  'evidence',
  false,
  104857600,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'application/pdf',
    'text/plain',
    'audio/mpeg',
    'audio/wav',
    'audio/mp4',
    'video/mp4',
    'application/zip'
  ]
)
on conflict (id) do nothing;

drop policy if exists "evidence own read" on storage.objects;
create policy "evidence own read"
on storage.objects
for select
using (
  bucket_id = 'evidence'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "evidence own insert" on storage.objects;
create policy "evidence own insert"
on storage.objects
for insert
with check (
  bucket_id = 'evidence'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "evidence own update" on storage.objects;
create policy "evidence own update"
on storage.objects
for update
using (
  bucket_id = 'evidence'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'evidence'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "evidence own delete" on storage.objects;
create policy "evidence own delete"
on storage.objects
for delete
using (
  bucket_id = 'evidence'
  and (storage.foldername(name))[1] = auth.uid()::text
);
