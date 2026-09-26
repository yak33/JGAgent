# 存储根目录隔离：`~/.zcode` → `~/.jgagent`

> 状态：已实现（2026-09-26）。对应改造清单第四节 P2「数据目录 `~/.zcode/`」的主目录级部分。

## 背景与动机

JGAgent 与官方 ZCode 共机共存时共用 `~/.zcode`：provider v2 配置、`cli/config.json`（MCP/hooks）、会话库 `cli/db/db.sqlite`、日志、telemetry state 全部互相污染。既有的 `dataBaseDir` 设置项无法自救——它的指针文件 `setting.json` 本身就在 `~/.zcode/v2/` 里，两个应用读写的还是同一个文件。

## 行为定义

1. 所有**用户主目录级**数据的默认段名从 `<dataBaseDir>/.zcode` 改为 `<dataBaseDir>/.jgagent`。`dataBaseDir` 语义不变：`setDataBaseDir()` > `ZCODE_DATA_BASE_DIR` > `homedir()`。
2. 首次启动沿用各写入方既有的递归 mkdir 自动创建目录，无新增引导流程。
3. **不迁移、不回读** `~/.zcode`：旧目录原样保留，JGAgent 以全新配置起步（provider 需重新配置一次）。
4. 环境变量名 `ZCODE_STORAGE_DIR` / `ZCODE_DATA_BASE_DIR` / `ZCODE_HOME` / `ZCODE_BETA` 保持不变，属内部标识符（清单 P2 另行处理）。
5. beta 备用根 `.zcode-beta` → `.jgagent-beta`。
6. `packages/services/src/paths.ts` 的 `copyDataDirectory()`（dataBaseDir 切换迁移）改为复制 `.jgagent` 子目录。

## 所有权与不变量

- 段名唯一权威定义在 `packages/services/src/paths.ts` 的 `getZCodeDataRootDir()`；desktop main、services、`apps/zcode-cli`（Agent CLI）、`zcode-server-cli` 四个进程各自解析路径时**必须得到同一结果**——provider 配置传递、setting.json 引导、日志目录共享都依赖这一一致性。
- 段名不一致 = 跨进程读写不同目录 = 配置"丢失"。新增主目录级路径必须走 `paths.ts` 或同样使用 `.jgagent` 段名，禁止再写 `.zcode`。

## 明确不改的（本次范围外）

- **工作区级 `.zcode`**：`<workspace>/.zcode/agent-memory`、`workflow-drafts`、`workflow-runs`、workspace 配置发现逻辑（`workspace-hook-config.ts` 等）保持 `.zcode`。两个工具打开同一项目时仍共享这些目录，是否隔离另行立项。
- `ZCODE_*` 环境变量前缀、`@zcode/*` 包作用域（清单 P2）。
- `paths.ts` `validateDataBaseDirTarget` 的 Windows 禁入目录仍按 ZCode 安装路径（`Program Files/ZCode`）判定，未更新为 JGAgent 安装路径——storage 段名改动不影响该函数语义，遗留待发布工程阶段处理。

## 失败语义

- 老用户升级到含本改动的版本：历史会话与配置不出现（在旧 `~/.zcode` 里，原样未动），表现为新装机。属预期行为，无静默数据丢失。
- 如需找回：手动拷贝 `~/.zcode` 对应子目录到 `~/.jgagent` 即可（`copyDataDirectory` 的目录对应关系：`v2`、`cli/db`）。
