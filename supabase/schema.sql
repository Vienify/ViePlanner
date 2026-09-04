-- ViePlanner - Supabase (PostgreSQL) schema
-- Chạy toàn bộ file này trong Supabase Dashboard > SQL Editor (1 lần duy nhất khi khởi tạo dự án).
-- Dùng service role / secret key ở server nên không cần policy RLS chi tiết,
-- nhưng vẫn bật RLS và không cấp quyền gì cho anon/authenticated để chặn truy cập trực tiếp từ client.

create table if not exists users (
  id bigint generated always as identity primary key,
  email text not null unique,
  name text not null,
  zoho_id text unique,
  created_at timestamptz not null default now(),
  last_login timestamptz,
  last_login_ip text,
  last_login_device text,
  last_login_location text
);

create table if not exists categories (
  id bigint generated always as identity primary key,
  name text not null unique
);

create table if not exists ideas (
  id bigint generated always as identity primary key,
  post_date date not null,
  category text not null default '',
  post_format text not null default 'image',
  content text not null default '',
  detail_content text not null default '',
  asset_note text not null default '',
  time_fb text not null default '',
  time_ig text not null default '',
  time_threads text not null default '',
  status text not null default 'idea',
  fb_post_id text,
  ig_post_id text,
  threads_post_id text,
  created_by bigint references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ideas_post_date_idx on ideas (post_date);
create index if not exists ideas_status_idx on ideas (status);

create table if not exists assets (
  id bigint generated always as identity primary key,
  idea_id bigint not null references ideas(id) on delete cascade,
  file_path text not null,
  original_name text not null,
  kind text not null,
  platform text not null default 'general',
  created_at timestamptz not null default now()
);

create index if not exists assets_idea_id_idx on assets (idea_id);

create table if not exists notifications (
  id bigint generated always as identity primary key,
  type text not null,
  message text not null,
  idea_id bigint references ideas(id) on delete set null,
  actor_name text,
  created_at timestamptz not null default now()
);

create index if not exists notifications_created_at_idx on notifications (created_at desc);

-- Danh mục ý tưởng mặc định (tuỳ chỉnh lại theo nhu cầu thực tế).
insert into categories (name)
values ('Thương hiệu'), ('Chuyên môn sâu'), ('Outsource'), ('Sản phẩm Vienify'), ('Tuyển dụng'), ('Ngày lễ đặc biệt')
on conflict (name) do nothing;

alter table users enable row level security;
alter table categories enable row level security;
alter table ideas enable row level security;
alter table assets enable row level security;
alter table notifications enable row level security;
-- Không tạo policy nào: chỉ server (dùng SUPABASE_SECRET_KEY, bỏ qua RLS) mới đọc/ghi được.
