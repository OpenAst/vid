"use client";

import Link from "next/link";
import { CheckCircle2, ChevronDown, ChevronUp, ExternalLink, ListVideo, Loader2, RotateCcw, UploadCloud, XCircle } from "lucide-react";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

const CHUNK_SIZE = 10 * 1024 * 1024;

type UploadStatus = "uploading" | "processing" | "complete" | "failed";

type UploadJob = {
  id: string;
  title: string;
  progress: number;
  status: UploadStatus;
  error?: string;
  videoId?: string;
  startedAt: number;
  completedAt?: number;
  input: StartUploadInput;
};

type StartUploadInput = {
  videoFile: File;
  musicFile?: File | null;
  title: string;
  description: string;
  skillCategory?: string;
};

type UploadedFile = {
  objectKey: string;
  publicUrl: string;
};

type UploadContextValue = {
  jobs: UploadJob[];
  hasActiveUploads: boolean;
  startUpload: (input: StartUploadInput) => string;
  retryUpload: (jobId: string) => void;
  dismissJob: (jobId: string) => void;
};

const UploadContext = createContext<UploadContextValue | null>(null);

function sanitizeFileName(fileName: string) {
  return fileName.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function uploadFile(file: File, onProgress: (progress: number) => void): Promise<UploadedFile> {
  const initRes = await fetch("/api/video/initiate", {
    method: "POST",
    credentials: "include",
    body: JSON.stringify({
      file_name: sanitizeFileName(file.name),
      file_type: file.type,
    }),
  });

  if (!initRes.ok) {
    throw new Error("Failed to initiate upload");
  }

  const { upload_id, object_key, public_url } = await initRes.json();
  const parts: { ETag: string; PartNumber: number }[] = [];
  let partNumber = 1;
  let uploadedBytes = 0;

  for (let start = 0; start < file.size; start += CHUNK_SIZE) {
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);

    const presignedRes = await fetch("/api/video/presigned", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        object_key,
        file_type: file.type,
        upload_id,
        part_number: partNumber,
      }),
    });

    if (!presignedRes.ok) {
      throw new Error("Failed to get upload URL");
    }

    const { url } = await presignedRes.json();
    const uploadRes = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: chunk,
    });

    if (!uploadRes.ok) {
      throw new Error(`Chunk ${partNumber} upload failed`);
    }

    const eTag = uploadRes.headers.get("ETag");
    if (!eTag) {
      throw new Error("Missing upload receipt");
    }

    parts.push({ ETag: eTag.replace(/"/g, ""), PartNumber: partNumber });
    uploadedBytes += chunk.size;
    onProgress(Math.min(90, Math.round((uploadedBytes / file.size) * 90)));
    partNumber += 1;
  }

  const completeRes = await fetch("/api/video/complete_multipart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ object_key, upload_id, parts }),
  });

  if (!completeRes.ok) {
    throw new Error("Failed to complete upload");
  }

  const completeData = await completeRes.json();
  return {
    objectKey: object_key,
    publicUrl: completeData.public_url || public_url,
  };
}

export function UploadProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<UploadJob[]>([]);

  const updateJob = useCallback((jobId: string, updates: Partial<UploadJob>) => {
    setJobs((current) => current.map((job) => (job.id === jobId ? { ...job, ...updates } : job)));
  }, []);

  const runUpload = useCallback((jobId: string, input: StartUploadInput) => {
    void (async () => {
      try {
        updateJob(jobId, {
          title: input.title,
          input,
          status: "uploading",
          progress: 0,
          error: undefined,
          videoId: undefined,
          completedAt: undefined,
          startedAt: Date.now(),
        });

        const uploadedVideo = await uploadFile(input.videoFile, (progress) => {
          updateJob(jobId, { progress });
        });

        const uploadedMusic = input.musicFile
          ? await uploadFile(input.musicFile, (progress) => {
              updateJob(jobId, { progress: Math.min(96, 90 + Math.round(progress / 10)) });
            })
          : null;

        updateJob(jobId, { status: "processing", progress: 97 });

        const metaRes = await fetch("/api/video/save-metadata", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            title: input.title,
            description: input.description || "",
            skill_category: input.skillCategory || "general",
            file_url: uploadedVideo.publicUrl,
            music_url: uploadedMusic?.publicUrl || null,
            file_key: uploadedVideo.objectKey,
            file_size: input.videoFile.size,
            file_type: input.videoFile.type,
          }),
        });

        const metaData = await metaRes.json().catch(() => null);
        if (!metaRes.ok) {
          throw new Error(metaData?.error || "Failed to save video details");
        }

        updateJob(jobId, {
          status: "complete",
          progress: 100,
          videoId: typeof metaData?.id === "string" ? metaData.id : undefined,
          completedAt: Date.now(),
        });
        toast.success("Video uploaded");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Upload failed";
        updateJob(jobId, { status: "failed", error: message });
        toast.error(message);
      }
    })();
  }, [updateJob]);

  const startUpload = useCallback((input: StartUploadInput) => {
    const jobId = crypto.randomUUID();
    setJobs((current) => [
      {
        id: jobId,
        title: input.title,
        progress: 0,
        status: "uploading",
        startedAt: Date.now(),
        input,
      },
      ...current,
    ]);

    runUpload(jobId, input);

    return jobId;
  }, [runUpload]);

  const retryUpload = useCallback((jobId: string) => {
    const job = jobs.find((currentJob) => currentJob.id === jobId);
    if (!job || job.status !== "failed") return;
    runUpload(jobId, job.input);
  }, [jobs, runUpload]);

  const dismissJob = useCallback((jobId: string) => {
    setJobs((current) => current.filter((job) => job.id !== jobId));
  }, []);

  const value = useMemo<UploadContextValue>(() => ({
    jobs,
    hasActiveUploads: jobs.some((job) => job.status === "uploading" || job.status === "processing"),
    startUpload,
    retryUpload,
    dismissJob,
  }), [dismissJob, jobs, retryUpload, startUpload]);

  useEffect(() => {
    if (!value.hasActiveUploads) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [value.hasActiveUploads]);

  return (
    <UploadContext.Provider value={value}>
      {children}
      <UploadStatusDock jobs={jobs} onDismiss={dismissJob} onRetry={retryUpload} />
    </UploadContext.Provider>
  );
}

