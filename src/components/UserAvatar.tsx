"use client"

interface UserAvatarProps {
  logoUrl: string | null | undefined
  displayName: string
  size?: number
}

export function UserAvatar({ logoUrl, displayName, size = 36 }: UserAvatarProps) {
  const initial = displayName.charAt(0).toUpperCase()

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={displayName}
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="rounded-md object-cover flex-shrink-0"
      />
    )
  }

  return (
    <span
      style={{ width: size, height: size, fontSize: Math.round(size * 0.45) }}
      className="rounded-md bg-neutral-800 text-neutral-400 flex items-center justify-center font-semibold flex-shrink-0 select-none"
    >
      {initial}
    </span>
  )
}
