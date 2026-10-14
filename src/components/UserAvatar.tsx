"use client"

import { useState } from "react"

interface UserAvatarProps {
  logoUrl: string | null | undefined
  displayName: string
  size?: number
}

// The initial is always rendered as a placeholder; the image (fetched separately by the
// browser) fades in over it once loaded, so the page never waits on avatars.
export function UserAvatar({ logoUrl, displayName, size = 36 }: UserAvatarProps) {
  const initial = displayName.charAt(0).toUpperCase()
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  return (
    <span
      style={{ width: size, height: size, fontSize: Math.round(size * 0.45) }}
      className="relative overflow-hidden rounded-md bg-surface-2 text-muted flex items-center justify-center font-semibold flex-shrink-0 select-none"
    >
      {initial}
      {logoUrl && !failed && (
        <img
          src={logoUrl}
          alt={displayName}
          width={size}
          height={size}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          ref={(img) => {
            // Already in the browser cache: onLoad may have fired before hydration.
            if (img?.complete && img.naturalWidth > 0) setLoaded(true)
          }}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
        />
      )}
    </span>
  )
}
