import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, CSSProperties, KeyboardEvent, MouseEvent, ReactNode, Ref } from "react";
import { cn } from "../../lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

/** Hem <button> hem bağlantı (<a>) hâlinde geçerli olan prop'lar */
interface ButtonOwnProps {
  /** Görsel stil. Varsayılan: "primary" */
  variant?: ButtonVariant;
  /** Boyut. Varsayılan: "md" */
  size?: ButtonSize;
  /** true ise spinner gösterir ve tıklamayı engeller */
  loading?: boolean;
  /** Yüklenirken metnin yerine gösterilecek metin (ör. "Kaydediliyor…") */
  loadingText?: ReactNode;
  /** true ise ✓ ikonu ve successText gösterir (işlem bitti geri bildirimi). Genişlik sabit kalır. */
  success?: boolean;
  /** success iken metnin yerine gösterilecek metin (ör. "Kaydedildi") */
  successText?: ReactNode;
  /** Butonu pasif yapar */
  disabled?: boolean;
  /**
   * Pasifliğin nedeni (ör. "Önce zorunlu alanları doldurun"). Verilirse buton klavyeyle odaklanabilir
   * kalır ama çalışmaz; neden üzerine gelince / odaklanınca / dokununca görünür ve ekran okuyucuya okunur.
   */
  disabledReason?: string;
  /** Metnin solunda gösterilecek ikon */
  leftIcon?: ReactNode;
  /** Metnin sağında gösterilecek ikon */
  rightIcon?: ReactNode;
  /** Bulunduğu alanın tamamını kaplar */
  fullWidth?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/** Normal buton: bir işlem yapar */
export interface ButtonAsButtonProps extends ButtonOwnProps, Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonOwnProps> {
  href?: undefined;
  ref?: Ref<HTMLButtonElement>;
}

/** href verilirse <a> olarak çizilir: başka sayfaya götürür ama buton gibi görünür */
export interface ButtonAsLinkProps extends ButtonOwnProps, Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof ButtonOwnProps> {
  href: string;
  ref?: Ref<HTMLAnchorElement>;
}

export type ButtonProps = ButtonAsButtonProps | ButtonAsLinkProps;

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
 * Button görünüm sınıfları: başka bir öğeye buton görünümü vermek için (ör. dosya seçen <label>).
 * Bağlantı için gerek yok: <Button href="/ayarlar"> doğrudan <a> çizer.
 */
export function buttonClasses({
  variant = "primary",
  size = "md",
  fullWidth = false,
}: { variant?: ButtonVariant; size?: ButtonSize; fullWidth?: boolean } = {}) {
  return cn(
    "inline-flex items-center justify-center rounded-control font-medium whitespace-nowrap transition-colors",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
    // aria-disabled: nedeni söylenen pasif buton (odaklanabilir) ve pasif bağlantı da aynı görünür
    "disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
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

function CheckIcon() {
  return (
    <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

/** Dışarıdan verilen ref ile içerideki ref'i birleştirir */
function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref) (ref as { current: T | null }).current = value;
}

/** Dokunmatik ekranda "üzerine gelme" olmadığı için pasiflik nedeni dokununca bu kadar süre görünür */
export const REASON_TAP_MS = 2500;

export function Button(props: ButtonProps) {
  const {
    variant = "primary",
    size = "md",
    loading = false,
    loadingText,
    success = false,
    successText,
    disabled = false,
    disabledReason,
    leftIcon,
    rightIcon,
    fullWidth = false,
    className,
    style,
    children,
    ...rest
  } = props;
  // loading iken de buton kullanılamaz olmalı
  const blocked = disabled || loading;
  // Nedeni verilmiş pasif buton gerçekten disabled OLMAZ: disabled öğeye Tab ile gidilemez, neden de okunamazdı
  const explained = disabled && !loading && !!disabledReason;
  const reasonId = useId();
  const [reasonTapped, setReasonTapped] = useState(false);
  useEffect(() => {
    if (!reasonTapped) return;
    const t = window.setTimeout(() => setReasonTapped(false), REASON_TAP_MS);
    return () => window.clearTimeout(t);
  }, [reasonTapped]);
  /*
    Neden kutusu butonun ortasına hizalanır; buton ekranın kenarındaysa kutu taşmasın diye
    göstermeden hemen önce ekranın içine kaydırılır (8 px pay).
  */
  const reasonRef = useRef<HTMLSpanElement>(null);
  const [reasonShift, setReasonShift] = useState(0);
  const placeReason = () => {
    const tip = reasonRef.current;
    const anchor = innerRef.current;
    if (!tip || !anchor) return;
    const a = anchor.getBoundingClientRect();
    const width = tip.offsetWidth;
    const centeredLeft = a.left + a.width / 2 - width / 2;
    const maxLeft = document.documentElement.clientWidth - 8 - width;
    setReasonShift(Math.max(8, Math.min(centeredLeft, maxLeft)) - centeredLeft);
  };

  /*
    Genişlik sabitleme: yüklenmeye başlayınca (veya ✓ çıkınca) metin değişir; buton genişleyip
    daralırsa yanındaki öğeler zıplar. Bu yüzden ÖNCEKİ genişlik ölçülür ve o süre boyunca en az o kadar kalır.
  */
  const innerRef = useRef<HTMLElement | null>(null);
  const restingWidth = useRef<number | null>(null);
  const locked = loading || success;
  useLayoutEffect(() => {
    if (!locked && innerRef.current) restingWidth.current = innerRef.current.offsetWidth;
  });

  const label = loading && loadingText ? loadingText : success && successText ? successText : children;
  // Metni değişen buton (Kaydediliyor… → Kaydedildi) bu değişikliği ekran okuyucuya söyler
  const announces = loadingText !== undefined || successText !== undefined;
  const content = (
    <>
      {loading ? <Spinner /> : success ? <CheckIcon /> : leftIcon}
      {announces ? <span aria-live="polite">{label}</span> : label}
      {!loading && !success && rightIcon}
    </>
  );

  const userOnClick = rest.onClick as ((e: MouseEvent<HTMLElement>) => void) | undefined;
  const onClick = (e: MouseEvent<HTMLElement>) => {
    if (blocked) {
      // aria-disabled öğe tıklanabilir; işlemi (formu göndermeyi / sayfa değiştirmeyi de) burada durdur
      e.preventDefault();
      if (explained) setReasonTapped(true);
      return;
    }
    userOnClick?.(e);
  };
  const describedBy = [rest["aria-describedby"], explained ? reasonId : undefined].filter(Boolean).join(" ") || undefined;
  const shared = {
    className: cn(buttonClasses({ variant, size, fullWidth }), className),
    style: locked && restingWidth.current ? { minWidth: restingWidth.current, ...style } : style,
    "aria-busy": loading || undefined,
    "aria-describedby": describedBy,
    onClick,
  };

  let element: ReactNode;
  if (rest.href !== undefined) {
    const { href, ref, ...anchor } = rest;
    element = (
      <a
        {...anchor}
        {...shared}
        ref={(el) => {
          innerRef.current = el;
          assignRef(ref, el);
        }}
        // Pasif bağlantının href'i kaldırılır (yeni sekmede açma da engellensin); rolü ve odak sırası elle verilir
        href={blocked ? undefined : href}
        role={blocked ? "link" : anchor.role}
        aria-disabled={blocked || undefined}
        tabIndex={blocked ? (explained ? 0 : -1) : anchor.tabIndex}
      >
        {content}
      </a>
    );
  } else {
    const { ref, type = "button", href: _href, ...button } = rest;
    element = (
      <button
        {...button}
        {...shared}
        ref={(el) => {
          innerRef.current = el;
          assignRef(ref, el);
        }}
        type={type}
        disabled={blocked && !explained}
        aria-disabled={explained || undefined}
      >
        {content}
      </button>
    );
  }

  if (!explained) return element;
  // Neden kutusu butonun DIŞINDA: içinde olsaydı butonun %50 saydamlığı ona da geçerdi
  return (
    <span
      className={cn("group/reason relative inline-flex", fullWidth && "w-full")}
      onPointerEnter={placeReason}
      onFocus={placeReason}
      onClickCapture={placeReason}
    >
      {element}
      <span
        ref={reasonRef}
        id={reasonId}
        // Ekran okuyucu bunu butonun açıklaması olarak okur (aria-describedby); ayrıca bir kez daha okunmasın
        aria-hidden="true"
        data-testid="disabled-reason"
        style={{ translate: `calc(-50% + ${reasonShift}px) 0` }}
        className={cn(
          "pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-max max-w-60 rounded-control bg-fg px-2.5 py-1.5 text-center text-xs font-medium whitespace-normal text-surface shadow-lg",
          "opacity-0 transition-opacity group-hover/reason:opacity-100 group-focus-within/reason:opacity-100",
          reasonTapped && "opacity-100",
        )}
      >
        {disabledReason}
      </span>
    </span>
  );
}

/* ---------- ConfirmButton ---------- */

export interface ConfirmButtonProps extends Omit<ButtonAsButtonProps, "onClick"> {
  /** İkinci (onaylayan) tıklamada çağrılır */
  onConfirm: () => void;
  /** Onay beklerken gösterilen metin. Varsayılan: "Emin misin? Tekrar bas" */
  confirmText?: ReactNode;
  /** Bu süre (ms) içinde ikinci tıklama gelmezse buton eski hâline döner. Varsayılan: 3000 */
  confirmTimeout?: number;
}

/** İlk tıklamadan sonra bu süre (ms) içindeki tıklama sayılmaz: çift tıklama yanlışlıkla onaylamasın */
export const CONFIRM_GUARD_MS = 350;

/**
 * Geri alınamaz işlemler için iki adımlı buton: ilk tıklama "Emin misin?" durumuna geçirir,
 * ikinci tıklama işi yapar. Süre dolarsa, odak ayrılırsa ya da Esc'e basılırsa vazgeçilir.
 * Varsayılan varyant "secondary"; onay beklerken her zaman "danger" görünür.
 */
export function ConfirmButton({
  onConfirm,
  confirmText = "Emin misin? Tekrar bas",
  confirmTimeout = 3000,
  variant = "secondary",
  children,
  onBlur,
  onKeyDown,
  ...rest
}: ConfirmButtonProps) {
  const [armed, setArmed] = useState(false);
  const armedAt = useRef(0);
  useEffect(() => {
    if (!armed) return;
    const t = window.setTimeout(() => setArmed(false), confirmTimeout);
    return () => window.clearTimeout(t);
  }, [armed, confirmTimeout]);

  return (
    <>
      <Button
        {...rest}
        variant={armed ? "danger" : variant}
        onClick={() => {
          if (!armed) {
            armedAt.current = Date.now();
            setArmed(true);
          } else if (Date.now() - armedAt.current >= CONFIRM_GUARD_MS) {
            setArmed(false);
            onConfirm();
          }
        }}
        onBlur={(e) => {
          setArmed(false);
          onBlur?.(e);
        }}
        onKeyDown={(e: KeyboardEvent<HTMLButtonElement>) => {
          if (e.key === "Escape" && armed) {
            e.stopPropagation();
            setArmed(false);
          }
          onKeyDown?.(e);
        }}
      >
        {armed ? confirmText : children}
      </Button>
      {/* Odaktaki butonun yazısı değişince ekran okuyucu bunu her zaman söylemez; ayrıca duyurulur */}
      <span className="sr-only" aria-live="assertive">
        {armed ? "Onaylamak için tekrar basın, vazgeçmek için Esc" : ""}
      </span>
    </>
  );
}

/* ---------- IconButton ---------- */

export interface IconButtonProps extends Omit<ButtonAsButtonProps, "children" | "leftIcon" | "rightIcon" | "loadingText" | "successText" | "fullWidth" | "aria-label"> {
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
export function IconButton({ icon, label, variant = "ghost", size = "md", loading, success, className, title, ...rest }: IconButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      loading={loading}
      success={success}
      aria-label={label}
      title={title ?? label}
      className={cn(iconSizeClasses[size], className)}
      {...rest}
    >
      {!loading && !success && icon}
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
