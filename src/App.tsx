import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Badge, Button, ButtonGroup, EmptyState, IconButton, Input, LoadingState, Modal, Select, Skeleton, ToastProvider, useToast } from "./components";
import type {
  BadgeSize,
  BadgeTone,
  BadgeVariant,
  ButtonSize,
  ButtonVariant,
  EmptyStateSize,
  EmptyStateTone,
  InputSize,
  LoadingStateSize,
  LoadingStateVariant,
  ModalSize,
  SelectSize,
  ToastPosition,
  ToastTone,
} from "./components";
import { cn } from "./lib/cn";

/* ---------- Ortak parçalar ---------- */

type Control =
  | { name: string; type: "select"; options: string[]; hint: string }
  | { name: string; type: "boolean"; hint: string }
  | { name: string; type: "text"; hint: string };

type Values = Record<string, string | boolean>;

function ControlField({ control, value, onChange }: { control: Control; value: string | boolean; onChange: (v: string | boolean) => void }) {
  const id = `ctl-${control.name}`;
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

function readUrlValues(prefix: string, controls: Control[], defaults: Values): Values {
  const params = new URLSearchParams(window.location.search);
  const values: Values = { ...defaults };
  for (const c of controls) {
    const raw = params.get(`${prefix}.${c.name}`);
    if (raw === null) continue;
    if (c.type === "boolean") values[c.name] = raw === "true";
    else if (c.type === "select") values[c.name] = c.options.includes(raw) ? raw : defaults[c.name];
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

function useUrlValues(prefix: string, controls: Control[], defaults: Values) {
  const [values, setValues] = useState<Values>(() => readUrlValues(prefix, controls, defaults));
  useEffect(() => writeUrlValues(prefix, values, defaults), [prefix, values, defaults]);
  return [values, setValues] as const;
}

function ShareLinkButton({ id }: { id: string }) {
  const { toast } = useToast();
  return (
    <Button
      size="sm"
      variant="secondary"
      onClick={async () => {
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
              className="-mx-2 -my-1.5 rounded-control px-2 py-1.5 text-xs text-primary hover:underline disabled:cursor-not-allowed disabled:text-fg-muted disabled:no-underline"
              disabled={controls.every((c) => values[c.name] === defaults[c.name])}
              onClick={() => onValuesChange(defaults)}
            >
              Sıfırla
            </button>
          </div>
          <p className="-mt-2 text-xs text-fg-muted">Değiştir, önizleme ve aşağıdaki kod anında güncellenir.</p>
          {controls.map((c) => (
            <ControlField key={c.name} control={c} value={values[c.name]} onChange={(v) => onValuesChange({ ...values, [c.name]: v })} />
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
      description="Kullanıcının bir eylem başlatması için. Dört varyant, üç boyut; disabled ve loading durumlarını destekler."
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
        ],
        avoid: [
          "Başka bir sayfaya gitmek için: bağlantı (<a>) kullan.",
          "Aynı alanda birden fazla primary buton: kullanıcı asıl işlemin hangisi olduğunu anlayamaz.",
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
        { title: "Gerçek kullanım: kaydet → yükleniyor → bildirim", content: <SaveDemo /> },
        { title: "IconButton: yalnızca ikon", content: <IconButtonDemo /> },
        { title: "ButtonGroup: tek seçim", content: <RangeDemo /> },
        { title: "ButtonGroup: yapışık eylem butonları", content: <ActionGroupDemo /> },
      ]}
      props={[
        { name: "variant", type: '"primary" | "secondary" | "ghost" | "danger"', default: '"primary"', description: "Görsel stil" },
        { name: "size", type: '"sm" | "md" | "lg"', default: '"md"', description: "Yükseklik ve yazı boyutu" },
        { name: "loading", type: "boolean", default: "false", description: "Spinner gösterir, tıklamayı engeller" },
        { name: "disabled", type: "boolean", default: "false", description: "Butonu pasif yapar" },
      ]}
    />
  );
}

/* ---------- Toast ---------- */

const toastControls: Control[] = [
  { name: "tone", type: "select", options: ["info", "success", "warning", "danger", "loading"], hint: "Renk ve ikon" },
  { name: "title", type: "text", hint: "Başlık (zorunlu)" },
  { name: "description", type: "text", hint: "Başlığın altındaki ikinci satır" },
  { name: "duration", type: "select", options: ["2000", "4000", "8000", "0"], hint: "Kaç ms sonra kapanır" },
  { name: "action", type: "boolean", hint: "Geri al düğmesi ekler" },
  { name: "position", type: "select", options: ["bottom-right", "top-right", "top-center", "bottom-center"], hint: "Ekrandaki yeri" },
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
  return `const { toast } = useToast();\n\ntoast({\n  ${a.join(",\n  ")},\n});`;
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

function ToastSection() {
  const [values, setValues] = useUrlValues("toast", toastControls, toastDefaults);
  const { toast } = useToast();
  return (
    <ComponentSection
      id="toast"
      title="Toast"
      description="İşlem sonucu gibi kısa, akışı bölmeyen bildirimler."
      controls={toastControls}
      values={values}
      defaults={toastDefaults}
      onValuesChange={setValues}
      preview={
        <ToastProvider position={values.position as ToastPosition} label="Önizleme bildirimleri">
          <ToastTrigger v={values} />
        </ToastProvider>
      }
      code={toastCode(values)}
      guidance={{
        use: ["Bir işlemin sonucunu kısa süreliğine bildirmek için.", "Geri alınabilir işlemlerde Geri al sunmak için."],
        avoid: ["Kullanıcıdan onay almak için (Modal kullan).", "Form alanı hatalarını göstermek için (Input error kullan)."],
      }}
      examples={[
        {
          title: "Tonlar",
          content: (
            <>
              <Button variant="secondary" size="sm" onClick={() => toast({ tone: "info", title: "Yeni sürüm hazır" })}>Info</Button>
              <Button variant="secondary" size="sm" onClick={() => toast({ tone: "success", title: "Kaydedildi" })}>Success</Button>
              <Button variant="secondary" size="sm" onClick={() => toast({ tone: "warning", title: "Depolama %90 dolu" })}>Warning</Button>
              <Button variant="secondary" size="sm" onClick={() => toast({ tone: "danger", title: "Bağlantı koptu" })}>Danger</Button>
            </>
          ),
        },
      ]}
      props={[
        { name: "tone", type: '"info" | "success" | "warning" | "danger" | "loading"', default: '"info"', description: "Renk ve ikon" },
        { name: "title", type: "ReactNode", description: "Başlık (zorunlu)" },
        { name: "description", type: "ReactNode", description: "Alt açıklama" },
      ]}
    />
  );
}

/* ---------- Input ---------- */

const inputControls: Control[] = [
  { name: "size", type: "select", options: ["sm", "md", "lg"], hint: "Yükseklik ve yazı boyutu (Button ile uyumlu)" },
  { name: "label", type: "text", hint: "Alan başlığı" },
  { name: "placeholder", type: "text", hint: "İpucu metni" },
  { name: "hint", type: "text", hint: "Alt yardımcı açıklama" },
  { name: "error", type: "text", hint: "Doluysa çerçeve hata rengine döner" },
  { name: "disabled", type: "boolean", hint: "Girişi pasif yapar" },
  { name: "fullWidth", type: "boolean", hint: "Bulunduğu alanın tamamını kaplar" },
];
const inputDefaults: Values = {
  size: "md",
  label: "E-posta adresi",
  placeholder: "ornek@cube.dev",
  hint: "Bildirimler bu adrese gönderilir.",
  error: "",
  disabled: false,
  fullWidth: true,
};

function inputCode(v: Values) {
  const a: string[] = [];
  if (v.label) a.push(`label="${v.label}"`);
  if (v.placeholder) a.push(`placeholder="${v.placeholder}"`);
  if (v.size !== "md") a.push(`size="${v.size}"`);
  if (v.hint) a.push(`hint="${v.hint}"`);
  if (v.error) a.push(`error="${v.error}"`);
  if (v.disabled) a.push("disabled");
  if (!v.fullWidth) a.push("fullWidth={false}");
  return a.length ? `<Input\n  ${a.join("\n  ")}\n/>` : "<Input />";
}

function InputSection() {
  const [values, setValues] = useUrlValues("input", inputControls, inputDefaults);
  const [text, setText] = useState("");
  return (
    <ComponentSection
      id="input"
      title="Input"
      description="Kullanıcıdan tek satırlık metin, e-posta, şifre veya sayı girişi almak için. Etiket (label), yardımcı açıklama (hint) ve hata durumlarını erişilebilir şekilde yönetir."
      controls={inputControls}
      values={values}
      defaults={inputDefaults}
      onValuesChange={setValues}
      preview={
        <div className="w-full max-w-sm">
          <Input
            size={values.size as InputSize}
            label={(values.label as string) || undefined}
            placeholder={(values.placeholder as string) || undefined}
            hint={(values.hint as string) || undefined}
            error={(values.error as string) || undefined}
            disabled={values.disabled as boolean}
            fullWidth={values.fullWidth as boolean}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
      }
      code={inputCode(values)}
      guidance={{
        use: [
          "Kullanıcıdan kısa metin, e-posta, şifre veya arama terimi almak için.",
          "Her input için mutlaka anlaşılır bir label kullan; sadece placeholder'a güvenme.",
          "Doğrulama hatalarını error prop'u ile alanın hemen altında göster.",
        ],
        avoid: [
          "Uzun paragraflar veya çok satırlı açıklamalar için (bunun yerine textarea kullanılmalı).",
          "Önceden tanımlı 3-5 seçenekten birini seçtirmek için (Select veya ButtonGroup kullan).",
        ],
      }}
      examples={[
        {
          title: "Boyutlar",
          content: (
            <div className="flex w-full max-w-md flex-col gap-3">
              <Input size="sm" placeholder="Küçük (sm - 32px)" />
              <Input size="md" placeholder="Orta (md - 40px)" />
              <Input size="lg" placeholder="Büyük (lg - 48px)" />
            </div>
          ),
        },
        {
          title: "Durumlar: Hata ve Pasif",
          content: (
            <div className="flex w-full max-w-md flex-col gap-3">
              <Input label="Kullanıcı adı" defaultValue="admin" error="Bu kullanıcı adı zaten alınmış." />
              <Input label="Kurum kodu" defaultValue="CUBE-2026" disabled hint="Bu alan değiştirilemez." />
            </div>
          ),
        },
      ]}
      props={[
        { name: "label", type: "ReactNode", description: "Input üstündeki etiket; tıklanınca input'a odaklanır" },
        { name: "size", type: '"sm" | "md" | "lg"', default: '"md"', description: "Yükseklik ve yazı boyutu" },
        { name: "hint", type: "ReactNode", description: "Alt kısımda gösterilen yardımcı metin" },
        { name: "error", type: "ReactNode", description: "Hata mesajı; çerçeveyi danger rengine çevirir ve aria-invalid ekler" },
        { name: "leftIcon / rightIcon", type: "ReactNode", description: "Input içinde sol veya sağ tarafta ikon" },
        { name: "fullWidth", type: "boolean", default: "true", description: "Genişliği %100 yapar" },
        { name: "disabled", type: "boolean", default: "false", description: "Input'u pasif yapar" },
      ]}
    />
  );
}

/* ---------- Select ---------- */

const sampleRoles = [
  { value: "dev", label: "Frontend Geliştirici" },
  { value: "design", label: "UI/UX Tasarımcı" },
  { value: "pm", label: "Ürün Yöneticisi" },
  { value: "qa", label: "Test Uzmanı (Pasif)", disabled: true },
];

const selectControls: Control[] = [
  { name: "size", type: "select", options: ["sm", "md", "lg"], hint: "Yükseklik ve yazı boyutu" },
  { name: "label", type: "text", hint: "Alan başlığı" },
  { name: "placeholder", type: "text", hint: "Seçim yapılmadan önce görünen metin" },
  { name: "hint", type: "text", hint: "Alt yardımcı açıklama" },
  { name: "error", type: "text", hint: "Hata mesajı" },
  { name: "disabled", type: "boolean", hint: "Seçimi pasif yapar" },
];
const selectDefaults: Values = {
  size: "md",
  label: "Ekip rolü",
  placeholder: "Bir rol seçiniz...",
  hint: "Yetkiler seçilen role göre atanır.",
  error: "",
  disabled: false,
};

function selectCode(v: Values) {
  const a: string[] = [`options={roles}`];
  if (v.label) a.push(`label="${v.label}"`);
  if (v.placeholder !== "Seçim yapınız...") a.push(`placeholder="${v.placeholder}"`);
  if (v.size !== "md") a.push(`size="${v.size}"`);
  if (v.hint) a.push(`hint="${v.hint}"`);
  if (v.error) a.push(`error="${v.error}"`);
  if (v.disabled) a.push("disabled");
  return `<Select\n  ${a.join("\n  ")}\n/>`;
}

function SelectSection() {
  const [values, setValues] = useUrlValues("select", selectControls, selectDefaults);
  const [selected, setSelected] = useState("");
  return (
    <ComponentSection
      id="select"
      title="Select"
      description="Kullanıcının önceden tanımlanmış seçenekler listesinden tek bir değer seçmesi için açılır menü."
      controls={selectControls}
      values={values}
      defaults={selectDefaults}
      onValuesChange={setValues}
      preview={
        <div className="w-full max-w-sm">
          <Select
            size={values.size as SelectSize}
            label={(values.label as string) || undefined}
            placeholder={(values.placeholder as string) || undefined}
            hint={(values.hint as string) || undefined}
            error={(values.error as string) || undefined}
            disabled={values.disabled as boolean}
            options={sampleRoles}
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          />
        </div>
      }
      code={selectCode(values)}
      guidance={{
        use: [
          "4 veya daha fazla seçenek arasından tek bir seçim yapılacaksa (şehir, kategori, rol).",
          "Form içinde Input ve Button ile aynı hizada açılır liste gerektiğinde.",
        ],
        avoid: [
          "Yalnızca 2-3 kısa seçenek varsa ve ekranda yer varsa (ButtonGroup daha hızlı seçim sağlar).",
          "Açık/kapalı gibi ikili durumlar için (checkbox veya toggle kullan).",
        ],
      }}
      examples={[
        {
          title: "Varsayılan ve Hata Durumu",
          content: (
            <div className="flex w-full max-w-md flex-col gap-3">
              <Select label="Şehir" options={[{ value: "ist", label: "İstanbul" }, { value: "ank", label: "Ankara" }, { value: "izm", label: "İzmir" }]} defaultValue="ist" />
              <Select label="Departman" options={sampleRoles} defaultValue="" error="Lütfen bir departman seçin." />
            </div>
          ),
        },
      ]}
      props={[
        { name: "options", type: "{ value: string; label: string; disabled?: boolean }[]", description: "Açılır listede gösterilecek seçenekler (zorunlu)" },
        { name: "label", type: "ReactNode", description: "Select üstündeki etiket" },
        { name: "placeholder", type: "string", default: '"Seçim yapınız..."', description: "Henüz seçim yapılmadığında görünen devre dışı ilk seçenek" },
        { name: "size", type: '"sm" | "md" | "lg"', default: '"md"', description: "Yükseklik ve yazı boyutu" },
        { name: "hint / error", type: "ReactNode", description: "Alt yardımcı metin veya hata uyarısı" },
        { name: "disabled", type: "boolean", default: "false", description: "Select'i pasif yapar" },
      ]}
    />
  );
}

/* ---------- Modal ---------- */

const modalControls: Control[] = [
  { name: "size", type: "select", options: ["sm", "md", "lg"], hint: "Pencere genişliği" },
  { name: "title", type: "text", hint: "Modal başlığı" },
  { name: "description", type: "text", hint: "Başlık altı açıklama" },
  { name: "closeOnBackdropClick", type: "boolean", hint: "Dışarıya tıklanınca kapansın mı?" },
];
const modalDefaults: Values = {
  size: "md",
  title: "Yeni üye davet et",
  description: "Ekip arkadaşının bilgilerini girerek çalışma alanına davet edebilirsin.",
  closeOnBackdropClick: true,
};

function modalCode(v: Values) {
  const a = [`open={open}`, `onClose={() => setOpen(false)}`];
  if (v.title) a.push(`title="${v.title}"`);
  if (v.description) a.push(`description="${v.description}"`);
  if (v.size !== "md") a.push(`size="${v.size}"`);
  if (!v.closeOnBackdropClick) a.push("closeOnBackdropClick={false}");
  return `<Modal\n  ${a.join("\n  ")}\n  footer={\n    <>\n      <Button variant="secondary" onClick={() => setOpen(false)}>Vazgeç</Button>\n      <Button onClick={handleSave}>Kaydet</Button>\n    </>\n  }\n>\n  {/* Modal içeriği */}\n</Modal>`;
}

function ModalSection() {
  const { toast } = useToast();
  const [values, setValues] = useUrlValues("modal", modalControls, modalDefaults);
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <ComponentSection
      id="modal"
      title="Modal"
      description="Kullanıcının mevcut sayfa bağlamını kaybetmeden odaklanması gereken kritik onaylar, formlar veya detay pencereleri. Esc tuşu, dışarı tıklama ve kapatma butonu ile yönetilir."
      controls={modalControls}
      values={values}
      defaults={modalDefaults}
      onValuesChange={setValues}
      preview={
        <>
          <Button onClick={() => setOpen(true)}>Modalı Aç</Button>
          <Modal
            open={open}
            onClose={() => setOpen(false)}
            size={values.size as ModalSize}
            title={(values.title as string) || undefined}
            description={(values.description as string) || undefined}
            closeOnBackdropClick={values.closeOnBackdropClick as boolean}
            footer={
              <>
                <Button variant="secondary" onClick={() => setOpen(false)}>
                  Vazgeç
                </Button>
                <Button
                  onClick={() => {
                    setOpen(false);
                    toast({ tone: "success", title: "Davet gönderildi" });
                  }}
                >
                  Gönder
                </Button>
              </>
            }
          >
            <div className="flex flex-col gap-3">
              <Input label="Ad Soyad" placeholder="Örn: Zeynep Kaya" />
              <Select label="Rol" options={sampleRoles} />
            </div>
          </Modal>
        </>
      }
      code={modalCode(values)}
      guidance={{
        use: [
          "Geri alınamaz işlemlerden önce kullanıcıdan kesin onay almak için (ör. hesabı sil).",
          "Kullanıcıyı sayfadan uzaklaştırmadan kısa bir form doldurtmak için.",
        ],
        avoid: [
          "Sadece işlem sonucu bildirmek için (akışı bölmeyen Toast bileşenini kullan).",
          "Çok uzun, sayfalarca kaydırma gerektiren içerikler için (ayrı bir sayfa aç).",
        ],
      }}
      examples={[
        {
          title: "Tehlikeli İşlem Onayı (Danger Confirm)",
          content: (
            <>
              <Button variant="danger" onClick={() => setConfirmOpen(true)}>
                Projeyi Sil
              </Button>
              <Modal
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                size="sm"
                title="Projeyi silmek istediğine emin misin?"
                description="Bu işlem geri alınamaz ve tüm bileşen kayıtları kalıcı olarak silinir."
                footer={
                  <>
                    <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
                      İptal
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => {
                        setConfirmOpen(false);
                        toast({ tone: "danger", title: "Proje silindi" });
                      }}
                    >
                      Evet, Sil
                    </Button>
                  </>
                }
              >
                <p className="text-sm text-fg-muted">Devam etmeden önce yedek aldığından emin ol.</p>
              </Modal>
            </>
          ),
        },
      ]}
      props={[
        { name: "open", type: "boolean", description: "Modalın görünür olup olmadığını belirler (zorunlu)" },
        { name: "onClose", type: "() => void", description: "Esc, dış tıklama veya × butonuna basıldığında çalışır (zorunlu)" },
        { name: "title", type: "ReactNode", description: "Üst başlık; aria-labelledby ile bağlanır" },
        { name: "description", type: "ReactNode", description: "Başlığın altındaki açıklama metni" },
        { name: "size", type: '"sm" | "md" | "lg"', default: '"md"', description: "Pencere maksimum genişliği" },
        { name: "closeOnBackdropClick", type: "boolean", default: "true", description: "Arka plan karartmasına tıklandığında kapanmasını sağlar" },
        { name: "footer", type: "ReactNode", description: "Alt çizginin altında sağa hizalı aksiyon butonları alanı" },
      ]}
    />
  );
}

/* ---------- Badge ---------- */

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

const badgeControls: Control[] = [
  { name: "tone", type: "select", options: ["neutral", "primary", "success", "warning", "danger", "info"], hint: "Anlam rengi: nötr, marka, başarı, uyarı, hata, bilgi" },
  { name: "variant", type: "select", options: ["soft", "solid", "outline"], hint: "Açık zemin, dolu zemin veya yalnızca çerçeve" },
  { name: "size", type: "select", options: ["sm", "md"], hint: "Yükseklik (20 / 24 px)" },
  { name: "children", type: "text", hint: "Rozetin yazısı; kısa tut (1-2 kelime)" },
  { name: "dot", type: "boolean", hint: "Solda durum noktası" },
  { name: "removable", type: "boolean", hint: "onRemove verir: sağda × butonu çıkar" },
];
const badgeDefaults: Values = {
  tone: "success",
  variant: "soft",
  size: "md",
  children: "Yayında",
  dot: true,
  removable: false,
};

function badgeCode(v: Values) {
  const a: string[] = [];
  if (v.tone !== "neutral") a.push(`tone="${v.tone}"`);
  if (v.variant !== "soft") a.push(`variant="${v.variant}"`);
  if (v.size !== "md") a.push(`size="${v.size}"`);
  if (v.dot) a.push("dot");
  if (v.removable) a.push("onRemove={handleRemove}");
  return `<Badge${a.length ? ` ${a.join(" ")}` : ""}>${v.children}</Badge>`;
}

function FilterTagsDemo() {
  const all = ["React", "Tailwind", "TypeScript", "Vite"];
  const [tags, setTags] = useState(all);
  return (
    <>
      {tags.map((t) => (
        <Badge key={t} tone="primary" onRemove={() => setTags((prev) => prev.filter((x) => x !== t))}>
          {t}
        </Badge>
      ))}
      {tags.length < all.length && (
        <Button size="sm" variant="ghost" onClick={() => setTags(all)}>
          Geri getir
        </Button>
      )}
    </>
  );
}

function BadgeSection() {
  const { toast } = useToast();
  const [values, setValues] = useUrlValues("badge", badgeControls, badgeDefaults);
  return (
    <ComponentSection
      id="badge"
      title="Badge"
      description="Bir öğenin durumunu, kategorisini veya sayısını kısa bir etiketle gösterir. Etkileşimsizdir; yalnızca onRemove verilirse içinde kaldırma butonu olur."
      controls={badgeControls}
      values={values}
      defaults={badgeDefaults}
      onValuesChange={setValues}
      preview={
        <Badge
          tone={values.tone as BadgeTone}
          variant={values.variant as BadgeVariant}
          size={values.size as BadgeSize}
          dot={values.dot as boolean}
          onRemove={values.removable ? () => toast({ tone: "info", title: "onRemove çağrıldı", duration: 2000 }) : undefined}
        >
          {(values.children as string) || "Badge"}
        </Badge>
      }
      code={badgeCode(values)}
      guidance={{
        use: [
          "Bir kaydın durumunu göstermek için (Yayında, Taslak, Arşivlendi).",
          "Sayı veya kategori etiketi için (3 yeni, Beta, Ücretsiz).",
          "Seçili filtreleri kaldırılabilir etiketler halinde listelemek için (onRemove).",
        ],
        avoid: [
          "Tıklanınca bir işlem yapan öğeler için (Button kullan); rozet tıklanabilir görünmemeli.",
          "Uzun cümleler için; rozet 1-2 kelimeyi geçmemeli.",
          "Anlamı yalnızca renkle vermek için; metin de durumu söylemeli (renk körlüğü).",
        ],
      }}
      examples={[
        {
          title: "Tonlar (soft)",
          content: (
            <>
              <Badge>Taslak</Badge>
              <Badge tone="primary">Yeni</Badge>
              <Badge tone="success" dot>
                Yayında
              </Badge>
              <Badge tone="warning" dot>
                Beklemede
              </Badge>
              <Badge tone="danger" dot>
                Başarısız
              </Badge>
              <Badge tone="info">Beta</Badge>
            </>
          ),
        },
        {
          title: "Varyantlar: soft / solid / outline",
          content: (
            <>
              <Badge tone="primary">Soft</Badge>
              <Badge tone="primary" variant="solid">
                Solid
              </Badge>
              <Badge tone="primary" variant="outline">
                Outline
              </Badge>
              <Badge tone="success" variant="solid" icon={<CheckIcon />}>
                Doğrulandı
              </Badge>
              <Badge tone="danger" variant="solid" size="sm">
                12
              </Badge>
            </>
          ),
        },
        { title: "Kaldırılabilir filtre etiketleri", content: <FilterTagsDemo /> },
      ]}
      props={[
        { name: "tone", type: '"neutral" | "primary" | "success" | "warning" | "danger" | "info"', default: '"neutral"', description: "Anlam rengi" },
        { name: "variant", type: '"soft" | "solid" | "outline"', default: '"soft"', description: "Dolgu stili" },
        { name: "size", type: '"sm" | "md"', default: '"md"', description: "Yükseklik ve iç boşluk" },
        { name: "dot", type: "boolean", default: "false", description: "Solda durum noktası (ekran okuyucudan gizli)" },
        { name: "icon", type: "ReactNode", description: "Solda ikon; verilirse dot yerine geçer" },
        { name: "onRemove", type: "() => void", description: "Verilirse sağda × butonu çıkar" },
        { name: "removeLabel", type: "string", default: '"Kaldır"', description: '× butonunun ekran okuyucu adı; metinle birleşir: "Kaldır: React"' },
      ]}
    />
  );
}

/* ---------- EmptyState ---------- */

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4 4" />
  </svg>
);
const AlertIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 4 2.5 20h19z" />
    <path d="M12 10v4M12 17h.01" />
  </svg>
);

const emptyControls: Control[] = [
  { name: "title", type: "text", hint: "Ne olduğunu söyleyen kısa başlık (zorunlu)" },
  { name: "description", type: "text", hint: "Neden boş ve ne yapılabilir" },
  { name: "size", type: "select", options: ["sm", "md"], hint: "sm: kart/tablo içi, md: sayfa ortası" },
  { name: "tone", type: "select", options: ["neutral", "danger"], hint: "danger: içerik hata yüzünden gelmediyse" },
  { name: "bordered", type: "boolean", hint: "Kesik çizgili çerçeve" },
  { name: "action", type: "boolean", hint: "Ana eylem butonu ekler" },
];
const emptyDefaults: Values = {
  title: "Henüz proje yok",
  description: "İlk projeni oluşturduğunda burada listelenecek.",
  size: "md",
  tone: "neutral",
  bordered: true,
  action: true,
};

function emptyCode(v: Values) {
  const a: string[] = [`title="${v.title}"`];
  if (v.description) a.push(`description="${v.description}"`);
  if (v.size !== "md") a.push(`size="${v.size}"`);
  if (v.tone !== "neutral") a.push(`tone="${v.tone}"`);
  if (v.bordered) a.push("bordered");
  if (v.action) a.push(`action={<Button leftIcon={<PlusIcon />}>Proje oluştur</Button>}`);
  return `<EmptyState\n  ${a.join("\n  ")}\n/>`;
}

function SearchEmptyDemo() {
  const items = ["Button", "Input", "Select", "Modal", "Badge", "Toast"];
  const [query, setQuery] = useState("zzz");
  const results = items.filter((i) => i.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <div className="flex w-full flex-col gap-3">
      <Input label="Bileşen ara" value={query} onChange={(e) => setQuery(e.target.value)} />
      {results.length ? (
        <div className="flex flex-wrap gap-2">
          {results.map((r) => (
            <Badge key={r}>{r}</Badge>
          ))}
        </div>
      ) : (
        <EmptyState
          size="sm"
          icon={<SearchIcon />}
          title={`"${query}" için sonuç yok`}
          description="Yazımı kontrol et veya daha genel bir kelime dene."
          action={
            <Button size="sm" variant="secondary" onClick={() => setQuery("")}>
              Aramayı temizle
            </Button>
          }
        />
      )}
    </div>
  );
}

function EmptyStateSection() {
  const { toast } = useToast();
  const [values, setValues] = useUrlValues("empty", emptyControls, emptyDefaults);
  return (
    <ComponentSection
      id="empty-state"
      title="Empty State"
      description="Gösterilecek içerik olmadığında boş bir alan yerine ne olduğunu ve sonraki adımı anlatır: liste boş, arama sonuçsuz veya veri yüklenemedi."
      controls={emptyControls}
      values={values}
      defaults={emptyDefaults}
      onValuesChange={setValues}
      preview={
        <EmptyState
          title={(values.title as string) || "Başlık"}
          description={(values.description as string) || undefined}
          size={values.size as EmptyStateSize}
          tone={values.tone as EmptyStateTone}
          bordered={values.bordered as boolean}
          icon={values.tone === "danger" ? <AlertIcon /> : undefined}
          action={
            values.action ? (
              <Button leftIcon={<PlusIcon />} variant={values.tone === "danger" ? "secondary" : "primary"} onClick={() => toast({ tone: "info", title: "Eylem tıklandı", duration: 2000 })}>
                {values.tone === "danger" ? "Tekrar dene" : "Proje oluştur"}
              </Button>
            ) : undefined
          }
        />
      }
      code={emptyCode(values)}
      guidance={{
        use: [
          "Bir liste, tablo veya panel ilk kez boşken (kullanıcıya nasıl başlayacağını göster).",
          "Arama/filtre sonuç vermediğinde (filtreleri temizleme eylemi sun).",
          "Veri yüklenemediğinde tone=\"danger\" ile, tekrar deneme eylemiyle birlikte.",
        ],
        avoid: [
          "Veri hâlâ yüklenirken (LoadingState kullan; önce boş ekran göstermek yanıltır).",
          "Kısa süreli işlem sonuçları için (Toast kullan).",
          "Kullanıcıyı suçlayan metinlerle; ne olduğunu ve çözümü nötr dille anlat.",
        ],
      }}
      examples={[
        {
          title: "Arama sonuçsuz (sm, kart içi): yazınca sonuç gelir",
          content: <SearchEmptyDemo />,
        },
        {
          title: "Hata durumu",
          content: (
            <EmptyState
              tone="danger"
              icon={<AlertIcon />}
              title="Projeler yüklenemedi"
              description="Bağlantında bir sorun olabilir. Birkaç saniye sonra tekrar dene."
              action={
                <Button variant="secondary" onClick={() => toast({ tone: "info", title: "Tekrar deneniyor…", duration: 2000 })}>
                  Tekrar dene
                </Button>
              }
              secondaryAction={
                <Button variant="ghost" onClick={() => toast({ tone: "info", title: "Destek sayfası açılırdı", duration: 2000 })}>
                  Destek
                </Button>
              }
            />
          ),
        },
      ]}
      props={[
        { name: "title", type: "ReactNode", description: "Kısa başlık (zorunlu)" },
        { name: "description", type: "ReactNode", description: "Açıklama; neden boş ve ne yapılabilir" },
        { name: "icon", type: "ReactNode | false", default: "kutu ikonu", description: "Başlık üstündeki ikon; false ile gizlenir" },
        { name: "action / secondaryAction", type: "ReactNode", description: "Ana ve ikincil eylem (genelde Button)" },
        { name: "size", type: '"sm" | "md"', default: '"md"', description: "sm: kart içi, md: sayfa ortası" },
        { name: "tone", type: '"neutral" | "danger"', default: '"neutral"', description: "danger: hata durumu rengi" },
        { name: "headingLevel", type: '"h2" | "h3" | "h4"', default: '"h3"', description: "Başlığın HTML seviyesi; sayfa başlık sırasını korur" },
        { name: "bordered", type: "boolean", default: "false", description: "Kesik çizgili çerçeve" },
      ]}
    />
  );
}

/* ---------- LoadingState ---------- */

const loadingControls: Control[] = [
  { name: "variant", type: "select", options: ["spinner", "skeleton", "overlay"], hint: "Dönen gösterge, içerik iskeleti veya içeriğin üstüne perde" },
  { name: "label", type: "text", hint: "Ekran okuyucuya (ve spinner/overlay'de ekrana) yazılan metin" },
  { name: "hideLabel", type: "boolean", hint: "Metni yalnızca ekran okuyucuya bırakır" },
  { name: "size", type: "select", options: ["sm", "md", "lg"], hint: "Spinner boyutu (spinner/overlay)" },
  { name: "lines", type: "select", options: ["1", "2", "3", "4", "5"], hint: "İskelet satır sayısı (skeleton)" },
  { name: "avatar", type: "boolean", hint: "Başta avatar dairesi (skeleton)" },
];
const loadingDefaults: Values = {
  variant: "spinner",
  label: "Yükleniyor…",
  hideLabel: false,
  size: "md",
  lines: "3",
  avatar: false,
};

function loadingCode(v: Values) {
  const a: string[] = [];
  if (v.variant !== "spinner") a.push(`variant="${v.variant}"`);
  if (v.label !== "Yükleniyor…") a.push(`label="${v.label}"`);
  if (v.hideLabel) a.push("hideLabel");
  if (v.variant !== "skeleton" && v.size !== "md") a.push(`size="${v.size}"`);
  if (v.variant === "skeleton") {
    if (v.lines !== "3") a.push(`lines={${v.lines}}`);
    if (v.avatar) a.push("avatar");
  }
  const attrs = a.length ? ` ${a.join(" ")}` : "";
  if (v.variant === "overlay") return `<LoadingState${attrs} loading={saving}>\n  <ProfileForm />\n</LoadingState>`;
  return `<LoadingState${attrs} />`;
}

function FakeCard() {
  return (
    <div className="flex flex-col gap-3 rounded-card border border-border bg-surface/40 p-4">
      <Input label="Ad Soyad" defaultValue="Zeynep Kaya" />
      <Button size="sm">Kaydet</Button>
    </div>
  );
}

function FetchDemo() {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  useEffect(() => {
    if (state !== "loading") return;
    const t = window.setTimeout(() => setState("done"), 1500);
    return () => window.clearTimeout(t);
  }, [state]);
  return (
    <div className="flex w-full flex-col gap-3">
      <div>
        <Button size="sm" variant="secondary" loading={state === "loading"} onClick={() => setState("loading")}>
          Veriyi getir
        </Button>
      </div>
      <div className="min-h-24 rounded-card border border-border p-4">
        {state === "idle" && <EmptyState size="sm" icon={false} title="Henüz veri yok" description="Getirmek için butona bas." />}
        {state === "loading" && <LoadingState variant="skeleton" avatar lines={2} label="Kullanıcı getiriliyor" />}
        {state === "done" && (
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-primary-soft font-semibold text-primary" aria-hidden="true">
              ZK
            </span>
            <div className="flex flex-col">
              <span className="font-medium">Zeynep Kaya</span>
              <span className="text-sm text-fg-muted">Frontend Geliştirici</span>
            </div>
            <Badge tone="success" dot className="ml-auto">
              Aktif
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingStateSection() {
  const [values, setValues] = useUrlValues("loading", loadingControls, loadingDefaults);
  const variant = values.variant as LoadingStateVariant;
  return (
    <ComponentSection
      id="loading-state"
      title="Loading State"
      description="Veri beklenirken kullanıcıya bir şeylerin olduğunu gösterir. role=&quot;status&quot; ile ekran okuyucuya duyurulur. Üç biçimi var: spinner, skeleton (içerik iskeleti) ve overlay (mevcut içeriğin üstüne perde)."
      controls={loadingControls}
      values={values}
      defaults={loadingDefaults}
      onValuesChange={setValues}
      preview={
        <div className="w-full max-w-sm">
          <LoadingState
            variant={variant}
            label={(values.label as string) || "Yükleniyor…"}
            hideLabel={values.hideLabel as boolean}
            size={values.size as LoadingStateSize}
            lines={Number(values.lines)}
            avatar={values.avatar as boolean}
            className={variant === "overlay" ? "rounded-card" : undefined}
          >
            {variant === "overlay" ? <FakeCard /> : undefined}
          </LoadingState>
        </div>
      }
      code={loadingCode(values)}
      guidance={{
        use: [
          "skeleton: içeriğin şekli belliyse (liste, kart, profil); sayfa zıplamaz.",
          "spinner: şekli belli olmayan veya kısa beklemeler için (bir panel, bir arama).",
          "overlay: kullanıcı içeriği görürken kaydetme gibi bir işlem sürüyorsa; içerik kilitlenir.",
        ],
        avoid: [
          "Bir butonun kendi işlemi için (Button'ın loading prop'unu kullan).",
          "Çok kısa (300 ms altı) işlemler için; göz kırpması gibi görünür, gecikmeli göster.",
          "Aynı ekranda birden fazla spinner ile; tek bir yükleme durumu yeterli.",
        ],
      }}
      examples={[
        {
          title: "Spinner boyutları",
          content: (
            <>
              <LoadingState size="sm" hideLabel label="Küçük yükleniyor" className="p-2" />
              <LoadingState size="md" label="Orta" className="p-2" />
              <LoadingState size="lg" label="Büyük" className="p-2" />
            </>
          ),
        },
        {
          title: "Skeleton parçaları ile özel iskelet (kart)",
          content: (
            <div role="status" aria-label="Kart yükleniyor" className="flex w-full max-w-xs flex-col gap-3 rounded-card border border-border p-4">
              <Skeleton height="8rem" className="rounded-control" />
              <Skeleton width="70%" height="1rem" />
              <Skeleton width="45%" />
            </div>
          ),
        },
        { title: "Gerçek akış: boş → yükleniyor → içerik", content: <FetchDemo /> },
      ]}
      props={[
        { name: "variant", type: '"spinner" | "skeleton" | "overlay"', default: '"spinner"', description: "Yükleme biçimi" },
        { name: "label", type: "string", default: '"Yükleniyor…"', description: "Ekran okuyucu metni; spinner/overlay'de ekranda da görünür" },
        { name: "hideLabel", type: "boolean", default: "false", description: "Metni ekranda gizler, ekran okuyucu yine duyar" },
        { name: "size", type: '"sm" | "md" | "lg"', default: '"md"', description: "Spinner boyutu" },
        { name: "lines", type: "number", default: "3", description: "skeleton: satır sayısı; son satır kısa çizilir" },
        { name: "avatar", type: "boolean", default: "false", description: "skeleton: başta daire" },
        { name: "loading", type: "boolean", default: "true", description: "overlay: perde görünür mü; açıkken içerik inert (kilitli)" },
        { name: "children", type: "ReactNode", description: "overlay: üstüne perde inecek içerik" },
        { name: "<Skeleton>", type: "width, height, circle", description: "Özel iskeletler kurmak için tek parça" },
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
    } catch {}
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
      <header className="glass flex flex-wrap items-center justify-between gap-3 rounded-card px-4 py-2.5">
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
        <nav aria-label="Bileşenler" className="order-last flex w-full items-center gap-1 overflow-x-auto text-sm sm:order-none sm:w-auto">
          <a href="#button" className="rounded-control px-3 py-1.5 text-fg-muted hover:bg-white/8 hover:text-fg">Button</a>
          <a href="#toast" className="rounded-control px-3 py-1.5 text-fg-muted hover:bg-white/8 hover:text-fg">Toast</a>
          <a href="#input" className="rounded-control px-3 py-1.5 text-fg-muted hover:bg-white/8 hover:text-fg">Input</a>
          <a href="#select" className="rounded-control px-3 py-1.5 text-fg-muted hover:bg-white/8 hover:text-fg">Select</a>
          <a href="#modal" className="rounded-control px-3 py-1.5 text-fg-muted hover:bg-white/8 hover:text-fg">Modal</a>
          <a href="#badge" className="rounded-control px-3 py-1.5 text-fg-muted hover:bg-white/8 hover:text-fg">Badge</a>
          <a href="#empty-state" className="rounded-control px-3 py-1.5 whitespace-nowrap text-fg-muted hover:bg-white/8 hover:text-fg">Empty State</a>
          <a href="#loading-state" className="rounded-control px-3 py-1.5 whitespace-nowrap text-fg-muted hover:bg-white/8 hover:text-fg">Loading State</a>
        </nav>
        <ThemeButton />
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-16 px-2 py-6 sm:px-4">
        <ButtonSection />
        <ToastSection />
        <InputSection />
        <SelectSection />
        <ModalSection />
        <BadgeSection />
        <EmptyStateSection />
        <LoadingStateSection />
      </main>
    </div>
  );
}