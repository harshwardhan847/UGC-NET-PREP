# UGC NET CS Study Hub - Web Application

This is the Next.js frontend and SQLite/Prisma backend for the UGC NET CS Study Hub.

To run this application locally, set up your environment variables, and manage the question database, please refer to the comprehensive guide in the [root README.md](../README.md).

## Quick Local Run

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure `.env.local`:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
3. Initialize the SQLite database (also run this after pulling schema changes):
   ```bash
   npx prisma migrate dev
   ```
4. Seed the database:
   ```bash
   node prisma/seed.js
   ```
5. Start the server:
   ```bash
   npm run dev
   ```
