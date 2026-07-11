# 部署检查清单

## 1. 当前部署结构

| 部分 | 目录 | 推荐平台 | 构建命令 | 产物 / 启动 |
|---|---|---|---|---|
| 前端 | `frontend/` | Vercel | `npm run build:frontend` | `frontend/dist` |
| 后端 | `server/` | Railway | `npm run build:server` | `npm run start:server` |
| 数据库 | PostgreSQL | Railway PostgreSQL | 平台托管 | `DATABASE_URL` |

## 2. 本地部署前检查

在项目根目录运行：

```powershell
cd "C:\Users\lenovo\Documents\New project 17\multi-stop-price-optimizer"
npm.cmd install
npm.cmd run lint
npm.cmd run test
npm.cmd run build
```

单独检查前端：

```powershell
npm.cmd run build:frontend
```

单独检查后端：

```powershell
npm.cmd run build:server
```

## 3. GitHub 推送

当前目录如果还不是 Git 仓库：

```powershell
git init
git add .
git commit -m "Prepare production deployment"
git branch -M main
git remote add origin https://github.com/你的用户名/你的仓库名.git
git push -u origin main
```

如果已经是 Git 仓库：

```powershell
git status
git add .
git commit -m "Prepare production deployment"
git push
```

提交前确认这些内容没有进入 Git：

| 文件 / 目录 | 原因 |
|---|---|
| `.env` | 本地密钥 |
| `.env.local` | 本地密钥 |
| `node_modules/` | 依赖目录 |
| `frontend/dist/` | 构建产物 |
| `server/dist/` | 构建产物 |
| `data/*.db` | 本地数据库 |
| `server/data/*.db` | 本地数据库 |
| `*.log` | 本地日志 |

## 4. Railway 后端部署

1. 打开 Railway。
2. 新建项目。
3. 选择 GitHub 仓库部署。
4. Root Directory 保持项目根目录。
5. 使用 `railway.json` 或手动配置以下命令。

| 配置项 | 值 |
|---|---|
| Build Command | `npm install && npm run build:server` |
| Start Command | `npm run start:server` |
| Health Check Path | `/api/health` |

Railway 后端环境变量：

```env
NODE_ENV=production
PORT=8787
CORS_ORIGIN=https://你的前端域名
AMAP_SERVICE_KEY=你的高德 Web Service Key
DATABASE_URL=postgresql://...
```

说明：

| 变量 | 用途 |
|---|---|
| `AMAP_SERVICE_KEY` | 后端调用高德 POI 搜索和驾车路线规划 |
| `DATABASE_URL` | 保存历史记录、分享结果、手动录入价格 |
| `CORS_ORIGIN` | 允许前端域名访问后端 |

## 5. Railway PostgreSQL

1. 在 Railway 项目里点击 New。
2. 选择 Database。
3. 选择 PostgreSQL。
4. 复制 PostgreSQL 服务生成的 `DATABASE_URL`。
5. 回到后端服务 Variables，添加 `DATABASE_URL`。
6. 重新部署或重启后端。

## 6. 验证后端

部署完成后打开：

```text
https://你的后端域名/api/health
```

期望返回类似：

```json
{
  "ok": true,
  "service": "multi-stop-route-decision-api",
  "amapConfigured": true,
  "database": "postgres"
}
```

继续验证地点搜索：

```text
https://你的后端域名/api/places/search?q=中国传媒大学&city=北京市
```

如果返回 `AMAP_SERVICE_KEY is not configured`，说明 Railway 后端没有配置高德 Web Service Key。

## 7. Vercel 前端部署

1. 打开 Vercel。
2. Add New Project。
3. 选择同一个 GitHub 仓库。
4. Root Directory 保持项目根目录。
5. 使用 `vercel.json` 或手动配置以下内容。

| 配置项 | 值 |
|---|---|
| Framework Preset | Vite |
| Build Command | `npm run build:frontend` |
| Output Directory | `frontend/dist` |

Vercel 前端环境变量：

```env
VITE_API_BASE_URL=https://你的后端域名
VITE_AMAP_WEB_KEY=你的高德 JS Web Key
VITE_AMAP_SECURITY_JS_CODE=你的高德安全密钥
```

说明：

| 变量 | 用途 |
|---|---|
| `VITE_API_BASE_URL` | 前端请求后端 API |
| `VITE_AMAP_WEB_KEY` | 浏览器加载高德 JS Map |
| `VITE_AMAP_SECURITY_JS_CODE` | 高德 JS 安全配置 |

## 8. 配置 CORS

前端第一次部署后会得到 Vercel 域名，例如：

```text
https://your-project.vercel.app
```

回到 Railway 后端服务，设置：

```env
CORS_ORIGIN=https://your-project.vercel.app
```

如果有多个前端域名，用英文逗号分隔：

```env
CORS_ORIGIN=https://your-project.vercel.app,https://your-domain.com
```

修改后重启后端。

## 9. 线上验收

打开前端域名后按顺序测试：

1. 首页正常显示。
2. 点击“开始规划”进入工具页。
3. 地图加载成功。
4. 搜索城市，例如“北京市”。
5. 搜索并选择出发点，例如“中国传媒大学”。
6. 至少添加两个待访问地点。
7. 点击“生成访问顺序”。
8. 出现多个候选顺序。
9. 每个候选方案显示真实路线距离和预计时间。
10. 地图能高亮当前路线。
11. 点击分享，复制 `/share/:id` 链接。
12. 新窗口打开分享链接，能看到只读报告页。

## 10. 常见问题

| 现象 | 检查项 |
|---|---|
| 地图不显示 | 检查 `VITE_AMAP_WEB_KEY`、`VITE_AMAP_SECURITY_JS_CODE` |
| 地点搜索失败 | 检查后端 `AMAP_SERVICE_KEY` |
| 前端请求后端失败 | 检查 `VITE_API_BASE_URL` 和后端 `CORS_ORIGIN` |
| 分享链接刷新后丢失 | 检查 `DATABASE_URL` 是否连接 PostgreSQL |
| `/api/health` 显示 sqlite | 线上没有配置 `DATABASE_URL` |

## 11. 产品边界

本工具只做路线顺序决策：

| 展示 | 不展示 |
|---|---|
| 高德真实 POI | 虚构地点 |
| 高德真实路线距离和预计时间 | 虚构距离和时间 |
| 用户手动录入 App 实际价格 | 自动打车平台报价 |
| 推荐依据：时间、距离、手动价格 | 官方车费预测 |
