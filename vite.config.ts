import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom") || id.includes("node_modules/react-router-dom")) {
            return "react-vendor";
          }

          if (id.includes("node_modules/@tanstack/")) {
            return "query-vendor";
          }

          if (id.includes("node_modules/@supabase/")) {
            return "supabase-vendor";
          }

          if (id.includes("node_modules/lucide-react")) {
            return "icons-vendor";
          }

          if (id.includes("node_modules/@radix-ui/")) {
            return "ui-vendor";
          }

          if (id.includes("node_modules/recharts") || id.includes("node_modules/date-fns")) {
            return "charts-vendor";
          }
        },
      },
    },
  },
});
