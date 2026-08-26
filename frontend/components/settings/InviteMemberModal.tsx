import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, AlertCircle } from "lucide-react";

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (email: string, role: string) => Promise<void>;
  workspaceName: string;
}

export function InviteMemberModal({ isOpen, onClose, onInvite, workspaceName }: InviteMemberModalProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Editor");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) return;
    
    try {
      setLoading(true);
      setError(null);
      await onInvite(email, role);
      setEmail("");
      setRole("Editor");
      onClose();
    } catch (err: any) {
      setError((err instanceof Error ? err.message : String(err)) || "Failed to invite member.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/25 z-50 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ duration: 0.2 }}
              className="bg-card rounded-2xl shadow-xl w-full max-w-[480px] pointer-events-auto overflow-hidden border border-border"
            >
              <div className="flex items-center justify-between p-5 border-b border-border-subtle">
                <h2 className="text-[17px] font-bold text-foreground">Invite Members</h2>
                <button 
                  onClick={onClose}
                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-surface rounded-lg transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5">
                <p className="text-[13px] text-muted-foreground mb-5">
                  Invite someone to collaborate on <span className="font-semibold text-foreground">{workspaceName}</span>.
                </p>
                
                {error && (
                  <div className="mb-4 p-3 bg-destructive/10 border border-red-100 text-destructive rounded-lg text-[13px] flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <p>{error}</p>
                  </div>
                )}
                
                <div className="space-y-5">
                  <div>
                    <label className="block text-[13px] font-semibold text-foreground mb-1.5">Email address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-[36px] px-3 bg-surface border border-border rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-primary transition-all"
                      placeholder="colleague@example.com"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-[13px] font-semibold text-foreground mb-1.5">Role</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full h-[36px] px-3 bg-surface border border-border rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-primary transition-all"
                    >
                      <option value="Viewer">Viewer - Can only view results</option>
                      <option value="Editor">Editor - Can run agents and manage documents</option>
                      <option value="Admin">Admin - Full access to workspace settings</option>
                    </select>
                  </div>
                </div>

                <div className="mt-8 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="h-[34px] px-4 text-[13px] font-semibold text-muted-foreground bg-card border border-border rounded-lg hover:bg-surface transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !email.trim() || !email.includes("@")}
                    className="h-[34px] px-4 flex items-center gap-1.5 text-[13px] font-semibold text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    {loading ? "Sending..." : "Send Invitation"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
