import { useEffect, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import { Button, ButtonGroup, ConfirmButton, IconButton, ToggleButton, TOAST_CLOSE_REASON_LABELS, ToastHistory, ToastProvider, useToast } from "./components";
import type { ButtonSize, ButtonVariant, ToastId, ToastPosition, ToastTone } from "./components";
import { cn } from "./lib/cn";

/*
  Button ve Toast için playground sayfası:
  her bileşenin canlı önizlemesi, prop'larını değiştiren kontroller, üretilen kod,
  örnekler ve prop tablosu.
*/

/* ---------- Ortak parçalar ---------- */

type Control =
  | { name: string; type: "select"; options: string[]; hint: string }
  | { name: string; type: "boolean"; hint: string }
  | { name: string; type: "text"; hint: string };

type Values = Record<string, string | boolean>;

// scope = bölüm id'si; yalnız prop adı kullanılsaydı iki bölümdeki "size" kontrolü aynı id'yi alırdı
function ControlField({ scope, control, value, onChange }: { scope: string; control: Control; value: string | boolean; onChange: (v: string | boolean) => void }) {
  const id = `${scope}-ctl-${control.name}`;
  const hintId = `${id}-hint`;
  const fieldClass = "w-full rounded-control border border-border-strong bg-surface px-2 py-1.5 text-sm";
  const hint = (
    <span id={hintId} className="text-xs leading-snug text-fg-muted">
      {control.hint}
    </span>
  );
  if (control.type === "boolean") {
    return (
      <div className="flex flex-col gap-0.5">
        <label htmlFor={id} className="flex items-center justify-between gap-3 text-sm">
          <span className="font-mono text-fg">{control.name}</span>
          <input id={id} type="checkbox" className="size-4 accent-primary" checked={value as boolean} aria-describedby={hintId} onChange={(e) => onChange(e.target.checked)} />
        </label>
        {hint}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1 text-sm">
      <label htmlFor={id} className="font-mono text-fg">
        {control.name}
      </label>
      {control.type === "select" ? (
        <select id={id} className={fieldClass} value={value as string} aria-describedby={hintId} onChange={(e) => onChange(e.target.value)}>
          {control.options.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      ) : (
        <input id={id} className={fieldClass} value={value as string} aria-describedby={hintId} onChange={(e) => onChange(e.target.value)} />
      )}
      {hint}
    </div>
  );
}

interface PropRow {
  name: string;
  type: string;
  default?: string;
  description: string;
}

function PropTable({ rows }: { rows: PropRow[] }) {
  return (
    <>
      {/* Telefonda: her prop bir kart (dört sütunlu tablo yana taşıyordu) */}
      <dl className="glass flex flex-col divide-y divide-border rounded-card sm:hidden">
        {rows.map((p) => (
          <div key={p.name} className="flex flex-col gap-1 p-4 text-sm">
            <dt className="font-mono font-medium break-words text-primary">{p.name}</dt>
            <dd className="font-mono text-xs break-words text-fg-muted">
              {p.type}
              {p.default !== undefined && <span className="text-fg"> · varsayılan: {p.default}</span>}
            </dd>
            <dd className="text-fg">{p.description}</dd>
          </div>
        ))}
      </dl>
      <PropTableWide rows={rows} />
    </>
  );
}

function PropTableWide({ rows }: { rows: PropRow[] }) {
  return (
    <div className="glass hidden overflow-x-auto rounded-card sm:block">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="bg-surface-muted text-fg-muted">
          <tr>
            <th className="px-4 py-2 font-medium">Prop</th>
            <th className="px-4 py-2 font-medium">Tip</th>
            <th className="px-4 py-2 font-medium">Varsayılan</th>
            <th className="px-4 py-2 font-medium">Açıklama</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.name} className="border-t border-border align-top">
              <td className="px-4 py-2 font-mono text-primary">{p.name}</td>
              <td className="px-4 py-2 font-mono text-xs">{p.type}</td>
              <td className="px-4 py-2 font-mono text-xs">{p.default ?? "yok"}</td>
              <td className="px-4 py-2">{p.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const { toast } = useToast();
  return (
    <button
      className="shrink-0 rounded-control border border-border px-2 py-1 text-xs text-fg-muted hover:border-border-strong hover:text-fg"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          toast({ tone: "success", title: "Kod kopyalandı", duration: 2000 });
        } catch {
          toast({ tone: "warning", title: "Kopyalanamadı", description: "Tarayıcı panoya erişime izin vermedi." });
        }
      }}
    >
      Kopyala
    </button>
  );
}

/*
  Paylaşılabilir link: prop ayarları adrese yazılır, link açılınca aynı ayarlarla gelir.
  Biçim: ?button.variant=danger&button.loading=true&toast.tone=warning
  - Yalnızca VARSAYILANDAN FARKLI değerler yazılır (linkler kısa kalır).
  - Adres "replaceState" ile güncellenir: her tıklama geri tuşuna yeni kayıt eklemez.
  - #button / #toast bağlantıları (hash) bundan etkilenmez.
*/
function readUrlValues(prefix: string, controls: Control[], defaults: Values): Values {
  const params = new URLSearchParams(window.location.search);
  const values: Values = { ...defaults };
  for (const c of controls) {
    const raw = params.get(`${prefix}.${c.name}`);
    if (raw === null) continue;
    if (c.type === "boolean") values[c.name] = raw === "true";
    else if (c.type === "select") values[c.name] = c.options.includes(raw) ? raw : defaults[c.name]; // geçersiz değer yok sayılır
    else values[c.name] = raw;
  }
  return values;
}

function writeUrlValues(prefix: string, values: Values, defaults: Values) {
  const params = new URLSearchParams(window.location.search);
  for (const key of [...params.keys()]) if (key.startsWith(`${prefix}.`)) params.delete(key);
  for (const [k, v] of Object.entries(values)) if (v !== defaults[k]) params.set(`${prefix}.${k}`, String(v));
  const q = params.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${q ? `?${q}` : ""}${window.location.hash}`);
}

/** Bir bölümün prop değerleri: adresten başlar, değişince adrese yazılır */
function useUrlValues(prefix: string, controls: Control[], defaults: Values) {
  const [values, setValues] = useState<Values>(() => readUrlValues(prefix, controls, defaults));
  useEffect(() => writeUrlValues(prefix, values, defaults), [prefix, values, defaults]);
  return [values, setValues] as const;
}

/** Bölüm başlığındaki "Linki kopyala": yalnızca bu bölümün ayarlarını taşıyan link */
function ShareLinkButton({ id }: { id: string }) {
  const { toast } = useToast();
  return (
    <Button
      size="sm"
      variant="secondary"
      onClick={async () => {
        // Diğer bölümün ayarları linke karışmasın
        const params = new URLSearchParams(window.location.search);
        for (const key of [...params.keys()]) if (!key.startsWith(`${id}.`)) params.delete(key);
        const q = params.toString();
        const url = `${window.location.origin}${window.location.pathname}${q ? `?${q}` : ""}#${id}`;
        try {
          await navigator.clipboard.writeText(url);
          toast({ tone: "success", title: "Link kopyalandı", description: "Açan kişi bu ayarlarla görür.", duration: 2500 });
        } catch {
          toast({ tone: "warning", title: "Kopyalanamadı", description: "Adres çubuğundaki linki elle kopyalayabilirsin." });
        }
      }}
    >
      Linki kopyala
    </Button>
  );
}

interface Guidance {
  use: string[];
  avoid: string[];
}

