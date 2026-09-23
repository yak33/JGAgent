# JGAgent 工作交接文档

> **用途**：跨设备 / 跨会话交接。新 AI 会话从这份文档开始即可接手全部上下文，不需要重看历史对话。
> **最后更新**：2026-09-22（阶段 2 完成后）
> **配套文档**：[README.md](README.md)（去官方化改造清单，含全部技术细节与进度状态）——本文讲"为什么和接下来做什么"，清单讲"具体改哪里"。

---

## 1. 项目背景（一段话版）

捷关公司要基于开源项目 ZCode（github.com/zai-org/ZCode，Apache-2.0，AI 编程工作台，约 90 万行 TS 的 pnpm monorepo）二次开发公司自有 Agent 工具 **JGAgent**。改造分四个阶段：环境落位 ✅ → 品牌替换 ✅ → 端点与网络收口 ✅ → 账号与商业化摘除 ⬜ → 发布工程 ⬜。当前完成前三阶段，均已提交推送。

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

## 4. 下一步：阶段 3 账号与商业化摘除（预估 3~5 天）

**已勘察确认的关键事实**：账号体系无登录墙（欢迎页可 skip，apiKey 直连跑通全部核心功能），是可整体摘除的独立增值层；CLI（apps/zcode-cli）零依赖 packages/services。

**执行顺序**（每摘一块跑 typecheck + lint + `pnpm architecture:check --changed`，架构检查会暴露断链）：

1. 摘 `packages/services/src/` 服务域：`oauth/`、`coding-plan-subscription/`、`bigmodel/`、`usage-stats/`、`session/offPeak*`；`model-provider/` 里 `accountProvider*` 系列与通用运行时同目录混放，需拆分保留通用部分；`credential/` **保留**（apiKey 模式在用）
2. 摘 UI 入口（清单 3.2 有完整文件列表）：侧栏底栏登录/头像、设置页套餐卡片与 usage tab、升级弹窗、401 横幅、欢迎页登录步骤（保留 apiKey/skip）、`packages/web/src/auth/`
3. 清理 CLI 侧 `apps/zcode-cli/packages/adapters/src/auth/` 的 OAuth 模块（apiKey 路径不动）
4. 收尾：`pnpm knip` 查悬空导出；全局搜残留

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

- **Node 24.14.0 / pnpm 10.33.2** 以 `mise.toml` 为准；`pnpm install` 约 50 秒（有全局 store 时）
- **推送用 SSH**：该网络环境下 HTTPS 推 GitHub 报 `Connection was reset`，SSH key 已配置（yak33 账户）
- **`pnpm fmt:check` 双仓都失败**（Windows CRLF 检出 + `.gitattributes` 只固定 mjs/sh 为 LF）：非回归信号，**不要**跑 `pnpm fmt`（会重排约 2789 个文件）
- **lint 基线 70 警告**：与 ZCode 原仓逐数一致，全为存量；新改动以"不新增"为准
- 图像处理工具链（sharp）装在旧机器 `D:\NenniuProjects\.icontools`（未入库）；换图时在任意临时目录 `npm install sharp` 后运行入库的 `tools/gen-icons.cjs` 即可
- 旧机器的 Python 是坏的 Store 存根、无 ImageMagick——别依赖它们

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
