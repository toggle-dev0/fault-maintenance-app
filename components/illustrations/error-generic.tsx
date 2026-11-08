import type { SVGProps } from "react"

import { illustrationStyles as styles } from "./illustration-styles"

type IllustrationProps = Omit<SVGProps<SVGSVGElement>, "title"> & {
  title?: string
}

export function ErrorGeneric({
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
      <circle style={styles.bgc} cx="200" cy="196" r="150" />
      <ellipse style={styles.sh} cx="200" cy="350" rx="108" ry="11" />
      <path style={styles.tri} d="M200 98 301 270H99z" />
      <rect style={styles.crc} x="191" y="150" width="18" height="68" rx="9" />
      <circle style={styles.crc} cx="200" cy="244" r="10" />
      <polygon
        style={styles.pr}
        points="100.0,297.0 113.0,304.5 113.0,319.5 100.0,327.0 87.0,319.5 87.0,304.5"
      />
      <circle style={styles.bg} cx="100" cy="312" r="5" />
      <polygon
        style={styles.pr}
        points="306.0,290.0 316.4,296.0 316.4,308.0 306.0,314.0 295.6,308.0 295.6,296.0"
      />
      <circle style={styles.bg} cx="306" cy="302" r="4" />
    </svg>
  )
}
