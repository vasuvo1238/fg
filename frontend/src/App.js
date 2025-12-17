import { useState, useEffect, useRef } from "react";
import "@/App.css";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, Send, Sparkles, TrendingUp, DollarSign, PieChart, BarChart3, MessageCircle, Microscope, Wallet, Shield, Activity, Target, LogOut, User, Settings, Bot, Search, Bell, ChevronDown, Moon, Sun, Menu, Globe, Zap } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import StockPrediction from "@/components/StockPrediction";
import EnhancedOptionsBuilder from "@/components/EnhancedOptionsBuilder";
import AdvancedAnalytics from "@/components/AdvancedAnalytics";
import PortfolioManager from "@/components/PortfolioManager";
import RiskAnalysis from "@/components/RiskAnalysis";
import TechnicalAnalysis from "@/components/TechnicalAnalysis";
import IndianMarkets from "@/components/IndianMarkets";
import PredictionMarkets from "@/components/PredictionMarkets";
import CryptoAnalysis from "@/components/CryptoAnalysis";
import TradingBot from "@/components/TradingBot";
import Subscription from "@/components/Subscription";
import NotificationBell from "@/components/NotificationBell";
import NotificationSettings from "@/components/NotificationSettings";
import { API } from "@/lib/api";

function App() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [activeView, setActiveView] = useState("dashboard");
  const [user, setUser] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMinimized, setChatMinimized] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const userMenuRef = useRef(null);

  useEffect(() => {
    // Generate session ID on mount
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(newSessionId);
    
    // Fetch user data
    fetchUser();
  }, []);
  
  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, { withCredentials: true });
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
    }
  };
  
  const handleLogout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      navigate('/login');
    }
  };

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
    <div className="App min-h-screen bg-[#0F172A]">
      {/* Main Container */}
      <div className="relative min-h-screen pb-32">
        {/* Professional Trading Header - Sticky */}
        <header className="glass-header sticky top-0 z-50">
          {/* Top Bar with Ticker */}
          <div className="border-b border-slate-700/50 bg-slate-900/50">
            <div className="max-w-[1800px] mx-auto px-4">
              <div className="flex items-center justify-between h-8 text-xs">
                {/* Market Status */}
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full pulse-live" />
                    <span className="text-slate-400">Markets Open</span>
                  </span>
                  <span className="text-slate-500">|</span>
                  <span className="text-slate-400">
                    {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}
                  </span>
                </div>
                
                {/* Quick Ticker */}
                <div className="flex items-center gap-6 font-mono">
                  <span className="flex items-center gap-2">
                    <span className="text-slate-400">S&P 500</span>
                    <span className="text-emerald-400">+0.45%</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-slate-400">BTC</span>
                    <span className="text-emerald-400">$104,250</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-slate-400">ETH</span>
                    <span className="text-red-400">-1.2%</span>
                  </span>
                </div>
                
                {/* Trust Elements */}
                <div className="flex items-center gap-3">
                  <span className="trust-badge">
                    <Shield className="w-3 h-3" />
                    256-bit SSL
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Main Navigation */}
          <div className="max-w-[1800px] mx-auto px-4 py-2">
            <div className="flex items-center justify-between">
              {/* Logo - Left */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-blue-600">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-white">MarketMorning</h1>
                    <p className="text-[10px] text-slate-500 -mt-0.5">Pro Trading Platform</p>
                  </div>
                </div>
              </div>
              
              {/* Center Navigation */}
              <nav className="flex items-center gap-1 bg-slate-800/50 p-1 rounded-lg border border-slate-700/50">
              
                {/* Main Nav Items */}
                {[
                  { id: 'dashboard', icon: BarChart3, label: 'Dashboard' },
                  { id: 'stocks', icon: TrendingUp, label: 'Markets' },
                  { id: 'options', icon: TrendingUp, label: 'Options' },
                  { id: 'analytics', icon: Microscope, label: 'Analytics' },
                  { id: 'portfolio', icon: Wallet, label: 'Portfolio' },
                  { id: 'risk', icon: Shield, label: 'Risk' },
                  { id: 'technical', icon: Activity, label: 'Technical' },
                ].map(item => (
                  <Button
                    key={item.id}
                    data-testid={`${item.id}-view-btn`}
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveView(item.id)}
                    className={`gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                      activeView === item.id 
                        ? "bg-blue-600/20 text-blue-400" 
                        : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Button>
                ))}
                
                {/* Divider */}
                <div className="w-px h-6 bg-slate-700 mx-1" />
                
                {/* Special Markets */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveView("indian")}
                  className={`gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                    activeView === "indian" 
                      ? "bg-orange-500/20 text-orange-400" 
                      : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  India
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveView("prediction")}
                  className={`gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                    activeView === "prediction" 
                      ? "bg-purple-500/20 text-purple-400" 
                      : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                  }`}
                >
                  <Target className="w-4 h-4" />
                  Prediction
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveView("crypto")}
                  className={`gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                    activeView === "crypto" 
                      ? "bg-purple-500/20 text-purple-400" 
                      : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                  }`}
                >
                  <DollarSign className="w-4 h-4" />
                  Crypto
                </Button>
                
                {/* Bot - Featured */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveView("tradingbot")}
                  className={`gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all relative ${
                    activeView === "tradingbot" 
                      ? "bg-emerald-500/20 text-emerald-400" 
                      : "text-emerald-400 hover:bg-emerald-500/10"
                  }`}
                >
                  <Bot className="w-4 h-4" />
                  AI Bot
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full pulse-live" />
                </Button>
              </nav>
              
              {/* Right Section - User Actions */}
              <div className="flex items-center gap-3">
                {/* Search */}
                <div className="relative hidden lg:block">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search markets..."
                    className="w-48 h-9 pl-9 pr-4 text-sm bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all"
                  />
                </div>
                
                {/* Notifications */}
                <NotificationBell />
                
                {/* Deposit CTA */}
                <Button
                  onClick={() => setActiveView('subscription')}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 shadow-lg shadow-blue-600/20 hidden sm:flex"
                >
                  <Zap className="w-4 h-4 mr-1.5" />
                  Upgrade
                </Button>
                
                {/* User Menu */}
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-700/50 transition-all duration-200"
                  >
                    {user?.picture ? (
                      <img src={user.picture} alt="" className="w-8 h-8 rounded-lg" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center">
                        <User className="w-4 h-4 text-slate-400" />
                      </div>
                    )}
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </button>
                  
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-dropdown overflow-hidden z-50 animate-slide-down">
                      {/* User Info Header */}
                      <div className="p-4 border-b border-slate-700">
                        <div className="flex items-center gap-3">
                          {user?.picture ? (
                            <img src={user.picture} alt="" className="w-10 h-10 rounded-lg" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
                              <User className="w-5 h-5 text-slate-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-white truncate">{user?.name || 'User'}</p>
                            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                          </div>
                        </div>
                        <div className="mt-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md ${
                            user?.subscription_tier === 'pro' 
                              ? 'bg-purple-500/15 text-purple-400 border border-purple-500/20' 
                              : user?.subscription_tier === 'basic' 
                              ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20' 
                              : 'bg-slate-700 text-slate-400'
                          }`}>
                            {user?.subscription_tier === 'pro' ? '⚡ PRO' : user?.subscription_tier === 'basic' ? '✨ BASIC' : 'FREE TIER'}
                          </span>
                        </div>
                      </div>
                      {/* Menu Items */}
                      <div className="py-2">
                        <button 
                          onClick={() => { setActiveView('subscription'); setShowUserMenu(false); }}
                          className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-slate-700/50 transition-colors"
                        >
                          <Sparkles className="w-4 h-4 text-purple-400" />
                          <span className="text-slate-300">Upgrade Plan</span>
                        </button>
                        <button 
                          onClick={() => { setActiveView('settings'); setShowUserMenu(false); }}
                          className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-slate-700/50 transition-colors"
                        >
                          <Settings className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-300">Settings</span>
                        </button>
                      </div>
                      
                      {/* Logout */}
                      <div className="py-2 border-t border-slate-700">
                        <button 
                          onClick={handleLogout}
                          className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-slate-700/50 transition-colors"
                        >
                          <LogOut className="w-4 h-4 text-red-400" />
                          <span className="text-red-400">Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="max-w-7xl mx-auto px-6 pt-8 pb-4">
          {activeView === "settings" ? (
            <NotificationSettings />
          ) : activeView === "subscription" ? (
            <Subscription />
          ) : activeView === "stocks" ? (
            <StockPrediction sessionId={sessionId} />
          ) : activeView === "options" ? (
            <EnhancedOptionsBuilder />
          ) : activeView === "analytics" ? (
            <AdvancedAnalytics />
          ) : activeView === "portfolio" ? (
            <PortfolioManager />
          ) : activeView === "risk" ? (
            <RiskAnalysis />
          ) : activeView === "technical" ? (
            <TechnicalAnalysis />
          ) : activeView === "indian" ? (
            <IndianMarkets />
          ) : activeView === "prediction" ? (
            <PredictionMarkets />
          ) : activeView === "crypto" ? (
            <CryptoAnalysis />
          ) : activeView === "tradingbot" ? (
            <TradingBot />
          ) : (
            <Dashboard onOpenChat={() => { setChatOpen(true); setChatMinimized(false); }} />
          )}
        </div>
      </div>

      {/* Floating AI Chat */}
      {chatOpen ? (
        <FloatingChat 
          isOpen={chatOpen}
          onClose={() => setChatOpen(false)}
          onMinimize={() => setChatMinimized(!chatMinimized)}
          isMinimized={chatMinimized}
        />
      ) : (
        <FloatingChatButton 
          onClick={() => { setChatOpen(true); setChatMinimized(false); }}
          hasMessages={false}
        />
      )}

      {/* Global Footer Disclaimer */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[90%] max-w-4xl z-10 pointer-events-none">
        <div className="p-3 bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-lg shadow-2xl">
          <p className="text-center text-xs text-slate-400">
            ⚠️ <strong>Disclaimer:</strong> For educational purposes only. Not financial advice. 
            Consult a licensed financial advisor before making investment decisions.
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;