import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

const rawPort = process.env.PORT;

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH;

if (!basePath) {
  throw new Error(
    "BASE_PATH environment variable is required but was not provided.",
  );
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icons/*.svg"],
      injectRegister: "auto",
      manifest: {
        name: "JurisPro",
        short_name: "JurisPro",
        description: "Assistente jurídico com IA para advogados brasileiros.",
        theme_color: "#111a0e",
        background_color: "#111a0e",
        display: "standalone",
        orientation: "portrait-primary",
        lang: "pt-BR",
        start_url: basePath,
        scope: basePath,
        icons: [
          { src: "icons/icon-72x72.svg",   sizes: "72x72",   type: "image/svg+xml", purpose: "any maskable" },
          { src: "icons/icon-96x96.svg",   sizes: "96x96",   type: "image/svg+xml", purpose: "any maskable" },
          { src: "icons/icon-128x128.svg", sizes: "128x128", type: "image/svg+xml", purpose: "any maskable" },
          { src: "icons/icon-144x144.svg", sizes: "144x144", type: "image/svg+xml", purpose: "any maskable" },
          { src: "icons/icon-152x152.svg", sizes: "152x152", type: "image/svg+xml", purpose: "any maskable" },
          { src: "icons/icon-192x192.svg", sizes: "192x192", type: "image/svg+xml", purpose: "any maskable" },
          { src: "icons/icon-384x384.svg", sizes: "384x384", type: "image/svg+xml", purpose: "any maskable" },
          { src: "icons/icon-512x512.svg", sizes: "512x512", type: "image/svg+xml", purpose: "any maskable" },
        ],
        categories: ["productivity", "legal", "utilities"],
        shortcuts: [
          { name: "Assistente",   short_name: "IA",         url: `${basePath}#assistente`,   description: "Abrir assistente de IA" },
          { name: "Clientes",     short_name: "Clientes",   url: `${basePath}clientes`,       description: "Gerenciar clientes" },
          { name: "Processos",    short_name: "Processos",  url: `${basePath}processos`,      description: "Gerenciar processos" },
          { name: "Audiências",   short_name: "Audiências", url: `${basePath}audiencias`,     description: "Ver audiências" },
          { name: "Extrator",     short_name: "Extrator",   url: `${basePath}#extrator`,      description: "Extrator jurídico" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: { cacheName: "google-fonts-cache", expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: { cacheName: "gstatic-fonts-cache", expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            urlPattern: /\/api\/.*/i,
            handler: "NetworkFirst",
            options: { cacheName: "api-cache", expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 }, networkTimeoutSeconds: 10 },
          },
        ],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
