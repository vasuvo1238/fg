import { useState, useEffect } from 'react';
import axios from 'axios';
import { Bell, BellOff, Mail, Smartphone, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { API } from '@/lib/api';

// VAPID public key (generate your own for production)
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function NotificationSettings() {
  const [preferences, setPreferences] = useState({
    email: {
      usage_alerts: true,
      prediction_alerts: true,
      price_alerts: true,
      subscription_alerts: true,
      announcements: true,
      weekly_summary: true
    },
    push: {
      enabled: false,
      usage_alerts: true,
      prediction_alerts: true,
      price_alerts: true
    },
    in_app: {
      enabled: true,
      sound: true
    }
  });
  const [loading, setLoading] = useState(true);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState('default');

  useEffect(() => {
    // Check if push notifications are supported
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setPushSupported(true);
      setPushPermission(Notification.permission);
    }
    
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const response = await axios.get(`${API}/notifications/preferences`, { withCredentials: true });
      if (response.data) {
        setPreferences(prev => ({ ...prev, ...response.data }));
      }
    } catch (error) {
      console.error('Failed to fetch preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async (newPrefs) => {
    try {
      await axios.put(`${API}/notifications/preferences`, newPrefs, { withCredentials: true });
      toast.success('Preferences saved');
    } catch (error) {
      console.error('Failed to save preferences:', error);
      toast.error('Failed to save preferences');
    }
  };

  const updatePreference = (category, key, value) => {
    const newPrefs = {
      ...preferences,
      [category]: {
        ...preferences[category],
        [key]: value
      }
    };
    setPreferences(newPrefs);
    savePreferences(newPrefs);
  };

  const enablePushNotifications = async () => {
    try {
      // Request permission
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      
      if (permission !== 'granted') {
        toast.error('Push notification permission denied');
        return;
      }
      
      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered');
      
      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
      
      // Send subscription to backend
      await axios.post(`${API}/notifications/push/subscribe`, {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')))),
          auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth'))))
        }
      }, { withCredentials: true });
      
      updatePreference('push', 'enabled', true);
      toast.success('Push notifications enabled!');
      
    } catch (error) {
      console.error('Failed to enable push notifications:', error);
      toast.error('Failed to enable push notifications');
    }
  };

  const disablePushNotifications = async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
        }
      }
      
      await axios.delete(`${API}/notifications/push/unsubscribe`, { withCredentials: true });
      
      updatePreference('push', 'enabled', false);
      toast.success('Push notifications disabled');
      
    } catch (error) {
      console.error('Failed to disable push notifications:', error);
      toast.error('Failed to disable push notifications');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Notification Settings</h2>
      
      {/* Push Notifications */}
      <Card className="p-6 bg-slate-800/50 border-slate-700">
        <div className="flex items-center gap-3 mb-4">
          <Smartphone className="w-5 h-5 text-emerald-400" />
          <h3 className="text-lg font-semibold text-white">Push Notifications</h3>
        </div>
        
        {!pushSupported ? (
          <p className="text-slate-400 text-sm">
            Push notifications are not supported in this browser.
          </p>
        ) : pushPermission === 'denied' ? (
          <p className="text-amber-400 text-sm">
            Push notifications are blocked. Please enable them in your browser settings.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-slate-200">Enable Push Notifications</Label>
                <p className="text-xs text-slate-400">Get alerts even when you're not on the site</p>
              </div>
              <Button
                size="sm"
                variant={preferences.push.enabled ? "destructive" : "default"}
                onClick={preferences.push.enabled ? disablePushNotifications : enablePushNotifications}
              >
                {preferences.push.enabled ? <BellOff className="w-4 h-4 mr-2" /> : <Bell className="w-4 h-4 mr-2" />}
                {preferences.push.enabled ? 'Disable' : 'Enable'}
              </Button>
            </div>
            
            {preferences.push.enabled && (
              <div className="pl-4 border-l-2 border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-slate-300">Usage Alerts</Label>
                  <Switch
                    checked={preferences.push.usage_alerts}
                    onCheckedChange={(v) => updatePreference('push', 'usage_alerts', v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-slate-300">Prediction Alerts</Label>
                  <Switch
                    checked={preferences.push.prediction_alerts}
                    onCheckedChange={(v) => updatePreference('push', 'prediction_alerts', v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-slate-300">Price Alerts</Label>
                  <Switch
                    checked={preferences.push.price_alerts}
                    onCheckedChange={(v) => updatePreference('push', 'price_alerts', v)}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Email Notifications */}
      <Card className="p-6 bg-slate-800/50 border-slate-700">
        <div className="flex items-center gap-3 mb-4">
          <Mail className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Email Notifications</h3>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-slate-200">Usage Alerts</Label>
              <p className="text-xs text-slate-400">When you're approaching your limit</p>
            </div>
            <Switch
              checked={preferences.email.usage_alerts}
              onCheckedChange={(v) => updatePreference('email', 'usage_alerts', v)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-slate-200">Prediction Alerts</Label>
              <p className="text-xs text-slate-400">When predictions are ready</p>
            </div>
            <Switch
              checked={preferences.email.prediction_alerts}
              onCheckedChange={(v) => updatePreference('email', 'prediction_alerts', v)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-slate-200">Price Alerts</Label>
              <p className="text-xs text-slate-400">When stock prices hit your targets</p>
            </div>
            <Switch
              checked={preferences.email.price_alerts}
              onCheckedChange={(v) => updatePreference('email', 'price_alerts', v)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-slate-200">Subscription Alerts</Label>
              <p className="text-xs text-slate-400">Billing and subscription updates</p>
            </div>
            <Switch
              checked={preferences.email.subscription_alerts}
              onCheckedChange={(v) => updatePreference('email', 'subscription_alerts', v)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-slate-200">Announcements</Label>
              <p className="text-xs text-slate-400">New features and updates</p>
            </div>
            <Switch
              checked={preferences.email.announcements}
              onCheckedChange={(v) => updatePreference('email', 'announcements', v)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-slate-200">Weekly Summary</Label>
              <p className="text-xs text-slate-400">Your weekly activity report</p>
            </div>
            <Switch
              checked={preferences.email.weekly_summary}
              onCheckedChange={(v) => updatePreference('email', 'weekly_summary', v)}
            />
          </div>
        </div>
      </Card>

      {/* In-App Notifications */}
      <Card className="p-6 bg-slate-800/50 border-slate-700">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">In-App Notifications</h3>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-slate-200">Enable Notifications</Label>
              <p className="text-xs text-slate-400">Show notifications in the app</p>
            </div>
            <Switch
              checked={preferences.in_app.enabled}
              onCheckedChange={(v) => updatePreference('in_app', 'enabled', v)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-slate-200">Notification Sound</Label>
              <p className="text-xs text-slate-400">Play sound for new notifications</p>
            </div>
            <Switch
              checked={preferences.in_app.sound}
              onCheckedChange={(v) => updatePreference('in_app', 'sound', v)}
              disabled={!preferences.in_app.enabled}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
