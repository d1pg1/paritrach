"use client"

import { getTeamLogoUrl } from "@/lib/team-logos"

interface TeamLogoProps {
  name: string
  size?: number
  logoUrl?: string | null
}

export function TeamLogo({ name, size = 20, logoUrl }: TeamLogoProps) {
  const url = logoUrl ?? getTeamLogoUrl(name)

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="object-contain flex-shrink-0"
      />
    )
  }

  return (
    <span
      style={{ width: size, height: size, fontSize: Math.round(size * 0.45) }}
      className="rounded-md bg-neutral-800 text-neutral-400 flex items-center justify-center font-semibold flex-shrink-0 select-none"
    >
      {name.charAt(0).toUpperCase()}
    </span>
  )
}
