alter table public.profiles
    add column if not exists is_approved boolean;

update public.profiles
set is_approved = true
where is_approved is null;

alter table public.profiles
    alter column is_approved set default false;

alter table public.profiles
    alter column is_approved set not null;

create index if not exists profiles_is_approved_idx
    on public.profiles (is_approved);

comment on column public.profiles.is_approved is
    'New accounts stay false until a curator approves them in the Supabase dashboard.';

alter table public.profiles enable row level security;

do $$
declare
    policy_row record;
begin
    for policy_row in
        select policyname
        from pg_policies
        where schemaname = 'public' and tablename = 'profiles'
    loop
        execute format('drop policy %I on public.profiles', policy_row.policyname);
    end loop;
end;
$$;

revoke all on table public.profiles from anon, authenticated;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    base_username text;
    final_username text;
begin
    base_username := coalesce(
        nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
        nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
        'User'
    );
    base_username := left(base_username, 55);
    final_username := base_username;

    if exists (
        select 1 from public.profiles where username = final_username
    ) then
        final_username := base_username || '-' || left(new.id::text, 8);
    end if;

    insert into public.profiles (user_id, username, email, is_approved)
    values (new.id, final_username, new.email, false)
    on conflict (user_id) do nothing;

    return new;
exception
    when unique_violation then
        insert into public.profiles (user_id, username, email, is_approved)
        values (
            new.id,
            base_username || '-' || left(new.id::text, 8),
            new.email,
            false
        )
        on conflict (user_id) do nothing;
        return new;
    when others then
        return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;

create trigger on_auth_user_created_profile
    after insert on auth.users
    for each row execute function public.handle_new_user_profile();
