export function useSession() {
  return {
    data: {
      user: {
        name: "Vivek Chaurasiya",
        email: "vivek@astrafinance.com",
        image: null
      }
    },
    status: "authenticated"
  };
}

export function signOut(options?: { callbackUrl?: string }) {
  if (options?.callbackUrl) {
    window.location.href = options.callbackUrl;
  } else {
    window.location.href = "/login";
  }
}
