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

  it("sayfadaki her id tektir; aynı adlı kontroller kendi bölümüne bağlanır", () => {
    const { container } = renderApp();
    const ids = [...container.querySelectorAll("[id]")].map((el) => el.id);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
    // Etiket, başka bölümdeki aynı adlı kontrole değil kendi bölümündekine gider
    for (const name of ["Button", "Toast"]) {
      const section = screen.getByRole("region", { name });
      for (const control of section.querySelectorAll("select, input")) {
        if (control.id) expect(section.contains(container.querySelector(`label[for="${control.id}"]`))).toBe(true);
      }
    }
  });

  it("her örneğin altında açılır, kopyalanabilir kodu vardır", () => {
    const { container } = renderApp();
    const examples = container.querySelectorAll("section h4.mb-3");
    const codes = container.querySelectorAll("section details");
    expect(examples.length).toBeGreaterThan(0);
    expect(codes).toHaveLength(examples.length);
    for (const d of codes) {
      expect(within(d as HTMLElement).getByText("Kodu göster")).toBeInTheDocument();
      expect(d.querySelector("code")?.textContent?.trim()).not.toBe("");
    }
  });

  it("erişilebilirlik kural ihlali içermez (axe-core)", async () => {
    const { container } = renderApp();
    // jsdom gerçek renkleri hesaplayamaz; kontrast tarayıcıda ölçülür
    const result = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
    expect(result.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});

describe("Başlık", () => {
  afterEach(() => {
    document.documentElement.dataset.theme = "dark";
    localStorage.removeItem("mds-theme");
  });

  it("tema düğmesi yazı yerine simgedir; adı ne yapacağını söyler, basınca tema değişir ve odak kalır", () => {
    document.documentElement.dataset.theme = "dark";
    renderApp();
    const toggle = screen.getByRole("button", { name: "Açık temaya geç" });
    expect(toggle).toHaveTextContent("");
    expect(toggle.querySelector("svg")).toBeInTheDocument();

    toggle.focus();
    fireEvent.click(toggle);
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(localStorage.getItem("mds-theme")).toBe("light");
    expect(screen.getByRole("button", { name: "Koyu temaya geç" })).toBe(toggle);
    expect(toggle).toHaveFocus();
  });

  it("? tuşu klavye kısayolları penceresini açar; yazı alanında açmaz", () => {
    const { container } = renderApp();
    const dialog = container.querySelector("dialog")!;
    expect(dialog).not.toHaveAttribute("open");

    const input = within(screen.getByRole("region", { name: "Button" })).getByLabelText("children");
    fireEvent.keyDown(input, { key: "?" });
    expect(dialog).not.toHaveAttribute("open");

    fireEvent.keyDown(document.body, { key: "?" });
    expect(dialog).toHaveAttribute("open");
    expect(within(dialog).getByRole("heading", { name: "Klavye kısayolları" })).toBeInTheDocument();
    expect(within(dialog).getByText("Bildirimlere atla")).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Kapat" }));
    expect(dialog).not.toHaveAttribute("open");
  });

  it("bölüm bağlantıları başlıkta sırayla yer alır", () => {
    renderApp();
    const nav = screen.getByRole("navigation", { name: "Bileşenler" });
    expect(within(nav).getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual(["#button", "#toast"]);
  });
});
