import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/app/components/ui/utils";
import { WG_CONTROL_SURFACE, WG_SPACE_FIELD, WG_TYPE_LABEL } from "@/lib/wg-ui-tokens";

type Control = "input" | "select" | "textarea" | "password";

type Common = {
  label?: string;
  error?: string;
  hint?: string;
  className?: string;
  controlClassName?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
};

export type WgFieldInputProps = Common & {
  control?: "input" | "password";
} & Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "size">;

export type WgFieldSelectProps = Common & {
  control: "select";
  children?: ReactNode;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "className" | "size" | "children">;

export type WgFieldTextareaProps = Common & {
  control: "textarea";
} & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className">;

export type WgFieldProps = WgFieldInputProps | WgFieldSelectProps | WgFieldTextareaProps;

function FieldShell({
  label,
  htmlFor,
  error,
  hint,
  className,
  children,
}: {
  label?: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn(WG_SPACE_FIELD, className)}>
      {label ? (
        <label htmlFor={htmlFor} className={WG_TYPE_LABEL}>
          {label}
        </label>
      ) : null}
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {hint && !error ? (
        <p className="text-[10px] text-muted-foreground leading-relaxed">{hint}</p>
      ) : null}
    </div>
  );
}

/**
 * GLOBAL-DESIGN-SYSTEM-01 — WgField (S0).
 * Login control parity: h-14 · text-base · rounded-2xl · focus ring.
 * MAINT-01A: label ↔ control via htmlFor / id (useId when caller omits id).
 */
export const WgField = forwardRef<
  HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
  WgFieldProps
>(function WgField(props, ref) {
  const autoId = useId();
  const control: Control = props.control ?? "input";
  const { label, error, hint, className, controlClassName, leading, trailing } = props;
  const callerId =
    "id" in props && props.id != null && props.id !== ""
      ? String(props.id)
      : undefined;
  const controlId = callerId ?? (label ? autoId : undefined);

  if (control === "select") {
    const p = props as WgFieldSelectProps;
    const {
      control: _c,
      label: _l,
      error: _e,
      hint: _h,
      className: _cl,
      controlClassName: _cc,
      leading: lead,
      trailing: trail,
      children,
      id: _id,
      ...sel
    } = p;
    return (
      <FieldShell label={label} htmlFor={controlId} error={error} hint={hint} className={className}>
        <div className="relative">
          {lead}
          <select
            ref={ref as Ref<HTMLSelectElement>}
            className={cn(WG_CONTROL_SURFACE, lead && "pl-11", "appearance-none", controlClassName)}
            {...sel}
            id={controlId}
          >
            {children}
          </select>
          {trail}
        </div>
      </FieldShell>
    );
  }

  if (control === "textarea") {
    const p = props as WgFieldTextareaProps;
    const {
      control: _c,
      label: _l,
      error: _e,
      hint: _h,
      className: _cl,
      controlClassName: _cc,
      leading: lead,
      trailing: trail,
      id: _id,
      ...ta
    } = p;
    return (
      <FieldShell label={label} htmlFor={controlId} error={error} hint={hint} className={className}>
        <div className="relative">
          {lead}
          <textarea
            ref={ref as Ref<HTMLTextAreaElement>}
            className={cn(WG_CONTROL_SURFACE, "h-auto min-h-[7rem] py-3", lead && "pl-11", controlClassName)}
            {...ta}
            id={controlId}
          />
          {trail}
        </div>
      </FieldShell>
    );
  }

  const p = props as WgFieldInputProps;
  const {
    control: _c,
    label: _l,
    error: _e,
    hint: _h,
    className: _cl,
    controlClassName: _cc,
    leading: lead,
    trailing: trail,
    type,
    id: _id,
    ...inp
  } = p;

  const inputType = type ?? (control === "password" ? "password" : "text");

  return (
    <FieldShell label={label} htmlFor={controlId} error={error} hint={hint} className={className}>
      <div className="relative">
        {lead}
        <input
          ref={ref as Ref<HTMLInputElement>}
          type={inputType}
          className={cn(WG_CONTROL_SURFACE, lead && "pl-11", trail && "pr-12", controlClassName)}
          {...inp}
          id={controlId}
        />
        {trail}
      </div>
    </FieldShell>
  );
});
