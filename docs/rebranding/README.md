# JGAgent 去官方化改造清单

> 目标：将 ZCode 二次开发为捷关自有的 JGAgent，替换品牌标识、摘除与官方服务的耦合、按需移除账号与商业化模块。
>
> 基准版本：ZCode `main @ 872ad96`（v3.14.0）。文中行号以该提交为准，代码变更后以文件路径 + 关键字搜索定位。
>
> 优先级定义：**P0** 发布前必须完成；**P1** 功能完整性要求；**P2** 内部标识符，成本高可延后。

---

## 当前进度（2026-09-22）

| 阶段 | 状态 | Commit | 说明 |
| --- | --- | --- | --- |
| 阶段 0 环境跑通与仓库落位 | ✅ 完成 | `c959f68` | 基线导入，origin=yak33/JGAgent，upstream=zai-org/ZCode |
| 阶段 1 品牌替换 | ✅ 完成 | `a909fa1` | 图标全套、产品名/appId、1073 处文案、README 中英文 |
| 阶段 2 端点与网络收口 | ✅ 完成 | `867bfe8` | 默认端点/CDN/市场源 .invalid 占位、遥测关闭、网关转发清空、Provider 目录重写 |
| 阶段 3 账号与商业化摘除 | ✅ 完成 | `6d6e055`→`889e292` 四批 | 约 -3.8 万行；保留项与遗留见 [HANDOFF.md](HANDOFF.md) |
| 阶段 4 发布工程 | ⬜ 未开始 | — | 桌面打包/CLI 发行/第三方声明重生成 |

交接上下文（换设备/新会话接手）见 **[HANDOFF.md](HANDOFF.md)**。

**遗留验证**：阶段 1+2 的改动已通过 typecheck/lint 静态验证，但尚未做运行时冒烟（`pnpm dev:desktop` 启动 + 全程网络审计确认无官方域名请求）。下次启动时优先补做。

---

## 〇、快速收口表（单点改动即可禁用一项官方耦合）

| 耦合项 | 收口位置 | 状态 |
| --- | --- | --- |
| 业务服务默认端点 | `packages/shared/src/zcodeEndpoint.ts` | ✅ 已改 `.invalid` 占位 |
| Coding Plan 网关转发 | `apps/zcode-cli/packages/adapters/src/model/official-coding-plan-gateway.ts` | ✅ 路由表已清空 |
| 遥测总开关 | `packages/shared/src/env.ts` | ✅ 已置 `false` |
| 插件市场源 | `packages/shared/src/plugin-marketplaces.ts` | ✅ 已改 `.invalid` 占位（本地种子分片保留） |
| CDN 默认地址 | `packages/desktop/src/main/remoteCdn.ts` | ✅ 已改 `.invalid` 占位 |
| 会话分享落地页 | `packages/services/src/conversation-share/conversationShareService.ts` | ✅ 随 endpoint 常量自动占位 |
| 反馈/社群入口 | `config/default.json` | ✅ 已置空，待公司内部地址 |
| 内置 Provider 目录 | `config/provider/zcode-builtin.json` | ✅ 移除 4 个官方模板，新增公司网关占位模板 |

---

## 一、品牌资产与产品名称（✅ 阶段 1 已完成，commit `a909fa1`）

### 1.1 视觉资产（已全部替换）

源素材为公司 "JG" 标识图（黑白斜体字母组合）。再生成脚本已入库：[tools/gen-icons.cjs](tools/gen-icons.cjs)（需临时安装 sharp，见脚本头部说明）。

| 路径 | 状态 |
| --- | --- |
| `public/logo/icons/`（9 种 PNG + ico + icns）、`public/icon_512@2x.png` | ✅ |
| `packages/desktop/build/`（icon / icon_installer / icon_windows / icons 托盘目录 / dmg_background） | ✅（DMG 背景为程序绘制的临时设计，设计师出图后直接覆盖同名文件） |
| `packages/web/public/favicon.ico` + `packages/web/index.html` 内嵌 base64 favicon | ✅ |
| `packages/web/index.html`、`packages/desktop/src/renderer/index.html` 启动页 logo（原 Z 闪电标 → 斜体 JG 标，保留呼吸动画） | ✅ |

