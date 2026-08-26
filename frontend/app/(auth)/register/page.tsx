"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth, googleProvider, githubProvider } from "@/lib/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { AstraFinanceLogo } from "@/components/branding/AstraFinanceLogo";

import SolarLoader from "@/components/ui/solar-loader";

type FirebaseAuthError = {
  code?: string;
  message?: string;
};

const fadeUp: any = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
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

  const getFirebaseErrorMessage = (err: any): string => {
    const error = err as FirebaseAuthError;
    const code = error?.code || "";
    switch (code) {
      case "auth/email-already-in-use": return "Account exists. Please sign in.";
      case "auth/invalid-email": return "Valid email required.";
      case "auth/weak-password": return "Password must be at least 6 characters.";
      default: return error?.message || "An error occurred.";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAccepted) return;
    setLoading(true);
    setEmailError(false);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (userCredential.user) {
        await updateProfile(userCredential.user, { displayName: fullName });
      }
      toast.success("Account created successfully!");
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      const error = err as FirebaseAuthError;
      if (error.code === "auth/email-already-in-use") {
        setEmailError(true);
      } else {
        toast.error(getFirebaseErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: string) => {
    if (loading) return;
    setLoading(true);
    try {
      const authProvider = provider === "Google" ? googleProvider : githubProvider;
      await signInWithPopup(auth, authProvider);
      toast.success("Successfully logged in!");
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      toast.error(getFirebaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-background items-center justify-center p-4 sm:p-6 lg:p-8 font-sans transition-theme overflow-hidden">
      
      {/* Outer Application Window */}
      <div className="w-full max-w-[1440px] h-full max-h-[800px] bg-card rounded-[24px] lg:rounded-[32px] shadow-sm border border-border overflow-hidden flex flex-col lg:flex-row relative transition-theme">
        
        {/* ======================================================== */}
        {/* LEFT PANEL: FORM (48% width on desktop) */}
        {/* ======================================================== */}
        <div className="w-full lg:w-[48%] xl:w-[45%] h-full flex flex-col items-center justify-center bg-background-secondary p-4 sm:p-6 lg:p-8 overflow-y-auto overflow-x-hidden relative z-10 transition-theme [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          
          <motion.div 
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: { opacity: 1, transition: { staggerChildren: 0.08 } }
            }}
            className="w-full max-w-[460px] bg-card rounded-[32px] shadow-sm border border-border-subtle p-6 sm:p-8 flex flex-col"
          >
            {/* Logo */}
            <motion.div variants={fadeUp} className="flex flex-col items-center mb-4">
              <Link href="/" aria-label="AstraFinance home" className="flex flex-col items-center">
                <AstraFinanceLogo className="h-12 w-12" />
              </Link>
            </motion.div>

            <motion.div variants={fadeUp} className="mb-4 text-center">
              <h2 className="text-[24px] sm:text-[28px] font-extrabold text-foreground tracking-tight transition-theme">Create your account</h2>
            </motion.div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              
              {/* Full Name */}
              <motion.div variants={fadeUp} className="flex flex-col gap-1.5">
                <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Jane Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  disabled={loading}
                  className="h-[44px] px-4 rounded-xl bg-card border-border hover:border-border-strong text-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:border-primary transition-all text-[14px] shadow-sm"
                />
              </motion.div>

              {/* Email */}
              <motion.div variants={fadeUp} className="flex flex-col gap-1.5">
                <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Email Address</Label>
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
                      "h-[44px] px-4 rounded-xl transition-all text-[14px] placeholder:text-muted-foreground shadow-sm",
                      emailError
                        ? "border-destructive hover:border-destructive focus-visible:ring-0 focus-visible:border-destructive text-destructive"
                        : "bg-card border-border hover:border-border-strong text-foreground focus-visible:ring-0 focus-visible:border-primary"
                    )}
                  />
                  {emailError && <AlertCircle className="absolute right-4 top-[15px] w-4 h-4 text-destructive" />}
                </div>
                {emailError && (
                  <p className="text-[12px] font-medium text-destructive mt-1">
                    Email in use. <Link href="/login" className="underline hover:text-destructive">Log in instead</Link>
                  </p>
                )}
              </motion.div>

              {/* Password */}
              <motion.div variants={fadeUp} className="flex flex-col gap-1.5">
                <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Password</Label>
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
                    className="h-[44px] px-4 pr-12 rounded-xl bg-card border-border hover:border-border-strong text-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:border-primary transition-all text-[14px] shadow-sm tracking-[0.2em] font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1.5 w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-lg transition-colors"
                  >
                    {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
              </motion.div>

              {/* Terms Checkbox */}
              <motion.div variants={fadeUp} className="flex items-start gap-2 mt-0">
                <Checkbox
                  id="terms"
                  checked={termsAccepted}
                  onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                  className="mt-[3px] border-border data-[state=checked]:bg-foreground data-[state=checked]:border-foreground w-3.5 h-3.5 rounded-[4px] transition-theme"
                />
                <Label htmlFor="terms" className="text-[12px] leading-[1.5] text-muted-foreground cursor-pointer select-none">
                  I agree to the <Link href="#" className="text-primary font-semibold hover:text-primary transition-colors">Terms of Service</Link> and <Link href="#" className="text-primary font-semibold hover:text-primary transition-colors">Privacy Policy</Link>{"."}
                </Label>
              </motion.div>

              {/* Submit CTA */}
              <motion.div variants={fadeUp} className="mt-1">
                <button
                  type="submit"
                  disabled={!termsAccepted || loading}
                  className={cn(
                    "w-full h-[48px] flex items-center justify-center text-white font-semibold rounded-xl transition-all text-[14px]",
                    termsAccepted && !loading 
                      ? "bg-primary hover:bg-primary-hover active:scale-[0.98] shadow-sm hover:shadow-md hover:-translate-y-[1px]" 
                      : "bg-primary/50 text-white cursor-not-allowed shadow-none"
                  )}
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Create Account"
                  )}
                </button>
              </motion.div>
            </form>

            {/* Divider */}
            <motion.div variants={fadeUp} className="flex items-center my-5">
              <div className="flex-grow border-t border-border/80" />
              <span className="mx-4 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Or sign up with</span>
              <div className="flex-grow border-t border-border/80" />
            </motion.div>

            {/* OAuth Buttons */}
            <motion.div variants={fadeUp} className="flex gap-4">
              <button
                onClick={() => handleOAuth("Google")}
                disabled={loading}
                className="flex-1 h-[44px] flex items-center justify-center gap-2.5 bg-card border border-border text-foreground text-[13px] font-semibold rounded-xl hover:bg-surface hover:border-border-strong transition-all active:scale-[0.98] shadow-sm"
              >
                <GoogleIcon />
                Google
              </button>
              <button
                onClick={() => handleOAuth("GitHub")}
                disabled={loading}
                className="flex-1 h-[44px] flex items-center justify-center gap-2.5 bg-card border border-border text-foreground text-[13px] font-semibold rounded-xl hover:bg-surface hover:border-border-strong transition-all active:scale-[0.98] shadow-sm"
              >
                <GitHubIcon />
                GitHub
              </button>
            </motion.div>
          </motion.div>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="text-center text-[13px] text-muted-foreground mt-4">
            Already have an account? <Link href="/login" className="text-primary font-bold hover:text-primary transition-colors">Log In</Link>
          </motion.p>
        </div>

        {/* ======================================================== */}
        {/* RIGHT PANEL: 3D VISUAL AREA (52% width on desktop) */}
        {/* ======================================================== */}
        <div className="hidden lg:block lg:w-[52%] xl:w-[55%] h-full p-4 lg:p-5 xl:p-6 pl-0">
          <div className="w-full h-full bg-[#0C1B5B] rounded-[24px] relative overflow-hidden flex flex-col">
            
            {/* Visual Header */}
            <div className="absolute top-10 left-10 z-20">
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.8 }}
              >
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/10 backdrop-blur-md border border-white/10 text-cyan-300 text-[12px] font-bold uppercase tracking-wider mb-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  AstraFinance AI
                </div>
                <h3 className="text-[28px] xl:text-[36px] font-light text-white tracking-tight leading-[1.2] max-w-sm">
                  Institutional-grade <br/>
                  <span className="font-bold">financial intelligence.</span>
                </h3>
              </motion.div>
            </div>

            {/* Subtle Gradient Backdrops */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[120px] translate-y-1/3 -translate-x-1/4" />
            
            {/* 3D Solar Loader Scene */}
            <div className="absolute inset-0 z-10 flex items-center justify-center opacity-90 scale-[1.1] origin-center">
              <SolarLoader size={60} speed={1.2} />
            </div>

            {/* Bottom Graphic / Accents */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0C1B5B] to-transparent z-10 pointer-events-none" />
          </div>
        </div>
        
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}
