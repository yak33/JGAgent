# 本地身份（local profile）：左下角头像与用户名

> 状态：已实现（2026-09-26）。背景：阶段 3 摘除账号体系后，sidebar footer 左下角的头像/用户位被清空（见 `WorkspaceSidebarFooter.tsx` 头部注释），本 feature 用纯本地身份补回该位置。

## 行为定义

1. **数据**：`{ name: string, colorIndex: number }`，存 localStorage（key `jgagent-local-profile`）。**不复用**阶段 3 置空保留的账号 store 字段（`user`/`loginEntryRequest` 等，那是给上游 merge 留的），两者互不相干。
2. **首启默认**：未存储时按当前 locale 生成一个随机用户名（形容词+名词词表），`colorIndex` 由名字哈希取模固定色板（8 色）。即左下角永远有内容，不会出现空名。
3. **左下角 chip**：`[首字母头像] [用户名]`，替代原 "JGAgent" 字样（品牌标保留在窗口左上角）。点击弹出原偏好菜单。
4. **弹出菜单顶部"个性化"区块**：
   - 头像颜色：8 个色点单选，即时生效
   - 用户名：输入框（长度 1~16，去首尾空白）+ 筛子按钮（按当前 locale 随机重掷）
   - 区块内 `onKeyDown` stopPropagation（沿用 ChatEmptyState 空态菜单内嵌输入的既有模式），避免 Dropdown 键盘导航干扰输入
5. **消费点**：新建任务空态问候语变为「早上好，{用户名}」（`chat.empty.greeting.named`，中英文标点差异由 locale 文案承载）；未命名兜底不拼接。
6. **跨窗口**：监听 `storage` 事件，多窗口（如设置窗口）改名后主窗口即时同步。不引入 services/协议改动，纯 `packages/ui`。

## 所有权与不变量

- 唯一读写入口是 `hooks/useLocalProfile.ts`；其余组件只经该 hook 消费。localStorage 为唯一事实源，hook 内部状态只是投影。
- 词表与色板是纯常量（`lib/randomUsername.ts` / avatar 色板），改词表不影响已存储的名字。
- 名字是展示用本地数据，不参与任何鉴权/网络/持久化业务，不写入日志。

## 明确不做（本期范围外）

- 预设头像图集（需要设计资产，首字母头像已覆盖需求）
- 头像上传、多档案切换、按 workspace 区分的身份
- 账号体系任何形式的恢复
