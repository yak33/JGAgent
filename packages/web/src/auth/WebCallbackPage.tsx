import { Button } from "@zcode/ui";

// JGAgent 去官方化（阶段 3）：OAuth 登录服务域删除后，/share/callback 不再执行
// token 交换；页面保留渲染，统一提示登录不可用，仅提供返回入口。
interface WebCallbackPageProps {
  onBack: () => void;
}

export function WebCallbackPage({ onBack }: WebCallbackPageProps) {
  const isChinese = /^zh\b/i.test(navigator.language);
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-8 text-foreground">
      <section className="w-full max-w-sm rounded-lg border border-card-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-destructive text-ui-xs font-medium text-destructive-foreground">
          !
        </div>
        <h1 className="text-ui-lg font-medium text-foreground">
          {isChinese ? "登录不可用" : "Sign-in unavailable"}
        </h1>
        <p className="mt-2 text-ui-xs leading-6 text-foreground-subtle">
          {isChinese
            ? "JGAgent 已移除账号登录体系，此回调页面不再可用。"
            : "Account sign-in was removed in JGAgent; this callback page is no longer available."}
        </p>
        <Button
          type="button"
          size="lg"
          className="mt-5 w-full"
          onClick={() => onBack()}
        >
          {isChinese ? "返回首页" : "Back to home"}
        </Button>
      </section>
    </main>
  );
}
