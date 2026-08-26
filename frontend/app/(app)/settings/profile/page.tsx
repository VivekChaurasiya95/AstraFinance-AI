"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { SettingsSection } from "@/components/settings/SettingsSection";
import {
  Loader2,
  Camera,
  Save,
  CheckCircle2,
  Upload,
  Trash2,
  AlertCircle,
  Shield,
  Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect, useCallback } from "react";
import { fetcher } from "@/lib/api";

type SaveState = "idle" | "saving" | "saved" | "error";

export default function ProfileConfigurationPage() {
  const { user, dbUser, loading, updateDbUser } = useAuth();

  // ── Form state ──
  const [name, setName] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync form state when dbUser loads/changes
  useEffect(() => {
    if (dbUser) {
      setName(dbUser.name || user?.displayName || "");
    } else if (user) {
      setName(user.displayName || "");
    }
  }, [dbUser, user]);

  // ── Derived values ──
  const originalName = dbUser?.name || user?.displayName || "";
  const hasUnsavedChanges = name.trim() !== originalName;
  const userInitials = (name || "U").charAt(0).toUpperCase();
  const profilePicture = dbUser ? dbUser.profile_picture : (user?.photoURL || null);

  // ── Unsaved changes warning ──
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);

  // ── Handlers ──
  const handleSaveName = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError("Name cannot be empty.");
      return;
    }
    if (trimmed.length > 100) {
      setNameError("Name must be under 100 characters.");
      return;
    }
    setNameError(null);

    try {
      setSaveState("saving");
      await fetcher("/auth/profile/name", {
        method: "PUT",
        body: JSON.stringify({ name: trimmed }),
      });
      updateDbUser({ name: trimmed });
      setName(trimmed);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2500);
    } catch (e: any) {
      console.error(e);
      setSaveState("error");
      setNameError((e instanceof Error ? e.message : String(e)) || "Failed to save name.");
      setTimeout(() => setSaveState("idle"), 3000);
    }
  }, [name, updateDbUser]);

  const handlePhotoUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Reset input so the same file can be re-selected
      e.target.value = "";

      // Validate type
      const validTypes = [
        "image/png",
        "image/jpeg",
        "image/gif",
        "image/webp",
      ];
      if (!validTypes.includes(file.type)) {
        setPhotoError("Only PNG, JPG, GIF or WEBP files are supported.");
        return;
      }

      // Validate size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setPhotoError("Image must be under 5 MB.");
        return;
      }

      setPhotoError(null);
      setPhotoUploading(true);

      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        try {
          await fetcher("/auth/profile/photo", {
            method: "PUT",
            body: JSON.stringify({ photo_base64: base64 }),
          });
          updateDbUser({ profile_picture: base64 });
        } catch (err: any) {
          setPhotoError((err instanceof Error ? err.message : String(err)) || "Failed to upload photo.");
        } finally {
          setPhotoUploading(false);
        }
      };
      reader.onerror = () => {
        setPhotoError("Failed to read file.");
        setPhotoUploading(false);
      };
      reader.readAsDataURL(file);
    },
    [updateDbUser]
  );

  const handleRemovePhoto = useCallback(async () => {
    setPhotoError(null);
    setPhotoUploading(true);
    try {
      await fetcher("/auth/profile/photo", { method: "DELETE" });
      updateDbUser({ profile_picture: null });
    } catch (err: any) {
      setPhotoError((err instanceof Error ? err.message : String(err)) || "Failed to remove photo.");
    } finally {
      setPhotoUploading(false);
    }
  }, [updateDbUser]);

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10 relative">
      {/* Page header */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <h2 className="text-xl font-extrabold text-foreground">Profile</h2>
          <p className="text-muted-foreground text-xs font-medium mt-0.5">
            Manage your personal information and profile photo.
          </p>
        </div>

        {/* Save status indicator */}
        <div className="h-7">
          <AnimatePresence mode="wait">
            {saveState === "saving" && (
              <motion.div
                key="saving"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground bg-surface px-3 py-1.5 rounded-full"
              >
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…
              </motion.div>
            )}
            {saveState === "saved" && (
              <motion.div
                key="saved"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1.5 text-xs font-bold text-success bg-success/10 border border-emerald-100 px-3 py-1.5 rounded-full"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Saved
              </motion.div>
            )}
            {saveState === "error" && (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1.5 text-xs font-bold text-destructive bg-destructive/10 border border-red-100 px-3 py-1.5 rounded-full"
              >
                <AlertCircle className="w-3.5 h-3.5" /> Error
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ─── Profile Photo Section ─── */}
      <SettingsSection
        title="Profile Photo"
        description="Your photo helps others identify you across the platform."
      >
        <div className="flex items-center gap-5">
          {/* Avatar */}
          <div className="relative group shrink-0">
            <motion.div
              className="w-[88px] h-[88px] rounded-2xl overflow-hidden ring-[3px] ring-slate-100 shadow-sm"
              whileHover={{ scale: 1.03 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              {profilePicture ? (
                <img
                  src={profilePicture}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center font-bold text-3xl">
                  {userInitials}
                </div>
              )}

              {/* Hover overlay */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={photoUploading}
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl cursor-pointer"
              >
                {photoUploading ? (
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                ) : (
                  <Camera className="w-5 h-5 text-white" />
                )}
              </button>
            </motion.div>
          </div>

          {/* Upload / Remove controls */}
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-foreground mb-0.5">
              Change Photo
            </h4>
            <p className="text-[11px] text-muted-foreground mb-2.5 leading-relaxed">
              PNG, JPG, GIF or WEBP — max 5 MB.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={photoUploading}
                className="text-xs font-bold bg-card border border-border px-3 py-1.5 rounded-lg hover:bg-primary/10 hover:border-primary/50 hover:text-primary transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                {photoUploading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Upload className="w-3 h-3" />
                )}
                Upload
              </button>
              {profilePicture && (
                <button
                  onClick={handleRemovePhoto}
                  disabled={photoUploading}
                  className="text-xs font-bold text-destructive hover:bg-destructive/10 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Trash2 className="w-3 h-3" /> Remove
                </button>
              )}
            </div>

            {/* Photo error */}
            <AnimatePresence>
              {photoError && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-[11px] text-destructive mt-2 flex items-center gap-1"
                >
                  <AlertCircle className="w-3 h-3 shrink-0" /> {photoError}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/png,image/jpeg,image/gif,image/webp"
            onChange={handlePhotoUpload}
          />
        </div>
      </SettingsSection>

      {/* ─── Personal Information Section ─── */}
      <SettingsSection
        title="Personal Information"
        description="Update your name. Email is tied to your OAuth provider."
      >
        <div className="space-y-5">
          {/* Full Name */}
          <div>
            <label htmlFor="profile-name" className="block text-xs font-bold text-foreground mb-1.5">
              Full Name
            </label>
            <input
              id="profile-name"
              type="text"
              value={name}
              placeholder="Enter your full name"
              onChange={(e) => {
                setName(e.target.value);
                setNameError(null);
              }}
              maxLength={100}
              className={`w-full max-w-[384px] h-[42px] border-2 rounded-xl px-3 text-sm font-medium outline-none shadow-sm transition-colors bg-background text-foreground ${nameError ? 'border-destructive focus:border-destructive' : 'border-border focus:border-primary'}`}
            />
            <AnimatePresence>
              {nameError && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-[11px] text-destructive mt-1.5 flex items-center gap-1"
                >
                  <AlertCircle className="w-3 h-3 shrink-0" /> {nameError}
                </motion.p>
              )}
            </AnimatePresence>
            {hasUnsavedChanges && !nameError && (
              <p className="text-[11px] text-amber-600 mt-1.5 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                You have unsaved changes
              </p>
            )}
          </div>

          {/* Email (read-only) */}
          <div>
            <label htmlFor="profile-email" className="block text-xs font-bold text-foreground mb-1.5">
              Email Address
            </label>
            <input
              id="profile-email"
              type="email"
              disabled
              value={user?.email || ""}
              placeholder="your@email.com"
              className="w-full max-w-[384px] h-[42px] border-2 border-border/50 rounded-xl px-3 text-sm font-medium text-muted-foreground bg-muted/50 cursor-not-allowed outline-none"
            />
            <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1">
              <Shield className="w-3 h-3 shrink-0" />
              Email is linked to your Google account and cannot be changed
              here.
            </p>
          </div>

          {/* Save button */}
          <div className="pt-3 flex items-center gap-3">
            <button
              onClick={handleSaveName}
              disabled={!hasUnsavedChanges || saveState === "saving"}
              className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-lg shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
            >
              {saveState === "saving" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Save Changes
            </button>
            {hasUnsavedChanges && (
              <button
                onClick={() => {
                  setName(originalName);
                  setNameError(null);
                }}
                className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2"
              >
                Discard
              </button>
            )}
          </div>
        </div>
      </SettingsSection>

      {/* ─── Account Details Section ─── */}
      <SettingsSection
        title="Account Details"
        description="Read-only information about your account."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-surface rounded-xl border border-border-subtle p-3">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-3.5 h-3.5 text-primary" />
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Provider
              </span>
            </div>
            <p className="text-sm font-semibold text-foreground">Google OAuth</p>
          </div>
          <div className="bg-surface rounded-xl border border-border-subtle p-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-3.5 h-3.5 text-primary" />
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Member Since
              </span>
            </div>
            <p className="text-sm font-semibold text-foreground">
              {user?.metadata?.creationTime
                ? new Date(user.metadata.creationTime).toLocaleDateString(
                    "en-US",
                    { month: "long", year: "numeric" }
                  )
                : "—"}
            </p>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}
