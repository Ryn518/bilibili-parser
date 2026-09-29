# 后端代码目录

服务器侧业务逻辑都在这里：

- `auth-service.ts` — 登录注册、token
- `bilibili-proxy.ts` — 代理 B 站
- `sync-service.ts` / `user-repository.ts` / `db.ts` — 云同步与数据库
- `feedback-service.ts` — 反馈

HTTP 接口入口仍在根目录 `app/api/`（Next.js 规定），那些文件很薄，真正逻辑在本目录。

导入仍用 `@/lib/server/xxx`（已在 `tsconfig` 里指到本目录）。
