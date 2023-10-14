import { defineConfig } from 'vite';
import babel from 'vite-plugin-babel';

export default defineConfig({
  build: {
    watch: true,
    target: 'esnext',
    sourcemap: true,
  },
  plugins: [
    // Babel will try to pick up Babel config files (.babelrc or .babelrc.json)
    babel(),
  ],
})
