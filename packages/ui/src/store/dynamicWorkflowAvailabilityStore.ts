import { create } from "zustand";
import type { DynamicWorkflowClientConfig } from "@zcode/shared";

// ============================================================
// 动态工作流灰度快照在 renderer 的唯一副本
// ============================================================
//
// JGAgent 去官方化（阶段 3）：灰度配置原先由 CodingPlanSubscriptionService 下发；
// 订阅服务域删除后没有服务端灰度来源，快照固定为 disabled（fail-closed，
// 与「Host 判定一次、renderer 只读」的原语义一致）。保留 store 与 hook 形状，
// 消费方（自动化页、run 面板）无需感知来源移除；后续接公司自有灰度时只需
// 恢复 ensureLoaded 的取数实现。

export type DynamicWorkflowAvailabilityStatus = "loading" | "ready";

export interface DynamicWorkflowAvailabilitySnapshot {
  readonly status: DynamicWorkflowAvailabilityStatus;
  /** loading 期间恒为 false：未知即不提供，入口宁可晚半拍出现也不闪一下再收起。 */
  readonly enabled: boolean;
  /** 未就绪或取数失败时为 null；`source` 只用于观测，区分「服务端关」与「本地覆盖」。 */
  readonly config: DynamicWorkflowClientConfig | null;
}

interface DynamicWorkflowAvailabilityState extends DynamicWorkflowAvailabilitySnapshot {
  /** 灰度来源已删除：恒为 no-op，快照保持 disabled。 */
  ensureLoaded(): Promise<void>;
  /** 灰度来源已删除：恒为 no-op，快照保持 disabled。 */
  refresh(): Promise<void>;
}

const FIXED_DISABLED_SNAPSHOT: DynamicWorkflowAvailabilitySnapshot = {
  status: "ready",
  enabled: false,
  config: null,
};

export const useDynamicWorkflowAvailabilityStore = create<DynamicWorkflowAvailabilityState>(
  (set) => ({
    ...FIXED_DISABLED_SNAPSHOT,

    ensureLoaded(): Promise<void> {
      set(FIXED_DISABLED_SNAPSHOT);
      return Promise.resolve();
    },

    refresh(): Promise<void> {
      set(FIXED_DISABLED_SNAPSHOT);
      return Promise.resolve();
    },
  }),
);
