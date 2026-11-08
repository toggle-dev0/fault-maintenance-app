import type { SVGProps } from "react"

import { illustrationStyles as styles } from "./illustration-styles"

type IllustrationProps = Omit<SVGProps<SVGSVGElement>, "title"> & {
  title?: string
}

export function LogoWordmark({
  className,
  title,
  ...props
}: IllustrationProps) {
  const isAccessible = Boolean(title)

  return (
    <svg
      viewBox="0 0 224 64"
      className={className}
      {...props}
      role={isAccessible ? "img" : undefined}
      aria-label={isAccessible ? title : undefined}
      aria-hidden={!isAccessible}
    >
      {isAccessible && <title>{title}</title>}
      <rect style={styles.pr} width="64" height="64" rx="18" />
      <polygon
        style={styles.pf}
        points="32.0,13.0 48.5,22.5 48.5,41.5 32.0,51.0 15.5,41.5 15.5,22.5"
      />
      <circle style={styles.pr} cx="32" cy="32" r="7" />
      <text
        x="80"
        y="44"
        fontFamily="var(--font-dm-serif-display, serif)"
        fontSize="36"
        style={{ fill: "var(--foreground, #0F172A)" }}
      >
        FixTrack
      </text>
    </svg>
  )
}
