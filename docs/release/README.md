# JGAgent 发布与官网部署（交接文档）

> 用途：后续 AI 会话或新同事接手发版 / 官网 / 服务器运维时的唯一入口。
> 首发记录：2026-09-26，v0.2.0 preview 已上线 `http://82.157.149.224/`。
> 官网目录细节见 [website/README.md](../../website/README.md)，本文只讲流程与坑。

---

## 一、发一版新版的全流程（约 15 分钟）

```text
1. bump 版本    package.json + packages/desktop/package.json 两处 version
2. 打包         ZCODE_ENV=production ZCODE_UPDATE_FEED_URL="http://82.157.149.224/downloads/latest.yml" \
               JGAGENT_SANITIZE_BUILD_ENV=1 node scripts/bundle.mjs --os win --arch x64
               （在 packages/desktop/ 下执行；约 10 分钟。ZCODE_UPDATE_FEED_URL 烧入自动更新
               feed，缺省则该版无自动更新；JGAGENT_SANITIZE_BUILD_ENV=1 见陷阱 3）
3. 核对产物     packages/desktop/dist/JGAgent-<ver>-win-x64.exe + latest.yml
4. 改官网       website/docs/.vitepress/theme/Home.vue（VERSION 与 DOWNLOAD_URL 常量）
               + changelog.md → npm run build
5. 上传官网     scp -i ~/.ssh/jgagent_deploy dist 内容 → root@82.157.149.224:/www/wwwroot/jgagent/html/
6. 上传安装包   scp exe + latest.yml + blockmap → /www/wwwroot/jgagent/downloads/
               ⚠️ 顺序必须 exe 在前、latest.yml 在后：客户端轮询到新 latest.yml 时 exe 必须已就位
7. 验证         curl -sI http://82.157.149.224/downloads/<exe> 看 200 与 Content-Length；
               服务端 sha512sum | xxd -r -p | base64 与本地 latest.yml 的 sha512 比对
8. 提交推送     版本号与 website 改动各一个 commit
```

> 自动更新已启用（v0.3.2 起）：已安装 0.3.2+ 的客户端会轮询 `downloads/latest.yml`，
> 发现新版本后应用内提示并差分下载（blockmap）。发版即自动推送全体用户——
> 出问题的版本不要走此流程发布，先在本地验证。HTTPS 待公司域名就绪后补（现 HTTP 明文）。

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

### 陷阱 3：ZCODE_* 环境变量污染（构建期 + 运行期，双重防护）

宿主 ZCode 会话会把官方 `ZCODE_BASE_URL` 等注入它启动的所有子进程，两个方向都会出事：

- **构建期**：tsup 把 process.env 经 `__ZCODE_ENDPOINT_ENV__` 烧进产物。
  `scripts/bundle.mjs` 入口守卫直接拒绝；`JGAGENT_SANITIZE_BUILD_ENV=1` 可让脚本
  在进程内自动清理（shell 包装器里 `unset` 不可靠时用这个）。
- **运行期**：上游设计让打包版也读取启动环境的端点变量。v0.3.0 首版事故链：
  被污染的包 → 官方 `/client/configs` → 官方 minVersion 3.5.3 > 0.3.0 → 启动即拦。
  现在 `main/index.ts` 模块加载时调用 `sanitizeAmbientEndpointEnvForPackagedApp()`
  （desktopRuntimeEnv.ts）对打包版密封：删除全部端点/配置路径变量，dev 不受影响。
- **更新缓存共享**：electron-builder 从包名派生 `updaterCacheDirName`，默认与本机
  官方 ZCode 共用 `@zcodedesktop-updater`，官方的待更新状态会被 JGAgent 恢复
  （"restored ready update version=3.14.3"）。publish 里显式改为 `jgagent-updater` 隔离。
