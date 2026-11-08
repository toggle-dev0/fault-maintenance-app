import type { SVGProps } from "react"

import { illustrationStyles as styles } from "./illustration-styles"

type IllustrationProps = Omit<SVGProps<SVGSVGElement>, "title"> & {
  title?: string
}

export function EmptyUserFaults({
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
      <rect style={styles.cd} x="120" y="80" width="160" height="240" rx="24" />
      <rect style={styles.pr} x="164" y="64" width="72" height="34" rx="14" />
      <circle
        cx="152"
        cy="150"
        r="11"
        fill="none"
        stroke="var(--border, #E2E8F0)"
        strokeWidth="3"
        strokeDasharray="5 4"
      />
      <rect style={styles.ln} x="176" y="144" width="84" height="12" rx="6" />
      <circle
        cx="152"
        cy="192"
        r="11"
        fill="none"
        stroke="var(--border, #E2E8F0)"
        strokeWidth="3"
        strokeDasharray="5 4"
      />
      <rect style={styles.ln} x="176" y="186" width="64" height="12" rx="6" />
      <circle
        cx="152"
        cy="234"
        r="11"
        fill="none"
        stroke="var(--border, #E2E8F0)"
        strokeWidth="3"
        strokeDasharray="5 4"
      />
      <rect style={styles.ln} x="176" y="228" width="76" height="12" rx="6" />
      <circle style={styles.pr} cx="276" cy="286" r="32" />
      <path style={styles.pk} d="M276 270v32M260 286h32" />
    </svg>
  )
}
