import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

type BaseButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
  compact?: boolean;
  wide?: boolean;
  loading?: boolean;
};

type IconButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "aria-label" | "children"
> & {
  "aria-label": string;
  children: ReactNode;
};

function joinClassNames(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}

function variantClass(variant: ButtonVariant): string {
  if (variant === "danger") return "industrial-danger-button";
  if (variant === "secondary") return "industrial-secondary-button";
  if (variant === "ghost") return "industrial-ghost-button";
  return "industrial-button";
}

export const IndustrialButton = forwardRef<HTMLButtonElement, BaseButtonProps>(
  function IndustrialButton(
    {
      children,
      variant = "primary",
      compact = false,
      wide = false,
      loading = false,
      className,
      disabled,
      type = "button",
      "aria-busy": ariaBusy,
      ...buttonProps
    },
    ref,
  ) {
    return (
      <button
        {...buttonProps}
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading ? "true" : ariaBusy}
        className={joinClassNames(
          variantClass(variant),
          compact && "compact",
          wide && "w-full",
          loading && "industrial-button-loading",
          className,
        )}
      >
        {loading ? <span className="industrial-button-spinner" aria-hidden="true" /> : null}
        {children}
      </button>
    );
  },
);

export const ToolbarButton = forwardRef<
  HTMLButtonElement,
  Omit<BaseButtonProps, "variant">
>(function ToolbarButton(props, ref) {
  return <IndustrialButton {...props} ref={ref} variant="secondary" compact />;
});

export const DangerButton = forwardRef<
  HTMLButtonElement,
  Omit<BaseButtonProps, "variant">
>(function DangerButton(props, ref) {
  return <IndustrialButton {...props} ref={ref} variant="danger" />;
});

export const GhostButton = forwardRef<
  HTMLButtonElement,
  Omit<BaseButtonProps, "variant">
>(function GhostButton(props, ref) {
  return <IndustrialButton {...props} ref={ref} variant="ghost" />;
});

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton({ children, className, type = "button", ...buttonProps }, ref) {
    return (
      <button
        {...buttonProps}
        ref={ref}
        type={type}
        className={joinClassNames("industrial-icon-button", className)}
      >
        {children}
      </button>
    );
  },
);

export function ButtonGroup({
  children,
  className,
  ariaLabel,
}: {
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div className={joinClassNames("industrial-button-group", className)} aria-label={ariaLabel}>
      {children}
    </div>
  );
}
