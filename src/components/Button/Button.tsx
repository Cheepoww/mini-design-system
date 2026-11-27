import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, CSSProperties, KeyboardEvent, MouseEvent, ReactNode, Ref } from "react";
import { cn } from "../../lib/cn";
import { ariaShortcut, formatShortcut, isTypingTarget, matchesShortcut, parseShortcut } from "../../lib/shortcut";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

/** Hem <button> hem bağlantı (<a>) hâlinde geçerli olan prop'lar */
interface ButtonOwnProps {
  /** Görsel stil. Varsayılan: "primary" */
  variant?: ButtonVariant;
  /** Boyut. Varsayılan: "md" */
  size?: ButtonSize;
  /**
   * Tıklanınca çağrılır. Bir Promise döndürürse (async fonksiyon) buton kendini yönetir:
   * iş sürerken yükleniyor, bitince kısa süre ✓ (success), hata olursa ✕ (error) gösterir.
   */
  onClick?: (event: MouseEvent<HTMLElement>) => unknown;
  /** true ise spinner gösterir ve tıklamayı engeller */
  loading?: boolean;
  /** Yüklenirken metnin yerine gösterilecek metin (ör. "Kaydediliyor…") */
  loadingText?: ReactNode;
  /** true ise ✓ ikonu ve successText gösterir (işlem bitti geri bildirimi). Genişlik sabit kalır. */
  success?: boolean;
  /** success iken metnin yerine gösterilecek metin (ör. "Kaydedildi") */
  successText?: ReactNode;
  /** true ise ✕ ikonu ve errorText gösterir, buton kırmızıya döner ve hafifçe sallanır */
  error?: boolean;
  /** error iken metnin yerine gösterilecek metin (ör. "Kaydedilemedi") */
  errorText?: ReactNode;
  /** async onClick sonrası ✓ veya ✕ kaç ms görünsün. Varsayılan: 1800 */
  feedbackDuration?: number;
  /**
   * async onClick hata verirse (Promise reddedilirse) hatayla çağrılır. Verilmezse hata konsola yazılır:
   * buton ✕ gösterse de hatanın kendisi sessizce kaybolmasın.
   */
  onError?: (error: unknown) => void;
  /**
   * İlerleme (0–1). Verilirse buton soldan sağa dolar ve yüzdeyi gösterir; bu sürede tıklanamaz.
   * İş bitince undefined yap.
   */
  progress?: number;
  /** Butonu pasif yapar */
  disabled?: boolean;
  /**
   * Pasifliğin nedeni (ör. "Önce zorunlu alanları doldurun"). Verilirse buton klavyeyle odaklanabilir
   * kalır ama çalışmaz; neden üzerine gelince / odaklanınca / dokununca görünür ve ekran okuyucuya okunur.
   */
  disabledReason?: string;
  /**
   * Klavye kısayolu (ör. "Mod+S": Mac'te ⌘S, diğerlerinde Ctrl+S). Basılınca buton tıklanmış gibi çalışır;
   * butonun içinde küçük bir tuş etiketi görünür (dokunmatik cihazlarda gizli).
   */
  shortcut?: string;
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

function CrossIcon() {
  return (
    <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <path d="M7 7l10 10M17 7L7 17" />
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
/** async onClick sonrası ✓ / ✕ geri bildiriminin varsayılan süresi */
export const BUTTON_FEEDBACK_MS = 1800;

type AutoState = "idle" | "loading" | "success" | "error";

const isThenable = (v: unknown): v is PromiseLike<unknown> =>
  !!v && (typeof v === "object" || typeof v === "function") && typeof (v as { then?: unknown }).then === "function";

export function Button(props: ButtonProps) {
  const {
    variant = "primary",
    size = "md",
    onClick: userOnClick,
    loading: loadingProp = false,
    loadingText,
    success: successProp = false,
    successText,
    error: errorProp = false,
    errorText,
    feedbackDuration = BUTTON_FEEDBACK_MS,
    onError,
    progress,
    disabled = false,
    disabledReason,
    shortcut,
    leftIcon,
    rightIcon,
    fullWidth = false,
    className,
    style,
    children,
    ...rest
  } = props;

  /* ---------- async onClick: buton kendi durumunu yönetir ---------- */
  const [auto, setAuto] = useState<AutoState>("idle");
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (auto !== "success" && auto !== "error") return;
    const t = window.setTimeout(() => setAuto("idle"), feedbackDuration);
    return () => window.clearTimeout(t);
  }, [auto, feedbackDuration]);

  const hasProgress = progress !== undefined;
  const loading = loadingProp || auto === "loading";
  const error = !loading && !hasProgress && (errorProp || auto === "error");
  const success = !loading && !hasProgress && !error && (successProp || auto === "success");

  // loading (ve ilerleme) sürerken de buton kullanılamaz olmalı
  const blocked = disabled || loading || hasProgress;
  // Nedeni verilmiş pasif buton gerçekten disabled OLMAZ: disabled öğeye Tab ile gidilemez, neden de okunamazdı
  const explained = disabled && !loading && !hasProgress && !!disabledReason;
  const reasonId = useId();
  const [reasonTapped, setReasonTapped] = useState(false);
  useEffect(() => {
    if (!reasonTapped) return;
    const t = window.setTimeout(() => setReasonTapped(false), REASON_TAP_MS);
    return () => window.clearTimeout(t);
  }, [reasonTapped]);

  /*
    Genişlik sabitleme: yüklenmeye başlayınca (veya ✓ / ✕ çıkınca) metin değişir; buton genişleyip
    daralırsa yanındaki öğeler zıplar. Bu yüzden ÖNCEKİ genişlik ölçülür ve o süre boyunca en az o kadar kalır.
  */
  const innerRef = useRef<HTMLElement | null>(null);
  const restingWidth = useRef<number | null>(null);
  const locked = loading || success || error || hasProgress;
  useLayoutEffect(() => {
    if (!locked && innerRef.current) restingWidth.current = innerRef.current.offsetWidth;
  });

  /*
    Neden kutusu butonun ortasına hizalanır; buton ekranın kenarındaysa kutu taşmasın diye ekranın
    içine kaydırılır (8 px pay). Kutu hep çizili (yalnızca saydam) olduğu için yeri önceden ölçülür;
    ekran boyutu değişince yeniden hesaplanır.
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
    const shift = Math.max(8, Math.min(centeredLeft, maxLeft)) - centeredLeft;
    setReasonShift((p) => (Math.abs(p - shift) < 0.5 ? p : shift));
  };
  useLayoutEffect(() => {
    if (!explained) return;
    placeReason();
    window.addEventListener("resize", placeReason);
    return () => window.removeEventListener("resize", placeReason);
    // placeReason yalnızca ref'leri okur; neden metni değişince kutu genişliği değişebilir
  }, [explained, disabledReason]);

  /* ---------- Klavye kısayolu ---------- */
  const parsed = shortcut ? parseShortcut(shortcut) : null;
  useEffect(() => {
    if (!shortcut) return;
    const s = parseShortcut(shortcut);
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.repeat || !matchesShortcut(e, s)) return;
      // Tek tuşlu kısayol yazı yazarken çalışmaz; Ctrl/⌘ kısayolları (ör. kaydet) yazı alanında da çalışır
      if (!s.ctrl && !s.meta && !s.alt && isTypingTarget(e.target)) return;
      e.preventDefault(); // tarayıcının kendi kısayolu (ör. Ctrl+S = sayfayı kaydet) çıkmasın
      innerRef.current?.click();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shortcut]);

