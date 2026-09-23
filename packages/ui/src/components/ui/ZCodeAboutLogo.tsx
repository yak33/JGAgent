import { cn } from "@/components/lib/utils.js";

export function ZCodeAboutLogo({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="118" height="100" viewBox="0 0 256 218" className={cn("shrink-0 text-current", className)} aria-hidden="true" focusable="false">
      {/* JGAgent 去官方化：Z 闪电标替换为 JG 斜体字标 */}
      <text x="128" y="118" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="120" font-weight="800" font-style="italic" fill="currentColor">JG</text>
    </svg>
  );
}

export function ZCodeWordmarkLogo({ className }: { className?: string }) {
  return (
    <svg width="244" height="54" viewBox="0 0 244 54" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn("shrink-0 text-current", className)} aria-hidden="true" focusable="false">
      {/* JGAgent 去官方化：字标替换为 JGAgent */}
      <text x="122" y="40" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="34" font-weight="800" font-style="italic" letter-spacing="2" fill="currentColor">JGAgent</text>
    </svg>
  );
}
