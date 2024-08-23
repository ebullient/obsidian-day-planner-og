import { defineConfig } from "vite";

export default defineConfig({
    base: "./",
    // Node.js global to browser globalThis
    define: {
      global: "globalThis",
    },
});
