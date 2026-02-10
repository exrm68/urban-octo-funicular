# 🎬 CineFlix Mini App

Telegram Mini App for streaming movies and series.

## 🚀 Deploy to Vercel

### Quick Deploy:

1. Push this folder to GitHub
2. Connect to Vercel
3. Deploy!

```bash
# Install dependencies
npm install

# Run locally
npm run dev

# Build for production
npm run build
```

### Vercel Setup:

- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

## 📱 Features

✅ Movie & Series Streaming
✅ Telegram Bot Integration
✅ Watch & Download via Telegram
✅ Top 10 Trending
✅ Stories Feature
✅ Banner Carousel
✅ Category Filtering
✅ Favorites/Watchlist
✅ Responsive Design
✅ Firebase Real-time Sync

## 🔧 Configuration

All content is managed via the **Admin Panel** (separate project).

Firebase config is already set up in `src/firebase.ts`

## 📝 Note

- এই Mini App শুধু ইউজারদের জন্য
- Content management করতে হলে Admin Panel ব্যবহার করুন
- Telegram Bot এর মাধ্যমে video streaming
- কোনো direct video player নেই - সব কিছু Telegram Bot দিয়ে

## 🎯 Bot Username

Default: `cineflix_universe_bot`

Admin Panel থেকে পরিবর্তন করা যাবে।
