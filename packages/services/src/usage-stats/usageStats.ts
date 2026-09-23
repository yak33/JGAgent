import type { AppUsageRequest, AppUsageSnapshot } from "@zcode/shared";
import { ServiceChannels } from "@zcode/shared";
import { createServiceDescriptor } from "../descriptors.js";

// JGAgent 去官方化（阶段 3）：账号与商业化服务域删除后，UsageStats 仅保留应用级统计
// （读取 agent 数据库的 model/turn/tool 用量）。Coding Plan 订阅配额、额度重置与
// entitlement 快照等方法随订阅体系一并移除。
export interface IUsageStatsService {
  getAppUsageSnapshot(request: AppUsageRequest): Promise<AppUsageSnapshot>;
}

export const IUsageStatsService = createServiceDescriptor<IUsageStatsService>(
  ServiceChannels.UsageStats,
);
