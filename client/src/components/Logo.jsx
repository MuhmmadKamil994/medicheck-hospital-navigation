/**
 * MediCheck pulse logo — inline SVG, never an emoji.
 * `light` renders the amber-on-navy footer variant.
 */
export default function Logo({ size = 34, light = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" aria-hidden="true">
      <rect
        width="34"
        height="34"
        rx="10"
        fill={light ? '#E8A33D' : '#1B2A41'}
      />
      <path
        d="M7 17h5.5l2.5-7.5 4.5 15 2.5-7.5H27"
        stroke={light ? '#141F33' : '#E8A33D'}
        strokeWidth="2.6"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