- ⚠️ 打包后验收 grep `dist/win-unpacked/resources/app.asar`：`api.z.ai` 仅允许
  OAuth 白名单/刻意保留常量（约 15 处），`ZCODE_BASE_URL":"https` 形式的烧入值必须为 0
  （NSIS exe 是压缩载荷，grep 不出，别拿 exe 验）。
- 其它品牌残留点（阶段 1 词边界替换覆盖不到的构建资产）：`build/installer.nsh`
  的安装日志前缀（已改 JGAgent）、`electron-builder.config.js` 的 pkgData
  homepage/author（已改占位域）。

### 产物校验

- `dist/latest.yml` 的 `version` 与 sha512 是权威校验源；
- 打包日志尾部有 `audit-bundle-size`（上限 500MiB）与 runtime 依赖闭包校验，exit 0 即可信。

## 三、官网（website/，VitePress）

- **独立子项目**：自带 package.json / node_modules，`pnpm-workspace.yaml` 的 packages
  通配不覆盖它 —— 别把它加进 workspace，也别在根目录 pnpm install 它。
- 命令：`cd website && npm run build`（产物 `docs/.vitepress/dist/`）+
  `npm run preview`（伺服构建产物，**验收一律用这个**；端口被占时 `npx vitepress preview docs --port 4273`）。
- ⚠️ 本机 `npm run dev`（5173）SSR 静默失效（返回无样式空壳、无报错、清缓存无效，
  build 不受影响）——不要用 dev 验收，勿信 5173 页面。
- ⚠️ 4173 可能残留来历不明的旧伺服进程（serve 旧产物且 CSS 404）：验收前
  `netstat -ano | grep :4173` 找 PID 杀掉再起 preview。
- 字体走系统栈（Segoe UI Variable / PingFang / 雅黑，无网络字体依赖），
  栈定义在 `docs/.vitepress/theme/custom.css`；**未引入** @fontsource（旧文档记录有误）。
- 设计基调（2026-09-27 三版，在二版 Ethereal Glass 基础上去模板化）：
  暖调近黑 `#0A0908` + 琥珀 `#F0B35A` 单一强调色，灰阶统一暖灰（勿再混冷灰/紫色光斑），
  body 固定径向光斑 + 内联 SVG 细颗粒层（`body::after`）。首页结构：左对齐 Hero +
  右侧等宽规格表 → 纯 HTML 绘制的桌面应用界面示意窗 → 一张网关主卡 + 细线分隔的
  编辑式特性列表 → 标题吸顶的三步安装（含 SmartScreen 提示）→ 最新版本卡。
  小标签用等宽字 + 琥珀（不用全大写药丸）；入场 fade-up 走 IntersectionObserver
  （cubic-bezier(0.32,0.72,0,1)），并尊重 prefers-reduced-motion。
  首页整体在 `docs/.vitepress/theme/Home.vue`（index.md 只留 `<JgHome/>` 一行），
  版本号、下载地址与最新版本摘要是组件内 `DOWNLOAD_URL`/`VERSION`/`latest` 常量，
  **发版必改**（`latest` 需与 changelog.md 最新一节一致）。
  约束：backdrop-blur 只用于顶栏药丸；动效只用 transform/opacity/filter。
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
| 自动更新 | ✅ v0.3.2 起启用：feed 指向官网静态 latest.yml（HTTP 明文，HTTPS 待公司域名）；差分下载已生效。channel 灰度（stable/preview）仍走上游 manifest API，待自建后端再启用 |
| macOS / Linux 包 | 官网已留"稍后即来"位；mac 包必须在 mac 机器上打 |
| 签名 | 安装包未签名，首启 SmartScreen 拦截，官网三步指引已写"仍要运行" |
| 旧服务器 106.15.120.94 | 只跑捷关模型网关（:9527），模板 baseUrl 打包指向它，与官网服务器无关，勿混 |
| **上游 v3.14.3 同步** | **待办（建议作为 v0.3.0 主项）**：评估结论与合并预案见**第七节**。⚠️ 本仓无官方 git 历史（快照导入），`git merge upstream/main` 不可行，必须走 `git apply --3way`（2026-09-26 复核修正） |

