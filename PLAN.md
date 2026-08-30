# KnightZero Rebuild Plan

## Product Goal
KnightZero will be a polished installable chess PWA that closely matches the usability and feature flow of leading online chess sites while using original branding, original UI styling, and our own implementation. It will support offline play, a strong Stockfish opponent, analysis, clocks, move history, saved games, accounts, and real-time online play.

## Constraints
- Zero paid services
- Development primarily from a phone / GitHub Codespaces
- GitHub for source control
- Supabase free tier for auth, database, presence, matchmaking and multiplayer state
- Vercel free tier for PWA hosting and continuous deployment
- Must remain responsive on low-end Android devices

## Architecture Decision
### Frontend
Use React + TypeScript + Vite as the primary PWA client.

Why this replaces the current Expo-first approach:
- KnightZero's immediate deliverable is an installable web/PWA app.
- Vite produces a simpler and lighter browser build.
- Web Workers and WebAssembly are easier to control directly for Stockfish.
- Vercel deployment is straightforward.
- Native packaging can be added later without compromising the web product.

### Chess Rules
Use chess.js for authoritative client-side move legality, SAN, PGN, FEN, check/checkmate, draw rules, castling, en passant and promotion handling.

### Board
Build the board as an original React component rather than cloning proprietary board code. It will support tap-to-move first, then pointer drag/drop, legal-move highlighting, last-move highlighting, check highlighting, board flip, coordinates and promotion UI.

### Engine
Use Stockfish 18 compiled to WebAssembly and run it inside a dedicated Web Worker so engine calculation never blocks the interface.

Default browser engine target: Stockfish 18 lite single-threaded. It is dramatically smaller than the full >100 MB build while remaining far stronger than human players. Add an optional high-strength mode later for capable devices.

Engine features:
- UCI initialization
- adjustable skill and Elo-style difficulty presets
- move-time limits rather than unbounded depth on phones
- best move and principal variation
- centipawn / mate evaluation
- analysis mode
- engine cancellation when board state changes
- no engine computation on the UI thread

### Backend
Supabase:
- Auth: email/password and guest-friendly flow
- PostgreSQL: profiles, games, moves, ratings, challenges
- RLS on every user-owned table
- Realtime Broadcast for live game events
- Presence for online state
- Database remains authoritative for completed game state and rating updates

Realtime design:
- Broadcast for low-latency move delivery
- server/database validation path for competitive online games
- periodic authoritative game-state persistence
- reconnect from persisted FEN/PGN

### Hosting / PWA
Vercel serves the Vite production build.

PWA requirements:
- web app manifest
- installable standalone display mode
- application icons
- service worker
- shell/assets cached for offline launch
- offline local games and AI once Stockfish assets are cached
- update notification when a new service worker is available

## UX / Feature Target
The experience should feel familiar to users of modern online chess platforms without copying protected branding/assets.

### Home
- KnightZero logo/brand
- Play Online
- Play Computer
- Local Game
- Puzzles (later phase)
- quick time-control presets
- profile/rating summary when signed in

### Game Screen
- responsive board dominating the screen
- player cards and clocks
- move list
- resign/draw/abort controls
- undo only where mode permits it
- board flip
- connection state indicator online
- promotion dialog
- game-over dialog and rematch

### Computer Mode
Difficulty presets:
- Beginner
- Casual
- Club
- Strong
- Expert
- Master
- Maximum

Difficulty will be implemented through Stockfish UCI controls and time constraints, not random illegal or artificial moves.

### Analysis
- evaluation score
- best line
- best move arrow later
- mistake/blunder classification later
- PGN import/export

### Online Play
Phase sequence:
1. direct challenge / private game
2. realtime synced moves
3. clocks synchronized against server timestamps
4. reconnect handling
5. rating updates
6. matchmaking queue

## Database V2
### profiles
- id uuid PK references auth.users
- username unique text
- rating integer
- games_played integer
- wins integer
- losses integer
- draws integer
- created_at timestamptz
- updated_at timestamptz

### games
- id uuid PK
- white_player uuid
- black_player uuid
- status text
- rated boolean
- time_control text
- initial_seconds integer
- increment_seconds integer
- fen text
- pgn text
- result text
- winner uuid nullable
- white_time_ms bigint
- black_time_ms bigint
- last_move_at timestamptz
- created_at timestamptz
- finished_at timestamptz nullable

### game_moves
- id bigint identity PK
- game_id uuid
- ply integer
- uci text
- san text
- fen_after text
- played_by uuid
- client_sent_at timestamptz
- created_at timestamptz

### challenges
- id uuid PK
- challenger uuid
- opponent uuid nullable
- rated boolean
- initial_seconds integer
- increment_seconds integer
- status text
- created_at timestamptz
- expires_at timestamptz

## Security Rules
- Never expose Supabase secret/service-role keys in the PWA.
- Browser receives only publishable/public credentials.
- RLS is mandatory.
- Clients cannot directly set their own rating.
- Competitive moves must be checked against the authoritative current FEN and player turn.
- Client engine is never used to validate online results.

## Licensing
Stockfish/Stockfish.js is GPLv3. KnightZero will include the required license notices and source availability information for the distributed Stockfish component. Third-party assets will be used only when their license permits redistribution.

## Build Phases
### Phase 0 - Clean Rebuild
- replace incomplete Expo experiment with Vite + React + TypeScript PWA
- establish lint/build scripts
- create responsive shell

### Phase 1 - Offline Chess Core
- original responsive chessboard
- chess.js legality
- tap-to-move
- promotion
- check/checkmate/draw detection
- move list
- undo/reset/local two-player

### Phase 2 - Stockfish 18
- worker-based UCI bridge
- difficulty presets
- AI game flow
- loading/error states
- analysis panel

### Phase 3 - PWA
- manifest
- service worker
- install UI
- offline cache
- icons
- Vercel production configuration

### Phase 4 - Supabase Accounts
- auth
- profiles
- database migration
- RLS
- persistent game history

### Phase 5 - Online Multiplayer
- challenges
- private realtime rooms
- Broadcast + Presence
- reconnect/resume
- server-authoritative clocks/state

### Phase 6 - Competitive Layer
- rating calculation
- matchmaking
- anti-abuse validation
- leaderboards

### Phase 7 - Polish
- drag/drop
- premoves
- sounds
- themes
- accessibility
- performance testing
- install/update UX

## Definition of First Public Release
A public release is ready when a user can open the Vercel URL on Android/desktop, install KnightZero as a PWA, play complete legal chess locally or against Stockfish, use clocks, save/review a game locally, and reopen the installed app offline.

Online accounts/multiplayer can ship immediately after that stable foundation rather than blocking the first installable build.
