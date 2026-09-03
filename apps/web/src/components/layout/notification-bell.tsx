'use client';

import React, { useEffect, useState } from 'react';
import { notificationsApi, NotificationItem } from '@/features/notifications/services/notifications-api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bell,
  CheckCheck,
  AlertTriangle,
  Info,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

export function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await notificationsApi.getNotifications();
      if (res.success) {
        setNotifications(res.data || []);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch (err) {
      console.error('Fetch notifications error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Poll every 60s
    return () => clearInterval(interval);
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      toast.error('Failed to mark notification as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to mark all as read');
    }
  };

  const handleManualScan = async () => {
    try {
      await notificationsApi.triggerLowStockScan();
      toast.success('Low-stock scan triggered successfully');
      setTimeout(fetchNotifications, 1500);
    } catch {
      toast.error('Failed to trigger low-stock scan');
    }
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative size-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent"
        title="Notifications"
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <>
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Panel */}
          <div className="absolute right-0 mt-2 z-50 w-80 sm:w-96 rounded-xl border border-border bg-card shadow-xl overflow-hidden font-sans">
            <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <Bell className="size-4 text-primary" />
                <span className="text-sm font-bold text-foreground">Notifications</span>
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="text-[10px] h-4 px-1.5 font-bold">
                    {unreadCount} Unread
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleManualScan}
                  title="Run Low-Stock Scan"
                  className="size-7 text-muted-foreground hover:text-foreground"
                >
                  <RefreshCw className="size-3.5" />
                </Button>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMarkAllAsRead}
                    className="h-7 text-xs gap-1 font-medium text-primary hover:text-primary"
                  >
                    <CheckCheck className="size-3.5" /> Mark all read
                  </Button>
                )}
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-border/60">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground space-y-1">
                  <Info className="size-6 text-muted-foreground/50 mx-auto" />
                  <p className="font-medium">No notifications</p>
                  <p className="text-[11px]">You're all caught up!</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => !n.read && handleMarkAsRead(n.id)}
                    className={`p-3 text-xs transition-colors flex gap-3 cursor-pointer ${
                      n.read ? 'bg-background hover:bg-muted/40' : 'bg-primary/5 hover:bg-primary/10 font-medium'
                    }`}
                  >
                    <div className="shrink-0 mt-0.5">
                      {n.type === 'LOW_STOCK' ? (
                        <div className="size-6 rounded-full bg-amber-500/15 flex items-center justify-center text-amber-600">
                          <AlertTriangle className="size-3.5" />
                        </div>
                      ) : (
                        <div className="size-6 rounded-full bg-primary/15 flex items-center justify-center text-primary">
                          <Info className="size-3.5" />
                        </div>
                      )}
                    </div>
                    <div className="space-y-1 min-w-0 flex-1">
                      <p className="text-foreground leading-relaxed text-[12px]">{n.message}</p>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="size-3" />
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
