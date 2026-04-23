import { defineConfig } from "vite";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    base: "./",
    // Node.js global to browser globalThis
    define: {
      global: "globalThis",
    },
    resolve: {
      alias: {
        obsidian: path.resolve(__dirname, "tests/mocks/obsidian.ts"),
        "moment-obsidian": path.resolve(__dirname, "node_modules/obsidian/node_modules/moment/moment.js"),
      },
    },
});
