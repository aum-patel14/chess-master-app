# ChessMaster Pro — Step-by-Step Fix Prompts

> Copy each prompt into Claude (or your AI tool) one at a time. Work through them in order. Each prompt is self-contained and gives you exact code, not just advice.

---

## 🔴 CRITICAL — Do these first

---

### STEP 1 — Fix Stockfish WASM engine not loading on Vercel

**Why:** The yellow "Engine unavailable — using fallback AI mode" banner means Stockfish WASM is failing. This is the core feature. It breaks because Vercel doesn't send the required COOP/COEP headers for SharedArrayBuffer by default.

**Files you'll touch:** `vercel.json`, `vite.config.js`

**Prompt:**
```
My chess app is deployed on Vercel and uses Stockfish as a WASM chess engine. It shows a warning: "Engine unavailable - using fallback AI mode."

The app is a Vue/React SPA deployed on Vercel at: https://chess-master-app-main.vercel.app

Please give me:
1. The exact vercel.json headers config to add Cross-Origin-Embedder-Policy and Cross-Origin-Opener-Policy so Stockfish WASM can use SharedArrayBuffer
2. If I'm using Vite, the vite.config.js dev server headers to match
3. How to verify Stockfish is loading correctly in Chrome DevTools (Network tab)
4. Common reasons Stockfish WASM fails in production and how to debug each one

Show me the complete file contents I need to create or modify.
```

---

### STEP 2 — Fix chess board overflowing the viewport

**Why:** Only the top 3 ranks of the board are visible — users must scroll to see the full board. A chess app where you can't see all 8 ranks simultaneously is unplayable.

**Files you'll touch:** `GameView.vue / GamePage.jsx`, `game.css / layout.css`

**Prompt:**
```
My chess app has a layout bug: the chess board overflows the viewport vertically so users can only see the top portion and must scroll to see the rest. The board must always be fully visible without scrolling.

The layout has:
- A fixed left sidebar (~140px wide) with navigation
- A top banner (~40px) for guest mode notice
- A difficulty selector bar below the banner
- The chess board (must be square, 8x8)
- Below the board: player info, move list, and control buttons

Please give me:
1. The complete CSS layout solution using flexbox or CSS Grid so the board always fits the full viewport height
2. The board should be sized as: min(calc(100vh - header height), calc(100vw - sidebar width)) to stay square and fully visible
3. How to make the move list panel scrollable independently so it doesn't push the board down
4. The specific component file structure changes needed
5. A before/after diagram of the layout

My tech stack is: [Vue 3 / React — update as needed]
```

---

### STEP 3 — Upgrade chess piece set to Cburnett (open source, Lichess quality)

**Why:** The current pieces are flat basic outlines. Cburnett is the piece set used by Lichess — free, MIT licensed, and professionally designed. One folder swap makes the board look dramatically more polished.

**Files you'll touch:** `public/pieces/`, `ChessBoard.vue / Board.jsx`

**Prompt:**
```
I want to upgrade my chess app's piece set from the current basic outline pieces to the Cburnett piece set (used by Lichess, MIT licensed, open source).

Please give me:
1. Where to download the Cburnett SVG piece set (exact GitHub URL)
2. The correct file naming convention (e.g. wP.svg, bK.svg for white pawn, black king etc.)
3. How to integrate them into my chess board component — I currently render pieces as <img> tags / background-image CSS (update based on my actual code)
4. How to support multiple piece set themes (so users can switch between Cburnett, Alpha, and my current set)
5. The folder structure to put the piece SVGs in my public/ directory

Also show me how to add a piece set selector in the settings so users can pick their preferred style.
```

---

## 🟡 IMPORTANT — Do these second

---

### STEP 4 — Rewrite the landing page hero — remove "#1 Site", fix typography

**Why:** "PLAY CHESS ONLINE ON THE #1 SITE!" in all-caps serif is a credibility killer and clashes with the modern UI. Replace with honest, confident copy and clean typography.

**Files you'll touch:** `HomePage.vue / LandingPage.jsx`, `home.css`

