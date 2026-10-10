import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  workers: 2,
  use: {baseURL: 'http://127.0.0.1:18123'},
  webServer: {
    command: 'python -m http.server 18123 --bind 127.0.0.1 --directory dist',
    url: 'http://127.0.0.1:18123',
    reuseExistingServer: false
  },
  projects: [375, 768, 1024, 1440].map(width => ({
    name: `${width}px`, use: {viewport: {width, height: 900}}
  }))
});
