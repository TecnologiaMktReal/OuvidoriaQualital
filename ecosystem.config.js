import dotenv from 'dotenv';
dotenv.config();

export default {
  apps: [{
    name: 'ouvidoria-qualital-app',
    script: './dist/index.js',
    cwd: '/home/ubuntu/app/OuvidoriaQualital',
    env_production: {
      NODE_ENV: 'production',
      DATABASE_URL: process.env.DATABASE_URL,
      APP_BASE_URL: process.env.APP_BASE_URL || 'https://h.qualital.com.br',
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
      VITE_SUPABASE_PUBLISHABLE_KEY: process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
      SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET,
      SUPABASE_STORAGE_BUCKET_COOPERATIVA: process.env.SUPABASE_STORAGE_BUCKET_COOPERATIVA,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      PORT: process.env.PORT || '3000',
      PUPPETEER_EXECUTABLE_PATH: process.env.PUPPETEER_EXECUTABLE_PATH,
      PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD
    }
  }]
};


