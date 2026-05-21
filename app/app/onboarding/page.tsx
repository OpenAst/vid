"use client";

import UserAvatar from "@/app/components/common/UserAvatar";
import { fetchUser, updateUser } from "@/app/store/authSlice";
import { AppDispatch, RootState } from "@/app/store/store";
import { Check, ChevronRight, ImagePlus, Sparkles, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";

type OnboardingStep = "profile" | "interests" | "follow";

type SuggestedUser = {
  id: string;
  username?: string | null;
  first_name?: string;
  last_name?: string;
  is_following?: boolean;
  follower_count?: number;
  profile?: {
    avatar?: string | null;
    skill_tags?: string;
    availability_status?: string;
  };
};

const steps: Array<{ id: OnboardingStep; label: string }> = [
  { id: "profile", label: "Profile" },
  { id: "interests", label: "Interests" },
  { id: "follow", label: "Follow" },
];

const interestOptions = [
  "Comedy",
  "Music",
  "Dance",
  "Fashion",
  "Gaming",
  "Food",
  "Fitness",
  "Beauty",
  "Tech",
  "Film",
  "Sports",
  "Travel",
];

const availabilityOptions = [
  { value: "available", label: "Active" },
  { value: "offline", label: "Inactive" },
];

export default function OnboardingPage() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { user, isAuthenticated, isBootstrapped } = useSelector((state: RootState) => state.auth);
  const [stepIndex, setStepIndex] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [people, setPeople] = useState<SuggestedUser[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(() => new Set());
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [profileForm, setProfileForm] = useState({
    first_name: "",
    last_name: "",
    bio: "",
    skill_tags: "",
    availability_status: "available",
  });

  const currentStep = steps[stepIndex].id;

  useEffect(() => {
    if (isBootstrapped && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isBootstrapped, router]);

  useEffect(() => {
    if (!user) return;
    setProfileForm({
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      bio: user.profile?.bio || "",
      skill_tags: user.profile?.skill_tags || "",
      availability_status: user.profile?.availability_status || "available",
    });
  }, [user]);

  useEffect(() => {
    const loadPeople = async () => {
      try {
        const response = await fetch("/api/messages/users", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) return;
        const results = Array.isArray(data.results) ? data.results : [];
        setPeople(results.slice(0, 12));
        setFollowingIds(new Set(results.filter((person: SuggestedUser) => person.is_following).map((person: SuggestedUser) => person.id)));
      } catch (error) {
        console.error("Failed to load follow suggestions", error);
      }
    };

    if (isAuthenticated) {
      void loadPeople();
    }
  }, [isAuthenticated]);

  const selectedInterests = useMemo(() => {
    return profileForm.skill_tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }, [profileForm.skill_tags]);

  const updateProfile = async (extraUpdates: Record<string, unknown> = {}) => {
    let avatarUrl = user?.profile?.avatar || "";

    if (selectedFile) {
      const presignResponse = await fetch("/api/auth/get_avatar_url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_name: selectedFile.name,
          file_type: selectedFile.type,
        }),
      });

      if (!presignResponse.ok) {
        throw new Error("Could not prepare avatar upload");
      }

      const { upload_url, avatar_url } = await presignResponse.json();
      const uploadResponse = await fetch(upload_url, {
        method: "PUT",
        headers: { "Content-Type": selectedFile.type },
        body: selectedFile,
      });

      if (!uploadResponse.ok) {
        throw new Error("Could not upload avatar");
      }

      avatarUrl = avatar_url;
    }

    await dispatch(updateUser({
      first_name: profileForm.first_name,
      last_name: profileForm.last_name,
      bio: profileForm.bio,
      skill_tags: profileForm.skill_tags,
      availability_status: profileForm.availability_status,
      ...(avatarUrl && { avatar: avatarUrl }),
      ...extraUpdates,
    })).unwrap();
    await dispatch(fetchUser()).unwrap();
    setSelectedFile(null);
    setPreviewImage(null);
  };

  const updateOnboardingFlags = async (updates: {
    onboarding_completed?: boolean;
    skipped_profile_setup?: boolean;
    skipped_interests?: boolean;
    skipped_follow_suggestions?: boolean;
  }) => {
    await dispatch(updateUser(updates)).unwrap();
    await dispatch(fetchUser()).unwrap();
  };

  const goNext = () => {
    if (stepIndex < steps.length - 1) {
      setStepIndex((current) => current + 1);
      return;
    }
    router.replace("/");
  };

  const saveAndContinue = async () => {
    setIsSaving(true);
    try {
      if (currentStep === "profile") {
        await updateProfile({ skipped_profile_setup: false });
      }

      if (currentStep === "interests") {
        await updateProfile({ skipped_interests: false });
      }

      if (currentStep === "follow") {
        await updateProfile({ skipped_follow_suggestions: false, onboarding_completed: true });
        toast.success("Welcome to OneClyq");
      }

      goNext();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save onboarding");
    } finally {
      setIsSaving(false);
    }
  };

  const skipStep = async () => {
    setIsSaving(true);
    try {
      if (currentStep === "profile") {
        await updateOnboardingFlags({ skipped_profile_setup: true });
      }

      if (currentStep === "interests") {
        await updateOnboardingFlags({ skipped_interests: true });
      }

      if (currentStep === "follow") {
        await updateOnboardingFlags({ skipped_follow_suggestions: true, onboarding_completed: true });
        toast.success("You can finish your profile later");
      }

      goNext();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not skip this step");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleInterest = (interest: string) => {
    const next = new Set(selectedInterests);
    if (next.has(interest)) {
      next.delete(interest);
    } else {
      next.add(interest);
    }
    setProfileForm((current) => ({ ...current, skill_tags: [...next].join(", ") }));
  };

  const followPerson = async (person: SuggestedUser) => {
    if (followingIds.has(person.id)) return;

    setFollowingIds((current) => new Set(current).add(person.id));
    try {
      const response = await fetch(`/api/auth/follow/${person.id}`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.detail || data?.error || "Could not follow");
      }
    } catch (error) {
      setFollowingIds((current) => {
        const next = new Set(current);
        next.delete(person.id);
        return next;
      });
      toast.error(error instanceof Error ? error.message : "Could not follow");
    }
  };

  if (!isBootstrapped || !user) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-base-100">
        <div className="h-10 w-10 animate-pulse rounded-2xl bg-base-300" aria-hidden="true" />
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-base-100 px-4 py-6 text-base-content md:pl-[124px] md:pr-8">
      <div className="mx-auto flex min-h-[calc(100dvh-48px)] w-full max-w-4xl flex-col">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-primary">Welcome to OneClyq</p>
            <h1 className="mt-1 text-2xl font-bold">Set up your creator experience</h1>
          </div>
          <button
            type="button"
            onClick={() => void skipStep()}
            disabled={isSaving}
            className="rounded-full border border-base-300 bg-base-100 px-4 py-2 text-sm font-semibold text-base-content shadow-sm transition hover:border-primary/40 hover:bg-primary/10 disabled:cursor-wait disabled:opacity-80"
          >
            Skip
          </button>
        </div>

        <div className="mb-6 grid grid-cols-3 gap-2">
          {steps.map((step, index) => (
            <div key={step.id} className={`rounded-full px-3 py-2 text-center text-xs font-semibold ${
              index <= stepIndex ? "bg-primary text-primary-content" : "bg-base-200 text-base-content/70"
            }`}
            >
              {step.label}
            </div>
          ))}
        </div>

        <section className="flex-1 rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm sm:p-6">
          {currentStep === "profile" && (
            <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
              <div className="flex flex-col items-center justify-center rounded-2xl bg-base-200 p-6 text-center">
                <UserAvatar
                  user={{ ...user, profile: { avatar: previewImage || user.profile?.avatar } }}
                  size={112}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    setSelectedFile(file);
                    setPreviewImage(URL.createObjectURL(file));
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-content shadow-md shadow-primary/20 transition hover:opacity-90"
                >
                  <ImagePlus size={16} />
                  Add avatar
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium">First name</span>
                    <input
                      value={profileForm.first_name}
                      onChange={(event) => setProfileForm((current) => ({ ...current, first_name: event.target.value }))}
                      className="mt-1 w-full rounded-xl border border-base-300 bg-base-100 px-3 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium">Last name</span>
                    <input
                      value={profileForm.last_name}
                      onChange={(event) => setProfileForm((current) => ({ ...current, last_name: event.target.value }))}
                      className="mt-1 w-full rounded-xl border border-base-300 bg-base-100 px-3 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="text-sm font-medium">Short bio</span>
                  <textarea
                    value={profileForm.bio}
                    onChange={(event) => setProfileForm((current) => ({ ...current, bio: event.target.value }))}
                    rows={4}
                    placeholder="Tell people what you create or love watching."
                    className="mt-1 w-full resize-none rounded-xl border border-base-300 bg-base-100 px-3 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium">Availability</span>
                  <select
                    value={profileForm.availability_status}
                    onChange={(event) => setProfileForm((current) => ({ ...current, availability_status: event.target.value }))}
                    className="mt-1 w-full rounded-xl border border-base-300 bg-base-100 px-3 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  >
                    {availabilityOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          )}

          {currentStep === "interests" && (
            <div>
              <div className="mb-5 flex items-start gap-3">
                <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                  <Sparkles size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Choose what you like</h2>
                  <p className="mt-1 text-sm font-medium text-base-content/70">This helps OneClyq shape your feed and profile tags.</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {interestOptions.map((interest) => {
                  const selected = selectedInterests.includes(interest);
                  return (
                    <button
                      key={interest}
                      type="button"
                      onClick={() => toggleInterest(interest)}
                      className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                        selected
                          ? "border-primary bg-primary/15 text-base-content shadow-md shadow-primary/20 ring-1 ring-primary/25"
                          : "border-base-300 bg-base-100 text-base-content shadow-sm hover:border-primary/40 hover:bg-primary/10"
                      }`}
                    >
                      {interest}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {currentStep === "follow" && (
            <div>
              <div className="mb-5 flex items-start gap-3">
                <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                  <UserPlus size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Follow a few creators</h2>
                  <p className="mt-1 text-sm font-medium text-base-content/70">Start with at least one person, or skip and explore freely.</p>
                </div>
              </div>

              {people.length === 0 ? (
                <div className="rounded-2xl bg-base-200 p-8 text-center text-sm font-medium text-base-content/70">
                  No suggestions yet. You can start watching now.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {people.map((person) => {
                    const followed = followingIds.has(person.id);
                    return (
                      <div key={person.id} className="rounded-2xl border border-base-300 p-3">
                        <div className="flex items-center gap-3">
                          <UserAvatar user={person} size={44} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold">{person.first_name || person.username || "Creator"}</p>
                            <p className="truncate text-sm font-medium text-base-content/70">@{person.username || "creator"}</p>
                          </div>
                        </div>
                        {person.profile?.skill_tags && (
                          <p className="mt-3 truncate text-xs text-base-content/65">{person.profile.skill_tags}</p>
                        )}
                        <button
                          type="button"
                          onClick={() => void followPerson(person)}
                          disabled={followed}
                          className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                            followed
                              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                              : "bg-primary text-primary-content shadow-md shadow-primary/20 hover:opacity-90"
                          }`}
                        >
                          {followed ? <Check size={16} /> : <UserPlus size={16} />}
                          {followed ? "Following" : "Follow"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </section>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
            disabled={stepIndex === 0 || isSaving}
            className="rounded-full border border-base-300 bg-base-100 px-4 py-2 text-sm font-semibold text-base-content shadow-sm transition hover:border-primary/40 hover:bg-primary/10 disabled:invisible"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => void saveAndContinue()}
            disabled={isSaving}
            className="inline-flex min-w-[180px] items-center justify-center gap-2 rounded-full border border-primary bg-primary/15 px-7 py-3.5 text-sm font-extrabold text-base-content shadow-lg shadow-primary/25 ring-2 ring-primary/20 transition hover:-translate-y-0.5 hover:bg-primary/20 disabled:cursor-wait disabled:opacity-90 sm:text-base"
          >
            {isSaving ? "Saving..." : currentStep === "follow" ? "Start watching" : "Continue"}
            <ChevronRight size={17} />
          </button>
        </div>
      </div>
    </main>
  );
}
