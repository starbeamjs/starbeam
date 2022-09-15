import { VitePluginFonts } from "vite-plugin-fonts";
import { defineConfig } from "vitest/config";
export default defineConfig({
    plugins: [
        VitePluginFonts({
            google: {
                families: ["Roboto:wght@300;400;500;700"],
                display: "swap",
                preconnect: true,
            },
        }),
    ],
    esbuild: {
        jsxInject: `import React from 'react'`,
    },
    optimizeDeps: {
        esbuildOptions: {
            define: {
                global: "globalThis",
            },
        },
    },
    build: {
        rollupOptions: {
            plugins: [],
        },
    },
});
