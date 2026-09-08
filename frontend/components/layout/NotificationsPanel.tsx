"use client";

import React, { useEffect, useState } from "react";
import { fetcher } from "@/lib/api";
import { BellIcon, CheckCircleIcon, InfoIcon, AlertTriangleIcon, XCircleIcon, Loader2, CheckCheckIcon, XIcon, Trash2Icon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotificationStore } from "@/hooks/useNotificationStore";
import { formatRelativeTime } from "@/lib/timestamps";


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
  const { notifications, markAsRead, markAllAsRead, isInitialized, removeNotification, clearAllNotifications } = useNotificationStore();
  const loading = !isInitialized;

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetcher("/notifications/read-all", { method: "POST" });
      markAllAsRead();
    } catch (error) {
      console.error("Failed to mark all read:", error);
    }
  };

  const handleDeleteAll = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetcher("/notifications", { method: "DELETE" });
      clearAllNotifications();
    } catch (error) {
      console.error("Failed to delete all notifications:", error);
    }
  };

  const handleDeleteNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await fetcher(`/notifications/${id}`, { method: "DELETE" });
      removeNotification(id);
    } catch (error) {
      console.error("Failed to delete notification:", error);
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
    <div className="absolute right-0 top-14 mt-2 w-80 md:w-96 max-h-[80vh] md:max-h-[500px] bg-card rounded-xl shadow-xl border border-border z-50 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card/95 backdrop-blur-md sticky top-0 z-10 shrink-0 shadow-sm">
        <div className="flex items-center gap-2">
          <BellIcon className="w-4 h-4 text-primary" />
          <h2 className="font-bold text-foreground tracking-tight">Notifications</h2>
        </div>
        <div className="flex items-center gap-1">
          {notifications.some(n => !n.read) && (
            <button
              onClick={handleMarkAllRead}
              className="group p-1.5 hover:bg-surface rounded-md transition-colors"
              title="Mark all as read"
            >
              <CheckCheckIcon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={handleDeleteAll}
              className="group p-1.5 hover:bg-destructive/10 rounded-md transition-colors ml-1"
              title="Delete all notifications"
            >
              <Trash2Icon className="w-4 h-4 text-muted-foreground group-hover:text-destructive transition-colors" />
            </button>
          )}
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-surface rounded-md transition-colors ml-1"
          >
            <XCircleIcon className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 bg-background relative custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 h-full gap-3 opacity-50">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground font-medium">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 h-full text-center px-6">
            <div className="w-12 h-12 bg-surface rounded-full flex items-center justify-center mb-3">
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
                  <div className="flex-1 min-w-0 pr-6 relative">
                    <div className="flex justify-between items-start gap-2">
                      <p className={cn("text-[13px] leading-tight pr-2", !notif.read ? "font-bold text-foreground" : "font-semibold text-foreground")}>
                        {notif.title}
                      </p>
                      <span className="text-[10px] font-medium text-muted-foreground shrink-0 mt-0.5 whitespace-nowrap">
                        {formatRelativeTime(notif.created_at)}
                      </span>
                    </div>
                    <p className={cn("text-[13px] mt-1 line-clamp-2 pr-2", !notif.read ? "text-muted-foreground font-medium" : "text-muted-foreground")}>
                      {notif.message}
                    </p>
                    <button
                      onClick={(e) => handleDeleteNotification(e, notif.id)}
                      className="absolute right-0 top-1/2 -translate-y-1/2 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 rounded-md"
                      title="Delete notification"
                    >
                      <Trash2Icon className="w-4 h-4 text-muted-foreground hover:text-destructive transition-colors" />
                    </button>
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
