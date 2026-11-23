/**
 * WelcomeScreen —— API Key 配置入口
 *
 * JGHarness 去官方化（阶段 3）：移除 OAuth 渠道登录，仅保留 API Key 直连与跳过路径。
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DesktopOverlayWindowControls } from "@/DesktopOverlayWindowControls.js";
import { Loader2Icon, LoaderIcon, TriangleAlertIcon } from "lucide-react";
import {
  type OAuthProviderMeta,
  BIGMODEL_PROVIDER_ID,
  ZAI_PROVIDER_ID,
  ZAI_CN_PROVIDER_ID,
} from "@zcode/shared";
import {
  TID_LOGIN_REGION_SWITCH,
  TID_LOGIN_USE_API_KEY_BUTTON,
  TID_OAUTH_CANCEL,
  TID_OAUTH_COPY_LOGIN_LINK,
  TID_OAUTH_ERROR,
  TID_OAUTH_LOGIN_BUTTON,
} from "@zcode/shared/test-ids";
import { Alert, AlertDescription } from "./components/ui/alert.js";
import { Button } from "./components/ui/button.js";
import { ZCodeAboutLogo } from "@/components/ui/ZCodeAboutLogo.js";
import { useZCodeIntl } from "./i18n/IntlProvider.js";
import { LoginApiKeyForm } from "./login/LoginApiKeyForm.js";
import { ThemeHeroVisual } from "./openWorkspacePageThemeHero.js";

interface WelcomeScreenProps {
  onComplete: (reason: LoginCompleteReason) => void | Promise<void>;
}

// JGHarness 去官方化（阶段 3）：登录完成原因收窄为 apiKey / skip，OAuth 渠道已摘除。
export type LoginCompleteReason = "apiKey" | "skip";

/** 登录页区域展示态；真实区域路由等 Z.ai 国内一方登录 provider 就绪后再接入。 */
type SingleLoginRegion = "domestic" | "global";

/** 区域展示态跟随界面语言：英文默认海外，中文默认国内。 */
export function resolveLoginRegionForLocale(locale: string): SingleLoginRegion {
  return locale === "en-US" ? "global" : "domestic";
}

export function WelcomeScreen({ onComplete }: WelcomeScreenProps) {
  const { intl } = useZCodeIntl();
  return (
    <main className="relative h-full min-h-dvh overflow-hidden bg-background text-foreground">
      <ThemeHeroVisual className="absolute inset-0" />
      {/* 原生拖拽命中不受 pointer-events/z-index 约束；拖拽层必须避开窗控，且先于 no-drag 区声明。 */}
      <div className="pointer-events-none absolute left-0 top-0 right-0 z-10 flex h-12 items-center [app-region:drag] platform-windows-desktop:right-[134px] platform-linux-desktop:right-[134px]" />
      <DesktopOverlayWindowControls />
      <section className="relative z-10 w-full flex flex-col gap-10 max-w-sm rounded-2xl border border-popover-border bg-background p-8 text-ui-base/relaxed shadow-md sm:p-10">
        <LoginPanelHeader
          title={intl.formatMessage({ id: "login.title" })}
          description={intl.formatMessage({ id: "login.description" })}
        >
          {null}
        </LoginPanelHeader>
        <div className="space-y-6">
          <LoginApiKeyForm
            onSaved={() => onComplete("apiKey")}
            onSkipped={() => onComplete("skip")}
          />
        </div>
      </section>
    </main>
  );
}

function LoginPanelHeader({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <header className="flex flex-col items-center gap-4 text-center">
      <LoginPanelLogo />
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-ui-xl font-semibold tracking-tight">{title}</h1>
        <p className="text-ui-base/relaxed text-foreground-subtle">{description}</p>
      </div>
      {children}
    </header>
  );
}

function LoginPanelLogo() {
  return (
    // 登录 logo 壳是固定深色底，边框不能跟随浅色主题 token，否则浅色主题下边框过重。
    <div
      className="relative mb-1 flex size-16 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#000000_0%,#151718_100%)] text-[#ffffff] shadow-lg/20 before:pointer-events-none before:absolute before:inset-0 before:rounded-2xl before:border before:border-[rgba(255,255,255,0.1)]"
      aria-label="JGHarness"
      role="img"
    >
      <ZCodeAboutLogo className="h-auto w-10" />
    </div>
  );
}
