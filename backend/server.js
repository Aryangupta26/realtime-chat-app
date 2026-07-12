const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const db = require('./database');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// REST APIs
// 1. Fetch chat history
app.get('/api/messages', (req, res) => {
  const query = `SELECT * FROM messages ORDER BY timestamp ASC`;
  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch messages' });
    }
    res.json(rows);
  });
});

// 2. Send messages (REST approach, but mostly handled by socket)
app.post('/api/messages', (req, res) => {
  const { sender, text } = req.body;
  if (!sender || !text) return res.status(400).json({ error: 'sender and text are required' });

  const timestamp = new Date().toISOString();
  const query = `INSERT INTO messages (sender, text, timestamp) VALUES (?, ?, ?)`;
  
  db.run(query, [sender, text, timestamp], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to save message' });
    }
    const newMessage = { id: this.lastID, sender, text, timestamp };
    io.emit('receive_message', newMessage); // Broadcast to all connected clients
    res.status(201).json(newMessage);
  });
});

// Track online users globally
const onlineUsers = new Set();

// Socket.io Real-Time Communication
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Handle user login/join
  socket.on('join', (username) => {
    socket.username = username;
    onlineUsers.add(username);
    io.emit('online_users', Array.from(onlineUsers));
  });

  // Handle sending messages in real-time
  socket.on('send_message', (data) => {
    const { sender, text } = data;
    const timestamp = new Date().toISOString();
    
    // Save to database
    const query = `INSERT INTO messages (sender, text, timestamp) VALUES (?, ?, ?)`;
    db.run(query, [sender, text, timestamp], function(err) {
      if (err) {
        console.error('Error saving message:', err.message);
      } else {
        const newMessage = { id: this.lastID, sender, text, timestamp };
        // Broadcast to everyone else
        socket.broadcast.emit('receive_message', newMessage);
      }
    });
  });

  // Handle typing indicator
  socket.on('typing', (isTyping) => {
    if (socket.username) {
      socket.broadcast.emit('user_typing', { username: socket.username, isTyping });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    if (socket.username) {
      onlineUsers.delete(socket.username);
      io.emit('online_users', Array.from(onlineUsers));
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
