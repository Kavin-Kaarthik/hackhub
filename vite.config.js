import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { defineConfig } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                auth: resolve(__dirname, 'auth.html'),
                dashboard: resolve(__dirname, 'dashboard.html'),
                teams: resolve(__dirname, 'teams.html'),
                submit: resolve(__dirname, 'submit.html'),
                judging: resolve(__dirname, 'judging.html'),
                leaderboard: resolve(__dirname, 'leaderboard.html'),
                admin: resolve(__dirname, 'admin.html'),
            },
        },
    },
});