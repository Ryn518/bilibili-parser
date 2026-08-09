# B站课表规划器 v2.0

Next.js 全栈版：粘贴 B 站课程链接，自动解析分 P 与时长，按每日学习时长生成学习计划。

## 技术栈

- **Next.js 14** (App Router)
- **React 18** + **TypeScript**
- **Tailwind CSS**
- **Vitest**（规划算法单元测试）
- **Vercel** 部署

## 快速开始

### 本地开发

1. 安装 [Node.js](https://nodejs.org/) LTS
2. 复制环境变量：`cp .env.example .env`（Windows 手动复制）
3. 双击 **`启动.bat`** 或运行：

```bash
npm install
npm run dev
```

浏览器打开 http://127.0.0.1:3000

### 生产构建

```bash
npm run build
npm run start
```

### 测试

```bash
npm run test
```

## 项目结构

```
plan/
├── app/                 # Next.js 页面与 API Route Handlers
├── components/          # React 组件
├── hooks/               # 认证、UI 状态
├── lib/                 # 规划算法、BVID 解析、服务端逻辑
├── lib/ai/              # AI 模块预留（LLM / RAG）
├── legacy/              # v1.2 旧版归档（index.html + server.js）
├── data/                # 用户与反馈 JSON（gitignore）
└── public/              # 静态资源、PWA manifest
```

## API

| 路径 | 说明 |
|------|------|
| `GET /api/health` | 健康检查 |
| `GET /api/bilibili?bvid=&type=course` | 完整课程数据 |
| `POST /api/auth?action=login\|register` | 登录注册 |
| `GET /api/auth?action=me` | 会话校验 |
| `POST /api/feedback` | 用户反馈 |

## 部署到 Vercel

1. 推送代码到 GitHub
2. [vercel.com](https://vercel.com) → Import 仓库
3. 配置环境变量：`AUTH_SECRET`、`ADMIN_USER`、`ADMIN_PASS`（可选）
4. Deploy

> 注意：Vercel Serverless 环境下 `data/*.json` 写入不持久，演示/简历用途足够；正式运营请迁移数据库。

## 版本历史

### v2.0.0

- 迁移至 Next.js + TypeScript + Tailwind 全栈架构
- API Route Handlers 替代 server.js
- 组件化拆分，Vitest 测试规划算法
- 预留 `lib/ai/` AI 扩展点

### v1.2.0 / v1.1.0

见 `legacy/` 目录中的 Vanilla JS 版本

## 许可证

仅供个人学习使用。B 站相关数据与商标归哔哩哔哩所有。
