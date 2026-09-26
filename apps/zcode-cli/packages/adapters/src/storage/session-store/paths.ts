import { existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { maybeThrowStorageFsFault } from "../fs-fault-injection.js";

/**
 * 解析 .jgagent 数据根的基准目录。
 * 会话库及其 wal/shm/备份伴生文件落在 <基准目录>/.jgagent 下。基准目录取
 * ZCODE_DATA_BASE_DIR，未设置时为主目录——默认段名必须是 .jgagent：
 * 存储根隔离 spec（docs/specs/storage-root-isolation.md）禁止回写官方
 * ZCode 的 ~/.zcode（曾导致 JGAgent 侧栏出现官方 ZCode 的项目列表）。
 */
export function resolveZCodeStorageBaseDir(env: NodeJS.ProcessEnv = process.env): string {
  return env.ZCODE_DATA_BASE_DIR?.trim() || homedir();
}

export function getDefaultSessionDbPath(): string {
  return join(resolveZCodeStorageBaseDir(), ".jgagent", "cli", "db", "db.sqlite");
}

export function ensureParentDir(filePath: string): void {
  const parent = dirname(filePath);
  if (!existsSync(parent)) {
    maybeThrowStorageFsFault({ operation: "mkdir", path: parent });
    mkdirSync(parent, { recursive: true });
  }
}
