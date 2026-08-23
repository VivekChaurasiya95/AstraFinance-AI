import { create } from 'zustand';

export interface Notification {
  id: string;
  title: string;
  message: string;
  category: string;
  priority: string;
  type: string;
  created_at: string;
  read: boolean;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isInitialized: boolean;
  
  // Actions
  setInitialData: (notifications: Notification[], unreadCount: number) => void;
  addRealTimeNotification: (notification: Notification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  isInitialized: false,

  setInitialData: (notifications, unreadCount) => set({
    notifications,
    unreadCount,
    isInitialized: true
  }),

  addRealTimeNotification: (notification) => set((state) => {
    // Duplicate protection by ID
    if (state.notifications.some(n => n.id === notification.id)) {
      return state;
    }
    
    return {
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1
    };
  }),

  markAsRead: (id) => set((state) => {
    const notif = state.notifications.find(n => n.id === id);
    if (!notif || notif.read) return state; // already read or missing

    return {
      notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n),
      unreadCount: Math.max(0, state.unreadCount - 1)
    };
  }),

  markAllAsRead: () => set((state) => ({
    notifications: state.notifications.map(n => ({ ...n, read: true })),
    unreadCount: 0
  }))
}));
