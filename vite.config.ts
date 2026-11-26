import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    // Testler gerçek tarayıcı yerine jsdom adlı sahte bir DOM'da çalışır
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    css: false,
    // Sayfa testleri 8 bölümün hepsini çizer; varsayılan 5 sn yavaş makinede yetmiyor
    testTimeout: 15000,
  },
});
