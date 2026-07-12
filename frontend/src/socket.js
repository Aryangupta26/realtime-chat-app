import { io } from 'socket.io-client';

// NOTE: For physical devices testing, replace 'localhost' with your computer's// Change to your deployed backend URL when going live
const SOCKET_URL = 'https://realtime-chat-app-xco2.onrender.com';
const socket = io(SOCKET_URL, {
  autoConnect: false,
});

export default socket;
