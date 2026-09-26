# JGAgent 官网（VitePress）

现代简约官网 + 更新日志，部署到 `82.157.149.224`，同时承载安装包下载。

> 发版全流程、服务器运维与踩坑记录以 [docs/release/README.md](../docs/release/README.md) 为准，本文只讲官网子项目本身。
> 注意 `106.15.120.94` 是模型网关服务器，与官网无关，勿混。

## 结构

```
website/
├── docs/
│   ├── index.md              # 首页（整版自定义设计，layout: page）
│   ├── changelog.md          # 更新日志（Markdown 维护）
│   └── .vitepress/
│       ├── config.ts         # 站点配置（导航/强制暗色/页脚）
│       └── theme/            # 自定义主题：index.ts（字体注册）、custom.css、TermWindow.vue（hero 终端窗）
├── package.json              # 独立子项目，不在 pnpm workspace 内
└── README.md
```

设计约束（配色、禁用项）见 release 文档第三节。md 里写含空行的复杂 HTML 会被 Vue 编译器切断，抽成 `theme/` 下的 Vue 组件再用。

## 本地开发

```bash
cd website
npm install
npm run build      # 构建，产物在 docs/.vitepress/dist/
npm run preview    # 本地伺服构建产物（http://localhost:4173），验收设计用这个
```

⚠️ **本机 `npm run dev`（5173）SSR 静默失效**（2026-09-26 实测：所有路由返回无样式空壳、
无任何报错，清 `.vitepress/cache` 无效；`build` 不受影响）—— 验收/调试一律走
`build + preview`，别用 dev 服务器，也别信 5173 端口上看到的页面。

首页下载按钮指向 `/downloads/…`，本地预览点不开属正常（指向服务器路径）。

## 服务器目录约定

站点由 Docker Compose 运行 `nginx:1.27-alpine`（80 端口），不用宝塔管理 nginx：

```
/www/wwwroot/jgagent/
├── html/                 # 上传 docs/.vitepress/dist/ 的全部内容
├── downloads/            # 安装包，如 JGAgent-0.2.0-win-x64.exe
├── docker-compose.yml
└── nginx.conf            # 改完执行 docker compose restart web
```

## 发新版本

按 release 文档第一节执行。要点：

1. 打包必须带 `ZCODE_ENV=production`（在 `packages/desktop/` 下执行 `ZCODE_ENV=production node scripts/bundle.mjs --os win --arch x64`），否则打出的是 Preview 测试包
2. 改 `docs/index.md`（下载链接、版本行）与 `docs/changelog.md` → `npm run build`
3. 上传 dist 内容到 `html/`、新 exe 到 `downloads/`，用 sha512 与本地 `latest.yml` 核对

## 自动更新（v2 计划，本期未启用）

客户端更新链路是"服务端 manifest provider"（阶段 2 已占位化为 `.invalid`），需要单独把
manifest 端点指到本服务器后才能启用；当前 preview 版请同事手动回官网下载新版本。
