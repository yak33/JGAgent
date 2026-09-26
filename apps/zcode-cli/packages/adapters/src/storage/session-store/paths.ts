import { existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { maybeThrowStorageFsFault } from "../fs-fault-injection.js";

/**
 * 解析 .zcode 数据根的基准目录。
 * 设置 ZCODE_DATA_BASE_DIR 时（JGAgent 与 ZCode 原版共机隔离运行，桌面 Main 会向 Host/Agent 下发该变量），
 * 会话库及其 wal/shm/备份伴生文件必须落在 <ZCODE_DATA_BASE_DIR>/.jgagent 下，避免读写原版 ~/.zcode；
 * 未设置时保持 ~/.zcode 原行为不变。
 */
export function resolveZCodeStorageBaseDir(env: NodeJS.ProcessEnv = process.env): string {
  return env.ZCODE_DATA_BASE_DIR?.trim() || homedir();
}

export function getDefaultSessionDbPath(): string {
  return join(resolveZCodeStorageBaseDir(), ".zcode", "cli", "db", "db.sqlite");
}

export function ensureParentDir(filePath: string): void {
  const parent = dirname(filePath);
  if (!existsSync(parent)) {
    maybeThrowStorageFsFault({ operation: "mkdir", path: parent });
    mkdirSync(parent, { recursive: true });
  }
}
