import type { SVGProps } from "react"

import { illustrationStyles as styles } from "./illustration-styles"

type IllustrationProps = Omit<SVGProps<SVGSVGElement>, "title"> & {
  title?: string
}

export function EmptyTechnicianAssignments({
  className,
  title,
  ...props
}: IllustrationProps) {
  const isAccessible = Boolean(title)

  return (
    <svg
      viewBox="0 0 400 400"
      className={className}
      {...props}
      role={isAccessible ? "img" : undefined}
      aria-label={isAccessible ? title : undefined}
      aria-hidden={!isAccessible}
    >
      {isAccessible && <title>{title}</title>}
      <circle style={styles.bg} cx="200" cy="196" r="150" />
      <ellipse style={styles.sh} cx="200" cy="350" rx="108" ry="11" />
      <path
        style={styles.hd}
        d="M160 190v-26a14 14 0 0 1 14-14h52a14 14 0 0 1 14 14v26"
      />
      <rect
        style={styles.cd}
        x="100"
        y="180"
        width="200"
        height="120"
        rx="24"
      />
      <rect style={styles.pr} x="180" y="204" width="40" height="30" rx="10" />
      <rect style={styles.ln} x="124" y="256" width="152" height="8" rx="4" />
      <circle style={styles.rsb} cx="292" cy="170" r="30" />
      <path
        style={{
          ...styles.ck,
          stroke: "var(--status-resolved-fg, #065F46)",
        }}
        d="M280 170l9 9 16-18"
      />
    </svg>
  )
}
