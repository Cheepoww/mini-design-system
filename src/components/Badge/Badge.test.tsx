import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Badge } from "./Badge";

describe("Badge", () => {
  it("metnini gösterir; varsayılan neutral + soft", () => {
    render(<Badge>Taslak</Badge>);
    const badge = screen.getByText("Taslak").parentElement!;
    expect(badge).toHaveClass("bg-surface-muted", "text-fg", "rounded-full");
  });

  it("tone ve variant renk sınıflarını belirler", () => {
    const { rerender } = render(<Badge tone="success">Aktif</Badge>);
    expect(screen.getByText("Aktif").parentElement).toHaveClass("bg-success-soft", "text-success");
    rerender(<Badge tone="danger" variant="solid">Aktif</Badge>);
    expect(screen.getByText("Aktif").parentElement).toHaveClass("bg-danger", "text-on-danger");
    rerender(<Badge tone="info" variant="outline">Aktif</Badge>);
    expect(screen.getByText("Aktif").parentElement).toHaveClass("border-info", "text-info");
  });

  it("dot verilince ekran okuyucudan gizli bir nokta çizer; icon verilirse nokta çıkmaz", () => {
    const { container, rerender } = render(<Badge dot>Çevrimiçi</Badge>);
    const dot = container.querySelector("[data-badge-dot]");
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveAttribute("aria-hidden", "true");
    rerender(<Badge dot icon={<svg data-testid="ikon" />}>Çevrimiçi</Badge>);
    expect(container.querySelector("[data-badge-dot]")).not.toBeInTheDocument();
    expect(screen.getByTestId("ikon")).toBeInTheDocument();
  });

  it("onRemove yoksa içinde buton yoktur", () => {
    render(<Badge>React</Badge>);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("onRemove verilince adı etiketi içeren bir kaldır butonu çıkar", async () => {
    const onRemove = vi.fn();
    render(<Badge onRemove={onRemove}>React</Badge>);
    await userEvent.click(screen.getByRole("button", { name: "Kaldır: React" }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("className ve native prop'ları kabul eder", () => {
    render(<Badge className="ozel" title="3 yeni bildirim">3</Badge>);
    const badge = screen.getByTitle("3 yeni bildirim");
    expect(badge).toHaveClass("ozel");
  });
});
