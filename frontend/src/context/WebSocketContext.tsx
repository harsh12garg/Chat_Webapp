import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode, useRef } from 'react';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

// API base URL
const WS_URL = 'ws://localhost:8000/chat/ws';

// Types
interface Message {
  id: string;
  sender_id: string;
  receiver_id?: string;
  group_id?: string;
  content: string;
  message_type: string;
  file_url?: string;
  status: string;
  created_at: string;
  sender_name?: string;
}

interface TypingStatus {
  sender_id: string;
  receiver_id: string;
  is_typing: boolean;
}

interface ReadReceipt {
  message_id: string;
  reader_id: string;
}

interface WebSocketContextType {
  socket: WebSocket | null;
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  sendMessage: (content: string, receiverId?: string, groupId?: string, messageType?: string, fileUrl?: string) => void;
  sendTypingStatus: (receiverId: string, isTyping: boolean) => void;
  sendReadReceipt: (messageId: string) => void;
  messages: Message[];
  typingUsers: Record<string, boolean>;
  clearMessages: () => void;
}

interface WebSocketProviderProps {
  children: ReactNode;
}

// Create context
const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

// WebSocket provider component
export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const { token, isAuthenticated, user } = useAuth();
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxReconnectAttempts = 5;
  const initialReconnectDelay = 1000;

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Connect to WebSocket
  const connectWebSocket = useCallback(() => {
    if (isAuthenticated && token && user && !isConnecting) {
      try {
        setIsConnecting(true);
        setConnectionError(null);
        
        console.log('Connecting to WebSocket...');
        const ws = new WebSocket(`${WS_URL}/${token}`);
        
        ws.onopen = () => {
          console.log('WebSocket connected');
          setIsConnected(true);
          setIsConnecting(false);
          setReconnectAttempts(0); // Reset reconnect attempts on successful connection
        };
        
        ws.onclose = (event) => {
          console.log('WebSocket disconnected', event);
          setIsConnected(false);
          setIsConnecting(false);
          
          // Try to reconnect if not a normal closure and within max attempts
          if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
            const timeout = Math.min(initialReconnectDelay * Math.pow(2, reconnectAttempts), 30000);
            console.log(`Reconnecting in ${timeout / 1000} seconds (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`);
            
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current);
            }
            
            reconnectTimeoutRef.current = setTimeout(() => {
              setReconnectAttempts(prev => prev + 1);
              connectWebSocket();
            }, timeout);
          } else if (reconnectAttempts >= maxReconnectAttempts) {
            setConnectionError('Failed to connect after multiple attempts. Please refresh the page.');
            toast.error('Connection lost. Please refresh the page.');
          }
        };
        
        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setConnectionError('Connection error. Please check your internet connection.');
          setIsConnecting(false);
        };
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            handleWebSocketMessage(data);
          } catch (e) {
            console.error('Error parsing WebSocket message:', e);
          }
        };
        
        setSocket(ws);
        
        // Cleanup function
        return () => {
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          ws.close();
        };
      } catch (error) {
        console.error('Error creating WebSocket connection:', error);
        setIsConnecting(false);
        setConnectionError('Failed to establish connection');
      }
    }
    return undefined;
  }, [isAuthenticated, token, user, isConnecting, reconnectAttempts]);

  // Connect WebSocket when authenticated
  useEffect(() => {
    if (isAuthenticated && token && user) {
      const cleanup = connectWebSocket();
      return cleanup;
    } else if (socket) {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      socket.close();
      setSocket(null);
      setIsConnected(false);
      setConnectionError(null);
    }
  }, [isAuthenticated, token, user, connectWebSocket, socket]);
  
  // Handle incoming WebSocket messages
  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'message':
        setMessages((prevMessages) => {
          // Check if message already exists to avoid duplicates
          const messageExists = prevMessages.some(msg => msg.id === data.data.id);
          if (messageExists) {
            return prevMessages;
          }
          return [...prevMessages, data.data];
        });
        break;
      case 'typing':
        setTypingUsers((prevTypingUsers) => ({
          ...prevTypingUsers,
          [data.data.sender_id]: data.data.is_typing
        }));
        break;
      case 'read_receipt':
        setMessages((prevMessages) =>
          prevMessages.map((message) =>
            message.id === data.data.message_id
              ? { ...message, status: 'read' }
              : message
          )
        );
        break;
      case 'error':
        console.error('WebSocket error message:', data.data);
        toast.error(data.data.message || 'An error occurred');
        break;
      default:
        console.log('Unknown message type:', data.type);
    }
  };
  
  // Send message function
  const sendMessage = (
    content: string,
    receiverId?: string,
    groupId?: string,
    messageType: string = 'text',
    fileUrl?: string
  ) => {
    if (!content.trim() && !fileUrl) {
      return; // Don't send empty messages
    }
    
    if (socket && isConnected) {
      const messageData = {
        type: 'message',
        data: {
          content,
          receiver_id: receiverId,
          group_id: groupId,
          message_type: messageType,
          file_url: fileUrl
        }
      };
      
      try {
        socket.send(JSON.stringify(messageData));
      } catch (error) {
        console.error('Error sending message:', error);
        toast.error('Failed to send message. Please try again.');
      }
    } else {
      toast.error('Not connected. Please wait or refresh the page.');
    }
  };
  
  // Send typing status function
  const sendTypingStatus = (receiverId: string, isTyping: boolean) => {
    if (socket && isConnected) {
      const typingData = {
        type: 'typing',
        data: {
          receiver_id: receiverId,
          is_typing: isTyping
        }
      };
      
      try {
        socket.send(JSON.stringify(typingData));
      } catch (error) {
        console.error('Error sending typing status:', error);
      }
    }
  };
  
  // Send read receipt function
  const sendReadReceipt = (messageId: string) => {
    if (socket && isConnected) {
      const readReceiptData = {
        type: 'read_receipt',
        data: {
          message_id: messageId
        }
      };
      
      try {
        socket.send(JSON.stringify(readReceiptData));
      } catch (error) {
        console.error('Error sending read receipt:', error);
      }
    }
  };
  
  // Context value
  const value = {
    socket,
    isConnected,
    isConnecting,
    connectionError,
    sendMessage,
    sendTypingStatus,
    sendReadReceipt,
    messages,
    typingUsers,
    clearMessages
  };
  
  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

// Custom hook to use the WebSocket context
export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  
  return context;
}; 