/** "Ne zaman kullanılır?": benzer bileşenler arasında doğru seçimi anlatır */
function GuidanceBlock({ id, guidance }: { id: string; guidance: Guidance }) {
  return (
    <div className="flex flex-col gap-4">
      <h3 id={`${id}-guidance`} className="text-lg font-semibold">
        Ne zaman kullanılır?
      </h3>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
        <div className="glass rounded-card p-4">
          <h4 className="text-sm font-semibold text-success">Kullan</h4>
          <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-sm marker:text-fg-muted">
            {guidance.use.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
        <div className="glass rounded-card p-4">
          <h4 className="text-sm font-semibold text-danger">Kullanma</h4>
          <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-sm marker:text-fg-muted">
            {guidance.avoid.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/** Bir bileşenin sayfası: başlık, canlı önizleme + kontroller + kod, rehber, örnekler, prop tablosu */
function ComponentSection({
  id,
  title,
  description,
  controls,
  values,
  defaults,
  onValuesChange,
  preview,
  code,
  guidance,
  examples,
  props,
}: {
  id: string;
  title: string;
  description: string;
  controls: Control[];
  values: Values;
  defaults: Values;
  onValuesChange: (v: Values) => void;
  preview: ReactNode;
  code: string;
  guidance: Guidance;
  examples: { title: string; content: ReactNode }[];
  props: PropRow[];
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="flex scroll-mt-4 flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {/*
            İnce, geniş harfli başlık; renk metinden vurgu rengine yumuşak geçer.
            Büyük yazı olduğu için 3:1 kontrast yeterli; vurgu ucu en yoğun zeminde bile bunu aşar.
          */}
          <h2
            id={`${id}-title`}
            className="w-fit bg-linear-to-r from-fg from-30% to-primary bg-clip-text pb-1 font-display text-4xl font-light tracking-tight text-transparent sm:text-5xl"
          >
            {title}
          </h2>
          <p className="mt-2 max-w-2xl text-fg-muted">{description}</p>
        </div>
        <ShareLinkButton id={id} />
      </header>

      {/*
        Telefonda kontroller önizlemenin ALTINDA kalıyor; ayar değiştirirken önizleme ekrandan çıkmasın diye
        önizleme kaydırırken üstte yapışık durur (yalnızca bu bölüm boyunca). Yapışkanlık overflow-hidden ile
        çalışmadığı için köşe kırpma yalnızca geniş ekranda; telefonda köşeler parçalara ayrı verilir.
      */}
      <div className="glass grid grid-cols-[minmax(0,1fr)] rounded-card lg:grid-cols-[minmax(0,1fr)_260px] lg:overflow-hidden">
        <div
          data-testid={`${id}-preview`}
          className="flex min-h-56 items-center justify-center bg-surface-muted/30 p-6 sm:p-10 max-lg:sticky max-lg:top-0 max-lg:z-20 max-lg:min-h-36 max-lg:rounded-t-card max-lg:border-b max-lg:border-border max-lg:bg-surface max-lg:p-5"
        >
          {preview}
        </div>
        <div className="flex flex-col gap-4 border-t border-border bg-surface/20 p-4 lg:border-t-0 lg:border-l">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Props</h3>
            <button
              type="button"
              // -m/p: görünüm aynı, dokunma alanı en az 24 px (telefonda parmakla basılabilsin)
              className="-mx-2 -my-1.5 rounded-control px-2 py-1.5 text-xs text-primary hover:underline disabled:cursor-not-allowed disabled:text-fg-muted disabled:no-underline"
              disabled={controls.every((c) => values[c.name] === defaults[c.name])}
              onClick={() => onValuesChange(defaults)}
            >
              Sıfırla
            </button>
          </div>
          <p className="-mt-2 text-xs text-fg-muted">Değiştir, önizleme ve aşağıdaki kod anında güncellenir.</p>
          {controls.map((c) => (
            <ControlField key={c.name} scope={id} control={c} value={values[c.name]} onChange={(v) => onValuesChange({ ...values, [c.name]: v })} />
          ))}
        </div>
        <div className="flex items-start justify-between gap-2 border-t border-border bg-surface-muted/40 p-4 max-lg:rounded-b-card lg:col-span-2">
          <pre className="min-w-0 flex-1 overflow-x-auto text-sm text-fg">
            <code>{code}</code>
          </pre>
          <CopyButton text={code} />
        </div>
      </div>

      <GuidanceBlock id={id} guidance={guidance} />

      <div className="flex flex-col gap-4">
        <h3 className="text-lg font-semibold">Örnekler</h3>
        {examples.map((ex) => (
          <div key={ex.title} className="glass rounded-card p-4">
            <h4 className="mb-3 text-sm font-medium text-fg-muted">{ex.title}</h4>
            <div className="flex flex-wrap items-center gap-3">{ex.content}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        <h3 className="text-lg font-semibold">Prop dokümantasyonu</h3>
        <PropTable rows={props} />
      </div>
    </section>
  );
}

/* ---------- Button ---------- */

const PlusIcon = () => (
  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
  </svg>
);
const ArrowIcon = () => (
  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

const TrashIcon = () => (
  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12h10l1-12M9 7V4h6v3" />
  </svg>
);
const EditIcon = () => (
  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 20h4L19 9l-4-4L4 16v4z" />
  </svg>
);
const UploadIcon = () => (
  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 15V4M7 9l5-5 5 5M5 20h14" />
  </svg>
);
const CopyIcon = () => (
  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 9h10v10H9zM5 15V5h10" />
  </svg>
);
const RefreshIcon = () => (
  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" />
  </svg>
);

const buttonControls: Control[] = [
  { name: "variant", type: "select", options: ["primary", "secondary", "ghost", "danger"], hint: "Görsel stil: ana eylem, ikincil, sade, tehlikeli" },
  { name: "size", type: "select", options: ["sm", "md", "lg"], hint: "Yükseklik ve yazı boyutu" },
  { name: "children", type: "text", hint: "Butonun yazısı" },
  { name: "loading", type: "boolean", hint: "Spinner gösterir, tıklamayı engeller; genişlik sabit kalır" },
  { name: "loadingText", type: "text", hint: "Yüklenirken metnin yerine geçer (loading açıkken görünür)" },
  { name: "success", type: "boolean", hint: "✓ ikonu gösterir: işlem bitti geri bildirimi; genişlik sabit kalır" },
  { name: "successText", type: "text", hint: "success açıkken metnin yerine geçer (ör. Kaydedildi)" },
  { name: "error", type: "boolean", hint: "✕ ikonu, kırmızı renk ve kısa sallanma: işlem başarısız" },
  { name: "errorText", type: "text", hint: "error açıkken metnin yerine geçer (ör. Kaydedilemedi)" },
  { name: "progress", type: "select", options: ["yok", "0.3", "0.7"], hint: "İlerleme: buton soldan sağa dolar ve yüzdeyi gösterir" },
  { name: "shortcut", type: "text", hint: "Klavye kısayolu, ör. Mod+K (Mod = Mac'te ⌘, diğerlerinde Ctrl)" },
  { name: "disabled", type: "boolean", hint: "Butonu pasif yapar" },
  { name: "disabledReason", type: "text", hint: "Pasifliğin nedeni: buton odaklanabilir kalır, neden üzerine gelince görünür" },
  { name: "href", type: "text", hint: "Verilirse <a> (bağlantı) olarak çizilir; görünüm aynı kalır" },
  { name: "fullWidth", type: "boolean", hint: "Bulunduğu alanın tamamını kaplar" },
  { name: "leftIcon", type: "boolean", hint: "Metnin soluna ikon ekler" },
];
const buttonDefaults: Values = {
  variant: "primary",
  size: "md",
  children: "Kaydet",
  loading: false,
  loadingText: "",
  success: false,
  successText: "",
  error: false,
  errorText: "",
  progress: "yok",
  shortcut: "",
  disabled: false,
  disabledReason: "",
  href: "",
  fullWidth: false,
  leftIcon: false,
};

function buttonCode(v: Values) {
  const a: string[] = [];
  if (v.href) a.push(`href="${v.href}"`);
  if (v.variant !== "primary") a.push(`variant="${v.variant}"`);
  if (v.size !== "md") a.push(`size="${v.size}"`);
  if (v.loading) a.push("loading");
  if (v.loadingText) a.push(`loadingText="${v.loadingText}"`);
  if (v.success) a.push("success");
  if (v.successText) a.push(`successText="${v.successText}"`);
  if (v.error) a.push("error");
  if (v.errorText) a.push(`errorText="${v.errorText}"`);
  if (v.progress !== "yok") a.push(`progress={${v.progress}}`);
  if (v.shortcut) a.push(`shortcut="${v.shortcut}"`);
  if (v.disabled) a.push("disabled");
  if (v.disabledReason) a.push(`disabledReason="${v.disabledReason}"`);
  if (v.fullWidth) a.push("fullWidth");
  if (v.leftIcon) a.push("leftIcon={<PlusIcon />}");
  return `${a.length ? `<Button ${a.join(" ")}>` : "<Button>"}${v.children}</Button>`;
}

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

/**
 * Kendi kendini yöneten buton: onClick bir Promise döndürünce (async) buton yükleniyor → ✓ / ✕ durumlarını
 * kendisi gösterir. Hiçbir state tutmaya gerek yok.
 */
function SaveDemo() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button loadingText="Kaydediliyor…" successText="Kaydedildi" onClick={async () => wait(1200)}>
        Değişiklikleri kaydet
      </Button>
      <Button
        variant="secondary"
        loadingText="Gönderiliyor…"
        errorText="Gönderilemedi"
        onClick={async () => {
          await wait(1200);
          throw new Error("Sunucuya ulaşılamadı");
        }}
      >
        Hatalı işlem dene
      </Button>
      <span className="w-full text-sm text-fg-muted">Sonuç butonun üstünde görünür; buton genişliği ve yanındaki yazı yerinde kalır.</span>
    </div>
  );
}

/** Klavye kısayolu: Ctrl+S (Mac'te ⌘S) butona basılmış gibi çalışır; tarayıcının "sayfayı kaydet"i açılmaz */
function ShortcutDemo() {
  const { toast } = useToast();
  return (
    <>
      <Button
        shortcut="Mod+S"
        loadingText="Kaydediliyor…"
        successText="Kaydedildi"
        onClick={async () => {
          await wait(800);
          toast({ tone: "success", title: "Kısayolla kaydedildi", duration: 2000 });
        }}
      >
        Kaydet
      </Button>
      <span className="text-sm text-fg-muted">Sayfanın herhangi bir yerinde, bir yazı alanındayken bile çalışır. Dokunmatik ekranda tuş etiketi gizlenir.</span>
    </>
  );
}

const BoldIcon = () => (
  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z" />
  </svg>
);
const ItalicIcon = () => (
  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M10 5h8M6 19h8M14 5l-4 14" />
  </svg>
);

/** Aç/kapa butonları: yazı değişmez, durum "basılı" olarak söylenir */
function ToggleDemo() {
  const [bold, setBold] = useState(true);
  const [italic, setItalic] = useState(false);
  const [muted, setMuted] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <ButtonGroup label="Metin biçimi">
        <ToggleButton size="sm" pressed={bold} onPressedChange={setBold} aria-label="Kalın" title="Kalın" className="px-2!">
          <BoldIcon />
        </ToggleButton>
        <ToggleButton size="sm" pressed={italic} onPressedChange={setItalic} aria-label="İtalik" title="İtalik" className="px-2!">
          <ItalicIcon />
        </ToggleButton>
      </ButtonGroup>
      <ToggleButton size="sm" pressed={muted} onPressedChange={setMuted}>
        Sessize al
      </ToggleButton>
      <p className={cn("text-sm", bold && "font-bold", italic && "italic")}>Örnek metin {muted ? "(sessizde)" : ""}</p>
    </div>
  );
}

/** İlerleme gösteren buton: yükleme sürerken dolar, bitince ✓ */
function ProgressDemo() {
  const [progress, setProgress] = useState<number | undefined>(undefined);
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (progress === undefined) return;
    if (progress >= 1) {
      const t = window.setTimeout(() => {
        setProgress(undefined);
        setDone(true);
      }, 250);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => setProgress((p) => Math.min(1, (p ?? 0) + 0.08 + Math.random() * 0.08)), 180);
    return () => window.clearTimeout(t);
  }, [progress]);
  useEffect(() => {
    if (!done) return;
    const t = window.setTimeout(() => setDone(false), 1800);
    return () => window.clearTimeout(t);
  }, [done]);
  return (
    <>
      <Button
        progress={progress}
        loadingText="Yükleniyor"
        success={done}
        successText="Yüklendi"
        leftIcon={<UploadIcon />}
        onClick={() => setProgress(0)}
      >
        Dosyayı yükle
      </Button>
      <span className="text-sm text-fg-muted">Buton soldan sağa dolar; yüzde yazının yanında görünür.</span>
    </>
  );
}

/** Küçük, sık işlemlerde (kopyala) bildirim yerine butonun kendisi geri bildirim verir */
function CopyDemo() {
  const [copied, setCopied] = useState<string | null>(null);
  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(null), 1500);
    return () => window.clearTimeout(t);
  }, [copied]);
  const copy = (key: string, text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(key);
  };
  return (
    <>
      <Button variant="secondary" success={copied === "link"} successText="Kopyalandı" onClick={() => copy("link", window.location.href)}>
        Bağlantıyı kopyala
      </Button>
      <IconButton icon={<CopyIcon />} label="Kodu kopyala" variant="secondary" success={copied === "code"} onClick={() => copy("code", "<Button>Kaydet</Button>")} />
    </>
  );
}

