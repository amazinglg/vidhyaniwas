import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw-custom.ts",
      registerType: "autoUpdate",
      devOptions: {
        enabled: false,
      },
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
      },
      manifest: {
        name: "Shri Vidhya Niwas Colony App",
        short_name: "Vidhya Niwas",
        description: "Society management app for Shri Vidhya Niwas Colony",
        theme_color: "#1e3a5f",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait-primary",
        start_url: "/",
        scope: "/",
        icons: [
          {
            src: "/icons/icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/icons/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes("node_modules")) return;
          if (id.includes("react-dom") || id.match(/[\\/]react[\\/]/) || id.includes("react/jsx") || id.includes("scheduler")) return "react-vendor";
          if (id.includes("@radix-ui") || id.includes("cmdk") || id.includes("vaul") || id.includes("sonner") || id.includes("lucide-react")) return "ui-vendor";
          if (id.includes("recharts") || id.includes("d3-")) return "charts-vendor";
          if (id.includes("@supabase") || id.includes("@tanstack")) return "data-vendor";
          if (id.includes("jspdf") || id.includes("html2canvas") || id.includes("dompurify")) return "pdf-vendor";
          if (id.includes("date-fns") || id.includes("react-day-picker")) return "date-vendor";
          if (id.includes("react-hook-form") || id.includes("@hookform") || id.includes("zod")) return "form-vendor";
        },
      },
    },
  },
}));
