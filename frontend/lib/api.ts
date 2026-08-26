import { auth } from "./firebase";
import { getIdToken } from "firebase/auth";

export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "/api/backend").replace(/\/$/, "");

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

  let response: Response;
  const method = options?.method || "GET";
  
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (error: any) {
    if (error.name !== "AbortError") {
      console.warn(`[API] Backend unavailable\nmethod=${method}\nendpoint=${endpoint}\nreason=network_error`);
    }
    throw error;
  }

  // Token refresh logic
  if (!response.ok && response.status === 401 && typeof window !== "undefined" && auth.currentUser) {
    try {
      const freshToken = await getIdToken(auth.currentUser, true);
      headers["Authorization"] = `Bearer ${freshToken}`;
      response = await fetch(url, { ...options, headers });
    } catch {
      // Refresh failed silently
    }
  }

  if (!response.ok) {
    let errorMsg = `API error: ${response.status} ${response.statusText}`;
    
    if (response.status === 401) {
      errorMsg = "Authentication problem: Not authenticated";
      console.warn(`[API] Authentication required\nmethod=${method}\nendpoint=${endpoint}\nstatus=401`);
    } else if (response.status === 403) {
      errorMsg = "Authorization problem: Access denied";
      console.warn(`[API] Authorization required\nmethod=${method}\nendpoint=${endpoint}\nstatus=403`);
    } else if (response.status >= 500) {
      errorMsg = "Backend error: Server encountered an error";
      console.warn(`[API] Server error\nmethod=${method}\nendpoint=${endpoint}\nstatus=${response.status}`);
    } else if (response.status === 404) {
      console.warn(`[API] Not found\nmethod=${method}\nendpoint=${endpoint}\nstatus=404`);
    }

    try {
      const errorData = await response.json();
      if (errorData.detail) errorMsg = `${errorMsg} - ${errorData.detail}`;
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

  let response: Response;
  const method = "POST";
  try {
    response = await fetch(url, {
      method: "POST",
      body: formData,
      headers,
    });
  } catch (error) {
    console.warn(`[API] Backend unavailable\nmethod=${method}\nendpoint=${endpoint}\nreason=network_error`);
    throw error;
  }

  // Token refresh logic
  if (!response.ok && response.status === 401 && typeof window !== "undefined" && auth.currentUser) {
    try {
      const freshToken = await getIdToken(auth.currentUser, true);
      headers["Authorization"] = `Bearer ${freshToken}`;
      response = await fetch(url, { method: "POST", body: formData, headers });
    } catch {
      // Refresh failed
    }
  }

  if (!response.ok) {
    let errorMsg = `API error: ${response.status} ${response.statusText}`;
    
    if (response.status === 401) {
      errorMsg = "Authentication problem: Not authenticated";
      console.warn(`[API] Authentication required\nmethod=${method}\nendpoint=${endpoint}\nstatus=401`);
    } else if (response.status === 403) {
      errorMsg = "Authorization problem: Access denied";
      console.warn(`[API] Authorization required\nmethod=${method}\nendpoint=${endpoint}\nstatus=403`);
    } else if (response.status >= 500) {
      errorMsg = "Backend error: Server encountered an error";
      console.warn(`[API] Server error\nmethod=${method}\nendpoint=${endpoint}\nstatus=${response.status}`);
    }

    try {
      const errorData = await response.json();
      if (errorData.detail) errorMsg = `${errorMsg} - ${errorData.detail}`;
    } catch {
      // response body wasn't JSON
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export async function fetchBlob(
  endpoint: string,
  options?: RequestInit,
): Promise<Blob> {
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
    ...((options?.headers as Record<string, string>) || {}),
  };

  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let response: Response;
  const method = options?.method || "GET";
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (error) {
    console.warn(`[API] Backend unavailable\nmethod=${method}\nendpoint=${endpoint}\nreason=network_error`);
    throw error;
  }

  // Token refresh logic
  if (!response.ok && response.status === 401 && typeof window !== "undefined" && auth.currentUser) {
    try {
      const freshToken = await getIdToken(auth.currentUser, true);
      headers["Authorization"] = `Bearer ${freshToken}`;
      response = await fetch(url, { ...options, headers });
    } catch {
      // Silent
    }
  }

  if (!response.ok) {
    let errorMsg = `API error: ${response.status} ${response.statusText}`;
    
    if (response.status === 401) {
      errorMsg = "Authentication problem: Not authenticated";
      console.warn(`[API] Authentication required\nmethod=${method}\nendpoint=${endpoint}\nstatus=401`);
    } else if (response.status === 403) {
      errorMsg = "Authorization problem: Access denied";
      console.warn(`[API] Authorization required\nmethod=${method}\nendpoint=${endpoint}\nstatus=403`);
    } else if (response.status >= 500) {
      errorMsg = "Backend error: Server encountered an error";
      console.warn(`[API] Server error\nmethod=${method}\nendpoint=${endpoint}\nstatus=${response.status}`);
    }

    try {
      const errorData = await response.json();
      if (errorData.detail) errorMsg = `${errorMsg} - ${errorData.detail}`;
    } catch {
      // response body wasn't JSON
    }
    throw new Error(errorMsg);
  }

  return response.blob();
}
