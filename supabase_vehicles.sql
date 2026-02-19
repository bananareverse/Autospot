-- Create the vehicles table
create table public.vehicles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  make text not null,
  model text not null,
  year integer not null,
  license_plate text,
  vin text,
  color text,
  photo_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.vehicles enable row level security;

-- Create policies
create policy "Users can view their own vehicles"
  on public.vehicles for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own vehicles"
  on public.vehicles for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own vehicles"
  on public.vehicles for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own vehicles"
  on public.vehicles for delete
  using ( auth.uid() = user_id );
