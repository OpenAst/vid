"use client";

import { Phone, Video } from "lucide-react";
import { useCall } from "./CallProvider";

type CallButtonProps = {
  peer: {
    id: string;
    username?: string | null;
    first_name?: string;
    last_name?: string;
  };
  type: "audio" | "video";
};

export default function CallButton({ peer, type }: CallButtonProps) {
  const { startCall, isCalling } = useCall();
  const Icon = type === "video" ? Video : Phone;

  return (
    <button
      type="button"
      disabled={isCalling}
      onClick={() => startCall(peer, type)}
      className="btn btn-sm btn-outline gap-2"
    >
      <Icon size={16} />
      {type === "video" ? "Video" : "Audio"}
    </button>
  );
}
