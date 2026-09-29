# 前端代码目录

浏览器侧代码都在这里：

- `components/` — 页面组件
- `hooks/` — React hooks
- `lib/` — 规划算法、本地存储、前端 API 封装等

页面入口仍在根目录 `app/`（Next.js 规定必须放在那里），里面的页面只是引用本目录组件。

导入仍用原来的写法，例如 `@/components/...`、`@/lib/planner`（已在 `tsconfig` 里指到本目录）。
