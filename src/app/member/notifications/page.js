'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function NotificationsPage() {
  const { userData } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (userData?._id) {
      fetchNotifications();
    }
  }, [userData?._id, page]);

  const fetchNotifications = async () => {
    if (!userData?._id) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/notifications?userId=${userData._id}&limit=20&page=${page}`);
      if (response.ok) {
        const data = await response.json();
        if (page === 1) {
          setNotifications(data.notifications || []);
        } else {
          setNotifications(prev => [...prev, ...(data.notifications || [])]);
        }
        setUnreadCount(data.unreadCount || 0);
        setHasMore(data.pagination.pages > page);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const deleteNotification = async (notificationId) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setNotifications(prev => prev.filter(n => n._id !== notificationId));
        // Check if it was unread
        const notification = notifications.find(n => n._id === notificationId);
        if (notification && !notification.read) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
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
      borrowing_due: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      borrowing_overdue: 'bg-red-500/10 text-red-400 border-red-500/20',
      reservation_ready: 'bg-green-500/10 text-green-400 border-green-500/20',
      reservation_expired: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      fine_issued: 'bg-red-500/10 text-red-400 border-red-500/20',
      payment_received: 'bg-green-500/10 text-green-400 border-green-500/20',
      book_available: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    };
    return colors[type] || 'bg-primary/10 text-primary border-primary/20';
  };

  const getActionLink = (notification) => {
    if (notification.metadata?.borrowing) {
      return '/member/my-borrowings';
    }
    if (notification.metadata?.reservation) {
      return '/member/reservations';
    }
    if (notification.metadata?.fine || notification.metadata?.payment) {
      return '/member/billing';
    }
    if (notification.metadata?.book) {
      return `/member/explore?book=${notification.metadata.book}`;
    }
    return null;
  };

  const formatTime = (date) => {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffMs = now - notificationDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    return notificationDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: notificationDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 pb-20 scroll-smooth">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white">Notifications</h2>
            <p className="text-text-secondary text-sm md:text-base">
              {unreadCount > 0 
                ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
                : 'All caught up!'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-4 py-2 bg-primary/10 hover:bg-primary text-primary hover:text-white border border-primary/20 rounded-lg transition-colors text-sm font-medium"
            >
              Mark all as read
            </button>
          )}
        </div>

        {/* Notifications List */}
        {loading && notifications.length === 0 ? (
          <div className="text-center py-12 text-text-secondary">
            <div className="flex justify-center mb-3">
              <Loader />
            </div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12 text-text-secondary">
            <span className="material-symbols-outlined text-5xl mb-3 opacity-50">notifications_off</span>
            <p className="text-lg">No notifications</p>
            <p className="text-sm mt-2">You're all caught up!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {notifications.map((notification) => {
              const actionLink = getActionLink(notification);
              const NotificationContent = (
                <div
                  className={`bg-surface-dark rounded-xl p-5 border transition-all ${
                    !notification.read 
                      ? 'border-primary/30 bg-primary/5' 
                      : 'border-[#3c2348] hover:border-[#3c2348]/50'
                  }`}
                >
                  <div className="flex gap-4">
                    <div className={`flex-shrink-0 size-12 rounded-full border flex items-center justify-center ${getNotificationColor(notification.type)}`}>
                      <span className="material-symbols-outlined">
                        {getNotificationIcon(notification.type)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className={`text-base font-bold text-white ${!notification.read ? '' : 'opacity-70'}`}>
                          {notification.title}
                        </h3>
                        {!notification.read && (
                          <span className="size-2 bg-primary rounded-full flex-shrink-0 mt-2"></span>
                        )}
                      </div>
                      <p className={`text-sm text-text-secondary mb-3 ${!notification.read ? '' : 'opacity-60'}`}>
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-text-secondary/60">
                          {formatTime(notification.createdAt)}
                        </p>
                        <div className="flex items-center gap-2">
                          {!notification.read && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification._id);
                              }}
                              className="text-xs text-primary hover:text-white transition-colors"
                            >
                              Mark as read
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification._id);
                            }}
                            className="text-xs text-text-secondary hover:text-red-400 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );

              return actionLink ? (
                <Link key={notification._id} href={actionLink}>
                  {NotificationContent}
                </Link>
              ) : (
                <div key={notification._id}>
                  {NotificationContent}
                </div>
              );
            })}
          </div>
        )}

        {/* Load More */}
        {hasMore && !loading && (
          <div className="text-center">
            <button
              onClick={() => setPage(prev => prev + 1)}
              className="px-6 py-2 bg-surface-dark hover:bg-surface-hover border border-[#3c2348] rounded-lg text-white transition-colors"
            >
              Load More
            </button>
          </div>
        )}

        {loading && notifications.length > 0 && (
          <div className="text-center py-4">
            <span className="material-symbols-outlined animate-spin text-text-secondary">refresh</span>
          </div>
        )}
      </div>
    </div>
  );
}

