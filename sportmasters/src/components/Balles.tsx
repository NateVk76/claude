// La monnaie du jeu : les « balles » (argot pour les euros… et des balles de sport).
export function BallIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={`ball-icon ${className}`} viewBox="0 0 20 20" aria-hidden="true">
      <circle cx={10} cy={10} r={9} fill="#ffb020" />
      <circle cx={10} cy={10} r={9} fill="url(#ball-shade)" />
      <path d="M3.2,5.6 Q9,10 3.2,14.4 M16.8,5.6 Q11,10 16.8,14.4" fill="none" stroke="#fff4d6" strokeWidth={1.4} strokeLinecap="round" />
      <defs>
        <radialGradient id="ball-shade" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#fff" stopOpacity="0.45" />
          <stop offset="1" stopColor="#7a4a00" stopOpacity="0.35" />
        </radialGradient>
      </defs>
    </svg>
  );
}

export function Balles({ value, className = '' }: { value: number; className?: string }) {
  return (
    <span className={`balles ${className}`}>
      <BallIcon />
      <span className="balles__value">{value.toLocaleString('fr-FR')}</span>
      <span className="visually-hidden"> balles</span>
    </span>
  );
}
