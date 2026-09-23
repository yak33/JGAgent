# JGAgent 工作交接文档

> **用途**：跨设备 / 跨会话交接。新 AI 会话从这份文档开始即可接手全部上下文，不需要重看历史对话。
> **最后更新**：2026-09-22（阶段 2 完成后）
> **配套文档**：[README.md](README.md)（去官方化改造清单，含全部技术细节与进度状态）——本文讲"为什么和接下来做什么"，清单讲"具体改哪里"。

---

## 1. 项目背景（一段话版）

捷关公司要基于开源项目 ZCode（github.com/zai-org/ZCode，Apache-2.0，AI 编程工作台，约 90 万行 TS 的 pnpm monorepo）二次开发公司自有 Agent 工具 **JGAgent**。改造分四个阶段：环境落位 ✅ → 品牌替换 ✅ → 端点与网络收口 ✅ → 账号与商业化摘除 ✅（2026-09-23 完成，四个批次）→ 发布工程 ⬜。已完成部分均已提交推送。

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
- **origin**：`git@github.com:yak33/JGAgent.git`（公司仓库，PUBLIC）
- **upstream**：`git@github.com:zai-org/ZCode.git`（官方源，只读，同步修复用：`git fetch upstream && git merge upstream/main`，合并后按清单"快速收口表"核对）
- 关键提交：`c959f68` 基线导入 → `a909fa1` 阶段 1 品牌替换 → `867bfe8` 阶段 2 端点收口

**换新电脑步骤**：

