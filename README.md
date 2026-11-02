# React Chat App

Single-page chat built with React (Vite) and an optional Express + socket.io server.

## Features
- Text box + Send button (Enter also sends); messages appear above the box
- Random username per message from `["Alan", "Bob", "Carol", "Dean", "Elin"]`
- Like button at the right end of each message with a live count
- Stretch goals:
  - Emoji picker with search (try "wave")
  - `@` mentions: typing `@` shows the user list, filters as you type, click or Enter to insert
  - socket.io server (Express) with publish/subscribe for messages and likes; the app falls back to local mode if the server is off

## Run
```bash
# terminal 1 (optional, enables real-time sync)
cd server && npm install && npm start      # http://localhost:4000

# terminal 2
cd client && npm install && npm run dev     # http://localhost:3000
```
Open two browser tabs to see messages and likes sync live.

## Structure
- `client/src/App.jsx` chat UI and logic
- `client/src/emojis.js` emoji data
- `server/server.js` Express + socket.io server
