import { cpSync, existsSync, readFileSync, readdirSync, renameSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { setDataBaseDir } from "@zcode/services/node";
import { ZCODE_CREDENTIALS_FILE_ENV } from "@zcode/shared/credential-security";

export function resolveBootstrapSettingsFile(homePath: string = homedir()): string {
  return join(homePath, ".jgharness", "v2", "setting.json");
}

export function extractBootstrapDataBaseDir(rawValue: unknown): string | null {
  if (!rawValue || typeof rawValue !== "object") {
    return null;
  }

  const dataBaseDir = (rawValue as { dataBaseDir?: unknown }).dataBaseDir;
  if (typeof dataBaseDir !== "string") {
    return null;
  }

  const trimmed = dataBaseDir.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readBootstrapDataBaseDirFromDisk(
  settingsFile: string = resolveBootstrapSettingsFile(),
): string | null {
  if (!existsSync(settingsFile)) {
    return null;
  }

  try {
    const raw = readFileSync(settingsFile, "utf-8");
    return extractBootstrapDataBaseDir(JSON.parse(raw));
  } catch {
    return null;
  }
}

const LEGACY_DATA_ROOT = join(homedir(), ".jgagent");
const NEXT_DATA_ROOT = join(homedir(), ".jgharness");

// v2 下由程序自动生成的运行时产物，不属于用户数据，不参与空壳合并。
const RUNTIME_GENERATED_V2_ENTRIES = new Set(["crash", "logs", "runtime"]);

/** 读取旧根 provider_config.json 的 providerOrder 长度；解析失败或缺失返回 null。 */
function readLegacyProviderOrderLength(): number | null {
  try {
    const parsed = JSON.parse(
      readFileSync(join(LEGACY_DATA_ROOT, "v2", "provider_config.json"), "utf-8"),
    ) as { config?: { providerOrder?: unknown } };
    const order = parsed.config?.providerOrder;
    return Array.isArray(order) ? order.length : null;
  } catch {
    return null;
  }
}

function nextDataRootHasProviderConfiguration(): boolean {
  try {
    const parsed = JSON.parse(
      readFileSync(join(NEXT_DATA_ROOT, "v2", "provider_config.json"), "utf-8"),
    ) as { config?: { providerOrder?: unknown } };
    const order = parsed.config?.providerOrder;
    return Array.isArray(order) && order.length > 0;
  } catch {
    return false;
  }
}

function readdirSafe(directory: string): string[] {
  try {
    return readdirSync(directory);
  } catch {
    return [];
  }
}

/**
 * v1.0.0 已在新根生成空壳（无 provider 配置）而旧根数据完好的场景：新根里的
 * setting.json / tasks-index.sqlite 等都是程序自动生成的初始文件，把旧根 v2 下
 * 的用户数据整体覆盖回来；新根已由用户配置过模型则不动，保护新数据。
 */
function mergeLegacyV2IntoEmptyNextRoot(): void {
  const legacyV2 = join(LEGACY_DATA_ROOT, "v2");
  const nextV2 = join(NEXT_DATA_ROOT, "v2");
  for (const entry of readdirSafe(legacyV2)) {
    if (RUNTIME_GENERATED_V2_ENTRIES.has(entry)) continue;
    cpSync(join(legacyV2, entry), join(nextV2, entry), { recursive: true, force: true });
  }
  console.log(
    `[migrate] 已将旧数据合并进 ${nextV2}（原空壳被用户数据覆盖，旧目录保留在 ${legacyV2}）`,
  );
}

/**
 * JGHarness v0.7.0 改名迁移：存储根由 ~/.jgagent 改为 ~/.jgharness。
 * 旧根存在且新根不存在时整体重命名（配置/会话/凭据/插件全部保留）；迁移失败不
 * 阻断启动（按新目录继续，旧数据留在原处可手动找回）。
 *
 * v1.0.1 修复（2026/11/24）：迁移必须在任何会创建 ~/.jgharness 的模块（preinstalled
 * tools、early data dir、crash 采集等）之前执行——它们一旦先建出新根，整体迁移就会
 * 静默跳过（v1.0.0 用户「安装后旧数据全部消失」的根因）。因此本函数由
 * applyEarlyDataBaseDirBootstrap 首先调用，而后者经 index.ts 第一行 import 最先加载。
 * 这里只依赖 node 内建模块、用 console 输出，不引入可能建目录的模块。
 */
export function migrateLegacyJGAgentDataRoot(): void {
  try {
    if (!existsSync(LEGACY_DATA_ROOT)) return;
    if (!existsSync(NEXT_DATA_ROOT)) {
      renameSync(LEGACY_DATA_ROOT, NEXT_DATA_ROOT);
      console.log(`[migrate] 存储根已迁移: ${LEGACY_DATA_ROOT} -> ${NEXT_DATA_ROOT}`);
      return;
    }
    // 新根已存在：仅当旧根有 provider 配置而新根没有（v1.0.0 空壳场景）时合并用户数据。
    const legacyProviderCount = readLegacyProviderOrderLength();
    if (legacyProviderCount !== null && legacyProviderCount > 0 && !nextDataRootHasProviderConfiguration()) {
      mergeLegacyV2IntoEmptyNextRoot();
      return;
    }
    console.log(`[migrate] 新根已存在且已有配置，跳过迁移（旧目录保留: ${LEGACY_DATA_ROOT}）`);
  } catch (error) {
    console.warn("[migrate] ~/.jgagent -> ~/.jgharness 迁移失败（按新目录继续）", error);
  }
}

export function applyEarlyDataBaseDirBootstrap(): string | null {
  // 存储根迁移必须先于 dataBaseDir 引导与一切可能建目录的模块（见函数注释）。
  migrateLegacyJGAgentDataRoot();
  // Bug 原因（评审 CR-01）：ZCODE_CREDENTIALS_FILE 是 Source Server Core 的进程装配，凭据路径解析
  // 会优先采用它。Desktop 从设置了该变量的 shell / launchctl 环境启动时，Main cipher、Host 凭据服务
  // 与 Agent 会整体改用外部指定的凭据库（例如 Server 自有库）。Desktop 不是该变量的合法来源，
  // 在任何凭据读写方创建、Host fork 之前删除一次，Main、Host 与 Agent 都只用 Desktop 数据根。
  delete process.env[ZCODE_CREDENTIALS_FILE_ENV];
  const dataBaseDir = readBootstrapDataBaseDirFromDisk();
  if (dataBaseDir) {
    // 启动早期就把 dataBaseDir 注入进来，避免 logger / crashReporter 先按默认 HOME 建目录，
    // 导致后续再切换到自定义目录时，日志和 crash dump 落在两套路径里。
    setDataBaseDir(dataBaseDir);
  }
  return dataBaseDir;
}
