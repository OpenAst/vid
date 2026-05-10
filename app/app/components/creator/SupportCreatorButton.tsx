"use client";

import { Gift, MessageCircle, Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import type { MembershipTier } from "@/app/store/authSlice";

type SupportCreatorButtonProps = {
  creatorId?: string;
  creatorName?: string;
  tiers?: MembershipTier[];
  variant?: "primary" | "outline";
};

export default function SupportCreatorButton({
  creatorId,
  creatorName = "this creator",
  tiers = [],
  variant = "outline",
}: SupportCreatorButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const visibleTiers = tiers.filter((tier) => tier.enabled);
  const supportOptions = visibleTiers.length > 0
    ? visibleTiers
    : [
        { id: "tip-2", name: "Starter", price: "$2", description: "Send a small show of support.", perks: ["Support this creator"], enabled: true },
        { id: "tip-5", name: "Supporter", price: "$5", description: "Help them make more clips.", perks: ["Support this creator"], enabled: true },
        { id: "tip-10", name: "VIP", price: "$10", description: "Back their next big idea.", perks: ["Support this creator"], enabled: true },
      ];

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
          variant === "primary"
            ? "bg-primary text-primary-content hover:opacity-90"
            : "border border-base-300 hover:bg-base-200"
        }`}
      >
        <Gift size={16} />
        Support
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/35 px-4 pb-4 pt-16 backdrop-blur-sm sm:items-center sm:pb-0">
          <div className="w-full max-w-md rounded-2xl border border-base-300 bg-base-100 p-5 text-base-content shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Sparkles size={20} />
                </div>
                <h2 className="text-lg font-bold">Support {creatorName}</h2>
                <p className="mt-2 text-sm leading-6 text-base-content/60">
                  Tips and subscriptions are being prepared. For now, this shows where creator support will live.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-base-200"
                aria-label="Close support dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 grid gap-2">
              {supportOptions.map((tier) => (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => toast.success("Support payments coming soon")}
                  className="rounded-xl border border-base-300 px-3 py-3 text-left transition hover:bg-base-200"
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="text-sm font-bold">{tier.name}</span>
                    <span className="text-sm font-bold text-primary">{tier.price}</span>
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-base-content/55">{tier.description}</span>
                </button>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {creatorId && (
                <button
                  type="button"
                  onClick={() => router.push(`/messages?user=${creatorId}`)}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-content transition hover:opacity-90"
                >
                  <MessageCircle size={16} />
                  Message
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  toast.success("We'll remember this support idea.");
                  setIsOpen(false);
                }}
                className="inline-flex flex-1 items-center justify-center rounded-xl border border-base-300 px-4 py-2 text-sm font-bold transition hover:bg-base-200"
              >
                Remind me
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
