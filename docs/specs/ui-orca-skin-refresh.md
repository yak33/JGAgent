# JGHarness UI 视觉换肤与贴边布局规范（Orca / Qoder 风格）

## 背景与目标

本规范定义 JGHarness 桌面端与 Web 端默认视觉体系的全面升级：在**完整保留 JGHarness 现有交互范式、模块状态所有权、键盘流、移动端远控适配及上游 ZCode 同步能力**的前提下，直接替换默认浅色/深色外观，对齐 Orca / 新版 Qoder 的高对比极简工作台质感。

## 设计原则与约束

1. **只换肤与收紧壳层，不改业务范式**：不引入任意递归分屏树或 Chat/Raw CLI 双模切换，保留现有「侧栏 + 主对话列（含底部终端）+ 右侧 SidePane」布局与状态所有者。
2. **直接替换默认外观**：复用现有 `theme-zai-dark` / `theme-zai-light` 主题类与设置项（不增加冗余主题枚举，避免割裂既有持久化偏好与同步广播），默认主题仍为深色。
3. **严格遵守仓库 UI 与架构门禁**：
   - 全程遵守 [DESIGN.md](../../DESIGN.md) 的 `text-ui-*` 字号体系，不引入 `text-sm` / `text-xs` / `text-[13px]`；
   - 不新增未登记在 `architecture-policy.yaml` 的 TS/TSX 源文件；
   - 保持 Windows / macOS / Linux 与手机 Web 远控布局完整可用；
   - 所有新增字体资源本地内置（零外网字体请求），并保留中文字体回退栈（西文优先 Geist → Segoe UI / -apple-system，中文回退微软雅黑 UI / 苹方）。
4. **低上游同步冲突**：视觉令牌与精细材质覆盖集中在 [packages/ui/src/styles.css](../../packages/ui/src/styles.css) 末尾的独立语义区块（明确标记 `JGHarness Orca-inspired Skin`），外壳布局只做精准最小改动。

## 改造清单

### 1. 视觉令牌与材质（深色 & 浅色）

- **字体与渲染**：
  - 引入本地 `Geist-Variable.woff2`（来自 MIT 许可的 `stablyai/orca` / Vercel Geist），作为 `--font-sans` 首位西文字体；
  - Windows 中文回退使用标准 `"Microsoft YaHei"`（移出偏瘦偏挤的 `"Microsoft YaHei UI"`），保留 `"PingFang SC"` / `"Noto Sans CJK SC"`；
  - 全局 `body` 开启 `-webkit-font-smoothing: antialiased`、`-moz-osx-font-smoothing: grayscale` 与 `letter-spacing: 0.01em`，消除深色底白字发毛发虚。
- **深色主题（`.theme-zai-dark` / `.dark`）**：
  - 主画布 `--color-background`：`#121212`
  - 侧栏 / 外壳底色 `--color-sidebar` / `--color-background-win-alt`：`#202020`（对齐 Orca 托起式深灰侧栏，与主画布形成自然层级，避免死黑底上白字过刺眼）
  - 顶栏 / 面板 `--color-header` / `--color-panel`：`#161616` / `#181818`
  - 卡片 / 浮层 / 输入框 `--color-card` / `--color-popover` / `--color-input`：`#1a1a1a` / `#1c1c1c` / `#191919`，聚焦 `#1d1d1d`
  - 极细分割线 `--color-border`：`rgb(255 255 255 / 0.075)`，hover `rgb(255 255 255 / 0.14)`
  - 交互面 `--color-hover`：`rgb(255 255 255 / 0.06)`，`--color-selected`：`rgb(255 255 255 / 0.1)`
  - 文本层级：`#f0f0f0` / `rgb(240 240 240 / 0.65)` / `rgb(240 240 240 / 0.42)`
  - 状态与语义强调色：运行态/成功/警告/错误/未读点高对比收敛，Diff 增删色与 Git 状态色对齐高辨识度色阶
- **浅色主题（`.theme-zai-light`）**：
  - 主画布 `--color-background`：`#ffffff`
  - 侧栏 / 外壳底色 `--color-sidebar` / `--color-background-win-alt`：`#f5f5f5`
  - 顶栏 / 面板 `--color-header` / `--color-panel`：`#fafafa`
  - 卡片 / 浮层 / 输入框 `--color-card` / `--color-popover` / `--color-input`：`#ffffff`
  - 边框 `--color-border`：`#e5e5e5`，hover `#d4d4d8`
  - 交互面 `--color-hover`：`rgb(10 10 10 / 0.04)`，`--color-selected`：`rgb(10 10 10 / 0.07)`
- **滚动条**：全局滚动条从 14px 收窄为更克制的 10px 细轨（border 2px），保持现有按需浮现与 hover 加深机制。

### 2. 贴边 1px 分割壳层（去浮岛外框）

