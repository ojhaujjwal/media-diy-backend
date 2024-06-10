import { defineConfig } from 'vitest/config'
import { config } from "dotenv";


export default defineConfig({
  test: {
    globals: true,
    include: ["tests/**/*.test.ts"],
    env: {
      ...config({ path: ".env.test" }).parsed,
    },
  },
});
