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
      (file) => file.type === "application/pdf",
    );
    if (dropped.length) onAddFiles(dropped);
  };

  return (
    <div className="flex flex-col gap-4">
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
            ? "border-blue-500 bg-blue-50"
            : "border-slate-300 hover:border-blue-400 hover:bg-slate-50 bg-white",
        )}
      >
        <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
          <Upload className="w-6 h-6 text-blue-500" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-700">
            {dragging ? "Drop PDFs here" : "Add documents to this workspace"}
          </p>
          <p className="text-xs text-slate-400 mt-1">
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
              (file) => file.type === "application/pdf",
            );
            if (selected.length) onAddFiles(selected);
            e.target.value = "";
          }}
        />
      </div>

      {files.length > 0 && (
        <div className="flex flex-col gap-2 max-h-52 overflow-y-auto pr-1">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5"
            >
              <FileText className="w-5 h-5 text-blue-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">
                  {file.file.name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {file.status === "uploading" && (
                    <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${file.progress}%` }}
                      />
                    </div>
                  )}
                  {file.status === "done" && (
                    <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                      <Check className="w-3 h-3" /> Uploaded
                    </span>
                  )}
                  {file.status === "error" && (
                    <span className="text-xs text-red-600 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />{" "}
                      {file.errorMsg || "Failed"}
                    </span>
                  )}
                  {file.status === "pending" && (
                    <span className="text-xs text-slate-400">
                      {(file.file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  )}
                </div>
              </div>
              {(file.status === "pending" || file.status === "error") && (
                <button
                  onClick={() => onRemove(file.id)}
                  className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              {file.status === "done" && (
                <button
                  onClick={() => onRemove(file.id)}
                  className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              {file.status === "uploading" && (
                <Loader2 className="w-4 h-4 text-blue-500 animate-spin shrink-0" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function CreateWorkspaceModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated?: () => void;
}) {
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

  useEffect(() => {
    const trimmedName = name.trim();

    if (nameCheckTimeoutRef.current) {
      clearTimeout(nameCheckTimeoutRef.current);
    }

    const timeoutId = setTimeout(async () => {
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

    nameCheckTimeoutRef.current = timeoutId;
    return () => clearTimeout(timeoutId);
  }, [name]);

  const handleCreateWorkspace = async () => {
    if (!name.trim() || nameStatus === "taken" || nameStatus === "checking")
      return;

    setCreateLoading(true);
    setSubmitError(null);

    try {
      const workspace = await fetcher<CreatedWorkspace>("/workspaces", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
        }),
      });

      if (onCreated) {
        onCreated();
      }

      const pendingFiles = uploadFiles.filter(
        (file) => file.status === "pending",
      );
      if (pendingFiles.length > 0) {
        setUploadLoading(true);
        setUploadFiles((prev) =>
          prev.map((file) =>
            file.status === "pending"
              ? { ...file, status: "uploading", progress: 30 }
              : file,
          ),
        );

        try {
          const formData = new FormData();
          pendingFiles.forEach((file) => formData.append("files", file.file));
          await uploadMultipart<{ uploaded: unknown[] }>(
            `/workspaces/${workspace.id}/documents`,
            formData,
          );
          setUploadFiles((prev) =>
            prev.map((file) =>
              file.status === "uploading"
                ? { ...file, status: "done", progress: 100 }
                : file,
            ),
          );
        } catch (uploadError) {
          setUploadFiles((prev) =>
            prev.map((file) =>
              file.status === "uploading"
                ? { ...file, status: "error", errorMsg: "Upload failed" }
                : file,
            ),
          );
          console.error("Failed to upload documents:", uploadError);
        } finally {
          setUploadLoading(false);
        }
      }

      router.push(`/workspace/${workspace.id}`);
      onClose();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to create workspace.",
      );
      console.error("Failed to create workspace:", err);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleAddFiles = useCallback((newFiles: File[]) => {
    const mapped: UploadedFile[] = newFiles.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      status: "pending",
      progress: 0,
    }));
    setUploadFiles((prev) => [...prev, ...mapped]);
  }, []);

  const handleRemoveFile = (id: string) => {
    setUploadFiles((prev) => prev.filter((file) => file.id !== id));
  };

  const canProceedStep1 =
    name.trim().length >= 2 &&
    (nameStatus === "available" || nameStatus === "idle") &&
    nameStatus !== "taken" &&
    nameStatus !== "checking";

  const pendingCount = uploadFiles.filter(
    (file) => file.status === "pending",
  ).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100">
          <h1 className="text-xl font-bold text-slate-900">Create Workspace</h1>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-8 py-7 overflow-y-auto">
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Workspace Details
              </h2>
              <p className="text-sm text-slate-500">
                Create the workspace and optionally stage PDF uploads before you
                leave this screen.
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500">
              <Upload className="w-3.5 h-3.5" />
              Documents upload here, not on a follow-up step
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col gap-5">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Folder className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900">
                    Workspace Details
                  </h2>
                  <p className="text-xs text-slate-500">
                    Give your workspace a name and description
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Workspace Name <span className="text-red-500">*</span>
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
                      "w-full px-3 py-2.5 pr-9 rounded-lg border text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all",
                      nameStatus === "taken"
                        ? "border-red-400 focus:ring-red-200"
                        : nameStatus === "available"
                          ? "border-emerald-400 focus:ring-emerald-200"
                          : "border-slate-300 focus:ring-blue-200",
                    )}
                    placeholder="e.g. Infosys Financial Analysis Q1 FY25"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {nameStatus === "checking" && (
                      <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                    )}
                    {nameStatus === "available" && (
                      <Check className="w-4 h-4 text-emerald-500" />
                    )}
                    {nameStatus === "taken" && (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                </div>
                {nameStatus === "available" && (
                  <p className="text-xs text-emerald-600 mt-1 font-medium">
                    This name is available
                  </p>
                )}
                {nameStatus === "taken" && (
                  <p className="text-xs text-red-600 mt-1 font-medium">
                    This name is already taken
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Description (optional)
                </label>
                <div className="relative">
                  <textarea
                    rows={4}
                    value={description}
                    maxLength={descLimit}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all resize-none"
                    placeholder="Quarterly financial research and analysis of Infosys Q1 FY25 performance."
                  />
                  <span className="absolute bottom-2.5 right-3 text-xs text-slate-400">
                    {description.length}/{descLimit}
                  </span>
                </div>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl p-6 bg-slate-50/60 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Upload className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900">
                    Upload documents now
                  </h2>
                  <p className="text-xs text-slate-500">
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
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {submitError}
            </div>
          )}
        </div>

        <div className="px-8 py-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-200 transition-colors border border-slate-300 bg-white"
          >
            Cancel
          </button>

          <button
            onClick={handleCreateWorkspace}
            disabled={!canProceedStep1 || createLoading || uploadLoading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
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
