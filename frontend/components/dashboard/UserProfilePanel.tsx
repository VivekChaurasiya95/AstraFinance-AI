"use client";

import { useState, useRef } from "react";
import { User, Mail, LogOut, Check, Edit2, Upload, Trash, Image as ImageIcon } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { fetcher } from "@/lib/api";
import { toast } from "sonner"; // Assuming sonner is used for toasts, standard in new nextjs

interface UserProfilePanelProps {
  onClose: () => void;
  onSignOut: () => void;
}

export function UserProfilePanel({ onClose, onSignOut }: UserProfilePanelProps) {
  const { user: firebaseUser, dbUser } = useAuth();
  
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(dbUser?.name || firebaseUser?.displayName || "");
  const [email, setEmail] = useState(dbUser?.email || firebaseUser?.email || "");
  
  // Loading states
  const [isSavingName, setIsSavingName] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleNameSave = async () => {
    if (name === (dbUser?.name || firebaseUser?.displayName)) {
      setIsEditing(false);
      return;
    }
    
    setIsSavingName(true);
    try {
      await fetcher("/auth/profile/name", {
        method: "PUT",
        body: JSON.stringify({ name })
      });
      // Not updating NextAuth session anymore
      toast?.success && toast.success("Name updated successfully");
      setIsEditing(false);
    } catch (error: any) {
      toast?.error && toast.error(error.message || "Failed to update name");
    } finally {
      setIsSavingName(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert to base64
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setIsUploadingPhoto(true);
      try {
        await fetcher("/auth/profile/photo", {
          method: "PUT",
          body: JSON.stringify({ photo_base64: base64 })
        });
        toast?.success && toast.success("Profile photo updated");
      } catch (error: any) {
        toast?.error && toast.error("Failed to upload photo");
      } finally {
        setIsUploadingPhoto(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = async () => {
    try {
      await fetcher("/auth/profile/photo", {
        method: "DELETE"
      });
      toast?.success && toast.success("Profile photo removed");
    } catch (error: any) {
      toast?.error && toast.error("Failed to remove photo");
    }
  };

  const userImage = dbUser?.profile_picture || firebaseUser?.photoURL;
  const userName = dbUser?.name || firebaseUser?.displayName || "User";
  const userEmail = dbUser?.email || firebaseUser?.email || "email@example.com";

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute top-14 right-8 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
        <div className="p-5 border-b border-slate-100 bg-slate-50 flex flex-col gap-4">
          
          <div className="flex items-start gap-4">
            <div className="relative group shrink-0">
              {userImage ? (
                <img src={userImage} alt="Profile" className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-blue-900 text-white flex items-center justify-center font-bold text-lg">
                  {userName.charAt(0).toUpperCase()}
                </div>
              )}
              {isEditing && (
                <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                  <button onClick={() => fileInputRef.current?.click()} className="text-white hover:text-blue-200 p-1">
                    <Upload className="w-3.5 h-3.5" />
                  </button>
                  {userImage && (
                    <button onClick={handleRemovePhoto} className="text-white hover:text-red-300 p-1">
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/png, image/jpeg" 
                onChange={handlePhotoUpload} 
              />
            </div>
            
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold uppercase mb-1 block">Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {name !== userName && (
                      <button
                        onClick={handleNameSave}
                        disabled={isSavingName}
                        className="mt-1 text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 flex items-center gap-1 ml-auto"
                      >
                        {isSavingName ? "Saving..." : <><Check className="w-3 h-3" /> Save Name</>}
                      </button>
                    )}
                  </div>
                  
                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold uppercase mb-1 block">Email (Cannot be changed)</label>
                    <input
                      type="email"
                      value={email}
                      disabled
                      className="w-full px-2 py-1.5 text-sm border border-slate-200 bg-slate-50 text-slate-500 rounded cursor-not-allowed"
                    />
                  </div>

                  <div className="flex justify-end mt-2 pt-2 border-t border-slate-200">
                    <button
                      onClick={() => {
                        setName(userName);
                        setIsEditing(false);
                      }}
                      className="text-xs text-slate-500 hover:text-slate-700 font-medium"
                    >
                      Done Editing
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="font-semibold text-slate-900 truncate">{userName}</div>
                  <div className="text-sm text-slate-500 truncate">{userEmail}</div>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-xs text-blue-600 hover:underline mt-1 flex items-center gap-1"
                  >
                    <Edit2 className="w-3 h-3" /> Edit Profile
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-2">
          <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors">
            <User className="w-4 h-4" /> My Account
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors">
            <Mail className="w-4 h-4" /> Notification Preferences
          </button>
          <div className="h-px bg-slate-100 my-1 mx-2" />
          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>
    </>
  );
}
