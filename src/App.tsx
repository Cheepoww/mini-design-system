import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Button, ButtonGroup, IconButton, ToastProvider, useToast } from "./components";
import type { ButtonSize, ButtonVariant, ToastPosition, ToastTone } from "./components";
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
          <h2 id={`${id}-title`} className="font-display text-3xl font-semibold">
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
  { name: "disabled", type: "boolean", hint: "Butonu pasif yapar" },
  { name: "fullWidth", type: "boolean", hint: "Bulunduğu alanın tamamını kaplar" },
  { name: "leftIcon", type: "boolean", hint: "Metnin soluna ikon ekler" },
];
const buttonDefaults: Values = {
  variant: "primary",
  size: "md",
  children: "Kaydet",
  loading: false,
  loadingText: "",
  disabled: false,
  fullWidth: false,
  leftIcon: false,
};

function buttonCode(v: Values) {
  const a: string[] = [];
  if (v.variant !== "primary") a.push(`variant="${v.variant}"`);
  if (v.size !== "md") a.push(`size="${v.size}"`);
  if (v.loading) a.push("loading");
  if (v.loadingText) a.push(`loadingText="${v.loadingText}"`);
  if (v.disabled) a.push("disabled");
  if (v.fullWidth) a.push("fullWidth");
  if (v.leftIcon) a.push("leftIcon={<PlusIcon />}");
  return `${a.length ? `<Button ${a.join(" ")}>` : "<Button>"}${v.children}</Button>`;
}

