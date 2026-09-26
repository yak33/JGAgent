import { cn } from "@/components/lib/utils.js";
import { LOCAL_PROFILE_COLOR_PALETTE } from "@/hooks/useLocalProfile.js";

/** 本地身份首字头像：名字首字符 + 色板背景，随改名实时变化（spec：docs/specs/local-profile.md）。 */
export function LocalProfileAvatar({
  name,
  colorIndex,
  className,
}: {
  name: string;
  colorIndex: number;
  className?: string;
}) {
  const backgroundColor =
    LOCAL_PROFILE_COLOR_PALETTE[colorIndex] ?? LOCAL_PROFILE_COLOR_PALETTE[0];
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-5 shrink-0 select-none items-center justify-center rounded-full text-ui-sm font-bold text-white",
        className,
      )}
      style={{ backgroundColor }}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
