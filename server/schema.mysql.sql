create table if not exists auth_users (
  id char(36) primary key,
  email varchar(255) not null unique,
  password_hash varchar(255) not null,
  email_confirmed tinyint(1) not null default 1,
  created_at datetime not null
);

create table if not exists profiles (
  id char(36) primary key,
  name varchar(255) not null,
  role varchar(50) not null default 'Moderador',
  consortium_name varchar(255) null,
  is_approved tinyint(1) not null default 0,
  created_at datetime not null,
  updated_at datetime not null,
  constraint fk_profiles_user foreign key (id) references auth_users(id) on delete cascade
);

create table if not exists app_settings (
  id int primary key,
  app_name varchar(255) not null,
  app_logo_url text null,
  ticket_name varchar(255) not null,
  ticket_logo_url text null,
  updated_at datetime null
);

insert ignore into app_settings (id, app_name, app_logo_url, ticket_name, ticket_logo_url, updated_at)
values (1, 'MBRACES', null, 'CONSORCIO MBRACES', null, now());

create table if not exists terminals (
  id char(36) primary key,
  owner_id char(36) not null,
  auth_token varchar(128) not null,
  name varchar(255) not null,
  address varchar(255) null,
  phone varchar(50) null,
  manager varchar(255) null,
  type varchar(50) not null,
  status varchar(50) not null,
  last_sync datetime null,
  last_race_number varchar(50) null,
  last_ticket_number varchar(50) null,
  daily_sales decimal(12,2) not null default 0,
  daily_payouts decimal(12,2) not null default 0,
  ini_content json null,
  software_version varchar(50) null,
  created_at datetime not null,
  updated_at datetime not null,
  index idx_terminals_owner (owner_id),
  constraint fk_terminals_owner foreign key (owner_id) references auth_users(id) on delete cascade
);

create table if not exists transactions (
  id char(36) primary key,
  created_at datetime not null,
  terminal_owner_id char(36) not null,
  terminal_id char(36) not null,
  machine_name varchar(255) null,
  type varchar(10) not null,
  amount decimal(12,2) not null,
  ticket_id varchar(100) null,
  numbers text null,
  play_type varchar(100) null,
  status varchar(20) not null default 'active',
  index idx_tx_owner_created (terminal_owner_id, created_at),
  index idx_tx_terminal_created (terminal_id, created_at)
);

create table if not exists sync_tickets (
  id char(36) primary key,
  created_at datetime not null,
  terminal_id char(36) not null,
  ticket_number varchar(100) not null,
  ticket_type varchar(10) not null default 'BET',
  amount decimal(12,2) not null,
  odds decimal(12,2) not null default 0,
  race_number varchar(50) null,
  numbers text null,
  play_type varchar(100) null,
  local_date date null,
  local_time time null,
  raw_data json null,
  status varchar(20) not null default 'active',
  index idx_sync_tickets_terminal_created (terminal_id, created_at),
  index idx_sync_tickets_local_date (local_date)
);

create table if not exists sync_races (
  id char(36) primary key,
  created_at datetime not null,
  terminal_id char(36) not null,
  race_number varchar(50) not null,
  winner_numbers varchar(255) null,
  local_date date null,
  local_time time null,
  index idx_sync_races_terminal_created (terminal_id, created_at)
);

create table if not exists jackpot_values (
  id int primary key,
  current_value decimal(12,2) not null default 0,
  updated_at datetime null
);

insert ignore into jackpot_values (id, current_value, updated_at) values (1, 0, now());

create table if not exists voided_tickets (
  id char(36) primary key,
  terminal_id char(36) not null,
  ticket_number varchar(100) not null,
  tipo varchar(100) null,
  numeros text null,
  valor varchar(100) null,
  monto varchar(100) null,
  race varchar(50) null,
  fecha varchar(50) null,
  hora varchar(50) null,
  synced tinyint(1) not null default 0,
  synced_at datetime null,
  created_at datetime not null,
  index idx_voided_terminal_synced (terminal_id, synced)
);

create table if not exists notifications (
  id char(36) primary key,
  title varchar(255) not null,
  message text not null,
  type varchar(50) not null,
  created_at datetime not null
);

