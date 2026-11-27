import zaiLogoUrl from "@/assets/provider-icons/logo-zai.svg";
import { cn } from "@/components/lib/utils.js";
import { ZCodeStartupLogoBadge } from "@/root/RootStartupLoading.js";

export function WindowsTopLeftLogo({
  className,
  imageClassName,
}: {
  className?: string;
  imageClassName?: string;
}) {
  return (
    <div
      className={cn(
        // 贴边顶栏统一为 h-10（40px），与主窗口左上角控制组基线对齐。
        "absolute left-0 top-0 z-20 flex h-10 items-center px-3 [app-region:drag]",
        className,
      )}
    >
      <img
        src={zaiLogoUrl}
        alt="JGHarness"
        className={cn("pointer-events-none size-5 select-none", imageClassName)}
        draggable={false}
      />
    </div>
  );
}
