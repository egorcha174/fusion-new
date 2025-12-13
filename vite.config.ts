
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
    server: {
        host: true,
        port: 8099
    },
    ssr: {
        // Исправляет ошибку "Icon is not a function" при серверном рендеринге
        noExternal: ['@iconify/svelte']
    }
});
