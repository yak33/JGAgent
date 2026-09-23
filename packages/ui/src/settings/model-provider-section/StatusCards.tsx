/* eslint-disable max-lines -- Coding Plan/Start Plan 状态卡集中编排状态、动作和套餐区块，当前先保持同一文件避免拆散状态语义。 */
// JGAgent 去官方化（阶段 3）：移除升级/续期/订阅按钮（CodingPlanUpgradeAction / CodingPlanEntryButton buyAction）
// 与配套 upgradePlansVisible 受控状态、BigModel 注册失败 hint（authError 输入已移除），保留连接状态与额度展示。
import {
  isStartPlanModelProviderId,
  type UsageEntitlementSubscriptionDetail,
  type UsageQuotaLimit,
  type ZCodeAccountAccess,
  type ZCodeProviderAccountAccess,
} from "@zcode/shared";
import { InfoIcon, Loader2Icon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button.js";

import { logger } from "@/logger.js";



import { useZCodeIntl } from "@/i18n/IntlProvider.js";



import {
  type CodingPlanStatus,
  type CodingPlanLoginOptions,
  type CodingPlanProviderId,
  type TeamPlanAvailabilityReason,
} from "./constants.js";
import type { CodingPlanStatusPanelViewState } from "./codingPlanStatusPanelViewState.js";
import { CodingPlanStatusMeta, StartPlanStatusMeta } from "./CodingPlanStatusMeta.js";
import { formatQuotaModelDisplayName } from "./quotaModelDisplayName.js";
// JGAgent 去官方化（阶段 3）：formatQuotaModelDisplayName 仅剩通用额度卡在用，import 恢复。
import { CodingPlanStatusActions } from "./CodingPlanStatusActions.js";




// JGAgent 去官方化（阶段 3）：额度汇总卡配色常量随订阅域移除。

function PlanStatusCardSurface({
  planTitle,
  titleAccessory,
  statusMeta,
  trailingAction,
  usageContent,
}: {
  planTitle: string;
  titleAccessory?: ReactNode;
  statusMeta: ReactNode;
  trailingAction?: ReactNode;
  usageContent?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex min-w-0 items-center justify-between gap-3 max-sm:flex-col max-sm:items-stretch">
        <div className="min-w-0 space-y-1">
          <div className="flex min-w-0 flex-wrap items-center gap-1">
            <h3 className="min-w-0 truncate text-ui-lg font-semibold leading-5 text-foreground">
              {planTitle}
            </h3>
            {titleAccessory}
          </div>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            {statusMeta}
          </div>
        </div>
        {trailingAction ? (
          <div className="shrink-0 max-sm:flex max-sm:w-full max-sm:[&>button]:w-full">
            {trailingAction}
          </div>
        ) : null}
      </div>
      {usageContent ? (
        <>
          <div className="my-4 border-t border-border" />
          {usageContent}
        </>
      ) : null}
    </div>
  );
}

export function ModelProviderLoadingCard({ loadingLabel }: { loadingLabel: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-3">
      <div className="flex items-center gap-2 text-ui-base text-foreground-subtle">
        <Loader2Icon className="size-4 animate-spin" />
        <span>{loadingLabel}</span>
      </div>
    </div>
  );
}

export function PresetProviderPlaceholderCard({
  displayName,
  messageId = "settings.modelProvider.presetEmpty",
}: {
  displayName: string;
  messageId?: string;
}) {
  const { intl } = useZCodeIntl();

  return (
    <div className="bg-background/50 rounded-2xl p-3">
      <div className="text-ui-lg font-semibold text-foreground">{displayName}</div>
      <div className="mt-1 text-ui-base text-foreground-subtle">
        {intl.formatMessage({ id: messageId })}
      </div>
    </div>
  );
}

export function CodingPlanStatusPanel({
  providerId,
  providerName,
  status,
  viewState,
  loginLoading,
  disconnectLoading,
  purchaseUrl,
  planLevel,
  inactivePlanTitle,
  subscriptionRenewTime,
  subscriptionExpireTime,
  subscriptionDetails,
  quotaLimits = [],
  // JGAgent 去官方化（阶段 3）：mcpQuotaLimit / usageDetailsVisible / quotaReset* 解构随额度展示移除。
  onLogin,
  onRetry,
  onOpenPurchase,
  onDisconnect,
  loginActionPlacement = "inline",
  loginActionVisible = false,

  statusLabelId,
  statusMessage,
  teamPlanAvailabilityReason,

  onQuotaResetEntitlementRefresh,
}: {
  providerId: CodingPlanProviderId;
  providerName: string;
  status: CodingPlanStatus;
  viewState?: CodingPlanStatusPanelViewState;
  loginLoading?: boolean;
  disconnectLoading?: boolean;
  purchaseUrl?: string;
  planLevel?: string | null;
  inactivePlanTitle?: string | null;
  subscriptionRenewTime?: string | null;
  subscriptionExpireTime?: string | null;
  subscriptionDetails?: UsageEntitlementSubscriptionDetail[];
  quotaLimits?: UsageQuotaLimit[];
  /** 官方 Server MCP 额度（服务端下发的总额度）。不在 quota.limits[] 里，由 nav item 单独透传。 */
  mcpQuotaLimit?: UsageQuotaLimit | null;
  onLogin?: (options?: CodingPlanLoginOptions) => number | void | Promise<void>;
  /** Start 套餐获取失败沿用 Host 手动刷新，不强制重新登录。 */
  onRetry?: () => void;
  onOpenPurchase?: (url: string) => void;
  onDisconnect?: () => void;
  loginActionPlacement?: "inline" | "trailing";
  loginActionVisible?: boolean;
  usageDetailsVisible?: boolean;
  statusLabelId?: string;
  statusMessage?: string | null;
  teamPlanAvailabilityReason?: TeamPlanAvailabilityReason;
  /** Team Plan 必须传完整连接 key，避免与同 provider 的个人套餐共享重置状态。 */
  quotaResetSourceKey?: string;
  quotaResetAccountAccess?: ZCodeProviderAccountAccess | ZCodeAccountAccess;
  onQuotaResetEntitlementRefresh?: () => void | Promise<void>;
}) {
  const { intl } = useZCodeIntl();
  const [startPlanEntitlementRefreshing, setStartPlanEntitlementRefreshing] = useState(false);
  const refreshStartPlanEntitlement = async () => {
    if (!onQuotaResetEntitlementRefresh || startPlanEntitlementRefreshing) {
      return;
    }
    setStartPlanEntitlementRefreshing(true);
    try {
      await onQuotaResetEntitlementRefresh();
    } catch (error) {
      // 额度桶可能在生效时间后仍短暂未就绪。刷新失败时必须保留按钮供重试，
      // 不能因为一次网络错误把“尚未同步”错误收敛成已完成。
      logger.warn("[ModelProviderSection] 刷新 Start Plan 权益失败", {
        error: error instanceof Error ? error.message : String(error),
        providerId,
      });
    } finally {
      setStartPlanEntitlementRefreshing(false);
    }
  };
  const effectiveViewState = viewState ?? {
    displayStatus: status,
    actionStatus: status,
    balanceStatus: status,
    loginLoading: loginLoading === true,
  };
  const isDisconnected = effectiveViewState.displayStatus === "disconnected";
  const isChecking = effectiveViewState.displayStatus === "checking";
  const isUnavailable = effectiveViewState.displayStatus === "unavailable";
  const isUnsupported = effectiveViewState.displayStatus === "unsupported";
  const isPurchased = effectiveViewState.displayStatus === "purchased";
  const isNotPurchased = effectiveViewState.displayStatus === "notPurchased";
  const actionIsDisconnected = effectiveViewState.actionStatus === "disconnected";
  const isStartPlanProvider = isStartPlanModelProviderId(providerId);
  const canDisconnectProvider =
    !isStartPlanProvider &&
    Boolean(onDisconnect) &&
    !isDisconnected &&
    !isChecking &&
    !isUnavailable &&
    !isUnsupported;
  // JGAgent 去官方化（阶段 3）：移除不可用态的“重新登录”专属文案，统一回落普通登录标签。
  const loginButtonId = isStartPlanProvider
    ? "settings.modelProvider.startPlan.login"
    : "settings.modelProvider.codingPlan.connect";
  const defaultStatusBadgeId = isUnsupported
    ? "settings.modelProvider.codingPlan.status.unsupported"
    : isDisconnected
      ? "settings.modelProvider.codingPlan.status.disconnected"
      : isChecking
        ? "settings.modelProvider.codingPlan.status.checking"
        : isUnavailable
          ? "settings.modelProvider.codingPlan.status.unavailable"
          : isPurchased
            ? "settings.modelProvider.codingPlan.status.purchased"
            : "settings.modelProvider.codingPlan.status.notPurchased";
  // 检查态可能仍携带上一轮团队错误；状态行只呈现当前检查状态，避免双图标和旧错误闪现。
  const statusBadgeId = isChecking
    ? defaultStatusBadgeId
    : (statusLabelId ??
      (isStartPlanProvider && isDisconnected
        ? "settings.modelProvider.startPlan.status.loginRequired"
        : isStartPlanProvider && isNotPurchased
          ? "settings.modelProvider.startPlan.status.noPlan"
          : defaultStatusBadgeId));
  const statusBadgeMessage = isChecking ? undefined : statusMessage?.trim();
  // 展示文案不是状态权威。Team Plan 交互只读取显式业务原因，
  // 避免 Project Key 错误被翻译 key 误判成“团队套餐未分配”。
  const teamPlanUnavailableStatusVisible =
    teamPlanAvailabilityReason === "not-allocated" || teamPlanAvailabilityReason === "expired";
  const teamPlanWarningVisible = !isChecking && teamPlanAvailabilityReason !== undefined;
  const recoverableUnavailable =
    effectiveViewState.actionStatus === "unavailable" && !teamPlanUnavailableStatusVisible;
  // JGAgent 去官方化（阶段 3）：移除凭据失败后的“重新登录”按钮，恢复入口统一走重试/普通登录。
  const retryVisible =
    (recoverableUnavailable ||
      statusLabelId === "settings.modelProvider.codingPlan.status.unavailable") &&
    Boolean(onRetry);
  const trailingLoginVisible =
    !retryVisible &&
    loginActionVisible &&
    loginActionPlacement === "trailing" &&
    (actionIsDisconnected || recoverableUnavailable) &&
    Boolean(onLogin);
  const rawPlanLevel = planLevel?.trim() ?? "";
  const normalizedPlanLevel = rawPlanLevel.toUpperCase();
  const displayPlanLevel = /^GLM[\s_-]+CODING\b/i.test(rawPlanLevel)
    ? formatQuotaModelDisplayName(rawPlanLevel)
    : normalizedPlanLevel;
  const canManageCodingPlan =
    !isDisconnected &&
    !isChecking &&
    !isUnsupported &&
    isPurchased &&
    Boolean(purchaseUrl) &&
    Boolean(onOpenPurchase);
  // JGAgent 去官方化（阶段 3）：移除未开通态的 Start Plan 预览营销卡及其远端 preview 拉取，
  // 以及 BigModel 未注册 hint（authError 输入已随 oauthError store 字段移除）。
  const inlineDisconnectVisible = canDisconnectProvider && !isPurchased;
  const planTitle = resolveCodingPlanStatusCardTitle({
    isPurchased,
    isUnavailable,
    isStartPlanProvider,
    inactivePlanTitle,
    rawPlanLevel,
    displayPlanLevel,
    startPlanTitle: intl.formatMessage({
      id: "settings.modelProvider.planCard.startPlan",
    }),
    codingPlanTitle: intl.formatMessage({
      id: "settings.modelProvider.planCard.codingPlan",
    }),
  });
  const notPurchasedStatusLabel = isNotPurchased ? (
    <span className="flex w-fit items-center gap-1.5 text-foreground-subtle">
      <InfoIcon className="size-3 shrink-0" aria-hidden="true" />
      <span>{intl.formatMessage({ id: statusBadgeId })}</span>
    </span>
  ) : null;
  // JGAgent 去官方化（阶段 3）：Start Plan 余额卡数据源随订阅域删除，套餐卡恒为空。
  const startPlanEntries: readonly { plan: never; limits: readonly never[] }[] = [];
  const statusMeta =
    isPurchased && isStartPlanProvider ? (
      // 产品语义:体验套餐用量卡片不展示「管理」「解绑」操作(免费套餐无管理页,
      // 登录态由 family 级连接方式管理),仅保留过期时间与右侧升级 Coding Plan 入口。
      <StartPlanStatusMeta
        expireTime={subscriptionExpireTime}
        entitlements={subscriptionDetails?.[0]?.entitlements}
        hasQuota={hasStartPlanEntitlementQuota(
          subscriptionDetails?.[0]?.entitlements,
          startPlanEntries[0]?.limits ?? quotaLimits,
        )}
        refreshing={startPlanEntitlementRefreshing}
        onRefresh={refreshStartPlanEntitlement}
      />
    ) : isPurchased ? (
      <CodingPlanStatusMeta
        renewTime={subscriptionRenewTime}
        expireTime={subscriptionExpireTime}
        manageLabel={
          canManageCodingPlan
            ? intl.formatMessage({
                id: "settings.modelProvider.codingPlan.manage",
              })
            : null
        }
        unlinkLabel={
          canDisconnectProvider
            ? intl.formatMessage({
                id: "settings.modelProvider.codingPlan.disconnect",
              })
            : null
        }
        unlinkLoading={disconnectLoading}
        onManage={
          canManageCodingPlan && purchaseUrl && onOpenPurchase
            ? () => onOpenPurchase(purchaseUrl)
            : undefined
        }
        onUnlink={canDisconnectProvider ? onDisconnect : undefined}
      />
    ) : inlineDisconnectVisible ? (
      <CodingPlanStatusMeta
        statusLabel={notPurchasedStatusLabel ?? intl.formatMessage({ id: statusBadgeId })}
        unlinkLabel={intl.formatMessage({
          id: "settings.modelProvider.codingPlan.disconnect",
        })}
        unlinkLoading={disconnectLoading}
        onUnlink={onDisconnect}
      />
    ) : (
      <span
        className={
          teamPlanWarningVisible
            ? "flex w-fit items-center gap-1.5 text-ui-base text-warning"
            : "flex w-fit items-center gap-1.5 text-ui-base text-foreground-subtle"
        }
      >
        {isChecking ? <Loader2Icon className="size-3 animate-spin" /> : null}
        {isNotPurchased || teamPlanWarningVisible ? (
          <InfoIcon className="size-3 shrink-0" aria-hidden="true" />
        ) : null}
        {statusBadgeMessage || intl.formatMessage({ id: statusBadgeId })}
      </span>
    );
  // JGAgent 去官方化（阶段 3）：额度汇总卡随订阅域移除，用量卡区域不再展示。

  // JGAgent 去官方化（阶段 3）：移除“重新登录”分支（原凭据失败强制 forceOAuth 恢复），
  // 恢复入口优先级为 重试 > 尾部登录（升级/订阅按钮已随购买面板摘除）。
  const trailingAction = retryVisible ? (
    <Button type="button" size="lg" onClick={onRetry} disabled={effectiveViewState.loginLoading}>
      {intl.formatMessage({ id: "common.retry" })}
    </Button>
  ) : trailingLoginVisible ? (
    <Button
      type="button"
      size="lg"
      onClick={() => onLogin?.()}
      disabled={effectiveViewState.loginLoading}
    >
      {effectiveViewState.loginLoading ? <Loader2Icon className="size-3.5 animate-spin" /> : null}
      {intl.formatMessage({ id: loginButtonId }, { provider: providerName })}
    </Button>
  ) : null;
  const statusContent = (
    <>
      {isPurchased && statusLabelId === "settings.modelProvider.codingPlan.status.unavailable" ? (
        <span className="text-ui-base text-warning">
          {intl.formatMessage({ id: statusLabelId })}
        </span>
      ) : null}
      {statusMeta}
      <CodingPlanStatusActions
        providerName={providerName}
        isDisconnected={actionIsDisconnected}
        isUnavailable={recoverableUnavailable}
        isPurchased={isPurchased}
        loginLoading={effectiveViewState.loginLoading}
        loginButtonId={loginButtonId}
        loginVisible={loginActionVisible && !trailingLoginVisible && !retryVisible}
        canDisconnectProvider={inlineDisconnectVisible ? false : canDisconnectProvider}
        disconnectLoading={disconnectLoading}
        onLogin={onLogin}
        onDisconnect={onDisconnect}
      />
    </>
  );
  // JGAgent 去官方化（阶段 3）：Start Plan 多卡分支随订阅域删除（startPlanEntries 恒空）。
  const planCards = [
          <PlanStatusCardSurface
            key="current-plan"
            planTitle={planTitle}
            statusMeta={statusContent}
            trailingAction={trailingAction}
            // JGAgent 去官方化（阶段 3）：Start Plan 余额卡与 Coding Plan 额度汇总卡随订阅域移除。
            usageContent={undefined}
          />,
        ];

  return (
    <div className="space-y-3">
      {planCards}
      {/* JGAgent 去官方化（阶段 3）：移除未开通态的 StartPlanCard 预览营销卡渲染。 */}
    </div>
  );
}

function hasStartPlanEntitlementQuota(
  entitlements: UsageEntitlementSubscriptionDetail["entitlements"],
  limits: readonly UsageQuotaLimit[],
): boolean {
  const entitlementIds = new Set(
    (entitlements ?? [])
      .map((entitlement) => entitlement.entitlementId.trim().toLowerCase())
      .filter(Boolean),
  );
  if (entitlementIds.size === 0) {
    return limits.length > 0;
  }
  return limits.some((limit) => entitlementIds.has(limit.type.trim().toLowerCase()));
}

function resolveCodingPlanStatusCardTitle({
  isPurchased,
  // JGAgent 去官方化（阶段 3）：isUnavailable 形参随额度展示分支移除。
  isStartPlanProvider,
  inactivePlanTitle,
  rawPlanLevel,
  displayPlanLevel,
  startPlanTitle,
  codingPlanTitle,
}: {
  isPurchased: boolean;
  isUnavailable?: boolean;
  isStartPlanProvider: boolean;
  inactivePlanTitle?: string | null;
  rawPlanLevel: string;
  displayPlanLevel: string;
  startPlanTitle: string;
  codingPlanTitle: string;
}): string {
  if (!isPurchased) {
    return inactivePlanTitle?.trim() || (isStartPlanProvider ? startPlanTitle : codingPlanTitle);
  }

  if (isStartPlanProvider) {
    // Start provider 偶尔会承载同品牌 paid Coding Plan 的权益快照。
    // 只有真实 Start 权益继续显示 Start Plan；否则必须露出后端权益名，避免付费用户看到免费套餐标题。
    return isStartPlanEntitlementName(rawPlanLevel)
      ? startPlanTitle
      : displayPlanLevel || startPlanTitle;
  }

  return displayPlanLevel || codingPlanTitle;
}

function isStartPlanEntitlementName(planLevel: string): boolean {
  const normalized = planLevel.trim().toLowerCase();
  return (
    normalized === "start" || normalized === "start plan" || normalized.endsWith(" start plan")
  );
}

// JGAgent 去官方化（阶段 3）：CodingPlanUsageSummaryCards 桩随订阅域移除（无渲染点）。