### 1.2 产品名称（已完成）

- ✅ `packages/desktop/scripts/desktop-product-identity.mjs`：productName → **JGAgent**、appId → **`com.jieguan.jgagent`**（⚠️ 占位，公司域名确定后全局替换，约 4 处含 Preview/dev 变体）、Linux 可执行名 → `jgagent`
- ✅ `about.ts` 关于页（版权主体"捷关/JieGuan"为占位）、Windows 右键菜单（`JGAgent.OpenInJGAgent`）、Linux desktop 注册、`desktopCommandHandlers.ts` Endpoint 弹窗文案、`packages/desktop/package.json`
- ✅ `packages/web/index.html` title、TUI `app-sidebar.tsx` `PRODUCT_NAME`

### 1.3 UI 文案（已完成）

- ✅ **1073 处** `ZCode` → `JGAgent`，词边界规则（前后非字母数字下划线才替换），自动跳过 `ZCodeEndpoint` 等代码标识符；覆盖 packages/ui、web、desktop、services、shared、server、client、rpc、provider*、zcode-server-cli 及 apps/zcode-cli
- ✅ 刻意保留：`mcpUserDirectory/legacy.ts` 与 `services/src/paths.ts` 中引用 "ZCode"/"ZCode Dev" 目录的旧数据迁移与安装探测逻辑（改动会破坏功能，阶段 3 评估是否随账号域一起清理）

### 1.4 内置 Provider 品牌露出（✅ 随阶段 2 目录重写完成）

官方 zai/bigmodel 模板已从 `zcode-builtin.json` 移除；`ProviderLogo.tsx` 的 zai/bigmodel logo 注册表条目保留（无引用即不露出，阶段 3 一并清理）。

### 1.5 对外协议（部分完成，随阶段 3 决策）

| 项 | 位置 | 状态 |
| --- | --- | --- |
| `zcode://` OAuth 回调协议 | `desktopOAuthDeepLink.ts`、`desktopLinuxDeepLinkRegistration.ts` | ⬜ 保留账号 OAuth 则需换协议名；摘除账号则一并移除（阶段 3） |
| `zcode://share/import` 分享导入 | `packages/shared/src/platform.ts:678` | ⬜ 随分享功能去留决策（阶段 3） |
| `zcode-browser-restore://`、`zcode-media` 内部协议 | `platform.ts:68,106` | ⬜ P2，无品牌露出可不动 |

---

## 二、官方服务端点解耦（✅ 阶段 2 已完成，commit `867bfe8`）

占位域统一使用 **`.invalid`**（RFC 2606 保留 TLD，DNS 保证不解析，请求发不出机器）。公司服务就绪后全局搜索 `.invalid` 替换，或用环境变量注入（见 `.env.example`）。

| 项 | 状态 |
| --- | --- |
| 2.1 endpoint 常量（5 个）+ `.env.example` 示例 | ✅ `zcodeEndpoint.ts` |
| 2.2 官方网关转发路由表 | ✅ 已清空，机制保留可回填 |
| 2.3 自动更新 | ✅ 更新清单挂 endpointOrigin，`.invalid` 下静默失败（已核实失败路径走状态机+日志，无弹窗）；自建更新服务时改 `manifestUpdateProvider.ts` 路径常量 |
| 2.4 遥测 | ✅ `env.ts` 置 `false`；恢复自建遥测时改回并配端点环境变量 |
| 2.5 插件市场 | ✅ CDN 源占位，本地种子分片保留（默认插件仍可用，远程资产/图标静默失败属预期）；自建市场时替换 `plugin-marketplaces.ts` source |
| 2.6 会话分享 | ✅ 随 endpoint 占位（分享出的链接指向 `.invalid`，实际分享功能依赖官方服务端本就不可用）；彻底摘除 UI 入口在阶段 3 |
| 2.7 帮助配置/反馈/社群 | ✅ `default.json` 置空；`client/configs` 请求随 endpoint 占位静默失败 |
| 2.8 CDN 与远程资源 | ✅ `remoteCdn.ts` 占位；远程工作区（SSH/WSL）资源分发走"本地下载后上传"或自建 CDN（`ZCODE_CDN_BASE_URL`） |

