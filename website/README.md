# JGAgent 官网（VitePress）

现代简约官网 + 更新日志，部署到 `106.15.120.94`，同时承载安装包下载。

## 结构

```
website/
├── docs/
│   ├── index.md              # 首页（整版自定义设计，见 .jp-home 样式块）
│   ├── changelog.md          # 更新日志（Markdown 维护）
│   └── .vitepress/config.ts  # 站点配置（导航/强制暗色/页脚）
├── package.json              # 独立子项目，不在 pnpm workspace 内
└── README.md
```

## 本地开发

```bash
cd website
npm install
npm run dev        # http://localhost:5173 热更新预览
npm run build      # 产物在 docs/.vitepress/dist/
```

首页下载按钮指向 `/downloads/…`，本地预览点不开属正常（指向服务器路径）。

## 服务器目录约定

```
/var/www/jgagent/
├── （上传 docs/.vitepress/dist/ 的全部内容到此处）
└── downloads/
    └── JGAgent-0.2.0-win-x64.exe   # 打包产物，见 packages/desktop/dist/
```

## nginx 配置

```nginx
server {
    listen 80;
    server_name 106.15.120.94;

    root /var/www/jgagent;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # 安装包下载（大文件；后续若启用自动更新，latest.yml 也放这里）
    location /downloads/ {
        alias /var/www/jgagent/downloads/;
        autoindex off;
        sendfile on;
        tcp_nopush on;
        add_header Cache-Control "no-cache";
    }
}
```

## 首次部署

1. 服务器建目录：`sudo mkdir -p /var/www/jgagent/downloads`
2. 本地 `npm run build`，把 `docs/.vitepress/dist/` **全部内容**上传到 `/var/www/jgagent/`
3. 写入 nginx 配置（`/etc/nginx/conf.d/jgagent.conf`），`sudo nginx -t && sudo systemctl reload nginx`
4. 上传安装包 `packages/desktop/dist/JGAgent-0.2.0-win-x64.exe` 到 `/var/www/jgagent/downloads/`
5. 验证：浏览器打开 `http://106.15.120.94/`，点下载按钮能拿到 exe

## 发新版本

1. 本地 bump 版本 → `node scripts/bundle.mjs --os win --arch x64` → 得到新 exe
2. `website/` 里改 `docs/index.md`（hero 下载链接、版本号、changelog 卡）与 `docs/changelog.md` → `npm run build`
3. 上传 dist 内容与新 exe；旧版本归档到 `downloads/archive/`

## 自动更新（v2 计划，本期未启用）

客户端更新链路是"服务端 manifest provider"（阶段 2 已占位化为 `.invalid`），需要单独把
manifest 端点指到本服务器后才能启用；当前 preview 版请同事手动回官网下载新版本。
