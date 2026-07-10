import { defineConfig } from "vitest/config";
import { config } from "dotenv";

export default defineConfig({
  test: {
    globals: true,
    include: process.env.INTEGRATION === "1" ? ["tests/integration/**/*.test.ts"] : ["tests/**/*.test.ts"],
    exclude: process.env.INTEGRATION === "1" ? [] : ["tests/integration/**"],
    env: {
      ...config({ path: ".env.test" }).parsed
    },
    typecheck: {
      include: ["typetest/**/*.test.ts"],
      ignoreSourceErrors: true
    }
  }
});
