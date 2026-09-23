import { AppUsagePanel } from "@/settings/usage-stats/AppUsagePanel.js";

// JGAgent 去官方化（阶段 3）：移除 Coding Plan 套餐 tab 类型，使用统计仅保留应用级 "app"。
export type UsageStatsSectionTab = "app";

export function UsageStatsSection() {
  return <AppUsagePanel />;
}
