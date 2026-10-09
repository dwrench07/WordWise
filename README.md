# WordWise — Flashcard Engine

WordWise is a modern, lightweight flashcard application designed to help you master new vocabulary and concepts efficiently. It's an installable **Progressive Web App (PWA)** with FSRS spaced repetition that works offline, backed by an **optional cloud-sync service** (Node/Express + MongoDB) so your decks follow you across devices.

![WordWise Logo](https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/school/default/48px.svg) <!-- Using a generic educational icon as placeholder -->

## ✨ Features

- **Dynamic Flashcards**: Create cards with multiple meanings, usage examples, and custom tags.
- **Intelligent Learning States**: Track your progress with automated status updates (New, Learning, Mastered, Struggling) based on quiz performance.
- **Interactive Quiz Modes**:
    - **Multiple Choice**: Quick recall practice.
    - **Typing**: Reinforce spelling and exact definitions.
- **Word of the Day**: A daily featured word to expand your vocabulary consistently.
- **Powerful Filtering**: Search and filter cards by text, learning status, or custom tags.
- **Import/Export**: Easily backup your collection or share it with others via JSON format.
- **Modern UI**: A sleek, responsive design with "Outfit" and "JetBrains Mono" typography for maximum legibility.
- **Local Persistence**: All your data is securely stored in your browser's local storage.

## 🚀 Getting Started

### Local-only (no account)

1. Download or clone this repository.
2. Serve the folder over HTTP (needed for the service worker / PWA), e.g.
   `npx serve .` or `python3 -m http.server`, then open the printed URL.
   On `localhost` the app runs without requiring login and stores data in your
   browser via `localforage`.
3. Start adding cards, or load the **Sample Deck** from the **Sync** tab.

> Opening `index.html` directly from the filesystem also works for the core UI,
> but the service worker and offline caching only activate over HTTP(S).

### With cloud sync (optional backend)

The backend lives in `server/` (Express + Mongoose) and is also exposed as a
Vercel serverless function via `api/index.js`.

1. `cd server && npm install`
2. Create `server/.env` with:
   ```
   MONGODB_URI=<your MongoDB connection string>   # required
   JWT_SECRET=<a long random secret>              # required
   JWT_EXPIRES_IN=7d                              # optional (default 7d)
   CLIENT_ORIGIN=https://your-frontend-origin     # optional (default *)
   PORT=5000                                       # optional (local only)
   ```
   The server refuses to start if `MONGODB_URI` or `JWT_SECRET` is missing.
3. `npm run dev` (or `npm start`). When the frontend is served from a non-local
   host it shows a login/register screen and syncs cards, folders, and stats to
   MongoDB over a JWT-authenticated REST API.

## 🛠 Technology Stack

- **Frontend**: HTML5, CSS3 (`styles.css`), vanilla JavaScript (`script.js`),
  installable PWA (`manifest.json`, `sw.js`).
- **Spaced repetition**: FSRS engine (`fsrs.js`).
- **Offline storage**: `localforage` (IndexedDB) for local persistence.
- **Markdown**: `marked` + `DOMPurify` (sanitized) with `highlight.js`.
- **Backend (optional)**: Node.js, Express, Mongoose/MongoDB, JWT auth
  (`jsonwebtoken`), `bcryptjs`, deployable on Vercel.
- **Google Fonts**: [Outfit](https://fonts.google.com/specimen/Outfit) and [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono).

## 📊 Statistics

WordWise provides a quick overview of your progress:
- **Total Cards**: Your entire collection size.
- **Mastered**: Cards you've successfully recalled multiple times.
- **Struggling**: Cards you need to focus on more.
- **Liked**: Your personal favorites or high-priority words.
- **Quizzes Done**: A streak of your dedication.

---

## 🚀 Future Roadmap

We are constantly looking to improve WordWise. Here are some of the high-impact features planned for future updates:

- [ ] **Cloze Deletions**: Support for "fill-in-the-blank" style cards (e.g., `The {{c1::capital}} of France is {{c2::Paris}}`) for more effective contextual learning.
- [ ] **Image Occlusion**: The ability to upload images and "hide" specific parts to test anatomical, geographic, or technical diagrams.
- [ ] **Advanced Leech Management**: Automated detection of "leech" cards (cards that are consistently failed) with suggestions to re-word or break them down.
- [ ] **Cloud Sync & Remote Backups**: Integration with GitHub, Google Drive, or a dedicated backend to ensure your data is safe even if browser cache is cleared.
- [ ] **Predictive Mastery Stats**: Advanced data visualizations showing "Memory Decay" curves and predicted mastery dates for your collection.
- [ ] **Audio Support**: Integration with Text-to-Speech (TTS) or local audio uploads for language learners to master pronunciation.

---

Built with ❤️ for learners everywhere.
