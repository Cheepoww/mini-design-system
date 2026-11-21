import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent, PointerEvent, ReactNode } from "react";
import { cn } from "../../lib/cn";
import { Spinner } from "../Button/Button";

/** "loading": işlem sürüyor (spinner, kendiliğinden kapanmaz). toast.promise bunu kullanır. */
export type ToastTone = "info" | "success" | "warning" | "danger" | "loading";
export type ToastPosition = "top-right" | "bottom-right" | "top-center" | "bottom-center";
export type ToastId = string | number;

/**
 * Bildirim neden kapandı:
 * timeout (süre doldu), close (× düğmesi), action (eylem düğmesi), swipe (kaydırıldı),
 * escape (Esc tuşu), dismiss (kod: dismiss(id)), dismissAll (kod: dismissAll())
 */
export type ToastCloseReason = "timeout" | "close" | "action" | "swipe" | "escape" | "dismiss" | "dismissAll";

export interface ToastOptions {
  /**
   * İsteğe bağlı sabit kimlik. Aynı id ile tekrar çağrılırsa yeni bildirim AÇILMAZ,
   * mevcut olan güncellenir (ör. "Bağlantı koptu" beş kez üst üste yığılmasın).
   */
  id?: ToastId;
  /** Anlam rengi. Varsayılan: "info" */
  tone?: ToastTone;
  title: ReactNode;
  description?: ReactNode;
  /** Kaç ms sonra kapanır. 0 = kullanıcı kapatana kadar kalır. Varsayılan: 4000 ("loading" için 0) */
  duration?: number;
  /** Toast içinde tek bir aksiyon butonu (ör. "Geri al") */
  action?: { label: string; onClick: () => void };
  /**
   * Bildirim kapanınca bir kez çağrılır; neden kapandığını söyler.
   * Örnek: "Geri al"a basılmadıysa (reason !== "action") silme işlemini o an kesinleştir.
   */
  onClose?: (reason: ToastCloseReason) => void;
}

/** toast.promise mesajları: her biri metin ya da sonuca göre metin üreten fonksiyon olabilir */
export interface ToastPromiseMessages<T> {
  loading: ReactNode;
  success: ReactNode | ((value: T) => ReactNode);
  error: ReactNode | ((error: unknown) => ReactNode);
}

interface ToastItem extends ToastOptions {
  id: ToastId;
  /** Kapanış animasyonu oynarken true; ekran okuyucu artık okumaz */
  leaving: boolean;
  /** Her güncellemede artar: süre ve süre çubuğu baştan başlar */
  version: number;
}

export interface ToastContextValue {
  /** Yeni bildirim gösterir (aynı id varsa onu günceller), id'sini döner */
  toast: (options: ToastOptions) => ToastId;
  /** Açık bir bildirimi günceller (ör. "Kaydediliyor…" → "Kaydedildi"); süre baştan başlar */
  update: (id: ToastId, options: Partial<ToastOptions>) => void;
  /** Belirli bir bildirimi kapatır */
  dismiss: (id: ToastId) => void;
  /** Tüm bildirimleri (sıradakiler dahil) kapatır */
  dismissAll: () => void;
  /**
   * Bir işlemi bildirimle izler: önce "loading", işlem bitince "success" ya da "danger".
   * Aynı promise'i geri döndürür, yani await edilebilir.
   */
  promise: <T>(promise: Promise<T>, messages: ToastPromiseMessages<T>) => Promise<T>;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/** Bileşen içinden toast göstermek için: const { toast } = useToast(); */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast, <ToastProvider> içinde kullanılmalı");
  return ctx;
}

/** Kapanış animasyonunun süresi (ms); bu süre sonunda bildirim DOM'dan kaldırılır */
export const TOAST_EXIT_MS = 200;
/** Bu kadar piksel (veya kartın %40'ı, hangisi küçükse) yana kaydırılınca bildirim kapanır */
export const TOAST_SWIPE_PX = 80;

const positionClasses: Record<ToastPosition, string> = {
  "top-right": "top-4 right-4 items-end",
  "bottom-right": "bottom-4 right-4 items-end flex-col-reverse",
  "top-center": "top-4 left-1/2 -translate-x-1/2 items-center",
  "bottom-center": "bottom-4 left-1/2 -translate-x-1/2 items-center flex-col-reverse",
};

