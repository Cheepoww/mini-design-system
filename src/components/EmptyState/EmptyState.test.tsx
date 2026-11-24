import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("başlık ve açıklamayı gösterir; başlık varsayılan h3", () => {
    render(<EmptyState title="Henüz proje yok" description="İlk projeni oluşturarak başla." />);
    expect(screen.getByRole("heading", { level: 3, name: "Henüz proje yok" })).toBeInTheDocument();
    expect(screen.getByText("İlk projeni oluşturarak başla.")).toBeInTheDocument();
  });

  it("headingLevel ile başlık seviyesi değişir", () => {
    render(<EmptyState title="Sonuç yok" headingLevel="h2" />);
    expect(screen.getByRole("heading", { level: 2, name: "Sonuç yok" })).toBeInTheDocument();
  });

  it("varsayılan ikon gelir; icon={false} ile gizlenir; özel ikon verilebilir", () => {
    const { container, rerender } = render(<EmptyState title="Boş" />);
    expect(container.querySelector("svg")).toBeInTheDocument();
    rerender(<EmptyState title="Boş" icon={false} />);
    expect(container.querySelector("svg")).not.toBeInTheDocument();
    rerender(<EmptyState title="Boş" icon={<svg data-testid="ozel" />} />);
    expect(screen.getByTestId("ozel")).toBeInTheDocument();
  });

  it("eylemleri gösterir; eylem yoksa eylem alanı çizilmez", () => {
    const { rerender } = render(
      <EmptyState title="Boş" action={<button>Oluştur</button>} secondaryAction={<a href="#doc">Doküman</a>} />,
    );
    expect(screen.getByRole("button", { name: "Oluştur" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Doküman" })).toBeInTheDocument();
    rerender(<EmptyState title="Boş" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("danger tonu ikon alanını hata rengine çevirir", () => {
    const { container } = render(<EmptyState title="Yüklenemedi" tone="danger" />);
    expect(container.querySelector(".bg-danger-soft")).toBeInTheDocument();
  });
});
