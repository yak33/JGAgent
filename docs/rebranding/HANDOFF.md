# JGAgent 工作交接文档

> **用途**：跨设备 / 跨会话交接。新 AI 会话从这份文档开始即可接手全部上下文，不需要重看历史对话。
> **最后更新**：2026-09-26（v0.2.0 preview 上线后）
> **配套文档**：[README.md](README.md)（去官方化改造清单，含全部技术细节与进度状态）；发版 / 官网 / 服务器运维见 **[docs/release/README.md](../release/README.md)** ——本文讲"为什么和接下来做什么"，清单讲"具体改哪里"。

---

## 1. 项目背景（一段话版）

捷关公司要基于开源项目 ZCode（github.com/zai-org/ZCode，Apache-2.0，AI 编程工作台，约 90 万行 TS 的 pnpm monorepo）二次开发公司自有 Agent 工具 **JGAgent**。改造分四个阶段：环境落位 ✅ → 品牌替换 ✅ → 端点与网络收口 ✅ → 账号与商业化摘除 ✅（2026-09-23 完成，四个批次）→ 发布工程 🟡（v0.2.0 Windows 预览版已于 2026-09-26 上线，剩余项见清单第七节）。已完成部分均已提交推送。

阶段 3 全量删除约 **3.8 万行**（批次 1+2：-1279；批次 3a+3b：-6760；批次 3c：-30103）。终验：typecheck exit 0、lint 0 错误 72 警告（全存量）、architecture 0 违规、dev 启动冒烟通过 + 官方域名请求 0。

### 阶段 3 刻意保留项（勿当遗漏）
- shared 的 `oauth.ts`/`coding-plan-subscription.ts`/`plan-identity.ts` 类型：仍有存活引用（model-provider-family、CLI standalone runtime）
- CLI 侧 offPeak 协议 schema（`offpeak-port.ts`）：删除需改 CLI 协议层，超出账号域
- `legacyZCodeConfigProviderReader.ts`：apiKey/Personal 配置升级路径在用
- store 账号字段（user/loginEntryRequest）与 `PlatformChannels.OAuthCallback` 常量：置空保留，全部消费方清完才可删
- `zcode://` open-workspace deep link：保留（仅删了 OAuth 回调分支）
- web 分享回调页保留路由，降级为"登录不可用"提示

## 2. 仓库与 Git

- 本地路径（旧机器）：`D:\NenniuProjects\JGAgent`；ZCode 原仓库（只读参照）在同目录 `D:\NenniuProjects\ZCode`
- **origin**：`git@github.com:yak33/JGAgent.git`（公司仓库，**私有**，2026-09-26 由公开改为私有；仓库内含网关与服务器地址，勿再改回公开）
- **upstream**：`git@github.com:zai-org/ZCode.git`（官方源，只读）。⚠️ 本仓是快照导入（根提交 `c959f68`，无官方 git 历史），**不能用 `git merge upstream/main`**（无共同祖先，强并会全仓库 add/add 冲突）；同步用 `git diff <基线> upstream/main > patch` 后 `git apply --3way patch`，详见 [docs/release/README.md](../release/README.md) 第七节
- 关键提交：`c959f68` 基线导入 → `a909fa1` 阶段 1 品牌替换 → `867bfe8` 阶段 2 端点收口 → `6d6e055`…`889e292` 阶段 3 四批摘除 → `d700dbf` 数据根迁 `~/.jgagent` → `b1edf61` v0.2.0 → `57d2e64` 官网

**换新电脑步骤**：

```bash
git clone git@github.com:yak33/JGAgent.git   # SSH（HTTPS 推送会 Connection reset）
cd JGAgent && pnpm install                    # Node 24.14.0 + pnpm 10.33.2（mise.toml 为准）
pnpm typecheck                                # 验证：exit 0
pnpm lint                                     # 验证：0 错误、72 警告（阶段 3 终验基线，全存量）
```

## 3. 已完成工作摘要（细节见清单 README.md）

### 阶段 1 品牌替换（`a909fa1`，392 文件）

- 全套图标（PNG/ICO/ICNS/favicon/DMG 背景）替换为公司 "JG" 标识图，**透明圆角**（22.5% 比例，接近系统图标规格）；再生成脚本在 [tools/gen-icons.cjs](tools/gen-icons.cjs)（用法：`NODE_PATH=<sharp目录>/node_modules node gen-icons.cjs <源图> <仓库根> [圆角比例，默认0.225，0为直角]`）
- 产品名 JGAgent、appId `com.jieguan.jgagent`、Linux 可执行名 `jgagent`；单一身份源 `packages/desktop/scripts/desktop-product-identity.mjs`
- **1073 处** `ZCode` → `JGAgent`，词边界正则（`(?<![A-Za-z0-9_])ZCode(?![A-Za-z0-9_])`），自动跳过代码标识符
- Web 启动页 Z 闪电 logo → 斜体 JG 字标；README 中英文重写（注明基于 ZCode 二开）

