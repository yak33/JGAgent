import { GlobalNoticeSurface } from "@/global-notice/GlobalNoticeSurface.js";
import type { GlobalNoticeStore } from "@/global-notice/globalNoticeStore.js";

/**
 * 左下角活动共享槽位的仲裁层（JGAgent 去官方化：营销触达 banner 域已随运营体系移除，
 * 槽位只保留全局通知 highspeed 分享卡的展示入口）。
 * 纯只读投影，不持有任何状态；不可见时 GlobalNoticeSurface 返回 null，槽位不产生多余 DOM。
 */
export function SidebarBottomActivity({
  noticeStore,
}: {
  noticeStore?: GlobalNoticeStore | null;
} = {}) {
  // 未注入时走 GlobalNoticeSurface 默认的 browserGlobalNoticeStore。
  return <GlobalNoticeSurface store={noticeStore ?? undefined} />;
}
