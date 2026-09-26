/* oxlint-disable eslint(max-lines) -- footer 聚合主题、模式和快捷键菜单。 */
import type { Locale } from "@zcode/shared";
import { memo, useCallback, useEffect, useState } from "react";
import { DesktopCommandIds, TID_TASK_SETTINGS_BUTTON } from "@zcode/shared";
import { ControlHintTooltip } from "@/ControlHintTooltip.js";
import { cn } from "@/components/lib/utils.js";
import { Button } from "@/components/ui/button.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.js";
import {
  Dices,
  KeyRound,
  PencilRuler,
  Globe,
  Maximize,
  Palette,
  Settings,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Input } from "@/components/ui/input.js";
import { usePlatform } from "@/hooks/usePlatform.js";
import { useLocalProfile, LOCAL_PROFILE_COLOR_PALETTE } from "@/hooks/useLocalProfile.js";
import {
  normalizeLocalProfileName,
  LOCAL_PROFILE_NAME_MAX_LENGTH,
} from "@/lib/randomUsername.js";
import { useZCodeIntl } from "@/i18n/IntlProvider.js";
import { useShortcutCommandLabel } from "@/shortcuts/useShortcutBindings.js";
import { useZCodeStore } from "@/store/StoreProvider.js";
import { normalizeInterfaceMode } from "@/lib/interfaceMode.js";
import type { Theme } from "@/useTheme.js";
import { LocalProfileAvatar } from "@/LocalProfileAvatar.js";

const DESKTOP_ZOOM_MIN_LEVEL = -3;
const DESKTOP_ZOOM_MAX_LEVEL = 5;

