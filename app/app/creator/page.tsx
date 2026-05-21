"use client";

import { getProfileCompletion } from "@/app/lib/profileCompletion";
import { RootState } from "@/app/store/store";
import type { Video } from "@/app/store/videoSlice";
import type { MembershipTier } from "@/app/store/authSlice";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Flame,
  Heart,
  Lightbulb,
  CalendarDays,
  Play,
  Save,
  Sparkles,
  Target,
  UploadCloud,
  Users,
  VideoIcon,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch } from "@/app/store/store";
import { fetchUser } from "@/app/store/authSlice";

type AnalyticsSummary = {
  total_videos: number;
  total_views: number;
  total_likes: number;
  total_comments: number;
  total_saves: number;
  followers: number;
  completion_rate: number;
};

type TopVideo = {
  id: string;
  title: string;
  thumbnail_url?: string | null;
  views: number;
  likes: number;
  comments: number;
  saves: number;
  completion_rate: number;
};

type AnalyticsResponse = {
  summary: AnalyticsSummary;
  top_videos: TopVideo[];
};

type BookingRequest = {
  id: string;
  requester: {
    id: string;
    username?: string | null;
    first_name?: string;
    last_name?: string;
  };
  message: string;
  status: "pending" | "accepted" | "declined";
};

type BookingSlot = {
  id: string;
  starts_at: string;
  duration_minutes: number;
  purpose: "collab" | "mentor" | "consult";
  note: string;
  request_count?: number;
  requests?: BookingRequest[];
};

const defaultMembershipTiers: MembershipTier[] = [
  {
    id: "supporter",
    name: "Supporter",
    price: "$3/mo",
    description: "For fans who want to back your work.",
    perks: ["Supporter badge", "Monthly creator update"],
    enabled: true,
  },
  {
    id: "vip",
    name: "VIP",
    price: "$9/mo",
    description: "For close supporters and early access.",
    perks: ["Early clip previews", "Priority replies", "Behind-the-scenes notes"],
    enabled: false,
  },
];

function formatMetric(value?: number, suffix = "") {
  return `${Number(value || 0).toLocaleString()}${suffix}`;
}

