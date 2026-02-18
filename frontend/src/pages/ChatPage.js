import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import AppLayout from '../components/layout/AppLayout';
import { MessageSquare, Send, Search, Circle, User, Phone, Video } from 'lucide-react';

export default function ChatPage() {
  const { user } = useAuth();
  const { chatSocket, connected, sendTypingIndicator } = useWebSocket();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [contacts, setContacts] = useState([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typingUsers, setTypingUsers] = useState(new Set());
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    fetchConversations();
    fetchContacts();
  }, []);

  useEffect(() => {
    if (chatSocket) {
      chatSocket.onmessage = handleWebSocketMessage;
    }
  }, [chatSocket, selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleWebSocketMessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      if (data.type === 'new_message') {
        // Update conversations list
        fetchConversations();
        
        // If message is for current conversation, add it
        if (selectedConversation && data.conversation_id === selectedConversation.conversation_id) {
          setMessages(prev => [...prev, data.message]);
        }
      } else if (data.type === 'typing') {
        if (selectedConversation && data.conversation_id === selectedConversation.conversation_id) {
          setTypingUsers(prev => new Set(prev).add(data.user_id));
          setTimeout(() => {
            setTypingUsers(prev => {
              const newSet = new Set(prev);
              newSet.delete(data.user_id);
              return newSet;
            });
          }, 3000);
        }
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  };

  const fetchConversations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/chat/conversations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setConversations(data.conversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const fetchContacts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/chat/contacts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setContacts(data.contacts);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  const fetchMessages = async (conversationId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/chat/conversations/${conversationId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setMessages(data.messages);
      setSelectedConversation(data.conversation);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation);
    fetchMessages(conversation.conversation_id);
    setShowNewChat(false);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedConversation) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/chat/conversations/${selectedConversation.conversation_id}/message?message=${encodeURIComponent(messageText)}`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.ok) {
        const newMessage = await response.json();
        setMessages(prev => [...prev, newMessage]);
        setMessageText('');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleStartNewChat = async (contactId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/chat/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          participant_id: contactId,
          message: 'Olá!'
        })
      });

      if (response.ok) {
        const data = await response.json();
        await fetchConversations();
        const newConv = conversations.find(c => c.conversation_id === data.conversation_id);
        if (newConv) {
          handleSelectConversation(newConv);
        }
        setShowNewChat(false);
      }
    } catch (error) {
      console.error('Error starting chat:', error);
    }
  };

  const handleTyping = () => {
    if (selectedConversation) {
      sendTypingIndicator(selectedConversation.conversation_id);
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set new timeout
      typingTimeoutRef.current = setTimeout(() => {
        typingTimeoutRef.current = null;
      }, 1000);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AppLayout title="Chat" subtitle="Converse em tempo real com sua equipe">
      <div className="space-y-6">
        {/* Status Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-gray-200">
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-gray-700">
                {connected ? 'Conectado' : 'Desconectado'}
              </span>
            </div>
          </div>
          {!selectedConversation && !showNewChat && (
            <button
              onClick={() => setShowNewChat(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              data-testid="new-chat-btn"
            >
              Nova Conversa
            </button>
          )}
        </div>

        {/* Chat Container */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex" style={{ height: 'calc(100vh - 280px)' }}>
          {/* Conversations Sidebar */}
          <div className="w-80 border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Conversas</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar conversas..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">Nenhuma conversa ainda</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.conversation_id}
                    onClick={() => handleSelectConversation(conv)}
                    className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedConversation?.conversation_id === conv.conversation_id ? 'bg-blue-50' : ''
                    }`}
                    data-testid={`conversation-${conv.conversation_id}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
                          {conv.other_user?.name?.charAt(0) || '?'}
                        </div>
                        {conv.unread_count > 0 && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                            {conv.unread_count}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {conv.other_user?.name || 'Usuário'}
                          </h3>
                          <span className="text-xs text-gray-500">
                            {conv.last_message_at && new Date(conv.last_message_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 truncate">
                          {conv.last_message || 'Nenhuma mensagem'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                        {selectedConversation.other_user?.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <h2 className="font-semibold text-gray-900">
                          {selectedConversation.other_user?.name || 'Usuário'}
                        </h2>
                        <p className="text-xs text-gray-600">
                          {selectedConversation.other_user?.email || ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors">
                        <Phone className="w-5 h-5" />
                      </button>
                      <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors">
                        <Video className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
                  {messages.map((msg) => {
                    const isOwn = msg.sender_id === user.user_id;
                    return (
                      <div
                        key={msg.message_id}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-md px-4 py-3 rounded-2xl shadow-sm ${
                            isOwn
                              ? 'bg-blue-600 text-white rounded-br-none'
                              : 'bg-white text-gray-900 border border-gray-200 rounded-bl-none'
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                          <p className={`text-xs mt-1 ${isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
                            {new Date(msg.created_at).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Typing Indicator */}
                  {typingUsers.size > 0 && (
                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                      <div className="flex gap-1">
                        <Circle className="w-2 h-2 animate-pulse" />
                        <Circle className="w-2 h-2 animate-pulse" style={{ animationDelay: '0.2s' }} />
                        <Circle className="w-2 h-2 animate-pulse" style={{ animationDelay: '0.4s' }} />
                      </div>
                      <span>Digitando...</span>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-200">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={messageText}
                      onChange={(e) => {
                        setMessageText(e.target.value);
                        handleTyping();
                      }}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Digite sua mensagem..."
                      data-testid="message-input"
                    />
                    <button
                      type="submit"
                      disabled={!messageText.trim()}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                      data-testid="send-message-btn"
                    >
                      <Send className="w-5 h-5" />
                      <span className="hidden sm:inline">Enviar</span>
                    </button>
                  </div>
                </form>
              </>
            ) : showNewChat ? (
              <div className="flex-1 p-6 overflow-y-auto">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Iniciar Nova Conversa</h2>
                
                <div className="mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Buscar contato..."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  {filteredContacts.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <User className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <p>Nenhum contato encontrado</p>
                    </div>
                  ) : (
                    filteredContacts.map((contact) => (
                      <div
                        key={contact.user_id}
                        onClick={() => handleStartNewChat(contact.user_id)}
                        className="p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all"
                        data-testid={`contact-${contact.user_id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg">
                            {contact.name.charAt(0)}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{contact.name}</h3>
                            <p className="text-sm text-gray-600">{contact.email}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500 bg-gray-50">
                <div className="text-center">
                  <MessageSquare className="w-20 h-20 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium text-gray-700">Selecione uma conversa</p>
                  <p className="text-sm text-gray-500 mt-1">Escolha um contato para começar a conversar</p>
                  <button
                    onClick={() => setShowNewChat(true)}
                    className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Iniciar Conversa
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
