# 🚀 Quick Start Guide

Get your music streaming backend running in 5 minutes!

## Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher)
- [Firebase Project](https://console.firebase.google.com/)

## 1. Setup

```bash
# Install dependencies
npm install

# Run the interactive setup wizard
npm run setup
```

## 2. Configure Firebase

1. Go to **Firebase Console** > **Project Settings** > **Service Accounts**.
2. Click **Generate new private key**.
3. Save the file as `service-account.json` in the project root (optional for local dev if using `GOOGLE_APPLICATION_CREDENTIALS`).
4. **Better for Production/Railway**:
   - Open `.env`.
   - Paste the content of the JSON file into `FIREBASE_SERVICE_ACCOUNT` as a single line string.
   - Set `FIREBASE_DATABASE_URL` to your Realtime Database URL.

## 3. Run

```bash
# Start development server
npm run dev
```

Server will be running at `http://localhost:3000`.

## 4. Test

Open your browser or Postman:
- Health check: `http://localhost:3000/health`
- Search: `http://localhost:3000/search?q=lofi`