/** Pasif butonun nedeni: odaklanınca / üzerine gelince / dokununca görünür, ekran okuyucu da okur */
function DisabledReasonDemo() {
  const { toast } = useToast();
  const [accepted, setAccepted] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-4">
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="size-4 accent-primary" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
        Kullanım koşullarını kabul ediyorum
      </label>
      <Button
        disabled={!accepted}
        disabledReason="Önce kullanım koşullarını kabul edin"
        onClick={() => toast({ tone: "success", title: "Hesap oluşturuldu", duration: 2500 })}
      >
        Hesap oluştur
      </Button>
      <span className="w-full text-sm text-fg-muted">Tab ile butona gel: neden görünür. Kutuyu işaretleyince buton çalışır.</span>
    </div>
  );
}

/** Onaylı silme: ilk tıklama "Emin misin?", ikinci tıklama siler; 3 sn içinde basılmazsa vazgeçilir */
function ConfirmDemo() {
  const { toast } = useToast();
  const [projects, setProjects] = useState(["Eski kampanya", "Deneme projesi"]);
  return (
    <ul className="flex w-full max-w-md flex-col divide-y divide-border rounded-card border border-border">
      {projects.length === 0 && (
        <li className="flex items-center justify-between gap-3 px-3 py-2 text-sm text-fg-muted">
          Proje kalmadı.
          <Button size="sm" variant="ghost" onClick={() => setProjects(["Eski kampanya", "Deneme projesi"])}>
            Geri yükle
          </Button>
        </li>
      )}
      {projects.map((p) => (
        <li key={p} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
          {p}
          <ConfirmButton
            size="sm"
            leftIcon={<TrashIcon />}
            onConfirm={() => {
              setProjects((list) => list.filter((x) => x !== p));
              toast({ tone: "danger", title: `"${p}" kalıcı olarak silindi`, duration: 2500 });
            }}
          >
            {/* Görünen yazı "Kalıcı sil"; ekran okuyucu hangi projenin silineceğini de duyar */}
            Kalıcı sil<span className="sr-only"> {p}</span>
          </ConfirmButton>
        </li>
      ))}
    </ul>
  );
}

/** Bağlantı olarak buton: href verilince <a> çizilir (sağ tık → yeni sekmede aç çalışır) */
function LinkDemo() {
  return (
    <>
      <Button href="#toast" variant="secondary" rightIcon={<ArrowIcon />}>
        Toast bölümüne git
      </Button>
      <Button href="#toast" variant="ghost" disabled disabledReason="Bu bağlantı şu an kapalı">
        Kapalı bağlantı
      </Button>
    </>
  );
}

