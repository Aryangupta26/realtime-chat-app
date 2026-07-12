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
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    height: 70,
    backgroundColor: '#6366f1',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 35 : 15,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 10,
  },
  headerTitle: { color: '#ffffff', fontSize: 20, fontWeight: '800', letterSpacing: 0.5 },
  logoutText: { color: '#e0e7ff', fontSize: 14, fontWeight: '600', padding: 8 },
  onlineContainer: {
    backgroundColor: '#e0e7ff',
    paddingVertical: 8,
    paddingHorizontal: 20,
    marginTop: 10,
    marginHorizontal: 15,
    borderRadius: 20,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  onlineText: {
    fontSize: 12,
    color: '#4f46e5',
    fontWeight: '700',
  },
  messageList: { padding: 15, paddingBottom: 20 },
  messageBubble: {
    maxWidth: '85%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#6366f1',
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  senderName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6366f1',
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  messageText: { fontSize: 15, color: '#334155', lineHeight: 22 },
  myMessageText: { color: '#ffffff' },
  timestamp: {
    fontSize: 10,
    color: '#94a3b8',
    alignSelf: 'flex-end',
    marginTop: 6,
  },
  typingText: {
    fontSize: 12,
    color: '#64748b',
    paddingHorizontal: 20,
    paddingBottom: 10,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderColor: '#f1f5f9',
    paddingBottom: Platform.OS === 'ios' ? 25 : 12,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    minHeight: 45,
    maxHeight: 100,
    backgroundColor: '#f8fafc',
    borderRadius: 25,
    paddingHorizontal: 20,
    fontSize: 15,
    color: '#334155',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sendButton: {
    marginLeft: 12,
    width: 45,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    borderRadius: 25,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  sendButtonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 12 },
});
