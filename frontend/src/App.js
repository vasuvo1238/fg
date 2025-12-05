import { useState, useEffect, useRef } from "react";
import "@/App.css";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Send, Sparkles, TrendingUp, DollarSign, PieChart, BarChart3, MessageCircle, Microscope, Wallet, Shield } from "lucide-react";
import { toast } from "sonner";
import StockPrediction from "@/components/StockPrediction";
import EnhancedOptionsBuilder from "@/components/EnhancedOptionsBuilder";
import AdvancedAnalytics from "@/components/AdvancedAnalytics";
import PortfolioManager from "@/components/PortfolioManager";
import RiskAnalysis from "@/components/RiskAnalysis";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [activeView, setActiveView] = useState("chat"); // "chat", "stocks", "options", "analytics", "portfolio"
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    // Generate session ID on mount
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(newSessionId);
  }, []);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const exampleQuestions = [
    {
      icon: TrendingUp,
      text: "What's the difference between stocks and bonds?",
      gradient: "from-emerald-500 to-teal-600"
    },
    {
      icon: DollarSign,
      text: "How should I start building an investment portfolio?",
      gradient: "from-amber-500 to-orange-600"
    },
    {
      icon: PieChart,
      text: "What is diversification and why is it important?",
      gradient: "from-blue-500 to-indigo-600"
    }
  ];

  const handleSendMessage = async (messageText = inputValue) => {
    if (!messageText.trim() || !sessionId) return;

    const userMessage = {
      id: Date.now(),
      role: "user",
      content: messageText,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);
    setShowWelcome(false);

    try {
      const response = await axios.post(`${API}/chat`, {
        message: messageText,
        session_id: sessionId
      });

      const assistantMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content: response.data.message,
        timestamp: new Date().toISOString(),
        is_guardrail_triggered: response.data.is_guardrail_triggered
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (response.data.is_guardrail_triggered) {
        toast.warning("Topic Not Supported", {
          description: "Please ask finance-related questions only."
        });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message", {
        description: "Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExampleClick = (question) => {
    setInputValue(question);
    handleSendMessage(question);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="App min-h-screen">
      {/* Main Container */}
      <div className="relative min-h-screen pb-32">
        {/* Header */}
        <div className="header-glass sticky top-0 z-10 backdrop-blur-xl bg-background/80 border-b border-border/50">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="icon-glow">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold" style={{ fontFamily: 'Fraunces, serif' }}>Financial Advisor</h1>
                  <p className="text-xs text-muted-foreground" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Your trusted finance buddy with AI predictions</p>
                </div>
              </div>
              
              {/* View Switcher */}
              <div className="flex items-center gap-2 bg-secondary p-1 rounded-lg">
                <Button
                  data-testid="chat-view-btn"
                  variant={activeView === "chat" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveView("chat")}
                  className="gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  Chat
                </Button>
                <Button
                  data-testid="stocks-view-btn"
                  variant={activeView === "stocks" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveView("stocks")}
                  className="gap-2"
                >
                  <BarChart3 className="w-4 h-4" />
                  Stocks
                </Button>
                <Button
                  data-testid="options-view-btn"
                  variant={activeView === "options" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveView("options")}
                  className="gap-2"
                >
                  <TrendingUp className="w-4 h-4" />
                  Options
                </Button>
                <Button
                  data-testid="analytics-view-btn"
                  variant={activeView === "analytics" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveView("analytics")}
                  className="gap-2"
                >
                  <Microscope className="w-4 h-4" />
                  Analytics
                </Button>
                <Button
                  data-testid="portfolio-view-btn"
                  variant={activeView === "portfolio" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveView("portfolio")}
                  className="gap-2"
                >
                  <Wallet className="w-4 h-4" />
                  Portfolio
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="max-w-6xl mx-auto px-6 pt-8 pb-4">
          {activeView === "stocks" ? (
            <StockPrediction sessionId={sessionId} />
          ) : activeView === "options" ? (
            <EnhancedOptionsBuilder />
          ) : activeView === "analytics" ? (
            <AdvancedAnalytics />
          ) : activeView === "portfolio" ? (
            <PortfolioManager />
          ) : (
            <div>
          {showWelcome && messages.length === 0 && (
            <div className="welcome-section mb-12">
              <div className="text-center mb-12">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6 icon-glow">
                  <Sparkles className="w-10 h-10 text-primary" />
                </div>
                <h2 className="text-4xl font-light mb-4" style={{ fontFamily: 'Fraunces, serif', letterSpacing: '-0.02em' }}>
                  Welcome to Your
                  <span className="block font-black">Financial Advisor</span>
                </h2>
                <p className="text-muted-foreground max-w-xl mx-auto" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Ask me anything about finance, investing, budgeting, or economics. 
                  I'm here to provide professional guidance with a personal touch.
                </p>
                
                {/* Disclaimer Badge */}
                <div className="mt-6 max-w-2xl mx-auto">
                  <div className="flex items-center justify-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    <p className="text-xs text-amber-900">
                      <strong>Educational Purpose Only:</strong> This platform is for learning and research. 
                      Not financial advice. Consult a licensed advisor before investing.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {exampleQuestions.map((q, idx) => {
                  const IconComponent = q.icon;
                  return (
                    <button
                      key={idx}
                      data-testid={`example-question-${idx}`}
                      onClick={() => handleExampleClick(q.text)}
                      className="example-card group text-left p-6 rounded-xl bg-secondary/50 border border-border/50 hover:border-primary/50 hover:bg-secondary transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                    >
                      <div className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${q.gradient} mb-4`}>
                        <IconComponent className="w-5 h-5 text-white" />
                      </div>
                      <p className="text-sm leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>{q.text}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Messages */}
          <div ref={scrollRef} className="messages-area space-y-6">
            {messages.map((msg) => (
              <div
                key={msg.id}
                data-testid={`message-${msg.role}`}
                className={`message-wrapper flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'user' ? (
                  <div className="user-message max-w-[80%] p-4 rounded-2xl rounded-tr-sm bg-primary text-primary-foreground shadow-lg">
                    <p className="text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>{msg.content}</p>
                  </div>
                ) : (
                  <div className={`bot-message max-w-[85%] p-6 rounded-2xl rounded-tl-sm bg-secondary/80 border shadow-lg ${
                    msg.is_guardrail_triggered ? 'border-warning/50 guardrail-border' : 'border-border/30'
                  }`}>
                    {msg.is_guardrail_triggered && (
                      <div className="flex items-center gap-2 mb-3 text-warning" data-testid="guardrail-warning">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-xs uppercase tracking-widest" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Topic Restriction</span>
                      </div>
                    )}
                    <div className="prose prose-sm max-w-none" style={{ fontFamily: 'Inter, sans-serif' }}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="message-wrapper flex justify-start" data-testid="typing-indicator">
                <div className="bot-message max-w-[85%] p-6 rounded-2xl rounded-tl-sm bg-secondary/80 border border-border/30">
                  <div className="typing-indicator flex items-center gap-2">
                    <div className="dot"></div>
                    <div className="dot"></div>
                    <div className="dot"></div>
                  </div>
                </div>
              </div>
            )}
          </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Input Bar - Only show in chat view */}
      {activeView === "chat" && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-3xl z-20">
        <div className="input-command-bar backdrop-blur-xl bg-background/90 border border-border/50 rounded-full shadow-2xl p-2">
          <div className="flex items-center gap-2">
            <Input
              ref={inputRef}
              data-testid="chat-input"
              type="text"
              placeholder="Ask me anything about finance..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
              style={{ fontFamily: 'Inter, sans-serif' }}
            />
            <Button
              data-testid="send-button"
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim() || isLoading}
              size="icon"
              className="rounded-full h-10 w-10 bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-3" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          Always consult a licensed advisor for personalized financial advice
        </p>
        </div>
      )}

      {/* Global Footer Disclaimer - Shows on all views */}
      {activeView !== "chat" && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[90%] max-w-4xl z-10">
          <div className="p-3 bg-gray-900/95 backdrop-blur-xl border border-gray-700 rounded-lg shadow-2xl">
            <p className="text-center text-xs text-gray-300" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              ⚠️ <strong>Disclaimer:</strong> For educational purposes only. Not financial advice. 
              Consult a licensed financial advisor before making any investment decisions.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;