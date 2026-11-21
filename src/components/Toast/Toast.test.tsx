import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TOAST_EXIT_MS, ToastProvider, useToast } from "./Toast";
import type { ToastContextValue, ToastId, ToastOptions } from "./Toast";

/** Butona basınca verilen ayarlarla toast gösteren yardımcı bileşen */
function Trigger({ options }: { options: ToastOptions }) {
  const { toast } = useToast();
  return <button onClick={() => toast(options)}>Göster</button>;
}

function setup(options: ToastOptions, max?: number) {
  render(
    <ToastProvider max={max}>
      <Trigger options={options} />
    </ToastProvider>,
  );
  return () => fireEvent.click(screen.getByRole("button", { name: "Göster" }));
}

/** Bağlam fonksiyonlarını (toast, update, promise...) testten doğrudan çağırmak için */
function withApi() {
  let api!: ToastContextValue;
  function Grab() {
    api = useToast();
    return <button>Odak</button>;
  }
  render(
    <ToastProvider>
      <Grab />
    </ToastProvider>,
  );
  return () => api;
}

// Süreyi beklemek yerine saati elle ilerletiyoruz (sahte zamanlayıcı)
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());
const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

describe("Toast", () => {
  it("başlık ve açıklamayı role=status ile gösterir", () => {
    const show = setup({ title: "Kaydedildi", description: "Profil güncellendi" });
    show();
    const toast = screen.getByRole("status");
    expect(toast).toHaveTextContent("Kaydedildi");
    expect(toast).toHaveTextContent("Profil güncellendi");
  });

  it("danger tonu role=alert kullanır (ekran okuyucu hemen okur)", () => {
    setup({ tone: "danger", title: "Bağlantı koptu" })();
    expect(screen.getByRole("alert")).toHaveTextContent("Bağlantı koptu");
  });

  it("süre dolunca kendiliğinden kapanır (önce animasyon, sonra DOM'dan kalkar)", () => {
    setup({ title: "Geçici", duration: 3000 })();
    advance(2999);
    expect(screen.getByText("Geçici")).toBeInTheDocument();
    advance(1);
    // Kapanırken ekran okuyucudan hemen gizlenir
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    advance(TOAST_EXIT_MS);
    expect(screen.queryByText("Geçici")).not.toBeInTheDocument();
  });

  it("duration=0 iken kendiliğinden kapanmaz", () => {
    setup({ title: "Kalıcı", duration: 0 })();
    advance(60_000);
    expect(screen.getByText("Kalıcı")).toBeInTheDocument();
  });

  it("kapat butonu toast'ı kaldırır", () => {
    setup({ title: "Kapatılacak", duration: 0 })();
    fireEvent.click(screen.getByRole("button", { name: "Bildirimi kapat" }));
    advance(TOAST_EXIT_MS);
    expect(screen.queryByText("Kapatılacak")).not.toBeInTheDocument();
  });

  it("aksiyon butonu çağrılır ve toast kapanır", () => {
    const undo = vi.fn();
    setup({ title: "Silindi", duration: 0, action: { label: "Geri al", onClick: undo } })();
    fireEvent.click(screen.getByRole("button", { name: "Geri al" }));
    expect(undo).toHaveBeenCalledTimes(1);
    advance(TOAST_EXIT_MS);
    expect(screen.queryByText("Silindi")).not.toBeInTheDocument();
  });

  it("fare üzerindeyken süre durur, ayrılınca kalan süreden devam eder", () => {
    setup({ title: "Bekle", duration: 4000 })();
    advance(1000);

    fireEvent.mouseEnter(screen.getByRole("status"));
    advance(10_000);
    expect(screen.getByText("Bekle")).toBeInTheDocument();

    fireEvent.mouseLeave(screen.getByRole("status"));
    advance(2999); // kalan 3000 ms'nin 2999'u
    expect(screen.getByText("Bekle")).toBeInTheDocument();
    advance(1 + TOAST_EXIT_MS);
    expect(screen.queryByText("Bekle")).not.toBeInTheDocument();
  });

  it("en fazla `max` bildirim görünür; fazlası atılmaz, sıraya alınır ve biri kapanınca görünür", () => {
    let n = 0;
    function Many() {
      const { toast } = useToast();
      return <button onClick={() => toast({ title: `Bildirim ${++n}`, duration: 3000 })}>Ekle</button>;
    }
    render(
      <ToastProvider max={2}>
        <Many />
      </ToastProvider>,
    );
    const add = () => fireEvent.click(screen.getByRole("button", { name: "Ekle" }));
    add();
    advance(1000);
    add();
    add();
    expect(screen.getByText("Bildirim 1")).toBeInTheDocument();
    expect(screen.getByText("Bildirim 2")).toBeInTheDocument();
    expect(screen.queryByText("Bildirim 3")).not.toBeInTheDocument();
    expect(screen.getByText("+1 bildirim sırada")).toBeInTheDocument();

    // Bildirim 1'in süresi dolar; sıradaki görünür ve kendi süresi O AN başlar
    advance(2000);
    expect(screen.getByText("Bildirim 3")).toBeInTheDocument();
    expect(screen.queryByText(/sırada/)).not.toBeInTheDocument();
    advance(2999);
    expect(screen.getByText("Bildirim 3")).toBeInTheDocument();
  });

  it("useToast, Provider dışında kullanılırsa anlaşılır hata verir", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {}); // React'in hata logunu sustur
    expect(() => render(<Trigger options={{ title: "x" }} />)).toThrow("ToastProvider");
    spy.mockRestore();
  });

  it("aynı id ile tekrar çağrılınca yığılmaz, mevcut bildirim güncellenir", () => {
    const api = withApi();
    act(() => {
      api().toast({ id: "baglanti", tone: "danger", title: "Bağlantı koptu", duration: 0 });
      api().toast({ id: "baglanti", tone: "danger", title: "Bağlantı koptu (2. deneme)", duration: 0 });
    });
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    expect(screen.getByRole("alert")).toHaveTextContent("2. deneme");
  });

  it("update içeriği değiştirir ve süreyi baştan başlatır", () => {
    const api = withApi();
    let id: ToastId = 0;
    act(() => {
      id = api().toast({ title: "Yükleniyor", duration: 3000 });
    });
    advance(2500);
    act(() => api().update(id, { tone: "success", title: "Bitti" }));
    expect(screen.getByRole("status")).toHaveTextContent("Bitti");
    advance(3000); // yeni tonun varsayılan süresi 4000: hâlâ açık
    expect(screen.getByText("Bitti")).toBeInTheDocument();
    advance(1000 + TOAST_EXIT_MS);
    expect(screen.queryByText("Bitti")).not.toBeInTheDocument();
  });

  it("promise: önce yükleniyor (kendiliğinden kapanmaz), bitince başarı", async () => {
    const api = withApi();
    let resolve!: (v: string) => void;
    const p = new Promise<string>((r) => (resolve = r));
    act(() => {
      api().promise(p, { loading: "Kaydediliyor…", success: (v) => `${v} kaydedildi`, error: "Kaydedilemedi" });
    });
    expect(screen.getByRole("status")).toHaveTextContent("Kaydediliyor…");
    advance(60_000);
    expect(screen.getByText("Kaydediliyor…")).toBeInTheDocument();
    await act(async () => resolve("Profil"));
    expect(screen.getByRole("status")).toHaveTextContent("Profil kaydedildi");
  });

  it("promise: hata olursa danger (alert) olur", async () => {
    const api = withApi();
    let reject!: (e: Error) => void;
    const p = new Promise<void>((_, r) => (reject = r));
    act(() => {
      api()
        .promise(p, { loading: "Gönderiliyor", success: "Gönderildi", error: (e) => `Hata: ${(e as Error).message}` })
        .catch(() => {});
    });
    await act(async () => reject(new Error("ağ yok")));
    expect(screen.getByRole("alert")).toHaveTextContent("Hata: ağ yok");
  });

  it("dismissAll hepsini kapatır", () => {
    const api = withApi();
    act(() => {
      api().toast({ title: "Bir", duration: 0 });
      api().toast({ title: "İki", duration: 0 });
    });
    act(() => api().dismissAll());
    advance(TOAST_EXIT_MS);
    expect(screen.queryByText("Bir")).not.toBeInTheDocument();
    expect(screen.queryByText("İki")).not.toBeInTheDocument();
  });

  it("F8 odağı bildirimlere taşır, Esc kapatır ve odağı eski yerine döndürür", () => {
    const api = withApi();
    act(() => {
      api().toast({ title: "Klavye", duration: 0 });
    });
    const before = screen.getByRole("button", { name: "Odak" });
    before.focus();
    fireEvent.keyDown(window, { key: "F8" });
    expect(screen.getByRole("region", { name: "Bildirimler" })).toHaveFocus();

    screen.getByRole("button", { name: "Bildirimi kapat" }).focus();
    fireEvent.keyDown(screen.getByRole("status"), { key: "Escape" });
    expect(before).toHaveFocus();
    advance(TOAST_EXIT_MS);
    expect(screen.queryByText("Klavye")).not.toBeInTheDocument();
  });

  it("onClose kapanma nedeniyle bir kez çağrılır", () => {
    const api = withApi();
    const reasons: string[] = [];
    const onClose = (r: string) => reasons.push(r);
    act(() => {
      api().toast({ title: "Süre", duration: 1000, onClose });
      api().toast({ title: "Çarpı", duration: 0, onClose });
      api().toast({ title: "Eylem", duration: 0, onClose, action: { label: "Geri al", onClick: () => {} } });
    });
    advance(1000);
    const closeButtons = screen.getAllByRole("button", { name: "Bildirimi kapat" });
    fireEvent.click(closeButtons[0]);
    fireEvent.click(closeButtons[0]); // ikinci tıklama yeni bir onClose üretmez
    fireEvent.click(screen.getByRole("button", { name: "Geri al" }));
    expect(reasons).toEqual(["timeout", "close", "action"]);
  });

  it("dismissAll sıradakiler dahil hepsine onClose(dismissAll) gönderir", () => {
    const api = withApi();
    const onClose = vi.fn();
    act(() => {
      for (let i = 0; i < 6; i++) api().toast({ title: `B${i}`, duration: 0, onClose });
    });
    act(() => api().dismissAll());
    expect(onClose).toHaveBeenCalledTimes(6);
    expect(onClose).toHaveBeenCalledWith("dismissAll");
  });

  describe("kaydırarak kapatma", () => {
    const swipe = (el: HTMLElement, dx: number) => {
      fireEvent.pointerDown(el, { pointerId: 1, button: 0, clientX: 100 });
      fireEvent.pointerMove(el, { pointerId: 1, clientX: 100 + dx / 2 });
      fireEvent.pointerMove(el, { pointerId: 1, clientX: 100 + dx });
      fireEvent.pointerUp(el, { pointerId: 1, clientX: 100 + dx });
    };

    it("yeterince yana kaydırılınca kapanır (onClose: swipe)", () => {
      const api = withApi();
      const onClose = vi.fn();
      act(() => {
        api().toast({ title: "Kaydır", duration: 0, onClose });
      });
      swipe(screen.getByRole("status"), 150);
      expect(onClose).toHaveBeenCalledWith("swipe");
      advance(TOAST_EXIT_MS);
      expect(screen.queryByText("Kaydır")).not.toBeInTheDocument();
    });

    it("az kaydırılırsa yerine döner; sürükleme bitince gelen tıklama × düğmesine basmış sayılmaz", () => {
      const api = withApi();
      const onClose = vi.fn();
      act(() => {
        api().toast({ title: "Geri dön", duration: 0, onClose });
      });
      const close = screen.getByRole("button", { name: "Bildirimi kapat" });
      swipe(close, 30);
      fireEvent.click(close); // tarayıcı sürüklemenin sonunda tıklama da üretir
      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByRole("status").style.transform).toBe("");
    });

    it("küçük titreme sürükleme sayılmaz, tıklama çalışır", () => {
      const api = withApi();
      const onClose = vi.fn();
      act(() => {
        api().toast({ title: "Tıkla", duration: 0, onClose });
      });
      const close = screen.getByRole("button", { name: "Bildirimi kapat" });
      swipe(close, 3);
      fireEvent.click(close);
      expect(onClose).toHaveBeenCalledWith("close");
    });
  });

  it("süre çubuğu fare üzerindeyken durur; kalıcı bildirimde çubuk yoktur", () => {
    const api = withApi();
    act(() => {
      api().toast({ title: "Süreli", duration: 4000 });
      api().toast({ title: "Kalıcı", duration: 0 });
    });
    const bars = screen.getAllByTestId("toast-progress");
    expect(bars).toHaveLength(1);
    fireEvent.mouseEnter(screen.getByText("Süreli").closest("[data-toast]")!);
    expect(screen.getByTestId("toast-progress")).toHaveStyle({ animationPlayState: "paused" });
  });
});
