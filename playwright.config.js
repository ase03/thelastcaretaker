import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'tests',testMatch:'*.ui.spec.mjs',use:{baseURL:'http://127.0.0.1:4173',viewport:{width:1920,height:1080}},webServer:{command:'node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4173',port:4173,reuseExistingServer:true}});

