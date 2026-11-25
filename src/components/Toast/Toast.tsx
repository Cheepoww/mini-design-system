import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, FocusEvent, KeyboardEvent, MouseEvent, PointerEvent, ReactNode } from "react";
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

/** Kapanma nedenlerinin kullanıcıya gösterilecek Türkçe karşılıkları (ör. geçmiş listesinde) */
export const TOAST_CLOSE_REASON_LABELS: Record<ToastCloseReason, string> = {
  timeout: "süre doldu",
  close: "× ile kapatıldı",
  action: "eylem düğmesine basıldı",
  swipe: "kaydırılarak kapatıldı",
  escape: "Esc ile kapatıldı",
  dismiss: "kodla kapatıldı",
  dismissAll: "tümü kapatıldı",
};

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
  /** Kaç ms sonra kapanır. 0 = kendiliğinden kapanmaz. Varsayılan: 4000 ("loading" ve dismissible: false için 0) */
  duration?: number;
  /** Toast içinde tek bir aksiyon butonu (ör. "Geri al") */
  action?: { label: string; onClick: () => void };
  /**
   * false ise kullanıcı kapatamaz (× yok, kaydırma ve Esc çalışmaz), süreyle de kapanmaz ve sırada beklemez.
   * Sorun sürdükçe ekranda kalması gereken bildirimler için (ör. "Bağlantı koptu"); sorun çözülünce
   * kod update(id, …) ya da dismiss(id) ile kapatır. dismissAll() bunlara dokunmaz. Varsayılan: true
   */
  dismissible?: boolean;
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

/** Kapanmış bir bildirimin kaydı (geçmiş listesi için) */
export interface ToastHistoryEntry {
  /** Geçmişe özgü benzersiz anahtar (aynı id'li bildirim birden çok kez kapanabilir) */
  key: number;
  id: ToastId;
  tone: ToastTone;
  title: ReactNode;
  description?: ReactNode;
  reason: ToastCloseReason;
  closedAt: Date;
}

export interface ToastContextValue {
  /** Yeni bildirim gösterir (aynı id varsa onu günceller), id'sini döner */
  toast: (options: ToastOptions) => ToastId;
  /** Açık bir bildirimi günceller (ör. "Kaydediliyor…" → "Kaydedildi"); süre baştan başlar */
  update: (id: ToastId, options: Partial<ToastOptions>) => void;
  /** Belirli bir bildirimi kapatır (dismissible: false olanlar dahil) */
  dismiss: (id: ToastId) => void;
  /** Tüm bildirimleri (sıradakiler dahil) kapatır; dismissible: false olanlar kalır */
  dismissAll: () => void;
  /**
   * Bir işlemi bildirimle izler: önce "loading", işlem bitince "success" ya da "danger".
   * Aynı promise'i geri döndürür, yani await edilebilir.
   */
  promise: <T>(promise: Promise<T>, messages: ToastPromiseMessages<T>) => Promise<T>;
}

export interface ToastHistoryValue {
  /** Kapanan bildirimler, en yenisi başta */
  entries: ToastHistoryEntry[];
  /** Geçmişi temizler */
  clear: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);
// Geçmiş ayrı bağlamda: her kapanışta değişir; useToast() kullanan bileşenler bundan dolayı yeniden çizilmesin
const ToastHistoryContext = createContext<ToastHistoryValue | null>(null);

/** Bileşen içinden toast göstermek için: const { toast } = useToast(); */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast, <ToastProvider> içinde kullanılmalı");
  return ctx;
}

/** Kapanan bildirimlerin listesi: const { entries, clear } = useToastHistory(); */
export function useToastHistory(): ToastHistoryValue {
  const ctx = useContext(ToastHistoryContext);
  if (!ctx) throw new Error("useToastHistory, <ToastProvider> içinde kullanılmalı");
  return ctx;
}

/** Kapanış animasyonunun süresi (ms); bu süre sonunda bildirim DOM'dan kaldırılır */
export const TOAST_EXIT_MS = 200;
/** Bu kadar piksel (veya kartın %40'ı, hangisi küçükse) yana kaydırılınca bildirim kapanır */
export const TOAST_SWIPE_PX = 80;

