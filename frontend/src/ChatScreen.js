import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import socket from './socket';

export default function ChatScreen({ username, onLogout }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const typingTimeoutRef = useRef(null);
  const flatListRef = useRef();

  useEffect(() => {
    socket.connect();
    
    // Send join event when connecting (or reconnecting)
    const onConnect = () => {
      socket.emit('join', username);
    };
    socket.on('connect', onConnect);
    
    // If already connected, emit immediately
    if (socket.connected) {
      socket.emit('join', username);
    }

    const fetchMessages = async () => {
      try {
        const response = await fetch('https://realtime-chat-app-xco2.onrender.com/api/messages');
        const data = await response.json();
        setMessages(data);
      } catch (err) {
        console.error('Failed to fetch messages. Make sure backend is running.', err);
      }
    };
    fetchMessages();

    socket.on('receive_message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    socket.on('online_users', (users) => {
      setOnlineUsers(users);
    });

    socket.on('user_typing', ({ username: uName, isTyping }) => {
      setTypingUsers(prev => {
        if (isTyping && !prev.includes(uName)) return [...prev, uName];
        if (!isTyping) return prev.filter(name => name !== uName);
        return prev;
      });
    });

    return () => {
      socket.off('connect', onConnect);
      socket.off('receive_message');
      socket.off('online_users');
      socket.off('user_typing');
      socket.disconnect();
    };
  }, [username]);

  const sendMessage = () => {
    if (inputText.trim()) {
      const msgData = { sender: username, text: inputText.trim() };
      socket.emit('send_message', msgData);
      
      const optimisticMsg = { ...msgData, timestamp: new Date().toISOString(), id: Date.now() };
      setMessages(prev => [...prev, optimisticMsg]);
      
      setInputText('');
      socket.emit('typing', false);
    }
  };

  const handleTextChange = (text) => {
    setInputText(text);
    socket.emit('typing', text.length > 0);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing', false);
    }, 2000);
  };

  const renderMessage = ({ item }) => {
    const isMe = item.sender === username;
    return (
      <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.otherMessage]}>
        {!isMe && <Text style={styles.senderName}>{item.sender}</Text>}
        <Text style={[styles.messageText, isMe ? styles.myMessageText : {}]}>{item.text}</Text>
        <Text style={styles.timestamp}>
          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chat ({username})</Text>
        <TouchableOpacity onPress={onLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.onlineContainer}>
        <Text style={styles.onlineText}>
          Online: {onlineUsers.filter(u => u !== username).join(', ') || 'Only you'}
        </Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {typingUsers.length > 0 && (
        <Text style={styles.typingText}>
          {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
        </Text>
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            value={inputText}
            onChangeText={handleTextChange}
          />
          <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f0f0' },
  header: {
    height: 60,
    backgroundColor: '#007bff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: Platform.OS === 'ios' ? 20 : 0,
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  logoutText: { color: '#fff', fontSize: 16 },
  onlineContainer: {
    backgroundColor: '#e6f2ff',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#cce0ff',
  },
  onlineText: {
    fontSize: 12,
    color: '#0059b3',
    fontWeight: '500',
  },
  messageList: { padding: 10 },
  messageBubble: {
    maxWidth: '80%',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007bff',
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
  },
  senderName: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  messageText: { fontSize: 16, color: '#333' },
  myMessageText: { color: '#fff' },
  timestamp: {
    fontSize: 10,
    color: '#aaa',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  typingText: {
    fontSize: 12,
    color: '#888',
    paddingHorizontal: 15,
    paddingBottom: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#ddd',
  },
  input: {
    flex: 1,
    height: 40,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 15,
  },
  sendButton: {
    marginLeft: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#007bff',
    borderRadius: 20,
    paddingHorizontal: 20,
  },
  sendButtonText: { color: '#fff', fontWeight: 'bold' },
});
