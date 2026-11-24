import { useId } from "react";
import type { InputHTMLAttributes, ReactNode, Ref } from "react";
import { cn } from "../../lib/cn";

export type InputSize = "sm" | "md" | "lg";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  /** Input üstünde gösterilecek etiket */
  label?: ReactNode;
  /** Alt kısımda gösterilecek yardımcı açıklama metni */
  hint?: ReactNode;
  /** Hata mesajı. Verilirse input çerçevesi danger rengine döner */
  error?: ReactNode;
  /** Boyut. Button ile uyumludur. Varsayılan: "md" */
  size?: InputSize;
  /** Sol tarafta gösterilecek ikon */
  leftIcon?: ReactNode;
  /** Sağ tarafta gösterilecek ikon */
  rightIcon?: ReactNode;
  /** Bulunduğu alanın tamamını kaplar */
  fullWidth?: boolean;
  ref?: Ref<HTMLInputElement>;
}

const sizeClasses: Record<InputSize, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-3.5 text-sm",
  lg: "h-12 px-4 text-base",
};

export function Input({
  label,
  hint,
  error,
  size = "md",
  leftIcon,
  rightIcon,
  fullWidth = true,
  disabled = false,
  id,
  className,
  ref,
  ...rest
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descriptionId = `${inputId}-desc`;
  const hasError = Boolean(error);

  return (
    <div className={cn("flex flex-col gap-1.5", fullWidth ? "w-full" : "inline-flex")}>
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-fg">
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        {leftIcon && (
          <span className="pointer-events-none absolute left-3 flex items-center text-fg/60 [&_svg]:size-4">
            {leftIcon}
          </span>
        )}

        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          aria-describedby={error || hint ? descriptionId : undefined}
          className={cn(
            "w-full rounded-control border bg-surface/50 text-fg placeholder:text-fg/40 transition-colors",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
            "disabled:cursor-not-allowed disabled:opacity-50",
            hasError
              ? "border-danger focus-visible:outline-danger"
              : "border-border-strong hover:bg-surface/80",
            sizeClasses[size],
            leftIcon && "pl-9",
            rightIcon && "pr-9",
            className,
          )}
          {...rest}
        />

        {rightIcon && (
          <span className="pointer-events-none absolute right-3 flex items-center text-fg/60 [&_svg]:size-4">
            {rightIcon}
          </span>
        )}
      </div>

      {(error || hint) && (
        <p
          id={descriptionId}
          role={hasError ? "alert" : undefined}
          className={cn("text-xs", hasError ? "text-danger" : "text-fg/60")}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
}