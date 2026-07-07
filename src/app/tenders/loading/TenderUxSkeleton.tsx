import type { ComponentProps } from "react";
import { Skeleton } from "@/app/components/ui/skeleton";
import { cn } from "@/app/components/ui/utils";

/** TEUX-5 — spójne tokeny skeleton (DF §2.8) bez edycji tender-ux-tokens.ts */
export const TEUX5_SKELETON = {
  surface: "bg-secondary/60",
  radius: "rounded-md",
  radiusLg: "rounded-xl",
  gap: "gap-2",
  gapSm: "gap-1.5",
  gapSection: "gap-3",
  rowH: "h-4",
  rowSm: "h-3",
  titleH: "h-[18px]",
  badgeH: "h-5",
  inputH: "h-11",
  chipH: "h-7",
} as const;

export function TenderUxSkeleton({
  className,
  ...props
}: ComponentProps<typeof Skeleton>) {
  return (
    <Skeleton
      className={cn(TEUX5_SKELETON.surface, TEUX5_SKELETON.radius, className)}
      {...props}
    />
  );
}
