import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import { format } from 'date-fns';

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
}

interface ChatProps {
  isGroup?: boolean;
}

const Chat: React.FC<ChatProps> = ({ isGroup = false }) => {
  const { userId, groupId } = useParams();
  const { user } = useAuth();
  const { sendMessage, sendTypingStatus, sendReadReceipt, typingUsers } = useWebSocket();
  const navigate = useNavigate();
  
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [chatPartner, setChatPartner] = useState<any>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const chatId = isGroup ? groupId : userId;
  
  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Fetch chat history and chat partner details
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch chat history
        const messagesEndpoint = isGroup
          ? `/chat/groups/${chatId}/messages`
          : `/chat/messages/${chatId}`;
        
        const messagesResponse = await axios.get(messagesEndpoint);
        setChatMessages(messagesResponse.data.messages.reverse());
        
        // Fetch chat partner details (for direct messages)
        if (!isGroup && userId) {
          const userResponse = await axios.get(`/api/users/${userId}`);
          setChatPartner(userResponse.data);
        }
        // Fetch group details (for group chats)
        else if (isGroup && groupId) {
          const groupResponse = await axios.get(`/chat/groups/${groupId}`);
          setChatPartner(groupResponse.data);
        }
        
        // Mark messages as read
        messagesResponse.data.messages.forEach((message: Message) => {
          if (message.sender_id !== user?.id && message.status !== 'read') {
            sendReadReceipt(message.id);
          }
        });
      } catch (error) {
        console.error('Error fetching chat data:', error);
        toast.error('Failed to load chat');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (chatId) {
      fetchData();
    }
  }, [chatId, isGroup, user?.id, sendReadReceipt]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);
  
  // Handle typing status
  const handleTyping = () => {
    if (!isTyping && userId) {
      setIsTyping(true);
      sendTypingStatus(userId, true);
    }
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (userId) {
        sendTypingStatus(userId, false);
      }
    }, 2000);
  };
  
  // Clean up typing timeout
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);
  
  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };
  
  // Handle file upload
  const handleFileUpload = async () => {
    if (!selectedFile) return;
    
    try {
      setIsUploading(true);
      
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      const response = await axios.post('/chat/upload-file', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      const fileUrl = response.data.file_url;
      let messageType = 'file';
      
      // Determine message type based on file mime type
      if (selectedFile.type.startsWith('image/')) {
        messageType = 'image';
      } else if (selectedFile.type.startsWith('audio/')) {
        messageType = 'audio';
      } else if (selectedFile.type.startsWith('video/')) {
        messageType = 'video';
      }
      
      // Send message with file
      if (isGroup) {
        sendMessage('', undefined, chatId, messageType, fileUrl);
      } else {
        sendMessage('', chatId, undefined, messageType, fileUrl);
      }
      
      setSelectedFile(null);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };
  
  // Handle message submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newMessage.trim() === '' && !selectedFile) return;
    
    // Handle file upload if file is selected
    if (selectedFile) {
      handleFileUpload();
      return;
    }
    
    // Send text message
    if (isGroup) {
      sendMessage(newMessage, undefined, chatId);
    } else {
      sendMessage(newMessage, chatId);
    }
    
    setNewMessage('');
  };
  
  // Format message timestamp
  const formatMessageTime = (timestamp: string) => {
    return format(new Date(timestamp), 'h:mm a');
  };
  
  // Render message content based on type
  const renderMessageContent = (message: Message) => {
    switch (message.message_type) {
      case 'image':
        return (
          <img
            src={message.file_url}
            alt="Shared image"
            className="max-w-xs rounded-md"
          />
        );
      case 'audio':
        return (
          <audio controls className="max-w-xs">
            <source src={message.file_url} />
            Your browser does not support the audio element.
          </audio>
        );
      case 'video':
        return (
          <video controls className="max-w-xs rounded-md">
            <source src={message.file_url} />
            Your browser does not support the video element.
          </video>
        );
      case 'file':
        return (
          <a
            href={message.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center p-2 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Download file</span>
          </a>
        );
      default:
        return <p>{message.content}</p>;
    }
  };
  
  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-12rem)]">
        {/* Chat header */}
        <div className="bg-white shadow-sm p-4 flex items-center">
          {isLoading ? (
            <div className="animate-pulse h-10 w-10 bg-gray-200 rounded-full"></div>
          ) : (
            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
              {chatPartner?.profile_picture || chatPartner?.group_picture ? (
                <img
                  src={chatPartner?.profile_picture || chatPartner?.group_picture}
                  alt={chatPartner?.full_name || chatPartner?.name || 'Chat'}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-gray-500 text-sm font-medium">
                  {isGroup
                    ? chatPartner?.name?.[0] || 'G'
                    : chatPartner?.full_name?.[0] || chatPartner?.email?.[0] || 'U'}
                </span>
              )}
            </div>
          )}
          
          <div className="ml-3">
            <h2 className="text-lg font-medium text-gray-900">
              {isLoading
                ? <div className="animate-pulse h-5 w-32 bg-gray-200 rounded"></div>
                : isGroup
                  ? chatPartner?.name
                  : chatPartner?.full_name || chatPartner?.email || chatPartner?.phone_number}
            </h2>
            {!isGroup && typingUsers[chatId!] && (
              <p className="text-sm text-primary-600">Typing...</p>
            )}
          </div>
        </div>
        
        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
            </div>
          ) : chatMessages.length === 0 ? (
            <div className="flex justify-center items-center h-full">
              <p className="text-gray-500">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.sender_id === user?.id ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`message-bubble ${
                      message.sender_id === user?.id
                        ? 'message-sent rounded-tr-none'
                        : 'message-received rounded-tl-none'
                    }`}
                  >
                    {renderMessageContent(message)}
                    <div className="flex items-center justify-end mt-1 text-xs">
                      <span className={message.sender_id === user?.id ? 'text-white opacity-70' : 'text-gray-500'}>
                        {formatMessageTime(message.created_at)}
                      </span>
                      {message.sender_id === user?.id && (
                        <span className="ml-1">
                          {message.status === 'sent' && '✓'}
                          {message.status === 'delivered' && '✓✓'}
                          {message.status === 'read' && (
                            <span className="text-blue-400">✓✓</span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        
        {/* Message input */}
        <div className="bg-white p-4 border-t">
          <form onSubmit={handleSubmit} className="flex items-center">
            <button
              type="button"
              className="p-2 rounded-full text-gray-500 hover:text-gray-700 focus:outline-none"
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
            <input
              id="file-upload"
              type="file"
              className="hidden"
              onChange={handleFileChange}
            />
            
            {selectedFile && (
              <div className="ml-2 p-1 bg-gray-100 rounded flex items-center">
                <span className="text-xs truncate max-w-xs">{selectedFile.name}</span>
                <button
                  type="button"
                  className="ml-1 text-gray-500 hover:text-gray-700"
                  onClick={() => setSelectedFile(null)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
            
            <input
              type="text"
              placeholder="Type a message..."
              className="flex-1 border-0 focus:ring-0 focus:outline-none px-4 py-2"
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
              }}
              disabled={isUploading}
            />
            
            <button
              type="submit"
              className="p-2 rounded-full bg-primary-500 text-white hover:bg-primary-600 focus:outline-none disabled:opacity-50"
              disabled={isUploading || (newMessage.trim() === '' && !selectedFile)}
            >
              {isUploading ? (
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default Chat; 