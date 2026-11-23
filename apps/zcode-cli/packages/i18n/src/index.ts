import type { UiLocale, SupportedLocale } from "@zcode/contracts";
import { enUS } from "./locales/en-US.js";
import { zhCN } from "./locales/zh-CN.js";
import {
  DEFAULT_LOCALE,
  detectLocale,
  isSupportedLocale,
  isUiLocale,
  resolveLocale,
  SUPPORTED_LOCALES,
} from "./locale.js";
import type { JGAgentCopy } from "./types.js";

export {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  detectLocale,
  isSupportedLocale,
  isUiLocale,
  resolveLocale,
};
export type { LocaleDetectionInput } from "./locale.js";
export type { CliCopy, TuiCopy, UiLocale, SupportedLocale, JGAgentCopy } from "./types.js";

const CATALOGS: Record<SupportedLocale, JGAgentCopy> = {
  "en-US": enUS,
  "zh-CN": zhCN,
};

export function getZCodeCopy(locale?: UiLocale | string, detected?: string | null): JGAgentCopy {
  return CATALOGS[resolveLocale(locale, detected)];
}