/** Satır işlemleri: yalnızca ikonlu butonlar */
function IconButtonDemo() {
  const { toast } = useToast();
  const [refreshing, setRefreshing] = useState(false);
  return (
    <>
      <IconButton icon={<EditIcon />} label="Düzenle" onClick={() => toast({ title: "Düzenle", duration: 2000 })} />
      <IconButton icon={<TrashIcon />} label="Sil" variant="danger" onClick={() => toast({ tone: "danger", title: "Silindi", duration: 2000 })} />
      <IconButton
        icon={<RefreshIcon />}
        label="Yenile"
        variant="secondary"
        loading={refreshing}
        onClick={() => {
          setRefreshing(true);
          window.setTimeout(() => {
            setRefreshing(false);
            toast({ tone: "success", title: "Liste yenilendi", duration: 2000 });
          }, 1000);
        }}
      />
      <IconButton icon={<EditIcon />} label="Düzenle (küçük)" size="sm" />
      <IconButton icon={<EditIcon />} label="Düzenle (büyük)" size="lg" variant="secondary" />
    </>
  );
}

/** Tek seçimli grup: Gün / Hafta / Ay */
function RangeDemo() {
  const [range, setRange] = useState("week");
  const labels: Record<string, string> = { day: "bugün", week: "bu hafta", month: "bu ay", year: "bu yıl" };
  return (
    <div className="flex flex-wrap items-center gap-3">
      <ButtonGroup
        label="Zaman aralığı"
        value={range}
        onValueChange={setRange}
        options={[
          { value: "day", label: "Gün" },
          { value: "week", label: "Hafta" },
          { value: "month", label: "Ay" },
          { value: "year", label: "Yıl", disabled: true },
        ]}
      />
      <span className="text-sm text-fg-muted" aria-live="polite">
        Gösterilen: {labels[range]}
      </span>
    </div>
  );
}

/** Eylem grubu: birbirine yapışık butonlar */
function ActionGroupDemo() {
  const { toast } = useToast();
  const say = (t: string) => () => toast({ title: t, duration: 2000 });
  return (
    <ButtonGroup label="Belge işlemleri">
      <Button variant="secondary" onClick={say("Kopyalandı")}>Kopyala</Button>
      <Button variant="secondary" onClick={say("Taşındı")}>Taşı</Button>
      <Button variant="secondary" onClick={say("Arşivlendi")}>Arşivle</Button>
    </ButtonGroup>
  );
}

/** Kontrollerdeki değerlerle çizilen önizleme butonu; href doluysa bağlantı hâli */
function ButtonPreview({ values, onPress }: { values: Values; onPress: (title: string) => () => void }) {
  const common = {
    variant: values.variant as ButtonVariant,
    size: values.size as ButtonSize,
    loading: values.loading as boolean,
    loadingText: (values.loadingText as string) || undefined,
    success: values.success as boolean,
    successText: (values.successText as string) || undefined,
    error: values.error as boolean,
    errorText: (values.errorText as string) || undefined,
    progress: values.progress === "yok" ? undefined : Number(values.progress),
    shortcut: (values.shortcut as string) || undefined,
    disabled: values.disabled as boolean,
    disabledReason: (values.disabledReason as string) || undefined,
    fullWidth: values.fullWidth as boolean,
    leftIcon: values.leftIcon ? <PlusIcon /> : undefined,
    children: values.children as string,
  };
  const href = values.href as string;
  if (href) {
    // Önizlemedeki bağlantı sayfadan çıkarmasın: tıklama yalnızca nereye gideceğini söyler
    return (
      <Button
        {...common}
        href={href}
        onClick={(e: MouseEvent<HTMLElement>) => {
          e.preventDefault();
          onPress(`Bağlantı: ${href} adresine giderdi`)();
        }}
      />
    );
  }
  return <Button {...common} onClick={onPress(`"${values.children}" tıklandı`)} />;
}

