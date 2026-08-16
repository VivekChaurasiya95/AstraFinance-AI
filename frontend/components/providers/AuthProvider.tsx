"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { API_BASE_URL } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  dbUser: AppUser | null;
  loading: boolean;
  token: string | null;
  updateDbUser: (updates: Partial<AppUser>) => void;
}

interface AppUser {
  id: string;
  name: string;
  email: string;
  profile_picture: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  dbUser: null,
  loading: true,
  token: null,
  updateDbUser: () => {},
});

export const useAuth = () => useContext(AuthContext);

let lastSyncTime = 0;
let lastSyncedUid = "";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const syncingRef = useRef<boolean>(false);

  const updateDbUser = (updates: Partial<AppUser>) => {
    setDbUser((prev) => (prev ? { ...prev, ...updates } : null));
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const idToken = await firebaseUser.getIdToken(true);
          setToken(idToken);
          setUser(firebaseUser);

          // Prevent concurrent syncs for the same token update
          if (syncingRef.current) return;
          
          // Prevent strict mode double-sync within 2 seconds
          const now = Date.now();
          if (firebaseUser.uid === lastSyncedUid && now - lastSyncTime < 2000) {
            return;
          }
          lastSyncTime = now;
          lastSyncedUid = firebaseUser.uid;

          syncingRef.current = true;

          // Synchronize user with backend MongoDB
          const response = await fetch(`${API_BASE_URL}/auth/sync`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${idToken}`
            }
          });

          if (response.ok) {
            const dbData = await response.json();
            setDbUser({
              id: dbData.id,
              name: dbData.name || firebaseUser.displayName || "",
              email: dbData.email || firebaseUser.email || "",
              profile_picture: dbData.profile_picture_url || firebaseUser.photoURL || null,
            });
          } else {
            console.error("Backend sync failed", await response.text());
          }
        } catch (error) {
          console.error("Token refresh or sync failed", error);
        } finally {
          syncingRef.current = false;
        }
      } else {
        setUser(null);
        setDbUser(null);
        setToken(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, dbUser, loading, token, updateDbUser }}>
      {children}
    </AuthContext.Provider>
  );
}
