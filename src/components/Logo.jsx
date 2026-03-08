export function Logo({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="50" fill="#FF6200"/>
      <path d="M70 26 Q50 10 30 26 Q20 34 20 48" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.35"/>
      <path d="M70 26 Q50 10 30 26 Q20 34 20 48" stroke="#22C55E" strokeWidth="9" strokeLinecap="round" fill="none"/>
      <polygon points="20,48 10,35 32,33" fill="#22C55E"/>
      <path d="M30 74 Q50 90 70 74 Q80 66 80 52" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.35"/>
      <path d="M30 74 Q50 90 70 74 Q80 66 80 52" stroke="#EF4444" strokeWidth="9" strokeLinecap="round" fill="none"/>
      <polygon points="80,52 90,65 68,67" fill="#EF4444"/>
    </svg>
  );
}
