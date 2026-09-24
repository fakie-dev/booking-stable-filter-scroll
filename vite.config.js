import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';
import { userscript } from './src/metadata.js';

export default defineConfig({
    server: {
        open: false,
        strictPort: true,
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        minify: false,
    },
    plugins: [
        monkey({
            entry: 'src/main.js',
            userscript,
            generate: ({ userscript: header }) => header
                .replace(
                    /(\/\/ @name\s+[^\n]*\n)/,
                    `$1// @name:ru      ${userscript['name:ru']}\n`,
                )
                .replace(
                    /(\/\/ @description\s+[^\n]*\n)/,
                    `$1// @description:ru ${userscript['description:ru']}\n`,
                ),
            server: {
                open: false,
            },
            build: {
                fileName: 'booking-stable-filter-scroll.user.js',
                metaFileName: true,
                autoGrant: false,
            },
        }),
    ],
});
