# 思绪思维导图 (Simple Mind Map) 部署与使用指南

本项目基于开源项目 [wanglin2/mind-map](https://github.com/wanglin2/mind-map) 完整构建，已在本地部署并继承了全部完整功能。

---

## 目录
1. [项目结构说明](#1-项目结构说明)
2. [本地启动与使用](#2-本地启动与使用)
3. [继承的功能特性](#3-继承的功能特性)
4. [部署到互联网 (公网访问) 方案](#4-部署到互联网-公网访问-方案)
   - [方案一：Docker / Docker Compose 部署 (推荐)](#方案一docker--docker-compose-部署-推荐)
   - [方案二：Nginx / 云服务器原生静态部署](#方案二nginx--云服务器原生静态部署)
   - [方案三：免费 Serverless 静态托管 (Cloudflare Pages / Vercel / GitHub Pages)](#方案三免费-serverless-静态托管)
   - [方案四：内网穿透 (无需云服务器公网访问)](#方案四内网穿透-无需云服务器公网访问)
5. [数据存储与云同步配置](#5-数据存储与云同步配置)

---

## 1. 项目结构说明

```text
e:\doubao\mind-map\
├── index.html            # 核心入口页面 (已集成所有功能与资源引用)
├── dist/                 # 编译后的静态资源包 (包含所有 CSS、JS、字体、图片、图标)
├── server.js             # 专为本地/Node服务器打造的轻量 Web 服务 (零第三方依赖)
├── start.bat             # Windows 一键启动脚本 (双击即用并自动打开浏览器)
├── package.json          # npm 脚本配置文件 (npm start)
├── Dockerfile            # Docker 容器化打包文件 (基于官方 Nginx)
├── docker-compose.yml    # Docker Compose 一键启动配置
├── nginx.conf            # Nginx 配置文件 (包含 SPA 路由规则与缓存优化)
├── vercel.json           # Vercel 静态部署配置
├── netlify.toml          # Netlify 静态部署配置
├── web/                  # 完整前端源码 (Vue 2 + ElementUI + 完整核心逻辑)
└── simple-mind-map/      # 思维导图核心底层库源码
```

---

## 2. 本地启动与使用

### 方式 1：Windows 双击一键启动 (最简便)
- 直接双击运行项目根目录下的 `start.bat`。
- 程序会自动启动本地服务并调起系统浏览器打开 `http://localhost:8080`。

### 方式 2：终端命令行启动
在项目根目录 `e:\doubao\mind-map` 打开终端，运行：
```bash
node server.js
# 或使用 npm
npm start
```
自定义端口（例如 3000 端口）：
```powershell
$env:PORT="3000"; node server.js
```

### 局域网访问 (同一 Wi-Fi / 局域网内的手机、平板、其他电脑)：
启动控制台会输出类似：
- 本地访问：`http://localhost:8080`
- 局域网访问：`http://192.168.x.x:8080`
同一局域网下的其他设备直接输入局域网地址即可使用。

---

## 3. 继承的功能特性

部署后拥有完整的所有核心与高级功能：
1. **多结构布局**：逻辑结构图、思维导图、组织结构图、目录组织图、时间轴、鱼骨图、表格等。
2. **多样式与主题**：内置几十种精美配色主题、手绘风格、彩虹线条、连线样式、外边框定制。
3. **丰富节点内容**：文本、图片、超链接、图标、备注、标签、概要节点、数学公式 (KaTeX)、节点附件、待办勾选、双向链接。
4. **导入与导出**：
   - 导入：XMind、Markdown、FreeMind、Txt、Xlsx 等。
   - 导出：PNG 图片、SVG 矢量图、PDF、XMind、Markdown、HTML、JSON 等。
5. **视图与实用辅助**：大纲编辑模式、全屏演示模式、水印设置、小地图导航、快捷键完全自定义、暗黑模式切换。
6. **本地文件持久化**：支持调用现代浏览器的 File System Access API 打开、编辑、直接保存到本地硬盘。

---

## 4. 部署到互联网 (公网访问) 方案

本项目是一个静态单页 Web 应用 (SPA)，不需要复杂的后端数据库，非常适合各类互联网部署方案：

### 方案一：Docker / Docker Compose 部署 (推荐)
如果有一台 Linux 云服务器（阿里云、腾讯云、华为云、AWS、轻量应用服务器等）：
1. 将本目录文件上传到服务器的目录中（例如 `/data/mind-map`）。
2. 在服务器上运行：
   ```bash
   docker compose up -d --build
   ```
3. 在云服务器安全组中放行 `8080` 端口，即可通过 `http://你的服务器公网IP:8080` 访问。
   *(如需绑定 80/443 或配置域名，可将 ports 改为 `"80:80"`，或在外部搭配 Nginx 反向代理与 SSL 证书)*。

### 方案二：Nginx / 云服务器原生静态部署
1. **服务器安装 Nginx**：
   ```bash
   sudo apt update && sudo apt install -y nginx  # Ubuntu/Debian
   # 或
   sudo yum install -y nginx                     # CentOS
   ```
2. **上传文件**：
   将 `index.html` 和 `dist/` 文件夹上传到服务器目录（例如 `/var/www/mind-map`）。
3. **配置 Nginx 站点 (`/etc/nginx/conf.d/mind-map.conf`)**：
   ```nginx
   server {
       listen 80;
       server_name your-domain.com; # 你的域名或 IP

       root /var/www/mind-map;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }

       # 静态资源长期缓存
       location /dist/ {
           expires 30d;
           add_header Cache-Control "public, no-transform";
       }
   }
   ```
4. 执行 `sudo nginx -t && sudo nginx -s reload` 即可生效。

### 方案三：免费 Serverless 静态托管

#### 1. Cloudflare Pages (极力推荐，国内访问快、免费、自带全球 CDN 和免费 SSL)
1. 在 GitHub 上新建一个仓库（例如 `my-mind-map`）。
2. 将本地代码 push 到 GitHub。
3. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/) -> Workers & Pages -> 创建应用程序 -> Pages -> 连接到 Git。
4. 构建设置：
   - 框架预设：`None`
   - 构建命令：留空
   - 输出目录：`.` (根目录)
5. 点击部署，10秒内即刻获得一个免费的公网 `https://xxx.pages.dev` 域名。

#### 2. Vercel 部署
1. 本项目已包含 `vercel.json`。
2. 安装并登录 Vercel CLI：`npm i -g vercel && vercel`。
3. 或在 Vercel 网页端直接导入 GitHub 仓库一键部署。

### 方案四：内网穿透 (无需云服务器公网访问)
如果不购买云服务器，想直接把本地跑着的电脑共享给朋友访问：
1. **Cloudflare Tunnel (推荐，免费稳定)**：
   - 安装 cloudflared，运行：`cloudflared tunnel --url http://localhost:8080`
   - 即可生成一个免费的公网临时 https 链接。
2. **cpolar / ngrok / frp**：
   - 使用 cpolar 执行：`cpolar http 8080` 即可映射出公网域名。

---

## 5. 数据存储与安全保障

在互联网上部署该程序后，用户的脑图数据安全如何保障？
1. **纯前端运行与本地私密存储**：
   - 本项目为纯前端静态应用，不设中心化用户数据库，**绝不回传用户的任何脑图数据到远端服务器**。
   - 导图数据默认实时保存在用户当前浏览器的本地持久化存储（IndexedDB / LocalStorage）中。
2. **本地文件系统直接读写**：
   - 支持现代浏览器 File System Access API：点击顶栏「新建」、「打开」、「另存为」，可以直接读写用户电脑本地硬盘上的 `.smm`、`.json` 文件，体验与桌面软件一致。
3. **第三方统计与外链安全**：
   - 已彻底移除开源原版内置的 `51.la` 第三方数据统计上报脚本，公网访问时用户 IP 与行为数据绝不泄露。
   - 已移除原版对外部商业客户端的引流弹窗与推广外链。