export interface ToastProviderProps {
  children: ReactNode;
  /** Ekranın neresinde görünsün. Varsayılan: "bottom-right" */
  position?: ToastPosition;
  /**
   * Aynı anda en fazla kaç bildirim GÖRÜNSÜN. Varsayılan: 4.
   * Fazlası atılmaz, sıraya alınır: biri kapanınca sıradaki görünür (süresi o an başlar).
   */
  max?: number;
  /**
   * Bildirim bölgesinin ekran okuyucudaki adı. Varsayılan: "Bildirimler".
   * Sayfada birden fazla Provider varsa her birine farklı ad ver (aynı adlı iki bölge ayırt edilemez).
   */
  label?: string;
  /** Odağı bildirimlere taşıyan klavye kısayolu. Varsayılan: "F8". false ise kapalı. */
  hotkey?: string | false;
}

const defaultDuration = (tone?: ToastTone) => (tone === "loading" ? 0 : 4000);

/** Uygulamayı (veya bir bölümünü) sarar; içindeki herkes useToast() kullanabilir. */
export function ToastProvider({ children, position = "bottom-right", max = 4, label = "Bildirimler", hotkey = "F8" }: ToastProviderProps) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const regionRef = useRef<HTMLDivElement>(null);
  /** F8 ile bildirimlere atlamadan önce odağın olduğu yer: Esc ile oraya dönülür */
  const returnFocus = useRef<HTMLElement | null>(null);
  /** onClose'u çağırabilmek için güncel liste (state güncelleyicisinin içinde yan etki yapılmaz) */
  const itemsRef = useRef(items);
  itemsRef.current = items;
  /** Kapanmakta olanlar: aynı bildirim iki kez kapatılırsa onClose iki kez çağrılmasın */
  const closing = useRef(new Set<ToastId>());

  const close = useCallback((ids: ToastId[], reason: ToastCloseReason) => {
    const targets = ids.filter((id) => !closing.current.has(id) && itemsRef.current.some((t) => t.id === id && !t.leaving));
    if (!targets.length) return;
    for (const id of targets) {
      closing.current.add(id);
      itemsRef.current.find((t) => t.id === id)?.onClose?.(reason);
    }
    // Önce kapanış animasyonu, sonra DOM'dan kaldır
    setItems((p) => p.map((t) => (targets.includes(t.id) ? { ...t, leaving: true } : t)));
    window.setTimeout(() => {
      setItems((p) => p.filter((t) => !(targets.includes(t.id) && t.leaving)));
      for (const id of targets) closing.current.delete(id);
    }, TOAST_EXIT_MS);
  }, []);

  const dismiss = useCallback((id: ToastId) => close([id], "dismiss"), [close]);
  const dismissAll = useCallback(() => close(itemsRef.current.map((t) => t.id), "dismissAll"), [close]);

  const update = useCallback((id: ToastId, options: Partial<ToastOptions>) => {
    setItems((p) =>
      p.map((t) =>
        t.id === id
          ? {
              ...t,
              ...options,
              id,
              // Ton değiştiyse ve süre verilmediyse yeni tonun varsayılan süresi geçerli
              duration: options.duration ?? (options.tone && options.tone !== t.tone ? defaultDuration(options.tone) : t.duration),
              version: t.version + 1,
            }
          : t,
      ),
    );
  }, []);

  const toast = useCallback((options: ToastOptions) => {
    const id = options.id ?? nextId.current++;
    closing.current.delete(id);
    setItems((p) => {
      const existing = p.find((t) => t.id === id);
      // Aynı id: yığma, güncelle (kapanmaktaysa geri getir)
      if (existing) return p.map((t) => (t.id === id ? { ...options, id, leaving: false, version: t.version + 1 } : t));
      return [...p, { ...options, id, leaving: false, version: 0 }];
    });
    return id;
  }, []);

  const promise = useCallback(
    <T,>(p: Promise<T>, messages: ToastPromiseMessages<T>) => {
      const id = toast({ tone: "loading", title: messages.loading });
      p.then(
        (value) => update(id, { tone: "success", title: typeof messages.success === "function" ? (messages.success as (v: T) => ReactNode)(value) : messages.success }),
        (error: unknown) => update(id, { tone: "danger", title: typeof messages.error === "function" ? (messages.error as (e: unknown) => ReactNode)(error) : messages.error }),
      );
      return p;
    },
    [toast, update],
  );

  const value = useMemo(() => ({ toast, update, dismiss, dismissAll, promise }), [toast, update, dismiss, dismissAll, promise]);

  // Kısayol (varsayılan F8): odağı bildirim bölgesine taşır; klavye ve ekran okuyucu kullanıcıları için
  useEffect(() => {
    if (!hotkey) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== hotkey || !regionRef.current?.querySelector("[data-toast]")) return;
      e.preventDefault();
      returnFocus.current = document.activeElement as HTMLElement | null;
      regionRef.current.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hotkey]);

  /** Esc ile kapatılınca odak F8'den önceki yerine (yoksa bölgeye) döner */
  const closeWithKeyboard = (id: ToastId) => {
    close([id], "escape");
    const back = returnFocus.current;
    if (back && document.contains(back)) back.focus();
    else regionRef.current?.focus();
  };

  // Sıra: kapanmakta olanlar animasyonunu bitirir; geri kalanların ilk `max` tanesi görünür
  const waiting = items.filter((t) => !t.leaving);
  const shownIds = new Set(waiting.slice(0, max).map((t) => t.id));
  const queued = waiting.length - shownIds.size;

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        ref={regionRef}
        role="region"
        aria-label={label}
        aria-keyshortcuts={hotkey || undefined}
        tabIndex={-1}
        className={cn(
          "pointer-events-none fixed z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 outline-none",
          positionClasses[position],
        )}
      >
        {items
          .filter((t) => t.leaving || shownIds.has(t.id))
          .map((t) => (
            <Toast key={t.id} {...t} onDismiss={(reason) => close([t.id], reason)} onEscape={() => closeWithKeyboard(t.id)} />
          ))}
        {queued > 0 && (
          <p className="glass-strong pointer-events-auto rounded-full px-3 py-1 text-xs text-fg-muted">
            +{queued} bildirim sırada
          </p>
        )}
      </div>
    </ToastContext.Provider>
  );
}