function getDayKey(dateValue?: string) {
  if (!dateValue) return "";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function getUploadStreak(videos: Video[]) {
  const uploadDays = new Set(videos.map((video) => getDayKey(video.created_at)).filter(Boolean));
  if (uploadDays.size === 0) return 0;

  let streak = 0;
  const cursor = new Date();

  for (let index = 0; index < 30; index += 1) {
    const key = cursor.toISOString().slice(0, 10);
    if (!uploadDays.has(key)) {
      if (streak === 0) {
        cursor.setDate(cursor.getDate() - 1);
        continue;
      }
      break;
    }
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function getBestCategory(videos: Video[]) {
  const counts = videos.reduce<Record<string, number>>((current, video) => {
    const category = video.skill_category || "general";
    current[category] = (current[category] || 0) + 1;
    return current;
  }, {});

  const [category] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] || [];
  return category || "general";
}

export default function CreatorHubPage() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { isAuthenticated, isBootstrapped, user } = useSelector((state: RootState) => state.auth);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [recentVideos, setRecentVideos] = useState<Video[]>([]);
  const [membershipTiers, setMembershipTiers] = useState<MembershipTier[]>(defaultMembershipTiers);
  const [bookingSlots, setBookingSlots] = useState<BookingSlot[]>([]);
  const [slotForm, setSlotForm] = useState({
    starts_at: "",
    duration_minutes: 30,
    purpose: "collab" as BookingSlot["purpose"],
    note: "",
  });
  const [isSavingTiers, setIsSavingTiers] = useState(false);
  const [isSavingSlot, setIsSavingSlot] = useState(false);
  const [updatingBookingId, setUpdatingBookingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isBootstrapped && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isBootstrapped, router]);

  const loadCreatorHub = useCallback(async () => {
    if (!isAuthenticated || !user?.username) return;

    setIsLoading(true);
    try {
      const [analyticsResponse, videosResponse, bookingResponse] = await Promise.all([
        fetch("/api/video/analytics", { cache: "no-store" }),
        fetch(`/api/video/fetch?username=${encodeURIComponent(user.username)}&limit=30&feed=latest`, { cache: "no-store" }),
        fetch("/api/bookings/slots?mine=1", { cache: "no-store" }),
      ]);

      const analyticsData = await analyticsResponse.json().catch(() => null);
      const videosData = await videosResponse.json().catch(() => null);
      const bookingData = await bookingResponse.json().catch(() => null);

      if (!analyticsResponse.ok) {
        throw new Error(analyticsData?.detail || analyticsData?.error || "Unable to load creator dashboard");
      }

      setAnalytics(analyticsData);
      setRecentVideos(Array.isArray(videosData?.results) ? videosData.results : []);
      setBookingSlots(Array.isArray(bookingData?.results) ? bookingData.results : Array.isArray(bookingData) ? bookingData : []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load creator dashboard");
      setAnalytics(null);
      setRecentVideos([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.username]);

  useEffect(() => {
    void loadCreatorHub();
  }, [loadCreatorHub]);

  useEffect(() => {
    const savedTiers = user?.profile?.membership_tiers;
    if (Array.isArray(savedTiers) && savedTiers.length > 0) {
      setMembershipTiers(savedTiers);
    }
  }, [user?.profile?.membership_tiers]);

  const profileCompletion = useMemo(() => getProfileCompletion(user), [user]);
  const summary = analytics?.summary;
  const uploadStreak = useMemo(() => getUploadStreak(recentVideos), [recentVideos]);
  const bestCategory = useMemo(() => getBestCategory(recentVideos), [recentVideos]);
  const topVideos = analytics?.top_videos || [];

  const nextAction = profileCompletion.percent < 100
    ? { label: profileCompletion.missingItems[0]?.label || "Complete your profile", href: "/profile" }
    : Number(summary?.total_videos || 0) < 3
      ? { label: "Upload 3 clips to train your audience", href: "/upload" }
      : Number(summary?.followers || 0) < 100
        ? { label: "Share your best clip to reach 100 followers", href: topVideos[0]?.id ? `/video/${topVideos[0].id}` : "/discover" }
        : { label: "Review analytics and double down", href: "/analytics" };

  const goals = [
    {
      label: "Complete profile",
      value: profileCompletion.percent,
      target: 100,
      suffix: "%",
      done: profileCompletion.percent >= 100,
    },
    {
      label: "Reach 100 followers",
      value: Number(summary?.followers || 0),
      target: 100,
      suffix: "",
      done: Number(summary?.followers || 0) >= 100,
    },
    {
      label: "Upload 3 clips this week",
      value: Math.min(recentVideos.length, 3),
      target: 3,
      suffix: "",
      done: recentVideos.length >= 3,
    },
  ];

  const updateMembershipTier = (tierId: string, updates: Partial<MembershipTier>) => {
    setMembershipTiers((current) =>
      current.map((tier) => tier.id === tierId ? { ...tier, ...updates } : tier)
    );
  };

  const updateTierPerk = (tierId: string, perkIndex: number, value: string) => {
    setMembershipTiers((current) =>
      current.map((tier) => {
        if (tier.id !== tierId) return tier;
        return {
          ...tier,
          perks: tier.perks.map((perk, index) => index === perkIndex ? value : perk),
        };
      })
    );
  };

  const saveMembershipTiers = async () => {
    setIsSavingTiers(true);
    try {
      const response = await fetch("/api/auth/profile_update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ membership_tiers: membershipTiers }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.detail || data?.error || "Unable to save memberships");
      }
      await dispatch(fetchUser()).unwrap();
      toast.success("Membership tiers saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save memberships");
    } finally {
      setIsSavingTiers(false);
    }
  };

  const createBookingSlot = async () => {
    if (!slotForm.starts_at) {
      toast.error("Choose a date and time");
      return;
    }
    setIsSavingSlot(true);
    try {
      const response = await fetch("/api/bookings/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(slotForm),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.detail || data?.starts_at?.[0] || "Unable to create slot");
      }
      setBookingSlots((current) => [...current, data].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()));
      setSlotForm({ starts_at: "", duration_minutes: 30, purpose: "collab", note: "" });
      toast.success("Booking slot added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create slot");
    } finally {
      setIsSavingSlot(false);
    }
  };

  const updateBookingStatus = async (slotId: string, requestId: string, status: BookingRequest["status"]) => {
    setUpdatingBookingId(requestId);
    try {
      const response = await fetch(`/api/bookings/requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.detail || "Unable to update booking");
      }
      setBookingSlots((current) =>
        current.map((slot) => slot.id === slotId
          ? { ...slot, requests: (slot.requests || []).map((request) => request.id === requestId ? data : request) }
          : slot)
      );
      toast.success("Booking updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update booking");
    } finally {
      setUpdatingBookingId(null);
    }
  };

  if (!isBootstrapped || !isAuthenticated) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-base-100">
        <div className="h-10 w-10 animate-pulse rounded-2xl bg-base-300" aria-hidden="true" />
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-base-100 px-4 pb-10 pt-[calc(var(--app-header-height)+18px)] text-base-content md:pl-[124px] md:pr-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary">
              <Sparkles size={16} />
              Creator Hub
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">Grow your creator business</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-base-content/70">
              Track momentum, finish setup, and prepare your profile for future support and monetization.
            </p>
          </div>
          <button type="button" onClick={() => router.push("/upload")} className="btn btn-primary rounded-xl">
            <UploadCloud size={17} />
            Upload clip
          </button>
        </div>

        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="h-32 animate-pulse rounded-2xl bg-base-200" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard icon={VideoIcon} label="Clips" value={formatMetric(summary?.total_videos)} />
              <MetricCard icon={Play} label="Views" value={formatMetric(summary?.total_views)} />
              <MetricCard icon={Heart} label="Likes" value={formatMetric(summary?.total_likes)} />
              <MetricCard icon={Users} label="Followers" value={formatMetric(summary?.followers)} />
              <MetricCard icon={Save} label="Saves" value={formatMetric(summary?.total_saves)} />
              <MetricCard icon={Flame} label="Upload streak" value={`${uploadStreak} day${uploadStreak === 1 ? "" : "s"}`} />
              <MetricCard icon={Target} label="Best category" value={bestCategory} />
              <MetricCard icon={BarChart3} label="Completion" value={formatMetric(summary?.completion_rate, "%")} />
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
              <section className="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold">Creator goals</h2>
                    <p className="mt-1 text-sm font-medium text-base-content/70">Small signals that make the account feel ready to grow.</p>
                  </div>
                  <Target className="text-primary" size={22} />
                </div>

                <div className="mt-5 space-y-4">
                  {goals.map((goal) => {
                    const percent = Math.min(100, Math.round((goal.value / goal.target) * 100));
                    return (
                      <div key={goal.label}>
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="text-sm font-semibold">{goal.label}</span>
                          <span className="inline-flex items-center gap-1 text-xs font-medium font-bold text-base-content/70">
                            {goal.done && <CheckCircle2 size={14} className="text-emerald-500" />}
                            {formatMetric(goal.value, goal.suffix)} / {formatMetric(goal.target, goal.suffix)}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-base-200">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Lightbulb size={20} />
                </div>
                <h2 className="text-lg font-bold">Suggested next action</h2>
                <p className="mt-2 text-sm font-medium leading-6 text-base-content/70">{nextAction.label}</p>
                <button
                  type="button"
                  onClick={() => router.push(nextAction.href)}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-content transition hover:opacity-90"
                >
                  Continue
                  <ArrowRight size={16} />
                </button>
              </section>
            </div>

            <section className="mt-6 rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold">Availability slots</h2>
                  <p className="mt-1 text-sm font-medium text-base-content/70">Publish times people can request for collabs, mentorship, or consults.</p>
                </div>
                <CalendarDays className="text-primary" size={22} />
              </div>

              <div className="grid gap-3 lg:grid-cols-[190px_130px_150px_minmax(0,1fr)_auto]">
                <input
                  type="datetime-local"
                  value={slotForm.starts_at}
                  onChange={(event) => setSlotForm((current) => ({ ...current, starts_at: event.target.value }))}
                  className="rounded-xl border border-base-300 bg-base-100 px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <input
                  type="number"
                  min={15}
                  step={15}
                  value={slotForm.duration_minutes}
                  onChange={(event) => setSlotForm((current) => ({ ...current, duration_minutes: Number(event.target.value) || 30 }))}
                  className="rounded-xl border border-base-300 bg-base-100 px-3 py-2 text-sm outline-none focus:border-primary"
                  aria-label="Duration minutes"
                />
                <select
                  value={slotForm.purpose}
                  onChange={(event) => setSlotForm((current) => ({ ...current, purpose: event.target.value as BookingSlot["purpose"] }))}
                  className="rounded-xl border border-base-300 bg-base-100 px-3 py-2 text-sm outline-none focus:border-primary"
                >
                  <option value="collab">Collab call</option>
                  <option value="mentor">Mentorship</option>
                  <option value="consult">Consult</option>
                </select>
                <input
                  value={slotForm.note}
                  onChange={(event) => setSlotForm((current) => ({ ...current, note: event.target.value }))}
                  placeholder="Optional note"
                  className="rounded-xl border border-base-300 bg-base-100 px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => void createBookingSlot()}
                  disabled={isSavingSlot}
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-content transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
                >
                  {isSavingSlot ? "Adding..." : "Add slot"}
                </button>
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-2">
                {bookingSlots.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-base-300 px-5 py-8 text-center text-sm font-medium text-base-content/70 lg:col-span-2">
                    Add your first slot to start receiving booking requests.
                  </div>
                ) : bookingSlots.map((slot) => (
                  <div key={slot.id} className="rounded-2xl border border-base-300 bg-base-100 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold">{new Date(slot.starts_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</p>
                        <p className="mt-1 text-sm capitalize text-base-content/70">{slot.purpose} · {slot.duration_minutes} min</p>
                        {slot.note && <p className="mt-2 text-sm font-medium text-base-content/70">{slot.note}</p>}
                      </div>
                      <span className="rounded-full bg-base-200 px-2.5 py-1 text-xs font-medium font-bold text-base-content/70">{slot.requests?.length || 0} requests</span>
                    </div>
                    <div className="mt-4 space-y-2">
                      {(slot.requests || []).length === 0 ? (
                        <div className="rounded-xl border border-dashed border-base-300 px-4 py-4 text-center text-sm font-medium text-base-content/70">No requests yet.</div>
                      ) : slot.requests?.map((request) => (
                        <div key={request.id} className="rounded-xl border border-base-300 bg-base-200/40 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-bold">@{request.requester.username || "creator"}</p>
                            <span className="rounded-full bg-base-100 px-2 py-1 text-[11px] font-bold capitalize text-base-content/70">{request.status}</span>
                          </div>
                          {request.message && <p className="mt-1 text-sm font-medium leading-6 text-base-content/70">{request.message}</p>}
                          <div className="mt-3 flex flex-wrap gap-2">
                            {(["accepted", "declined"] as BookingRequest["status"][]).map((nextStatus) => (
                              <button
                                key={nextStatus}
                                type="button"
                                onClick={() => void updateBookingStatus(slot.id, request.id, nextStatus)}
                                disabled={updatingBookingId === request.id}
                                className="rounded-full border border-base-300 px-3 py-1.5 text-xs font-bold capitalize transition hover:bg-base-100 disabled:cursor-wait disabled:opacity-60"
                              >
                                {nextStatus}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-6 rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold">Membership tiers</h2>
                  <p className="mt-1 text-sm font-medium text-base-content/70">
                    Set the public support options people will see on your profile.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void saveMembershipTiers()}
                  disabled={isSavingTiers}
                  className="btn btn-primary btn-sm rounded-xl"
                >
                  {isSavingTiers ? "Saving..." : "Save tiers"}
                </button>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                {membershipTiers.map((tier) => (
                  <div key={tier.id} className="rounded-2xl border border-base-300 bg-base-100 p-4">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold">{tier.name}</p>
                        <p className="text-xs font-medium text-base-content/70">{tier.enabled ? "Visible to supporters" : "Hidden for now"}</p>
                      </div>
                      <label className="flex cursor-pointer items-center gap-2 text-xs font-bold">
                        <input
                          type="checkbox"
                          checked={tier.enabled}
                          onChange={(event) => updateMembershipTier(tier.id, { enabled: event.target.checked })}
                          className="toggle toggle-primary toggle-sm"
                        />
                        Enabled
                      </label>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_120px]">
                      <input
                        value={tier.name}
                        onChange={(event) => updateMembershipTier(tier.id, { name: event.target.value })}
                        className="rounded-xl border border-base-300 bg-base-100 px-3 py-2 text-sm outline-none focus:border-primary"
                        aria-label="Tier name"
                      />
                      <input
                        value={tier.price}
                        onChange={(event) => updateMembershipTier(tier.id, { price: event.target.value })}
                        className="rounded-xl border border-base-300 bg-base-100 px-3 py-2 text-sm outline-none focus:border-primary"
                        aria-label="Tier price"
                      />
                    </div>
                    <textarea
                      value={tier.description}
                      onChange={(event) => updateMembershipTier(tier.id, { description: event.target.value })}
                      rows={2}
                      className="mt-3 w-full rounded-xl border border-base-300 bg-base-100 px-3 py-2 text-sm outline-none focus:border-primary"
                      aria-label="Tier description"
                    />
                    <div className="mt-3 space-y-2">
                      {tier.perks.map((perk, index) => (
                        <input
                          key={`${tier.id}-${index}`}
                          value={perk}
                          onChange={(event) => updateTierPerk(tier.id, index, event.target.value)}
                          className="w-full rounded-xl border border-base-300 bg-base-100 px-3 py-2 text-sm outline-none focus:border-primary"
                          aria-label={`Perk ${index + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-6 rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">Top clips</h2>
                  <p className="mt-1 text-sm font-medium text-base-content/70">Your strongest videos are the best place to send new supporters.</p>
                </div>
                <button type="button" onClick={() => router.push("/analytics")} className="text-sm font-bold text-primary">
                  Analytics
                </button>
              </div>

              {topVideos.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-base-300 px-6 py-10 text-center text-sm font-medium text-base-content/70">
                  Upload your first clips and your best performers will appear here.
                </div>
              ) : (
                <div className="divide-y divide-base-300">
                  {topVideos.slice(0, 5).map((video, index) => (
                    <button
                      key={video.id}
                      type="button"
                      onClick={() => router.push(`/video/${video.id}`)}
                      className="flex w-full items-center gap-3 py-3 text-left transition hover:bg-base-200/60"
                    >
                      <span className="w-6 shrink-0 text-sm font-bold text-base-content/70">{index + 1}</span>
                      <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-xl bg-black">
                        {video.thumbnail_url ? (
                          <Image src={video.thumbnail_url} alt="" fill sizes="48px" className="object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-white/60">
                            <Play size={16} fill="currentColor" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{video.title || "Untitled clip"}</p>
                        <div className="mt-1 flex flex-wrap gap-3 text-xs text-base-content/65">
                          <span>{formatMetric(video.views)} views</span>
                          <span>{formatMetric(video.likes)} likes</span>
                          <span>{formatMetric(video.saves)} saves</span>
                          <span>{formatMetric(video.completion_rate, "%")} completion</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: typeof VideoIcon; label: string; value: string }) {
  return (
    <section className="rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon size={19} />
      </div>
      <p className="truncate text-2xl font-bold capitalize">{value}</p>
      <p className="mt-1 text-sm font-medium text-base-content/70">{label}</p>
    </section>
  );
}
