import type { HTMLAttributes, ReactNode, Ref } from "react";
import { cn } from "../../lib/cn";

export type BadgeTone = "neutral" | "primary" | "success" | "warning" | "danger" | "info";
export type BadgeVariant = "soft" | "solid" | "outline";
export type BadgeSize = "sm" | "md";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** Anlam rengi. Varsayılan: "neutral" */
  tone?: BadgeTone;
  /** Dolgu stili: açık zemin, dolu zemin veya yalnızca çerçeve. Varsayılan: "soft" */
  variant?: BadgeVariant;
  /** Boyut. Varsayılan: "md" */
  size?: BadgeSize;
  /** Metnin solunda küçük bir durum noktası gösterir (ör. "● Çevrimiçi") */
  dot?: boolean;
  /** Metnin solunda gösterilecek ikon (dot ile birlikte verilirse ikon kazanır) */
  icon?: ReactNode;
  /** Verilirse sağda × butonu çıkar; filtre etiketleri gibi kaldırılabilir rozetler için */
  onRemove?: () => void;
  /** × butonunun ekran okuyucu adı. Varsayılan: "Kaldır" */
  removeLabel?: string;
  ref?: Ref<HTMLSpanElement>;
}

/*
  Renk eşlemesi: tüm renkler tokens.css'teki anlam renklerinden gelir; açık/koyu tema otomatik.
  soft    : *-soft zemin + tonun kendisi yazı (token dosyasında 4.5:1 ölçülmüş çift)
  solid   : dolu zemin + on-* yazı
  outline : saydam zemin + ton rengi çerçeve ve yazı
*/
const toneClasses: Record<BadgeTone, Record<BadgeVariant, string>> = {
  neutral: {
    soft: "bg-surface-muted text-fg",
    solid: "bg-fg text-surface",
    outline: "border-border-strong text-fg",
  },
  primary: {
    soft: "bg-primary-soft text-primary",
    solid: "bg-primary text-on-primary",
    outline: "border-primary text-primary",
  },
  success: {
    soft: "bg-success-soft text-success",
    solid: "bg-success text-on-success",
    outline: "border-success text-success",
  },
  warning: {
    soft: "bg-warning-soft text-warning",
    solid: "bg-warning text-on-warning",
    outline: "border-warning text-warning",
  },
  danger: {
    soft: "bg-danger-soft text-danger",
    solid: "bg-danger text-on-danger",
    outline: "border-danger text-danger",
  },
  info: {
    soft: "bg-info-soft text-info",
    solid: "bg-info text-on-info",
    outline: "border-info text-info",
  },
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: "h-5 px-2 text-xs gap-1 [&_svg]:size-3",
  md: "h-6 px-2.5 text-xs gap-1.5 [&_svg]:size-3.5",
};

/** Kısa durum, kategori veya sayı etiketi. Etkileşimsizdir; yalnızca onRemove verilirse içinde buton olur. */
export function Badge({
  tone = "neutral",
  variant = "soft",
  size = "md",
  dot = false,
  icon,
  onRemove,
  removeLabel = "Kaldır",
  className,
  children,
  ref,
  ...rest
}: BadgeProps) {
  return (
    <span
      ref={ref}
      className={cn(
        "inline-flex max-w-full shrink-0 items-center rounded-full border border-transparent font-medium whitespace-nowrap",
        toneClasses[tone][variant],
        sizeClasses[size],
        onRemove && "pr-1",
        className,
      )}
      {...rest}
    >
      {icon ?? (dot && <span data-badge-dot className="size-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />)}
      <span className="truncate">{children}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={typeof children === "string" ? `${removeLabel}: ${children}` : removeLabel}
          className="-my-0.5 inline-flex size-4 items-center justify-center rounded-full opacity-70 transition-opacity hover:bg-current/15 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-current"
        >
          <svg viewBox="0 0 24 24" className="size-3!" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      )}
    </span>
  );
}
