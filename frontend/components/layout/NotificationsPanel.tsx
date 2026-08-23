"use client";

import React, { useEffect, useState } from "react";
import { fetcher } from "@/lib/api";
import { BellIcon, CheckCircleIcon, InfoIcon, AlertTriangleIcon, XCircleIcon, Loader2, CheckCheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotificationStore } from "@/hooks/useNotificationStore";

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays}d ago`;
  
  return date.toLocaleDateString();
}

interface Notification {
  id: string;
  title: string;
  message: string;
  category: string;
  priority: string;
  type: string;
  created_at: string;
  read: boolean;
}

interface NotificationResponse {
  notifications: Notification[];
  has_unread: boolean;
}

interface NotificationsPanelProps {
  onClose: () => void;
}

export function NotificationsPanel({ onClose }: NotificationsPanelProps) {
  const { notifications, markAsRead, markAllAsRead, isInitialized } = useNotificationStore();
  const loading = !isInitialized;

  const handleMarkAllRead = async () => {
    try {
      await fetcher("/notifications/read-all", { method: "POST" });
      markAllAsRead();
    } catch (error) {
      console.error("Failed to mark all read:", error);
    }
  };

  const handleNotificationClick = async (id: string, read: boolean) => {
    if (!read) {
      try {
        await fetcher(`/notifications/${id}/read`, { method: "PATCH" });
        markAsRead(id);
      } catch (error) {
        console.error("Failed to mark read:", error);
      }
    }
  };

  return (
    <div className="absolute right-0 top-14 mt-2 w-80 md:w-96 bg-card rounded-xl shadow-xl border border-border z-50 overflow-hidden flex flex-col">
      <div className="flex justify-between items-center p-4 border-b border-border-subtle bg-surface/50">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <BellIcon className="w-4 h-4 text-muted-foreground" />
          Notifications
        </h3>
        <div className="flex items-center gap-2">
          {notifications.some(n => !n.read) && (
            <button 
              onClick={handleMarkAllRead}
              className="text-[11px] font-semibold text-primary hover:text-primary bg-primary/10 hover:bg-primary/20 px-2 py-1 rounded-md transition-colors flex items-center gap-1"
            >
              <CheckCheckIcon className="w-3 h-3" />
              Mark all read
            </button>
          )}
          <button 
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors ml-1"
          >
            <XCircleIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-8 gap-3">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground font-medium">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center">
              <BellIcon className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">All caught up!</p>
              <p className="text-[13px] text-muted-foreground mt-1">Check back later for updates on your workspaces and agents.</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            {notifications.map((notif) => {
              let Icon = InfoIcon;
              let iconColor = "text-primary";
              let bgColor = "bg-primary/10";

              if (notif.type.includes("success") || notif.type.includes("completed")) {
                Icon = CheckCircleIcon;
                iconColor = "text-success";
                bgColor = "bg-success/10";
              } else if (notif.priority === "critical" || notif.type.includes("fail")) {
                Icon = AlertTriangleIcon;
                iconColor = "text-destructive";
                bgColor = "bg-destructive/10";
              } else if (notif.category === "risk") {
                Icon = AlertTriangleIcon;
                iconColor = "text-orange-500";
                bgColor = "bg-orange-50";
              }

              return (
                <div 
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif.id, notif.read)}
                  className={cn(
                    "flex gap-3 p-4 border-b border-slate-50 hover:bg-surface transition-colors relative cursor-pointer group",
                    !notif.read ? "bg-primary/10/20" : ""
                  )}
                >
                  {!notif.read && (
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary" />
                  )}
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 shadow-sm", bgColor, iconColor)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <p className={cn("text-[13px] leading-tight", !notif.read ? "font-bold text-foreground" : "font-semibold text-foreground")}>
                        {notif.title}
                      </p>
                      <span className="text-[10px] font-medium text-muted-foreground shrink-0 mt-0.5 whitespace-nowrap">
                        {timeAgo(notif.created_at)}
                      </span>
                    </div>
                    <p className={cn("text-[13px] mt-1 line-clamp-2", !notif.read ? "text-muted-foreground font-medium" : "text-muted-foreground")}>
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
        <div className="p-3 bg-surface border-t border-border-subtle text-center">
          <button 
            className="text-[13px] font-semibold text-primary hover:text-primary transition-colors"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}

// force Next.js cache refresh
