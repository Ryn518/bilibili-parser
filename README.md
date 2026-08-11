# B站课表规划器 v2.0

Next.js 全栈版：粘贴 B 站课程链接，自动解析分 P 与时长，按每日学习时长生成学习计划。**完全免费**，登录后可保存课程与进度。

## 技术栈

- **Next.js 14** (App Router)
- **React 18** + **TypeScript**
- **Tailwind CSS**
- **Vitest**（规划算法单元测试）

## 快速开始

1. 安装 [Node.js](https://nodejs.org/) LTS
2. 复制环境变量：`.env.example` → `.env`
3. 双击 **`启动.bat`** 或运行：

```bash
npm install
npm run dev
```

浏览器打开 http://localhost:3000

## 核心功能

- 粘贴 B 站链接 → 一键生成每日学习计划
- 调整每日时长 → 重新切分日程
- 打卡进度、分享打卡图
- 登录后保存到「我的课程」（按账号隔离）
- 未登录也可体验（当前会话内保存）

## 项目结构

```
plan/
├── app/                 # 页面与 API Route Handlers
├── components/
│   ├── plan/            # 首页、课表结果、打卡
│   ├── mine/            # 我的课程
│   ├── auth/            # 登录注册
│   └── layout/          # 顶栏、壳层
├── hooks/               # 认证、UI 状态、Toast
├── lib/
│   ├── planner.ts       # 规划算法
│   ├── bvid.ts          # BV 号解析
│   ├── storage.ts       # 本地存储（账号隔离 + 访客 session）
│   └── server/          # B 站代理、认证、反馈
├── legacy/              # v1.2 旧版归档
└── data/                # 用户与反馈 JSON（gitignore）
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

> Vercel Serverless 环境下 `data/*.json` 写入不持久，适合演示与推广；用户课程数据主要存在浏览器 localStorage。

## 许可证

仅供个人学习使用。B 站相关数据与商标归哔哩哔哩所有。
