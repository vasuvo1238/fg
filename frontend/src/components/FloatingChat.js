import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { 
  MessageCircle, X, Send, Minimize2, Maximize2, 
  Bot, User, Sparkles, TrendingUp, Wallet, HelpCircle
} from 'lucide-react';
import { API } from '@/lib/api';

export default function FloatingChat({ isOpen, onClose, onMinimize, isMinimized }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm your AI trading assistant. I can help you analyze markets, understand trading strategies, and answer financial questions. What would you like to know?"
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(`chat_${Date.now()}`);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const quickActions = [
    { icon: TrendingUp, label: 'Analyze BTC', prompt: 'Give me a quick analysis of Bitcoin price action today' },
    { icon: Wallet, label: 'Portfolio tips', prompt: 'What are some tips for diversifying my portfolio?' },
    { icon: HelpCircle, label: 'Explain options', prompt: 'Can you explain what stock options are in simple terms?' },
  ];

  const handleSend = async (customMessage) => {
    const message = customMessage || inputValue.trim();
    if (!message || isLoading) return;

    setInputValue('');
    setMessages(prev => [...prev, { role: 'user', content: message }]);
    setIsLoading(true);

    try {
      const response = await axios.post(
        `${API}/chat`,
        { message, session_id: sessionId },
        { withCredentials: true }
      );

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response.data.response || "I apologize, but I couldn't process that request. Please try again."
      }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I'm having trouble connecting right now. Please try again in a moment."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={onMinimize}
          className="flex items-center gap-3 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl shadow-lg shadow-blue-600/30 transition-all hover:scale-105"
        >
          <Bot className="w-5 h-5" />
          <span className="font-medium">AI Assistant</span>
          {messages.length > 1 && (
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 h-[600px] flex flex-col bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">AI Trading Assistant</h3>
            <p className="text-xs text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
              Online
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={onMinimize}
            className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <Minimize2 className="w-4 h-4 text-slate-400" />
          </button>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {messages.map((msg, i) => (
          <div 
            key={i}
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
              msg.role === 'user' ? 'bg-blue-600' : 'bg-slate-700'
            }`}>
              {msg.role === 'user' ? (
                <User className="w-4 h-4 text-white" />
              ) : (
                <Bot className="w-4 h-4 text-blue-400" />
              )}
            </div>
            <div className={`max-w-[80%] p-3 rounded-2xl ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-sm' 
                : 'bg-slate-800 text-slate-200 rounded-tl-sm'
            }`}>
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center">
              <Bot className="w-4 h-4 text-blue-400" />
            </div>
            <div className="bg-slate-800 p-3 rounded-2xl rounded-tl-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {messages.length <= 2 && (
        <div className="px-4 pb-2">
          <p className="text-xs text-slate-500 mb-2">Quick actions:</p>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action, i) => (
              <button
                key={i}
                onClick={() => handleSend(action.prompt)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-full transition-colors"
              >
                <action.icon className="w-3 h-3" />
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-slate-700 bg-slate-800/50">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about markets, strategies..."
            className="flex-1 bg-slate-800 border-slate-700 text-white placeholder-slate-500 rounded-xl"
            disabled={isLoading}
          />
          <Button 
            onClick={() => handleSend()}
            disabled={!inputValue.trim() || isLoading}
            className="bg-blue-600 hover:bg-blue-500 rounded-xl px-4"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Floating Button Component
export function FloatingChatButton({ onClick, hasMessages }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-50 p-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl shadow-lg shadow-blue-600/30 transition-all hover:scale-105 group"
    >
      <MessageCircle className="w-6 h-6" />
      <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-900" />
      
      {/* Tooltip */}
      <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-800 text-white text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        AI Assistant
      </span>
    </button>
  );
}
