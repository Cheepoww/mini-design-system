import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LoadingState, Skeleton } from "./LoadingState";

describe("LoadingState", () => {
  it("spinner: role=status ile metni duyurur", () => {
    render(<LoadingState />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Yükleniyor…");
    expect(status).toHaveAttribute("aria-busy", "true");
    expect(status.querySelector("svg.animate-spin")).toBeInTheDocument();
  });

  it("hideLabel metni yalnızca ekran okuyucuya bırakır", () => {
    render(<LoadingState label="Projeler getiriliyor" hideLabel />);
    expect(screen.getByText("Projeler getiriliyor")).toHaveClass("sr-only");
  });

  it("skeleton: istenen sayıda satır çizer, avatar opsiyonel", () => {
    const { container, rerender } = render(<LoadingState variant="skeleton" lines={4} />);
    expect(container.querySelectorAll("[data-skeleton]")).toHaveLength(4);
    expect(screen.getByRole("status")).toHaveTextContent("Yükleniyor…");
    rerender(<LoadingState variant="skeleton" lines={2} avatar />);
    expect(container.querySelectorAll("[data-skeleton]")).toHaveLength(3);
    expect(container.querySelector(".rounded-full[data-skeleton]")).toBeInTheDocument();
  });

  it("overlay: içeriği gösterir, yüklenirken üstüne perde ve kilit koyar", () => {
    const { rerender } = render(
      <LoadingState variant="overlay" label="Kaydediliyor…">
        <button>Form</button>
      </LoadingState>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Kaydediliyor…");
    expect(screen.getByText("Form").parentElement).toHaveAttribute("inert");

    rerender(
      <LoadingState variant="overlay" loading={false} label="Kaydediliyor…">
        <button>Form</button>
      </LoadingState>,
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Form" }).parentElement).not.toHaveAttribute("inert");
  });
});

describe("Skeleton", () => {
  it("ekran okuyucudan gizlidir; circle'da yükseklik genişliğe eşit olur", () => {
    const { container } = render(<Skeleton circle width={40} />);
    const el = container.firstElementChild as HTMLElement;
    expect(el).toHaveAttribute("aria-hidden", "true");
    expect(el).toHaveStyle({ width: "40px", height: "40px" });
  });
});
