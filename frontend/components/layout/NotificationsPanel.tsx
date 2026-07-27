"use client";

import React, { useEffect, useState } from "react";
import { fetcher } from "@/lib/api";
import { BellIcon, CheckCircleIcon, InfoIcon, AlertTriangleIcon, XCircleIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  time_ago: string;
  is_read: boolean;
}

interface NotificationResponse {
  notifications: Notification[];
  has_unread: boolean;
}

interface NotificationsPanelProps {
  onClose: () => void;
  onNotificationsFetched?: (hasUnread: boolean) => void;
}

export function NotificationsPanel({ onClose, onNotificationsFetched }: NotificationsPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const data = await fetcher<NotificationResponse>("/dashboard/notifications");
        setNotifications(data.notifications);
        if (onNotificationsFetched) {
          onNotificationsFetched(data.has_unread);
        }
        
        // Mark as read when the panel is opened
        await fetcher("/dashboard/notifications/mark-read", { method: "POST" });
        if (onNotificationsFetched) {
          onNotificationsFetched(false);
        }
      } catch (error) {
        console.error("Failed to load notifications:", error);
      } finally {
        setLoading(false);
      }
    };
    loadNotifications();
  }, [onNotificationsFetched]);

  return (
    <div className="absolute right-0 top-14 mt-2 w-80 md:w-96 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden flex flex-col">
      <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50/50">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <BellIcon className="w-4 h-4 text-slate-500" />
          Notifications
        </h3>
        <button 
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <XCircleIcon className="w-5 h-5" />
        </button>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-8 gap-3">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            <p className="text-sm text-slate-500 font-medium">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center">
              <BellIcon className="w-6 h-6 text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">All caught up!</p>
              <p className="text-xs text-slate-500 mt-1">Check back later for updates on your workspaces and agents.</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            {notifications.map((notif) => {
              let Icon = InfoIcon;
              let iconColor = "text-blue-500";
              let bgColor = "bg-blue-50";

              if (notif.type === "success") {
                Icon = CheckCircleIcon;
                iconColor = "text-emerald-500";
                bgColor = "bg-emerald-50";
              } else if (notif.type === "warning") {
                Icon = AlertTriangleIcon;
                iconColor = "text-orange-500";
                bgColor = "bg-orange-50";
              } else if (notif.type === "error") {
                Icon = AlertTriangleIcon;
                iconColor = "text-red-500";
                bgColor = "bg-red-50";
              }

              return (
                <div 
                  key={notif.id}
                  className={cn(
                    "flex gap-3 p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors relative",
                    !notif.is_read ? "bg-blue-50/30" : ""
                  )}
                >
                  {!notif.is_read && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600" />
                  )}
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5", bgColor, iconColor)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <p className="text-sm font-semibold text-slate-800 leading-tight">
                        {notif.title}
                      </p>
                      <span className="text-[10px] font-medium text-slate-500 shrink-0 mt-0.5">
                        {notif.time_ago}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                      {notif.message}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {notifications.length > 0 && (
        <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
          <button 
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