function ButtonSection() {
  const { toast } = useToast();
  const [values, setValues] = useUrlValues("button", buttonControls, buttonDefaults);
  const say = (title: string) => () => toast({ title, duration: 2000 });
  return (
    <ComponentSection
      id="button"
      title="Button"
      description="Kullanıcının bir eylem başlatması için. Dört varyant, üç boyut; loading, success, error, progress ve disabled durumlarını destekler; onClick async ise bu durumları kendisi yönetir. Klavye kısayolu alabilir. Pasifse nedenini söyleyebilir (disabledReason). href verilince bağlantı (<a>) olarak çizilir. Geri alınamaz işlemler için iki adımlı ConfirmButton vardır."
      controls={buttonControls}
      values={values}
      defaults={buttonDefaults}
      onValuesChange={setValues}
      preview={
        <div className={cn(values.fullWidth && "w-full max-w-sm")}>
          <ButtonPreview values={values} onPress={say} />
        </div>
      }
      code={buttonCode(values)}
      guidance={{
        use: [
          "Bir işlemi başlatmak için: kaydet, gönder, sil, aç.",
          "Sayfadaki en önemli işlem için primary; ikincil işlemler için secondary veya ghost.",
          "Geri alınamaz işlemler için danger; tek tıkla yanlışlıkla yapılmasın diye ConfirmButton (ör. kalıcı sil).",
          "Küçük, sık işlemlerin sonucunu (kopyalandı) bildirim yerine butonun kendisinde göstermek için success.",
          "Bir koşul sağlanana kadar kullanılamayan buton için disabled + disabledReason (neden söylenir).",
          "Sunucuya giden işlemlerde onClick'ten Promise döndür: yükleniyor, başarı ve hata durumlarını buton kendisi gösterir.",
          "Sık kullanılan ana işlem için (kaydet, ara) shortcut; bir şeyi açıp kapatmak için ToggleButton.",
          "Buton görünümünde ama başka sayfaya götüren öğe için href (bağlantı olarak çizilir).",
          "Yer darsa ve ikon herkesçe biliniyorsa IconButton (düzenle, sil, yenile).",
          "Aynı konuya ait birkaç seçenekten biri seçilecekse ButtonGroup (Gün / Hafta / Ay).",
        ],
        avoid: [
          "Başka bir sayfaya gitmek için onClick ile yönlendirme: href ver, sağ tık → yeni sekmede aç da çalışsın.",
          "Aynı alanda birden fazla primary buton: kullanıcı asıl işlemin hangisi olduğunu anlayamaz.",
          "Etiketsiz ikon butonu: IconButton'da label zorunlu, ekran okuyucu onu okur.",
          "Butonu pasif yapıp nedenini söylememek: disabledReason ver.",
          "Uzun işlemlerde loading olmadan bırakmak: kullanıcı tekrar tekrar tıklar.",
          "Geri alınabilen işlemde ConfirmButton: gereksiz ikinci tık; işlemi yap, bildirimde \"Geri al\" sun.",
          "ToggleButton'ın yazısını duruma göre değiştirmek (\"Sessize al\" → \"Sesi aç\"): ekran okuyucu hem yazıyı hem durumu okur, kafa karıştırır.",
          "Tarayıcının bilinen kısayollarını (Ctrl+T, Ctrl+W) ezmek: kullanıcı sekmeyi açıp kapatamaz olur.",
        ],
      }}
      examples={[
        {
          title: "Varyantlar",
          content: (
            <>
              <Button onClick={say("Primary: sayfadaki asıl eylem")}>Primary</Button>
              <Button variant="secondary" onClick={say("Secondary: ikincil eylem")}>Secondary</Button>
              <Button variant="ghost" onClick={say("Ghost: sade, düşük öncelikli eylem")}>Ghost</Button>
              <Button variant="danger" onClick={say("Danger: geri alınamaz eylem")}>Danger</Button>
            </>
          ),
        },
        {
          title: "Boyutlar",
          content: (
            <>
              <Button size="sm" onClick={say("sm: 32 px")}>Küçük</Button>
              <Button size="md" onClick={say("md: 40 px")}>Orta</Button>
              <Button size="lg" onClick={say("lg: 48 px")}>Büyük</Button>
            </>
          ),
        },
        {
          title: "Durumlar: loading ve disabled",
          content: (
            <>
              <Button loading>Kaydediliyor</Button>
              <Button disabled>Pasif</Button>
              <Button variant="secondary" disabled>Pasif ikincil</Button>
            </>
          ),
        },
        {
          title: "İkonlu",
          content: (
            <>
              <Button leftIcon={<PlusIcon />} onClick={say("Yeni kayıt")}>Yeni ekle</Button>
              <Button variant="secondary" rightIcon={<ArrowIcon />} onClick={say("Sonraki adım")}>Devam et</Button>
            </>
          ),
        },
        { title: "Kendi kendini yöneten buton: onClick async ise yükleniyor → ✓ ya da ✕ (state gerekmez)", content: <SaveDemo /> },
        { title: "Başarı geri bildirimi: kopyala → ✓ kopyalandı (bildirim açmadan)", content: <CopyDemo /> },
        { title: "Nedenini söyleyen pasif buton (disabledReason)", content: <DisabledReasonDemo /> },
        { title: "ConfirmButton: iki adımlı onay (3 sn içinde tekrar bas; Esc veya dışarı tıklayınca vazgeçilir)", content: <ConfirmDemo /> },
        { title: "Bağlantı olarak buton (href → <a>)", content: <LinkDemo /> },
        { title: "Klavye kısayolu (shortcut): Ctrl+S / ⌘S", content: <ShortcutDemo /> },
        { title: "ToggleButton: aç/kapa (yazı değişmez, durum \"basılı\" olarak okunur)", content: <ToggleDemo /> },
        { title: "İlerleme gösteren buton (progress)", content: <ProgressDemo /> },
        { title: "IconButton: yalnızca ikon (label zorunlu, üzerine gelince ipucu)", content: <IconButtonDemo /> },
        { title: "ButtonGroup: tek seçim (ok tuşlarıyla gezilir, pasif seçenek atlanır)", content: <RangeDemo /> },
        { title: "ButtonGroup: yapışık eylem butonları", content: <ActionGroupDemo /> },
      ]}
      props={[
        { name: "variant", type: '"primary" | "secondary" | "ghost" | "danger"', default: '"primary"', description: "Görsel stil" },
        { name: "size", type: '"sm" | "md" | "lg"', default: '"md"', description: "Yükseklik ve yazı boyutu" },
        { name: "loading", type: "boolean", default: "false", description: "Spinner gösterir, tıklamayı engeller, aria-busy ekler; yükleme öncesi genişlik korunur" },
        { name: "loadingText", type: "ReactNode", description: "Yüklenirken metnin yerine gösterilir (ör. \"Kaydediliyor…\")" },
        { name: "success", type: "boolean", default: "false", description: "✓ ikonu gösterir (işlem bitti); genişlik korunur. Kısa süre sonra false yapmak sana kalır" },
        { name: "successText", type: "ReactNode", description: "success iken metnin yerine gösterilir (ör. \"Kaydedildi\"); değişiklik ekran okuyucuya duyurulur" },
        { name: "onClick", type: "(e) => unknown", description: "Promise döndürürse (async) buton kendini yönetir: sürerken yükleniyor, bitince ✓ (successText), hata olursa ✕ (errorText); başka state gerekmez" },
        { name: "error / errorText", type: "boolean, ReactNode", default: "false", description: "✕ ikonu, kırmızı renk ve kısa sallanma (hareket azaltma tercihinde sallanmaz); errorText metnin yerine geçer" },
        { name: "feedbackDuration", type: "number (ms)", default: "1800", description: "async onClick sonrası ✓ / ✕ ne kadar görünsün" },
        { name: "progress", type: "number (0–1)", description: "Buton soldan sağa dolar ve yüzdeyi gösterir; bu sürede tıklanamaz. Bitince undefined yap" },
        { name: "shortcut", type: "string", description: "Klavye kısayolu (ör. \"Mod+S\": Mac'te ⌘S, diğerlerinde Ctrl+S). Basılınca buton tıklanmış gibi çalışır; tuş etiketi görünür, ekran okuyucuya aria-keyshortcuts ile söylenir. Tek tuşlu kısayollar yazı yazarken çalışmaz" },
        { name: "disabled", type: "boolean", default: "false", description: "Butonu pasif yapar" },
        { name: "disabledReason", type: "string", description: "Pasifliğin nedeni. Verilirse buton Tab ile odaklanabilir kalır ama çalışmaz; neden üzerine gelince, odaklanınca ve dokununca görünür, ekran okuyucuya açıklama olarak okunur" },
        { name: "href", type: "string", description: "Verilirse <a> çizilir (target, rel gibi bağlantı prop'ları da geçer). Pasifken href kaldırılır" },
        { name: "leftIcon / rightIcon", type: "ReactNode", description: "Metnin solunda / sağında ikon; loading iken sol ikonun yerini spinner, success iken ✓ alır" },
        { name: "fullWidth", type: "boolean", default: "false", description: "Genişliği %100 yapar" },
        { name: "type", type: '"button" | "submit" | "reset"', default: '"button"', description: "Form içinde yanlışlıkla gönderim olmasın diye varsayılan button" },
        { name: "...rest", type: "ButtonHTMLAttributes | AnchorHTMLAttributes", description: "onClick, aria-* gibi tüm native prop'lar (href varsa bağlantınınkiler)" },
        { name: "ref", type: "Ref<HTMLButtonElement | HTMLAnchorElement>", description: "Öğeye doğrudan erişim (ör. odak vermek)" },
        { name: "buttonClasses()", type: "({ variant, size, fullWidth }) => string", description: "Başka bir öğeye (ör. dosya seçen <label>) buton görünümü vermek için sınıflar" },
        { name: "<ConfirmButton onConfirm>", type: "() => void", description: "İki adımlı buton: ilk tıklama onay ister, ikinci tıklama onConfirm'i çağırır. Çift tıklama sayılmaz" },
        { name: "<ToggleButton pressed onPressedChange>", type: "boolean, (pressed) => void", description: "Aç/kapa buton (ör. Kalın). Kontrolsüz kullanım için defaultPressed. Yazısı duruma göre değişmemeli; durum aria-pressed ile söylenir" },
        { name: "<ConfirmButton confirmText confirmTimeout>", type: "ReactNode, number", default: '"Emin misin? Tekrar bas", 3000', description: "Onay beklerken yazı ve bekleme süresi (ms); süre dolunca, odak ayrılınca veya Esc ile vazgeçilir" },
        { name: "<IconButton icon label>", type: "ReactNode, string", description: "Kare, yalnızca ikonlu buton; label zorunlu (ekran okuyucu adı + ipucu). Varsayılan varyant ghost" },
        { name: "<ButtonGroup label>", type: "string", description: "Grubun ekran okuyucu adı (zorunlu)" },
        { name: "<ButtonGroup options value onValueChange>", type: "{ value, label, disabled? }[]", description: "Verilirse tek seçimli grup (radyo grubu); verilmezse içindeki Button'lar yapışık dizilir" },
      ]}
    />
  );
}

/* ---------- Toast ---------- */

const toastControls: Control[] = [
  { name: "tone", type: "select", options: ["info", "success", "warning", "danger", "loading"], hint: "Renk ve ikon; danger ekran okuyucuya hemen okunur; loading spinner gösterir" },
  { name: "title", type: "text", hint: "Başlık (zorunlu)" },
  { name: "description", type: "text", hint: "Başlığın altındaki ikinci satır (isteğe bağlı)" },
  { name: "duration", type: "select", options: ["2000", "4000", "8000", "0"], hint: "Kaç ms sonra kapanır; 0 = kendiliğinden kapanmaz" },
  { name: "action", type: "boolean", hint: "\"Geri al\" gibi tek bir eylem düğmesi ekler" },
  { name: "dismissible", type: "boolean", hint: "Kapalıysa kullanıcı kapatamaz ve süreyle kapanmaz; yalnızca kod kapatır" },
  { name: "position", type: "select", options: ["bottom-right", "top-right", "top-center", "bottom-center"], hint: "Bildirimlerin ekrandaki yeri (ToastProvider)" },
  { name: "stack", type: "boolean", hint: "Yığın görünümü: bildirimler deste gibi durur, üzerine gelince açılır (ToastProvider)" },
];
const toastDefaults: Values = {
  tone: "success",
  title: "Değişiklikler kaydedildi",
  description: "Profil bilgilerin güncellendi.",
  duration: "4000",
  action: false,
  dismissible: true,
  position: "bottom-right",
  stack: false,
};

