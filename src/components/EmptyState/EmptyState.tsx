import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

export type EmptyStateSize = "sm" | "md";
export type EmptyStateTone = "neutral" | "danger";

export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /** ZORUNLU. Ne olduğunu söyleyen kısa başlık (ör. "Henüz proje yok") */
  title: ReactNode;
  /** Neden boş olduğu ve ne yapılabileceği */
  description?: ReactNode;
  /** Başlığın üstünde gösterilecek ikon veya illüstrasyon. Verilmezse varsayılan kutu ikonu çıkar; false ile gizlenir */
  icon?: ReactNode | false;
  /** Ana eylem (genelde bir Button) */
  action?: ReactNode;
  /** İkincil eylem (ör. "Filtreleri temizle", "Dokümana git") */
  secondaryAction?: ReactNode;
  /** "sm": kart/tablo içi, "md": sayfa ortası. Varsayılan: "md" */
  size?: EmptyStateSize;
  /** "danger": içerik bir hata yüzünden yüklenemediyse. Varsayılan: "neutral" */
  tone?: EmptyStateTone;
  /** Başlığın HTML seviyesi; sayfanın başlık sırasını bozmamak için. Varsayılan: "h3" */
  headingLevel?: "h2" | "h3" | "h4";
  /** Kesik çizgili çerçeve içinde gösterir (yükleme alanı / bırakma bölgesi hissi) */
  bordered?: boolean;
}

/** Varsayılan ikon: boş kutu */
export function EmptyBoxIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 8.5 12 4l9 4.5v7L12 20l-9-4.5z" />
      <path d="M3 8.5 12 13l9-4.5M12 13v7" />
    </svg>
  );
}

const sizeClasses: Record<EmptyStateSize, { root: string; icon: string; title: string; description: string }> = {
  sm: { root: "gap-2 px-4 py-6", icon: "size-10 [&_svg]:size-5", title: "text-base", description: "text-sm" },
  md: { root: "gap-3 px-6 py-12", icon: "size-14 [&_svg]:size-7", title: "text-xl", description: "text-sm" },
};

const toneClasses: Record<EmptyStateTone, string> = {
  neutral: "bg-primary-soft text-primary",
  danger: "bg-danger-soft text-danger",
};

/**
 * İçerik olmadığında (liste boş, arama sonuçsuz, veri yüklenemedi) boş ekran yerine gösterilir.
 * Kullanıcıya ne olduğunu ve sonraki adımı söyler.
 */
export function EmptyState({
  title,
  description,
  icon,
  action,
  secondaryAction,
  size = "md",
  tone = "neutral",
  headingLevel: Heading = "h3",
  bordered = false,
  className,
  ...rest
}: EmptyStateProps) {
  const s = sizeClasses[size];
  return (
    <div
      className={cn(
        "flex w-full flex-col items-center text-center",
        s.root,
        bordered && "rounded-card border-2 border-dashed border-border-strong/50",
        className,
      )}
      {...rest}
    >
      {icon !== false && (
        <div className={cn("mb-1 flex shrink-0 items-center justify-center rounded-full", s.icon, toneClasses[tone])}>
          {icon ?? <EmptyBoxIcon />}
        </div>
      )}
      <Heading className={cn("font-display font-semibold text-fg", s.title)}>{title}</Heading>
      {description && <p className={cn("max-w-sm text-fg-muted", s.description)}>{description}</p>}
      {(action || secondaryAction) && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
