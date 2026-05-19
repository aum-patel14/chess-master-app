# ♟️ ChessMaster Pro

![ChessMaster Pro](https://aum-patel14.github.io/chess-master-app/og-image.png)

A fully-featured, highly-polished web-based Chess application built with React 19, Framer Motion, and Stockfish. Experience beautiful themes, an advanced AI, and rich gameplay analytics directly in your browser.

🌐 **Live Demo:** [https://aum-patel14.github.io/chess-master-app](https://aum-patel14.github.io/chess-master-app)

## ✨ Features

- **Guest / Demo Mode:** Explore all features, leaderboards, and game history without needing an account.
- **Advanced AI Engine:** Play against 5 tailored difficulty levels powered by an optimized Stockfish WASM implementation (Beginner to Master).
- **Daily Puzzles:** Solve the official Lichess Daily Puzzle integrated seamlessly into the dashboard.
- **Post-Game Analysis & Coaching:** Receive accuracy metrics, blunder tracking, and situational tips using Lichess Opening Explorer data.
- **Customization:** Choose between 5 beautiful board themes (Classic, Ocean, Forest, Midnight) and configure animation speeds, move sounds, and piece highlights.
- **Demo Data Integration:** Experience what the app looks like fully populated with rich mock leaderboards and live tournament brackets.
- **Share & Export:** Export your games to PGN format or quickly share a game hash URL with friends.

## 🛠️ Tech Stack

- **Frontend:** React 19, Vite, React Router v7
- **Styling:** Vanilla CSS + CSS Variables for rich theming, Framer Motion v12 for animations, Lucide React for iconography.
- **Chess Logic:** `chess.js` for move validation and FEN/PGN handling.
- **Engine:** Web Worker wrapper around Stockfish 16.1.
- **Backend/APIs:** Firebase (Auth/Firestore), Lichess API (Daily Puzzle, Opening Explorer).

## 🚀 Local Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/aum-patel14/chess-master-app.git
   cd chess-master-app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   ```

## 📜 License

This project is licensed under the MIT License. 
Lichess API data provided courtesy of [lichess.org](https://lichess.org).