function toastCode(v: Values) {
  const a = [`tone: "${v.tone}"`, `title: "${v.title}"`];
  if (v.description) a.push(`description: "${v.description}"`);
  if (v.duration !== "4000") a.push(`duration: ${v.duration}`);
  if (v.action) a.push(`action: { label: "Geri al", onClick: undo }`);
  if (!v.dismissible) a.push("dismissible: false");
  const p = [v.position !== "bottom-right" && ` position="${v.position}"`, v.stack && " stack"].filter(Boolean).join("");
  const closeNote = v.dismissible ? "" : `\n\n// Sorun çözülünce kod kapatır\ndismiss(id);`;
  return `// main.tsx (bir kez)\n<ToastProvider${p}>\n  <App />\n</ToastProvider>\n\n// herhangi bir bileşende\nconst { toast${v.dismissible ? "" : ", dismiss"} } = useToast();\n\n${v.dismissible ? "" : "const id = "}toast({\n  ${a.join(",\n  ")},\n});${closeNote}`;
}

function ToastTrigger({ v }: { v: Values }) {
  const { toast, dismissAll, dismiss } = useToast();
  const [lockedId, setLockedId] = useState<ToastId | null>(null);
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <Button
        onClick={() => {
          const id = toast({
            tone: v.tone as ToastTone,
            title: (v.title as string) || "Bildirim",
            description: (v.description as string) || undefined,
            // Kapatılamayan bildirim süreyle de kapanmaz (yoksa kullanıcı kaçırırdı)
            duration: v.dismissible ? Number(v.duration) : 0,
            dismissible: v.dismissible as boolean,
            action: v.action ? { label: "Geri al", onClick: () => toast({ title: "Geri alındı", duration: 2000 }) } : undefined,
          });
          if (!v.dismissible) setLockedId(id);
        }}
      >
        Toast göster
      </Button>
      {/* Kapatılamayan bildirimi kapatmanın tek yolu kod: önizlemede bunu bir düğme yapar */}
      {lockedId !== null && (
        <Button
          variant="secondary"
          onClick={() => {
            dismiss(lockedId);
            setLockedId(null);
          }}
        >
          Kodla kapat
        </Button>
      )}
      {v.stack && (
        <Button
          variant="secondary"
          onClick={() => {
            dismissAll();
            ["Yeni mesaj", "Yorum eklendi", "Dosya yüklendi"].forEach((title, i) =>
              window.setTimeout(() => toast({ title, description: "Desteyi açmak için üzerine gel.", duration: 8000 }), i * 150),
            );
          }}
        >
          3 bildirimle dene
        </Button>
      )}
    </div>
  );
}

function AllTones() {
  const { toast } = useToast();
  const items: { tone: ToastTone; label: string; title: string }[] = [
    { tone: "info", label: "Info", title: "Yeni sürüm hazır" },
    { tone: "success", label: "Success", title: "Kaydedildi" },
    { tone: "warning", label: "Warning", title: "Depolama %90 dolu" },
    { tone: "danger", label: "Danger", title: "Bağlantı koptu" },
  ];
  return (
    <>
      {items.map((i) => (
        <Button key={i.tone} variant="secondary" size="sm" onClick={() => toast({ tone: i.tone, title: i.title })}>
          {i.label}
        </Button>
      ))}
    </>
  );
}

const sampleFiles = ["Tasarım taslağı", "Toplantı notları", "Bütçe tablosu"];

/**
 * Silme + geri al + onClose: dosya önce "çöp kutusuna" gider. Bildirim "Geri al" DIŞINDA bir nedenle
 * kapanınca (süre, ×, kaydırma) silme kesinleşir. Gerçek uygulamada sunucuya silme isteği burada gider.
 */
function UndoDemo() {
  const { toast } = useToast();
  const [items, setItems] = useState(sampleFiles);
  const [log, setLog] = useState<string[]>([]);
  const remove = (name: string, index: number) => {
    setItems((p) => p.filter((x) => x !== name));
    toast({
      tone: "info",
      title: `"${name}" silindi`,
      description: "Sağa ya da sola kaydırarak da kapatabilirsin.",
      duration: 6000,
      action: {
        label: "Geri al",
        onClick: () =>
          setItems((p) => {
            const next = [...p];
            next.splice(Math.min(index, next.length), 0, name);
            return next;
          }),
      },
      onClose: (reason) =>
        setLog((p) =>
          [reason === "action" ? `"${name}" geri alındı` : `"${name}" kalıcı olarak silindi (${TOAST_CLOSE_REASON_LABELS[reason]})`, ...p].slice(0, 4),
        ),
    });
  };
  return (
    <div className="flex w-full flex-wrap gap-4">
      <ul className="flex w-full max-w-sm flex-col divide-y divide-border rounded-card border border-border">
        {items.length === 0 && (
          <li className="flex items-center justify-between gap-3 px-3 py-2 text-sm text-fg-muted">
            Liste boş.
            <Button size="sm" variant="ghost" onClick={() => setItems(sampleFiles)}>
              Örnekleri geri yükle
            </Button>
          </li>
        )}
        {items.map((name, i) => (
          <li key={name} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
            {name}
            <Button size="sm" variant="ghost" onClick={() => remove(name, i)} aria-label={`${name} sil`}>
              Sil
            </Button>
          </li>
        ))}
      </ul>
      <div className="min-w-56 flex-1 text-sm">
        <p className="font-medium text-fg">onClose kaydı</p>
        <ul className="mt-1 flex flex-col gap-0.5 text-fg-muted" aria-live="polite">
          {log.length === 0 ? <li>Henüz yok. Bir dosyayı sil, sonra bildirimi kapat veya geri al.</li> : log.map((l, i) => <li key={`${l}-${i}`}>{l}</li>)}
        </ul>
      </div>
    </div>
  );
}

/** Sıra: aynı anda en fazla 4 görünür, fazlası sırada bekler */
function QueueDemo() {
  const { toast } = useToast();
  const [n, setN] = useState(0);
  return (
    <>
      <Button
        variant="secondary"
        onClick={() => {
          const start = n;
          for (let i = 1; i <= 6; i++) toast({ title: `Bildirim ${start + i}`, description: i > 4 ? "Sıradaydı; biri kapanınca göründü." : undefined, duration: 3000 });
          setN(start + 6);
        }}
      >
        6 bildirim gönder
      </Button>
      <span className="text-sm text-fg-muted">İlk 4'ü görünür, kalanı "+2 bildirim sırada" olarak bekler; hiçbiri kaybolmaz.</span>
    </>
  );
}

/** toast.promise: tek çağrıyla "Kaydediliyor…" → "Kaydedildi" / "Kaydedilemedi" */
function PromiseDemo() {
  const { promise } = useToast();
  const [busy, setBusy] = useState(false);
  const run = (fail: boolean) => {
    setBusy(true);
    const job = new Promise<string>((resolve, reject) =>
      window.setTimeout(() => (fail ? reject(new Error("Sunucuya ulaşılamadı")) : resolve("Profil")), 1500),
    );
    promise(job, {
      loading: "Kaydediliyor…",
      success: (name) => `${name} kaydedildi`,
      error: (e) => `Kaydedilemedi: ${(e as Error).message}`,
    })
      .catch(() => {})
      .finally(() => setBusy(false));
  };
  return (
    <>
      <Button loading={busy} onClick={() => run(false)}>
        Başarılı işlem
      </Button>
      <Button variant="secondary" disabled={busy} onClick={() => run(true)}>
        Hatalı işlem
      </Button>
    </>
  );
}

/** Aynı id: kaç kez basılırsa basılsın tek bildirim kalır, içeriği güncellenir */
function DedupeDemo() {
  const { toast } = useToast();
  const [count, setCount] = useState(0);
  return (
    <>
      <Button
        variant="secondary"
        onClick={() => {
          const n = count + 1;
          setCount(n);
          toast({ id: "baglanti", tone: "warning", title: "Bağlantı yavaş", description: `${n}. uyarı; yeni bildirim açılmadı, bu güncellendi.` });
        }}
      >
        Aynı uyarıyı tekrar gönder
      </Button>
      <span className="text-sm text-fg-muted">Basılma sayısı: {count}</span>
    </>
  );
}

