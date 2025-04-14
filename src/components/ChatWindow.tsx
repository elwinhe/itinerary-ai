/* ChatWindow.tsx */

'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import styles from './ChatWindow.module.css';
import ResponseMessage from './ResponseMessage';


interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  namespace?: string; 
}

interface ChatHistory {
  id: string;
  title: string;
  date: string;
  messages: Message[];
}

interface TravelFilters {
  destination?: string;
  budget?: string;
  activities?: string[];
  accessibility?: {
    wheelchair?: boolean;
    brailleSignage?: boolean;
    audioDescriptions?: boolean;
    quietSpaces?: boolean;
  };
  familyFeatures?: {
    kidZones?: boolean;
    strollerAccess?: boolean;
    familyRooms?: boolean;
    childCare?: boolean;
  };
  sustainability?: {
    ecoCertified?: boolean;
    renewableEnergy?: boolean;
    waterConservation?: boolean;
    localSourcing?: boolean;
  };
  season?: string;
  peakSeasons?: string[];
  language?: string;
  minRating?: number;
  sentiment?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  maxDistance?: number;
}

export default function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [currentDestination, setCurrentDestination] = useState<string | null>(null);
  const [selectedBudget, setSelectedBudget] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  useEffect(() => {
    const storedMessages = localStorage.getItem('chatMessages');
    if (storedMessages) {
      setMessages(JSON.parse(storedMessages));
    }
  
    const storedHistory = localStorage.getItem('chatHistory');
    if (storedHistory) {
      setChatHistory(JSON.parse(storedHistory));
    }
  }, []); 
  useEffect(() => {
    if (currentChatId) {
      localStorage.setItem('chatMessages', JSON.stringify(messages));
    }
  }, [messages, currentChatId]);
  
  useEffect(() => {
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
  }, [chatHistory]);
  

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const newMessage: Message = {
      id: crypto.randomUUID(),
      content: inputValue,
      role: 'user',
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    
    if (messages.length === 0) {
      const newChatId = crypto.randomUUID();
      const newChatHistory: ChatHistory = {
        id: newChatId,
        title: inputValue.length > 20 ? inputValue.substring(0, 20) + '...' : inputValue,
        date: new Date().toLocaleDateString(),
        messages: updatedMessages,
      };
      setChatHistory([newChatHistory, ...chatHistory]);
      setCurrentChatId(newChatId);
    } else if (currentChatId) {
      setChatHistory(chatHistory.map(chat => 
        chat.id === currentChatId 
          ? { ...chat, messages: updatedMessages } 
          : chat
      ));
    }
    
    setInputValue('');

    handleSendMessage(inputValue);
  };

  const handleNewTrip = () => {
    setMessages([]);
    setInputValue('');
    setCurrentChatId(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleHistoryItemClick = (chatId: string) => {
    const selectedChat = chatHistory.find(chat => chat.id === chatId);
    if (selectedChat) {
      setMessages([...selectedChat.messages]);
      setCurrentChatId(chatId);
    }
  };

  async function handleSendMessage(userMessage: string) {
    const loadingMessage: Message = {
      id: crypto.randomUUID(),
      content: "...",
      role: 'assistant',
      timestamp: new Date(),
    };

    try {
      setMessages(prevMessages => [...prevMessages, loadingMessage]);

      // Extract destination from user message if not explicitly set
      let destination = currentDestination;
      if (!destination) {
        // Simple extraction - in a real app, you'd use NLP or a more sophisticated approach
        const destinations = ['kyoto', 'paris', 'bali'];
        for (const dest of destinations) {
          if (userMessage.toLowerCase().includes(dest)) {
            destination = dest;
            break;
          }
        }
      }

      // Extract filters from user message
      const filters: TravelFilters = {};
      
      // Set destination if found
      if (destination) {
        filters.destination = destination;
      }
      
      // Add budget filter if selected
      if (selectedBudget) {
        filters.budget = selectedBudget;
      }
      
      // Extract accessibility filters
      if (userMessage.toLowerCase().includes('wheelchair') || 
          userMessage.toLowerCase().includes('accessible')) {
        filters.accessibility = {
          wheelchair: true
        };
      }
      
      // Extract family-friendly filters
      if (userMessage.toLowerCase().includes('family') || 
          userMessage.toLowerCase().includes('kid') || 
          userMessage.toLowerCase().includes('children')) {
        filters.familyFeatures = {
          kidZones: true,
          strollerAccess: true
        };
      }
      
      // Extract sustainability filters
      if (userMessage.toLowerCase().includes('eco') || 
          userMessage.toLowerCase().includes('sustainable') || 
          userMessage.toLowerCase().includes('green')) {
        filters.sustainability = {
          ecoCertified: true
        };
      }
      
      // Extract season filters
      const seasons = ['spring', 'summer', 'fall', 'winter', 'autumn'];
      for (const season of seasons) {
        if (userMessage.toLowerCase().includes(season)) {
          filters.season = season;
          break;
        }
      }
      
      // Extract language filters
      const languages = ['english', 'french', 'spanish', 'japanese', 'chinese'];
      for (const lang of languages) {
        if (userMessage.toLowerCase().includes(lang)) {
          filters.language = lang;
          break;
        }
      }
      
      // Extract rating filters
      const ratingMatch = userMessage.match(/(\d+(\.\d+)?)\s*\+?\s*stars?/i);
      if (ratingMatch) {
        filters.minRating = parseFloat(ratingMatch[1]);
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMessage,
          chatHistory: messages,
          destination,
          filters
        }),
      });
      
      if (!res.ok) {
        throw new Error('Failed to get response from API');
      }
      
      const data = await res.json();
      
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        content: data.response,
        role: 'assistant',
        timestamp: new Date(),
        namespace: data.namespace
      };

      setMessages(prev => {
        const updatedMessages = [...prev.filter(msg => msg.id !== loadingMessage.id), assistantMessage];
        
        if (currentChatId) {
          setChatHistory(prevHistory => 
            prevHistory.map(chat => 
              chat.id === currentChatId 
                ? { ...chat, messages: updatedMessages }
                : chat
            )
          );
        }
        return updatedMessages;
      });    
    } catch (error) {
      console.error('Error sending message:', error);
      
      setMessages(prevMessages => {
        const filteredMessages = prevMessages.filter(msg => msg.id !== loadingMessage.id);
        const errorMessage: Message = {
          id: crypto.randomUUID(),
          content: "Sorry, I couldn't process your request. Please try again.",
          role: 'assistant',
          timestamp: new Date(),
        };
        
        const updatedMessages = [...filteredMessages, errorMessage];
        
        if (currentChatId) {
          setChatHistory(prevHistory => 
            prevHistory.map(chat => 
              chat.id === currentChatId 
                ? { ...chat, messages: updatedMessages }
                : chat
            )
          );
        }
        
        return updatedMessages;
      });
    }
  }

  const handleBudgetSelect = (budget: string) => {
    // If the same budget is selected again, deselect it
    if (selectedBudget === budget) {
      setSelectedBudget(null);
    } else {
      setSelectedBudget(budget);
    }
  };

  return (
    <div className={styles.container}>
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
                key={`${message.id}-${currentChatId}`}
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
                  {message.role === 'assistant' ? (
                    <ResponseMessage 
                      content={message.content} 
                      namespace={message.namespace}
                    />
                  ) : (
                    message.content
                  )}
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
              placeholder="What's on your mind?"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
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
            {[
              { text: 'Affordable Adventures', value: 'budget' },
              { text: 'Getaway Gems (mid-range)', value: 'mid-range' },
              { text: 'Exclusive Excursions', value: 'luxury' }
            ].map((button, i) => (
              <button 
                key={i} 
                className={`${styles.buttonCommon} ${selectedBudget === button.value ? styles.buttonActive : ''}`}
                onClick={() => handleBudgetSelect(button.value)}
              >
                {button.text}
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
