import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/client.ts', 'src/cdn.ts', 'src/evidence.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true
})
