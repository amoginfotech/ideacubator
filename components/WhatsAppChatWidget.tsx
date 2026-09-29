'use client';

import { useState } from 'react';

const WHATSAPP_NUMBER = '917676333817';

export default function WhatsAppChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');

  const quickPrompts = [
    '💡 I want to discuss a new startup idea',
    '📅 Request a technical diligence session',
    '🤝 Question about venture studio model',
    '⚡ Need technical co-building for MVP'
  ];

  const handleSend = (textToSend?: string) => {
    const text = textToSend || message.trim();
    if (!text) return;
    const encoded = encodeURIComponent(text);
    const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    setMessage('');
    setIsOpen(false);
  };

  return (
    <div className="wa-floating-widget" aria-label="Ideacubator Concierge Desk">
      {/* Expanded Chat Popup Window */}
      {isOpen && (
        <div className="wa-chat-window animate-fade-in" role="dialog" aria-modal="true">
          <div className="wa-chat-header">
            <div className="wa-header-left">
              <div className="wa-avatar-wrap">
                <span className="wa-status-dot"></span>
                <span className="wa-avatar">IC</span>
              </div>
              <div>
                <strong className="wa-header-title">Ideacubator Desk</strong>
                <span className="wa-header-sub">Direct WhatsApp · +91 7676333817</span>
              </div>
            </div>
            <button
              type="button"
              className="wa-close-btn"
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
            >
              ✕
            </button>
          </div>

          <div className="wa-chat-body">
            <div className="wa-chat-bubble-bot">
              <p>
                <strong>Welcome to Ideacubator.</strong>
                <br />
                Whether you’re validating a concept, preparing for capital, or need senior engineers to build your MVP, send us a quick note below to connect directly on WhatsApp with our team.
              </p>
              <span className="wa-time">🟢 Typically replies in &lt; 1 hr</span>
            </div>

            <div className="wa-chips-label">Quick topics:</div>
            <div className="wa-chips-grid">
              {quickPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="wa-chip"
                  onClick={() => handleSend(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <div className="wa-chat-footer">
            <input
              type="text"
              className="wa-input"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSend();
              }}
              placeholder="Type your message or idea question..."
            />
            <button
              type="button"
              className="wa-send-btn"
              onClick={() => handleSend()}
              aria-label="Send via WhatsApp"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Floating Trigger Button: Just clean circular green WhatsApp icon */}
      <button
        type="button"
        className={`wa-badge-btn ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label="Chat on WhatsApp"
        title="Chat on WhatsApp (+91 7676333817)"
      >
        <span className="wa-pulse-ring"></span>
        {isOpen ? (
          <span style={{ fontSize: '22px', lineHeight: 1, fontWeight: 'bold' }}>✕</span>
        ) : (
          <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm.01 1.67c4.54 0 8.24 3.7 8.24 8.24 0 2.2-.86 4.28-2.42 5.83a8.18 8.18 0 0 1-5.82 2.41c-1.45 0-2.88-.38-4.14-1.11l-.3-.17-3.12.82.83-3.04-.19-.31a8.17 8.17 0 0 1-1.25-4.43c0-4.54 3.7-8.24 8.25-8.24zm-3.53 4.14c-.19 0-.49.07-.75.35-.26.28-1 1-1 2.43 0 1.43 1.03 2.81 1.18 3 .15.19 2.01 3.14 4.93 4.36 2.42 1.01 2.92.81 3.44.76.52-.05 1.68-.69 1.92-1.36.24-.67.24-1.24.17-1.36-.07-.12-.26-.19-.55-.33-.28-.14-1.68-.83-1.94-.93-.26-.1-.45-.14-.64.14-.19.28-.73.93-.9 1.12-.17.19-.34.21-.63.07-.28-.14-1.2-.44-2.29-1.41-.85-.76-1.42-1.69-1.59-1.97-.17-.28-.02-.44.12-.58.13-.13.28-.34.42-.51.14-.17.19-.28.28-.47.1-.19.05-.35-.02-.49-.07-.14-.64-1.55-.88-2.12-.23-.56-.47-.48-.64-.49-.17-.01-.36-.01-.55-.01z"/>
          </svg>
        )}
      </button>
    </div>
  );
}