/** Gerçek kullanım: tıklayınca yükleniyor (genişlik sabit), sonra bildirim */
function SaveDemo() {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  return (
    <div className="flex items-center gap-3">
      <Button
        loading={saving}
        loadingText="Kaydediliyor…"
        onClick={() => {
          setSaving(true);
          window.setTimeout(() => {
            setSaving(false);
            toast({ tone: "success", title: "Değişiklikler kaydedildi" });
          }, 1200);
        }}
      >
        Değişiklikleri kaydet
      </Button>
      <span className="text-sm text-fg-muted">Yanındaki yazı yerinde kalır, buton genişliği zıplamaz.</span>
    </div>
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

function ButtonSection() {
  const { toast } = useToast();
  const [values, setValues] = useUrlValues("button", buttonControls, buttonDefaults);
  const say = (title: string) => () => toast({ title, duration: 2000 });
  return (
    <ComponentSection
      id="button"
      title="Button"
      description="Kullanıcının bir eylem başlatması için. Dört varyant, üç boyut; disabled ve loading durumlarını destekler. Başka bir sayfaya gitmek için buton değil bağlantı kullan (buttonClasses ile buton görünümü verilebilir)."
      controls={buttonControls}
      values={values}
      defaults={buttonDefaults}
      onValuesChange={setValues}
      preview={
        <div className={cn(values.fullWidth && "w-full max-w-sm")}>
          <Button
            variant={values.variant as ButtonVariant}
            size={values.size as ButtonSize}
            loading={values.loading as boolean}
            loadingText={(values.loadingText as string) || undefined}
            disabled={values.disabled as boolean}
            fullWidth={values.fullWidth as boolean}
            leftIcon={values.leftIcon ? <PlusIcon /> : undefined}
            onClick={say(`"${values.children}" tıklandı`)}
          >
            {values.children as string}
          </Button>
        </div>
      }
      code={buttonCode(values)}
      guidance={{
        use: [
          "Bir işlemi başlatmak için: kaydet, gönder, sil, aç.",
          "Sayfadaki en önemli işlem için primary; ikincil işlemler için secondary veya ghost.",
          "Geri alınamaz işlemler için danger (ör. hesabı sil).",
          "Yer darsa ve ikon herkesçe biliniyorsa IconButton (düzenle, sil, yenile).",
          "Aynı konuya ait birkaç seçenekten biri seçilecekse ButtonGroup (Gün / Hafta / Ay).",
        ],
        avoid: [
          "Başka bir sayfaya gitmek için: bağlantı (<a>) kullan; buton görünümü gerekiyorsa buttonClasses() ile ver.",
          "Aynı alanda birden fazla primary buton: kullanıcı asıl işlemin hangisi olduğunu anlayamaz.",
          "Etiketsiz ikon butonu: IconButton'da label zorunlu, ekran okuyucu onu okur.",
          "Butonu pasif yapıp nedenini söylememek: yanında kısa bir açıklama göster.",
          "Uzun işlemlerde loading olmadan bırakmak: kullanıcı tekrar tekrar tıklar.",
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
        { title: "Gerçek kullanım: kaydet → yükleniyor (loadingText) → bildirim", content: <SaveDemo /> },
        { title: "IconButton: yalnızca ikon (label zorunlu, üzerine gelince ipucu)", content: <IconButtonDemo /> },
        { title: "ButtonGroup: tek seçim (ok tuşlarıyla gezilir, pasif seçenek atlanır)", content: <RangeDemo /> },
        { title: "ButtonGroup: yapışık eylem butonları", content: <ActionGroupDemo /> },
      ]}
      props={[
        { name: "variant", type: '"primary" | "secondary" | "ghost" | "danger"', default: '"primary"', description: "Görsel stil" },
        { name: "size", type: '"sm" | "md" | "lg"', default: '"md"', description: "Yükseklik ve yazı boyutu" },
        { name: "loading", type: "boolean", default: "false", description: "Spinner gösterir, tıklamayı engeller, aria-busy ekler; yükleme öncesi genişlik korunur" },
        { name: "loadingText", type: "ReactNode", description: "Yüklenirken metnin yerine gösterilir (ör. \"Kaydediliyor…\")" },
        { name: "disabled", type: "boolean", default: "false", description: "Butonu pasif yapar" },
        { name: "leftIcon / rightIcon", type: "ReactNode", description: "Metnin solunda / sağında ikon; loading iken sol ikonun yerini spinner alır" },
        { name: "fullWidth", type: "boolean", default: "false", description: "Genişliği %100 yapar" },
        { name: "type", type: '"button" | "submit" | "reset"', default: '"button"', description: "Form içinde yanlışlıkla gönderim olmasın diye varsayılan button" },
        { name: "...rest", type: "ButtonHTMLAttributes", description: "onClick, aria-* gibi tüm native prop'lar" },
        { name: "ref", type: "Ref<HTMLButtonElement>", description: "Butona doğrudan erişim (ör. odak vermek)" },
        { name: "buttonClasses()", type: "({ variant, size, fullWidth }) => string", description: "Bağlantıya buton görünümü vermek için sınıflar" },
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
  { name: "position", type: "select", options: ["bottom-right", "top-right", "top-center", "bottom-center"], hint: "Bildirimlerin ekrandaki yeri (ToastProvider)" },
];
const toastDefaults: Values = {
  tone: "success",
  title: "Değişiklikler kaydedildi",
  description: "Profil bilgilerin güncellendi.",
  duration: "4000",
  action: false,
  position: "bottom-right",
};

function toastCode(v: Values) {
  const a = [`tone: "${v.tone}"`, `title: "${v.title}"`];
  if (v.description) a.push(`description: "${v.description}"`);
  if (v.duration !== "4000") a.push(`duration: ${v.duration}`);
  if (v.action) a.push(`action: { label: "Geri al", onClick: undo }`);
  const pos = v.position !== "bottom-right" ? ` position="${v.position}"` : "";
  return `// main.tsx (bir kez)\n<ToastProvider${pos}>\n  <App />\n</ToastProvider>\n\n// herhangi bir bileşende\nconst { toast } = useToast();\n\ntoast({\n  ${a.join(",\n  ")},\n});`;
}

function ToastTrigger({ v }: { v: Values }) {
  const { toast } = useToast();
  return (
    <Button
      onClick={() =>
        toast({
          tone: v.tone as ToastTone,
          title: (v.title as string) || "Bildirim",
          description: (v.description as string) || undefined,
          duration: Number(v.duration),
          action: v.action ? { label: "Geri al", onClick: () => toast({ title: "Geri alındı", duration: 2000 }) } : undefined,
        })
      }
    >
      Toast göster
    </Button>
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

const closeReasonLabels: Record<string, string> = {
  timeout: "süre doldu",
  close: "× ile kapatıldı",
  swipe: "kaydırılarak kapatıldı",
  escape: "Esc ile kapatıldı",
  dismiss: "kodla kapatıldı",
  dismissAll: "tümü kapatıldı",
};

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
          [reason === "action" ? `"${name}" geri alındı` : `"${name}" kalıcı olarak silindi (${closeReasonLabels[reason]})`, ...p].slice(0, 4),
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

function ToastSection() {
  const [values, setValues] = useUrlValues("toast", toastControls, toastDefaults);
  return (
    <ComponentSection
      id="toast"
      title="Toast"
      description="İşlem sonucu gibi kısa, akışı bölmeyen bildirimler. Uygulama bir kez <ToastProvider> ile sarılır, sonra her yerden useToast() ile çağrılır. Süre dolunca kendiliğinden kapanır; × ile, Esc ile ya da telefonda yana kaydırarak kapatılır; fare üzerindeyken süre durur. Aynı anda en fazla 4 tane görünür, fazlası sırada bekler."
      controls={toastControls}
      values={values}
      defaults={toastDefaults}
      onValuesChange={setValues}
      // Konum Provider'a ait olduğu için önizleme kendi Provider'ını kullanır
      preview={
        <ToastProvider position={values.position as ToastPosition} label="Önizleme bildirimleri">
          <ToastTrigger v={values} />
        </ToastProvider>
      }
      code={toastCode(values)}
      guidance={{
        use: [
          "Bir işlemin sonucunu kısa süreliğine bildirmek için: kaydedildi, davet gönderildi.",
          "Geri alınabilir işlemlerde \"Geri al\" eylemi sunmak için.",
          "Arka planda süren bir işlemi izlemek için (toast.promise: Kaydediliyor… → Kaydedildi).",
        ],
        avoid: [
          "Kullanıcının kaçırmaması gereken önemli bilgi için: bildirim kendiliğinden kaybolur; sayfada kalıcı bir uyarı göster.",
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
        { name: "<ToastProvider hotkey>", type: "string | false", default: '"F8"', description: "Odağı bildirimlere taşıyan kısayol; odaktaki bildirim Esc ile kapanır" },
        { name: "useToast()", type: "{ toast, update, dismiss, dismissAll, promise }", description: "toast(options) id döndürür; update(id, options) içeriği değiştirir; dismiss(id) / dismissAll() kapatır" },
        { name: "promise(p, { loading, success, error })", type: "Promise<T>", description: "İşlem sürerken yükleniyor bildirimi; bitince başarı ya da hata. success/error metin veya sonuca göre fonksiyon olabilir" },
      ]}
    />
  );
}

/* ---------- Sayfa ---------- */

function ThemeButton() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme ?? "dark");
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("mds-theme", theme);
    } catch {
      // kaydedilemezse yalnızca bu oturumda geçerli olur
    }
  }, [theme]);
  const next = theme === "dark" ? "light" : "dark";
  return (
    <Button size="sm" variant="secondary" onClick={() => setTheme(next)} aria-label={`${next === "light" ? "Açık" : "Koyu"} temaya geç`}>
      {theme === "dark" ? "Açık tema" : "Koyu tema"}
    </Button>
  );
}

export function App() {
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
        <nav aria-label="Bileşenler" className="order-last flex w-full items-center gap-1 text-sm sm:order-none sm:w-auto">
          <a href="#button" className="rounded-control px-3 py-1.5 text-fg-muted hover:bg-white/8 hover:text-fg">
            Button
          </a>
          <a href="#toast" className="rounded-control px-3 py-1.5 text-fg-muted hover:bg-white/8 hover:text-fg">
            Toast
          </a>
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
