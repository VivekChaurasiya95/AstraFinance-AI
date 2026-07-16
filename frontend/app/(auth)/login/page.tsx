"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { auth, googleProvider, githubProvider } from "@/lib/firebase";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type FirebaseAuthError = {
  code?: string;
  message?: string;
};

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const getFirebaseErrorMessage = (err: unknown): string => {
    const error = err as FirebaseAuthError;
    const code = error?.code || "";
    switch (code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        return "Invalid email or password. Please try again.";
      case "auth/too-many-requests":
        return "Too many failed attempts. Please try again later.";
      case "auth/user-disabled":
        return "This account has been disabled.";
      case "auth/network-request-failed":
        return "Network error. Please check your connection.";
      case "auth/popup-closed-by-user":
        return "Sign-in popup was closed. Please try again.";
      case "auth/cancelled-popup-request":
        return ""; // User cancelled, no need to show error
      case "auth/account-exists-with-different-credential":
        return "An account already exists with the same email but a different sign-in method.";
      default:
        return error?.message || "An unexpected error occurred.";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      toast.success("Successfully logged in!");
      router.push(callbackUrl);
      router.refresh();
    } catch (err: unknown) {
      const msg = getFirebaseErrorMessage(err);
      if (msg) toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: string) => {
    try {
      const authProvider =
        provider === "Google" ? googleProvider : githubProvider;
      await signInWithPopup(auth, authProvider);
      toast.success("Successfully logged in!");
      router.push(callbackUrl);
      router.refresh();
    } catch (err: unknown) {
      const msg = getFirebaseErrorMessage(err);
      if (msg) toast.error(msg);
    }
  };

  return (
    <div className="bg-slate-50 text-slate-900 min-h-screen flex items-center justify-center relative overflow-hidden font-sans">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 pointer-events-none" />

      {/* Decorative background circles */}
      <div className="absolute top-0 right-0 w-96 h-96 -translate-y-1/2 translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 translate-y-1/2 -translate-x-1/2 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

      {/* Centered Auth Card */}
      <main className="w-full max-w-[420px] px-6 relative z-10 animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200 flex flex-col gap-6">
          {/* Header */}
          <div className="text-center flex flex-col gap-2 items-center">
            <Link
              href="/"
              className="h-16 w-auto mb-2 flex items-center justify-center cursor-pointer"
            >
              <Image
                alt="AstraFinance AI Logo"
                className="h-16 w-auto object-contain"
                height={64}
                width={64}
                unoptimized
                priority
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDHTeJtTNNmIDRKtXzrDbdUcEscRsdbSrQ1rXU46QeWbkEBYIbYJbjfKiHDq1KBUofieyE9PYcYvrSh69qSi4WRTQ2m_S4YVLrGg5PBXmU5EtRC1edRXc4ERfDjO32-bkbwAYlQv0iCQ0UcU6RukW0bd0EqRxoc9r-sh4t-nqpOJ3smwrfxzCg9jNsj2gb0Thw-NtmO4skiiCLfeOMSiCnHBZ7OZeVksbTAzr7JQHqKelJyIiufN4NN2hIO7OXsNc2_IQ"
              />
            </Link>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
              Welcome Back
            </h1>
            <p className="text-sm font-medium text-slate-500">
              Please enter your details to log in.
            </p>
          </div>

          {/* Form */}
          <form className="flex flex-col gap-5 mt-2" onSubmit={handleSubmit}>
            {/* Email */}
            <div className="flex flex-col gap-2">
              <Label
                htmlFor="email"
                className="text-xs font-bold text-slate-500 tracking-widest uppercase"
              >
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="h-11 px-4 rounded-md border-slate-300 bg-white text-slate-900 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-colors"
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <Label
                  htmlFor="password"
                  className="text-xs font-bold text-slate-500 tracking-widest uppercase"
                >
                  Password
                </Label>
                <Link
                  href="#"
                  className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors focus:outline-none focus:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="h-11 px-4 pr-10 rounded-md border-slate-300 bg-white text-slate-900 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-colors"
                />
                <button
                  type="button"
                  aria-label="Toggle password visibility"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors focus:outline-none flex items-center justify-center"
                >
                  {showPassword ? (
                    <Eye className="w-5 h-5" />
                  ) : (
                    <EyeOff className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 mt-2 bg-blue-700 text-white text-base font-medium rounded-md hover:bg-blue-800 transition-all focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Logging in..." : "Log In"}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center mt-2">
            <div className="flex-grow border-t border-slate-200" />
            <span className="mx-3 text-xs font-medium text-slate-400 uppercase tracking-widest select-none">
              Or continue with
            </span>
            <div className="flex-grow border-t border-slate-200" />
          </div>

          {/* OAuth Buttons */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOAuth("Google")}
              className="flex-1 h-11 gap-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all font-medium rounded-md"
            >
              <GoogleIcon />
              Google
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOAuth("GitHub")}
              className="flex-1 h-11 gap-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all font-medium rounded-md"
            >
              <GitHubIcon />
              GitHub
            </Button>
          </div>
        </div>

        {/* Footer Link */}
        <p className="text-center text-sm text-slate-600 mt-8">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="text-blue-600 hover:text-blue-800 font-semibold transition-colors focus:outline-none focus:underline"
          >
            Register
          </Link>
        </p>
      </main>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("w-5 h-5", className)}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("w-5 h-5", className)}
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
