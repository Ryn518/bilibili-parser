# B站课表规划器

单文件 Web 应用 + 本地/Vercel 后端代理：粘贴 B 站课程链接，自动解析分 P 与时长，按每日学习时长生成学习计划。

## 本地使用（推荐，最简单）

1. 安装 [Node.js](https://nodejs.org/)（LTS 版本，一路下一步即可）
2. **双击 `启动.bat`**
3. 浏览器会自动打开 **http://127.0.0.1:3000**

关闭黑色命令行窗口 = 停止服务。

或在终端执行：

```bash
cd d:\plan
npm start
```

> ⚠️ **不要**直接双击 `index.html`（`file://` 协议无法使用 API）。若误打开了，页面顶部会提示你运行 `启动.bat`。

## 项目结构

```
plan/
├── index.html          # 前端
├── server.js           # 本地服务器（静态页 + API 代理）
├── 启动.bat            # 双击即可本地运行
├── api/bilibili.js     # B 站 API 代理（本地与 Vercel 共用）
├── vercel.json         # Vercel 部署配置
└── package.json
```

## 功能概览

| 模块 | 说明 |
|------|------|
| 链接解析 | 支持 BV / av / b23.tv 短链；可直接粘贴 B 站分享文案 |
| 数据获取 | **优先自有后端** `/api/bilibili` → 失败自动降级公共 CORS 代理 |
| 智能规划 | 按每日分钟切分；15% 弹性避免拆集；目录原名标注 |
| 学习进度 | 每日打勾、localStorage 持久化、「我的」页汇总 |
| 打卡卡片 | html2canvas 生成 PNG |
| 用户反馈 | 右下角 💬 按钮 → Formspree 提交到邮箱 |
| PWA | 内联 Manifest + Service Worker（需 https 部署） |

### 部署到 Vercel（可选）

1. 上传项目到 GitHub
2. [vercel.com](https://vercel.com) 导入仓库并 Deploy
3. 替换 `index.html` 中 `CONFIG.FORMSPREE_URL`
4. 访问 `https://你的项目.vercel.app`

部署后无需 `启动.bat`，线上自动走 `/api/bilibili`。

## API 代理说明

| 请求 | 说明 |
|------|------|
| `GET /api/bilibili?bvid=BVxxx` | 课程 view 信息 |
| `GET /api/bilibili?bvid=BVxxx&type=pagelist` | 分 P 列表 |
| `GET /api/bilibili?aid=123456` | av 号 view |

## 配置项（index.html → CONFIG）

| 字段 | 说明 |
|------|------|
| `FORMSPREE_URL` | **必填** — Formspree 表单 endpoint |
| `API_PROXY` | 自有后端路径，默认 `/api/bilibili` |
| `VIP_QR_URL` | 自律币充值二维码 |
| `PROXIES` | 公共 CORS 代理降级列表 |

## 测试课程

- 高一数学：`BV1QeNc6iE84`（61P）
- 韩顺平 Java：`BV1fh411y7R8`（910P，大课程）

## 版本历史

### v1.1.0

- 新增 Vercel 后端代理，优先自有 API，公共代理降级
- 新增用户反馈（Formspree）
- Vercel 一键部署配置

### v1.0.0

- 首个完整版本：链接解析、规划、进度、打卡、PWA

## 许可证

仅供个人学习使用。B 站相关数据与商标归哔哩哔哩所有。