const toneStyles: Record<ToastTone, { icon: string; path?: ReactNode; bar: string }> = {
  info: { icon: "text-info", path: <path d="M12 11v5M12 8v.01" />, bar: "bg-info" },
  success: { icon: "text-success", path: <path d="M8 12.5l3 3 5-6" />, bar: "bg-success" },
  warning: { icon: "text-warning", path: <path d="M12 8v5M12 16v.01" />, bar: "bg-warning" },
  danger: { icon: "text-danger", path: <path d="M9 9l6 6M15 9l-6 6" />, bar: "bg-danger" },
  loading: { icon: "text-primary", bar: "bg-primary" },
};

export interface ToastProps extends Omit<ToastOptions, "onClose"> {
  /** Kapatma isteği ve nedeni */
  onDismiss: (reason: ToastCloseReason) => void;
  /** Esc ile kapatılınca (odak yönetimi için ayrı) */
  onEscape?: () => void;
  /** Kapanış animasyonu oynuyor */
  leaving?: boolean;
  /** Değişince süre ve süre çubuğu baştan başlar */
  version?: number;
}

/**
 * Tek bir toast kartı. Fare üzerindeyken veya odaktayken süre durur; Esc ile kapanır;
 * parmakla (ya da fareyle sürükleyerek) yana kaydırılınca kapanır.
 */
