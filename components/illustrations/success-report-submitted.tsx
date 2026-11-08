import type { SVGProps } from "react"

import { illustrationStyles as styles } from "./illustration-styles"

type IllustrationProps = Omit<SVGProps<SVGSVGElement>, "title"> & {
  title?: string
}

export function SuccessReportSubmitted({
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
      <rect style={styles.cd} x="116" y="86" width="168" height="214" rx="24" />
      <rect style={styles.pr} x="140" y="114" width="64" height="14" rx="7" />
      <rect style={styles.ln} x="140" y="148" width="120" height="9" rx="4.5" />
      <rect style={styles.ln} x="140" y="170" width="98" height="9" rx="4.5" />
      <rect style={styles.ln} x="140" y="192" width="112" height="9" rx="4.5" />
      <circle style={styles.cd} cx="262" cy="268" r="52" />
      <circle style={styles.okc} cx="262" cy="268" r="42" />
      <path style={styles.ck} d="M243 268l14 14 25-28" />
      <circle style={styles.pr} cx="90" cy="122" r="7" />
      <circle style={styles.rpc} cx="316" cy="106" r="6" />
      <circle style={styles.okc} cx="72" cy="236" r="5" />
      <path style={styles.pls} d="M318 226h16M326 218v16" />
      <path style={styles.pls} d="M112 78h14M119 71v14" />
    </svg>
  )
}
