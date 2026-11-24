/**
 * JGHarness v0.7.0 改名迁移：存储根由 ~/.jgagent 改为 ~/.jgharness。
 *
 * 本模块必须在 main 进程最先加载（排在 desktopEarlyDataBaseDirBootstrap 与
 * appCrashCaptureBootstrap 之前）：crash 采集等模块在模块加载期就会创建
 * ~/.jgharness，一旦新根抢先出现，整体重命名迁移就会静默跳过——v1.0.0 用户
 * 「安装后旧数据全部消失、被要求重新配置模型」即此原因（2026/11/24 修复）。
 * 因此这里只依赖 node 内建模块、用 console 输出，不引入任何可能建目录的模块。
 */
import { cpSync, existsSync, readdirSync, readFileSync, renameSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const LEGACY_ROOT = join(homedir(), ".jgagent");
const NEXT_ROOT = join(homedir(), ".jgharness");

// v2 下由程序自动生成的运行时产物，不属于用户数据，不参与空壳合并。
const RUNTIME_GENERATED_V2_ENTRIES = new Set(["crash", "logs", "runtime"]);

/** 读取 provider_config.json 的 providerOrder；解析失败或缺失返回 null。 */
function readProviderOrderLength(): number | null {
  try {
    const parsed = JSON.parse(readFileSync(join(LEGACY_ROOT, "v2", "provider_config.json"), "utf-8")) as {
      config?: { providerOrder?: unknown };
    };
    const order = parsed.config?.providerOrder;
    return Array.isArray(order) ? order.length : null;
  } catch {
    return null;
  }
}

function nextRootHasProviderConfiguration(): boolean {
  try {
    const parsed = JSON.parse(readFileSync(join(NEXT_ROOT, "v2", "provider_config.json"), "utf-8")) as {
      config?: { providerOrder?: unknown };
    };
    const order = parsed.config?.providerOrder;
    return Array.isArray(order) && order.length > 0;
  } catch {
    return false;
  }
}

/**
 * v1.0.0 已在新根生成空壳（无 provider 配置）而旧根数据完好的场景：新根里的
 * setting.json / tasks-index.sqlite 等都是程序自动生成的初始文件，把旧根 v2 下
 * 的用户数据整体覆盖回来；新根已由用户配置过模型则不动，保护新数据。
 */
function mergeLegacyV2IntoEmptyNextRoot(): void {
  const legacyV2 = join(LEGACY_ROOT, "v2");
  const nextV2 = join(NEXT_ROOT, "v2");
  for (const entry of readdirSafe(legacyV2)) {
    if (RUNTIME_GENERATED_V2_ENTRIES.has(entry)) continue;
    cpSync(join(legacyV2, entry), join(nextV2, entry), { recursive: true, force: true });
  }
  console.log(`[migrate] 已将旧数据合并进 ${nextV2}（原空壳被用户数据覆盖，旧目录保留在 ${legacyV2}）`);
}

function readdirSafe(directory: string): string[] {
  try {
    return readdirSync(directory);
  } catch {
    return [];
  }
}

export function migrateLegacyJGAgentDataRoot(): void {
  try {
    if (!existsSync(LEGACY_ROOT)) return;
    if (!existsSync(NEXT_ROOT)) {
      renameSync(LEGACY_ROOT, NEXT_ROOT);
      console.log(`[migrate] 存储根已迁移: ${LEGACY_ROOT} -> ${NEXT_ROOT}`);
      return;
    }
    // 新根已存在：仅当旧根有 provider 配置而新根没有（v1.0.0 空壳场景）时合并用户数据。
    const legacyProviderCount = readProviderOrderLength();
    if (legacyProviderCount !== null && legacyProviderCount > 0 && !nextRootHasProviderConfiguration()) {
      mergeLegacyV2IntoEmptyNextRoot();
      return;
    }
    console.log(`[migrate] 新根已存在且已有配置，跳过迁移（旧目录保留: ${LEGACY_ROOT}）`);
  } catch (error) {
    // 迁移失败不阻断启动：按新目录继续，旧数据留在原处可手动找回。
    console.warn("[migrate] ~/.jgagent -> ~/.jgharness 迁移失败（按新目录继续）", error);
  }
}

migrateLegacyJGAgentDataRoot();