export function Toast({ tone = "info", title, description, duration = defaultDuration(tone), action, onDismiss, onEscape, leaving = false, version = 0 }: ToastProps) {
  const [paused, setPaused] = useState(false);
  const remaining = useRef(duration);
  // Her render'da yeni fonksiyon gelse de zamanlayıcı baştan kurulmasın
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  // Güncellenince (version) süre baştan başlar
  useEffect(() => {
    remaining.current = duration;
  }, [version, duration]);

  /* ---------- Kaydırarak kapatma ---------- */
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ x: number; id: number; active: boolean } | null>(null);
  /** Sürükleme bittikten hemen sonra gelen tıklama yutulur (yanlışlıkla × veya eyleme basılmasın) */
  const suppressClick = useRef(false);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || leaving) return;
    drag.current = { x: e.clientX, id: e.pointerId, active: false };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    if (!d.active) {
      if (Math.abs(dx) < 6) return; // küçük titremeler tıklamadır, sürükleme değil
      d.active = true;
      setDragging(true);
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }
    setOffset(dx);
  };
  const endDrag = (e: PointerEvent<HTMLDivElement>, cancelled = false) => {
    const d = drag.current;
    drag.current = null;
    if (!d?.active) return;
    setDragging(false);
    suppressClick.current = true;
    const width = e.currentTarget.offsetWidth || 320;
    const threshold = Math.min(TOAST_SWIPE_PX, width * 0.4);
    if (!cancelled && Math.abs(offset) >= threshold) {
      setOffset(Math.sign(offset) * width); // kart kaydırıldığı yönde dışarı kayar
      dismissRef.current("swipe");
    } else {
      setOffset(0); // yeterince kaydırılmadı: yerine döner
    }
  };
  const onClickCapture = (e: MouseEvent) => {
    if (!suppressClick.current) return;
    suppressClick.current = false;
    e.stopPropagation();
    e.preventDefault();
  };

  useEffect(() => {
    if (duration <= 0 || paused || dragging || leaving) return;
    const startedAt = Date.now();
    const timer = setTimeout(() => dismissRef.current("timeout"), remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current -= Date.now() - startedAt; // kalan süreyi sakla
    };
  }, [paused, dragging, duration, leaving, version]);

  const s = toneStyles[tone];
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      if (onEscape) onEscape();
      else onDismiss("escape");
    }
  };

  return (
    <div
      data-toast=""
      // danger acil: ekran okuyucu hemen okur (alert); diğerleri sırasını bekler (status)
      role={tone === "danger" ? "alert" : "status"}
      aria-hidden={leaving || undefined}
      inert={leaving}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => endDrag(e)}
      onPointerCancel={(e) => endDrag(e, true)}
      onClickCapture={onClickCapture}
      style={
        offset
          ? { transform: `translateX(${offset}px)`, opacity: Math.max(0.2, 1 - Math.abs(offset) / 240), transition: dragging ? "none" : undefined }
          : undefined
      }
      // touch-pan-y: dikey kaydırma sayfayı kaydırmaya devam eder, yatay hareket bildirimi sürükler
      // Ton, ikonun ve süre çubuğunun renginden okunur (kenarda renkli şerit yok)
      className={cn(
        "glass-strong pointer-events-auto relative flex w-full touch-pan-y animate-[toast-in_200ms_ease-out] gap-3 overflow-hidden rounded-card p-3.5 select-none",
        "transition-[opacity,translate,transform] duration-200 ease-out",
        dragging && "cursor-grabbing",
        leaving && "translate-y-1 opacity-0",
      )}
    >
      {tone === "loading" ? (
        <Spinner className={cn("mt-0.5 size-5", s.icon)} />
      ) : (
        <svg className={cn("mt-0.5 size-5 shrink-0", s.icon)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          {s.path}
        </svg>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-fg">{title}</p>
        {description && <p className="mt-0.5 text-sm text-fg-muted">{description}</p>}
        {action && (
          <button
            type="button"
            // Dokunmatik ekranda (pointer-coarse) dokunma alanı büyür, görünüm aynı kalır
            className="mt-2 rounded text-sm font-medium text-primary hover:underline pointer-coarse:-mx-2 pointer-coarse:-my-2 pointer-coarse:px-2 pointer-coarse:py-2"
            onClick={() => {
              action.onClick();
              onDismiss("action");
            }}
          >
            {action.label}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDismiss("close")}
        aria-label="Bildirimi kapat"
        className="h-fit rounded-full p-1 text-fg-muted hover:bg-surface-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-primary pointer-coarse:-m-1 pointer-coarse:p-2"
      >
        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
        </svg>
      </button>
      {/* Kalan süre çubuğu: süre durunca o da durur; hareket azaltma tercihinde gizlenir */}
      {duration > 0 && (
        <span
          key={version}
          aria-hidden="true"
          data-testid="toast-progress"
          className={cn("absolute inset-x-0 bottom-0 h-0.5 origin-left opacity-60 motion-reduce:hidden", s.bar)}
          style={{ animation: `toast-progress ${duration}ms linear forwards`, animationPlayState: paused || dragging ? "paused" : "running" }}
        />
      )}
    </div>
  );
}