function formatUploadTime(timestamp?: number) {
  if (!timestamp) return "";
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function UploadStatusDock({
  jobs,
  onDismiss,
  onRetry,
}: {
  jobs: UploadJob[];
  onDismiss: (jobId: string) => void;
  onRetry: (jobId: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (jobs.length === 0) return null;

  const activeCount = jobs.filter((job) => job.status === "uploading" || job.status === "processing").length;
  const failedCount = jobs.filter((job) => job.status === "failed").length;
  const visibleJobs = isExpanded ? jobs : jobs.slice(0, 2);

  return (
    <div className="fixed bottom-[calc(var(--safe-area-bottom)+16px)] right-4 z-[75] w-[min(380px,calc(100vw-32px))] space-y-2">
      <button
        type="button"
        onClick={() => setIsExpanded((current) => !current)}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-base-300 bg-base-100 px-4 py-3 text-left text-base-content shadow-2xl transition hover:bg-base-200"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ListVideo size={18} />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-bold">Upload queue</span>
            <span className="block text-xs text-base-content/55">
              {activeCount > 0
                ? `${activeCount} active`
                : failedCount > 0
                  ? `${failedCount} needs attention`
                  : `${jobs.length} recent`}
            </span>
          </span>
        </span>
        {isExpanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
      </button>

      {visibleJobs.map((job) => (
        <div key={job.id} className="rounded-2xl border border-base-300 bg-base-100 p-3 text-base-content shadow-2xl">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {job.status === "complete" ? (
                <CheckCircle2 size={18} />
              ) : job.status === "failed" ? (
                <XCircle size={18} />
              ) : job.status === "processing" ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <UploadCloud size={18} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-bold">{job.title}</p>
                <span className="shrink-0 text-[11px] font-medium text-base-content/45">
                  {formatUploadTime(job.completedAt || job.startedAt)}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-base-content/55">
                {job.status === "processing"
                  ? "Processing video..."
                  : job.status === "complete"
                    ? "Upload complete"
                    : job.status === "failed"
                      ? job.error || "Upload failed"
                      : "Uploading..."}
              </p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-base-200">
                <div className={`h-full rounded-full ${job.status === "failed" ? "bg-error" : "bg-primary"}`} style={{ width: `${job.progress}%` }} />
              </div>
              {(job.status === "complete" || job.status === "failed") && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {job.status === "complete" && job.videoId && (
                    <Link
                      href={`/video/${job.videoId}`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-content transition hover:bg-primary/90"
                    >
                      View video
                      <ExternalLink size={13} />
                    </Link>
                  )}
                  {job.status === "failed" && (
                    <button
                      type="button"
                      onClick={() => onRetry(job.id)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-content transition hover:bg-primary/90"
                    >
                      Retry
                      <RotateCcw size={13} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onDismiss(job.id)}
                    className="rounded-full px-3 py-1.5 text-xs font-semibold text-base-content/55 transition hover:bg-base-200 hover:text-base-content"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      {!isExpanded && jobs.length > visibleJobs.length && (
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="w-full rounded-2xl border border-base-300 bg-base-100 px-4 py-2 text-xs font-bold text-base-content/65 shadow-xl transition hover:bg-base-200 hover:text-base-content"
        >
          Show {jobs.length - visibleJobs.length} more
        </button>
      )}
    </div>
  );
}

export function useUploadManager() {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error("useUploadManager must be used inside UploadProvider");
  }
  return context;
}
