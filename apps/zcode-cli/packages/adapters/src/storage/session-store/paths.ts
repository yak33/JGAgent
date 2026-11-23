import { homedir } from "node:os";
import { join } from "node:path";

/**
 * 解析 .jgharness 数据根的基准目录。
 * 会话库及其 wal/shm/备份伴生文件落在 <基准目录>/.jgharness 下。基准目录取
 * ZCODE_DATA_BASE_DIR，未设置时为主目录——默认段名必须是 .jgharness：
 * 存储根隔离 spec（docs/specs/storage-root-isolation.md）禁止回写官方
 * ZCode 的 ~/.zcode（曾导致 JGHarness 侧栏出现官方 ZCode 的项目列表）。
 */
export function resolveZCodeStorageBaseDir(env: NodeJS.ProcessEnv = process.env): string {
  return env.ZCODE_DATA_BASE_DIR?.trim() || homedir();
}

export function getDefaultSessionDbPath(): string {
  return join(resolveZCodeStorageBaseDir(), ".jgharness", "cli", "db", "db.sqlite");
}
