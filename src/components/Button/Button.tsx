import { useLayoutEffect, useRef } from "react";
import type { ButtonHTMLAttributes, KeyboardEvent, ReactNode, Ref } from "react";
import { cn } from "../../lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Görsel stil. Varsayılan: "primary" */
  variant?: ButtonVariant;
  /** Boyut. Varsayılan: "md" */
  size?: ButtonSize;
  /** true ise spinner gösterir ve tıklamayı engeller */
  loading?: boolean;
  /** Yüklenirken metnin yerine gösterilecek metin (ör. "Kaydediliyor…") */
  loadingText?: ReactNode;
  /** Metnin solunda gösterilecek ikon */
  leftIcon?: ReactNode;
  /** Metnin sağında gösterilecek ikon */
  rightIcon?: ReactNode;
  /** Bulunduğu alanın tamamını kaplar */
  fullWidth?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-hover",
  secondary: "bg-surface/50 text-fg border border-border-strong hover:bg-surface/80",
  ghost: "bg-transparent text-fg hover:bg-primary-soft hover:text-primary",
  danger: "bg-danger text-on-danger hover:bg-danger-hover",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2.5",
};

/**
 * Button görünüm sınıfları. Buton GİBİ görünmesi gereken ama aslında bağlantı olan
 * öğeler için (ör. <a href="/ayarlar" className={buttonClasses({ variant: "secondary" })}>).
 * Bağlantı başka sayfaya götürür, buton bir işlem yapar: doğru HTML öğesini seçmek erişilebilirliğin parçası.
 */
export function buttonClasses({
  variant = "primary",
  size = "md",
  fullWidth = false,
}: { variant?: ButtonVariant; size?: ButtonSize; fullWidth?: boolean } = {}) {
  return cn(
    "inline-flex items-center justify-center rounded-control font-medium whitespace-nowrap transition-colors",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
    "disabled:cursor-not-allowed disabled:opacity-50",
    variantClasses[variant],
    sizeClasses[size],
    fullWidth && "w-full",
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("size-4 shrink-0 animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Dışarıdan verilen ref ile içerideki ref'i birleştirir */
function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref) (ref as { current: T | null }).current = value;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  loadingText,
  disabled = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  type = "button",
  className,
  style,
  children,
  ref,
  ...rest
}: ButtonProps) {
  // loading iken de buton kullanılamaz olmalı
  const isDisabled = disabled || loading;

  /*
    Genişlik sabitleme: yüklenmeye başlayınca spinner eklenir veya metin değişir; buton
    genişleyip daralırsa yanındaki öğeler zıplar. Bu yüzden yükleme ÖNCESİ genişlik ölçülür
    ve yükleme süresince en az o kadar kalır.
  */
  const innerRef = useRef<HTMLButtonElement | null>(null);
  const restingWidth = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (!loading && innerRef.current) restingWidth.current = innerRef.current.offsetWidth;
  });

  return (
    <button
      ref={(el) => {
        innerRef.current = el;
        assignRef(ref, el);
      }}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(buttonClasses({ variant, size, fullWidth }), className)}
      style={loading && restingWidth.current ? { minWidth: restingWidth.current, ...style } : style}
      {...rest}
    >
      {loading ? <Spinner /> : leftIcon}
      {loading && loadingText ? loadingText : children}
      {!loading && rightIcon}
    </button>
  );
}

/* ---------- IconButton ---------- */

export interface IconButtonProps extends Omit<ButtonProps, "children" | "leftIcon" | "rightIcon" | "loadingText" | "fullWidth" | "aria-label"> {
  /** Gösterilecek ikon */
  icon: ReactNode;
  /**
   * ZORUNLU. Butonun ne yaptığı (ör. "Sil"). Ekranda yazı olmadığı için ekran okuyucu bunu okur;
   * fareyle üzerine gelince de ipucu olarak görünür.
   */
  label: string;
}

/*
  Kare boyut. "px-0!" (önemli): Button'ın kendi yatay boşluğu (px-3/4/6) aynı öğede olduğu için
  hangisinin kazanacağını CSS sırası belirlerdi; px-6 kazanınca 48 px'lik karede ikona yer kalmıyordu.
*/
const iconSizeClasses: Record<ButtonSize, string> = {
  sm: "size-8 px-0! [&_svg]:size-4",
  md: "size-10 px-0! [&_svg]:size-4",
  lg: "size-12 px-0! [&_svg]:size-5",
};

/** Yalnızca ikondan oluşan kare buton. Varsayılan varyant: "ghost" */
export function IconButton({ icon, label, variant = "ghost", size = "md", loading, className, title, ...rest }: IconButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      loading={loading}
      aria-label={label}
      title={title ?? label}
      className={cn(iconSizeClasses[size], className)}
      {...rest}
    >
      {!loading && icon}
    </Button>
  );
}

/* ---------- ButtonGroup ---------- */

export interface ButtonGroupOption {
  value: string;
  label: ReactNode;
  disabled?: boolean;
}

export interface ButtonGroupProps {
  /** ZORUNLU. Grubun ekran okuyucudaki adı (ör. "Zaman aralığı") */
  label: string;
  /** Boyut. Varsayılan: "md" */
  size?: ButtonSize;
  className?: string;
  /**
   * Seçim modu: options verilirse grup tek seçimli olur (Gün / Hafta / Ay gibi).
   * Ok tuşlarıyla gezilir ve seçilir; Tab ile gruba tek adımda girilir.
   */
  options?: ButtonGroupOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  /** Eylem modu: options yoksa içine verilen Button'lar birbirine yapışık dizilir */
  children?: ReactNode;
}

/** Yapışık butonlar: köşeler yalnızca grubun iki ucunda yuvarlanır, aradaki çizgiler üst üste biner */
const attachedClasses =
  "inline-flex [&>*]:rounded-none [&>*:first-child]:rounded-l-control [&>*:last-child]:rounded-r-control [&>*+*]:-ml-px [&>*:focus-visible]:z-10";

export function ButtonGroup({ label, size = "md", className, options, value, onValueChange, children }: ButtonGroupProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  if (!options) {
    return (
      <div role="group" aria-label={label} className={cn(attachedClasses, className)}>
        {children}
      </div>
    );
  }

  const enabled = options.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i >= 0);
  const selectedIndex = options.findIndex((o) => o.value === value);
  // Tab ile gelindiğinde odak seçili seçeneğe (yoksa ilk seçilebilir seçeneğe) düşer
  const tabStop = selectedIndex >= 0 && !options[selectedIndex].disabled ? selectedIndex : enabled[0];

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const pos = enabled.indexOf(index);
    let next: number | undefined;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = enabled[(pos + 1) % enabled.length];
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = enabled[(pos - 1 + enabled.length) % enabled.length];
    else if (e.key === "Home") next = enabled[0];
    else if (e.key === "End") next = enabled[enabled.length - 1];
    if (next === undefined) return;
    e.preventDefault();
    refs.current[next]?.focus();
    onValueChange?.(options[next].value);
  };

  return (
    // Tek seçimli grup ekran okuyucu için bir radyo grubudur
    <div role="radiogroup" aria-label={label} className={cn(attachedClasses, className)}>
      {options.map((o, i) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={o.disabled}
            tabIndex={i === tabStop ? 0 : -1}
            onClick={() => onValueChange?.(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(buttonClasses({ variant: "secondary", size }), selected && "border-primary bg-primary-soft text-primary hover:bg-primary-soft")}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
