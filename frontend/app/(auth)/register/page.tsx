"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { auth, googleProvider, githubProvider } from "@/lib/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type FirebaseAuthError = {
  code?: string;
  message?: string;
};

export default function RegisterPage() {
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState(false);

  // In a real app, this would be determined by a password strength calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return 0;
    if (pass.length < 5) return 1;
    if (pass.length < 8) return 2;
    if (pass.length < 12) return 3;
    return 4;
  };

  const getPasswordStrengthLabel = (strength: number) => {
    if (strength === 0) return "";
    if (strength === 1) return "Weak";
    if (strength === 2) return "Fair";
    if (strength === 3) return "Good";
    return "Strong";
  };

  const passwordStrength = getPasswordStrength(password);
  const passwordStrengthLabel = getPasswordStrengthLabel(passwordStrength);

  const getFirebaseErrorMessage = (err: unknown): string => {
    const error = err as FirebaseAuthError;
    const code = error?.code || "";
    switch (code) {
      case "auth/email-already-in-use":
        return ""; // Handled separately via setEmailError
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/weak-password":
        return "Password must be at least 6 characters.";
      case "auth/too-many-requests":
        return "Too many attempts. Please try again later.";
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
    if (!termsAccepted) return;

    setLoading(true);
    setEmailError(false);

    try {
      const normalizedEmail = email.trim();
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        normalizedEmail,
        password,
      );
      // Update display name
      if (userCredential.user) {
        await updateProfile(userCredential.user, { displayName: fullName });
      }
      toast.success("Account created successfully!");
      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      const error = err as FirebaseAuthError;
      if (error.code === "auth/email-already-in-use") {
        setEmailError(true);
      } else {
        const msg = getFirebaseErrorMessage(err);
        if (msg) toast.error(msg);
      }
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
      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      const msg = getFirebaseErrorMessage(err);
      if (msg) toast.error(msg);
    }
  };

  return (
    <div className="bg-slate-50 text-slate-900 min-h-screen flex items-center justify-center relative overflow-hidden font-sans py-12">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 pointer-events-none" />

      {/* Decorative background circles */}
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-blue-500/5 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />

      {/* Centered Auth Card */}
      <main className="w-full max-w-[420px] px-6 relative z-10 animate-in fade-in-0 zoom-in-95 duration-500">
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
              Create your account
            </h1>
          </div>

          {/* Form */}
          <form className="flex flex-col gap-5 mt-2" onSubmit={handleSubmit}>
            {/* Full Name */}
            <div className="flex flex-col gap-2">
              <Label
                htmlFor="fullName"
                className="text-xs font-bold text-slate-500 tracking-widest uppercase"
              >
                Full Name
              </Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Jane Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={loading}
                className="h-11 px-4 rounded-md border-slate-300 bg-white text-slate-900 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-colors"
              />
            </div>

            {/* Email */}
            <div className="flex flex-col gap-2">
              <Label
                htmlFor="email"
                className="text-xs font-bold text-slate-500 tracking-widest uppercase"
              >
                Email Address
              </Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError(false);
                  }}
                  required
                  disabled={loading}
                  className={cn(
                    "h-11 px-4 rounded-md transition-colors text-slate-900",
                    emailError
                      ? "pr-10 border-red-500 bg-red-50/50 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:border-red-500"
                      : "border-slate-300 bg-white focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500",
                  )}
                />
                {emailError && (
                  <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500 pointer-events-none" />
                )}
              </div>
              {emailError && (
                <p className="text-xs font-medium text-red-500 mt-1">
                  This email is already registered.{" "}
                  <Link
                    href="/login"
                    className="font-semibold underline hover:text-red-700 transition-colors"
                  >
                    Log In instead
                  </Link>
                </p>
              )}
            </div>

            {/* Password */}
            <div className="flex flex-col gap-2">
              <Label
                htmlFor="password"
                className="text-xs font-bold text-slate-500 tracking-widest uppercase"
              >
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  minLength={6}
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

              {/* Password Strength Meter - Only shown when typing password */}
              {password.length > 0 && (
                <div className="flex flex-col gap-1 mt-1 animate-in fade-in slide-in-from-top-1">
                  <div className="flex gap-1 h-1">
                    <div
                      className={cn(
                        "h-full flex-1 rounded-full transition-colors",
                        passwordStrength >= 1 ? "bg-red-500" : "bg-slate-200",
                      )}
                    />
                    <div
                      className={cn(
                        "h-full flex-1 rounded-full transition-colors",
                        passwordStrength >= 2 ? "bg-amber-500" : "bg-slate-200",
                      )}
                    />
                    <div
                      className={cn(
                        "h-full flex-1 rounded-full transition-colors",
                        passwordStrength >= 3
                          ? "bg-emerald-500"
                          : "bg-slate-200",
                      )}
                    />
                    <div
                      className={cn(
                        "h-full flex-1 rounded-full transition-colors",
                        passwordStrength >= 4
                          ? "bg-emerald-500"
                          : "bg-slate-200",
                      )}
                    />
                  </div>
                  <p className="text-xs font-medium text-slate-500 text-right">
                    {passwordStrengthLabel}
                  </p>
                </div>
              )}
            </div>

            {/* Terms Checkbox */}
            <div className="flex items-start gap-2 mt-2">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={(checked) =>
                  setTermsAccepted(checked as boolean)
                }
                disabled={loading}
                className="mt-0.5 data-[state=checked]:bg-blue-700 data-[state=checked]:border-blue-700"
              />
              <Label
                htmlFor="terms"
                className="text-sm font-medium leading-tight text-slate-600 cursor-pointer select-none"
              >
                I agree to the{" "}
                <Link
                  href="#"
                  className="text-blue-600 hover:text-blue-800 transition-colors focus:outline-none focus:underline"
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  href="#"
                  className="text-blue-600 hover:text-blue-800 transition-colors focus:outline-none focus:underline"
                >
                  Privacy Policy
                </Link>
              </Label>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={!termsAccepted || loading}
              className="w-full h-11 mt-2 bg-blue-700 text-white text-base font-medium rounded-md hover:bg-blue-800 transition-all focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center mt-2">
            <div className="flex-grow border-t border-slate-200" />
            <span className="mx-3 text-xs font-medium text-slate-400 uppercase tracking-widest select-none">
              Or sign up with
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
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-blue-600 hover:text-blue-800 font-semibold transition-colors focus:outline-none focus:underline"
          >
            Log In
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
