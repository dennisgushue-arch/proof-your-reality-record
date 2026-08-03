alter table public.subscriptions
  add column if not exists provider text not null default 'stripe',
  add column if not exists google_play_product_id text,
  add column if not exists google_play_purchase_token_hash text;

alter table public.subscriptions
  drop constraint if exists subscriptions_provider_check;

alter table public.subscriptions
  add constraint subscriptions_provider_check
  check (provider in ('stripe', 'google_play'));

create unique index if not exists subscriptions_google_play_token_hash_key
  on public.subscriptions (google_play_purchase_token_hash)
  where google_play_purchase_token_hash is not null;