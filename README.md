Mission Description
Build a small standalone frontend design system and interactive component playground. The intern should create reusable UI components such as buttons, inputs, selects, modals, badges, empty states, loading states, and toast notifications, then document them inside a playground page. The goal is to understand component APIs, design consistency, props, slots, reusable states, and frontend documentation patterns.

Context & Background
Modern SaaS products need consistent UI components to move quickly without creating visual or behavioral inconsistencies. A component playground helps teams test components, document usage, and improve design quality.

This mission teaches the intern how reusable frontend systems are designed before they become part of a larger product.

Problem Statement
Create a small component library and playground interface where each component can be previewed with different variants, states, and props. The challenge is to design components that are flexible but still simple to use.

Expected Deliverables
A standalone frontend project.
Reusable components: Button, Input, Select, Modal, Badge, Toast, Empty State, Loading State.
Component playground page with examples and variants.
Support for disabled, loading, error, success, and empty states where relevant.
Basic responsive layout.
Short documentation for component props and usage examples.

---

## Button ve Toast

İkisi de `src/components` altından dışa açılır. Playground sayfasında (`npm run dev`) canlı prop kontrolleri, örnekler ("Kodu göster") ve prop tablolarıyla belgelenmiştir. Renkler `src/styles/tokens.css` içindeki token'lardan gelir; açık ve koyu tema otomatik çalışır.

### Button

Kullanıcının bir işlem başlatması için. Başka sayfaya götürecekse `href` ver: `<a>` olarak çizilir.

```tsx
import { Button, ConfirmButton } from "./components";

<Button onClick={save}>Kaydet</Button>
<Button variant="secondary" size="sm" leftIcon={<PlusIcon />}>Yeni ekle</Button>

// async onClick: yükleniyor → ✓ / ✕ durumlarını buton kendisi gösterir
<Button loadingText="Kaydediliyor…" successText="Kaydedildi" errorText="Kaydedilemedi" onClick={() => api.save(form)}>
  Değişiklikleri kaydet
</Button>

<Button disabled={!accepted} disabledReason="Önce koşulları kabul edin">Hesap oluştur</Button>
<ConfirmButton onConfirm={deleteProject}>Kalıcı sil</ConfirmButton>
```

| Prop | Tip | Varsayılan | Açıklama |
| --- | --- | --- | --- |
| `variant` | `"primary" \| "secondary" \| "ghost" \| "danger"` | `"primary"` | Görsel stil |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Yükseklik ve yazı boyutu |
| `onClick` | `(e) => unknown` | – | Promise döndürürse buton yükleniyor / başarı / hata durumlarını kendisi yönetir |
| `onError` | `(error) => void` | – | async onClick hata verirse çağrılır; verilmezse hata konsola yazılır |
| `loading` / `loadingText` | `boolean`, `ReactNode` | `false` | Spinner, tıklama kilidi; genişlik sabit kalır |
| `success` / `successText` | `boolean`, `ReactNode` | `false` | ✓ ikonu ve metin |
| `error` / `errorText` | `boolean`, `ReactNode` | `false` | ✕ ikonu, kırmızı renk |
| `progress` | `number` (0–1) | – | Buton dolar ve yüzde gösterir |
| `disabled` / `disabledReason` | `boolean`, `string` | `false` | Neden verilirse buton odaklanabilir kalır, neden ipucu olarak görünür |
| `href` | `string` | – | Verilirse `<a>` çizilir |
| `shortcut` | `string` | – | Klavye kısayolu, ör. `"Mod+S"` (Mac'te ⌘, diğerlerinde Ctrl) |
| `leftIcon` / `rightIcon` | `ReactNode` | – | Metnin solunda / sağında ikon |
| `fullWidth` | `boolean` | `false` | Genişliği %100 yapar |

Ayrıca: `IconButton` (yalnızca ikon, `label` zorunlu), `ToggleButton` (aç/kapa, `pressed` / `onPressedChange`), `ConfirmButton` (iki adımlı onay, `onConfirm`), `ButtonGroup` (tek seçim ya da yapışık butonlar, `label` zorunlu).

### Toast

İşlem sonucu gibi kısa, akışı bölmeyen bildirimler. Uygulama bir kez `ToastProvider` ile sarılır, sonra her yerden `useToast()` ile çağrılır.

```tsx
import { ToastProvider, useToast } from "./components";

// main.tsx
<ToastProvider>
  <App />
</ToastProvider>

// herhangi bir bileşende
const { toast, update, dismiss, promise } = useToast();

toast({ tone: "success", title: "Kaydedildi" });
toast({
  title: '"Rapor" silindi',
  action: { label: "Geri al", onClick: restore, countdown: true },
  onClose: (reason) => reason !== "action" && deleteForever(),
});
promise(api.save(profile), { loading: "Kaydediliyor…", success: "Kaydedildi", error: "Kaydedilemedi" });
```

| Seçenek | Tip | Varsayılan | Açıklama |
| --- | --- | --- | --- |
| `title` | `ReactNode` | – | Başlık (zorunlu) |
| `description` | `ReactNode` | – | İkinci satır |
| `tone` | `"info" \| "success" \| "warning" \| "danger" \| "loading"` | `"info"` | Renk ve ikon; `danger` ekran okuyucuya hemen okunur |
| `duration` | `number` (ms) | `4000` | 0 = kendiliğinden kapanmaz; fare üzerindeyken ve sekme gizliyken durur |
| `action` / `secondaryAction` | `{ label, onClick }` | – | Eylem düğmeleri; `countdown: true` kalan saniyeyi gösterir |
| `progress` | `number` (0–1) | – | Dolan çubuk; sürerken kapanmaz |
| `dismissible` | `boolean` | `true` | `false`: kullanıcı kapatamaz, yalnızca kod kapatır |
| `id` | `string \| number` | – | Aynı id ile gelen bildirim yığılmaz, güncellenir (×N) |
| `onClose` | `(reason) => void` | – | Kapanınca neden kapandığını söyler |

`ToastProvider` ayarları: `position` (6 konum), `max` (varsayılan 4; fazlası sırada bekler), `stack` (deste görünümü), `historyLimit`, `hotkey` (varsayılan `F8`). Geçmiş için `<ToastHistory />`, başlık zili için `<ToastHistoryButton />` ya da `useToastHistory()`.
