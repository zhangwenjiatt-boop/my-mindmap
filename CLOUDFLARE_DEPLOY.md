# ☁️ Cloudflare Pages + D1 边缘部署完整指南

本项目已完成 **Cloudflare 全栈边缘架构** 改造适配，当前分支为 `cloudflare-pages`。

---

## 一、架构优势

- **全球极速**：前端静态资源通过 Cloudflare 全球 300+ 边缘节点 CDN 分发，秒开访问。
- **免服务器运行**：后端接口由 **Cloudflare Pages Functions**（Serverless 边缘函数）驱动，无需租用 VPS、无需维护 Node 进程。
- **数据持久化**：账号、密码与思维导图工程持久化存储在 **Cloudflare D1**（全球边缘分布式 SQLite 数据库）中，关机无忧，永久保存。
- **全免费**：Cloudflare Pages 与 D1 免费额度充足（D1 每日免费 500 万次行读取，Pages 无限流量），个人与多人团队使用完全零成本。

---

## 二、部署方式一：网页控制台一键部署（推荐，零命令行）

### 步骤 1：将代码推送到 GitHub
确保当前 `cloudflare-pages` 分支已推送到您的 GitHub 仓库：
```bash
git push -u origin cloudflare-pages
```

---

### 步骤 2：创建 Cloudflare D1 数据库
1. 登录 [Cloudflare 控制台](https://dash.cloudflare.com/)；
2. 在左侧菜单栏点击 **【存储和数据库】(Storage & Databases)** -> **【D1 SQL 数据库】**；
3. 点击 **【创建数据库】(Create Database)**：
   - 数据库名称填写：`mind_map_db`
   - 区域选择：建议亚太地区或默认自动；
4. 点击创建即可（无需手动执行建表 SQL，后端边缘函数会在首次访问时自动初始化所有表结构）。

---

### 步骤 3：创建 Cloudflare Pages 项目
1. 在左侧菜单栏点击 **【Workers 和 Pages】** -> 点击 **【创建应用程序】** -> 选择 **【Pages】** 标签页；
2. 点击 **【连接到 Git】(Connect to Git)**，授权并选择您的思维导图 GitHub 仓库；
3. 在构建设置中配置：
   - **项目名称**：自定义（例如 `my-mindmap`）；
   - **生产分支**：选择 `cloudflare-pages`；
   - **框架预设**：选择 `None`；
   - **构建命令 (Build command)**：留空（或者填 `echo "OK"`，因为 `dist/` 资源已构建就绪）；
   - **构建输出目录 (Build output directory)**：填写 `.`（即项目根目录）；
4. 点击 **【保存并部署】**。

---

### 步骤 4：绑定 D1 数据库到 Pages（关键一步）
1. 部署完成后，进入该 Pages 项目的详情页，点击顶部的 **【设置】(Settings)** 标签页；
2. 在左侧子菜单中选择 **【函数】(Functions)**；
3. 向下滚动找到 **【D1 数据库绑定】(D1 Database Bindings)**，点击 **【添加绑定】(Add binding)**：
   - **变量名称 (Variable name)**：必须严格填写 `DB`（大写）
   - **D1 数据库 (D1 Database)**：选择步骤 2 中创建的 `mind_map_db`
4. 点击 **【保存】(Save)**。

---

### 步骤 5：重新触发部署
绑定好数据库后，在 Pages 项目页面点击 **【部署】(Deployments)** -> 找到最新的一次部署，点击右侧的三个点选择 **【重试部署】(Retry deployment)**。

部署完成后，Cloudflare 会生成一个免费的专属域名，形如：
```text
https://my-mindmap.pages.dev
```
👉 **此时在浏览器中打开该链接，即可在全球公网上流畅注册登录、保存和管理多个思维导图！**

---

## 三、部署方式二：使用 Wrangler 命令行部署（开发者进阶）

如果您安装了 Node.js 环境，可直接通过 Cloudflare 官方 CLI 工具 `wrangler` 部署：

```bash
# 1. 登录 Cloudflare
npx wrangler login

# 2. 创建 D1 数据库
npx wrangler d1 create mind_map_db
# 终端会打印出 database_id，例如：xxxx-xxxx-xxxx

# 3. 初始化表结构（可选，函数内部亦包含自动建表）
npx wrangler d1 execute mind_map_db --file=./schema.sql

# 4. 一键部署到 Cloudflare Pages
npx wrangler pages deploy . --project-name=mind-map
```

部署完成后，在 Cloudflare Pages 后台将该项目绑定到 `mind_map_db` 即可。

---

## 四、绑定自定义独立域名（可选）

如果您拥有自己的域名（如 `yourdomain.com`）：
1. 在 Pages 项目的 **【自定义域】(Custom Domains)** 选项卡中，点击 **【设置自定义域】**；
2. 输入您想要的子域名，如 `mind.yourdomain.com`；
3. Cloudflare 会自动完成 DNS 记录添加并自动配置全球 SSL 证书（HTTPS）。

---

## 五、目录结构说明

```text
├── functions/
│   └── api/
│       └── [[route]].js       # Cloudflare Pages 边缘路由与全部接口处理
├── schema.sql                 # Cloudflare D1 数据库建表语句
├── wrangler.toml              # Cloudflare Pages 配置文件
├── _routes.json               # 静态资源与 API 路由分流规则
├── 404.html                   # SPA 路由兜底页面
├── index.html                 # 思维导图入口单页
└── dist/                      # 编译后的前端资源包
```
