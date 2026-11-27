import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BUTTON_FEEDBACK_MS, Button, ButtonGroup, CONFIRM_GUARD_MS, ConfirmButton, IconButton, ToggleButton } from "./Button";

describe("Button", () => {
  it("metnini gösterir ve tıklanınca onClick çağrılır", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Kaydet</Button>);

    await userEvent.click(screen.getByRole("button", { name: "Kaydet" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("varsayılan type 'button' olur (form içinde yanlışlıkla submit etmesin)", () => {
    render(<Button>Tamam</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it("disabled iken tıklanamaz", async () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Sil</Button>);

    const button = screen.getByRole("button", { name: "Sil" });
    await userEvent.click(button);

    expect(button).toBeDisabled();
    expect(onClick).not.toHaveBeenCalled();
  });

  it("loading iken kilitlenir ve aria-busy ile bildirir", async () => {
    const onClick = vi.fn();
    render(<Button loading onClick={onClick}>Gönder</Button>);

    const button = screen.getByRole("button", { name: "Gönder" });
    await userEvent.click(button);

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(onClick).not.toHaveBeenCalled();
  });

  it("loading iken ikonların yerine spinner gösterir", () => {
    render(
      <Button loading leftIcon={<span data-testid="sol" />} rightIcon={<span data-testid="sag" />}>
        Yükle
      </Button>,
    );
    expect(screen.queryByTestId("sol")).not.toBeInTheDocument();
    expect(screen.queryByTestId("sag")).not.toBeInTheDocument();
    expect(screen.getByRole("button").querySelector("svg.animate-spin")).toBeInTheDocument();
  });

  it("className ve native prop'ları dışarıdan kabul eder", () => {
    render(<Button className="ozel" aria-label="Yeni kayıt" type="submit">+</Button>);
    const button = screen.getByRole("button", { name: "Yeni kayıt" });
    expect(button).toHaveClass("ozel");
    expect(button).toHaveAttribute("type", "submit");
  });

  it("loadingText yüklenirken metnin yerine geçer", () => {
    const { rerender } = render(<Button loadingText="Kaydediliyor…">Kaydet</Button>);
    expect(screen.getByRole("button")).toHaveTextContent("Kaydet");
    rerender(<Button loading loadingText="Kaydediliyor…">Kaydet</Button>);
    expect(screen.getByRole("button")).toHaveTextContent("Kaydediliyor…");
  });

  it("yüklenirken yükleme öncesi genişliği korur (yanındakiler zıplamaz)", () => {
    const width = vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(120);
    const { rerender } = render(<Button>Kaydet</Button>);
    rerender(<Button loading>Kaydet</Button>);
    expect(screen.getByRole("button")).toHaveStyle({ minWidth: "120px" });
    rerender(<Button>Kaydet</Button>);
    expect(screen.getByRole("button").style.minWidth).toBe("");
    width.mockRestore();
  });

  it("dışarıdan verilen ref butona ulaşır", () => {
    let el: HTMLButtonElement | null = null;
    render(
      <Button
        ref={(e) => {
          el = e;
        }}
      >
        Tamam
      </Button>,
    );
    expect(el).toBe(screen.getByRole("button"));
  });
});

describe("IconButton", () => {
  it("label ekran okuyucu adı ve ipucu olur", () => {
    render(<IconButton icon={<svg data-testid="ikon" />} label="Sil" />);
    const button = screen.getByRole("button", { name: "Sil" });
    expect(button).toHaveAttribute("title", "Sil");
    expect(screen.getByTestId("ikon")).toBeInTheDocument();
  });

  it("kare kalır: Button'ın yatay boşluğu ikonu sıkıştırmaz (regresyon)", () => {
    render(<IconButton icon={<svg />} label="Düzenle" size="lg" />);
    // px-0! önemli işaretli; Button'ın px-6'sına karşı kazanır
    expect(screen.getByRole("button", { name: "Düzenle" })).toHaveClass("size-12", "px-0!");
  });

  it("loading iken ikonun yerine spinner, ad korunur", () => {
    render(<IconButton icon={<svg data-testid="ikon" />} label="Yenile" loading />);
    expect(screen.queryByTestId("ikon")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Yenile" })).toHaveAttribute("aria-busy", "true");
  });
});

describe("ButtonGroup", () => {
  it("eylem modu: içindeki butonları adlı bir grup olarak sunar", () => {
    render(
      <ButtonGroup label="Metin hizası">
        <Button variant="secondary">Sol</Button>
        <Button variant="secondary">Orta</Button>
      </ButtonGroup>,
    );
    expect(screen.getByRole("group", { name: "Metin hizası" })).toBeInTheDocument();
  });

  function Range() {
    const [value, setValue] = useState("week");
    return (
      <ButtonGroup
        label="Zaman aralığı"
        value={value}
        onValueChange={setValue}
        options={[
          { value: "day", label: "Gün" },
          { value: "week", label: "Hafta" },
          { value: "month", label: "Ay", disabled: true },
          { value: "year", label: "Yıl" },
        ]}
      />
    );
  }

  it("seçim modu: radyo grubu; tıklayınca seçilir", () => {
    render(<Range />);
    expect(screen.getByRole("radiogroup", { name: "Zaman aralığı" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Hafta" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("radio", { name: "Gün" }));
    expect(screen.getByRole("radio", { name: "Gün" })).toHaveAttribute("aria-checked", "true");
  });

  it("ok tuşları seçer ve pasif seçeneği atlar; Tab'da yalnızca seçili seçenek durak", () => {
    render(<Range />);
    const week = screen.getByRole("radio", { name: "Hafta" });
    expect(week).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("radio", { name: "Gün" })).toHaveAttribute("tabindex", "-1");
    week.focus();
    fireEvent.keyDown(week, { key: "ArrowRight" });
    const year = screen.getByRole("radio", { name: "Yıl" });
    expect(year).toHaveAttribute("aria-checked", "true"); // "Ay" pasif, atlandı
    expect(year).toHaveFocus();
    fireEvent.keyDown(year, { key: "ArrowRight" }); // sondan başa döner
    expect(screen.getByRole("radio", { name: "Gün" })).toHaveAttribute("aria-checked", "true");
  });
});

describe("Button: nedenini söyleyen pasif (disabledReason)", () => {
  it("odaklanabilir kalır, nedeni açıklama olarak okunur, tıklama çalışmaz", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled disabledReason="Önce formu doldurun" onClick={onClick}>
        Gönder
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Gönder" });
    expect(button).not.toBeDisabled();
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toHaveAccessibleDescription("Önce formu doldurun");

    await userEvent.tab();
    expect(button).toHaveFocus();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("form içinde pasifken formu göndermez", async () => {
    const onSubmit = vi.fn((e: { preventDefault: () => void }) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Button type="submit" disabled disabledReason="Eksik alan var">
          Gönder
        </Button>
      </form>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Gönder" }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("neden verilmezse gerçekten disabled olur (eski davranış)", () => {
    render(<Button disabled>Gönder</Button>);
    expect(screen.getByRole("button", { name: "Gönder" })).toBeDisabled();
  });

  it("loading iken neden gösterilmez, buton gerçekten pasiftir", () => {
    render(
      <Button disabled loading disabledReason="Önce formu doldurun">
        Gönder
      </Button>,
    );
    expect(screen.getByRole("button", { name: "Gönder" })).toBeDisabled();
    expect(screen.queryByTestId("disabled-reason")).not.toBeInTheDocument();
  });
});

describe("Button: başarı geri bildirimi (success)", () => {
  it("success iken successText ve ✓ gösterir, değişiklik duyurulur", () => {
    const { rerender } = render(<Button successText="Kaydedildi">Kaydet</Button>);
    expect(screen.getByRole("button", { name: "Kaydet" })).toBeInTheDocument();
    rerender(
      <Button success successText="Kaydedildi">
        Kaydet
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Kaydedildi" });
    expect(button.querySelector("svg")).toBeInTheDocument();
    expect(screen.getByText("Kaydedildi")).toHaveAttribute("aria-live", "polite");
  });

  it("successText verilmezse metin aynı kalır, yalnızca ✓ eklenir", () => {
    render(<Button success>Kopyala</Button>);
    const button = screen.getByRole("button", { name: "Kopyala" });
    expect(button.querySelector("svg")).toBeInTheDocument();
  });
});

describe("Button: bağlantı olarak (href)", () => {
  it("href verilince <a> çizilir, buton görünümü korunur", () => {
    render(
      <Button href="/ayarlar" variant="secondary">
        Ayarlar
      </Button>,
    );
    const link = screen.getByRole("link", { name: "Ayarlar" });
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "/ayarlar");
    expect(link.className).toContain("border-border-strong");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("pasif bağlantının href'i kaldırılır, tıklama çalışmaz", async () => {
    const onClick = vi.fn();
    render(
      <Button href="/ayarlar" disabled onClick={onClick}>
        Ayarlar
      </Button>,
    );
    const link = screen.getByRole("link", { name: "Ayarlar" });
    expect(link).not.toHaveAttribute("href");
    expect(link).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(link);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("ConfirmButton", () => {
  afterEach(() => vi.useRealTimers());

  it("ilk tıklama onay ister, ikinci tıklama işi yapar", () => {
    vi.useFakeTimers();
    const onConfirm = vi.fn();
    render(<ConfirmButton onConfirm={onConfirm}>Sil</ConfirmButton>);

    fireEvent.click(screen.getByRole("button", { name: "Sil" }));
    expect(onConfirm).not.toHaveBeenCalled();
    const armed = screen.getByRole("button", { name: "Emin misin? Tekrar bas" });
    expect(armed.className).toContain("bg-danger");
    expect(screen.getByText("Onaylamak için tekrar basın, vazgeçmek için Esc")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(CONFIRM_GUARD_MS));
    fireEvent.click(armed);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Sil" })).toBeInTheDocument();
  });

  it("çift tıklama yanlışlıkla onaylamaz", () => {
    vi.useFakeTimers();
    const onConfirm = vi.fn();
    render(<ConfirmButton onConfirm={onConfirm}>Sil</ConfirmButton>);
    const button = screen.getByRole("button", { name: "Sil" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("süre dolunca, Esc'e basınca ve odak ayrılınca vazgeçilir", () => {
    vi.useFakeTimers();
    render(
      <ConfirmButton onConfirm={() => {}} confirmTimeout={1000}>
        Sil
      </ConfirmButton>,
    );
    const button = screen.getByRole("button", { name: "Sil" });

    fireEvent.click(button);
    act(() => vi.advanceTimersByTime(1000));
    expect(button).toHaveAccessibleName("Sil");

    fireEvent.click(button);
    fireEvent.keyDown(button, { key: "Escape" });
    expect(button).toHaveAccessibleName("Sil");

    fireEvent.click(button);
    fireEvent.blur(button);
    expect(button).toHaveAccessibleName("Sil");
  });
});

describe("Button: kendi kendini yöneten (async onClick) ve hata durumu", () => {
  afterEach(() => vi.useRealTimers());

  it("Promise sürerken yükleniyor, bitince ✓ successText, sonra normale döner", async () => {
    vi.useFakeTimers();
    let finish!: () => void;
    render(
      <Button loadingText="Kaydediliyor…" successText="Kaydedildi" onClick={() => new Promise<void>((r) => (finish = r))}>
        Kaydet
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Kaydet" });
    fireEvent.click(button);
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toHaveAccessibleName("Kaydediliyor…");

    await act(async () => finish());
    expect(button).toHaveAccessibleName("Kaydedildi");
    expect(button).not.toBeDisabled();

    act(() => vi.advanceTimersByTime(BUTTON_FEEDBACK_MS));
    expect(button).toHaveAccessibleName("Kaydet");
  });

  it("Promise hata verirse ✕ errorText gösterir ve kırmızıya döner", async () => {
    vi.useFakeTimers();
    let fail!: (e: Error) => void;
    render(
      <Button errorText="Kaydedilemedi" onClick={() => new Promise<void>((_, reject) => (fail = reject))}>
        Kaydet
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Kaydet" });
    fireEvent.click(button);
    await act(async () => fail(new Error("ağ yok")));
    expect(button).toHaveAccessibleName("Kaydedilemedi");
    expect(button.className).toContain("bg-danger");
    expect(button.className).toContain("button-shake");
  });

  it("işlem sürerken tekrar tıklama yeni işlem başlatmaz", () => {
    const onClick = vi.fn(() => new Promise<void>(() => {}));
    render(<Button onClick={onClick}>Gönder</Button>);
    const button = screen.getByRole("button", { name: "Gönder" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("error prop'u ile de hata gösterilir", () => {
    render(
      <Button error errorText="Olmadı">
        Gönder
      </Button>,
    );
    expect(screen.getByRole("button", { name: "Olmadı" }).querySelector("svg")).toBeInTheDocument();
  });
});

describe("Button: klavye kısayolu", () => {
  it("kısayola basınca tıklanır; etiket görünür, aria-keyshortcuts verilir", () => {
    const onClick = vi.fn();
    render(
      <Button shortcut="Ctrl+S" onClick={onClick}>
        Kaydet
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Kaydet" });
    expect(button).toHaveAttribute("aria-keyshortcuts", "Control+S");
    expect(button.querySelector("kbd")).toHaveTextContent("Ctrl S");

    const event = new KeyboardEvent("keydown", { key: "s", ctrlKey: true, cancelable: true });
    window.dispatchEvent(event);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true); // tarayıcının "sayfayı kaydet"i açılmaz
  });

  it("tek tuşlu kısayol yazı alanında çalışmaz; pasif butonda hiç çalışmaz", () => {
    const onClick = vi.fn();
    const { rerender } = render(
      <>
        <input aria-label="Ara" />
        <Button shortcut="n" onClick={onClick}>
          Yeni
        </Button>
      </>,
    );
    fireEvent.keyDown(screen.getByLabelText("Ara"), { key: "n" });
    expect(onClick).not.toHaveBeenCalled();
    fireEvent.keyDown(document.body, { key: "n" });
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(
      <>
        <input aria-label="Ara" />
        <Button shortcut="n" onClick={onClick} disabled>
          Yeni
        </Button>
      </>,
    );
    fireEvent.keyDown(document.body, { key: "n" });
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("Button: ilerleme (progress)", () => {
  it("yüzdeyi gösterir, dolumu çizer ve tıklanamaz", () => {
    const onClick = vi.fn();
    render(
      <Button progress={0.42} onClick={onClick}>
        Yükle
      </Button>,
    );
    const button = screen.getByRole("button", { name: /Yükle/ });
    expect(button).toHaveTextContent("%42");
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toBeDisabled();
    expect(button.querySelector("span[aria-hidden]")).toHaveStyle({ width: "42%" });
  });
});

describe("ToggleButton", () => {
  it("basınca aria-pressed değişir, yazı aynı kalır", () => {
    const onChange = vi.fn();
    render(<ToggleButton onPressedChange={onChange}>Sessize al</ToggleButton>);
    const button = screen.getByRole("button", { name: "Sessize al" });
    expect(button).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).toHaveAccessibleName("Sessize al");
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("kontrollü kullanımda durum dışarıdan gelir", () => {
    function Controlled() {
      const [on, setOn] = useState(true);
      return (
        <ToggleButton pressed={on} onPressedChange={setOn}>
          Kalın
        </ToggleButton>
      );
    }
    render(<Controlled />);
    const button = screen.getByRole("button", { name: "Kalın" });
    expect(button).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-pressed", "false");
  });
});

describe("IconButton: async durum", () => {
  it("async onClick sürerken kendi ikonu CSS ile gizlenecek şekilde işaretlenir", () => {
    render(<IconButton icon={<svg data-testid="ikon" />} label="Yenile" onClick={() => new Promise<void>(() => {})} />);
    const button = screen.getByRole("button", { name: "Yenile" });
    fireEvent.click(button);
    // Spinner butonun doğrudan çocuğu; kendi ikonu data-icon içinde (":has(>svg)" kuralı onu gizler)
    expect(button.querySelector(":scope > svg")).toBeInTheDocument();
    expect(screen.getByTestId("ikon").closest("[data-icon]")).toBeInTheDocument();
    expect(button.className).toContain("[&:has(>svg)>[data-icon]]:hidden");
  });
});

describe("Button: async hata kaybolmaz", () => {
  it("onError verilmezse hata konsola yazılır", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("ağ yok");
    render(<Button onClick={() => Promise.reject(error)}>Gönder</Button>);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Gönder" }));
    });
    expect(log).toHaveBeenCalledWith(expect.stringContaining("onClick"), error);
    log.mockRestore();
  });

  it("onError verilirse hata ona gider, konsola yazılmaz; buton yine ✕ gösterir", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const onError = vi.fn();
    const error = new Error("ağ yok");
    render(
      <Button errorText="Gönderilemedi" onError={onError} onClick={() => Promise.reject(error)}>
        Gönder
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Gönder" });
    await act(async () => {
      fireEvent.click(button);
    });
    expect(onError).toHaveBeenCalledWith(error);
    expect(log).not.toHaveBeenCalled();
    expect(button).toHaveAccessibleName("Gönderilemedi");
    log.mockRestore();
  });
});
