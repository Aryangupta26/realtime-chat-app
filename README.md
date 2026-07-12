# Real-Time Chat Application

This project is a real-time chat application consisting of a Node.js/Express backend and a React Native frontend (built with Expo). It fulfills the requirements of real-time communication using Socket.io.

## Features Included
- **Send & Receive Messages:** Instant delivery via Socket.io.
- **Chat History:** Fetched via REST API and persisted in SQLite.
- **Message Timestamps:** Displayed on each message.
- **Bonus - Username Login:** Dummy authentication to identify users.
- **Bonus - Typing Indicator:** See when other users are typing.
- **Bonus - Online Status:** See when users join or leave the chat.
- **Bonus - Local Database:** Uses SQLite to store users and messages persistently.

## Project Structure
```text
.
├── backend/       # Node.js, Express, Socket.io, SQLite
└── frontend/      # React Native, Expo, Socket.io-client
```

## Setup Instructions

### 1. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   node server.js
   ```
   *The server will run on `http://localhost:3000` by default. It will automatically create a `chat.db` SQLite database file.*

### 2. Frontend Setup
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Expo development server:
   ```bash
   npx expo start
   ```
4. **Important for testing on physical devices:** If you are running the app on a physical device using Expo Go, you must update the `SOCKET_URL` in `frontend/src/socket.js` to point to your computer's local IP address instead of `localhost` (e.g., `http://192.168.1.10:3000`). If testing on an iOS simulator, `localhost` works. For Android emulators, you might need `http://10.0.2.2:3000`.

## Design Decisions
- **SQLite Database:** Selected for its zero-configuration setup. It doesn't require installing a separate database server (like MongoDB), making it extremely easy for anyone reviewing this project to run it immediately.
- **Expo (React Native):** Chosen because it abstracts away complex native build tools, allowing the app to run on iOS, Android, and web easily.
- **REST vs Socket.io:** While Socket.io handles the real-time sending and receiving, a REST API (`GET /api/messages`) was created to fetch the chat history when the app loads, keeping concerns separated.

## Assumptions Made
- A dummy authentication system (just entering a username) is sufficient to fulfill the requirement without building a complex JWT/password registration flow.
- A single global chat room is enough to demonstrate real-time capabilities. All users who join participate in the same chat.
