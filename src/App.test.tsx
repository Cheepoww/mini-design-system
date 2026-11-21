import { fireEvent, render, screen, within } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { ToastProvider } from "./components";

const renderApp = () =>
  render(
    <ToastProvider>
      <App />
    </ToastProvider>,
  );

// Ayarlar adrese yazılıyor; bir testin adresi sonrakine taşınmasın
afterEach(() => window.history.replaceState(null, "", "/"));

describe("Paylaşılabilir link", () => {
  it("ayar değişince adrese yalnızca varsayılandan farklı değerler yazılır", () => {
    renderApp();
    const section = screen.getByRole("region", { name: "Button" });
    fireEvent.change(within(section).getByLabelText("variant"), { target: { value: "danger" } });
    fireEvent.click(within(section).getByLabelText("loading"));
    expect(window.location.search).toBe("?button.variant=danger&button.loading=true");
  });

  it("link açılınca o ayarlarla gelir; geçersiz değer yok sayılır", () => {
    window.history.replaceState(null, "", "/?button.size=lg&button.variant=mor&toast.tone=warning");
    renderApp();
    const button = screen.getByRole("region", { name: "Button" });
    expect(within(button).getByLabelText("size")).toHaveValue("lg");
    expect(within(button).getByLabelText("variant")).toHaveValue("primary"); // "mor" geçersiz
    expect(within(screen.getByRole("region", { name: "Toast" })).getByLabelText("tone")).toHaveValue("warning");
  });

  it("Sıfırla varsayılana döner ve adresi temizler; değişiklik yokken pasiftir", () => {
    window.history.replaceState(null, "", "/?button.size=lg");
    renderApp();
    const section = screen.getByRole("region", { name: "Button" });
    fireEvent.click(within(section).getByRole("button", { name: "Sıfırla" }));
    expect(within(section).getByLabelText("size")).toHaveValue("md");
    expect(window.location.search).toBe("");
    expect(within(section).getByRole("button", { name: "Sıfırla" })).toBeDisabled();
  });
});

describe("Playground sayfası", () => {
  it("prop kontrolü önizlemeyi ve üretilen kodu değiştirir", () => {
    renderApp();
    const section = screen.getByRole("region", { name: "Button" });
    fireEvent.change(within(section).getByLabelText("variant"), { target: { value: "danger" } });
    fireEvent.click(within(section).getByLabelText("loading"));
    expect(within(section).getByText('<Button variant="danger" loading>Kaydet</Button>')).toBeInTheDocument();
    expect(within(section).getAllByRole("button", { name: "Kaydet" })[0]).toHaveAttribute("aria-busy", "true");
  });

  it("Toast önizlemesi gerçekten bildirim gösterir", () => {
    renderApp();
    const section = screen.getByRole("region", { name: "Toast" });
    fireEvent.click(within(section).getByRole("button", { name: "Toast göster" }));
    expect(screen.getAllByText("Değişiklikler kaydedildi").length).toBeGreaterThan(0);
  });

  it("erişilebilirlik kural ihlali içermez (axe-core)", async () => {
    const { container } = renderApp();
    // jsdom gerçek renkleri hesaplayamaz; kontrast tarayıcıda ölçülür
    const result = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
    expect(result.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});