**Prompt:**
```
My chess app landing page currently has a hero headline: "PLAY CHESS ONLINE ON THE #1 SITE!" in all-caps serif font. I need to redesign the hero section to look more like chess.com — modern, confident, and honest.

The current landing page has:
- Dark/black background (keep this)
- Large ALL CAPS serif headline (change this)
- Green "Quick Play" CTA button (keep this)
- Live stats: 25,000+ games today, 2,300+ playing now (keep this)
- A chess board preview on the right (keep this)

Please give me:
1. 5 alternative headline options that are honest and compelling (no "#1 site" claims)
2. The updated HTML/JSX for the hero section with modern sans-serif typography
3. CSS changes to replace ALL CAPS serif with a clean font hierarchy (large display font, subtitle, CTA)
4. Make the hero board preview show the starting position instead of a random mid-game position
5. Add a brief features row below the CTA buttons: icons for "Bot personalities", "Puzzles", "Move analysis", "Multiple themes"

Show complete component code for the updated hero section.
```

---

### STEP 5 — Unify button design system (Undo, Hint, Flip, PGN, Resign)

**Why:** Game controls have inconsistent sizes, colors, border styles. "Resign" is a completely different full-width bar. A consistent button system looks professional.

**Files you'll touch:** `GameControls.vue / Controls.jsx`, `buttons.css`

**Prompt:**
```
My chess app game screen has inconsistent buttons. Currently there are two rows of mismatched buttons: [Undo] [Hint] [Flip] on row 1 and [PGN] [Copy PGN] [New Game] on row 2, plus a separate full-width "Resign" bar at the bottom in a different style.

Please help me:
1. Design a unified button component with consistent padding, border-radius, font size, and border style
2. Group buttons logically:
   - Game actions: Undo, Flip, Hint
   - Export: PGN, Copy PGN
   - Game state: New Game, Resign (resign should be red/danger outline, not filled)
3. Remove the full-width "Resign" bar — make it a normal-sized button grouped with "New Game"
4. Add hover and active states to all buttons
5. The overall color scheme is dark theme with green accent (#4CAF50 style green)

Give me the complete component code and CSS for the new unified controls section. Make it look clean like chess.com's game controls.
```

---

### STEP 6 — Polish the move list panel

**Why:** The move list is empty-looking and unstyled. Chess.com's version has alternating rows, current move highlighted, auto-scroll, and clickable moves to jump back in history.

**Files you'll touch:** `MoveList.vue / MoveHistory.jsx`, `movelist.css`

**Prompt:**
```
My chess app has a move list panel that shows game moves in algebraic notation. Currently it looks basic — just a header row "#, White, Black" and empty space. I want to upgrade it to look like chess.com's move list.

Please give me:
1. A redesigned MoveList component with:
   - Move number column + White move + Black move in a clean 3-column grid
   - Alternating row background colors (subtle, dark theme)
   - The currently active/selected move highlighted in green
   - Auto-scroll to keep the latest move in view
   - Clickable moves that jump the board to that position
2. A nice "No moves played yet" empty state with a subtle chess icon
3. The panel should have a fixed max-height and scroll independently (not push the board)
4. Add the move navigation buttons (|< < > >|) styled consistently below the move list

Show complete component + CSS. Dark theme, green accent color.
```

---

### STEP 7 — Fix sidebar collapse behavior, rename "Other"

**Why:** The sidebar eats 140px of horizontal space during gameplay. Chess.com collapses it to icon-only mode. "Other" as a nav label looks unfinished.

**Files you'll touch:** `Sidebar.vue / NavBar.jsx`, `sidebar.css`

**Prompt:**
```
My chess app has a left sidebar with navigation items: Play, Puzzles, Learn, Train, Watch, Community, Other. During gameplay, the sidebar takes up too much horizontal space and squeezes the board.

Please help me:
1. Make the sidebar collapse to icon-only mode (40-50px wide, showing only icons, no labels) when the user is on the game route
2. Add a toggle button at the top of the sidebar to expand/collapse manually
3. Show tooltips on hover when sidebar is collapsed (so users know what each icon does)
4. Replace the "Other" nav item — either remove it or rename it to something specific like "Settings"
5. Remove or relocate the search bar from inside the sidebar
6. The "Collapse Menu" text at the bottom should become a proper icon button at the top of the sidebar

Show complete Sidebar component code with the expand/collapse animation using CSS transitions.
```

