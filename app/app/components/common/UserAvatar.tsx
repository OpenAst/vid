"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

type AvatarUser = {
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  avatar?: string | null;
  profile?: {
    avatar?: string | null;
  } | null;
};

type UserAvatarProps = {
  user?: AvatarUser | null;
  size?: number;
  className?: string;
  showOnline?: boolean;
  showPresence?: boolean;
  isOnline?: boolean;
  onlineClassName?: string;
  alt?: string;
};

const fallbackGradients = [
  "from-[rgb(68,13,156)] via-purple-500 to-green-400",
  "from-green-400 via-emerald-500 to-[rgb(68,13,156)]",
  "from-purple-700 via-[rgb(68,13,156)] to-green-300",
  "from-green-300 via-purple-400 to-purple-800",
  "from-[rgb(68,13,156)] via-violet-500 to-emerald-400",
  "from-emerald-400 via-green-500 to-purple-700",
];

function getDisplayName(user?: AvatarUser | null) {
  return user?.first_name || user?.username || "User";
}

function getInitials(user?: AvatarUser | null) {
  const first = user?.first_name?.trim();
  const last = user?.last_name?.trim();
  if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
  return (user?.username || first || "U").slice(0, 1).toUpperCase();
}

function getFallbackIndex(value: string) {
  return value.split("").reduce((total, character) => total + character.charCodeAt(0), 0) % fallbackGradients.length;
}

export default function UserAvatar({
  user,
  size = 40,
  className = "",
  showOnline = false,
  showPresence = false,
  isOnline = false,
  onlineClassName = "bg-emerald-500",
  alt,
}: UserAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const src = user?.profile?.avatar || user?.avatar || "";
  const displayName = getDisplayName(user);
  const initials = getInitials(user);
  const fallbackClassName = useMemo(
    () => fallbackGradients[getFallbackIndex(user?.username || displayName)],
    [displayName, user?.username]
  );
  const pixelSize = `${size}px`;

  return (
    <span
      className={`relative inline-flex shrink-0 overflow-hidden rounded-full ${className}`}
      style={{ width: pixelSize, height: pixelSize }}
      aria-hidden={!alt}
    >
      {src && !imageFailed ? (
        <Image
          src={src}
          alt={alt || displayName}
          fill
          sizes={pixelSize}
          className="object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${fallbackClassName} text-[0.42em] font-bold uppercase text-white`}>
          {initials}
        </span>
      )}
      {(showOnline || showPresence) && (
        <span
          className={`absolute bottom-0 right-0 rounded-full border-2 border-base-100 ${showPresence ? (isOnline ? "bg-emerald-500" : "bg-rose-500") : onlineClassName}`}
          style={{ width: Math.max(10, size * 0.28), height: Math.max(10, size * 0.28) }}
        />
      )}
    </span>
  );
}
