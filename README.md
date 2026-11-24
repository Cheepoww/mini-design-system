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

## Badge, EmptyState, LoadingState

Üçü de `src/components` altından dışa açılır ve playground sayfasında (`npm run dev`) canlı prop kontrolleri, örnekler ve prop tablolarıyla belgelenmiştir. Renkler `src/styles/tokens.css` içindeki token'lardan gelir; açık/koyu tema otomatik çalışır.

### Badge

Kısa durum, kategori veya sayı etiketi.

```tsx
import { Badge } from "./components";

<Badge tone="success" dot>Yayında</Badge>
<Badge tone="danger" variant="solid" size="sm">12</Badge>
<Badge tone="primary" onRemove={() => removeTag("React")}>React</Badge>
```

| Prop | Tip | Varsayılan | Açıklama |
| --- | --- | --- | --- |
| `tone` | `"neutral" \| "primary" \| "success" \| "warning" \| "danger" \| "info"` | `"neutral"` | Anlam rengi |
| `variant` | `"soft" \| "solid" \| "outline"` | `"soft"` | Dolgu stili |
| `size` | `"sm" \| "md"` | `"md"` | Yükseklik |
| `dot` | `boolean` | `false` | Solda durum noktası |
| `icon` | `ReactNode` | – | Solda ikon (dot yerine geçer) |
| `onRemove` | `() => void` | – | Verilirse × butonu çıkar |
| `removeLabel` | `string` | `"Kaldır"` | × butonunun erişilebilir adı |

### EmptyState

Liste boş, arama sonuçsuz veya veri yüklenemedi durumları için.

```tsx
import { Button, EmptyState } from "./components";

<EmptyState
  title="Henüz proje yok"
  description="İlk projeni oluşturduğunda burada listelenecek."
  action={<Button>Proje oluştur</Button>}
  bordered
/>

<EmptyState tone="danger" title="Projeler yüklenemedi" action={<Button variant="secondary">Tekrar dene</Button>} />
```

| Prop | Tip | Varsayılan | Açıklama |
| --- | --- | --- | --- |
| `title` | `ReactNode` | – | Başlık (zorunlu) |
| `description` | `ReactNode` | – | Açıklama |
| `icon` | `ReactNode \| false` | kutu ikonu | `false` ile gizlenir |
| `action`, `secondaryAction` | `ReactNode` | – | Eylemler |
| `size` | `"sm" \| "md"` | `"md"` | `sm`: kart içi, `md`: sayfa ortası |
| `tone` | `"neutral" \| "danger"` | `"neutral"` | Hata durumu rengi |
| `headingLevel` | `"h2" \| "h3" \| "h4"` | `"h3"` | Başlık seviyesi |
| `bordered` | `boolean` | `false` | Kesik çizgili çerçeve |

### LoadingState ve Skeleton

Veri beklenirken gösterilir; `role="status"` ile ekran okuyucuya duyurulur.

```tsx
import { LoadingState, Skeleton } from "./components";

<LoadingState />                                   {/* spinner + "Yükleniyor…" */}
<LoadingState variant="skeleton" lines={3} avatar />
<LoadingState variant="overlay" loading={saving} label="Kaydediliyor…">
  <ProfileForm />
</LoadingState>

<Skeleton width="60%" height="1rem" />
```

| Prop | Tip | Varsayılan | Açıklama |
| --- | --- | --- | --- |
| `variant` | `"spinner" \| "skeleton" \| "overlay"` | `"spinner"` | Yükleme biçimi |
| `label` | `string` | `"Yükleniyor…"` | Ekran okuyucu (ve spinner/overlay'de ekran) metni |
| `hideLabel` | `boolean` | `false` | Metni yalnızca ekran okuyucuya bırakır |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Spinner boyutu |
| `lines` | `number` | `3` | skeleton satır sayısı |
| `avatar` | `boolean` | `false` | skeleton başında daire |
| `loading` | `boolean` | `true` | overlay perdesi açık mı (açıkken içerik `inert`) |
| `children` | `ReactNode` | – | overlay altındaki içerik |
