'use client';

import { useState } from 'react';
import styles from './ChatWindow.module.css';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

export default function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      content: input,
      role: 'user',
      timestamp: new Date(),
    };

    setMessages([...messages, newMessage]);
    setInput('');
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
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div className={styles.sidebarHeader__icon} />
          <span className={styles.sidebarHeader__title}>Itinerary.ai</span>
        </div>

        <button className={styles.newTripButton}>New Trip</button>

        <div>
          <h3 className={styles.historyHeading}>History</h3>
          <ul className={styles.historyList}>
            <li className={styles.historyItem}>Italy 1/23–1/31</li>
            <li className={styles.historyItem}>Tahoe 3/14–3/17</li>
            <li className={styles.historyItem}>Random shit</li>
            <li className={styles.historyItemSelected}>Selected trip</li>
          </ul>
        </div>
      </aside>

      {/* Main Content */}
      <main className={styles.mainContent}>
        <h1 className={styles.mainHeading}>
          How can I help plan your trip today?
        </h1>

        {/* Query Input */}
        <div className={styles.queryInputContainer}>
          <div className={styles.inputContainer}>
            <input
              className={styles.inputField}
              placeholder="Type query here"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button
              onClick={handleSubmit}
              className={styles.sendButton}
            >
              →
            </button>
          </div>

          {/* Buttons */}
          <div className={styles.buttonGroup}>
            {['Button 1', 'Button 2', 'Button 3'].map((text, i) => (
              <button key={i} className={styles.buttonCommon}>
                {text}
              </button>
            ))}
          </div>

          {/* Messages */}
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
        </div>
      </main>
    </div>
  );
}
