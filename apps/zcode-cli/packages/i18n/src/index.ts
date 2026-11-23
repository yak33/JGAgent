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
import type { JGHarnessCopy } from "./types.js";

export {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  detectLocale,
  isSupportedLocale,
  isUiLocale,
  resolveLocale,
};
export type { LocaleDetectionInput } from "./locale.js";
export type { CliCopy, TuiCopy, UiLocale, SupportedLocale, JGHarnessCopy } from "./types.js";

const CATALOGS: Record<SupportedLocale, JGHarnessCopy> = {
  "en-US": enUS,
  "zh-CN": zhCN,
};

export function getZCodeCopy(locale?: UiLocale | string, detected?: string | null): JGHarnessCopy {
  return CATALOGS[resolveLocale(locale, detected)];
}
