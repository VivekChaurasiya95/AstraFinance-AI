"use client";

import React, { useEffect, useRef } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useNotificationStore, Notification } from "@/hooks/useNotificationStore";
import { fetcher, API_BASE_URL } from "@/lib/api";
import { toast } from "sonner";
import { InfoIcon, CheckCircleIcon, AlertTriangleIcon } from "lucide-react";

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { setInitialData, addRealTimeNotification, isInitialized } = useNotificationStore();
  const eventSourceRef = useRef<EventSource | null>(null);
  
  // Reconnect timeout for exponential backoff
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);

  // 1. Fetch initial data on mount
  useEffect(() => {
    if (!user || loading || isInitialized) return;

    async function loadInitial() {
      try {
        const [listRes, countRes] = await Promise.all([
          fetcher<{notifications: Notification[]}>("/notifications?limit=50"),
          fetcher<{count: number}>("/notifications/unread-count")
        ]);
        setInitialData(listRes.notifications, countRes.count);
      } catch (err) {
        console.error("Failed to load initial notifications:", err);
      }
    }
    loadInitial();
  }, [user, loading, isInitialized, setInitialData]);

  // 2. Establish SSE connection
  useEffect(() => {
    if (!user || loading) return;

    let isMounted = true;

    async function connectSSE() {
      try {
        console.log("[SSE] Connecting...");
        const token = await user?.getIdToken(false);
        if (!token || typeof token !== "string" || token.split(".").length !== 3) {
          console.log("[SSE] Waiting for authentication");
          return;
        }
        if (!isMounted) return;

        // Close any existing connection to prevent duplicates
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }

        const url = `${API_BASE_URL}/notifications/stream?token=${encodeURIComponent(token)}`;
        
        const eventSource = new EventSource(url);
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
          if (!isMounted) {
            eventSource.close();
            return;
          }
          console.log("[SSE] Notifications stream connected");
          reconnectAttempts.current = 0; // Reset attempts on successful connection
        };

        // Listen for named 'notification' event
        eventSource.addEventListener("notification", (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "new_notification" && data.data) {
              const notif = data.data as Notification;
              console.log(`[SSE] Notification received: ${notif.id}`);
              addRealTimeNotification(notif);
              showToast(notif);
            }
          } catch (err) {
            // Ignore parse errors silently to avoid console spam
          }
        });

        eventSource.onerror = async (error) => {
          if (!isMounted) return;
          eventSource.close();
          eventSourceRef.current = null;
          
          if (reconnectAttempts.current === 0) {
            // If it failed immediately, it might be an expired token (401). Force refresh it once.
            try {
              console.log("[SSE] Token refresh attempted");
              const freshToken = await user?.getIdToken(true);
              if (!freshToken) throw new Error("No token returned");
              
              reconnectAttempts.current += 1;
              if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
              reconnectTimeoutRef.current = setTimeout(() => {
                if (isMounted) connectSSE();
              }, 1000);
              return;
            } catch (e) {
              const msg = e instanceof Error ? e.message : "Unknown";
              if (msg.toLowerCase().includes("closing") || msg.toLowerCase().includes("hidden")) {
                console.log(`[SSE] Connection aborted (page closing/hidden)`);
                return;
              }
              console.warn(`[SSE] Token refresh failed\nreason=${msg}`);
            }
          }
          
          // Exponential backoff reconnect
          const timeout = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          console.log(`[SSE] Reconnecting in ${timeout}ms...`);
          
          reconnectAttempts.current += 1;
          
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMounted) connectSSE();
          }, timeout);
        };

      } catch (err) {
        console.error("Failed to initialize SSE connection:", err);
      }
    }

    connectSSE();

    return () => {
      isMounted = false;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [user, loading, addRealTimeNotification]);

  const showToast = (notif: Notification) => {
    // Determine icon and colors based on severity
    let icon = <InfoIcon className="w-5 h-5 text-blue-500" />;
    
    if (notif.type.includes("success") || notif.type.includes("completed")) {
      icon = <CheckCircleIcon className="w-5 h-5 text-green-500" />;
    } else if (notif.priority === "critical" || notif.type.includes("fail")) {
      icon = <AlertTriangleIcon className="w-5 h-5 text-red-500" />;
    } else if (notif.category === "risk") {
      icon = <AlertTriangleIcon className="w-5 h-5 text-orange-500" />;
    }

    toast(notif.title, {
      description: notif.message,
      icon: icon,
      duration: 5000,
    });
  };

  return <>{children}</>;
}
