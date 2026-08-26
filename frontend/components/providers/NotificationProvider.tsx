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
  
  const abortControllerRef = useRef<AbortController | null>(null);
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

  // 2. Establish SSE connection using fetch (enables auth headers and status codes)
  useEffect(() => {
    if (!user || loading) return;

    let isMounted = true;
    const MAX_RECONNECT_ATTEMPTS = 10;

    async function connectSSE() {
      if (!isMounted) return;

      // Stop retrying after too many failures
      if (reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS) {
        console.warn(`[SSE] Stopped reconnecting after ${MAX_RECONNECT_ATTEMPTS} failed attempts. Reload the page to retry.`);
        return;
      }

      // Create a local AbortController for this specific connection attempt.
      // This prevents React Strict Mode remounts from sharing/orphaning controllers.
      const localAbort = new AbortController();
      
      // Abort any previous connection before establishing a new one
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = localAbort;

      try {
        const token = await user?.getIdToken(false);
        // Re-check after async operation — component may have unmounted
        if (!isMounted || localAbort.signal.aborted) return;

        if (!token) {
          return; // Still waiting for auth — don't log, just bail
        }

        if (reconnectAttempts.current === 0) {
          console.log("[SSE] Connecting...");
        }

        const url = `${API_BASE_URL}/notifications/stream`;
        const response = await fetch(url, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Accept": "text/event-stream",
          },
          signal: localAbort.signal
        });

        if (!isMounted || localAbort.signal.aborted) return;

        if (response.status === 401) {
          console.warn("[SSE] Authentication failed, refreshing token...");
          const freshToken = await user?.getIdToken(true);
          if (freshToken && isMounted) {
            reconnectAttempts.current += 1;
            reconnectTimeoutRef.current = setTimeout(() => {
              if (isMounted) connectSSE();
            }, 1000);
          }
          return;
        } else if (!response.ok) {
          throw new Error(`${response.status}`);
        }

        console.log("[SSE] Notifications stream connected");
        reconnectAttempts.current = 0; // Reset on successful connection

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No reader");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          let boundary = buffer.indexOf('\n\n');
          
          while (boundary !== -1) {
            const chunk = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);
            
            let dataStr = "";
            const lines = chunk.split('\n');
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                dataStr += line.slice(6);
              }
            }

            if (dataStr) {
              try {
                const data = JSON.parse(dataStr);
                if (data.type === "new_notification" && data.data) {
                  const notif = data.data as Notification;
                  console.log(`[SSE] Notification received: ${notif.id}`);
                  addRealTimeNotification(notif);
                  showToast(notif);
                }
              } catch {
                // Ignore non-JSON SSE messages (heartbeats, etc.)
              }
            }
            boundary = buffer.indexOf('\n\n');
          }
        }
        
        // Server closed the connection — reconnect
        throw new Error("Connection closed by server");
        
      } catch (err: any) {
        if (!isMounted || localAbort.signal.aborted) return;
        if (err instanceof Error && err.name === 'AbortError') return;

        reconnectAttempts.current += 1;
        const timeout = Math.min(1000 * Math.pow(2, reconnectAttempts.current - 1), 30000);

        // Only log the first few attempts; after that stay quiet  
        if (reconnectAttempts.current <= 3) {
          console.warn(`[SSE] Disconnected (attempt ${reconnectAttempts.current}/${MAX_RECONNECT_ATTEMPTS}), retrying in ${timeout / 1000}s`);
        }
        
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        
        reconnectTimeoutRef.current = setTimeout(() => {
          if (isMounted) connectSSE();
        }, timeout);
      }
    }

    connectSSE();

    return () => {
      isMounted = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [user, loading, addRealTimeNotification]);

  const showToast = (notif: Notification) => {
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
