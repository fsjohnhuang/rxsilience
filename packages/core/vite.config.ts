import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [
    dts({
      outDirs: "dist/types",
      include: ["src"],
      exclude: ["src/**/*.test.ts", "src/**/*.spec.ts"],
      copyDtsFiles: true, // copy the src/**/*.d.ts files to dist folder.
    }),
  ],
  build: {
    sourcemap: true,
    lib: {
      entry: "src/index.ts",
      name: "RxsilienceCore",
      fileName: (format) => `index.${format}.js`,
      formats: ["es", "umd"],
    },
    rolldownOptions: {
      external: ["rxjs"],
      output: {
        format: "umd",
        globals: {
          rxjs: "rxjs",
        },
      },
    },
  },
});
