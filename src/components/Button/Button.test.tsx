import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Button, ButtonGroup, IconButton } from "./Button";

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
