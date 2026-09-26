# JGAgent 发布与官网部署（交接文档）

> 用途：后续 AI 会话或新同事接手发版 / 官网 / 服务器运维时的唯一入口。
> 首发记录：2026-09-26，v0.2.0 preview 已上线 `http://82.157.149.224/`。
> 官网目录细节见 [website/README.md](../../website/README.md)，本文只讲流程与坑。

---

## 一、发一版新版的全流程（约 15 分钟）

```text
1. bump 版本    package.json + packages/desktop/package.json 两处 version
2. 打包         ZCODE_ENV=production node scripts/bundle.mjs --os win --arch x64
               （在 packages/desktop/ 下执行；约 10 分钟）
3. 核对产物     packages/desktop/dist/JGAgent-<ver>-win-x64.exe + latest.yml
4. 改官网       website/docs/index.md（下载链接、版本行）+ changelog.md → npm run build
5. 上传官网     scp -i ~/.ssh/jgagent_deploy dist 内容 → root@82.157.149.224:/www/wwwroot/jgagent/html/
6. 上传安装包   scp exe → /www/wwwroot/jgagent/downloads/（144MB，几分钟）
7. 验证         curl -sI http://82.157.149.224/downloads/<exe> 看 200 与 Content-Length；
               服务端 sha512sum | xxd -r -p | base64 与本地 latest.yml 的 sha512 比对
8. 提交推送     版本号与 website 改动各一个 commit
```

## 二、打包：命令与陷阱

**唯一正确命令**（在 `packages/desktop/` 下）：

```bash
ZCODE_ENV=production node scripts/bundle.mjs --os win --arch x64
```

### 陷阱 1：不带 ZCODE_ENV=production 会打出测试包

身份解析链：`builtinProviderConfig.environment` → `resolveDesktopProductFlavor`，
**非 production 一律落 Preview 身份**（productName 变 "JGAgent Preview"），且产物带
`_TEST` 后缀（`resolveDesktopArtifactSuffix`）。这是刻意的防混用设计，不是 bug。
产物命名规则：`{productName}-{version}-win-{arch}{_TEST?}.exe`。

### 陷阱 2：打包前必须停 dev

`pnpm dev:desktop` 的 tsup watch 与生产构建同写 `out/`，并存会互相污染。
先 `taskkill //F //IM electron.exe` 并停掉后台 dev 任务再打包。

### 产物校验

- `dist/latest.yml` 的 `version` 与 sha512 是权威校验源；
- 打包日志尾部有 `audit-bundle-size`（上限 500MiB）与 runtime 依赖闭包校验，exit 0 即可信。

## 三、官网（website/，VitePress）

- **独立子项目**：自带 package.json / node_modules，`pnpm-workspace.yaml` 的 packages
  通配不覆盖它 —— 别把它加进 workspace，也别在根目录 pnpm install 它。
- 命令：`cd website && npm run build`（产物 `docs/.vitepress/dist/`）+
  `npm run preview`（4173 伺服构建产物，**验收一律用这个**）。
- ⚠️ 本机 `npm run dev`（5173）SSR 静默失效（返回无样式空壳、无报错、清缓存无效，
  build 不受影响）——不要用 dev 验收，勿信 5173 页面。
- 字体自托管（`@fontsource/space-grotesk`、`jetbrains-mono`），**不依赖 Google Fonts**，
  国内可访问；改字体在 `docs/.vitepress/theme/index.ts`。
- 设计基调（2026-09-26 定稿）：墨蓝黑 `#0B0E14` + 琥珀 `#F5B453` 单强调色，
  hero 右侧琥珀磷光终端窗（`TermWindow.vue`），diff 绿红只出现在终端行内。
  修改请守住：无渐变、无光晕、无滚动入场动画、emoji 不进特性区。
- **坑**：md 里写含空行的 `<pre>` 块会被 Vue 编译器按空行切断报
  "Element is missing end tag" —— 复杂 HTML 抽成 `theme/` 下的 Vue 组件再用。
- `.vitepress/cache/` 已进 .gitignore（曾误提交 2.8 万行，勿回退）。

## 四、服务器（腾讯云轻量 82.157.149.224）

- 系统 OpenCloudOS 9.6，装了宝塔但**不用它管 nginx**；站点用 Docker Compose 跑
  `nginx:1.27-alpine`（80 端口，`restart: unless-stopped`）。
- 目录：`/www/wwwroot/jgagent/`（`html/` 官网、`downloads/` 安装包、
  `docker-compose.yml`、`nginx.conf`）。改 nginx 配置后 `docker compose restart web`。
- **部署通道**：本机 `~/.ssh/jgagent_deploy` 密钥（root），首次由用户手动装公钥；
  服务器 root 密码已在聊天中暴露过，用户被提醒轮换 —— 若密钥失效需用户重新装公钥。
- 安全组已放行 80/443；80 由容器占用，443 空闲（以后上 HTTPS 直接加端口映射）。

## 五、明确不做 / 遗留

| 项 | 状态 |
| --- | --- |
| 自动更新 | v2 待办：客户端走"服务端 manifest provider"，端点阶段 2 已 `.invalid` 化，需先把 manifest 端点指到自有服务器再启用；当前告知用户手动回官网下载 |
| macOS / Linux 包 | 官网已留"稍后即来"位；mac 包必须在 mac 机器上打 |
| 签名 | 安装包未签名，首启 SmartScreen 拦截，官网三步指引已写"仍要运行" |
| 旧服务器 106.15.120.94 | 只跑捷关模型网关（:9527），模板 baseUrl 打包指向它，与官网服务器无关，勿混 |

## 六、发版验证清单

- [ ] `ZCODE_ENV=production` 打包 exit 0，产物名无 `_TEST`、无 "Preview"
- [ ] latest.yml version = 新版本号
- [ ] 官网 index.md 下载链接文件名与产物一致，changelog 已加条目
- [ ] 线上 `/downloads/<exe>` 200 且 sha512 与本地一致
- [ ] 本机装一遍冒烟：网关连通、左下角本地身份、模型设置页、中文显示