/** Yığın görünümü: kapalıyken arkadaki kartların ne kadar görüneceği (px) ve en fazla kaç kart görüneceği */
const STACK_PEEK_PX = 10;
const STACK_VISIBLE = 3;
const STACK_GAP_PX = 8;
/** Henüz ölçülmemiş kart için varsayılan yükseklik */
const FALLBACK_HEIGHT = 64;

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
   * Yığın görünümü: bildirimler deste gibi üst üste durur, ekranı az kaplar. Fareyle üzerine gelince,
   * klavyeyle odaklanınca ya da dokununca açılır; açıkken hepsinin süresi durur. Varsayılan: false
   */
  stack?: boolean;
  /** Geçmişte en fazla kaç kayıt tutulsun. Varsayılan: 20 */
  historyLimit?: number;
  /**
   * Bildirim bölgesinin ekran okuyucudaki adı. Varsayılan: "Bildirimler".
   * Sayfada birden fazla Provider varsa her birine farklı ad ver (aynı adlı iki bölge ayırt edilemez).
   */
  label?: string;
  /** Odağı bildirimlere taşıyan klavye kısayolu. Varsayılan: "F8". false ise kapalı. */
  hotkey?: string | false;
}

const defaultDuration = (tone?: ToastTone, dismissible?: boolean) => (tone === "loading" || dismissible === false ? 0 : 4000);

