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
  availabilityStatus?: string;
};

function getAvailabilityLabel(status?: string) {
  if (status === "available") return "Active";
  return "Inactive";
}

export default function CallButton({ peer, type, availabilityStatus = "available" }: CallButtonProps) {
  const { startCall, isCalling, isCallReady } = useCall();
  const Icon = type === "video" ? Video : Phone;
  const isActive = availabilityStatus === "available";
  const isDisabled = isCalling || !isCallReady || !isActive;
  const title = !isCallReady
    ? "Call connection is getting ready"
    : !isActive
      ? `${peer.username || "This person"} is ${getAvailabilityLabel(availabilityStatus).toLowerCase()}`
      : undefined;

  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={() => startCall(peer, type)}
      title={title}
      className="btn btn-sm btn-outline gap-2"
    >
      <Icon size={16} />
      {type === "video" ? "Video" : "Audio"}
    </button>
  );
}
