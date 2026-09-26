/**
 * 本地身份（头像颜色 + 用户名）唯一读写入口（spec：docs/specs/local-profile.md）。
 * localStorage 是唯一事实源，本 hook 内部 state 只是投影；监听 storage 事件实现多窗口同步。
 * 刻意不复用阶段 3 置空保留的账号 store 字段，避免与上游 merge 冲突。
 */
import { useCallback, useEffect, useState } from "react";
import { generateRandomUsername, normalizeLocalProfileName } from "@/lib/randomUsername.js";
import { useZCodeIntl } from "@/i18n/IntlProvider.js";

const STORAGE_KEY = "jgagent-local-profile";

/** 固定 8 色头像色板；colorIndex 越界时渲染方回退到 0 号色。 */
export const LOCAL_PROFILE_COLOR_PALETTE: readonly string[] = [
  "#2563eb",
  "#0891b2",
  "#059669",
  "#ca8a04",
  "#ea580c",
  "#dc2626",
  "#7c3aed",
  "#db2777",
];

export interface LocalProfile {
  name: string;
  colorIndex: number;
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

function isValidProfile(value: unknown): value is LocalProfile {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<LocalProfile>;
  return (
    typeof candidate.name === "string" &&
    normalizeLocalProfileName(candidate.name) !== null &&
    typeof candidate.colorIndex === "number" &&
    Number.isInteger(candidate.colorIndex) &&
    candidate.colorIndex >= 0 &&
    candidate.colorIndex < LOCAL_PROFILE_COLOR_PALETTE.length
  );
}

function createDefaultProfile(locale: string): LocalProfile {
  const name = generateRandomUsername(locale);
  return { name, colorIndex: hashString(name) % LOCAL_PROFILE_COLOR_PALETTE.length };
}

function writeStoredProfile(profile: LocalProfile): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // localStorage 不可用（隐私模式等）时退化为仅内存态，不阻断 UI。
  }
}

function readStoredProfile(locale: string): LocalProfile {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isValidProfile(parsed)) {
        return parsed;
      }
    }
  } catch {
    // 解析失败按首次使用处理，走默认生成。
  }
  const fallback = createDefaultProfile(locale);
  writeStoredProfile(fallback);
  return fallback;
}

export function useLocalProfile() {
  const { locale } = useZCodeIntl();
  // 首次读取时生成默认名；locale 只影响首启/重掷语言，之后改名不随语言切换。
  const [profile, setProfile] = useState<LocalProfile>(() => readStoredProfile(locale));

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      try {
        const parsed: unknown = event.newValue ? JSON.parse(event.newValue) : null;
        if (isValidProfile(parsed)) {
          setProfile(parsed);
        }
      } catch {
        // 其他窗口写入异常数据时保持本地值。
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setName = useCallback(
    (rawName: string) => {
      const name = normalizeLocalProfileName(rawName);
      if (!name) return;
      setProfile((current) => {
        if (current.name === name) return current;
        const next = { ...current, name };
        writeStoredProfile(next);
        return next;
      });
    },
    [],
  );

  const setColorIndex = useCallback((colorIndex: number) => {
    setProfile((current) => {
      if (
        !Number.isInteger(colorIndex) ||
        colorIndex < 0 ||
        colorIndex >= LOCAL_PROFILE_COLOR_PALETTE.length ||
        current.colorIndex === colorIndex
      ) {
        return current;
      }
      const next = { ...current, colorIndex };
      writeStoredProfile(next);
      return next;
    });
  }, []);

  const rollName = useCallback(() => {
    const name = generateRandomUsername(locale);
    setName(name);
    return name;
  }, [locale, setName]);

  return { profile, setName, setColorIndex, rollName };
}
