import {
  forwardRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "@/app/components/ui/utils";
import {
  WG_CARD_LOGIN,
  WG_DURATION_ENTER,
  WG_GLASS_CARD,
  WG_GLASS_PICK,
  WG_PAD_CARD_LG,
  WG_PAD_PICK,
  WG_RADIUS_2XL,
  WG_RADIUS_LG,
  WG_RADIUS_MD,
  WG_SPACE_CARD,
} from "@/lib/wg-ui-tokens";

export type WgCardElevation = "flat" | "soft" | "glass";
export type WgCardPadding = "sm" | "md" | "lg" | "pick";
export type WgCardRadius = "md" | "lg" | "xl" | "2xl";

type Base = {
  elevation?: WgCardElevation;
  padding?: WgCardPadding;
  radius?: WgCardRadius;
  /** Login form card preset — pixel parity with v2.65.46 */
  preset?: "login" | "pick" | "none";
  className?: string;
  children?: ReactNode;
};

export type WgCardDivProps = Base &
  Omit<HTMLAttributes<HTMLDivElement>, "className"> & { as?: "div" };

export type WgCardButtonProps = Base &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> & { as: "button" };

export type WgCardProps = WgCardDivProps | WgCardButtonProps;

const radiusMap: Record<WgCardRadius, string> = {
  md: WG_RADIUS_MD,
  lg: WG_RADIUS_LG,
  xl: "rounded-[20px]",
  "2xl": WG_RADIUS_2XL,
};

const padMap: Record<WgCardPadding, string> = {
  sm: "p-4",
  md: "p-5",
  lg: WG_PAD_CARD_LG,
  pick: WG_PAD_PICK,
};

function surfaceClasses(props: Base): string {
  if (props.preset === "login") return WG_CARD_LOGIN;
  if (props.preset === "pick") {
    return cn(
      WG_GLASS_PICK,
      WG_RADIUS_2XL,
      WG_PAD_PICK,
      "w-full text-left",
      `transition-all ${WG_DURATION_ENTER}`,
      "hover:bg-card/90 hover:scale-[1.02] active:scale-[0.99]",
      "motion-reduce:hover:scale-100 motion-reduce:active:scale-100",
      "shadow-[0_4px_24px_rgba(0,0,0,0.04)]",
    );
  }

  const elevation = props.elevation ?? "flat";
  const radius = props.radius ?? "md";
  const padding = props.padding ?? "md";

  const elev =
    elevation === "glass"
      ? WG_GLASS_CARD
      : elevation === "soft"
        ? "bg-card border border-border/60 shadow-[0_4px_24px_rgba(0,0,0,0.04)]"
        : "bg-card border border-border/60";

  return cn(elev, radiusMap[radius], padMap[padding], elevation === "glass" && WG_SPACE_CARD);
}

/**
 * GLOBAL-DESIGN-SYSTEM-01 — WgCard (S0).
 * Glass only when elevation=glass / preset login|pick (DS-04).
 */
export const WgCard = forwardRef<HTMLDivElement | HTMLButtonElement, WgCardProps>(
  function WgCard(props, ref) {
    const { as = "div", className, children, preset, elevation, padding, radius, ...rest } = props;
    const surface = surfaceClasses({ preset, elevation, padding, radius });

    if (as === "button") {
      const btnRest = rest as Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className">;
      return (
        <button
          ref={ref as React.Ref<HTMLButtonElement>}
          type={btnRest.type ?? "button"}
          className={cn(surface, className)}
          {...btnRest}
        >
          {children}
        </button>
      );
    }

    const divRest = rest as Omit<HTMLAttributes<HTMLDivElement>, "className">;
    return (
      <div ref={ref as React.Ref<HTMLDivElement>} className={cn(surface, className)} {...divRest}>
        {children}
      </div>
    );
  },
);
