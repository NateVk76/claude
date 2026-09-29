import { useId } from 'react';

// Silhouette en buste pour les athlètes sans photo libre : maillot à la couleur du sport,
// numéro sur la poitrine, comme les cartes de joueurs sans portrait.

interface BustProps {
  color: string;
  num?: number;
  className?: string;
}

export function Bust({ color, num, className }: BustProps) {
  const id = useId().replace(/:/g, '');
  return (
    <svg className={className} viewBox="0 0 100 124" aria-hidden="true" preserveAspectRatio="xMidYMax meet">
      <defs>
        <linearGradient id={`skin-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5b6170" />
          <stop offset="1" stopColor="#2c313c" />
        </linearGradient>
        <linearGradient id={`shirt-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={color} />
          <stop offset="1" stopColor="#10131a" stopOpacity="0.85" />
        </linearGradient>
      </defs>
      <path d="M41,66 H59 L60,82 Q50,90 40,82 Z" fill={`url(#skin-${id})`} />
      <ellipse cx="50" cy="43" rx="17.5" ry="22" fill={`url(#skin-${id})`} />
      <path
        d="M4,124 L6,104 Q8,88 24,82 L38,77 Q50,90 62,77 L76,82 Q92,88 94,104 L96,124 Z"
        fill={`url(#shirt-${id})`}
      />
      <path d="M38,77 Q50,90 62,77 L58,75 Q50,84 42,75 Z" fill="#0c0f15" opacity="0.55" />
      {num !== undefined && (
        <text x="50" y="116" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="900" fontSize="24" fill="#fff" opacity="0.92">
          {num}
        </text>
      )}
    </svg>
  );
}
