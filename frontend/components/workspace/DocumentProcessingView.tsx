"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Check,
  Loader2,
  X,
  AlertTriangle,
  RotateCcw,
  Info,
  FileSearch,
  Sparkles,
  Scissors,
  Binary,
  Database,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetcher } from "@/lib/api";
import type { Document } from "./types";

// ── Processing Pipeline Steps ─────────────────────────────────────────────────
const PIPELINE_STEPS = [
  {
    label: "Parsing Document",
    description: "Extracting text and structure from PDF...",
    icon: FileSearch,
    color: "blue",
  },
  {
    label: "Cleaning Content",
    description: "Removing noise, headers, footers and formatting...",
    icon: Sparkles,
    color: "blue",
  },
  {
    label: "Chunking Text",
    description: "Splitting content into semantic chunks...",
    icon: Scissors,
    color: "blue",
  },
  {
    label: "Generating Embeddings",
    description: "Converting chunks into vector representations...",
    icon: Binary,
    color: "blue",
  },
  {
    label: "Indexing in Vector Database",
    description: "Storing vectors and metadata for retrieval...",
    icon: Database,
    color: "blue",
  },
];

// ── 3D Processing Animation (CSS-based for reliability) ───────────────────────
function ProcessingAnimation({ currentStep }: { currentStep: number }) {
  return (
    <div className="relative w-full max-w-2xl mx-auto h-48 flex items-center justify-center overflow-hidden select-none">
      {/* Background gradient orbs */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-blue-200/30 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute top-1/2 right-1/4 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-indigo-200/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 bg-violet-200/25 rounded-full blur-2xl animate-pulse"
          style={{ animationDelay: "0.5s" }}
        />
      </div>

      {/* Flow: Document → Particles → Vector nodes */}
      <div className="relative z-10 flex items-center gap-8 md:gap-14">
        {/* PDF Document */}
        <div
          className={cn(
            "relative transition-all duration-700",
            currentStep >= 1 ? "opacity-100 scale-100" : "opacity-40 scale-90"
          )}
        >
          <div
            className="w-20 h-24 bg-white rounded-lg shadow-lg border border-slate-200 flex flex-col items-center justify-center relative overflow-hidden"
            style={{
              animation: "float 3s ease-in-out infinite",
            }}
          >
            <div className="absolute top-0 left-0 right-0 h-6 bg-red-500 flex items-center justify-center">
              <span className="text-white text-[9px] font-bold tracking-wider">
                PDF
              </span>
            </div>
            <div className="mt-4 space-y-1 w-full px-2">
              <div className="h-1 bg-slate-200 rounded-full w-full" />
              <div className="h-1 bg-slate-200 rounded-full w-3/4" />
              <div className="h-1 bg-slate-200 rounded-full w-5/6" />
              <div className="h-1 bg-slate-200 rounded-full w-2/3" />
            </div>
          </div>
        </div>

        {/* Animated particles flowing */}
        <div className="relative w-32 h-20 flex items-center justify-center">
          {/* Connection line */}
          <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-blue-300 via-blue-500 to-indigo-400 opacity-40" />

          {/* Flowing dots */}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={cn(
                "absolute w-2 h-2 rounded-full transition-colors duration-300",
                currentStep >= 3
                  ? "bg-indigo-500"
                  : currentStep >= 2
                    ? "bg-blue-500"
                    : "bg-blue-400"
              )}
              style={{
                animation: `flowRight 2.5s ease-in-out infinite`,
                animationDelay: `${i * 0.4}s`,
                top: `${40 + Math.sin(i * 1.2) * 20}%`,
              }}
            />
          ))}

          {/* Center pulse */}
          <div
            className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center z-10 transition-all duration-500",
              currentStep >= 2
                ? "bg-blue-500 shadow-lg shadow-blue-500/30"
                : "bg-slate-300"
            )}
          >
            <div
              className={cn(
                "w-2 h-2 rounded-full",
                currentStep >= 2 ? "bg-white" : "bg-slate-400"
              )}
            />
          </div>
        </div>

        {/* Vector Database nodes */}
        <div
          className={cn(
            "relative transition-all duration-700",
            currentStep >= 4 ? "opacity-100 scale-100" : "opacity-40 scale-90"
          )}
        >
          <div className="relative w-24 h-24">
            {/* Central node */}
            <div
              className={cn(
                "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 z-10",
                currentStep >= 5
                  ? "bg-emerald-500 shadow-lg shadow-emerald-500/30"
                  : currentStep >= 4
                    ? "bg-indigo-500 shadow-lg shadow-indigo-500/30"
                    : "bg-slate-300"
              )}
              style={{ animation: "float 4s ease-in-out infinite" }}
            >
              <Database
                className={cn(
                  "w-4 h-4",
                  currentStep >= 4 ? "text-white" : "text-slate-400"
                )}
              />
            </div>
            {/* Orbiting nodes */}
            {[0, 60, 120, 180, 240, 300].map((angle, i) => {
              const rad = (angle * Math.PI) / 180;
              const x = Math.cos(rad) * 38;
              const y = Math.sin(rad) * 38;
              return (
                <div
                  key={i}
                  className={cn(
                    "absolute w-3 h-3 rounded-full transition-all duration-500",
                    currentStep >= 5
                      ? "bg-emerald-400"
                      : currentStep >= 4
                        ? "bg-indigo-400"
                        : "bg-slate-200"
                  )}
                  style={{
                    top: `calc(50% + ${y}px - 6px)`,
                    left: `calc(50% + ${x}px - 6px)`,
                    animation:
                      currentStep >= 4
                        ? `pulse 2s ease-in-out infinite ${i * 0.3}s`
                        : "none",
                  }}
                />
              );
            })}
            {/* Connection lines */}
            {currentStep >= 4 && (
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox="0 0 96 96"
              >
                {[0, 60, 120, 180, 240, 300].map((angle, i) => {
                  const rad = (angle * Math.PI) / 180;
                  const x = 48 + Math.cos(rad) * 38;
                  const y = 48 + Math.sin(rad) * 38;
                  return (
                    <line
                      key={i}
                      x1="48"
                      y1="48"
                      x2={x}
                      y2={y}
                      stroke={currentStep >= 5 ? "#10b981" : "#818cf8"}
                      strokeWidth="1"
                      opacity="0.3"
                    />
                  );
                })}
              </svg>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Vertical Stepper ──────────────────────────────────────────────────────────
function VerticalStepper({
  currentStep,
  failedStep,
  failReason,
  stepTimers,
  onRetry,
}: {
  currentStep: number;
  failedStep: number | null;
  failReason: string | null;
  stepTimers: Record<number, number>;
  onRetry?: () => void;
}) {
  return (
    <div className="relative w-full max-w-xl mx-auto">
      {PIPELINE_STEPS.map((step, idx) => {
        const stepNum = idx + 1;
        let state: "complete" | "active" | "pending" | "failed" = "pending";
        if (failedStep === stepNum) state = "failed";
        else if (stepNum < currentStep) state = "complete";
        else if (stepNum === currentStep) state = "active";

        const Icon = step.icon;
        const timer = stepTimers[stepNum];
        const isLast = idx === PIPELINE_STEPS.length - 1;

        return (
          <div key={idx} className="flex gap-4 relative">
            {/* Vertical line */}
            {!isLast && (
              <div className="absolute left-[19px] top-10 bottom-0 w-0.5">
                <div
                  className={cn(
                    "w-full h-full transition-colors duration-500",
                    state === "complete"
                      ? "bg-emerald-400"
                      : state === "active"
                        ? "bg-gradient-to-b from-blue-400 to-slate-200"
                        : "bg-slate-200"
                  )}
                />
              </div>
            )}

            {/* Step icon */}
            <div className="relative z-10 shrink-0">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500",
                  state === "complete"
                    ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                    : state === "active"
                      ? "bg-blue-50 border-2 border-blue-500 text-blue-600 shadow-md ring-4 ring-blue-100"
                      : state === "failed"
                        ? "bg-red-50 border-2 border-red-500 text-red-600 shadow-md ring-4 ring-red-100"
                        : "bg-white border-2 border-slate-200 text-slate-300"
                )}
              >
                {state === "complete" ? (
                  <Check className="w-5 h-5" />
                ) : state === "active" ? (
                  <Icon className="w-5 h-5 animate-pulse" />
                ) : state === "failed" ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
              </div>
            </div>

            {/* Step content */}
            <div className={cn("flex-1 pb-8", isLast && "pb-0")}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-sm font-bold",
                        state === "complete"
                          ? "text-slate-800"
                          : state === "active"
                            ? "text-blue-700"
                            : state === "failed"
                              ? "text-red-700"
                              : "text-slate-400"
                      )}
                    >
                      {stepNum} {step.label}
                    </span>
                  </div>
                  <p
                    className={cn(
                      "text-xs mt-0.5",
                      state === "active"
                        ? "text-slate-500"
                        : state === "failed"
                          ? "text-red-500"
                          : "text-slate-400"
                    )}
                  >
                    {step.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {state === "complete" && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                      Complete
                    </span>
                  )}
                  {state === "active" && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      In Progress
                    </span>
                  )}
                  {state === "failed" && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
                      Failed
                    </span>
                  )}
                  {timer !== undefined && state !== "pending" && (
                    <span className="text-xs text-slate-400 tabular-nums">
                      {String(Math.floor(timer / 60)).padStart(2, "0")}:
                      {String(timer % 60).padStart(2, "0")}
                    </span>
                  )}
                </div>
              </div>

              {/* Failed state inline actions */}
              {state === "failed" && failReason && (
                <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-xs text-red-700 leading-relaxed">
                    {failReason}
                  </p>
                  <div className="flex gap-2 mt-2">
                    {onRetry && (
                      <button
                        onClick={onRetry}
                        className="text-xs font-medium text-red-700 hover:text-red-900 bg-white border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" /> Retry
                      </button>
                    )}
                    <button className="text-xs font-medium text-slate-600 hover:text-slate-800 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                      Contact Support
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Success Toast ─────────────────────────────────────────────────────────────
function SuccessToast({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  if (!visible) return null;
  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex items-center gap-3 bg-white border border-emerald-200 shadow-xl rounded-2xl px-5 py-3.5">
        <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
          <Check className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800">Report indexed.</p>
          <p className="text-xs text-slate-500">
            Extraction and Red Flag analysis starting automatically.
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 ml-2"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Main Document Processing View ─────────────────────────────────────────────
export function DocumentProcessingView({
  workspaceId,
  onComplete,
}: {
  workspaceId: string;
  onComplete: () => void;
}) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [stepTimers, setStepTimers] = useState<Record<number, number>>({});
  const [timerTick, setTimerTick] = useState(0);

  // Track active step for timer
  useEffect(() => {
    const interval = setInterval(() => setTimerTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Update step timers based on current step
  useEffect(() => {
    if (documents.length > 0) {
      const doc = documents[0];
      const currentStep = doc.processing_step || 1;
      setStepTimers((prev) => ({
        ...prev,
        [currentStep]: (prev[currentStep] || 0) + 1,
      }));
    }
  }, [timerTick, documents]);

  useEffect(() => {
    let timer = setInterval(async () => {
      try {
        const res = await fetcher<{ documents: Document[] }>(
          `/workspaces/${workspaceId}/documents`
        );
        const processing = res.documents.filter(
          (d) => d.status === "processing"
        );
        setDocuments(processing);
        if (processing.length === 0 && res.documents.length > 0) {
          clearInterval(timer);
          setShowSuccess(true);
          // Auto-transition after 1.5s dwell
          setTimeout(() => {
            setShowSuccess(false);
            onComplete();
          }, 2500);
        }
      } catch (e) {
        console.error("Polling error", e);
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [workspaceId, onComplete]);

  if (documents.length === 0)
    return (
      <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-4 h-full justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <p className="text-sm font-medium">
          Initializing processing pipeline...
        </p>
      </div>
    );

  const primaryDoc = documents[0];
  const currentStep = primaryDoc.processing_step || 1;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-8 max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                Document Processing
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Document Agent is processing your file
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-full">
                <Loader2 className="w-3 h-3 animate-spin" />
                Document Agent
              </span>
            </div>
          </div>

          {/* File info chip */}
          <div className="mt-4 flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">
                {primaryDoc.name}
              </p>
              <p className="text-xs text-slate-400">
                {(primaryDoc.size_bytes / 1024 / 1024).toFixed(1)} MB
              </p>
            </div>
            <button className="text-xs text-slate-400 hover:text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
              Cancel
            </button>
          </div>
        </div>

        {/* 3D Animation */}
        <ProcessingAnimation currentStep={currentStep} />

        {/* Vertical Stepper */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mt-2">
          <VerticalStepper
            currentStep={currentStep}
            failedStep={null}
            failReason={null}
            stepTimers={stepTimers}
          />
        </div>

        {/* Info note */}
        <div className="mt-4 flex items-center gap-2 text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
          <Info className="w-4 h-4 shrink-0" />
          <span>
            This may take a few moments depending on document size.
          </span>
        </div>
      </div>

      {/* Success toast */}
      <SuccessToast
        visible={showSuccess}
        onClose={() => setShowSuccess(false)}
      />
    </div>
  );
}
