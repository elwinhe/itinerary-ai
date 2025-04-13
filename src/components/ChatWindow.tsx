'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Script from 'next/script';
import styles from './ChatWindow.module.css';

// Add type declaration for Google Maps
declare global {
  interface Window {
    google: any; // Using any for simplicity, but you could define a more specific type
  }
}

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

interface ChatHistory {
  id: string;
  title: string;
  date: string;
  messages: Message[];
}

export default function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Auto-resize textarea as content grows
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  // Initialize Google Maps when the script is loaded
  useEffect(() => {
    if (mapLoaded && mapRef.current && window.google) {
      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat: 37.7749, lng: -122.4194 }, // San Francisco
        zoom: 12,
      });
    }
  }, [mapLoaded]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMessage: Message = {
      id: crypto.randomUUID(),
      content: input,
      role: 'user',
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    
    // If this is the first message, create a new chat history entry
    if (messages.length === 0) {
      const newChatId = crypto.randomUUID();
      const newChatHistory: ChatHistory = {
        id: newChatId,
        title: input.length > 20 ? input.substring(0, 20) + '...' : input,
        date: new Date().toLocaleDateString(),
        messages: updatedMessages,
      };
      setChatHistory([newChatHistory, ...chatHistory]);
      setCurrentChatId(newChatId);
    } else if (currentChatId) {
      // Update existing chat history
      setChatHistory(chatHistory.map(chat => 
        chat.id === currentChatId 
          ? { ...chat, messages: updatedMessages } 
          : chat
      ));
    }
    
    setInput('');
    
    // Reset textarea height after submission
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleNewTrip = () => {
    // Reset messages
    setMessages([]);
    // Reset input
    setInput('');
    // Reset current chat ID
    setCurrentChatId(null);
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleHistoryItemClick = (chatId: string) => {
    const selectedChat = chatHistory.find(chat => chat.id === chatId);
    if (selectedChat) {
      setMessages(selectedChat.messages);
      setCurrentChatId(chatId);
    }
  };

  async function handleSendMessage(userMessage: string) {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMessage }),
    });
    const data = await res.json();
    // setChatState(data.response);
  }

  return (
    <div className={styles.container}>
      {/* Google Maps Script */}
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`}
        onLoad={() => setMapLoaded(true)}
      />

      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <Image 
            src="/images/logo.png" 
            alt="Itinerary.ai Logo" 
            width={50} 
            height={50} 
          />
          <span className={styles.sidebarHeader__title}>Itinerary.ai</span>
        </div>

        <button className={styles.newTripButton} onClick={handleNewTrip}>New Trip</button>

        <div>
          <h3 className={styles.historyHeading}>History</h3>
          <ul className={styles.historyList}>
            {chatHistory.length > 0 ? (
              chatHistory.map((item) => (
                <li 
                  key={item.id} 
                  className={`${styles.historyItem} ${currentChatId === item.id ? styles.activeHistoryItem : ''}`}
                  onClick={() => handleHistoryItemClick(item.id)}
                >
                  {item.title} ({item.date})
                </li>
              ))
            ) : null}
          </ul>
        </div>
      </aside>

      {/* Main Content */}
      <main className={messages.length > 0 ? styles.mainContentWithMessages : styles.mainContent}>
        {messages.length === 0 && (
          <h1 className={styles.mainHeading}>
            How can I help plan your trip today?
          </h1>
        )}

        {/* Messages */}
        {messages.length > 0 && (
          <div className={styles.messagesContainer}>
            {messages.map((message) => (
              <div
                key={message.id}
                className={
                  message.role === 'user'
                    ? styles.messageUser
                    : styles.messageAssistant
                }
              >
                <div
                  className={
                    message.role === 'user'
                      ? styles.messageContentUser
                      : styles.messageContentAssistant
                  }
                >
                  {message.content}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Query Input */}
        <div className={messages.length > 0 ? styles.queryInputContainerWithHistory : styles.queryInputContainer}>
          <form onSubmit={handleSubmit} className={styles.inputContainer}>
            <textarea
              ref={textareaRef}
              className={styles.inputField}
              placeholder="Type query here"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <button
              type="submit"
              className={styles.sendButton}
              aria-label="Send message"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
          </form>

          {/* Buttons */}
          <div className={styles.buttonGroup}>
            {['Budget Mode', 'Date Picker', 'Special Events'].map((text, i) => (
              <button key={i} className={styles.buttonCommon}>
                {text}
              </button>
            ))}
          </div>

          {/* Google Maps Container */}
          <div ref={mapRef} className={styles.mapContainer}></div>
        </div>
      </main>
    </div>
  );
}
