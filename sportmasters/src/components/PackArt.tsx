import { useId } from 'react';
import type { PackDef } from '../engine/packs';
import type { SportId } from '../engine/types';
import { SPORTS } from '../data/sports';
import { SportIcon } from './SportIcon';

const TONES: Record<PackDef['tone'], { from: string; to: string; ink: string; trim: string }> = {
  bronze: { from: '#e2a66f', to: '#6f3d1f', ink: '#2c170a', trim: '#ffd9b3' },
  silver: { from: '#f4f6f9', to: '#7d8998', ink: '#18202b', trim: '#ffffff' },
  gold: { from: '#ffe38f', to: '#a8771a', ink: '#2a1d03', trim: '#fff6cf' },
  violet: { from: '#b08bff', to: '#2f0d80', ink: '#ffffff', trim: '#e6d6ff' },
  black: { from: '#3b3222', to: '#070504', ink: '#f6d57e', trim: '#f6d57e' },
  icon: { from: '#fffdf6', to: '#cdb98a', ink: '#4a3912', trim: '#c79c3e' },
  prime: { from: '#ffb3e1', to: '#5b6cff', ink: '#130f22', trim: '#ffffff' },
  sport: { from: '#5cc8ff', to: '#10304f', ink: '#ffffff', trim: '#d9f1ff' },
};

// Bords sertis du sachet (zigzag), dans un repère 120 × 170.
const CRIMP_TOP = Array.from({ length: 13 }, (_, i) => `L${6 + i * 9 + 4.5},${i % 2 ? 4 : 0}`).join(' ');
const CRIMP_BOTTOM = Array.from({ length: 13 }, (_, i) => `L${114 - i * 9 - 4.5},${i % 2 ? 166 : 170}`).join(' ');
const PACK_PATH = `M6,4 ${CRIMP_TOP} L114,4 L116,14 L116,156 L114,166 ${CRIMP_BOTTOM} L6,166 L4,156 L4,14 Z`;

interface PackArtProps {
  tone: PackDef['tone'];
  name: string;
  sport?: SportId;
  className?: string;
}

export function PackArt({ tone, name, sport, className = '' }: PackArtProps) {
  const id = useId().replace(/:/g, '');
  const palette = tone === 'sport' && sport ? { ...TONES.sport, from: SPORTS[sport].color, to: '#0d1422' } : TONES[tone];
  const words = name.replace(/^Pack /, '').replace(/^Booster /, '');
  return (
    <div className={`pack-art pack-art--${tone} ${className}`} style={{ color: palette.ink }}>
      <svg viewBox="0 0 120 170" aria-hidden="true">
        <defs>
          <linearGradient id={`pg-${id}`} x1="0" y1="0" x2="0.4" y2="1">
            {tone === 'prime' ? (
              <>
                <stop offset="0" stopColor="#ff9ad5" />
                <stop offset="0.3" stopColor="#ffe27a" />
                <stop offset="0.55" stopColor="#8dffcf" />
                <stop offset="0.8" stopColor="#8fd3ff" />
                <stop offset="1" stopColor="#b58cff" />
              </>
            ) : (
              <>
                <stop offset="0" stopColor={palette.from} />
                <stop offset="1" stopColor={palette.to} />
              </>
            )}
          </linearGradient>
          <linearGradient id={`ps-${id}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.5" stopColor="#fff" stopOpacity="0.55" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <clipPath id={`pc-${id}`}>
            <path d={PACK_PATH} />
          </clipPath>
        </defs>
        <path d={PACK_PATH} fill={`url(#pg-${id})`} />
        <g clipPath={`url(#pc-${id})`}>
          <rect className="pack-art__shine" x={-60} y={-20} width={40} height={220} fill={`url(#ps-${id})`} transform="rotate(20)" />
          <g opacity={0.12} stroke={palette.ink} strokeWidth={1}>
            {Array.from({ length: 14 }, (_, i) => (
              <line key={i} x1={-20 + i * 12} y1={180} x2={40 + i * 12} y2={-10} />
            ))}
          </g>
        </g>
        <path d={PACK_PATH} fill="none" stroke={palette.trim} strokeWidth={1.5} opacity={0.8} />
        <line x1={8} y1={18} x2={112} y2={18} stroke={palette.trim} strokeWidth={0.8} strokeDasharray="2 3" opacity={0.7} />
        <circle cx={60} cy={70} r={25} fill="none" stroke={palette.ink} strokeWidth={2} opacity={0.9} />
        <circle cx={60} cy={70} r={20} fill={palette.ink} opacity={0.12} />
      </svg>
      <div className="pack-art__emblem">
        {sport ? <SportIcon sport={sport} /> : <span className="pack-art__monogram">A</span>}
      </div>
      <div className="pack-art__brand">ATHLETICA</div>
      <div className="pack-art__name">{words}</div>
    </div>
  );
}
