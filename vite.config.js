import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// IMPORTANT: this must match your GitHub repo name, because GitHub Pages
// serves a project site at https://<username>.github.io/<repo-name>/ —
// your repo is named "main", so the site lives under /main/. If you ever
// rename the repo, update this to match (e.g. '/new-repo-name/').
const BASE_PATH = '/main/';

export default defineConfig({
  base: BASE_PATH,
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      // two separate pages, each its own entry — this is what gives you
      // two real separate URLs (index.html for employees, manager.html
      // for Manager/CEO) instead of one page with a chooser screen
      input: {
        main: resolve(__dirname, 'index.html'),
        manager: resolve(__dirname, 'manager.html')
      }
    }
  }
});
