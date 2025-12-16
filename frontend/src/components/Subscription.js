import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  CreditCard, Check, Sparkles, Zap, Shield, Bot, 
  BarChart3, Bell, Clock, RefreshCw, Crown
} from 'lucide-react';
import { toast } from 'sonner';
import { API } from '@/lib/api';

export default function Subscription() {
  const [tiers, setTiers] = useState({});
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processingTier, setProcessingTier] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [tiersRes, subRes] = await Promise.all([
        axios.get(`${API}/payments/tiers`, { withCredentials: true }),
        axios.get(`${API}/payments/subscription/status`, { withCredentials: true })
      ]);
      setTiers(tiersRes.data.tiers);
      setCurrentSubscription(subRes.data);
    } catch (error) {
      console.error('Failed to fetch subscription data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const checkPaymentStatus = useCallback(async () => {
    // Check if returning from Stripe
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    
    if (sessionId) {
      setLoading(true);
      toast.info('Verifying payment...');
      
      // Poll for payment status
      for (let i = 0; i < 5; i++) {
        try {
          const response = await axios.get(
            `${API}/payments/checkout/status/${sessionId}`,
            { withCredentials: true }
          );
          
          if (response.data.payment_status === 'paid') {
            toast.success('Payment successful! Welcome to ' + (response.data.tier === 'pro' ? 'Pro' : 'Basic') + '!');
            // Clear URL params
            window.history.replaceState({}, document.title, window.location.pathname);
            fetchData();
            return;
          }
          
          // Wait before next poll
          await new Promise(r => setTimeout(r, 2000));
        } catch (error) {
          console.error('Status check error:', error);
        }
      }
      
      toast.error('Could not verify payment. Please check your account.');
      setLoading(false);
    }
  }, [fetchData]);

  useEffect(() => {
    fetchData();
    checkPaymentStatus();
  }, [fetchData, checkPaymentStatus]);

  const fetchData = async () => {
    try {
      const [tiersRes, subRes] = await Promise.all([
        axios.get(`${API}/payments/tiers`, { withCredentials: true }),
        axios.get(`${API}/payments/subscription/status`, { withCredentials: true })
      ]);
      setTiers(tiersRes.data.tiers);
      setCurrentSubscription(subRes.data);
    } catch (error) {
      console.error('Failed to fetch subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async () => {
    // Check if returning from Stripe
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    
    if (sessionId) {
      setLoading(true);
      toast.info('Verifying payment...');
      
      // Poll for payment status
      for (let i = 0; i < 5; i++) {
        try {
          const response = await axios.get(
            `${API}/payments/checkout/status/${sessionId}`,
            { withCredentials: true }
          );
          
          if (response.data.payment_status === 'paid') {
            toast.success('Payment successful! Welcome to ' + (response.data.tier === 'pro' ? 'Pro' : 'Basic') + '!');
            // Clear URL params
            window.history.replaceState({}, document.title, window.location.pathname);
            fetchData();
            return;
          }
          
          // Wait before next poll
          await new Promise(r => setTimeout(r, 2000));
        } catch (error) {
          console.error('Status check error:', error);
        }
      }
      
      toast.error('Could not verify payment. Please check your account.');
      setLoading(false);
    }
  };

  const handleSubscribe = async (tier) => {
    setProcessingTier(tier);
    
    try {
      const response = await axios.post(
        `${API}/payments/checkout/create`,
        {
          tier: tier,
          origin_url: window.location.origin
        },
        { withCredentials: true }
      );
      
      // Redirect to Stripe Checkout
      window.location.href = response.data.checkout_url;
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to start checkout. Please try again.');
      setProcessingTier(null);
    }
  };

  const tierIcons = {
    basic: Shield,
    pro: Crown
  };

  const tierColors = {
    basic: 'from-blue-500 to-cyan-500',
    pro: 'from-purple-500 to-pink-500'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-purple-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white flex items-center justify-center gap-3">
          <Sparkles className="w-8 h-8 text-amber-400" />
          Upgrade Your Trading
        </h1>
        <p className="text-slate-400 mt-2">Choose the plan that fits your trading style</p>
      </div>

      {/* Current Plan Banner */}
      {currentSubscription && currentSubscription.tier !== 'free' && (
        <Card className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border-emerald-500/30">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Check className="w-6 h-6 text-emerald-400" />
              <div>
                <p className="text-emerald-400 font-medium">Current Plan: {currentSubscription.tier.toUpperCase()}</p>
                <p className="text-sm text-slate-400">Status: {currentSubscription.status}</p>
              </div>
            </div>
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
              Active
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {Object.entries(tiers).map(([tierId, tier]) => {
          const Icon = tierIcons[tierId] || Zap;
          const isCurrentPlan = currentSubscription?.tier === tierId;
          const isPro = tierId === 'pro';
          
          return (
            <Card 
              key={tierId}
              className={`relative overflow-hidden ${
                isPro 
                  ? 'bg-gradient-to-b from-purple-900/50 to-slate-800/50 border-purple-500/50' 
                  : 'bg-slate-800/50 border-slate-700'
              }`}
            >
              {isPro && (
                <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                  MOST POPULAR
                </div>
              )}
              
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl bg-gradient-to-r ${tierColors[tierId]}`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-white">{tier.name}</CardTitle>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-3xl font-bold text-white">${tier.price}</span>
                      <span className="text-slate-400">/month</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-slate-300">
                      <Check className={`w-5 h-5 flex-shrink-0 ${isPro ? 'text-purple-400' : 'text-blue-400'}`} />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  onClick={() => handleSubscribe(tierId)}
                  disabled={isCurrentPlan || processingTier === tierId}
                  className={`w-full mt-6 ${
                    isPro 
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {processingTier === tierId ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : isCurrentPlan ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Current Plan
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Subscribe Now
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Feature Comparison */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Feature Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="py-3 text-slate-400 font-medium">Feature</th>
                  <th className="py-3 text-center text-slate-400 font-medium">Free</th>
                  <th className="py-3 text-center text-blue-400 font-medium">Basic</th>
                  <th className="py-3 text-center text-purple-400 font-medium">Pro</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: 'Daily Morning Reports', free: false, basic: true, pro: true },
                  { feature: 'Portfolio Tracking', free: true, basic: true, pro: true },
                  { feature: 'Real-time Market Data', free: true, basic: true, pro: true },
                  { feature: 'Technical Analysis', free: false, basic: true, pro: true },
                  { feature: 'LSTM AI Predictions', free: false, basic: false, pro: true },
                  { feature: 'AutoHedge Multi-Agent', free: false, basic: false, pro: true },
                  { feature: 'Options Strategy Builder', free: false, basic: true, pro: true },
                  { feature: 'Email Notifications', free: false, basic: true, pro: true },
                  { feature: 'SMS/WhatsApp Alerts', free: false, basic: false, pro: true },
                  { feature: 'Broker API Integration', free: false, basic: false, pro: true },
                  { feature: 'Priority Support', free: false, basic: false, pro: true },
                  { feature: 'API Calls per Day', free: '50', basic: '500', pro: 'Unlimited' },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-slate-700/50">
                    <td className="py-3 text-slate-300">{row.feature}</td>
                    <td className="py-3 text-center">
                      {typeof row.free === 'boolean' ? (
                        row.free ? (
                          <Check className="w-5 h-5 text-emerald-400 mx-auto" />
                        ) : (
                          <span className="text-slate-600">-</span>
                        )
                      ) : (
                        <span className="text-slate-400">{row.free}</span>
                      )}
                    </td>
                    <td className="py-3 text-center">
                      {typeof row.basic === 'boolean' ? (
                        row.basic ? (
                          <Check className="w-5 h-5 text-blue-400 mx-auto" />
                        ) : (
                          <span className="text-slate-600">-</span>
                        )
                      ) : (
                        <span className="text-blue-400">{row.basic}</span>
                      )}
                    </td>
                    <td className="py-3 text-center">
                      {typeof row.pro === 'boolean' ? (
                        row.pro ? (
                          <Check className="w-5 h-5 text-purple-400 mx-auto" />
                        ) : (
                          <span className="text-slate-600">-</span>
                        )
                      ) : (
                        <span className="text-purple-400">{row.pro}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            {
              q: 'Can I cancel anytime?',
              a: 'Yes, you can cancel your subscription at any time. Your access will continue until the end of your billing period.'
            },
            {
              q: 'What payment methods do you accept?',
              a: 'We accept all major credit cards (Visa, Mastercard, American Express) through our secure Stripe payment system.'
            },
            {
              q: 'Is there a free trial?',
              a: 'We offer a free tier with limited features. You can explore the platform before upgrading to a paid plan.'
            },
            {
              q: 'Can I upgrade or downgrade?',
              a: 'Yes, you can change your plan at any time. Changes will take effect at the start of your next billing cycle.'
            }
          ].map((faq, i) => (
            <div key={i} className="p-4 bg-slate-700/50 rounded-lg">
              <p className="text-white font-medium">{faq.q}</p>
              <p className="text-slate-400 text-sm mt-2">{faq.a}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