**OAuth 域名硬编码**（`zaiProviderConfig.ts`、`bigmodelProviderConfig.ts`、`webZaiOAuthConfig.ts` 等的 authorize/token/login URL）**刻意未改**：不点官方登录就不会请求，属于阶段 3 账号域整体摘除范围。

---

## 三、账号与商业化模块（⬜ 阶段 3，未开始）

**结论（已勘察确认）**：账号体系是可整体摘除的独立增值层。核心 Agent 会话只依赖 personal provider + apiKey 路径（`WelcomeScreen.tsx` 的 `LoginCompleteReason` 含 `"skip"`，无登录墙）；CLI（`apps/zcode-cli`）零依赖 `packages/services`，自带独立 auth 模块（`adapters/src/auth/`）。

### 3.1 可摘除的服务域（packages/services/src/）

| 目录 | 职责 | 摘除建议 |
| --- | --- | --- |
| `oauth/` | OAuth 登录流程（zai/bigmodel provider、回调归因、凭据仓库） | 整体移除或替换为公司 SSO |
| `coding-plan-subscription/` | 套餐购买/管理，含 Stripe/PayPal/支付宝（`bigmodelCodingPlanSubscriptionProvider.ts`；协议类型 `packages/shared/src/coding-plan-subscription.ts`） | 内部工具直接整体移除 |
| `model-provider/`（`accountProvider*` 约 10 个文件、`bigmodelStartPlanZcodeJwt.ts`、`zaiStartPlanBilling.ts`） | 账号侧 provider 连接/鉴权 | **与通用 provider 运行时同目录混放，需拆分保留通用部分** |
| `bigmodel/`（`codingPlanEntitlement.ts`、`teamPlanApiKey.ts`） | 套餐权益、团队 Key | 随订阅移除 |
| `usage-stats/` | 订阅配额/用量统计 | 随订阅移除 |
| `credential/` | 本地凭据加密存储 | **保留**（apiKey 模式也用它），仅移除 OAuth 专属凭据类型 |
| `device/` | 设备标识 | 视公司合规要求决定 |
| `session/`（`offPeakTaskService.ts`、`offPeakServerClient.ts`、`offPeakTaskRepo.ts`） | 闲时任务票据（依赖 Coding Plan JWT 身份） | 不自建服务端则移除该功能 |

### 3.2 需同步摘除的 UI 入口（packages/ui/src/）

| 入口 | 文件 |
| --- | --- |
| 侧栏底栏登录/头像/用量 | `WorkspaceSidebarFooter.tsx`、`WorkspaceSidebarFooterUsageSummary.tsx`、`WorkspaceSidebarFooterPlanBadgeHelpers.ts` |
| 设置页 provider 节 OAuth/Start Plan 卡片 | `model-provider-section/StartPlanCard.tsx`、`StartPlanBalanceCard.tsx`、`useCodingPlanEntitlements.ts` |
| 设置页 usage 节 Coding Plan tab | `SettingsPage.tsx`（原 :144-225，行号已随阶段 1 变化） |
| 升级/定价弹窗 | `CodingPlanUpgradeDialog*.tsx`、`CodingPlanEmbeddedWebviewDialog.tsx`、`codingPlanPricingCards.ts`、`codingPlanPurchaseAuth.ts` |
| 401 重新登录横幅 | `ChatErrorBanner.tsx` |
| 输入区套餐上下文用量 | `chat-input-toolbar/CodingPlanContextUsage.tsx`、`CodingPlanUsageRemainingPanel.tsx` |
| 欢迎页登录步骤 | `WelcomeScreen.tsx`（保留 apiKey/skip 路径） |
| 登录状态 effects | `root/useRootOAuthEffects.ts`、`hooks/useOAuth.ts`、`Root.tsx` `onLogin` 贯穿多处 |
| Web 独立 auth | `packages/web/src/auth/`（`webAuthService.ts`、`zaiWebOAuthProvider.ts`、`webZaiOAuthConfig.ts`） |

