import type { ReactNode } from 'react';
import type { SportId } from '../engine/types';

// Icônes de sport en SVG (24×24), trait = currentColor.

const ICONS: Record<SportId, ReactNode> = {
  foot: (
    <>
      <circle cx={12} cy={12} r={9.5} />
      <path d="M12,7.2 L16.2,10.3 L14.6,15.2 L9.4,15.2 L7.8,10.3 Z" fill="currentColor" stroke="none" />
      <path d="M12,7.2 V2.6 M16.2,10.3 L21,8.8 M14.6,15.2 L17.4,19.4 M9.4,15.2 L6.6,19.4 M7.8,10.3 L3,8.8" />
    </>
  ),
  basket: (
    <>
      <circle cx={12} cy={12} r={9.5} />
      <path d="M2.5,12 H21.5 M12,2.5 V21.5 M5.3,5.3 Q10,12 5.3,18.7 M18.7,5.3 Q14,12 18.7,18.7" />
    </>
  ),
  tennis: (
    <>
      <circle cx={12} cy={12} r={9.5} />
      <path d="M4.6,5.8 Q10,12 4.6,18.2 M19.4,5.8 Q14,12 19.4,18.2" />
    </>
  ),
  athle: (
    <>
      <rect x={2.5} y={5.5} width={19} height={13} rx={6.5} />
      <rect x={6.5} y={9.2} width={11} height={5.6} rx={2.8} />
    </>
  ),
  natation: <path d="M2,9 Q5,6 8,9 T14,9 T20,9 T22,9 M2,15 Q5,12 8,15 T14,15 T20,15 T22,15" />,
  cyclisme: (
    <>
      <circle cx={6} cy={15} r={4.5} />
      <circle cx={18} cy={15} r={4.5} />
      <path d="M6,15 L10,8 H16 L18,15 M10,8 L13,15 H6 M15,5 H17.5" />
    </>
  ),
  auto: (
    <>
      <rect x={3} y={3} width={18} height={18} rx={1.5} />
      <path
        d="M3,3 H9 V9 H3 Z M15,3 H21 V9 H15 Z M9,9 H15 V15 H9 Z M3,15 H9 V21 H3 Z M15,15 H21 V21 H15 Z"
        fill="currentColor"
        stroke="none"
      />
    </>
  ),
  combat: (
    <>
      <path d="M7,20 V13 Q4,12 4.5,8.5 Q5,4 10,4 H14 Q19.5,4 19.5,10 Q19.5,15 16,16 V20 Z" />
      <path d="M7,13 H11 M7,17 H16" />
    </>
  ),
  rugby: (
    <>
      <ellipse cx={12} cy={12} rx={10} ry={6} transform="rotate(-35 12 12)" />
      <path d="M8.5,15.5 L15.5,8.5 M10,11.5 L12.5,14 M11.5,10 L14,12.5" />
    </>
  ),
  hand: (
    <>
      <circle cx={12} cy={12} r={9.5} />
      <path d="M12,2.5 Q8,12 12,21.5 M2.8,9.5 Q12,13 21.2,9.5 M4,17 Q12,12.5 20,17" />
    </>
  ),
  volley: (
    <>
      <circle cx={12} cy={12} r={9.5} />
      <path d="M12,12 Q12,6 7,3.5 M12,12 Q17.5,15 21,12.5 M12,12 Q7,15.5 6.5,20.5" />
    </>
  ),
  hiver: <path d="M12,2 V22 M3.3,7 L20.7,17 M3.3,17 L20.7,7 M9.5,3.8 L12,6 L14.5,3.8 M9.5,20.2 L12,18 L14.5,20.2" />,
  gym: (
    <>
      <path d="M8,2 V9 M16,2 V9" />
      <circle cx={8} cy={14} r={4.5} />
      <circle cx={16} cy={14} r={4.5} />
    </>
  ),
  golf: (
    <>
      <path d="M8,21 V3 L18,7 L8,11" />
      <ellipse cx={11} cy={21} rx={7} ry={1.5} />
    </>
  ),
  glisse: <path d="M2,20 Q10,20 13,12 Q15.5,5 21,6 Q16,8 17,13 Q18,17 22,17" />,
  us: (
    <>
      <path d="M3,12 Q12,1 21,12 Q12,23 3,12 Z" />
      <path d="M9,12 H15 M10.5,10.5 V13.5 M12,10.5 V13.5 M13.5,10.5 V13.5" />
    </>
  ),
  // raquette et balle
  pingpong: (
    <>
      <circle cx={9.5} cy={10} r={6.8} />
      <path d="M14.3,14.8 L19.8,20.3" strokeWidth={3.2} />
      <circle cx={19.2} cy={5.2} r={2.1} fill="currentColor" stroke="none" />
    </>
  ),
  // cavalier
  echecs: (
    <>
      <path d="M6.5,21 H18 M8,21 Q7.6,17.4 10.6,14.6 Q12.6,12.8 12.2,10.9 Q10.2,12.7 7.6,12.6 Q5.5,12.3 6.4,10.1 L9.9,5.3 Q10.6,3.4 12.6,3.8 Q18.2,4.8 17.9,12.2 Q17.7,16.8 16.8,21" />
      <circle cx={11.4} cy={7.6} r={0.9} fill="currentColor" stroke="none" />
    </>
  ),
  // manette
  esport: (
    <>
      <path d="M6.5,7.5 H17.5 Q21.4,7.5 21.8,12.6 L22,16 Q22,18.8 19.6,18.8 Q18.3,18.8 17,16.8 L16,15.3 H8 L7,16.8 Q5.7,18.8 4.4,18.8 Q2,18.8 2,16 L2.2,12.6 Q2.6,7.5 6.5,7.5 Z" />
      <path d="M7.4,10.3 V13.7 M5.7,12 H9.1" />
      <circle cx={15.6} cy={11} r={1} fill="currentColor" stroke="none" />
      <circle cx={17.9} cy={13.1} r={1} fill="currentColor" stroke="none" />
    </>
  ),
};

interface SportIconProps {
  sport: SportId;
  className?: string;
  title?: string;
}

export function SportIcon({ sport, className, title }: SportIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title && <title>{title}</title>}
      {ICONS[sport]}
    </svg>
  );
}
