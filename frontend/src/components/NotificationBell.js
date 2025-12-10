import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Bell, Check, CheckCheck, Trash2, X, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { API } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

// Notification type icons and colors
const notificationStyles = {
  usage_warning: { icon: '⚠️', color: 'border-l-amber-500 bg-amber-500/10' },
  usage_limit: { icon: '🚫', color: 'border-l-red-500 bg-red-500/10' },
  prediction_complete: { icon: '📊', color: 'border-l-emerald-500 bg-emerald-500/10' },
  price_alert: { icon: '🎯', color: 'border-l-blue-500 bg-blue-500/10' },
  subscription: { icon: '💳', color: 'border-l-purple-500 bg-purple-500/10' },
  announcement: { icon: '📢', color: 'border-l-cyan-500 bg-cyan-500/10' },
  welcome: { icon: '🎉', color: 'border-l-emerald-500 bg-emerald-500/10' },
  feature_update: { icon: '✨', color: 'border-l-indigo-500 bg-indigo-500/10' },
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`${API}/notifications`, { withCredentials: true });
      setNotifications(response.data.notifications);
      setUnreadCount(response.data.unread_count);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  // Initial fetch and polling
  useEffect(() => {
    fetchNotifications();
    
    // Poll every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mark single notification as read
  const markAsRead = async (notificationId) => {
    try {
      await axios.post(`${API}/notifications/${notificationId}/read`, {}, { withCredentials: true });
      setNotifications(notifications.map(n => 
        n.notification_id === notificationId ? { ...n, read: true } : n
      ));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      await axios.post(`${API}/notifications/read-all`, {}, { withCredentials: true });
      setNotifications(notifications.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId, e) => {
    e.stopPropagation();
    try {
      await axios.delete(`${API}/notifications/${notificationId}`, { withCredentials: true });
      const deleted = notifications.find(n => n.notification_id === notificationId);
      setNotifications(notifications.filter(n => n.notification_id !== notificationId));
      if (deleted && !deleted.read) {
        setUnreadCount(Math.max(0, unreadCount - 1));
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  // Clear all notifications
  const clearAll = async () => {
    try {
      await axios.delete(`${API}/notifications`, { withCredentials: true });
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    }
  };

  const formatTime = (timestamp) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return 'recently';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-slate-300" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 max-h-[500px] bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-800/80">
            <h3 className="font-semibold text-white">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                >
                  <CheckCheck className="w-3 h-3" />
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="text-xs text-slate-400 hover:text-slate-300 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto max-h-[400px]">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => {
                const style = notificationStyles[notification.type] || notificationStyles.announcement;
                return (
                  <div
                    key={notification.notification_id}
                    onClick={() => !notification.read && markAsRead(notification.notification_id)}
                    className={`
                      px-4 py-3 border-l-4 cursor-pointer transition-all
                      ${style.color}
                      ${notification.read ? 'opacity-60' : 'hover:bg-slate-700/50'}
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xl">{style.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className={`font-medium text-sm ${notification.read ? 'text-slate-400' : 'text-white'}`}>
                            {notification.title}
                          </h4>
                          <button
                            onClick={(e) => deleteNotification(notification.notification_id, e)}
                            className="text-slate-500 hover:text-red-400 flex-shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {formatTime(notification.created_at)}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0 mt-2" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-slate-700 bg-slate-800/80">
            <button className="text-xs text-slate-400 hover:text-white flex items-center gap-1 w-full justify-center">
              <Settings className="w-3 h-3" />
              Notification Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