### 阶段 2 端点收口（`867bfe8`，10 文件）

核心手法：**所有官方默认端点改 `.invalid` 保留域**（RFC 2606，DNS 保证不解析，请求发不出机器）：

- `packages/shared/src/zcodeEndpoint.ts` 5 个常量 + `.env.example`
- 遥测 `env.ts` `ZCODE_TELEMETRY_ENABLED=false`；官方网关转发路由表清空（机制保留在 `official-coding-plan-gateway.ts`）
- 插件市场源 / CDN / 插件资产前缀 / 产品文档链接 → `.invalid`
- Provider 目录 `config/provider/zcode-builtin.json`：移除 4 个官方 zai/bigmodel 模板，新增"捷关模型网关"占位模板，保留 16 个通用第三方模板（revision 30→31，缓存失效用）。后续：网关模板 `f31e1c0` 接通；智谱 4 个 API 模板 `fec0cfa` 从上游恢复（公网 API + 用户自带 key，revision 32→33）

### 刻意不做的（有明确理由，别当遗漏）

| 保留项 | 原因 |
| --- | --- |
| `mcpUserDirectory/legacy.ts`、`services/src/paths.ts` 里的 "ZCode" 目录字符串 | 旧版数据迁移与安装探测路径，改了破坏功能 |
| OAuth 域名硬编码（`zaiProviderConfig.ts` 等） | 不点官方登录不请求；属阶段 3 账号域整体摘除范围 |
| `@zcode/*` 包名、`zcode://` 协议、`ZCODE_*` 环境变量 | P2 内部标识符，改动波及全仓 import，fork 稳定后再做 |
| OAuth 登录/订阅支付整套功能 | 阶段 3 计划整体摘除，现在零碎改是浪费 |

## 4. 阶段 3 之后的工作（2026-09-23 ~ 09-26）

阶段 3 各批次的文件级地图见清单 README 第三节，这里不再重复。

| 主题 | 提交 | 要点 |
| --- | --- | --- |
| 公司模型网关 | `f31e1c0` | `jgagent-gateway` 模板，OpenAI 兼容，14 个模型 |
| 欢迎页 | `3c342ec`、`993eb64`、`0be9ae3` | API Key 表单：捷关网关 + 自定义供应商（URL+Key，复用 `createPersonalProvider`），创建时传入 locale |
| 模型供应商设置页 | `fec0cfa`、`f93d737`、`82c277b` | 模板选择器分「捷关」「其他」两组；导航删智谱 OAuth 预设卡，改为「捷关」「自定义供应商」两组常驻，空配置显示空态 |
| 数据隔离 | `0781467`、`d700dbf` | 会话库等 7 处路径跟随 `ZCODE_DATA_BASE_DIR`；主目录数据根改为 `~/.jgagent`，不迁移不回读 `~/.zcode`（spec：`docs/specs/storage-root-isolation.md`） |
| 品牌残留 | `3c342ec`→`535bd6a` 共 6 次 | 标题栏、启动画面、About、新建任务空态等处 Z 标的独立副本逐个替换为 JG 字标 |
| Agent 提示词 | `ca930f3`、`876fb6c` | 身份改为中文"捷关 Agent"，定位从编程助手调整为全能 AI 助手 |
| 本地身份 | `ab48017` | 左下角头像颜色 + 用户名 + 个性化设置（无账号体系） |
| 其他 UI | `94f5e18`、`0449af9`、`711cadc` | 偏好菜单直达供应商设置；西文优先 Segoe UI；关于页正确显示应用版本 |
| 发版与官网 | `b1edf61`、`57d2e64`、`12ef6e4` | v0.2.0 Windows x64 上线；VitePress 官网（流程见 `docs/release/README.md`） |

## 5. 当前进行中：阶段 4 发布工程

进度表见清单 README 第七节。优先级建议：

1. **第三方声明**：`node scripts/licenses.mjs notices` 重生成，安装包已对外分发，下次发版前必须补
2. **网关安全**：网关当前为 `http` 明文，api-key 明文过公网，建议上 HTTPS 或加 IP 白名单
3. **官网首页改版**（进行中）：设计约束见 `docs/release/README.md` 第三节
4. macOS / Linux 包、代码签名、自动更新（v2）、CLI 发行包（`pnpm build:zcode`）

## 6. 待公司确认的占位值清单（拿到真实值后全局替换）

