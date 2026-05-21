"use client";

import { RootState } from "@/app/store/store";
import { CalendarDays, Clapperboard, Handshake, MessageCircle, Play, Search, ShieldCheck, Sparkles, UploadCloud, Users } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSelector } from "react-redux";

const productPoints = [
  {
    icon: Play,
    title: "Watch what moves fast",
    text: "A vertical feed built for short clips, quick reactions, saved moments, and fresh discovery.",
  },
  {
    icon: Users,
    title: "Find real creators",
    text: "Profiles, follows, active presence, messaging, calls, and creator signals help people connect beyond the clip.",
  },
  {
    icon: Handshake,
    title: "Build together",
    text: "Collab requests, applications, and booking slots make OneClyq useful for creators who want to work with others.",
  },
  {
    icon: ShieldCheck,
    title: "Stay in control",
    text: "Privacy, blocking, reporting, settings, and safer action placement keep trust close without making the app feel hostile.",
  },
];

const appLinks = [
  { label: "Explore clips", href: "/discover", icon: Search },
  { label: "Upload a clip", href: "/upload", icon: UploadCloud },
  { label: "Messages", href: "/messages", icon: MessageCircle },
  { label: "Collabs", href: "/collabs", icon: CalendarDays },
];

export default function AboutPage() {
  const router = useRouter();
  const { isAuthenticated, isBootstrapped } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (isBootstrapped && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isBootstrapped, router]);

  if (!isBootstrapped || !isAuthenticated) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-base-100">
        <div className="h-10 w-10 animate-pulse rounded-2xl bg-base-300" aria-hidden="true" />
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-base-100 px-4 pb-12 pt-[calc(var(--app-header-height)+18px)] text-base-content md:pl-[124px] md:pr-8">
      <div className="mx-auto w-full max-w-6xl">
        <section className="overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-sm">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_420px]">
            <div className="p-6 sm:p-8 lg:p-10">
              <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary">
                <Sparkles size={16} />
                About OneClyq
              </p>
              <h1 className="mt-3 max-w-3xl text-3xl font-bold leading-tight sm:text-4xl">
                Watch, discover, connect, and build with creators.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-base-content/65 sm:text-base">
                OneClyq is a social video space for clips that lead somewhere: a follow, a message, a collaboration, a booking, or a saved idea you come back to later.
              </p>

              <div className="mt-7 flex flex-wrap gap-2">
                {appLinks.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.href}
                      type="button"
                      onClick={() => router.push(item.href)}
                      className="inline-flex items-center gap-2 rounded-xl border border-base-300 px-4 py-2 text-sm font-bold transition hover:bg-base-200"
                    >
                      <Icon size={16} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="relative min-h-[320px] bg-black">
              <Image
                src="/auth-hero-creators.jpg"
                alt="Creators filming short videos"
                fill
                sizes="(max-width: 1024px) 100vw, 420px"
                className="object-cover opacity-80"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 text-white">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1.5 text-xs font-bold backdrop-blur">
                  <Clapperboard size={14} />
                  Built for creator momentum
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {productPoints.map((point) => {
            const Icon = point.icon;
            return (
              <article key={point.title} className="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon size={20} />
                </div>
                <h2 className="font-bold">{point.title}</h2>
                <p className="mt-2 text-sm font-medium leading-6 text-base-content/70">{point.text}</p>
              </article>
            );
          })}
        </section>

        <section className="mt-6 rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm">
          <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-primary">The idea</p>
              <h2 className="mt-1 text-2xl font-bold">A clip should open a door.</h2>
            </div>
            <div className="space-y-4 text-sm leading-7 text-base-content/65">
              <p>
                Short videos are powerful, but creators need more than views. OneClyq is growing into a place where people can discover talent, talk directly, collaborate, book time, and keep their best moments organized.
              </p>
              <p>
                The product is intentionally practical: fast feed, real profiles, messaging, calls, saved collections, watch history, search, collabs, booking, and safety controls that stay close without getting in the way.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
