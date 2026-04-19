"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

function hashHue(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = name.charCodeAt(i) + ((h << 5) - h);
  }
  return Math.abs(h) % 360;
}

function initialsFrom(name: string, max = 2): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  }
  return name.slice(0, max).toUpperCase();
}

export type AvatarProps = React.HTMLAttributes<HTMLDivElement> & {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg";
};

const sizeMap = { sm: "size-8 text-xs", md: "size-10 text-sm", lg: "size-12 text-base" };

function Avatar({ className, name, src, size = "md", ...props }: AvatarProps) {
  const hue = hashHue(name);
  const fallbackStyle: React.CSSProperties = {
    background: `linear-gradient(145deg, oklch(55% 0.08 ${hue}) 0%, oklch(42% 0.12 ${hue}) 100%)`,
  };

  return (
    <div
      role="img"
      aria-label={name}
      title={name}
      data-slot="avatar"
      className={cn(
        "relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full font-semibold text-white shadow-sm ring-1 ring-border/40 font-body",
        sizeMap[size],
        className,
      )}
      style={!src ? fallbackStyle : undefined}
      {...props}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className="size-full object-cover"
        />
      ) : (
        <span aria-hidden>{initialsFrom(name)}</span>
      )}
    </div>
  );
}

export { Avatar, initialsFrom };
