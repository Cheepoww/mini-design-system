import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";
import { Spinner } from "../Button/Button";

/* ---------- Skeleton ---------- */

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** Genişlik (ör. "60%", 120). Varsayılan: "100%" */
  width?: CSSProperties["width"];
  /** Yükseklik (ör. 16, "2rem"). Varsayılan: "0.875rem" (bir satır metin) */
  height?: CSSProperties["height"];
  /** Daire (avatar) biçimi */
  circle?: boolean;
}

/**
 * Yüklenecek içeriğin yerini tutan gri kutu. Tek başına ekran okuyucuya bir şey söylemez;
 * duyuru için LoadingState içinde kullan veya sarmalayana role="status" ver.
 */
export function Skeleton({ width = "100%", height = "0.875rem", circle = false, className, style, ...rest }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      data-skeleton
      className={cn("shrink-0 animate-pulse bg-fg/10", circle ? "rounded-full" : "rounded-md", className)}
      style={{ width, height: circle ? width : height, ...style }}
      {...rest}
    />
  );
}

/* ---------- LoadingState ---------- */

export type LoadingStateVariant = "spinner" | "skeleton" | "overlay";
export type LoadingStateSize = "sm" | "md" | "lg";

export interface LoadingStateProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /**
   * - "spinner": ortada dönen gösterge + metin (sayfa/kart yükleniyor)
   * - "skeleton": içeriğin iskeleti (liste, kart, tablo satırları)
   * - "overlay": mevcut içeriğin (children) üstüne yarı saydam perde + spinner (ör. kaydederken)
   * Varsayılan: "spinner"
   */
  variant?: LoadingStateVariant;
  /** Ekran okuyucuya ve (spinner/overlay'de) ekrana yazılan metin. Varsayılan: "Yükleniyor…" */
  label?: string;
  /** Metni ekranda gizler, yalnızca ekran okuyucu duyar */
  hideLabel?: boolean;
  /** Spinner boyutu. Varsayılan: "md" */
  size?: LoadingStateSize;
  /** skeleton: kaç satır. Varsayılan: 3 */
  lines?: number;
  /** skeleton: başta avatar dairesi göster */
  avatar?: boolean;
  /** overlay: perde ne zaman görünsün. Varsayılan: true */
  loading?: boolean;
  /** overlay: üstüne perde inecek içerik */
  children?: ReactNode;
}

/* "!": Spinner kendi size-4 sınıfını taşıyor; hangisinin kazanacağı CSS sırasına kalmasın */
const spinnerSize: Record<LoadingStateSize, string> = {
  sm: "size-4!",
  md: "size-6!",
  lg: "size-10!",
};

/** Son satır kısa olsun ki gerçek paragraf gibi dursun */
const lineWidths = ["100%", "92%", "96%", "88%", "60%"];

function SrOnly({ children }: { children: ReactNode }) {
  return <span className="sr-only">{children}</span>;
}

/**
 * Veri beklenirken gösterilen durum. role="status" ile ekran okuyucuya kibarca duyurulur;
 * içerik gelince bileşeni kaldırmak yeterli.
 */
export function LoadingState({
  variant = "spinner",
  label = "Yükleniyor…",
  hideLabel = false,
  size = "md",
  lines = 3,
  avatar = false,
  loading = true,
  children,
  className,
  ...rest
}: LoadingStateProps) {
  if (variant === "overlay") {
    return (
      <div className={cn("relative", className)} aria-busy={loading || undefined} {...rest}>
        {/* Yüklenirken altta kalan içerikle etkileşim olmasın */}
        <div inert={loading || undefined}>{children}</div>
        {loading && (
          <div
            role="status"
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-[inherit] bg-surface/70 text-sm text-fg-muted"
          >
            <Spinner className={cn("text-primary", spinnerSize[size])} />
            {hideLabel ? <SrOnly>{label}</SrOnly> : <span>{label}</span>}
          </div>
        )}
      </div>
    );
  }

  if (variant === "skeleton") {
    const count = Math.max(1, lines);
    return (
      <div role="status" aria-busy="true" className={cn("flex w-full gap-3", className)} {...rest}>
        <SrOnly>{label}</SrOnly>
        {avatar && <Skeleton circle width="2.5rem" />}
        <div className="flex min-w-0 flex-1 flex-col gap-2.5 pt-0.5">
          {Array.from({ length: count }, (_, i) => (
            <Skeleton key={i} width={i === count - 1 && count > 1 ? "60%" : lineWidths[i % (lineWidths.length - 1)]} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-busy="true"
      className={cn("flex flex-col items-center justify-center gap-3 p-6 text-sm text-fg-muted", className)}
      {...rest}
    >
      <Spinner className={cn("text-primary", spinnerSize[size])} />
      {hideLabel ? <SrOnly>{label}</SrOnly> : <span>{label}</span>}
    </div>
  );
}