- [DesktopWindowFrame.tsx](../../packages/ui/src/DesktopWindowFrame.tsx)：Windows/Linux/Web 窗口底层改为 `bg-sidebar`，消除灰色底板感；Linux 非最大化仍保留 `16px` 外窗圆角裁切。
- [workspaceShellWindowChrome.ts](../../packages/ui/src/app-shell/workspaceShellWindowChrome.ts)：面板外壳改为直角贴边（`rounded-none border-0`），panel radius 返回 `0`，面板边界交由 1px 极细分割线（`border-l` / `border-t`）表达，移除四周外框和 `shadow-xs`。
- [WorkspaceShellLayout.tsx](../../packages/ui/src/app-shell/WorkspaceShellLayout.tsx)：
  - 移除 `hasDesktopPanelInset` 引入的外围 `pr-1.5 pb-1.5` / `h-1.5` 浮岛留白；
  - 对话区、底部终端、右侧 SidePane 改为贴边 1px 分割线衔接（侧栏与主区之间 1px 竖线、主区与终端之间 1px 横线、主区与 SidePane 之间 1px 竖线）；
  - 拖拽把手保留清晰命中区，hover 时高亮细线（不留浮岛内缩空隙）。
- [SettingsPage.tsx](../../packages/ui/src/SettingsPage.tsx)：与主工作区一致，移除设置内容区外围浮岛留白与圆角外框，改为左侧 `border-l border-border` 贴边衔接。

### 3. 顶栏、侧栏与对话区密度收紧

- **统一顶栏高度 `40px`（`h-10`）**：
  - [WorkspaceHeader.tsx](../../packages/ui/src/WorkspaceHeader.tsx)：`h-12` → `h-10`，内边距收紧为 `px-2.5 py-1`；
  - [DesktopTopOverlay.tsx](../../packages/ui/src/DesktopTopOverlay.tsx)：同步调整高度与垂直偏移（去掉浮岛 `top-1.5` / `top-1`，直接 `top-0 h-10`，macOS 保留交通灯安全区）；
  - [AnimatedSidePanePanel.tsx](../../packages/ui/src/app-shell/AnimatedSidePanePanel.tsx)：SidePane `TabsList` 与滚动视口从 `h-12` 收紧到 `h-10`，匹配工作区顶栏底线无缝贯通；
  - [project-sidebar/index.tsx](../../packages/ui/src/project-sidebar/index.tsx)：侧栏顶部占位条 `h-12` → `h-10`；
  - [SettingsPage.tsx](../../packages/ui/src/SettingsPage.tsx)：设置页顶栏高度与右上角窗控同步对齐 `h-10`；
  - [WorkspaceShellLayout.tsx](../../packages/ui/src/app-shell/WorkspaceShellLayout.tsx)：所有与顶栏高度绑定的 `top-12` 偏移同步改为 `top-10`。
- **侧栏紧凑化**：
  - [ProjectSidebarNavigation.tsx](../../packages/ui/src/project-sidebar/ProjectSidebarNavigation.tsx)：顶部导航区 `py-3` → `py-2`，按钮高度收紧为 `h-7`（`size="default"`），圆角 `rounded-md`；
  - [NewTaskButtonGroup.tsx](../../packages/ui/src/NewTaskButtonGroup.tsx)：高度 `h-8` → `h-7`，圆角 `rounded-md`；
  - [TaskListItem.tsx](../../packages/ui/src/TaskListItem.tsx)：圆角 `rounded-lg` → `rounded-md`，默认行垂直内边距收紧，激活态与 hover 态更利落；
  - [WorkspaceSidebarFooter.tsx](../../packages/ui/src/WorkspaceSidebarFooter.tsx)：底栏增加极细顶分割线 `border-t border-border`，边距收紧为 `px-2.5 py-2`。
- **对话区与输入框**：
  - [conversationLayout.ts](../../packages/ui/src/v4/conversationLayout.ts)：阅读最大宽度收敛为 `max-w-4xl`（草稿居中态保持 `max-w-2xl`），避免超宽屏正文行过长；
  - [ChatPromptEditor.tsx](../../packages/ui/src/prompt-editor/ChatPromptEditor.tsx)：输入框外壳改为 `rounded-xl border border-input-border bg-input p-2.5`，去掉偏重的圆角与阴影，聚焦边框微亮；
  - [SidePaneTabTrigger.tsx](../../packages/ui/src/app-shell/SidePaneTabTrigger.tsx)：Tab 高度与圆角统一为紧凑 `rounded-md`，激活态去阴影靠清晰的灰度阶区分。

## 验收场景

1. **静态门禁**：`pnpm typecheck`、`pnpm lint`（重点核查 React Hooks 规则无新增）、`pnpm architecture:check --changed` 全部通过。
2. **暗色/浅色双主题验收**：在隔离数据目录启动桌面端（`ZCODE_DATA_BASE_DIR` 隔离）或渲染验证，确认：
   - 顶栏、侧栏、对话区、SidePane Tab 栏底线严格对齐（40px），无浮岛灰边与多余阴影；
   - 侧栏与主区、主区与终端、主区与 SidePane 之间仅由 1px 细线分隔，拖拽缩放正常；
   - Windows 窗控（最小化/最大化/关闭）与左上角 Logo/折叠/前进后退按钮在 40px 顶栏内垂直居中且可点击（无 drag 区域吞点击）；
   - 设置页、欢迎页、对话输入区、代码块、工具调用块在深色（默认）与浅色下文字对比度清晰、无白块/黑字错配；
   - 窄屏 Web / 手机远控断点无回归。
