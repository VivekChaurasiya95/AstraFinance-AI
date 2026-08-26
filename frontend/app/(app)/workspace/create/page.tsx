"use client";

import { useState, useEffect, useCallback, useRef, DragEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Folder,
  Check,
  Upload,
  X,
  FileText,
  AlertCircle,
  ArrowRight,
  Loader2,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetcher, uploadMultipart } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────────
interface UploadedFile {
  id: string;
  file: File;
  status: "pending" | "uploading" | "done" | "error";
  progress: number;
  errorMsg?: string;
}

interface CreatedWorkspace {
  id: string;
  name: string;
}

// ── Drop Zone Component ────────────────────────────────────────────────────────
function DropZone({
  files,
  onAddFiles,
  onRemove,
}: {
  files: UploadedFile[];
  onAddFiles: (newFiles: File[]) => void;
  onRemove: (id: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const dropped = Array.from(e.dataTransfer.files).filter(
      (f) => f.type === "application/pdf",
    );
    if (dropped.length) onAddFiles(dropped);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Drop Area */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all",
          dragging
            ? "border-primary bg-primary/10"
            : "border-border hover:border-primary hover:bg-surface bg-card",
        )}
      >
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
          <Upload className="w-6 h-6 text-primary" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">
            {dragging ? "Drop PDFs here" : "Add documents to this workspace"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Upload one or more PDF files to get started with AI-powered
            financial analysis.
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            const selected = Array.from(e.target.files || []).filter(
              (f) => f.type === "application/pdf",
            );
            if (selected.length) onAddFiles(selected);
            // Reset input so same file can be re-added
            e.target.value = "";
          }}
        />
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="flex flex-col gap-2 max-h-52 overflow-y-auto pr-1">
          {files.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-3 bg-surface border border-border rounded-lg px-3 py-2.5"
            >
              <FileText className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {f.file.name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {f.status === "uploading" && (
                    <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${f.progress}%` }}
                      />
                    </div>
                  )}
                  {f.status === "done" && (
                    <span className="text-xs text-success font-medium flex items-center gap-1">
                      <Check className="w-3 h-3" /> Uploaded
                    </span>
                  )}
                  {f.status === "error" && (
                    <span className="text-xs text-destructive font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />{" "}
                      {f.errorMsg || "Failed"}
                    </span>
                  )}
                  {f.status === "pending" && (
                    <span className="text-xs text-muted-foreground">
                      {(f.file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  )}
                </div>
              </div>
              {(f.status === "pending" || f.status === "error") && (
                <button
                  onClick={() => onRemove(f.id)}
                  className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              {f.status === "done" && (
                <button
                  onClick={() => onRemove(f.id)}
                  className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              {f.status === "uploading" && (
                <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Create Workspace Page ─────────────────────────────────────────────────
export default function CreateWorkspacePage() {
  const router = useRouter();
  const nameCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [nameStatus, setNameStatus] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");
  const [createLoading, setCreateLoading] = useState(false);

  const [uploadFiles, setUploadFiles] = useState<UploadedFile[]>([]);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const descLimit = 500;

  // ── Name availability check (debounced) ──
  useEffect(() => {
    const trimmedName = name.trim();

    if (nameCheckTimeoutRef.current) clearTimeout(nameCheckTimeoutRef.current);

    const t = setTimeout(async () => {
      if (!trimmedName || trimmedName.length < 2) {
        setNameStatus("idle");
        return;
      }

      setNameStatus("checking");
      try {
        const res = await fetcher<{ available: boolean }>(
          `/workspaces/check-name?name=${encodeURIComponent(trimmedName)}`,
        );
        setNameStatus(res.available ? "available" : "taken");
      } catch {
        setNameStatus("idle");
      }
    }, 500);

    nameCheckTimeoutRef.current = t;
    return () => clearTimeout(t);
  }, [name]);

  // ── Create workspace and upload staged documents ──
  const handleCreateWorkspace = async () => {
    if (!name.trim() || nameStatus === "taken" || nameStatus === "checking")
      return;
    setCreateLoading(true);
    setSubmitError(null);
    try {
      const ws = await fetcher<CreatedWorkspace>("/workspaces", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
        }),
      });
      const pendingFiles = uploadFiles.filter((f) => f.status === "pending");

      if (pendingFiles.length > 0) {
        setUploadLoading(true);
        setUploadFiles((prev) =>
          prev.map((f) =>
            f.status === "pending"
              ? { ...f, status: "uploading", progress: 30 }
              : f,
          ),
        );

        try {
          const formData = new FormData();
          pendingFiles.forEach((f) => formData.append("files", f.file));

          await uploadMultipart<{ uploaded: any[] }>(
            `/workspaces/${ws.id}/documents`,
            formData,
          );

          setUploadFiles((prev) =>
            prev.map((f) =>
              f.status === "uploading"
                ? { ...f, progress: 100, status: "done" }
                : f,
            ),
          );
        } catch (uploadError) {
          setUploadFiles((prev) =>
            prev.map((f) =>
              f.status === "uploading"
                ? { ...f, status: "error", errorMsg: "Upload failed" }
                : f,
            ),
          );
          console.error("Failed to upload documents:", uploadError);
        } finally {
          setUploadLoading(false);
        }
      }

      router.push(`/workspace/${ws.id}`);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? (err instanceof Error ? err.message : String(err)) : "Failed to create workspace.",
      );
      console.error("Failed to create workspace:", err);
    } finally {
      setCreateLoading(false);
    }
  };

  // ── Add files ──
  const handleAddFiles = useCallback((newFiles: File[]) => {
    const mapped: UploadedFile[] = newFiles.map((f) => ({
      id: `${f.name}-${Date.now()}-${Math.random()}`,
      file: f,
      status: "pending",
      progress: 0,
    }));
    setUploadFiles((prev) => [...prev, ...mapped]);
  }, []);

  const handleRemoveFile = (id: string) => {
    setUploadFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const canProceedStep1 =
    name.trim().length >= 2 &&
    (nameStatus === "available" || nameStatus === "idle");

  const pendingCount = uploadFiles.filter((f) => f.status === "pending").length;

  return (
    <div className="min-h-screen bg-surface/60 flex items-start justify-center pt-8 pb-16 px-4">
      {/* Modal Card */}
      <div className="w-full max-w-3xl bg-card rounded-2xl shadow-xl border border-border overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-border-subtle">
          <h1 className="text-xl font-bold text-foreground">Create Workspace</h1>
          <button
            onClick={() => router.push("/workspace")}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-surface rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-8 py-7">
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Workspace Details
              </h2>
              <p className="text-sm text-muted-foreground">
                Create the workspace and optionally stage PDF uploads before you
                leave this screen.
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted-foreground">
              <Upload className="w-3.5 h-3.5" />
              Documents upload here, not on a follow-up step
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-xl p-6 flex flex-col gap-5">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Folder className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-bold text-foreground">
                    Workspace Details
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Give your workspace a name and description
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  Workspace Name <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" &&
                      canProceedStep1 &&
                      handleCreateWorkspace()
                    }
                    className={cn(
                      "w-full px-3 py-2.5 pr-9 rounded-lg border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all",
                      nameStatus === "taken"
                        ? "border-destructive/50 focus:ring-red-200"
                        : nameStatus === "available"
                          ? "border-success/50 focus:ring-emerald-200"
                          : "border-border focus:ring-blue-200",
                    )}
                    placeholder="e.g. Infosys Financial Analysis Q1 FY25"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {nameStatus === "checking" && (
                      <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                    )}
                    {nameStatus === "available" && (
                      <Check className="w-4 h-4 text-success" />
                    )}
                    {nameStatus === "taken" && (
                      <AlertCircle className="w-4 h-4 text-destructive" />
                    )}
                  </div>
                </div>
                {nameStatus === "available" && (
                  <p className="text-xs text-success mt-1 font-medium">
                    This name is available
                  </p>
                )}
                {nameStatus === "taken" && (
                  <p className="text-xs text-destructive mt-1 font-medium">
                    This name is already taken
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  Description (optional)
                </label>
                <div className="relative">
                  <textarea
                    rows={4}
                    value={description}
                    maxLength={descLimit}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all resize-none"
                    placeholder="Quarterly financial research and analysis of Infosys Q1 FY25 performance."
                  />
                  <span className="absolute bottom-2.5 right-3 text-xs text-muted-foreground">
                    {description.length}/{descLimit}
                  </span>
                </div>
              </div>
            </div>

            <div className="border border-border rounded-xl p-6 bg-surface/60 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Upload className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-bold text-foreground">
                    Upload documents now
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Optional, but available on this screen before you create the
                    workspace.
                  </p>
                </div>
              </div>

              <DropZone
                files={uploadFiles}
                onAddFiles={handleAddFiles}
                onRemove={handleRemoveFile}
              />
            </div>
          </div>

          {submitError && (
            <div className="mt-6 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {submitError}
            </div>
          )}
        </div>

        <div className="px-8 py-5 border-t border-border-subtle bg-surface flex items-center justify-between">
          <button
            onClick={() => router.push("/workspace")}
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-surface transition-colors border border-border bg-card"
          >
            Cancel
          </button>

          <button
            onClick={handleCreateWorkspace}
            disabled={!canProceedStep1 || createLoading || uploadLoading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm"
          >
            {createLoading || uploadLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : null}
            {createLoading
              ? uploadLoading
                ? "Creating & Uploading..."
                : "Creating..."
              : pendingCount > 0
                ? `Create & Upload ${pendingCount} file${pendingCount !== 1 ? "s" : ""}`
                : "Create Workspace"}
            {!createLoading && !uploadLoading && (
              <ArrowRight className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
