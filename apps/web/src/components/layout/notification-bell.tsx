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
      await Promise.all([
        notificationsApi.triggerLowStockScan(),
        notificationsApi.triggerExpiryScan(),
      ]);
      toast.success('Inventory alert scan completed successfully');
      setTimeout(fetchNotifications, 1000);
    } catch {
      toast.error('Failed to trigger inventory scan');
    }
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative size-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer"
        title="Notifications"
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center pointer-events-none">
            {/* Blinking outer radar ping */}
            <span className="absolute inline-flex size-4.5 rounded-full bg-red-500 opacity-75 animate-ping" />
            {/* Crisp white text badge with blinking pulse */}
            <span className="relative flex min-w-4.5 h-4.5 px-1 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-sm ring-2 ring-background animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
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

          {/* Dropdown Panel - Firmly anchored right beneath notification bell, responsive full-width card */}
          <div className="absolute -right-8 sm:right-0 mt-2 z-50 w-[min(380px,calc(100vw-1.5rem))] sm:w-[380px] rounded-xl border border-border bg-card shadow-2xl overflow-hidden font-sans">
            <div className="flex items-center justify-between gap-2 p-3 border-b border-border bg-muted/30">
              <div className="flex items-center gap-1.5 min-w-0">
                <Bell className="size-4 text-primary shrink-0" />
                <span className="text-sm font-bold text-foreground truncate">Notifications</span>
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="text-micro h-4 px-1.5 font-bold text-white bg-red-600 shrink-0">
                    {unreadCount} Unread
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleManualScan}
                  title="Run Low-Stock Scan"
                  className="size-7 text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                >
                  <RefreshCw className="size-3.5" />
                </Button>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMarkAllAsRead}
                    className="h-7 px-2 text-xs gap-1 font-semibold text-primary hover:text-primary hover:bg-primary/10 shrink-0 whitespace-nowrap cursor-pointer"
                  >
                    <CheckCheck className="size-3.5 shrink-0" />
                    <span>Mark all read</span>
                  </Button>
                )}
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-border/60">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground space-y-1">
                  <Info className="size-6 text-muted-foreground/50 mx-auto" />
                  <p className="font-medium">No notifications</p>
                  <p className="text-xs">You're all caught up!</p>
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
                        <div className="size-6 rounded-full bg-warning/15 flex items-center justify-center text-warning">
                          <AlertTriangle className="size-3.5" />
                        </div>
                      ) : (
                        <div className="size-6 rounded-full bg-primary/15 flex items-center justify-center text-primary">
                          <Info className="size-3.5" />
                        </div>
                      )}
                    </div>
                    <div className="space-y-1 min-w-0 flex-1">
                      <p className="text-foreground leading-relaxed text-xs">{n.message}</p>
                      <div className="flex items-center gap-1 text-micro text-muted-foreground">
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
