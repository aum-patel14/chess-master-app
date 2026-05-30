import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../hooks/useSocket';
import { Send, EyeOff, Eye } from 'lucide-react';

const PRESETS = ["Good luck!", "Nice move!", "Good game!", "Thanks!", "Oops!", "Well played!"];

export default function ChatPanel({ roomCode }) {
  const socket = useSocket();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isBlocked, setIsBlocked] = useState(false);
  const scrollRef = useRef(null);

  // Auto scroll to latest chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Setup socket listener for messages
  useEffect(() => {
    if (!socket) return;

    const handleMessageReceived = (msg) => {
      setMessages(prev => [...prev, msg]);
    };

    socket.on('chat-message-received', handleMessageReceived);

    return () => {
      socket.off('chat-message-received', handleMessageReceived);
    };
  }, [socket]);

  const sendMessage = (text) => {
    if (!socket || !text.trim()) return;
    socket.emit('chat-message', {
      text: text.trim(),
      senderName: localStorage.getItem('chess_display_name') || 'You'
    });
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText) return;
    sendMessage(inputText);
    setInputText('');
  };

  return (
    <div style={chatWrapper}>
      <div style={chatHeader}>
        <span style={{ fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Chat Lobbies</span>
        <button 
          style={{ ...blockBtn, color: isBlocked ? '#ef4444' : 'var(--text-muted)' }} 
          onClick={() => setIsBlocked(b => !b)}
          title={isBlocked ? "Unmute opponent" : "Block/Mute opponent"}
        >
          {isBlocked ? <EyeOff size={16} /> : <Eye size={16} />}
          {isBlocked ? 'Muted' : 'Mute'}
        </button>
      </div>

      <div style={msgScroll} ref={scrollRef}>
        {messages.length === 0 ? (
          <div style={emptyMsg}>No messages. Say hello!</div>
        ) : (
          messages.map(msg => {
            const isMe = msg.senderSocket === socket?.id;
            // Hide opponent's message if they are muted
            if (!isMe && isBlocked) return null;

            return (
              <div key={msg.id} style={{ ...msgRow, justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  ...msgBubble,
                  background: isMe ? 'rgba(212,175,55,0.15)' : 'var(--bg-hover)',
                  border: isMe ? '1px solid rgba(212,175,55,0.3)' : '1px solid var(--border)',
                  borderBottomRightRadius: isMe ? '2px' : '8px',
                  borderBottomLeftRadius: !isMe ? '2px' : '8px'
                }}>
                  <div style={msgSender}>{msg.senderName}</div>
                  <div style={msgText}>{msg.text}</div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Preset greetings */}
      <div style={presetsContainer}>
        {PRESETS.map(p => (
          <button key={p} style={presetChip} onClick={() => sendMessage(p)}>
            {p}
          </button>
        ))}
      </div>

      <form onSubmit={handleSend} style={inputForm}>
        <input
          type="text"
          placeholder="Send a message..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          style={chatInput}
        />
        <button type="submit" style={btnSubmit}>
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}

// Styling elements
const chatWrapper = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  display: 'flex',
  flexDirection: 'column',
  height: '240px',
  overflow: 'hidden',
  boxSizing: 'border-box'
};

const chatHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '10px 12px',
  borderBottom: '1px solid var(--border)',
  background: 'var(--bg-input)'
};

const blockBtn = {
  background: 'transparent',
  border: 'none',
  fontSize: '11px',
  fontWeight: 700,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  transition: 'color 0.15s'
};

const msgScroll = {
  flex: 1,
  padding: '12px',
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px'
};

const emptyMsg = {
  color: 'var(--text-muted)',
  fontSize: '12px',
  textAlign: 'center',
  marginTop: '20px',
  fontStyle: 'italic'
};

const msgRow = {
  display: 'flex',
  width: '100%'
};

const msgBubble = {
  padding: '6px 10px',
  borderRadius: '8px',
  maxWidth: '80%',
  boxSizing: 'border-box'
};

const msgSender = {
  fontSize: '10px',
  fontWeight: 800,
  color: 'var(--gold)',
  marginBottom: '2px',
  opacity: 0.8
};

const msgText = {
  fontSize: '12.5px',
  color: 'var(--text-primary)',
  wordBreak: 'break-word',
  lineHeight: 1.3
};

const presetsContainer = {
  display: 'flex',
  gap: '4px',
  padding: '4px 8px',
  overflowX: 'auto',
  borderTop: '1px solid var(--border)',
  background: 'var(--bg-input)',
  whiteSpace: 'nowrap'
};

const presetChip = {
  display: 'inline-block',
  padding: '4px 8px',
  borderRadius: '12px',
  border: '1px solid var(--border)',
  background: 'var(--bg-hover)',
  color: 'var(--text-secondary)',
  fontSize: '10.5px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.1s'
};

const inputForm = {
  display: 'flex',
  borderTop: '1px solid var(--border)',
  background: 'var(--bg-input)'
};

const chatInput = {
  flex: 1,
  border: 'none',
  background: 'transparent',
  color: 'var(--text-primary)',
  padding: '10px 12px',
  fontSize: '13px',
  outline: 'none'
};

const btnSubmit = {
  background: 'transparent',
  border: 'none',
  color: 'var(--gold)',
  cursor: 'pointer',
  padding: '0 16px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};
