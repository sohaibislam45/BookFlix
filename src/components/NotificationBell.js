'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import Loader from './Loader';

export default function NotificationBell() {
  const { userData } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!userData?._id) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/notifications?userId=${userData._id}&limit=10&unreadOnly=false`);
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch unread count only
  const fetchUnreadCount = async () => {
    if (!userData?._id) return;

    try {
      const response = await fetch(`/api/notifications/unread-count?userId=${userData._id}`);
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  useEffect(() => {
    if (userData?._id) {
      fetchNotifications();
      // Poll for unread count every 30 seconds
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [userData?._id]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const markAsRead = async (notificationId) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
      });
      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => n._id === notificationId ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!userData?._id) return;

    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userData._id }),
      });
      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getNotificationIcon = (type) => {
    const icons = {
      borrowing_due: 'schedule',
      borrowing_overdue: 'warning',
      reservation_ready: 'check_circle',
      reservation_expired: 'schedule',
      fine_issued: 'attach_money',
      payment_received: 'check_circle',
      book_available: 'book',
    };
    return icons[type] || 'notifications';
  };

  const getNotificationColor = (type) => {
    const colors = {
      borrowing_due: 'text-orange-400',
      borrowing_overdue: 'text-red-400',
      reservation_ready: 'text-green-400',
      reservation_expired: 'text-yellow-400',
      fine_issued: 'text-red-400',
      payment_received: 'text-green-400',
      book_available: 'text-blue-400',
    };
    return colors[type] || 'text-primary';
  };

  const formatTime = (date) => {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffMs = now - notificationDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return notificationDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (!userData?._id) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className="relative p-2 text-text-secondary hover:text-white hover:bg-surface-hover rounded-full transition-colors"
      >
        <span className="material-symbols-outlined">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 size-2 bg-primary rounded-full border-2 border-[#1c1022] animate-pulse"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 md:w-96 bg-surface-dark border border-[#3c2348] rounded-xl shadow-2xl z-50 max-h-[500px] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[#3c2348]">
            <h3 className="text-white font-bold">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-primary hover:text-white transition-colors"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-8 text-center text-text-secondary">
                <div className="flex justify-center mb-2">
                  <Loader />
                </div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-text-secondary">
                <span className="material-symbols-outlined text-5xl mb-3 opacity-50">notifications_off</span>
                <p>No notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-[#3c2348]">
                {notifications.map((notification) => (
                  <div
                    key={notification._id}
                    className={`p-4 hover:bg-surface-hover transition-colors cursor-pointer ${
                      !notification.read ? 'bg-primary/5' : ''
                    }`}
                    onClick={() => {
                      if (!notification.read) markAsRead(notification._id);
                    }}
                  >
                    <div className="flex gap-3">
                      <div className={`flex-shrink-0 ${getNotificationColor(notification.type)}`}>
                        <span className="material-symbols-outlined">
                          {getNotificationIcon(notification.type)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold text-white mb-1 ${!notification.read ? '' : 'opacity-70'}`}>
                          {notification.title}
                        </p>
                        <p className={`text-xs text-text-secondary mb-2 ${!notification.read ? '' : 'opacity-60'}`}>
                          {notification.message}
                        </p>
                        <p className="text-[10px] text-text-secondary/60">
                          {formatTime(notification.createdAt)}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="flex-shrink-0">
                          <span className="size-2 bg-primary rounded-full block"></span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-[#3c2348]">
            <Link
              href="/member/notifications"
              onClick={() => setIsOpen(false)}
              className="block text-center text-sm text-primary hover:text-white transition-colors font-medium"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

