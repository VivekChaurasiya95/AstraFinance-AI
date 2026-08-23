import { auth } from "./firebase";
import { getIdToken } from "firebase/auth";

let baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

if (typeof window !== "undefined") {
  const host = window.location.hostname;
  if (host !== "localhost" && host !== "127.0.0.1") {
    const portMatch = baseUrl.match(/:(\d+)/);
    const backendPort = portMatch ? portMatch[1] : "8000";
    baseUrl = `http://${host}:${backendPort}/api/v1`;
  }
}

export const API_BASE_URL = baseUrl.replace(/\/$/, "");

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
  console.debug("[AgentOrchestration] API request:", url);
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (error) {
    const method = options?.method || "GET";
    console.warn(`[API] Backend unavailable\nmethod=${method}\nendpoint=${endpoint}\nreason=network_error`);
    throw error;
  }

  // Token refresh logic
  if (!response.ok && response.status === 401 && typeof window !== "undefined" && auth.currentUser) {
    console.warn(`[API] 401 on ${url}, attempting token refresh...`);
    try {
      const freshToken = await getIdToken(auth.currentUser, true);
      headers["Authorization"] = `Bearer ${freshToken}`;
      response = await fetch(url, { ...options, headers });
    } catch (refreshError) {
      console.warn(`[API] Token refresh failed:`, refreshError);
    }
  }

  if (!response.ok) {
    let errorMsg = `API error: ${response.status} ${response.statusText}`;
    const method = options?.method || "GET";
    
    if (response.status === 401) {
      errorMsg = "Authentication problem: Not authenticated";
      console.warn(`[API] Authentication required\nmethod=${method}\nendpoint=${endpoint}\nstatus=401`);
    } else if (response.status === 403) {
      errorMsg = "Authorization problem: Access denied";
      console.warn(`[API] Authorization required\nmethod=${method}\nendpoint=${endpoint}\nstatus=403`);
    } else if (response.status >= 500) {
      errorMsg = "Backend error: Server encountered an error";
      console.error(`[API] Server error\nmethod=${method}\nendpoint=${endpoint}\nstatus=${response.status}`);
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
  try {
    response = await fetch(url, {
      method: "POST",
      body: formData,
      headers,
    });
  } catch (error) {
    console.warn(`[API] Backend unavailable\nmethod=POST\nendpoint=${endpoint}\nreason=network_error`);
    throw error;
  }

  // Token refresh logic
  if (!response.ok && response.status === 401 && typeof window !== "undefined" && auth.currentUser) {
    console.warn(`[API] 401 on ${url}, attempting token refresh...`);
    try {
      const freshToken = await getIdToken(auth.currentUser, true);
      headers["Authorization"] = `Bearer ${freshToken}`;
      response = await fetch(url, { method: "POST", body: formData, headers });
    } catch (refreshError) {
      console.warn("[API] Token refresh failed:", refreshError);
    }
  }

  if (!response.ok) {
    let errorMsg = `API error: ${response.status} ${response.statusText}`;
    
    if (response.status === 401) {
      errorMsg = "Authentication problem: Not authenticated";
      console.warn(`[API] Authentication required\nmethod=POST\nendpoint=${endpoint}\nstatus=401`);
    } else if (response.status >= 500) {
      errorMsg = "Backend error: Server encountered an error";
      console.error(`[API] Server error\nmethod=POST\nendpoint=${endpoint}\nstatus=${response.status}`);
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
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (error) {
    const method = options?.method || "GET";
    console.warn(`[API] Backend unavailable\nmethod=${method}\nendpoint=${endpoint}\nreason=network_error`);
    throw error;
  }

  // Token refresh logic
  if (!response.ok && response.status === 401 && typeof window !== "undefined" && auth.currentUser) {
    console.warn(`[API] 401 on ${url}, attempting token refresh...`);
    try {
      const freshToken = await getIdToken(auth.currentUser, true);
      headers["Authorization"] = `Bearer ${freshToken}`;
      response = await fetch(url, { ...options, headers });
    } catch (refreshError) {
      console.warn("[API] Token refresh failed:", refreshError);
    }
  }

  if (!response.ok) {
    let errorMsg = `API error: ${response.status} ${response.statusText}`;
    const method = options?.method || "GET";
    
    if (response.status === 401) {
      errorMsg = "Authentication problem: Not authenticated";
      console.warn(`[API] Authentication required\nmethod=${method}\nendpoint=${endpoint}\nstatus=401`);
    } else if (response.status >= 500) {
      errorMsg = "Backend error: Server encountered an error";
      console.error(`[API] Server error\nmethod=${method}\nendpoint=${endpoint}\nstatus=${response.status}`);
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
