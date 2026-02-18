import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from './AuthContext';

const WebSocketContext = createContext();

export const useWebSocket = () => useContext(WebSocketContext);

export function WebSocketProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [chatSocket, setChatSocket] = useState(null);
  const [notificationSocket, setNotificationSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    if (!isAuthenticated || !user) {
      disconnectSockets();
      return;
    }

    connectSockets();

    return () => {
      disconnectSockets();
    };
  }, [isAuthenticated, user]);

  const connectSockets = () => {
    try {
      const wsUrl = process.env.REACT_APP_BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');
      
      // Chat WebSocket
      const chat = new WebSocket(`${wsUrl}/ws/chat/${user.user_id}`);
      
      chat.onopen = () => {
        console.log('Chat WebSocket connected');
        setConnected(true);
        reconnectAttempts.current = 0;
      };

      chat.onclose = () => {
        console.log('Chat WebSocket disconnected');
        setConnected(false);
        attemptReconnect();
      };

      chat.onerror = (error) => {
        console.error('Chat WebSocket error:', error);
      };

      setChatSocket(chat);

      // Notifications WebSocket
      const notifications = new WebSocket(`${wsUrl}/ws/notifications/${user.user_id}`);
      
      notifications.onopen = () => {
        console.log('Notifications WebSocket connected');
      };

      notifications.onclose = () => {
        console.log('Notifications WebSocket disconnected');
        attemptReconnect();
      };

      notifications.onerror = (error) => {
        console.error('Notifications WebSocket error:', error);
      };

      setNotificationSocket(notifications);

    } catch (error) {
      console.error('Error connecting WebSockets:', error);
    }
  };

  const disconnectSockets = () => {
    if (chatSocket) {
      chatSocket.close();
      setChatSocket(null);
    }
    if (notificationSocket) {
      notificationSocket.close();
      setNotificationSocket(null);
    }
    setConnected(false);
  };

  const attemptReconnect = () => {
    if (reconnectAttempts.current < maxReconnectAttempts) {
      reconnectAttempts.current += 1;
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
      console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`);
      setTimeout(connectSockets, delay);
    } else {
      console.error('Max reconnection attempts reached');
    }
  };

  const sendChatMessage = (message) => {
    if (chatSocket && chatSocket.readyState === WebSocket.OPEN) {
      chatSocket.send(JSON.stringify(message));
    }
  };

  const sendTypingIndicator = (conversationId) => {
    if (chatSocket && chatSocket.readyState === WebSocket.OPEN) {
      chatSocket.send(JSON.stringify({
        type: 'typing',
        conversation_id: conversationId
      }));
    }
  };

  return (
    <WebSocketContext.Provider value={{
      chatSocket,
      notificationSocket,
      connected,
      sendChatMessage,
      sendTypingIndicator
    }}>
      {children}
    </WebSocketContext.Provider>
  );
}