  const percent = hasProgress ? Math.round(Math.min(1, Math.max(0, progress)) * 100) : 0;
  const label = (loading || hasProgress) && loadingText ? loadingText : error && errorText ? errorText : success && successText ? successText : children;
  // Metni değişen buton (Kaydediliyor… → Kaydedildi) bu değişikliği ekran okuyucuya söyler
  const announces = loadingText !== undefined || successText !== undefined || errorText !== undefined;
  const content = (
    <>
      {hasProgress && (
        // Dolum: yazının ALTINDA (isolate + -z-10), butonun kendi renginin hafif bir tonu
        <span aria-hidden="true" className="absolute inset-y-0 left-0 -z-10 bg-current opacity-20 transition-[width] duration-300" style={{ width: `${percent}%` }} />
      )}
      {loading ? <Spinner /> : error ? <CrossIcon /> : success ? <CheckIcon /> : hasProgress ? null : leftIcon}
      {announces ? <span aria-live="polite">{label}</span> : label}
      {hasProgress && <span className="tabular-nums">%{percent}</span>}
      {!loading && !success && !error && !hasProgress && rightIcon}
      {parsed && !loading && !success && !error && !hasProgress && (
        <kbd aria-hidden="true" className="ml-0.5 rounded border border-current/30 px-1 font-sans text-[0.75em] font-normal opacity-70 pointer-coarse:hidden">
          {formatShortcut(parsed)}
        </kbd>
      )}
    </>
  );

