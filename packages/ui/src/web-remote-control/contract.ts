// JGAgent：账号域已摘除；onDidChangeSession 事件端口内联为最小形状（无实例接线）。
interface WebRemoteControlOAuthSessionEventPort {
  onDidChangeSession: (listener: () => void) => () => void;
}
import type { IPlatformService } from "@zcode/shared";
import type { WebRemoteControlWorkspaceSwitcherApi } from "@/root/types.js";

export type WebRemoteControlDeviceNavigation = NonNullable<
  WebRemoteControlWorkspaceSwitcherApi["deviceNavigation"]
>;
export type WebRemoteControlAuthPlatform = Pick<
  IPlatformService,
  "notifyWebRemoteControlAuthStateChanged"
>;
export type WebRemoteControlAuthEvents = WebRemoteControlOAuthSessionEventPort;
export type { WebRemoteControlMobileTaskView } from "@zcode/shared";
export type WebRemoteControlTaskViewSwitcher = Pick<
  WebRemoteControlWorkspaceSwitcherApi,
  "updateMobileTaskView" | "updateMobileViewState"
>;
