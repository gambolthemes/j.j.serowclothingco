import path from 'node:path';

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/*
 * Separate from vite.config.js on purpose: that config runs laravel-vite-plugin,
 * which expects a Laravel dev server and a manifest to write. The tests need
 * neither — only the React transform and the same `@` alias the app imports by.
 */
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(import.meta.dirname, 'resources/js'),
        },
    },
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./resources/js/test/setup.js'],
        include: ['resources/js/**/*.test.{js,jsx}'],
        restoreMocks: true,
    },
});
