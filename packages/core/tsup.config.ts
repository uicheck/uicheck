import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/protocol.ts', 'src/evidence.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
})