| 占位值 | 位置 | 待确认内容 |
| --- | --- | --- |
| `com.jieguan.jgagent` | `desktop-product-identity.mjs`（含 .preview/.dev 变体） | 公司正式反向域名 |
| 版权主体"捷关 / JieGuan" | `about.ts` | 公司注册全称 |
| `https://jgagent.invalid` | `zcodeEndpoint.ts` | 公司业务服务端地址 |
| ✅ `http://106.15.120.94:9527/v1`（14 个模型：glm 全系 + claude 系） | `config/provider/zcode-builtin.json` 的 jgagent-gateway 模板 | 已接通（2026-09-23 实测 /v1/models 返回正常）；每人在网关上有独立 api-key，在应用设置页粘贴即可 |
| `https://cdn.jgagent.invalid` | `remoteCdn.ts`、`plugin-marketplaces.ts` 等 | 公司 CDN / 插件市场源 |
| `config/default.json` 空链接 | feedback_url / community_urls | 公司内部反馈与社群地址 |
| `https://jgagent.invalid/docs` | `packages/ui/src/lib/productDocs.ts` | 公司文档站 |

替换方法：全局搜 `.invalid` 逐项换，或优先用环境变量（`ZCODE_BASE_URL`、`ZCODE_CDN_BASE_URL` 等，见 `.env.example`）。

## 7. 环境注意事项（新机器避坑）

- **dev 启动必须用隔离数据目录**（已实测踩坑）：
  ```powershell
  # PowerShell（Windows 默认终端）
  $env:ZCODE_DATA_BASE_DIR="C:/Users/<用户>/.jgagent-dev-home"; pnpm dev:desktop
  ```
  ```bash
  # Git Bash / macOS / Linux
  ZCODE_DATA_BASE_DIR="$HOME/.jgagent-dev-home" pnpm dev:desktop
  ```
  注意 PowerShell 不支持 bash 的 `VAR=value 命令` 前缀语法，必须用 `$env:VAR` 先设置。
  自 `d700dbf` 起默认数据根为 `~/.jgagent`，不再读 ZCode 原版的 `~/.zcode`（早期踩过的"遗留官方账号 provider 启动时真实外发 `zcode.z.ai` 余额查询"这类问题已从源头消失）。但本机若装了 JGAgent 正式版，dev 不设隔离会与它共用 `~/.jgagent`，两边的 provider 配置、会话库互相污染，所以 dev 仍需隔离。
- **端口残留**：异常退出后 vite（5174）可能残留，`netstat -ano | grep 5174` 找 PID kill 后再启
- **Node 24.14.0 / pnpm 10.33.2** 以 `mise.toml` 为准；`pnpm install` 约 50 秒（有全局 store 时）；shell 实际 Node 24.19 也可跑（仅 engine 警告）
- **推送用 SSH**：该网络环境下 HTTPS 推 GitHub 报 `Connection was reset`，SSH key 已配置（yak33 账户）
- **`pnpm fmt:check` 双仓都失败**（Windows CRLF 检出 + `.gitattributes` 只固定 mjs/sh 为 LF）：非回归信号，**不要**跑 `pnpm fmt`（会重排约 2789 个文件）
- **lint 基线 72 警告**（阶段 3 终验值；ZCode 原仓为 70）：全为存量，新改动以"不新增"为准
- 图像处理工具链（sharp）装在旧机器 `D:\NenniuProjects\.icontools`（未入库）；换图时在任意临时目录 `npm install sharp` 后运行入库的 `tools/gen-icons.cjs` 即可
- 旧机器的 Python 是坏的 Store 存根、无 ImageMagick——别依赖它们
- **运行时网络审计方法**（阶段 2 最终验收，已通过一次）：启动后在 dev 日志里 `grep -c "zcode\.z\.ai\|api\.z\.ai\|open\.bigmodel\|chat\.z\.ai\|cdn-zcode"`，期望 0

## 8. 本次改造的关键文件索引

| 文件 | 角色 |
| --- | --- |
| `packages/desktop/scripts/desktop-product-identity.mjs` | 产品身份单一来源（名称/appId/可执行名） |
| `packages/shared/src/zcodeEndpoint.ts` | 全部官方端点常量单一来源 |
| `packages/shared/src/env.ts` | 遥测开关 |
| `config/provider/zcode-builtin.json` | 内置 Provider 目录（schema 见 `packages/provider`） |
| `packages/shared/src/plugin-marketplaces.ts` | 插件市场源 |
| `apps/zcode-cli/packages/adapters/src/model/official-coding-plan-gateway.ts` | 官方网关转发（已禁用，机制保留） |
| `docs/rebranding/README.md` | 改造清单（阶段 3 文件级地图、阶段 4 进度） |
| `docs/release/README.md` | 发版流程、官网、服务器运维 |
| `packages/services/src/paths.ts` | 主目录数据根 `~/.jgagent` 唯一定义（`getZCodeDataRootDir`） |
| `docs/rebranding/tools/gen-icons.cjs` | 图标再生成脚本 |

## 9. 工作约定（沿用自公司全局规范）

- 提交格式 `<type>(<scope>): <emoji> <subject>`，subject 简体中文，作者 ZHANGCHAO，**严禁 AI 署名**入 commit message
- 只在用户明确要求时 commit / push；交付前 `pnpm typecheck` + `pnpm lint` 真实结果如实汇报
- 修复 bug 用中文注释说明原因；代码风格遵循仓库现有约定（AGENTS.md）
