"use client";

import Image from "next/image";

interface Props {
  src?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}

export default function UserAvatar({ src, name, size = 32, className = "" }: Props) {
  const initials = (name || "?").charAt(0).toUpperCase();

  if (src) {
    return (
      <Image
        src={src}
        alt={name || "User avatar"}
        width={size}
        height={size}
        className={`rounded-full ring-2 ring-border ${className}`}
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center rounded-full bg-foreground/10 text-foreground font-bold ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      aria-label={name || "User"}
    >
      {initials}
    </div>
  );
}
