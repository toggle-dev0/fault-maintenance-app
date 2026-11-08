import type { SVGProps } from "react"

import { illustrationStyles as styles } from "./illustration-styles"

type IllustrationProps = Omit<SVGProps<SVGSVGElement>, "title"> & {
  title?: string
}

export function AuthIllustration({
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
      <rect style={styles.cd} x="110" y="92" width="180" height="224" rx="24" />
      <circle style={styles.pr} cx="200" cy="146" r="25" />
      <circle style={styles.pf} cx="200" cy="140" r="8" />
      <path style={styles.pf} d="M185 164q15-17 30 0z" />
      <rect style={styles.in} x="134" y="190" width="132" height="28" rx="12" />
      <rect style={styles.ln} x="146" y="201" width="56" height="6" rx="3" />
      <rect style={styles.in} x="134" y="228" width="132" height="28" rx="12" />
      <circle style={styles.ln} cx="150" cy="242" r="3.5" />
      <circle style={styles.ln} cx="162" cy="242" r="3.5" />
      <circle style={styles.ln} cx="174" cy="242" r="3.5" />
      <rect style={styles.pr} x="134" y="272" width="132" height="32" rx="14" />
      <rect style={styles.pf} x="176" y="285" width="48" height="6" rx="3" />
      <circle style={styles.cd} cx="296" cy="116" r="34" />
      <path
        style={styles.pr}
        d="M296 92l22 8v15c0 14-10 24-22 30-12-6-22-16-22-30v-15z"
      />
      <path style={styles.pk} d="M286 118l8 8 14-16" />
      <rect style={styles.pgb} x="62" y="238" width="64" height="26" rx="13" />
      <circle style={styles.pgc} cx="78" cy="251" r="5" />
      <rect
        style={styles.pgc}
        x="90"
        y="248"
        width="24"
        height="6"
        rx="3"
        opacity=".6"
      />
      <rect style={styles.rsb} x="272" y="286" width="68" height="26" rx="13" />
      <circle style={styles.rsc} cx="288" cy="299" r="5" />
      <rect
        style={styles.rsc}
        x="300"
        y="296"
        width="28"
        height="6"
        rx="3"
        opacity=".6"
      />
    </svg>
  )
}
