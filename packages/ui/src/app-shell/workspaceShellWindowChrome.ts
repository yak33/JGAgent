interface WorkspaceShellWindowChromeOptions {
  isMacDesktop?: boolean;
  isWindowsDesktop?: boolean;
  isLinuxDesktop?: boolean;
  macOSMajorVersion?: number | null;
  isWindowsMaximized: boolean;
  supportsNativeRoundedCorners: boolean | null;
}

type WorkspaceShellPlatformRadiusOptions = Pick<
  WorkspaceShellWindowChromeOptions,
  "isMacDesktop" | "isWindowsDesktop" | "isLinuxDesktop" | "macOSMajorVersion"
>;

export function resolveWorkspaceShellPanelRadiusPx(
  _options: WorkspaceShellPlatformRadiusOptions,
): number {
  // JGHarness Orca 风格贴边布局：主区/终端/侧栏面板统一直角贴边，由 1px 分割线区分层级。
  return 0;
}

export function resolveWorkspaceShellResizeHandleInsetPx(
  _options: WorkspaceShellPlatformRadiusOptions,
): number {
  return 0;
}

export function resolveWorkspaceShellWindowChromeClass(
  _options: WorkspaceShellWindowChromeOptions,
): string {
  // JGHarness Orca 风格贴边布局：移除浮岛外圆角与四周边框，边界由相邻栏的 1px 分割线承载。
  return "rounded-none border-0";
}
