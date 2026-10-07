-- Cloudflare D1 (Serverless SQLite) 数据库初始化脚本
-- 在 Cloudflare Pages 中，functions/api/[[route]].js 已内置自动建表机制
-- 您也可以在 Cloudflare 控制台或通过 wrangler 命令行手动执行此脚本：
-- wrangler d1 execute mind_map_db --file=./schema.sql

-- 1. 用户表
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  nickname TEXT NOT NULL,
  salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- 2. 会话状态表
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- 3. 思维导图项目表
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  desc TEXT DEFAULT '',
  node_count INTEGER DEFAULT 1,
  data TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 4. 按用户索引优化查询
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