function DismissAllDemo() {
  const { toast, dismissAll } = useToast();
  return (
    <>
      <Button
        variant="secondary"
        onClick={() => ["Yeni mesaj", "Yorum eklendi", "Dosya yüklendi"].forEach((t) => toast({ title: t, duration: 0 }))}
      >
        3 kalıcı bildirim aç
      </Button>
      <Button variant="ghost" onClick={dismissAll}>
        Tümünü kapat
      </Button>
      <span className="text-sm text-fg-muted">
        Klavye: <kbd className="rounded border border-border px-1">F8</kbd> bildirimlere atlar, <kbd className="rounded border border-border px-1">Esc</kbd> odaktaki bildirimi kapatır.
      </span>
    </>
  );
}

/**
 * Kapatılamayan önemli bildirim: bağlantı koptukça ekranda kalır (× yok, süre yok, kaydırılamaz).
 * Bağlantı gelince AYNI bildirim güncellenir ve normal bir bildirime dönüp kendiliğinden kapanır.
 */
function ConnectionDemo() {
  const { toast, update } = useToast();
  const [online, setOnline] = useState(true);
  return (
    <>
      <Button
        variant={online ? "secondary" : "primary"}
        onClick={() => {
          if (online) {
            toast({ id: "connection", tone: "danger", title: "Bağlantı koptu", description: "Yeniden bağlanılıyor… Değişikliklerin bu cihazda saklanıyor.", dismissible: false });
          } else {
            update("connection", { tone: "success", title: "Bağlantı geri geldi", description: "Değişikliklerin gönderildi.", dismissible: true });
          }
          setOnline(!online);
        }}
      >
        {online ? "Bağlantıyı kopar" : "Bağlantıyı geri getir"}
      </Button>
      <span className="text-sm text-fg-muted" aria-live="polite">
        Durum: {online ? "çevrimiçi" : "çevrimdışı (bildirim kapatılamaz, \"Tümünü kapat\" da dokunmaz)"}
      </span>
    </>
  );
}

/** Yığın görünümü: kendi Provider'ı (stack) ile, sayfadaki diğer bildirimlerle karışmasın diye üstte ortada */
function StackDemoButtons() {
  const { toast } = useToast();
  const [n, setN] = useState(0);
  return (
    <>
      <Button
        variant="secondary"
        onClick={() => {
          const titles = ["Ayşe bir yorum yaptı", "Rapor hazır", "Yeni üye katıldı", "Yedekleme tamamlandı"];
          titles.forEach((title, i) =>
            window.setTimeout(() => toast({ title: `${title} (${n + i + 1})`, tone: i === 1 ? "success" : "info", duration: 8000 }), i * 200),
          );
          setN(n + titles.length);
        }}
      >
        4 bildirim gönder (üstte)
      </Button>
      <span className="text-sm text-fg-muted">Deste üstte ortada belirir; üzerine gel, Tab ile gir ya da dokun: açılır ve süreler durur.</span>
    </>
  );
}
function StackDemo() {
  return (
    <ToastProvider stack position="top-center" label="Yığın örneği bildirimleri" hotkey={false}>
      <StackDemoButtons />
    </ToastProvider>
  );
}

/** Sekme gizliyken süre işlemez: bildirimi gönder, başka sekmeye geç, dön */
function HiddenTabDemo() {
  const { toast } = useToast();
  return (
    <>
      <Button variant="secondary" onClick={() => toast({ title: "Sen yokken geldi", description: "Başka sekmedeyken süre işlemedi; hâlâ buradayım.", duration: 5000 })}>
        5 sn'lik bildirim gönder
      </Button>
      <span className="text-sm text-fg-muted">Gönderdikten hemen sonra başka sekmeye geç, birkaç saniye bekle, geri dön: bildirim hâlâ duruyor.</span>
    </>
  );
}

function ToastSection() {
  const [values, setValues] = useUrlValues("toast", toastControls, toastDefaults);
  return (
    <ComponentSection
      id="toast"
      title="Toast"
      description="İşlem sonucu gibi kısa, akışı bölmeyen bildirimler. Uygulama bir kez <ToastProvider> ile sarılır, sonra her yerden useToast() ile çağrılır. Süre dolunca kendiliğinden kapanır; × ile, Esc ile ya da telefonda yana kaydırarak kapatılır; fare üzerindeyken ve sekme arka plandayken süre durur. Aynı anda en fazla 4 tane görünür, fazlası sırada bekler. İstenirse deste gibi yığılır; kapananlar geçmişte okunabilir."
      controls={toastControls}
      values={values}
      defaults={toastDefaults}
      onValuesChange={setValues}
      // Konum Provider'a ait olduğu için önizleme kendi Provider'ını kullanır
      preview={
        <ToastProvider position={values.position as ToastPosition} stack={values.stack as boolean} label="Önizleme bildirimleri">
          <ToastTrigger v={values} />
        </ToastProvider>
      }
      code={toastCode(values)}
      guidance={{
        use: [
          "Bir işlemin sonucunu kısa süreliğine bildirmek için: kaydedildi, davet gönderildi.",
          "Geri alınabilir işlemlerde \"Geri al\" eylemi sunmak için.",
          "Arka planda süren bir işlemi izlemek için (toast.promise: Kaydediliyor… → Kaydedildi).",
          "Sürdükçe görünmesi gereken bir durum için dismissible: false (ör. bağlantı koptu); düzelince kod günceller.",
          "Çok sayıda bildirim gelen ekranlarda stack (deste) ve kaçırılanlar için <ToastHistory />.",
        ],
        avoid: [
          "Kullanıcının mutlaka okuması gereken bilgi için süreli bildirim: kaybolur. dismissible: false ver ya da sayfada kalıcı uyarı göster.",
          "Kullanıcının kendi kapatabileceği bildirimde dismissible: false: × olmadan ekranda takılı kalır, rahatsız eder.",
          "Kullanıcıdan onay almak için (ör. \"Silmek istediğine emin misin?\"): onay penceresi kullan.",
          "Form alanı hatalarını göstermek için: hata, ilgili alanın hemen altında olmalı.",
          "Aynı mesajı üst üste yığmak için: sabit bir id ver, mevcut bildirim güncellensin.",
        ],
      }}
      examples={[
        { title: "Tüm tonlar (üst üste en fazla 4 tane kalır)", content: <AllTones /> },
        { title: "Geri alınabilir silme: \"Geri al\" + onClose ile kesinleştirme (bildirimi kaydırarak da kapatabilirsin)", content: <UndoDemo /> },
        { title: "toast.promise: işlem sürerken yükleniyor, bitince başarı veya hata", content: <PromiseDemo /> },
        { title: "Tekrarı önleme: aynı id ile gönderilen bildirim yığılmaz, güncellenir", content: <DedupeDemo /> },
        { title: "Sıra: fazla bildirim atılmaz, sırada bekler", content: <QueueDemo /> },
        { title: "Tümünü kapat ve klavye kısayolları", content: <DismissAllDemo /> },
        { title: "Kapatılamayan önemli bildirim (dismissible: false): sorun çözülünce kod günceller", content: <ConnectionDemo /> },
        { title: "Yığın görünümü (stack): deste gibi durur, üzerine gelince açılır", content: <StackDemo /> },
        { title: "Sekme gizliyken süre durur", content: <HiddenTabDemo /> },
        { title: "Bildirim geçmişi: kapananlar burada (bu sayfanın tüm örnekleri)", content: <ToastHistory className="max-w-md" /> },
      ]}
      props={[
        { name: "tone", type: '"info" | "success" | "warning" | "danger" | "loading"', default: '"info"', description: "Renk ve ikon; danger ekran okuyucuya hemen (alert) okunur; loading spinner gösterir ve kendiliğinden kapanmaz" },
        { name: "title", type: "ReactNode", description: "Başlık (zorunlu)" },
        { name: "description", type: "ReactNode", description: "Başlığın altındaki ikinci satır" },
        { name: "duration", type: "number (ms)", default: "4000", description: "Otomatik kapanma süresi; 0 = kalıcı. Alttaki ince çubuk kalan süreyi gösterir, fare üzerindeyken durur" },
        { name: "action", type: "{ label; onClick }", description: "Tek eylem düğmesi (ör. Geri al); tıklanınca bildirim kapanır" },
        { name: "<ToastProvider position>", type: '"top-right" | "bottom-right" | "top-center" | "bottom-center"', default: '"bottom-right"', description: "Bildirimlerin ekrandaki yeri" },
        { name: "onClose", type: "(reason) => void", description: "Kapanınca bir kez çağrılır. reason: timeout, close, action, swipe, escape, dismiss, dismissAll" },
        { name: "<ToastProvider max>", type: "number", default: "4", description: "Aynı anda görünen en fazla bildirim; fazlası atılmaz, sırada bekler (süresi göründüğü an başlar)" },
        { name: "<ToastProvider label>", type: "string", default: '"Bildirimler"', description: "Bölgenin ekran okuyucu adı; birden fazla Provider varsa farklı ver" },
        { name: "id", type: "string | number", description: "Sabit kimlik: aynı id ile tekrar çağrılınca yeni bildirim açılmaz, mevcut güncellenir" },
        { name: "dismissible", type: "boolean", default: "true", description: "false: × yok, kaydırma ve Esc çalışmaz, süreyle kapanmaz, sırada beklemez; yalnızca update/dismiss ile kapanır. dismissAll() dokunmaz" },
        { name: "<ToastProvider stack>", type: "boolean", default: "false", description: "Deste görünümü: en fazla 3 kart üst üste görünür; üzerine gelince, odaklanınca veya dokununca açılır ve açıkken süreler durur" },
        { name: "<ToastProvider historyLimit>", type: "number", default: "20", description: "Geçmişte tutulan en fazla kayıt" },
        { name: "<ToastHistory />", type: "{ className?, title? }", description: "Kapanan bildirimlerin listesi: zaman ve kapanma nedeniyle (süre doldu, × ile kapatıldı…); Temizle düğmesi" },
        { name: "useToastHistory()", type: "{ entries, clear }", description: "Geçmişi kendi arayüzünle göstermek için: entries (en yenisi başta) ve clear()" },
        { name: "<ToastProvider hotkey>", type: "string | false", default: '"F8"', description: "Odağı bildirimlere taşıyan kısayol; odaktaki bildirim Esc ile kapanır" },
        { name: "useToast()", type: "{ toast, update, dismiss, dismissAll, promise }", description: "toast(options) id döndürür; update(id, options) içeriği değiştirir; dismiss(id) / dismissAll() kapatır" },
        { name: "promise(p, { loading, success, error })", type: "Promise<T>", description: "İşlem sürerken yükleniyor bildirimi; bitince başarı ya da hata. success/error metin veya sonuca göre fonksiyon olabilir" },
      ]}
    />
  );
}

