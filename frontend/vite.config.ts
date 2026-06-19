import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // shpjs (leitor de Shapefile) foi feito originalmente para Node.js e espera
  // encontrar a variável global `global`, que não existe no navegador.
  define: {
    global: "globalThis"
  },
  server: {
    port: 5173
  }
});