## 六、发版验证清单

- [ ] `ZCODE_ENV=production` 打包 exit 0，产物名无 `_TEST`、无 "Preview"
- [ ] latest.yml version = 新版本号
- [ ] 官网 index.md 下载链接文件名与产物一致，changelog 已加条目
- [ ] 线上 `/downloads/<exe>` 200 且 sha512 与本地一致
- [ ] 本机装一遍冒烟：网关连通、左下角本地身份、模型设置页、中文显示

## 七、上游同步预案（v3.14.3，2026-09-26 复核）

### 上游更新现状

官方仓库仅 3 个提交；v3.14.0（`872ad96`，我们的基线）之后只有一个更新：`29628c9` = **v3.14.3**（283 文件，+30,342 / -1,768，其中 87 个新增文件）。主题是 dynamic-workflow（动态工作流）引擎优化与修复：运行中调并发上限、大工作流实时状态、降低 token 消耗、修复界面崩溃等；另含 bots 服务域骨架、session journal、协议 v4 增强。本地参照仓 `D:\NenniuProjects\ZCode` 已与官方一致，无需再更新。

### ⚠️ 为什么不能 `git merge upstream/main`

本仓阶段 0 是**快照导入**（根提交 `c959f68`，与官方无共同 git 历史）。直接 merge 会因 unrelated histories 被拒绝；加 `--allow-unrelated-histories` 强并时合并基准为空树，全仓库同名文件全部 add/add 冲突，不可操作。

### 正确流程

```bash
# 前提：工作区干净；872ad96 与 29628c9 对象已在本地（git fetch upstream 后即可用）
git fetch upstream
git checkout -b sync/upstream-v3.14.3
git diff 872ad96 29628c9 > /tmp/v3.14.3.patch
git apply --3way /tmp/v3.14.3.patch   # 用 872ad96 的 blob 做基准三方合并
```

`--3way` 会把冲突精确限制在"官方改过的行 × 我们改过的行"的重叠处，而不是全仓库。

### 冲突面（2026-09-26 实测：48 文件）

283 个官方改动文件中 235 个可干净应用，48 个与本地分叉交集需逐个解。原则：**敏感区保我方，协议与 workflow 代码取官方**。

保我方的敏感文件：

- `README.md`、`README.en.md`（已重写为 JGAgent 版）
- 根 `package.json` + `packages/desktop/package.json`（版本 0.2.0、品牌字段）
- `packages/ui/src/WorkspaceSidebarFooter.tsx`（本地身份；官方只是新增手机远控入口按钮，可兼顾合入）
- 两套 i18n locale：`apps/zcode-cli/packages/i18n/locales/{en-US,zh-CN}.ts` 与 `packages/ui/src/i18n/locales/{en-US,zh-CN}.ts`（1073 处文案替换所在，逐冲突块解）
- `packages/desktop/src/main/index.ts`（存储根引导 `~/.jgagent`，spec：`docs/specs/storage-root-isolation.md`）

其余交集文件（协议 v4、services 装配、zcode-agent、composer 等）以官方为准；解完逐个 `git diff` 复查未带入官方端点/品牌。

### 同步后验证

- 按改造清单 [docs/rebranding/README.md](../rebranding/README.md) "快速收口表"逐项核对（`.invalid` 端点、遥测开关、网关路由表是否被冲掉）
- `pnpm typecheck`（exit 0）+ `pnpm lint`（0 错误、警告不超基线）+ `pnpm architecture:check --changed`
- `pnpm knip` 查悬空导出
- `pnpm dev:desktop` 冒烟 + 网络审计（dev 日志 grep `z\.ai|bigmodel|cdn-zcode` 期望 0）
- 重打包按第六节清单执行，作为 v0.3.0 发布
