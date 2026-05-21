"use client";

import CallButton from "@/app/components/calls/CallButton";
import UserAvatar from "@/app/components/common/UserAvatar";
import { RootState } from "@/app/store/store";
import { Briefcase, Check, Handshake, MessageCircle, Plus, Search, Send, Sparkles, UserRoundCheck, Users, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";

type CollabMode = "all" | "collab" | "hire" | "mentor";

type MarketplaceUser = {
  id: string;
  username?: string | null;
  first_name?: string;
  last_name?: string;
  follower_count?: number;
  profile?: {
    avatar?: string | null;
    bio?: string | null;
    skill_tags?: string;
    availability_status?: string;
    open_to_collab?: boolean;
    open_to_hire?: boolean;
    open_to_mentor?: boolean;
  };
};

type CollabRequest = {
  id: string;
  request_type: "collab" | "hire" | "mentor";
  title: string;
  description: string;
  skills: string;
  budget: string;
  status: string;
  created_at: string;
  creator: MarketplaceUser;
  application_count?: number;
  my_application?: CollabApplication | null;
  applications?: CollabApplication[];
};

type CollabApplication = {
  id: string;
  applicant: MarketplaceUser;
  pitch: string;
  status: "submitted" | "shortlisted" | "accepted" | "declined";
  created_at: string;
};

const emptyRequestForm = {
  request_type: "collab" as CollabRequest["request_type"],
  title: "",
  description: "",
  skills: "",
  budget: "",
};

const modeOptions = [
  { id: "all" as const, label: "All", icon: Users },
  { id: "collab" as const, label: "Collab", icon: Handshake },
  { id: "hire" as const, label: "Hire", icon: Briefcase },
  { id: "mentor" as const, label: "Mentor", icon: UserRoundCheck },
];

const skillFilters = ["All", "Comedy", "Music", "Dance", "Fashion", "Gaming", "Food", "Fitness", "Beauty", "Tech", "Film", "Sports", "Travel"];

function parseSkills(value?: string, limit = 4) {
  return String(value || "")
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean)
    .slice(0, limit);
}

function getDisplayName(person: MarketplaceUser) {
  return `${person.first_name || ""} ${person.last_name || ""}`.trim() || person.username || "Creator";
}

function matchesMode(person: MarketplaceUser, mode: CollabMode) {
  if (mode === "all") {
    return Boolean(person.profile?.open_to_collab || person.profile?.open_to_hire || person.profile?.open_to_mentor);
  }
  if (mode === "collab") return Boolean(person.profile?.open_to_collab);
  if (mode === "hire") return Boolean(person.profile?.open_to_hire);
  return Boolean(person.profile?.open_to_mentor);
}