```bash
git clone git@github.com:yak33/JGAgent.git   # SSH（HTTPS 推送会 Connection reset）
cd JGAgent && pnpm install                    # Node 24.14.0 + pnpm 10.33.2（mise.toml 为准）
pnpm typecheck                                # 验证：exit 0
pnpm lint                                     # 验证：0 错误、70 警告（基线即如此）
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
- Provider 目录 `config/provider/zcode-builtin.json`：移除 4 个官方 zai/bigmodel 模板，新增"捷关模型网关"占位模板，保留 16 个通用第三方模板（revision 30→31，缓存失效用）

### 刻意不做的（有明确理由，别当遗漏）

| 保留项 | 原因 |
| --- | --- |
| `mcpUserDirectory/legacy.ts`、`services/src/paths.ts` 里的 "ZCode" 目录字符串 | 旧版数据迁移与安装探测路径，改了破坏功能 |
| OAuth 域名硬编码（`zaiProviderConfig.ts` 等） | 不点官方登录不请求；属阶段 3 账号域整体摘除范围 |
| `@zcode/*` 包名、`zcode://` 协议、`ZCODE_*` 环境变量 | P2 内部标识符，改动波及全仓 import，fork 稳定后再做 |
| OAuth 登录/订阅支付整套功能 | 阶段 3 计划整体摘除，现在零碎改是浪费 |

## 4. 当前进行中：阶段 3 账号与商业化摘除

**已勘察确认的关键事实**：账号体系无登录墙（欢迎页可 skip，apiKey 直连跑通全部核心功能），是可整体摘除的独立增值层；CLI（apps/zcode-cli）零依赖 packages/services。

### 已完成（阶段 3 第一、二批，commit `6d6e055` + `6789704`，-1279 行）

- WelcomeScreen 移除 OAuth 渠道登录，仅保留 API Key + 跳过（LoginApiKeyForm onCancel 改可选）
- WorkspaceSidebarFooter 移除头像/套餐徽标/用量/登录登出，偏好菜单保留
- ChatErrorBanner 移除套餐升级按钮
- SettingsPage 移除 CodingPlan 用量 tab 机制、升级弹窗调用、onLogin/onLogout/user props（-409 行）
- UsageStatsSection 收窄为仅应用级统计；StatusCards 移除 StartPlanCard/重新登录
- lint 新基线：**0 错误、77 警告**（原 70，差额为存量）

### 剩余批次（按依赖顺序）

**批次 3a 升级弹窗收尾（UI 层）**：
- Root.tsx 挂载的 `CodingPlanUpgradeDialogProvider`；仍消费它的组件：`V4ComposerToolbar.tsx:385`、`AutomationsSection.tsx:532`、`WorkspaceSidebar.tsx:338`、`v4/SessionPane.tsx`（optional 变体）、`model-provider-section/Detail.tsx` 的 `CodingPlanPurchaseChoiceBanners`/`handlePurchaseChoiceSelect`
- `StatusCards.tsx` 的升级/续期/订阅按钮已是半死状态（点击无弹窗只自切换）——直接摘按钮
- 零引用待删文件：`settings/usage-stats/CodingPlanUsagePanel.tsx`、`model-provider-section/useStartPlanPreview.ts`、`lib/sidebarUsageCodingPlanProviderPreference.ts`、`lib/codingPlanUsageSources.ts`、`lib/settingsNavigation.ts` 的 pending usage tab 机制、升级弹窗组件族（`CodingPlanUpgradeDialog*.tsx`、`CodingPlanEntryButton`、`codingPlanPricingCards` 等）

**批次 3b Root 层 OAuth effects**：
- `root/useRootOAuthEffects.ts`（OAuth 恢复/轮询/回调；footer 已不订阅 `isRestoringOAuthSession`，可整体简化）、`handleReauthenticationRequired`、`setOAuthError`/`setUser` threading、WelcomeScreen onComplete 的 `"oauth"` 分支、`hooks/useOAuth.ts`（已零引用）

**批次 3c 服务域删除**（packages/services/src/）：`oauth/`、`coding-plan-subscription/`、`bigmodel/`、`usage-stats/`、`session/offPeak*` 整体删除；`model-provider/` 的 `accountProvider*` 系列与通用运行时同目录混放需拆分（`credential/` **保留**，apiKey 模式在用）；`desktop/src/main/desktopOAuthDeepLink.ts` 只删 OAuth 分支保留 open-workspace deep link；`packages/web/src/auth/`（仅 /share/callback 路由消费）；CLI `adapters/src/auth/` 的 oauth 模块（apiKey 路径不动）
- Zustand store 账号字段（user/oauthError/loginEntryRequest/codingPlanQuotaReset*）策略为保留置空，全部消费方清理后再删

**批次 3d 收尾**：`pnpm knip` 悬空导出、`pnpm architecture:check --changed`、全局 grep `codingPlan|oauth|StartPlan` 确认无残留、dev 启动冒烟 + 网络审计（见第 6 节方法）

**阶段 3 之后**是阶段 4 发布工程：`pnpm bundle:desktop`（各平台打包）、`pnpm build:zcode`（CLI 发行包，需 `ZCODE_DIST_BASE_URL`）、`node scripts/licenses.mjs notices` 重生成第三方声明。

## 5. 待公司确认的占位值清单（拿到真实值后全局替换）

| 占位值 | 位置 | 待确认内容 |
| --- | --- | --- |
| `com.jieguan.jgagent` | `desktop-product-identity.mjs`（含 .preview/.dev 变体） | 公司正式反向域名 |
| 版权主体"捷关 / JieGuan" | `about.ts` | 公司注册全称 |
| `https://jgagent.invalid` | `zcodeEndpoint.ts` | 公司业务服务端地址 |
| `https://llm.jgagent.invalid` + `your-model-id` | `config/provider/zcode-builtin.json` | 公司模型网关地址与模型 ID |
| `https://cdn.jgagent.invalid` | `remoteCdn.ts`、`plugin-marketplaces.ts` 等 | 公司 CDN / 插件市场源 |
| `config/default.json` 空链接 | feedback_url / community_urls | 公司内部反馈与社群地址 |
| `https://jgagent.invalid/docs` | `packages/ui/src/lib/productDocs.ts` | 公司文档站 |

替换方法：全局搜 `.invalid` 逐项换，或优先用环境变量（`ZCODE_BASE_URL`、`ZCODE_CDN_BASE_URL` 等，见 `.env.example`）。

## 6. 环境注意事项（新机器避坑）

- **dev 启动必须用隔离数据目录**（已实测踩坑）：
  ```bash
  ZCODE_DATA_BASE_DIR="C:/Users/<用户>/.jgagent-dev-home" pnpm dev:desktop
  ```
  不设隔离时应用读本机 `~/.zcode`（ZCode 原版数据），遗留的官方账号 provider 会在启动时**真实外发** `zcode.z.ai` 余额查询（带官方凭据），且 `runtime/provider/` 里的官方目录缓存会遮蔽仓库内重写的 `zcode-builtin.json`。这是数据层污染，不是代码问题；阶段 3 摘除账号体系后此类请求源头才彻底消失。
- **端口残留**：异常退出后 vite（5174）可能残留，`netstat -ano | grep 5174` 找 PID kill 后再启
- **Node 24.14.0 / pnpm 10.33.2** 以 `mise.toml` 为准；`pnpm install` 约 50 秒（有全局 store 时）；shell 实际 Node 24.19 也可跑（仅 engine 警告）
- **推送用 SSH**：该网络环境下 HTTPS 推 GitHub 报 `Connection was reset`，SSH key 已配置（yak33 账户）
- **`pnpm fmt:check` 双仓都失败**（Windows CRLF 检出 + `.gitattributes` 只固定 mjs/sh 为 LF）：非回归信号，**不要**跑 `pnpm fmt`（会重排约 2789 个文件）
- **lint 基线 70 警告**：与 ZCode 原仓逐数一致，全为存量；新改动以"不新增"为准
- 图像处理工具链（sharp）装在旧机器 `D:\NenniuProjects\.icontools`（未入库）；换图时在任意临时目录 `npm install sharp` 后运行入库的 `tools/gen-icons.cjs` 即可
- 旧机器的 Python 是坏的 Store 存根、无 ImageMagick——别依赖它们
- **运行时网络审计方法**（阶段 2 最终验收，已通过一次）：启动后在 dev 日志里 `grep -c "zcode\.z\.ai\|api\.z\.ai\|open\.bigmodel\|chat\.z\.ai\|cdn-zcode"`，期望 0

## 7. 本次改造的关键文件索引

| 文件 | 角色 |
| --- | --- |
| `packages/desktop/scripts/desktop-product-identity.mjs` | 产品身份单一来源（名称/appId/可执行名） |
| `packages/shared/src/zcodeEndpoint.ts` | 全部官方端点常量单一来源 |
| `packages/shared/src/env.ts` | 遥测开关 |
| `config/provider/zcode-builtin.json` | 内置 Provider 目录（schema 见 `packages/provider`） |
| `packages/shared/src/plugin-marketplaces.ts` | 插件市场源 |
| `apps/zcode-cli/packages/adapters/src/model/official-coding-plan-gateway.ts` | 官方网关转发（已禁用，机制保留） |
| `docs/rebranding/README.md` | 改造清单（含阶段 3 完整计划） |
| `docs/rebranding/tools/gen-icons.cjs` | 图标再生成脚本 |

## 8. 工作约定（沿用自公司全局规范）

- 提交格式 `<type>(<scope>): <emoji> <subject>`，subject 简体中文，作者 ZHANGCHAO，**严禁 AI 署名**入 commit message
- 只在用户明确要求时 commit / push；交付前 `pnpm typecheck` + `pnpm lint` 真实结果如实汇报
- 修复 bug 用中文注释说明原因；代码风格遵循仓库现有约定（AGENTS.md）
