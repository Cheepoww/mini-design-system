import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Yazı tipleri projenin içinden gelir (dış sunucuya istek yok); Türkçe karakterler dahil
import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource-variable/outfit";
import "./styles/tokens.css";
import { ToastProvider } from "./components";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* Uygulamanın her yerinden useToast() ile bildirim gösterilebilsin */}
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
);
