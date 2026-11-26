import { useEffect, useId } from "react";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { IconButton } from "../Button/Button";

export type ModalSize = "sm" | "md" | "lg";

export interface ModalProps {
  /** Modal açık mı? */
  open: boolean;
  /** Kapatma tetiklendiğinde çalışır (ESC, arka plan tıklaması veya çarpı butonu) */
  onClose: () => void;
  /** Üst kısımda gösterilecek başlık */
  title?: ReactNode;
  /** Başlığın hemen altında gösterilecek kısa açıklama */
  description?: ReactNode;
  /** Pencere genişliği. Varsayılan: "md" */
  size?: ModalSize;
  /** Arka plana tıklandığında kapanmasını sağlar. Varsayılan: true */
  closeOnBackdropClick?: boolean;
  /** Alt kısımda gösterilecek aksiyon butonları alanı */
  footer?: ReactNode;
  /** Modal içeriği */
  children: ReactNode;
  className?: string;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
};

export function Modal({
  open,
  onClose,
  title,
  description,
  size = "md",
  closeOnBackdropClick = true,
  footer,
  children,
  className,
}: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();

  // ESC tuşu ile kapatma ve arka plan kaydırmasını kilitleme
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
      onClick={() => {
        if (closeOnBackdropClick) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "relative w-full rounded-control border border-border-strong bg-surface p-6 text-fg shadow-xl",
          sizeClasses[size],
          className,
        )}
      >
        {/* Üst Kısım: Başlık ve Kapatma Butonu */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            {title && (
              <h2 id={titleId} className="text-lg font-semibold text-fg">
                {title}
              </h2>
            )}
            {description && (
              <p id={descriptionId} className="text-sm text-fg/60">
                {description}
              </p>
            )}
          </div>

          <IconButton
            label="Kapat"
            size="sm"
            onClick={onClose}
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            }
          />
        </div>

        {/* Ana İçerik */}
        <div className="mt-4">{children}</div>

        {/* Alt Kısım: Butonlar */}
        {footer && (
          <div className="mt-6 flex items-center justify-end gap-2 border-t border-border-strong pt-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}