---

## 🔵 POLISH — Do these last

---

### STEP 8 — Chess clock styling + low-time warning

**Why:** The timer "10:00" is plain text that's easy to miss. A proper chess clock is large, bold, and turns red when time is running out.

**Prompt:**
```
My chess app shows the game timer as plain text "10:00" which is too small and easy to miss during gameplay.

Please help me redesign the chess clock:
1. Make it a proper styled clock component — larger font (24-28px), monospace font, bold
2. Show the clock in a styled box/pill that sits clearly above the opponent info
3. Add color transitions:
   - Normal: white/neutral text
   - Under 2 minutes: amber/yellow warning color
   - Under 1 minute: red with subtle pulsing animation
   - Under 30 seconds: faster pulse, more urgent red
4. Show separate clocks for player and opponent (standard chess clock layout)
5. The active player's clock should be visually distinct (brighter, or has a ticking indicator)

Give me the Clock component code + CSS animations. Dark theme.
```

---

### STEP 9 — Add legal move highlights and last move indicator

**Why:** Chess.com shows dots on legal move squares, circles on capturable pieces, and highlights the last move's from/to squares. These make the game dramatically more playable.

**Prompt:**
```
I want to add chess.com-style visual indicators to my chess board:

1. Legal move highlights — when a piece is clicked/selected:
   - Show a subtle dot in the center of empty squares the piece can move to
   - Show a circle outline around squares with enemy pieces that can be captured
   - Highlight the selected piece's square in a distinct color

2. Last move indicator — after any move is made:
   - Highlight the "from" square and "to" square with a subtle yellow/gold tint
   - This persists until the next move is made

3. Check indicator — when the king is in check:
   - Highlight the king's square in red

Please give me:
- The CSS classes for each indicator type
- How to calculate and apply them in my board rendering logic
- The exact color values to use for a dark-themed green/cream board
- Make sure the indicators work on both light and dark board squares

My board is rendered as a grid of div elements with classes for square color.
```

---

### STEP 10 — Fix OG image, canonical URL, and social sharing

**Why:** The OG image returns a 404 and all meta tags point to the old GitHub Pages URL. Anyone sharing the app on WhatsApp or Twitter sees a broken, imageless preview.

**Prompt:**
```
My chess app has broken social sharing. The Open Graph meta tags have two problems:
1. og:url and og:image point to https://aum-patel14.github.io/chess-master-app/ (old GitHub Pages URL) instead of https://chess-master-app-main.vercel.app
2. The og:image file returns a 404

Please help me:
1. Fix all meta tags in my index.html to use the correct Vercel URL
2. Create a simple og-image (1200x630px) for the app — give me an HTML file I can screenshot, or SVG code I can use as the OG image
3. Where to place the og-image file in my Vercel project so it's publicly accessible
4. Add all recommended meta tags: og:title, og:description, og:image, og:url, og:type, twitter:card, twitter:image, canonical link tag
5. How to test the social preview using opengraph.xyz or the Facebook sharing debugger

Show me the complete updated <head> section for index.html.
```

---

## Quick Reference — Fix Order

| Step | Priority | What | Impact |
|------|----------|------|--------|
| 1 | 🔴 Critical | Fix Stockfish WASM | AI engine works |
| 2 | 🔴 Critical | Fix board overflow | Board fully visible |
| 3 | 🔴 Critical | Upgrade piece set | Huge visual upgrade |
| 4 | 🟡 Important | Rewrite hero headline | First impression |
| 5 | 🟡 Important | Unify buttons | Looks professional |
| 6 | 🟡 Important | Polish move list | Game quality |
| 7 | 🟡 Important | Fix sidebar | More board space |
| 8 | 🔵 Polish | Clock styling | Game feel |
| 9 | 🔵 Polish | Move highlights | Playability |
| 10 | 🔵 Polish | Fix social sharing | Shareability |