/** Sekme arka plandayken true: kullanıcı bakmıyorken bildirimlerin süresi işlemesin */
function usePageHidden() {
  const [hidden, setHidden] = useState(() => typeof document !== "undefined" && document.visibilityState === "hidden");
  useEffect(() => {
    const onChange = () => setHidden(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);
  return hidden;
}

/** Uygulamayı (veya bir bölümünü) sarar; içindeki herkes useToast() kullanabilir. */
export function ToastProvider({
  children,
  position = "bottom-right",
  max = 4,
  stack = false,
  historyLimit = 20,
  label = "Bildirimler",
  hotkey = "F8",
}: ToastProviderProps) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const [history, setHistory] = useState<ToastHistoryEntry[]>([]);
  const nextId = useRef(1);
  const nextHistoryKey = useRef(1);
  const regionRef = useRef<HTMLDivElement>(null);
  /** F8 ile bildirimlere atlamadan önce odağın olduğu yer: Esc ile oraya dönülür */
  const returnFocus = useRef<HTMLElement | null>(null);
  /** onClose'u çağırabilmek için güncel liste (state güncelleyicisinin içinde yan etki yapılmaz) */
  const itemsRef = useRef(items);
  itemsRef.current = items;
  /** Kapanmakta olanlar: aynı bildirim iki kez kapatılırsa onClose iki kez çağrılmasın */
  const closing = useRef(new Set<ToastId>());
  const historyLimitRef = useRef(historyLimit);
  historyLimitRef.current = historyLimit;

  const close = useCallback((ids: ToastId[], reason: ToastCloseReason) => {
    const targets = ids.filter((id) => !closing.current.has(id) && itemsRef.current.some((t) => t.id === id && !t.leaving));
    if (!targets.length) return;
    const closedAt = new Date();
    const entries: ToastHistoryEntry[] = [];
    for (const id of targets) {
      closing.current.add(id);
      const item = itemsRef.current.find((t) => t.id === id);
      if (!item) continue;
      item.onClose?.(reason);
      entries.unshift({ key: nextHistoryKey.current++, id, tone: item.tone ?? "info", title: item.title, description: item.description, reason, closedAt });
    }
    setHistory((p) => [...entries, ...p].slice(0, historyLimitRef.current));
    // Önce kapanış animasyonu, sonra DOM'dan kaldır
    setItems((p) => p.map((t) => (targets.includes(t.id) ? { ...t, leaving: true } : t)));
    window.setTimeout(() => {
      setItems((p) => p.filter((t) => !(targets.includes(t.id) && t.leaving)));
      for (const id of targets) closing.current.delete(id);
    }, TOAST_EXIT_MS);
  }, []);

  const dismiss = useCallback((id: ToastId) => close([id], "dismiss"), [close]);
  const dismissAll = useCallback(
    () => close(itemsRef.current.filter((t) => t.dismissible !== false).map((t) => t.id), "dismissAll"),
    [close],
  );

  const update = useCallback((id: ToastId, options: Partial<ToastOptions>) => {
    setItems((p) =>
      p.map((t) => {
        if (t.id !== id) return t;
        const tone = options.tone ?? t.tone;
        const dismissible = options.dismissible ?? t.dismissible;
        // Ton veya kapatılabilirlik değiştiyse ve süre verilmediyse yeni durumun varsayılan süresi geçerli
        const changed = (options.tone !== undefined && options.tone !== t.tone) || (options.dismissible !== undefined && options.dismissible !== t.dismissible);
        return {
          ...t,
          ...options,
          id,
          duration: options.duration ?? (changed ? defaultDuration(tone, dismissible) : t.duration),
          version: t.version + 1,
        };
      }),
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
  const clearHistory = useCallback(() => setHistory([]), []);
  const historyValue = useMemo(() => ({ entries: history, clear: clearHistory }), [history, clearHistory]);

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

  /* ---------- Yığın görünümü ---------- */
  const pageHidden = usePageHidden();
  const [hovered, setHovered] = useState(false);
  const [focusedWithin, setFocusedWithin] = useState(false);
  const [tapped, setTapped] = useState(false);
  const expanded = stack && (hovered || focusedWithin || tapped);
  const [heights, setHeights] = useState<Record<string, number>>({});
  const reportHeight = useCallback((id: ToastId, h: number) => {
    setHeights((p) => (p[String(id)] === h ? p : { ...p, [String(id)]: h }));
  }, []);

  // Dokunarak açılan deste, dışarı dokununca kapanır (dokunmatikte "fare ayrıldı" olayı yok)
  useEffect(() => {
    if (!tapped) return;
    const onDown = (e: globalThis.PointerEvent) => {
      if (!regionRef.current?.contains(e.target as Node)) setTapped(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [tapped]);

  // Sıra: kapanmakta olanlar animasyonunu bitirir; geri kalanların ilk `max` tanesi görünür.
  // Kapatılamayan (önemli) bildirimler sırada beklemez, öne alınır.
  const waiting = items.filter((t) => !t.leaving);
  const prioritized = [...waiting.filter((t) => t.dismissible === false), ...waiting.filter((t) => t.dismissible !== false)];
  const shownIds = new Set(prioritized.slice(0, max).map((t) => t.id));
  const queued = waiting.length - shownIds.size;
  const visible = items.filter((t) => t.leaving || shownIds.has(t.id));

  const fromBottom = position.startsWith("bottom");
  const heightOf = (id: ToastId) => heights[String(id)] || FALLBACK_HEIGHT;
  // Yığında en yeni kart öndedir (0), eskiler arkada
  const stackLayout = (index: number) => {
    const dir = fromBottom ? -1 : 1;
    if (expanded) {
      let y = 0;
      for (let j = visible.length - 1; j > visible.length - 1 - index; j--) y += heightOf(visible[j].id) + STACK_GAP_PX;
      return { y: dir * y, scale: 1, hidden: false, clipHeight: undefined, z: 100 - index, anchor: fromBottom ? "bottom" : "top" } as const;
    }
    const front = visible[visible.length - 1];
    return {
      y: dir * Math.min(index, STACK_VISIBLE - 1) * STACK_PEEK_PX,
      scale: 1 - Math.min(index, STACK_VISIBLE - 1) * 0.05,
      hidden: index >= STACK_VISIBLE,
      // Arkadaki kartlar öndekinin boyuna kırpılır: uzun bir kart desteden taşmasın
      clipHeight: index > 0 && front ? heightOf(front.id) : undefined,
      z: 100 - index,
      anchor: fromBottom ? "bottom" : "top",
    } as const;
  };
  const stackHeight = !visible.length
    ? 0
    : expanded
      ? visible.reduce((sum, t) => sum + heightOf(t.id), 0) + STACK_GAP_PX * (visible.length - 1)
      : heightOf(visible[visible.length - 1].id) + STACK_PEEK_PX * Math.min(visible.length - 1, STACK_VISIBLE - 1);

  const cards = visible.map((t, i) => (
    <Toast
      key={t.id}
      {...t}
      // Sekme gizliyken ya da deste açıkken (kullanıcı okuyor) hepsinin süresi durur
      paused={pageHidden || expanded}
      stack={stack ? stackLayout(visible.length - 1 - i) : undefined}
      onHeight={stack ? (h) => reportHeight(t.id, h) : undefined}
      onDismiss={(reason) => close([t.id], reason)}
      onEscape={() => closeWithKeyboard(t.id)}
    />
  ));

  return (
    <ToastContext.Provider value={value}>
      <ToastHistoryContext.Provider value={historyValue}>
        {children}
        <div
          ref={regionRef}
          role="region"
          aria-label={label}
          aria-keyshortcuts={hotkey || undefined}
          tabIndex={-1}
          onFocus={() => setFocusedWithin(true)}
          onBlur={(e: FocusEvent<HTMLDivElement>) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusedWithin(false);
          }}
          className={cn(
            "pointer-events-none fixed z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 outline-none",
            positionClasses[position],
          )}
        >
          {stack ? (
            visible.length > 0 && (
              <div
                data-testid="toast-stack"
                data-expanded={expanded || undefined}
                className="pointer-events-auto relative w-full transition-[height] duration-200 ease-out"
                style={{ height: stackHeight }}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                onPointerDown={(e) => {
                  if (e.pointerType === "touch") setTapped(true);
                }}
              >
                {cards}
              </div>
            )
          ) : (
            cards
          )}
          {queued > 0 && (
            <p className="glass-strong pointer-events-auto rounded-full px-3 py-1 text-xs text-fg-muted">
              +{queued} bildirim sırada
            </p>
          )}
        </div>
      </ToastHistoryContext.Provider>
    </ToastContext.Provider>
  );
}

const toneStyles: Record<ToastTone, { icon: string; path?: ReactNode; bar: string; dot: string }> = {
  info: { icon: "text-info", path: <path d="M12 11v5M12 8v.01" />, bar: "bg-info", dot: "bg-info" },
  success: { icon: "text-success", path: <path d="M8 12.5l3 3 5-6" />, bar: "bg-success", dot: "bg-success" },
  warning: { icon: "text-warning", path: <path d="M12 8v5M12 16v.01" />, bar: "bg-warning", dot: "bg-warning" },
  danger: { icon: "text-danger", path: <path d="M9 9l6 6M15 9l-6 6" />, bar: "bg-danger", dot: "bg-danger" },
  loading: { icon: "text-primary", bar: "bg-primary", dot: "bg-primary" },
};

/** Yığın görünümünde bir kartın yeri (Provider hesaplar) */
export interface ToastStackLayout {
  /** Dikey kayma (px) */
  y: number;
  scale: number;
  /** Destenin çok gerisinde kalan kart görünmez */
  hidden: boolean;
  /** Arkadaki kart bu yüksekliğe kırpılır */
  clipHeight?: number;
  z: number;
  /** Kartın yaslandığı kenar */
  anchor: "top" | "bottom";
}

export interface ToastProps extends Omit<ToastOptions, "onClose"> {
  /** Kapatma isteği ve nedeni */
  onDismiss: (reason: ToastCloseReason) => void;
  /** Esc ile kapatılınca (odak yönetimi için ayrı) */
  onEscape?: () => void;
  /** Kapanış animasyonu oynuyor */
  leaving?: boolean;
  /** Değişince süre ve süre çubuğu baştan başlar */
  version?: number;
  /** Dışarıdan süreyi durdurur (ör. sekme gizliyken) */
  paused?: boolean;
  /** Yığın görünümündeki yeri; verilmezse normal liste öğesi gibi durur */
  stack?: ToastStackLayout;
  /** Kartın doğal yüksekliğini bildirir (yığın hesabı için) */
  onHeight?: (height: number) => void;
}

/**
 * Tek bir toast kartı. Fare üzerindeyken veya odaktayken süre durur; Esc ile kapanır;
 * parmakla (ya da fareyle sürükleyerek) yana kaydırılınca kapanır.
 */
export function Toast({
  tone = "info",
  title,
  description,
  dismissible = true,
  duration = defaultDuration(tone, dismissible),
  action,
  onDismiss,
  onEscape,
  leaving = false,
  version = 0,
  paused: pausedFromOutside = false,
  stack,
  onHeight,
}: ToastProps) {
  const [pausedHere, setPausedHere] = useState(false);
  const paused = pausedHere || pausedFromOutside;
  const remaining = useRef(duration);
  const rootRef = useRef<HTMLDivElement>(null);
  // Her render'da yeni fonksiyon gelse de zamanlayıcı baştan kurulmasın
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  // Güncellenince (version) süre baştan başlar
  useEffect(() => {
    remaining.current = duration;
  }, [version, duration]);

  // Yığın hesabı için doğal yükseklik; kırpılmışken ölçülmez (yanlış, kısa değer verirdi)
  const clipped = stack?.clipHeight !== undefined;
  useLayoutEffect(() => {
    if (!onHeight || clipped || !rootRef.current) return;
    onHeight(rootRef.current.offsetHeight);
  });

  /* ---------- Kaydırarak kapatma ---------- */
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ x: number; id: number; active: boolean } | null>(null);
  /** Sürükleme bittikten hemen sonra gelen tıklama yutulur (yanlışlıkla × veya eyleme basılmasın) */
  const suppressClick = useRef(false);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || leaving || !dismissible) return;
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
    if (e.key === "Escape" && dismissible) {
      e.stopPropagation();
      if (onEscape) onEscape();
      else onDismiss("escape");
    }
  };

  // Yığın yeri "translate/scale" ile verilir; kaydırma "transform" ile: ikisi birbirini ezmez
  const style: CSSProperties = {};
  if (stack) {
    style.translate = `0 ${stack.y}px`;
    style.scale = String(stack.scale);
    style.zIndex = stack.z;
    if (stack.clipHeight !== undefined) style.height = stack.clipHeight;
    if (stack.hidden) style.opacity = 0;
  }
  if (offset) {
    style.transform = `translateX(${offset}px)`;
    style.opacity = Math.max(0.2, 1 - Math.abs(offset) / 240);
    if (dragging) style.transition = "none";
  }

  return (
    <div
      ref={rootRef}
      data-toast=""
      // danger acil: ekran okuyucu hemen okur (alert); diğerleri sırasını bekler (status)
      role={tone === "danger" ? "alert" : "status"}
      aria-hidden={leaving || stack?.hidden || undefined}
      inert={leaving || stack?.hidden}
      onMouseEnter={() => setPausedHere(true)}
      onMouseLeave={() => setPausedHere(false)}
      onFocus={() => setPausedHere(true)}
      onBlur={() => setPausedHere(false)}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => endDrag(e)}
      onPointerCancel={(e) => endDrag(e, true)}
      onClickCapture={onClickCapture}
      style={style}
      // touch-pan-y: dikey kaydırma sayfayı kaydırmaya devam eder, yatay hareket bildirimi sürükler
      // Ton, ikonun ve süre çubuğunun renginden okunur (kenarda renkli şerit yok)
      className={cn(
        "glass-strong pointer-events-auto flex w-full touch-pan-y animate-[toast-in_200ms_ease-out] gap-3 overflow-hidden rounded-card p-3.5 select-none",
        "transition-[opacity,translate,transform,scale,height] duration-200 ease-out",
        stack ? cn("absolute inset-x-0", stack.anchor === "bottom" ? "bottom-0" : "top-0") : "relative",
        // Arkadaki kırpılmış kartın içeriği gizlenir; yalnızca kenarı görünür
        clipped && "[&>*]:opacity-0",
        "[&>*]:transition-opacity",
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
      {dismissible && (
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
      )}
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

/* ---------- Geçmiş ---------- */

export interface ToastHistoryProps {
  className?: string;
  /** Liste başlığı. Varsayılan: "Bildirim geçmişi" */
  title?: string;
}

const timeFormat = new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

/**
 * Kapanan bildirimlerin listesi (en yenisi üstte). Kaçırılan bir bildirim sonradan buradan okunur.
 * <ToastProvider> içinde kullanılır; o Provider'ın geçmişini gösterir.
 */
export function ToastHistory({ className, title = "Bildirim geçmişi" }: ToastHistoryProps) {
  const { entries, clear } = useToastHistory();
  return (
    <section aria-label={title} className={cn("glass flex w-full flex-col rounded-card", className)}>
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
        <h4 className="text-sm font-semibold">
          {title} <span className="font-normal text-fg-muted">({entries.length})</span>
        </h4>
        <button
          type="button"
          onClick={clear}
          disabled={!entries.length}
          className="-mx-2 -my-1.5 rounded-control px-2 py-1.5 text-xs text-primary hover:underline disabled:cursor-not-allowed disabled:text-fg-muted disabled:no-underline"
        >
          Temizle
        </button>
      </header>
      {entries.length === 0 ? (
        <p className="px-4 py-3 text-sm text-fg-muted">Henüz kapanan bildirim yok.</p>
      ) : (
        <ol className="flex max-h-64 flex-col divide-y divide-border overflow-y-auto">
          {entries.map((e) => (
            <li key={e.key} className="flex items-start gap-3 px-4 py-2.5 text-sm">
              <span aria-hidden="true" className={cn("mt-1.5 size-2 shrink-0 rounded-full", toneStyles[e.tone].dot)} />
              <div className="min-w-0 flex-1">
                <p className="font-medium break-words text-fg">{e.title}</p>
                {e.description && <p className="break-words text-fg-muted">{e.description}</p>}
                <p className="mt-0.5 text-xs text-fg-muted">
                  <time dateTime={e.closedAt.toISOString()}>{timeFormat.format(e.closedAt)}</time> · {TOAST_CLOSE_REASON_LABELS[e.reason]}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