/* ---------- Sayfa ---------- */

// İnce çizgili, sade simgeler: kalın çizgi küçük düğmede kaba duruyordu
const SunIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="3.5" />
    <path d="M12 3.5v1.5M12 19v1.5M3.5 12H5M19 12h1.5M6 6l1 1M17 17l1 1M6 18l1-1M17 7l1-1" />
  </svg>
);
const MoonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M19.5 14.2A7.5 7.5 0 0 1 9.8 4.5a7.5 7.5 0 1 0 9.7 9.7z" />
  </svg>
);

/**
 * Tema düğmesi: yazı yerine geçilecek temanın simgesi (koyu temadayken güneş, açıkta ay).
 * Ne yaptığı ekran okuyucuya ve üzerine gelince ipucu olarak söylenir. Seçim tarayıcıda hatırlanır;
 * hiç seçim yapılmadıysa ilk açılışta cihazın teması kullanılır (bkz. index.html).
 */
function ThemeButton() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme ?? "dark");
  const [chosen, setChosen] = useState(false);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    if (!chosen) return; // cihazdan gelen tema kaydedilmez: cihaz değişince site de değişsin
    try {
      localStorage.setItem("mds-theme", theme);
    } catch {
      // kaydedilemezse yalnızca bu oturumda geçerli olur
    }
  }, [theme, chosen]);
  // Kullanıcı seçim yapmadıysa cihazın teması değişince (ör. akşam otomatik koyu) site de değişir
  useEffect(() => {
    if (chosen || !window.matchMedia) return;
    const query = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => setTheme(query.matches ? "light" : "dark");
    query.addEventListener?.("change", onChange);
    return () => query.removeEventListener?.("change", onChange);
  }, [chosen]);
  const next = theme === "dark" ? "light" : "dark";
  return (
    <IconButton
      // Yalnızca simge yeniden çizilip hafifçe belirir; düğme yerinde kalır (klavye odağı kaybolmaz)
      icon={
        <span key={theme} className="flex animate-[tooltip-in_250ms_ease-out]">
          {theme === "dark" ? <SunIcon /> : <MoonIcon />}
        </span>
      }
      label={`${next === "light" ? "Açık" : "Koyu"} temaya geç`}
      variant="secondary"
      size="sm"
      className="glass rounded-full border-border-strong/55! hover:border-primary/60!"
      onClick={() => {
        setChosen(true);
        setTheme(next);
      }}
    />
  );
}

const sections = [
  { id: "button", label: "Button" },
  { id: "toast", label: "Toast" },
];

/**
 * Şu an ekranda okunan bölüm: ekranın üst-orta bandına giren bölüm "aktif" sayılır.
 * Kaydırma olayını her karede dinlemek yerine IntersectionObserver kullanılır (akıcılık için).
 */
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setActive(hit.target.id);
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [ids]);
  return active;
}

const sectionIds = sections.map((s) => s.id);

export function App() {
  const active = useActiveSection(sectionIds);
  return (
    <div className="flex min-h-screen flex-col gap-3 p-2 md:p-3">
      {/* Başlık sayfanın üstünde durur, kaydırınca peşinden gelmez */}
      <header className="glass flex flex-wrap items-center justify-between gap-3 rounded-card px-4 py-2.5">
        {/* Marka: elmas işaret + CUBE; renk vurgu token'ından gelir */}
        <a href="#" className="flex min-w-0 flex-col gap-0.5 rounded-control px-1 py-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          <span className="flex items-center gap-2 text-primary">
            <svg className="size-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2.5 21.5 12 12 21.5 2.5 12z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              <path d="M12 7.5 16.5 12 12 16.5 7.5 12z" fill="currentColor" />
            </svg>
            <span className="font-display text-2xl leading-none font-bold tracking-wide">CUBE</span>
          </span>
          <span className="truncate text-xs text-fg-muted">Mini Design System</span>
        </a>
        {/* Telefonda: üst satırda logo + tema, bağlantılar alt satırda */}
        <nav aria-label="Bileşenler" className="order-last flex w-full items-center gap-2 text-sm sm:order-none sm:w-auto">
          {sections.map((s) => {
            const current = active === s.id;
            return (
              <a
                key={s.id}
                href={`#${s.id}`}
                // Ekran okuyucu "şu anki konum" der; görünürde de vurgulanır
                aria-current={current ? "location" : undefined}
                className={cn(
                  // Cam kenarlı, yuvarlak bağlantı: başlık camının üstünde ayrı bir cam parça gibi durur
                  // "!": glass kendi soluk kenar rengini verir; burada kenar belirgin olsun diye o ezilir
                  "glass rounded-full border-border-strong/55! px-4 py-1.5 font-medium text-fg-muted transition-colors",
                  "hover:border-primary/60! hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                  current && "border-primary/80! bg-primary-soft! text-primary hover:text-primary",
                )}
              >
                {s.label}
              </a>
            );
          })}
        </nav>
        <ThemeButton />
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-16 px-2 py-6 sm:px-4">
        <ButtonSection />
        <ToastSection />
      </main>
    </div>
  );
}
