-- GalaxyNote — User management schema (profiles + admin RLS)
-- Chạy 1 lần trong Supabase Dashboard → SQL Editor → New query → Run.
-- An toàn để chạy lại nhiều lần (dùng IF NOT EXISTS / OR REPLACE / DROP...IF EXISTS).

-- 1. Bảng profiles: 1 dòng cho mỗi tài khoản auth.users, chứa gói + hạn dùng + quyền admin.
create table if not exists public.profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  email            text not null,
  is_admin         boolean not null default false,
  is_active        boolean not null default true,
  plan             text not null default 'trial',       -- tên gói tuỳ ý: 'trial' | 'free' | 'pro' | ...
  plan_expires_at  timestamptz,                          -- null = không giới hạn thời gian
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- 2. Hàm kiểm tra "người gọi hiện tại có phải admin không" — SECURITY DEFINER
--    để tránh đệ quy RLS (policy không được tự query lại chính bảng có RLS).
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- 3. Policies
drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

-- Chỉ admin được sửa (gói, hạn dùng, is_active, is_admin). Người dùng thường
-- không tự sửa gói/hạn dùng của chính mình.
drop policy if exists "profiles_update_admin_only" on public.profiles;
create policy "profiles_update_admin_only"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

-- Không cho insert trực tiếp từ client — profile luôn được tạo tự động qua
-- trigger bên dưới khi có tài khoản auth.users mới.
drop policy if exists "profiles_no_direct_insert" on public.profiles;

-- Admin có thể xoá (khoá) profile — bản thân dòng auth.users vẫn còn, xoá
-- thật sự cần Supabase Dashboard → Authentication → Users → Delete
-- (yêu cầu service_role key, không thể làm an toàn từ trình duyệt).
drop policy if exists "profiles_delete_admin_only" on public.profiles;
create policy "profiles_delete_admin_only"
  on public.profiles for delete
  using (public.is_admin());

-- 4. Trigger: mỗi khi có user mới đăng ký (auth.users insert) → tự tạo 1 dòng
--    profiles tương ứng. Mặc định: gói 'trial', hạn dùng 7 ngày, is_active=true,
--    is_admin=false. Admin chỉnh lại sau trong trang /admin.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, plan, plan_expires_at)
  values (new.id, new.email, 'trial', now() + interval '7 days')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5. Backfill: tạo profile cho các tài khoản auth.users đã có sẵn từ trước
--    (kể cả tài khoản chính của bạn) — is_active=true, không giới hạn hạn dùng.
insert into public.profiles (id, email, plan, plan_expires_at, is_active)
select id, email, 'pro', null, true
from auth.users
on conflict (id) do nothing;

-- 6. QUAN TRỌNG — chạy dòng này riêng, thay '<EMAIL_CUA_BAN>' bằng đúng email
--    tài khoản bạn dùng để đăng nhập, để đánh dấu chính bạn là admin đầu tiên:
--
-- update public.profiles set is_admin = true where email = '<EMAIL_CUA_BAN>';
