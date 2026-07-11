# 多地点出行顺序决策工具部署说明

这个项目按“前端静态站点 + 后端 API + PostgreSQL 数据库”的方式上线。

用户最终只需要打开前端网页链接；高德 Key 和数据库连接都放在部署平台环境变量里。

## 架构

```text
浏览器
  |
  | VITE_API_BASE_URL
  v
前端静态站点：Vercel / Netlify / Cloudflare Pages
  |
  | /api/*
  v
后端 API：Railway / Render / Fly
  |
  +-- 高德 Web Service：POI 搜索、驾车路线规划
  +-- PostgreSQL：历史记录、分享结果、用户手动录入价格
```

## 前端部署

推荐使用 Vercel。

| 配置项 | 值 |
|---|---|
| Project Root | 项目根目录 |
| Framework Preset | Vite |
| Build Command | `npm run build:frontend` |
| Output Directory | `frontend/dist` |

前端环境变量：

```env
VITE_API_BASE_URL=https://你的后端域名
VITE_AMAP_WEB_KEY=你的高德 JS Web Key
VITE_AMAP_SECURITY_JS_CODE=你的高德安全密钥
```

## 后端部署

推荐使用 Railway 或 Render。

| 配置项 | 值 |
|---|---|
| Project Root | 项目根目录 |
| Build Command | `npm install && npm run build:server` |
| Start Command | `npm run start:server` |
| Health Check Path | `/api/health` |

后端环境变量：

```env
PORT=8787
NODE_ENV=production
CORS_ORIGIN=https://你的前端域名
AMAP_SERVICE_KEY=你的高德 Web Service Key
DATABASE_URL=postgresql://...
```

## 数据库

线上建议配置 PostgreSQL。后端启动时会自动创建必要表：

```text
sessions
manual_prices
```

本地开发如果没有 `DATABASE_URL`，会使用本地 SQLite，仅用于调试。

## 本地检查

```powershell
npm.cmd install
npm.cmd run lint
npm.cmd run test
npm.cmd run build
```

## 本地开发

```powershell
npm.cmd run dev
```

默认地址：

| 服务 | 地址 |
|---|---|
| 前端 | `http://127.0.0.1:5173/` |
| 后端 | `http://127.0.0.1:8787/api/health` |

## 产品边界

| 可以做 | 不做 |
|---|---|
| 高德 POI 搜索 | 自动获取打车平台价格 |
| 高德真实驾车路线 | 用分段价格相加冒充整单价格 |
| 距离、时间、路线对比 | mock 官方价格 |
| 用户手动录入 App 实际价格 | 浏览器暴露服务端 Key |
