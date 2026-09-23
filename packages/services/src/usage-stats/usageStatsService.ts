import type { AppUsageRequest, AppUsageSnapshot } from "@zcode/shared";
import type { IZCodeAgentService } from "../zcode-agent/zcodeAgent.js";
import type { IUsageStatsService } from "./usageStats.js";

interface UsageStatsServiceDependencies {
  /** App Usage 经 JGAgent Protocol 读取 agent 数据库真实统计。 */
  zcodeAgentService: Pick<IZCodeAgentService, "getAppUsageStats">;
}

// JGAgent 去官方化（阶段 3）：删除 Coding Plan 订阅配额（bigmodelUsageQuotaProvider 等）
// 与 entitlement 解析链路后，本服务只代理应用级统计；账号请求鉴权、凭证来源等依赖随之移除。
export function createUsageStatsService(
  dependencies: UsageStatsServiceDependencies,
): IUsageStatsService {
  return {
    async getAppUsageSnapshot(request: AppUsageRequest): Promise<AppUsageSnapshot> {
      // App Usage 现读取 agent 数据库真实统计（model_usage/turn_usage/tool_usage），
      // 经 JGAgent Protocol usage/stats 取回。不再读本地 session JSON 估算。
      return dependencies.zcodeAgentService.getAppUsageStats({
        range: request.range,
        timeZone: request.timeZone,
      });
    },
  };
}
