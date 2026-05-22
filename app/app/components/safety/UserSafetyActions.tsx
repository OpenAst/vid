"use client";

import { AlertTriangle, Flag, MoreVertical, Shield, ShieldOff, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

type ReportReason = "spam" | "harassment" | "inappropriate" | "other";

type UserSafetyActionsProps = {
  userId: string;
  userLabel: string;
  isBlocked: boolean;
  onBlockChange?: (isBlocked: boolean) => void;
  compact?: boolean;
};

const reportReasons: Array<{ value: ReportReason; label: string }> = [
  { value: "spam", label: "Spam or scam" },
  { value: "harassment", label: "Harassment" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "other", label: "Something else" },
];

export default function UserSafetyActions({
  userId,
  userLabel,
  isBlocked,
  onBlockChange,
  compact = false,
}: UserSafetyActionsProps) {
  const [isBlockLoading, setIsBlockLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isBlockConfirmOpen, setIsBlockConfirmOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [reason, setReason] = useState<ReportReason>("other");
  const [details, setDetails] = useState("");
  const menuRef = useRef<HTMLDivElement | null>(null);
  const needsDetails = reason === "other";
  const canSubmitReport = !needsDetails || details.trim().length >= 10;

  useEffect(() => {
    if (!isMenuOpen) return;

    const handleDocumentPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (target && menuRef.current?.contains(target)) return;
      setIsMenuOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleDocumentPointerDown);
    document.addEventListener("touchstart", handleDocumentPointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleDocumentPointerDown);
      document.removeEventListener("touchstart", handleDocumentPointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isMenuOpen]);

  const toggleBlock = async () => {
    if (!userId || isBlockLoading) return;

    const nextBlocked = !isBlocked;
    setIsBlockLoading(true);
    onBlockChange?.(nextBlocked);

    try {
      const response = await fetch(`/api/auth/users/${userId}/block`, {
        method: nextBlocked ? "POST" : "DELETE",
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.detail || data?.error || "Unable to update block status");
      }

      onBlockChange?.(Boolean(data.blocked));
      toast.success(nextBlocked ? "User blocked" : "User unblocked");
      setIsBlockConfirmOpen(false);
      setIsMenuOpen(false);
    } catch (error) {
      onBlockChange?.(isBlocked);
      toast.error(error instanceof Error ? error.message : "Unable to update block status");
    } finally {
      setIsBlockLoading(false);
    }
  };

  const submitReport = async () => {
    if (!userId || isReportLoading) return;
    if (!canSubmitReport) {
      toast.error("Please add a few details for this report.");
      return;
    }

    setIsReportLoading(true);
    try {
      const response = await fetch(`/api/auth/users/${userId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, details }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.detail || data?.error || "Unable to submit report");
      }

      setIsReportOpen(false);
      setReason("other");
      setDetails("");
      toast.success(data?.detail || "Report submitted. Thank you.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to submit report");
    } finally {
      setIsReportLoading(false);
    }
  };

  return (
    <div ref={menuRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setIsMenuOpen((current) => !current)}
        className={`inline-flex items-center justify-center rounded-xl border border-base-300 text-base-content/70 transition hover:bg-base-200 hover:text-base-content ${
          compact ? "h-9 w-9" : "gap-2 px-3 py-2 text-sm font-semibold"
        }`}
        aria-label={`More safety actions for ${userLabel}`}
        aria-expanded={isMenuOpen}
      >
        <MoreVertical size={16} />
        {!compact && <span>More</span>}
      </button>

      {isMenuOpen && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-[70] w-52 rounded-2xl border border-base-300 bg-base-100 p-2 text-base-content shadow-2xl">
          <button
            type="button"
            onClick={() => {
              if (isBlocked) {
                void toggleBlock();
                return;
              }
              setIsBlockConfirmOpen(true);
              setIsMenuOpen(false);
            }}
            disabled={isBlockLoading}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition hover:bg-base-200 disabled:cursor-wait disabled:opacity-60 ${
              isBlocked ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            {isBlocked ? <ShieldOff size={16} /> : <Shield size={16} />}
            {isBlockLoading ? "Updating..." : isBlocked ? "Unblock user" : "Block user"}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsReportOpen(true);
              setIsMenuOpen(false);
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition hover:bg-base-200"
          >
            <Flag size={16} />
            Report user
          </button>
        </div>
      )}

      {isBlockConfirmOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-base-300 bg-base-100 p-4 text-base-content shadow-2xl">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600">
                <AlertTriangle size={19} />
              </div>
              <div>
                <p className="text-lg font-bold">Block {userLabel}?</p>
                <p className="mt-1 text-sm leading-6 text-base-content/60">
                  They will not be able to message or interact with you. You can unblock them later in settings.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsBlockConfirmOpen(false)}
                className="rounded-xl border border-base-300 px-4 py-2 text-sm font-semibold transition hover:bg-base-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void toggleBlock()}
                disabled={isBlockLoading}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-wait disabled:opacity-60"
              >
                {isBlockLoading ? "Blocking..." : "Block"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isReportOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-md rounded-2xl border border-base-300 bg-base-100 p-4 text-base-content shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-bold">Report {userLabel}</p>
                <p className="mt-1 text-sm leading-6 text-base-content/55">
                  Reports help keep OneClyq safer for everyone.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsReportOpen(false)}
                className="rounded-full p-2 text-base-content/60 transition hover:bg-base-200 hover:text-base-content"
                aria-label="Close report"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2">
              {reportReasons.map((item) => (
                <label key={item.value} className="flex cursor-pointer items-center gap-3 rounded-xl border border-base-300 px-3 py-3 transition hover:bg-base-200/70">
                  <input
                    type="radio"
                    name={`report-${userId}`}
                    value={item.value}
                    checked={reason === item.value}
                    onChange={() => setReason(item.value)}
                    className="radio radio-primary radio-sm"
                  />
                  <span className="text-sm font-medium">{item.label}</span>
                </label>
              ))}
            </div>

            <label className="mt-4 block">
              <span className="text-sm font-medium">Details {needsDetails ? "(required)" : "(optional)"}</span>
              <textarea
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                rows={4}
                placeholder="Add context for the moderation team"
                className="mt-2 w-full resize-none rounded-xl border border-base-300 bg-base-100 px-3 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <span className="mt-1 block text-xs text-base-content/45">
                {details.trim().length}/10 minimum for “Something else”
              </span>
            </label>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsReportOpen(false)}
                className="rounded-xl border border-base-300 px-4 py-2 text-sm font-semibold transition hover:bg-base-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitReport()}
                disabled={isReportLoading || !canSubmitReport}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-content transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
              >
                {isReportLoading ? "Submitting..." : "Submit report"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
