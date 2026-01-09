# Habitly

A mobile-friendly habit tracking app that stores data in your Google Drive.

## Features

- Track daily habits with simple tap-to-complete
- Data stored securely in your own Google Drive
- Works offline (PWA)
- Dark mode support
- No backend required - fully client-side

## Prerequisites

- Node.js 18+
- Google Cloud account

## Google Cloud Setup

1. Create a project at [Google Cloud Console](https://console.cloud.google.com/)

2. Enable the **Google Drive API**:
   - Go to APIs & Services → Library
   - Search "Google Drive API" → Enable

3. Configure OAuth consent screen:
   - Go to APIs & Services → OAuth consent screen
   - Select "External" → Create
   - Fill in app name, emails
   - Add scopes: `drive.appdata`, `userinfo.profile`, `userinfo.email`

4. Create OAuth credentials:
   - Go to APIs & Services → Credentials
   - Create Credentials → OAuth client ID
   - Type: Web application
   - Add authorized JavaScript origins:
     - `http://localhost:5173` (development)
     - Your production URL

5. Copy the Client ID

## Local Development

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Add your Google Client ID to .env
# VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com

# Start dev server
npm run dev
```

Open http://localhost:5173

## Build

```bash
npm run build
```

Output is in the `dist/` folder.

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project at [vercel.com](https://vercel.com)
3. Add environment variable:
   - `VITE_GOOGLE_CLIENT_ID` = your client ID
4. Deploy

Add your Vercel URL to Google Cloud authorized origins.

### Netlify

1. Push code to GitHub
2. Import at [netlify.com](https://netlify.com)
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Add environment variable in Site settings → Environment variables

Add your Netlify URL to Google Cloud authorized origins.

### GitHub Pages

1. Install gh-pages:
   ```bash
   npm install -D gh-pages
   ```

2. Add to `package.json`:
   ```json
   {
     "homepage": "https://yourusername.github.io/habitly",
     "scripts": {
       "predeploy": "npm run build",
       "deploy": "gh-pages -d dist"
     }
   }
   ```

3. Update `vite.config.ts`:
   ```typescript
   export default defineConfig({
     base: '/habitly/',
     // ... rest of config
   })
   ```

4. Deploy:
   ```bash
   npm run deploy
   ```

Add your GitHub Pages URL to Google Cloud authorized origins.

## Project Structure

```
src/
├── components/
│   ├── layout/        # App layout components
│   └── ui/            # Reusable UI components
├── lib/
│   ├── google-auth.ts # Google OAuth
│   └── google-drive.ts# Google Drive API
├── pages/             # Route pages
├── stores/            # Zustand state stores
└── types/             # TypeScript types
```

## Tech Stack

- React + TypeScript
- Vite
- Tailwind CSS
- Zustand (state management)
- Google Identity Services
- Google Drive API
- Vite PWA Plugin

## License

MIT
