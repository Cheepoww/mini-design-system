import { useId } from "react";
import type { ReactNode, Ref, SelectHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

export type SelectSize = "sm" | "md" | "lg";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  /** Select üstünde gösterilecek etiket */
  label?: ReactNode;
  /** Seçenek listesi */
  options: SelectOption[];
  /** Seçim yapılmadan önce görünecek metin */
  placeholder?: string;
  /** Alt kısımda gösterilecek yardımcı açıklama metni */
  hint?: ReactNode;
  /** Hata mesajı */
  error?: ReactNode;
  /** Boyut. Varsayılan: "md" */
  size?: SelectSize;
  /** Bulunduğu alanın tamamını kaplar */
  fullWidth?: boolean;
  ref?: Ref<HTMLSelectElement>;
}

const sizeClasses: Record<SelectSize, string> = {
  sm: "h-8 pl-3 pr-8 text-sm",
  md: "h-10 pl-3.5 pr-9 text-sm",
  lg: "h-12 pl-4 pr-10 text-base",
};

export function Select({
  label,
  options,
  placeholder = "Seçim yapınız...",
  hint,
  error,
  size = "md",
  fullWidth = true,
  disabled = false,
  id,
  className,
  ref,
  ...rest
}: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const descriptionId = `${selectId}-desc`;
  const hasError = Boolean(error);

  return (
    <div className={cn("flex flex-col gap-1.5", fullWidth ? "w-full" : "inline-flex")}>
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-fg">
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          aria-describedby={error || hint ? descriptionId : undefined}
          className={cn(
            "w-full appearance-none rounded-control border bg-surface/50 text-fg transition-colors",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
            "disabled:cursor-not-allowed disabled:opacity-50",
            hasError
              ? "border-danger focus-visible:outline-danger"
              : "border-border-strong hover:bg-surface/80",
            sizeClasses[size],
            className,
          )}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Sağ taraftaki açılır ok ikonu */}
        <svg
          className="pointer-events-none absolute right-3 size-4 text-fg/60"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
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