export default function CollabsPage() {
  const router = useRouter();
  const { isAuthenticated, isBootstrapped } = useSelector((state: RootState) => state.auth);
  const [people, setPeople] = useState<MarketplaceUser[]>([]);
  const [requests, setRequests] = useState<CollabRequest[]>([]);
  const [myRequests, setMyRequests] = useState<CollabRequest[]>([]);
  const [requestForm, setRequestForm] = useState(emptyRequestForm);
  const [selectedRequest, setSelectedRequest] = useState<CollabRequest | null>(null);
  const [applicationPitch, setApplicationPitch] = useState("");
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<CollabMode>("all");
  const [skill, setSkill] = useState("All");
  const [isLoading, setIsLoading] = useState(true);
  const [isRequestsLoading, setIsRequestsLoading] = useState(true);
  const [isMyRequestsLoading, setIsMyRequestsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [updatingApplicationId, setUpdatingApplicationId] = useState<string | null>(null);
  const [showRequestForm, setShowRequestForm] = useState(false);

  useEffect(() => {
    if (isBootstrapped && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isBootstrapped, router]);

  const loadPeople = useCallback(async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/messages/users", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.detail || "Unable to load creators");
      }
      setPeople(Array.isArray(data.results) ? data.results : []);
    } catch (error) {
      console.error("Unable to load collab marketplace", error);
      setPeople([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void loadPeople();
  }, [loadPeople]);

  const loadRequests = useCallback(async () => {
    if (!isAuthenticated) return;

    setIsRequestsLoading(true);
    try {
      const params = new URLSearchParams();
      if (mode !== "all") params.set("type", mode);
      if (query.trim()) params.set("search", query.trim());

      const response = await fetch(`/api/collabs/requests?${params.toString()}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.detail || "Unable to load collab requests");
      }
      setRequests(Array.isArray(data.results) ? data.results : Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Unable to load collab requests", error);
      setRequests([]);
    } finally {
      setIsRequestsLoading(false);
    }
  }, [isAuthenticated, mode, query]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadRequests();
    }, 200);

    return () => window.clearTimeout(timeoutId);
  }, [loadRequests]);

  const loadMyRequests = useCallback(async () => {
    if (!isAuthenticated) return;

    setIsMyRequestsLoading(true);
    try {
      const response = await fetch("/api/collabs/requests?mine=1", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.detail || "Unable to load your requests");
      }
      setMyRequests(Array.isArray(data.results) ? data.results : Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Unable to load my collab requests", error);
      setMyRequests([]);
    } finally {
      setIsMyRequestsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void loadMyRequests();
  }, [loadMyRequests]);

  const filteredPeople = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const normalizedSkill = skill === "All" ? "" : skill.toLowerCase();

    return people.filter((person) => {
      const searchableText = [
        person.username,
        person.first_name,
        person.last_name,
        person.profile?.bio,
        person.profile?.skill_tags,
      ].join(" ").toLowerCase();
      const skillText = String(person.profile?.skill_tags || "").toLowerCase();

      return (
        matchesMode(person, mode) &&
        (!normalizedQuery || searchableText.includes(normalizedQuery)) &&
        (!normalizedSkill || skillText.includes(normalizedSkill))
      );
    });
  }, [mode, people, query, skill]);

  const featuredCount = people.filter((person) => matchesMode(person, "all")).length;

  const filteredRequests = useMemo(() => {
    const normalizedSkill = skill === "All" ? "" : skill.toLowerCase();
    if (!normalizedSkill) return requests;
    return requests.filter((request) => request.skills.toLowerCase().includes(normalizedSkill));
  }, [requests, skill]);

  const postCollabRequest = async () => {
    if (!requestForm.title.trim()) {
      toast.error("Add a title for the request");
      return;
    }

    setIsPosting(true);
    try {
      const response = await fetch("/api/collabs/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestForm),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.detail || data?.title?.[0] || "Unable to post request");
      }
      setMyRequests((current) => [data, ...current]);
      setRequestForm(emptyRequestForm);
      setShowRequestForm(false);
      toast.success("Collab request posted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to post request");
    } finally {
      setIsPosting(false);
    }
  };

  const submitApplication = async () => {
    if (!selectedRequest) return;
    if (!applicationPitch.trim()) {
      toast.error("Add a short pitch");
      return;
    }

    setIsApplying(true);
    try {
      const response = await fetch(`/api/collabs/requests/${selectedRequest.id}/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pitch: applicationPitch }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.detail || data?.non_field_errors?.[0] || "Unable to apply");
      }
      setRequests((current) =>
        current.map((request) =>
          request.id === selectedRequest.id
            ? { ...request, my_application: data, application_count: Number(request.application_count || 0) + 1 }
            : request
        )
      );
      setSelectedRequest(null);
      setApplicationPitch("");
      toast.success("Application sent");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to apply");
    } finally {
      setIsApplying(false);
    }
  };

  const updateApplicationStatus = async (requestId: string, applicationId: string, status: CollabApplication["status"]) => {
    setUpdatingApplicationId(applicationId);
    try {
      const response = await fetch(`/api/collabs/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.detail || "Unable to update application");
      }
      setMyRequests((current) =>
        current.map((request) => {
          if (request.id !== requestId) return request;
          return {
            ...request,
            applications: (request.applications || []).map((application) =>
              application.id === applicationId ? data : application
            ),
          };
        })
      );
      toast.success("Application updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update application");
    } finally {
      setUpdatingApplicationId(null);
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
        <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary">
              <Handshake size={16} />
              Collab Marketplace
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">Find creators to build with</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-base-content/70">
              Discover people open to collaborations, paid work, mentoring, and creative partnerships.
            </p>
          </div>

          <div className="rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Sparkles size={19} />
              </div>
              <div>
                <p className="text-2xl font-bold">{featuredCount}</p>
                <p className="text-sm font-medium text-base-content/70">open creators</p>
              </div>
            </div>
          </div>
        </div>

        <section className="mb-5 rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm">
          <div className="flex items-center gap-3 rounded-xl border border-base-300 bg-base-100 px-3 py-2">
            <Search size={18} className="text-base-content/70" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search creators, skills, bio, or username"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-base-content/40"
            />
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {modeOptions.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMode(item.id)}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition ${
                    mode === item.id
                      ? "border-primary bg-primary text-primary-content"
                      : "border-base-300 bg-base-100 text-base-content/65 hover:bg-base-200"
                  }`}
                >
                  <Icon size={14} />
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {skillFilters.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setSkill(item)}
                className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition ${
                  skill === item
                    ? "border-base-content bg-base-content text-base-100"
                    : "border-base-300 bg-base-100 text-base-content/65 hover:bg-base-200"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </section>

        <section className="mb-5 rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold">Post a collab request</h2>
              <p className="mt-1 text-sm font-medium leading-6 text-base-content/70">
                Tell creators what you need and let them reach out.
              </p>
            </div>
            <button type="button" onClick={() => setShowRequestForm((current) => !current)} className="btn btn-primary btn-sm rounded-xl">
              <Plus size={16} />
              {showRequestForm ? "Close" : "Post request"}
            </button>
          </div>
          {showRequestForm && (
            <div className="mt-5 grid gap-3">
              <div className="grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)_160px]">
                <select
                  value={requestForm.request_type}
                  onChange={(event) => setRequestForm((current) => ({ ...current, request_type: event.target.value as CollabRequest["request_type"] }))}
                  className="rounded-xl border border-base-300 bg-base-100 px-3 py-2 text-sm outline-none focus:border-primary"
                >
                  <option value="collab">Collab</option>
                  <option value="hire">Paid work</option>
                  <option value="mentor">Mentor</option>
                </select>
                <input
                  value={requestForm.title}
                  onChange={(event) => setRequestForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Need a dancer for a music clip"
                  className="rounded-xl border border-base-300 bg-base-100 px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <input
                  value={requestForm.budget}
                  onChange={(event) => setRequestForm((current) => ({ ...current, budget: event.target.value }))}
                  placeholder="Budget"
                  className="rounded-xl border border-base-300 bg-base-100 px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
              <textarea
                value={requestForm.description}
                onChange={(event) => setRequestForm((current) => ({ ...current, description: event.target.value }))}
                rows={3}
                placeholder="Describe the idea, timeline, location, or what kind of creator you need."
                className="rounded-xl border border-base-300 bg-base-100 px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  value={requestForm.skills}
                  onChange={(event) => setRequestForm((current) => ({ ...current, skills: event.target.value }))}
                  placeholder="Skills: dance, editing, comedy"
                  className="min-w-0 flex-1 rounded-xl border border-base-300 bg-base-100 px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => void postCollabRequest()}
                  disabled={isPosting}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-content transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
                >
                  <Send size={16} />
                  {isPosting ? "Posting..." : "Publish"}
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="mb-7">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Your requests</h2>
              <p className="mt-1 text-sm font-medium text-base-content/70">Review applicants and move good matches forward.</p>
            </div>
          </div>
          {isMyRequestsLoading ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className="h-44 animate-pulse rounded-2xl bg-base-200" />
              ))}
            </div>
          ) : myRequests.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-base-300 bg-base-100 px-6 py-8 text-center text-sm font-medium text-base-content/70">
              Your posted requests and applicants will appear here.
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {myRequests.map((request) => (
                <article key={request.id} className="rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold uppercase text-primary">
                      {request.request_type}
                    </span>
                    <span className="rounded-full bg-base-200 px-2.5 py-1 text-[11px] font-bold text-base-content/70">
                      {request.applications?.length || 0} applicants
                    </span>
                  </div>
                  <h3 className="font-bold">{request.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm font-medium leading-6 text-base-content/70">{request.description}</p>

                  <div className="mt-4 space-y-3">
                    {(request.applications || []).length === 0 ? (
                      <div className="rounded-xl border border-dashed border-base-300 px-4 py-5 text-center text-sm text-base-content/65">
                        No applications yet.
                      </div>
                    ) : (
                      request.applications?.map((application) => {
                        const applicantName = getDisplayName(application.applicant);
                        return (
                          <div key={application.id} className="rounded-xl border border-base-300 bg-base-200/40 p-3">
                            <div className="flex items-start gap-3">
                              <UserAvatar user={application.applicant} size={38} showPresence isOnline={application.applicant.profile?.availability_status === "available"} />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <button
                                    type="button"
                                    onClick={() => application.applicant.username && router.push(`/profile/${application.applicant.username}`)}
                                    className="truncate text-sm font-bold"
                                  >
                                    {applicantName}
                                  </button>
                                  <span className="rounded-full bg-base-100 px-2 py-1 text-[11px] font-bold capitalize text-base-content/70">
                                    {application.status}
                                  </span>
                                </div>
                                <p className="mt-1 text-sm leading-6 text-base-content/65">{application.pitch}</p>
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {(["shortlisted", "accepted", "declined"] as CollabApplication["status"][]).map((nextStatus) => (
                                <button
                                  key={nextStatus}
                                  type="button"
                                  onClick={() => void updateApplicationStatus(request.id, application.id, nextStatus)}
                                  disabled={updatingApplicationId === application.id}
                                  className="rounded-full border border-base-300 px-3 py-1.5 text-xs font-bold capitalize transition hover:bg-base-100 disabled:cursor-wait disabled:opacity-60"
                                >
                                  {nextStatus}
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={() => router.push(`/messages?user=${application.applicant.id}`)}
                                className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-content transition hover:opacity-90"
                              >
                                Message
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mb-7">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Open requests</h2>
              <p className="mt-1 text-sm font-medium text-base-content/70">Jobs, collaborations, and mentorship asks from creators.</p>
            </div>
          </div>
          {isRequestsLoading ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-40 animate-pulse rounded-2xl bg-base-200" />
              ))}
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-base-300 bg-base-100 px-6 py-10 text-center text-sm font-medium text-base-content/70">
              No open requests match these filters.
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {filteredRequests.map((request) => {
                const creatorName = getDisplayName(request.creator);
                return (
                  <article key={request.id} className="rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold uppercase text-primary">
                        {request.request_type}
                      </span>
                      {request.budget && (
                        <span className="rounded-full bg-base-200 px-2.5 py-1 text-[11px] font-bold text-base-content/70">
                          {request.budget}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold">{request.title}</h3>
                    {request.description && (
                      <p className="mt-2 line-clamp-2 text-sm font-medium leading-6 text-base-content/70">{request.description}</p>
                    )}
                    {request.skills && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {parseSkills(request.skills, 5).map((item) => (
                          <span key={item} className="rounded-full bg-base-200 px-2.5 py-1 text-[11px] font-semibold text-base-content/70">
                            {item}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => request.creator.username && router.push(`/profile/${request.creator.username}`)}
                        className="flex min-w-0 items-center gap-2 text-left"
                      >
                        <UserAvatar user={request.creator} size={34} showPresence isOnline={request.creator.profile?.availability_status === "available"} />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">{creatorName}</span>
                          <span className="block truncate text-xs text-base-content/65">@{request.creator.username || "creator"}</span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (request.my_application) {
                            router.push(`/messages?user=${request.creator.id}`);
                            return;
                          }
                          setSelectedRequest(request);
                          setApplicationPitch("");
                        }}
                        className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition ${
                          request.my_application
                            ? "border border-base-300 text-base-content hover:bg-base-200"
                            : "bg-primary text-primary-content hover:opacity-90"
                        }`}
                      >
                        {request.my_application ? <MessageCircle size={15} /> : <Send size={15} />}
                        {request.my_application ? request.my_application.status : "Apply"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 9 }).map((_, index) => (
              <div key={index} className="h-56 animate-pulse rounded-2xl bg-base-200" />
            ))}
          </div>
        ) : filteredPeople.length === 0 ? (
          <div className="rounded-2xl border border-base-300 bg-base-100 px-6 py-14 text-center">
            <Handshake className="mx-auto mb-3 text-base-content/35" size={38} />
            <p className="font-semibold">No creators found</p>
            <p className="mt-2 text-sm font-medium text-base-content/70">Try another filter or search term.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filteredPeople.map((person) => {
              const displayName = getDisplayName(person);
              const skills = parseSkills(person.profile?.skill_tags);
              const isActive = person.profile?.availability_status === "available";
              const flags = [
                person.profile?.open_to_collab ? "Collab" : "",
                person.profile?.open_to_hire ? "Hire" : "",
                person.profile?.open_to_mentor ? "Mentor" : "",
              ].filter(Boolean);

              return (
                <article key={person.id} className="rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => person.username && router.push(`/profile/${person.username}`)}
                      className="shrink-0"
                      aria-label={`Open ${displayName}'s profile`}
                    >
                      <UserAvatar user={person} size={56} showPresence isOnline={isActive} />
                    </button>

                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => person.username && router.push(`/profile/${person.username}`)}
                        className="block max-w-full text-left"
                      >
                        <p className="truncate font-semibold">{displayName}</p>
                        <p className="truncate text-sm font-medium text-base-content/70">@{person.username || "creator"}</p>
                      </button>
                      <p className="mt-1 text-xs font-medium text-base-content/70">{person.follower_count || 0} followers</p>
                    </div>
                  </div>

                  {person.profile?.bio && (
                    <p className="mt-4 line-clamp-2 min-h-[44px] text-sm font-medium leading-6 text-base-content/70">
                      {person.profile.bio}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {flags.map((flag) => (
                      <span key={flag} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
                        <Check size={12} />
                        {flag}
                      </span>
                    ))}
                    {skills.map((item) => (
                      <span key={item} className="rounded-full bg-base-200 px-2.5 py-1 text-[11px] font-semibold text-base-content/70">
                        {item}
                      </span>
                    ))}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => router.push(`/messages?user=${person.id}`)}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-content transition hover:opacity-90"
                    >
                      <MessageCircle size={16} />
                      Message
                    </button>
                    <button
                      type="button"
                      onClick={() => person.username && router.push(`/profile/${person.username}`)}
                      className="inline-flex items-center justify-center rounded-xl border border-base-300 px-4 py-2 text-sm font-bold transition hover:bg-base-200"
                    >
                      Profile
                    </button>
                    <CallButton
                      peer={{
                        id: person.id,
                        username: person.username || undefined,
                        first_name: person.first_name,
                        last_name: person.last_name,
                      }}
                      type="audio"
                      availabilityStatus={person.profile?.availability_status || "available"}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
      {selectedRequest && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/35 px-4 pb-4 pt-16 backdrop-blur-sm sm:items-center sm:pb-0">
          <div className="w-full max-w-lg rounded-2xl border border-base-300 bg-base-100 p-5 text-base-content shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-primary">Apply</p>
                <h2 className="mt-1 text-lg font-bold">{selectedRequest.title}</h2>
                <p className="mt-2 text-sm font-medium leading-6 text-base-content/70">
                  Send a short pitch so the creator can quickly understand why you are a good fit.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-base-200"
                aria-label="Close application dialog"
              >
                <X size={18} />
              </button>
            </div>
            <textarea
              value={applicationPitch}
              onChange={(event) => setApplicationPitch(event.target.value)}
              rows={5}
              placeholder="Tell them your idea, relevant skill, availability, or link to work they should check."
              className="mt-5 w-full rounded-xl border border-base-300 bg-base-100 px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="rounded-xl border border-base-300 px-4 py-2 text-sm font-bold transition hover:bg-base-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitApplication()}
                disabled={isApplying}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-content transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
              >
                <Send size={16} />
                {isApplying ? "Sending..." : "Send application"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
