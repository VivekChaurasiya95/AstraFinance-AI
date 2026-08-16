import { auth } from "./firebase";
import { getIdToken } from "firebase/auth";

// Default fallback for SSR or if window is undefined
let baseUrl = "http://127.0.0.1:8000/api/v1";
if (typeof window !== "undefined") {
  // If the frontend is accessed via a LAN IP (e.g. 10.23.69.37), use that same IP for the backend API
  baseUrl = `${window.location.protocol}//${window.location.hostname}:8000/api/v1`;
}
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.includes("127.0.0.1") && typeof window !== "undefined"
  ? baseUrl 
  : (process.env.NEXT_PUBLIC_API_URL || baseUrl);

export async function fetcher<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  let token: string | undefined = undefined;

  if (typeof window !== "undefined") {
    try {
      await auth.authStateReady();
      const user = auth.currentUser;
      if (user) {
        token = await getIdToken(user);
      }
    } catch {
      // Ignore errors when fetching token
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options?.headers as Record<string, string>) || {}),
  };

  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = `API error: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.detail) errorMsg = errorData.detail;
    } catch {
      // response body wasn't JSON
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export async function uploadMultipart<T>(
  endpoint: string,
  formData: FormData,
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  let token: string | undefined = undefined;

  if (typeof window !== "undefined") {
    try {
      await auth.authStateReady();
      const user = auth.currentUser;
      if (user) {
        token = await getIdToken(user);
      }
    } catch {
      // Ignore errors when fetching token
    }
  }

  const headers: Record<string, string> = {};

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: "POST",
    body: formData,
    headers,
  });

  if (!response.ok) {
    let errorMsg = `API error: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.detail) errorMsg = errorData.detail;
    } catch {
      // response body wasn't JSON
    }
    throw new Error(errorMsg);
  }

  return response.json();
}
