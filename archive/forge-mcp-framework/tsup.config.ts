import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: {
      index: "src/index.ts",
      "cli/index": "src/cli/index.ts",
      "testing/index": "src/testing/index.ts",
    },
    format: ["esm"],
    dts: true,
    sourcemap: true,
    clean: true,
    target: "node20",
    splitting: true,
    treeshake: true,
  },
]);
