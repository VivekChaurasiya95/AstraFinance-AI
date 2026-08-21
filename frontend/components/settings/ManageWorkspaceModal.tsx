import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, AlertCircle } from "lucide-react";
import { Workspace, WorkspaceDefaults } from "@/hooks/useWorkspaceSettings";

interface ManageWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspace: Workspace | null;
  onSave: (updates: { name?: string; description?: string; defaults?: WorkspaceDefaults }) => Promise<any>;
}

export function ManageWorkspaceModal({ isOpen, onClose, workspace, onSave }: ManageWorkspaceModalProps) {
  const [name, setName] = useState(workspace?.name || "");
  const [description, setDescription] = useState(workspace?.description || "");
  const [aiProvider, setAiProvider] = useState(workspace?.defaults?.ai_provider || "Groq");
  const [responseStyle, setResponseStyle] = useState(workspace?.defaults?.response_style || "Professional");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update local state if workspace changes
  useEffect(() => {
    if (workspace) {
      setName(workspace.name);
      setDescription(workspace.description);
      setAiProvider(workspace.defaults?.ai_provider || "Groq");
      setResponseStyle(workspace.defaults?.response_style || "Professional");
    }
  }, [workspace]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    try {
      setLoading(true);
      setError(null);
      await onSave({
        name,
        description,
        defaults: {
          ai_provider: aiProvider,
          response_style: responseStyle
        }
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to update workspace.");
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
              className="bg-card rounded-2xl shadow-xl w-full max-w-[520px] pointer-events-auto overflow-hidden border border-border"
            >
              <div className="flex items-center justify-between p-5 border-b border-border-subtle">
                <h2 className="text-[17px] font-bold text-foreground">Manage Workspace</h2>
                <button 
                  onClick={onClose}
                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-surface rounded-lg transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5">
                {error && (
                  <div className="mb-4 p-3 bg-destructive/10 border border-red-100 text-destructive rounded-lg text-sm flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <p>{error}</p>
                  </div>
                )}
                
                <div className="space-y-5">
                  <div>
                    <label className="block text-[13px] font-semibold text-foreground mb-1.5">Workspace Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full h-[36px] px-3 bg-surface border border-border rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-primary transition-all"
                      placeholder="e.g. Vertex Analysis"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-[13px] font-semibold text-foreground mb-1.5">Description (Optional)</label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full h-[36px] px-3 bg-surface border border-border rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-primary transition-all"
                      placeholder="What is this workspace for?"
                    />
                  </div>

                  <div className="pt-4 border-t border-border-subtle">
                    <h3 className="text-[14px] font-bold text-foreground mb-3">Workspace Defaults</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[12px] font-medium text-muted-foreground mb-1.5">Default AI Provider</label>
                        <select
                          value={aiProvider}
                          onChange={(e) => setAiProvider(e.target.value)}
                          className="w-full h-[34px] px-2.5 bg-surface border border-border rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-primary"
                        >
                          <option value="Groq">Groq</option>
                          <option value="OpenAI">OpenAI</option>
                          <option value="Anthropic">Anthropic</option>
                          <option value="Google">Google</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-[12px] font-medium text-muted-foreground mb-1.5">Response Style</label>
                        <select
                          value={responseStyle}
                          onChange={(e) => setResponseStyle(e.target.value)}
                          className="w-full h-[34px] px-2.5 bg-surface border border-border rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-primary"
                        >
                          <option value="Professional">Professional</option>
                          <option value="Concise">Concise</option>
                          <option value="Detailed">Detailed</option>
                          <option value="Analytical">Analytical</option>
                        </select>
                      </div>
                    </div>
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
                    disabled={loading || !name.trim()}
                    className="h-[34px] px-4 flex items-center gap-1.5 text-[13px] font-semibold text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    {loading ? "Saving..." : "Save Changes"}
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
