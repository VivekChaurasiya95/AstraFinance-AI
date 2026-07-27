"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";

interface AuthContextType {
  user: User | null;
  dbUser: AppUser | null;
  loading: boolean;
  token: string | null;
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
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const idToken = await firebaseUser.getIdToken(true);
          setToken(idToken);
          setUser(firebaseUser);

          // Synchronize user with backend MongoDB
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1"}/auth/sync`, {
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
            // Enforce MongoDB Sync: If sync fails, the user is not fully authenticated in our system.
            auth.signOut();
            setUser(null);
            setDbUser(null);
            setToken(null);
          }
        } catch (error) {
          console.error("Token refresh or sync failed", error);
          auth.signOut();
          setUser(null);
          setDbUser(null);
          setToken(null);
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
    <AuthContext.Provider value={{ user, dbUser, loading, token }}>
      {children}
    </AuthContext.Provider>
  );
}
