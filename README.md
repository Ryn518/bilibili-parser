# B站课表规划器

单文件 Web 应用：粘贴 B 站课程链接，自动解析分 P 与时长，按每日学习时长生成学习计划，支持打卡、进度追踪与链接分享。

## 功能概览

| 模块 | 说明 |
|------|------|
| 链接解析 | 支持 BV / av / b23.tv 短链；可直接粘贴 B 站分享文案（含中文标题与 `?vd_source=` 等参数） |
| 课程数据 | 并行请求 B 站 `view` + `pagelist` API；多代理容错；BV 校验防止数据串课 |
| 智能规划 | 按每日分钟数切分；15% 弹性避免拆集；用课程目录原名描述每日目标 |
| 学习进度 | 每日打勾、localStorage 持久化、进度仪表盘与「我的」页汇总 |
| 打卡卡片 | html2canvas 生成 PNG 打卡图，可下载分享 |
| 规划缓存 | 7 天有效规划快照；URL 参数 `?bvid=&daily=` 可分享/恢复 |
| PWA | 内联 Manifest + Service Worker；支持添加到桌面（需 http/https 部署） |

## 快速开始

### 本地打开

直接用浏览器打开 `index.html` 即可使用：

```
file:///d:/plan/index.html
```

### 使用步骤

1. 在首页粘贴 B 站课程链接或完整分享文字
2. 设置「每天学习时长」（分钟，默认 45）
3. 点击「生成课表规划」
4. 在结果页查看今日焦点、完整日程；勾选完成天数追踪进度
5. 可选：生成打卡卡片 PNG，或在「我的」页查看历史课程

### 分享链接

生成规划后，地址栏会自动更新为：

```
index.html?bvid=BV1QeNc6iE84&daily=45
```

他人打开该链接（且规划未过期）可自动恢复同一课程与每日时长设置。

## 技术栈

- **前端**：原生 HTML / CSS / JavaScript（无框架、无构建）
- **字体**：Google Fonts — Inter
- **打卡图**：html2canvas（CDN）
- **数据**：B 站公开 API + 跨域代理（allorigins / corsproxy）
- **存储**：localStorage、sessionStorage
- **PWA**：内联 Web App Manifest + Service Worker

## 项目结构

```
plan/
├── index.html    # 完整应用（UI + 逻辑 + 样式 + SW）
└── README.md     # 本文档
```

## 配置说明

在 `index.html` 顶部的 `CONFIG` 对象中可调整：

| 字段 | 默认值 | 说明 |
|------|--------|------|
| `DONATE_QR_URL` | 占位图 | 微信赞赏码图片 URL |
| `PROXIES` | allorigins + corsproxy | 跨域代理列表，可按需增删 |
| `JSONP_TIMEOUT` | 22000 ms | JSONP 请求超时 |
| `CACHE_TTL` | 30 分钟 | sessionStorage 课程数据缓存 |
| `STORAGE_KEY` | `bili-planner-v1` | 多课程学习进度存储键 |
| `PLAN_CACHE_KEY` | `bili-planner-plan-cache` | 规划快照存储键 |
| `PLAN_EXPIRE_DAYS` | 7 | 规划快照过期天数 |

## 规划算法简述

1. 将用户设置的「每日分钟」转为秒数作为每日上限
2. 按分 P 顺序累加时长；若下一集略超上限但在 **15% 弹性** 内，则整集归入当天（避免拆集）
3. 否则在集内切分，标记 `partial` 并在次日继续
4. 每日目标文案使用 **课程目录原名**（如「从『第一章』到『第三章』」），而非仅显示 P 编号

## 部署建议

| 方式 | PWA / SW | 说明 |
|------|----------|------|
| 本地 `file://` | ❌ | 核心功能可用，Service Worker 无法注册 |
| 静态托管（GitHub Pages、Vercel、Nginx 等） | ✅ | 推荐；整目录上传即可 |

部署后可通过「添加到主屏幕」获得类 App 体验。

## 测试课程

- 韩顺平 Java：`BV1fh411y7R8`（910P，大课程，首次加载可能较慢）
- 高一数学：`BV1QeNc6iE84`（61P）

## 已知限制

- 依赖公开跨域代理，allorigins 可能不稳定；大课程（如 900+ P）首次解析约 30–60 秒
- 无后端，无法绕过 B 站 API 限流或登录态
- `file://` 协议下 PWA 与 Service Worker 不可用
- 规划分享链接在静态托管且同域名下效果最佳；本地 file 协议分享的 URL 对他人可能无效

## 版本历史

### v1.0.0（2026-08-04）

首个完整版本，包含：

- B 站链接/分享文案解析与课程数据抓取
- 按每日时长智能规划与目录原名目标描述
- 学习进度追踪、「我的」页、打卡卡片
- 规划缓存、URL 分享、重新规划
- PWA 基础支持（Manifest + Service Worker）

## 许可证

仅供个人学习使用。B 站相关数据与商标归哔哩哔哩所有。