  const onClick = (e: MouseEvent<HTMLElement>) => {
    if (blocked) {
      // aria-disabled öğe tıklanabilir; işlemi (formu göndermeyi / sayfa değiştirmeyi de) burada durdur
      e.preventDefault();
      if (explained) {
        placeReason();
        setReasonTapped(true);
      }
      return;
    }
    const result = userOnClick?.(e);
    if (isThenable(result)) {
      setAuto("loading");
      result.then(
        () => mounted.current && setAuto("success"),
        (error: unknown) => {
          // Hata yutulmasın: ya çağırana verilir ya da konsola yazılır
          if (onError) onError(error);
          else console.error("Button: onClick işlemi başarısız oldu", error);
          if (mounted.current) setAuto("error");
        },
      );
    }
  };
  const describedBy = [rest["aria-describedby"], explained ? reasonId : undefined].filter(Boolean).join(" ") || undefined;
  const shared = {
    className: cn(
      buttonClasses({ variant: error ? "danger" : variant, size, fullWidth }),
      hasProgress && "relative isolate overflow-hidden",
      // Hata: kısa bir sallanma (hareket azaltma tercihinde animasyon kendiliğinden kapanır)
      error && "animate-[button-shake_320ms_ease-in-out]",
      className,
    ),
    style: locked && restingWidth.current ? { minWidth: restingWidth.current, ...style } : style,
    "aria-busy": loading || hasProgress || undefined,
    "aria-describedby": describedBy,
    "aria-keyshortcuts": parsed ? ariaShortcut(parsed) : undefined,
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
    <span className={cn("group/reason relative inline-flex", fullWidth && "w-full")} onPointerEnter={placeReason} onFocus={placeReason}>
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

/* ---------- ToggleButton ---------- */

export interface ToggleButtonProps
  extends Omit<ButtonAsButtonProps, "onClick" | "variant" | "success" | "successText" | "error" | "errorText" | "progress" | "aria-pressed"> {
  /** Kontrollü kullanım: basılı mı */
  pressed?: boolean;
  /** Kontrolsüz kullanım: başlangıçta basılı mı. Varsayılan: false */
  defaultPressed?: boolean;
  /** Basılı durumu değişince çağrılır */
  onPressedChange?: (pressed: boolean) => void;
}

/**
 * Açılıp kapanan buton (ör. "Kalın", "Sessize al"). Ekran okuyucu "basılı / basılı değil" der.
 * Yazısı duruma göre DEĞİŞMEMELİ: durum aria-pressed ile söylenir, yazı aynı kalır.
 */
export function ToggleButton({ pressed, defaultPressed = false, onPressedChange, className, ...rest }: ToggleButtonProps) {
  const [inner, setInner] = useState(defaultPressed);
  const isOn = pressed ?? inner;
  return (
    <Button
      {...rest}
      variant="secondary"
      aria-pressed={isOn}
      className={cn(isOn && "border-primary bg-primary-soft text-primary hover:bg-primary-soft", className)}
      onClick={() => {
        const next = !isOn;
        if (pressed === undefined) setInner(next);
        onPressedChange?.(next);
      }}
    />
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

export interface IconButtonProps
  extends Omit<ButtonAsButtonProps, "children" | "leftIcon" | "rightIcon" | "loadingText" | "successText" | "errorText" | "fullWidth" | "aria-label"> {
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
export function IconButton({ icon, label, variant = "ghost", size = "md", className, title, ...rest }: IconButtonProps) {
  /*
    Durum ikonu (spinner, ✓, ✕) Button'ın doğrudan çocuğu olarak çizilir. Durumu (async onClick dahil)
    yalnızca Button bilir; bu yüzden "doğrudan çocuk bir svg varsa kendi ikonunu gizle" kuralı CSS ile verilir.
    Kendi ikonumuz bir span'ın içinde olduğu için bu kurala takılmaz.
  */
  return (
    <Button
      variant={variant}
      size={size}
      aria-label={label}
      title={title ?? label}
      className={cn(iconSizeClasses[size], "[&:has(>svg)>[data-icon]]:hidden", className)}
      {...rest}
    >
      {/* Durum prop'la verildiyse ikon hiç çizilmez; async durumda yukarıdaki CSS kuralı gizler */}
      {!(rest.loading || rest.success || rest.error || rest.progress !== undefined) && (
        <span data-icon="" className="contents">
          {icon}
        </span>
      )}
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