### 3.3 CLI 侧

- `apps/zcode-cli/packages/adapters/src/auth/`（`cli-oauth.ts`、`bigmodel-oauth.ts`、`coding-plan-api-key.ts`、`shared-credentials.ts`，与桌面共享凭据文件）
- 纯 apiKey 模式不受影响；统一去掉账号体系时此目录同步清理

### 3.4 阶段 3 验证要点

- 每摘一块跑 `pnpm typecheck` + `pnpm lint` + `pnpm architecture:check --changed`（架构检查会暴露断链）
- 全新用户 apiKey 直连流程可用；设置页无套餐/登录残留
- `pnpm knip` 检查未使用导出（摘除后的悬空导出）

---

## 四、内部标识符（P2，可延后）

| 项 | 规模 | 说明 |
| --- | --- | --- |
| `@zcode/*` 包作用域 | 28 个包 + 全部跨包 import | 纯内部标识；fork 稳定后一次性重命名 |
| `zcode://` 协议族 | 见 1.5 | 内部协议无品牌露出可不动 |
| 数据目录 `~/.zcode/`、`ZCODE_*` 环境变量前缀 | 全仓库 | 用户本机路径与运维脚本可见；改前评估共存需求 |
| 根目录 AGENTS/CONTEXT/DESIGN 文档 | 已部分指向 JGAgent（AGENTS.md 已加交接指引） | 随阶段 3/4 持续更新 |

---

## 五、验证清单（每阶段通用）

- [ ] `pnpm typecheck`（当前基线：exit 0）
- [ ] `pnpm lint`（当前基线：0 错误、**70 警告**，与 ZCode 基线逐数一致，全为存量）
- [ ] `pnpm fmt:check` 在 ZCode/JGAgent **都失败**（Windows CRLF 检出环境问题，`.gitattributes` 仅固定 `*.mjs/*.sh` 为 LF）——非回归信号，**不要**跑 `pnpm fmt`（会重排 2789 个文件制造无关 diff）
- [ ] 桌面打包版 + CLI 发行包双形态冒烟（会话、文件工具、终端、Git）
- [ ] 全局搜索 `ZCode`（词边界）、`.invalid`、`z.ai`、`bigmodel` 确认改动符合预期
- [ ] 网络行为审计：`pnpm dev:desktop` 启动后全程无 `*.z.ai` / `bigmodel.cn` / `cdn-zcode` 请求（**尚未做过，下次启动优先补**）

---

## 六、风险与注意事项

1. **法律边界**：Apache-2.0 允许商用与闭源修改，但不授予商标权（名称/logo 已替换 ✅）；第三方素材条款见 `third-party/inventory.json`；发行物须携带 `THIRD-PARTY-NOTICES.md`（依赖变更后用 `node scripts/licenses.mjs notices` 重生成）。
2. **上游同步**：官方演进后 `git fetch upstream && git merge upstream/main`，合并后按本清单"快速收口表"逐项核对改动点是否被冲掉。
3. **隐式网络行为**：NOTICE.md 第二节列明的后台请求已通过 `.invalid` 占位全部切断；运行时审计（第五节最后一条）是最终验收。
4. **凭据与安全**：公司 apiKey 经 provider 配置与凭据仓库流转；SSH/WSL 远程工作区的凭据自动同步行为（NOTICE 第三节）在内部推广前需评估开关。
5. **架构约束**：摘除服务域时整体移除目录而非注释代码；`architecture-policy.yaml` 与 knip 会兜底暴露残留引用。
