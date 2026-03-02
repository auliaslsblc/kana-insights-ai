<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/00c99f4d-0059-491e-aca5-39360ce5019a

## ⚠️ IMPORTANT: Setup API Key First

**Sentiment analysis WILL NOT WORK without a Gemini API key!**  
All reviews will be analyzed as "neutral" if the API key is missing.

📖 **[Read SETUP_API_KEY.md for detailed instructions](SETUP_API_KEY.md)**

Quick setup:
1. Get free API key: https://makersuite.google.com/app/apikey
2. Add to `.env` file: `GEMINI_API_KEY=your_actual_key`
3. Restart the server

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   ```bash
   npm install
   ```

2. **Set up your Gemini API key** (see above)

3. Run the app:
   ```bash
   # Terminal 1: Start backend server
   npm run server
   
   # Terminal 2: Start frontend dev server
   npm run dev
   ```

4. Open http://localhost:5173 in your browser

> Note: `5173` hanya untuk local development. Saat deploy ke Vercel, set `VITE_API_BASE_URL` ke domain backend production.

## Deploy frontend + backend terpisah

📖 Panduan lengkap: [DEPLOY.md](DEPLOY.md)

Jika frontend di-host sebagai static site (misalnya Vercel) dan backend berjalan di server lain, set environment variable ini di frontend:

```bash
VITE_API_BASE_URL=https://your-backend-domain.com
```

Tanpa variable tersebut, request akan tetap ke origin frontend (`/api/...`) dan bisa menghasilkan error `NOT_FOUND` saat endpoint backend tidak ada di host frontend.