export const WorkspaceSidebarFooter = memo(function WorkspaceSidebarFooterComponent({
  theme,
  localeMenuValue,
  onLocaleChange,
  onThemeChange,
  onSettingsButtonClick,
  onProviderSettingsClick,
  settingsButtonMode = "settings",
  workspacePath,
  workspaceIdentity,
  workspaceRemoteSessionId,
  activeTaskId,
  isDesktop = false,
  className,
}: {
  theme: Theme;
  localeMenuValue: Locale | "system";
  onLocaleChange: (value: string) => void;
  onThemeChange: (value: string) => void;
  onSettingsButtonClick?: () => void;
  /** JGAgent：直达设置-模型供应商分区（更换 API Key / 供应商）。 */
  onProviderSettingsClick?: () => void;
  settingsButtonMode?: "settings" | "back";
  workspacePath?: string;
  workspaceIdentity?: string;
  workspaceRemoteSessionId?: string;
  activeTaskId?: string | null;
  isDesktop?: boolean;
  className?: string;
}) {
  // JGAgent 去官方化（阶段 3）：账号体系摘除后，footer 头像/套餐徽标/用量/登录登出
  // 整体移除，原「头像菜单」改为「JGAgent 偏好菜单」，语言/主题/界面模式/缩放保留。
  // JGAgent 本地身份（2026-09-26）：左下角改为本地头像+用户名，菜单顶部加个性化区块（docs/specs/local-profile.md）。
  // workspace* / activeTaskId 等 props 为公共调用签名保留（父组件仍在传递，后续批次统一清理）。
  const { intl } = useZCodeIntl();
  const { profile, setName, setColorIndex, rollName } = useLocalProfile();
  const [nameDraft, setNameDraft] = useState(profile.name);
  useEffect(() => {
    setNameDraft(profile.name);
  }, [profile.name]);
  const commitNameDraft = () => {
    if (!normalizeLocalProfileName(nameDraft)) {
      setNameDraft(profile.name);
      return;
    }
    setName(nameDraft);
  };
  const platform = usePlatform();
  const interfaceMode = useZCodeStore((state) => state.interfaceMode);
  const setInterfaceMode = useZCodeStore((state) => state.setInterfaceMode);
  const zoomInShortcutLabel = useShortcutCommandLabel("zoomIn");
  const zoomOutShortcutLabel = useShortcutCommandLabel("zoomOut");
  const resetZoomShortcutLabel = useShortcutCommandLabel("resetZoom");
  const settingsButtonLabel =
    settingsButtonMode === "back"
      ? intl.formatMessage({ id: "workspace.backToWorkspace" })
      : intl.formatMessage({ id: "settings.title" });
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [desktopZoomLevel, setDesktopZoomLevel] = useState(0);
  const runDesktopZoomCommand = useCallback(
    (command: (typeof DesktopCommandIds)["ZoomIn" | "ZoomOut" | "ResetZoom"]) => {
      void platform.executeDesktopCommand(command);
    },
    [platform],
  );

  useEffect(() => {
    if (!isDesktop) {
      setDesktopZoomLevel(0);
      return;
    }

    let isCancelled = false;
    void platform.getDesktopZoomLevel?.().then((state) => {
      if (!isCancelled && Number.isFinite(state.zoomLevel)) {
        setDesktopZoomLevel(state.zoomLevel);
      }
    });

    const dispose = platform.onDesktopZoomLevelChanged?.((state) => {
      if (Number.isFinite(state.zoomLevel)) {
        setDesktopZoomLevel(state.zoomLevel);
      }
    });

    return () => {
      isCancelled = true;
      dispose?.();
    };
  }, [isDesktop, platform]);

  const canResetDesktopZoom = desktopZoomLevel !== 0;
  const canZoomIn = desktopZoomLevel < DESKTOP_ZOOM_MAX_LEVEL;
  const canZoomOut = desktopZoomLevel > DESKTOP_ZOOM_MIN_LEVEL;

  return (
    // footer 被 Settings 复用，页面专属边距由调用方传入，避免修改共享默认样式。
    <footer className={cn("flex shrink-0 flex-col gap-2.5 px-4 pt-2 pb-4", className)}>
      <div className="flex min-w-0 gap-2">
        <DropdownMenu open={profileMenuOpen} onOpenChange={setProfileMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size={"lg"}
              className="min-w-0 flex-1 justify-start gap-1.5 overflow-hidden rounded-tl-2xl rounded-bl-2xl border-0 pl-0"
              aria-label={profile.name}
            >
              <LocalProfileAvatar name={profile.name} colorIndex={profile.colorIndex} />
              <span className="min-w-0 truncate text-ui-base font-semibold text-foreground">
                {profile.name}
              </span>
            </Button>
          </DropdownMenuTrigger>
          {/* 菜单内容保持挂载，避免每次点击菜单都重建 footer 内部状态。*/}
          <DropdownMenuContent align="start" className="w-max min-w-50" forceMount>
            {/* 个性化区块：输入与色点需要键盘输入/点击，stopPropagation 避免 Dropdown 导航抢键（与空态菜单内嵌搜索框同款模式）。 */}
            <div
              data-slot="local-profile-editor"
              className="flex w-64 flex-col gap-2 px-2 py-1.5"
              onKeyDown={(event) => event.stopPropagation()}
            >
              <span className="text-ui-sm font-medium text-foreground-subtle">
                {intl.formatMessage({ id: "settings.profile.sectionTitle" })}
              </span>
              <div className="flex items-center gap-1.5" role="group" aria-label={intl.formatMessage({ id: "settings.profile.colorLabel" })}>
                {LOCAL_PROFILE_COLOR_PALETTE.map((color, index) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={`${intl.formatMessage({ id: "settings.profile.colorLabel" })} ${index + 1}`}
                    aria-pressed={profile.colorIndex === index}
                    className={cn(
                      "size-4 rounded-full outline-hidden transition-transform hover:scale-110",
                      profile.colorIndex === index &&
                        "ring-2 ring-foreground/50 ring-offset-2 ring-offset-background",
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setColorIndex(index)}
                  />
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                <Input
                  value={nameDraft}
                  maxLength={LOCAL_PROFILE_NAME_MAX_LENGTH}
                  aria-label={intl.formatMessage({ id: "settings.profile.nameLabel" })}
                  className="h-8 text-ui-base"
                  onChange={(event) => setNameDraft(event.target.value)}
                  onBlur={commitNameDraft}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      commitNameDraft();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={intl.formatMessage({ id: "settings.profile.rollName" })}
                  onClick={() => setNameDraft(rollName())}
                >
                  <Dices className="size-4" />
                </Button>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Globe className="size-4" />
                {intl.formatMessage({ id: "settings.locale" })}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-48">
                <DropdownMenuRadioGroup value={localeMenuValue} onValueChange={onLocaleChange}>
                  <DropdownMenuRadioItem value="system">
                    {intl.formatMessage({
                      id: "sidebar.settings.systemDefault",
                    })}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="en-US">
                    {intl.formatMessage({
                      id: "sidebar.settings.locale.en-US",
                    })}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="zh-CN">
                    {intl.formatMessage({
                      id: "sidebar.settings.locale.zh-CN",
                    })}
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Palette className="size-4" />
                {intl.formatMessage({ id: "settings.themeMode" })}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-48">
                <DropdownMenuRadioGroup value={theme} onValueChange={onThemeChange}>
                  <DropdownMenuRadioItem value="system">
                    {intl.formatMessage({
                      id: "sidebar.settings.systemDefault",
                    })}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="zai-dark">
                    {intl.formatMessage({
                      id: "sidebar.settings.theme.zai-dark",
                    })}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="zai-light">
                    {intl.formatMessage({
                      id: "sidebar.settings.theme.zai-light",
                    })}
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <PencilRuler className="size-4" />
                {intl.formatMessage({ id: "settings.interfaceMode" })}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-48">
                <DropdownMenuRadioGroup
                  value={interfaceMode}
                  onValueChange={(value) => setInterfaceMode(normalizeInterfaceMode(value))}
                >
                  <DropdownMenuRadioItem value="coding">
                    {intl.formatMessage({ id: "settings.interfaceMode.coding" })}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="office">
                    {intl.formatMessage({ id: "settings.interfaceMode.office" })}
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            {/* 快捷键设置：缩放子菜单 label 读生效表，设置页改绑后即时跟随 */}
            {isDesktop ? (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <ZoomIn className="size-4" />
                  {intl.formatMessage({ id: "sidebar.settings.interfaceZoom" })}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-50">
                  <DropdownMenuItem
                    disabled={!canZoomIn}
                    onSelect={() => runDesktopZoomCommand(DesktopCommandIds.ZoomIn)}
                  >
                    <ZoomIn className="size-4" />
                    {intl.formatMessage({ id: "titleBar.menu.view.zoomIn" })}
                    <DropdownMenuShortcut>{zoomInShortcutLabel}</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={!canZoomOut}
                    onSelect={() => runDesktopZoomCommand(DesktopCommandIds.ZoomOut)}
                  >
                    <ZoomOut className="size-4" />
                    {intl.formatMessage({ id: "titleBar.menu.view.zoomOut" })}
                    <DropdownMenuShortcut>{zoomOutShortcutLabel}</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={!canResetDesktopZoom}
                    onSelect={() => runDesktopZoomCommand(DesktopCommandIds.ResetZoom)}
                  >
                    <Maximize className="size-4" />
                    {intl.formatMessage({ id: "titleBar.menu.view.actualSize" })}
                    <DropdownMenuShortcut>{resetZoomShortcutLabel}</DropdownMenuShortcut>
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            ) : null}
            {onProviderSettingsClick ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={onProviderSettingsClick}>
                  <KeyRound className="size-4" />
                  供应商设置
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="flex shrink-0 items-center gap-1.5">
          <ControlHintTooltip title={settingsButtonLabel}>
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              data-testid={TID_TASK_SETTINGS_BUTTON}
              aria-label={settingsButtonLabel}
              disabled={!onSettingsButtonClick}
              onClick={onSettingsButtonClick}
            >
              <Settings className="size-4" />
            </Button>
          </ControlHintTooltip>
        </div>
      </div>
    </footer>
  );
});
