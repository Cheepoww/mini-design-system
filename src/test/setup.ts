import "@testing-library/jest-dom/vitest"; // toBeInTheDocument, toBeDisabled gibi okunur kontroller
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Her testten sonra ekranı temizle ki testler birbirini etkilemesin
afterEach(() => cleanup());

// jsdom canvas desteklemiyor; axe-core bazı kontrollerde canvas dener ve gürültülü hata basar.
// null döndürmek "canvas yok" demektir, axe bunu sessizce atlar.
HTMLCanvasElement.prototype.getContext = (() => null) as unknown as HTMLCanvasElement["getContext"];

// jsdom PointerEvent desteklemiyor; yoksa testte gönderilen sürükleme olaylarında
// clientX, button ve pointerId boş kalır. MouseEvent üzerine sade bir taklit.
if (typeof window.PointerEvent === "undefined") {
  class PointerEventPolyfill extends MouseEvent {
    pointerId: number;
    pointerType: string;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 0;
      this.pointerType = init.pointerType ?? "mouse";
    }
  }
  window.PointerEvent = PointerEventPolyfill as unknown as typeof PointerEvent;
}
