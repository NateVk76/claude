import type { ReactNode } from 'react';

// Drapeaux dessinés en SVG (viewBox 30×20) : les emoji drapeaux ne s'affichent pas sous Windows.

export const COUNTRY_NAMES: Record<string, string> = {
  FR: 'France', US: 'États-Unis', ES: 'Espagne', BR: 'Brésil', IT: 'Italie', DE: 'Allemagne',
  'GB-ENG': 'Angleterre', 'GB-SCT': 'Écosse', GB: 'Royaume-Uni', AR: 'Argentine', PT: 'Portugal',
  NL: 'Pays-Bas', BE: 'Belgique', JP: 'Japon', CA: 'Canada', AU: 'Australie', NO: 'Norvège',
  NZ: 'Nouvelle-Zélande', JM: 'Jamaïque', DK: 'Danemark', CM: 'Cameroun', ZA: 'Afrique du Sud',
  UA: 'Ukraine', SI: 'Slovénie', SE: 'Suède', RU: 'Russie', KE: 'Kenya', HR: 'Croatie', CN: 'Chine',
  CI: 'Côte d’Ivoire', CH: 'Suisse', TN: 'Tunisie', SN: 'Sénégal', RS: 'Serbie', PL: 'Pologne',
  NG: 'Nigeria', MA: 'Maroc', GR: 'Grèce', ET: 'Éthiopie', DZ: 'Algérie', RO: 'Roumanie', MX: 'Mexique',
  KR: 'Corée du Sud', HU: 'Hongrie', EG: 'Égypte', CO: 'Colombie', UY: 'Uruguay', QA: 'Qatar',
  PK: 'Pakistan', PH: 'Philippines', MC: 'Monaco', LT: 'Lituanie', LC: 'Sainte-Lucie', KZ: 'Kazakhstan',
  IN: 'Inde', IE: 'Irlande', GN: 'Guinée', GH: 'Ghana', GE: 'Géorgie', FI: 'Finlande', ER: 'Érythrée',
  CZ: 'Tchéquie', BW: 'Botswana', BF: 'Burkina Faso', AT: 'Autriche',
};

function starPoints(cx: number, cy: number, r: number, rotation = -90): string {
  const points: string[] = [];
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? r : r * 0.4;
    const angle = ((rotation + i * 36) * Math.PI) / 180;
    points.push(`${(cx + radius * Math.cos(angle)).toFixed(2)},${(cy + radius * Math.sin(angle)).toFixed(2)}`);
  }
  return points.join(' ');
}

const Star = ({ cx, cy, r, fill }: { cx: number; cy: number; r: number; fill: string }) => (
  <polygon points={starPoints(cx, cy, r)} fill={fill} />
);

function hStripes(colors: string[], weights?: number[]): ReactNode {
  const w = weights ?? colors.map(() => 1);
  const total = w.reduce((sum, x) => sum + x, 0);
  let y = 0;
  return colors.map((color, i) => {
    const h = (20 * w[i]) / total;
    const rect = <rect key={i} x={0} y={y} width={30} height={h + 0.05} fill={color} />;
    y += h;
    return rect;
  });
}

function vStripes(colors: string[], weights?: number[]): ReactNode {
  const w = weights ?? colors.map(() => 1);
  const total = w.reduce((sum, x) => sum + x, 0);
  let x = 0;
  return colors.map((color, i) => {
    const width = (30 * w[i]) / total;
    const rect = <rect key={i} x={x} y={0} width={width + 0.05} height={20} fill={color} />;
    x += width;
    return rect;
  });
}

function nordic(bg: string, cross: string, inner?: string): ReactNode {
  return (
    <>
      <rect width={30} height={20} fill={bg} />
      <rect x={8} y={0} width={5} height={20} fill={cross} />
      <rect x={0} y={7.5} width={30} height={5} fill={cross} />
      {inner && (
        <>
          <rect x={9.25} y={0} width={2.5} height={20} fill={inner} />
          <rect x={0} y={8.75} width={30} height={2.5} fill={inner} />
        </>
      )}
    </>
  );
}

function unionJack(w = 30, h = 20): ReactNode {
  return (
    <g>
      <rect width={w} height={h} fill="#012169" />
      <path d={`M0,0 L${w},${h} M${w},0 L0,${h}`} stroke="#fff" strokeWidth={h * 0.2} />
      <path d={`M0,0 L${w},${h} M${w},0 L0,${h}`} stroke="#C8102E" strokeWidth={h * 0.07} />
      <path d={`M${w / 2},0 V${h} M0,${h / 2} H${w}`} stroke="#fff" strokeWidth={h * 0.33} />
      <path d={`M${w / 2},0 V${h} M0,${h / 2} H${w}`} stroke="#C8102E" strokeWidth={h * 0.2} />
    </g>
  );
}

const FLAGS: Record<string, () => ReactNode> = {
  FR: () => vStripes(['#002395', '#ffffff', '#ED2939']),
  IT: () => vStripes(['#009246', '#ffffff', '#CE2B37']),
  BE: () => vStripes(['#1a1a1a', '#FAE042', '#ED2939']),
  IE: () => vStripes(['#169B62', '#ffffff', '#FF883E']),
  CI: () => vStripes(['#F77F00', '#ffffff', '#009E60']),
  NG: () => vStripes(['#008751', '#ffffff', '#008751']),
  RO: () => vStripes(['#002B7F', '#FCD116', '#CE1126']),
  GN: () => vStripes(['#CE1126', '#FCD116', '#009460']),
  DE: () => hStripes(['#1a1a1a', '#DD0000', '#FFCE00']),
  NL: () => hStripes(['#AE1C28', '#ffffff', '#21468B']),
  RU: () => hStripes(['#ffffff', '#0039A6', '#D52B1E']),
  UA: () => hStripes(['#0057B7', '#FFD700']),
  PL: () => hStripes(['#ffffff', '#DC143C']),
  MC: () => hStripes(['#CE1126', '#ffffff']),
  AT: () => hStripes(['#ED2939', '#ffffff', '#ED2939']),
  HU: () => hStripes(['#CE2939', '#ffffff', '#477050']),
  LT: () => hStripes(['#FDB913', '#006A44', '#C1272D']),
  CO: () => hStripes(['#FCD116', '#003893', '#CE1126'], [2, 1, 1]),
  ES: () => hStripes(['#AA151B', '#F1BF00', '#AA151B'], [1, 2, 1]),
  SE: () => nordic('#006AA7', '#FECC00'),
  DK: () => nordic('#C8102E', '#ffffff'),
  FI: () => nordic('#ffffff', '#002F6C'),
  NO: () => nordic('#BA0C2F', '#ffffff', '#00205B'),
  GB: () => unionJack(),
  'GB-ENG': () => (
    <>
      <rect width={30} height={20} fill="#ffffff" />
      <rect x={12.5} width={5} height={20} fill="#CE1124" />
      <rect y={7.5} width={30} height={5} fill="#CE1124" />
    </>
  ),
  'GB-SCT': () => (
    <>
      <rect width={30} height={20} fill="#005EB8" />
      <path d="M0,0 L30,20 M30,0 L0,20" stroke="#fff" strokeWidth={3.2} />
    </>
  ),
  CH: () => (
    <>
      <rect width={30} height={20} fill="#DA291C" />
      <rect x={13} y={4} width={4} height={12} fill="#fff" />
      <rect x={9} y={8} width={12} height={4} fill="#fff" />
    </>
  ),
  GE: () => (
    <>
      <rect width={30} height={20} fill="#fff" />
      <rect x={13} width={4} height={20} fill="#E8112D" />
      <rect y={8} width={30} height={4} fill="#E8112D" />
      {[
        [6.5, 4],
        [23.5, 4],
        [6.5, 16],
        [23.5, 16],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`} fill="#E8112D">
          <rect x={x - 0.6} y={y - 2} width={1.2} height={4} />
          <rect x={x - 2} y={y - 0.6} width={4} height={1.2} />
        </g>
      ))}
    </>
  ),
  US: () => (
    <>
      {Array.from({ length: 13 }, (_, i) => (
        <rect key={i} y={(i * 20) / 13} width={30} height={20 / 13 + 0.05} fill={i % 2 === 0 ? '#B22234' : '#ffffff'} />
      ))}
      <rect width={12} height={(20 * 7) / 13} fill="#3C3B6E" />
      {Array.from({ length: 12 }, (_, i) => (
        <circle key={i} cx={1.6 + (i % 4) * 2.9} cy={1.6 + Math.floor(i / 4) * 3.4} r={0.55} fill="#fff" />
      ))}
    </>
  ),
  BR: () => (
    <>
      <rect width={30} height={20} fill="#009C3B" />
      <polygon points="15,2.2 27.5,10 15,17.8 2.5,10" fill="#FFDF00" />
      <circle cx={15} cy={10} r={4.6} fill="#002776" />
      <path d="M10.6,9.2 Q15,7.6 19.4,10.6" stroke="#fff" strokeWidth={0.8} fill="none" />
    </>
  ),
  AR: () => (
    <>
      {hStripes(['#74ACDF', '#ffffff', '#74ACDF'])}
      <circle cx={15} cy={10} r={2.3} fill="#F6B40E" />
    </>
  ),
  UY: () => (
    <>
      {Array.from({ length: 9 }, (_, i) => (
        <rect key={i} y={(i * 20) / 9} width={30} height={20 / 9 + 0.05} fill={i % 2 === 0 ? '#ffffff' : '#0038A8'} />
      ))}
      <rect width={11} height={(20 * 5) / 9} fill="#fff" />
      <circle cx={5.5} cy={5.5} r={2.8} fill="#FCD116" />
    </>
  ),
  PT: () => (
    <>
      {vStripes(['#006600', '#FF0000'], [2, 3])}
      <circle cx={12} cy={10} r={3.6} fill="#FFE000" />
      <circle cx={12} cy={10} r={2.2} fill="#FF0000" />
    </>
  ),
  JP: () => (
    <>
      <rect width={30} height={20} fill="#fff" />
      <circle cx={15} cy={10} r={6} fill="#BC002D" />
    </>
  ),
  KR: () => (
    <>
      <rect width={30} height={20} fill="#fff" />
      <circle cx={15} cy={10} r={5} fill="#003478" />
      <path d="M10,10 A5,5 0 0 1 20,10 A2.5,2.5 0 0 1 15,10 A2.5,2.5 0 0 0 10,10 Z" fill="#C60C30" />
      {[
        [5, 4],
        [25, 4],
        [5, 16],
        [25, 16],
      ].map(([x, y]) => (
        <g key={`${x}${y}`} fill="#1a1a1a">
          <rect x={x - 2.4} y={y - 1.9} width={4.8} height={0.9} />
          <rect x={x - 2.4} y={y - 0.45} width={4.8} height={0.9} />
          <rect x={x - 2.4} y={y + 1} width={4.8} height={0.9} />
        </g>
      ))}
    </>
  ),
  CN: () => (
    <>
      <rect width={30} height={20} fill="#DE2910" />
      <Star cx={5} cy={5} r={3} fill="#FFDE00" />
      <Star cx={10} cy={2} r={1} fill="#FFDE00" />
      <Star cx={12} cy={4} r={1} fill="#FFDE00" />
      <Star cx={12} cy={7} r={1} fill="#FFDE00" />
      <Star cx={10} cy={9} r={1} fill="#FFDE00" />
    </>
  ),
  CA: () => (
    <>
      {vStripes(['#D52B1E', '#ffffff', '#D52B1E'], [1, 2, 1])}
      <path
        d="M15,4 L16.1,6.3 L17.6,5.6 L17.1,8.6 L18.9,7.2 L19.4,8.3 L21,8 L20.3,10 L21.2,10.6 L17.9,13 L18.3,14.2 L15.4,13.8 L15.4,16.4 L14.6,16.4 L14.6,13.8 L11.7,14.2 L12.1,13 L8.8,10.6 L9.7,10 L9,8 L10.6,8.3 L11.1,7.2 L12.9,8.6 L12.4,5.6 L13.9,6.3 Z"
        fill="#D52B1E"
      />
    </>
  ),
  AU: () => (
    <>
      <rect width={30} height={20} fill="#00008B" />
      <svg x={0} y={0} width={15} height={10} viewBox="0 0 30 20">
        {unionJack()}
      </svg>
      <Star cx={7.5} cy={15} r={2.2} fill="#fff" />
      <Star cx={22.5} cy={4} r={1.1} fill="#fff" />
      <Star cx={19.5} cy={9} r={1.1} fill="#fff" />
      <Star cx={25.5} cy={8} r={1.1} fill="#fff" />
      <Star cx={22.5} cy={16} r={1.1} fill="#fff" />
    </>
  ),
  NZ: () => (
    <>
      <rect width={30} height={20} fill="#00247D" />
      <svg x={0} y={0} width={15} height={10} viewBox="0 0 30 20">
        {unionJack()}
      </svg>
      {[
        [22.5, 4.5],
        [19.5, 9.5],
        [25.5, 8.5],
        [22.5, 16],
      ].map(([x, y]) => (
        <g key={`${x}${y}`}>
          <Star cx={x} cy={y} r={1.5} fill="#fff" />
          <Star cx={x} cy={y} r={1} fill="#CC142B" />
        </g>
      ))}
    </>
  ),
  JM: () => (
    <>
      <rect width={30} height={20} fill="#009B3A" />
      <polygon points="0,0 13,10 0,20" fill="#1a1a1a" />
      <polygon points="30,0 17,10 30,20" fill="#1a1a1a" />
      <path d="M0,0 L30,20 M30,0 L0,20" stroke="#FED100" strokeWidth={3} />
    </>
  ),
  CM: () => (
    <>
      {vStripes(['#007A5E', '#CE1126', '#FCD116'])}
      <Star cx={15} cy={10} r={2.6} fill="#FCD116" />
    </>
  ),
  SN: () => (
    <>
      {vStripes(['#00853F', '#FDEF42', '#E31B23'])}
      <Star cx={15} cy={10} r={2.6} fill="#00853F" />
    </>
  ),
  GH: () => (
    <>
      {hStripes(['#CE1126', '#FCD116', '#006B3F'])}
      <Star cx={15} cy={10} r={2.8} fill="#1a1a1a" />
    </>
  ),
  BF: () => (
    <>
      {hStripes(['#EF2B2D', '#009E49'])}
      <Star cx={15} cy={10} r={3} fill="#FCD116" />
    </>
  ),
  ZA: () => (
    <>
      <rect width={30} height={10} fill="#E03C31" />
      <rect y={10} width={30} height={10} fill="#001489" />
      <path d="M0,0 L12,10 L0,20 M12,10 H30" stroke="#fff" strokeWidth={6.5} fill="none" />
      <path d="M0,0 L12,10 L0,20 M12,10 H30" stroke="#007749" strokeWidth={4} fill="none" />
      <polygon points="0,3.2 8.2,10 0,16.8" fill="#FFB81C" />
      <polygon points="0,5 6,10 0,15" fill="#1a1a1a" />
    </>
  ),
  SI: () => (
    <>
      {hStripes(['#ffffff', '#005DA4', '#ED1C24'])}
      <path d="M6,3 H11 V8 Q8.5,11 6,8 Z" fill="#005DA4" stroke="#ED1C24" strokeWidth={0.5} />
    </>
  ),
  HR: () => (
    <>
      {hStripes(['#FF0000', '#ffffff', '#171796'])}
      <rect x={12} y={5} width={6} height={8} fill="#fff" />
      {Array.from({ length: 12 }, (_, i) => (
        <rect key={i} x={12 + (i % 3) * 2 + (Math.floor(i / 3) % 2)} y={5 + Math.floor(i / 3) * 2} width={1} height={2} fill="#FF0000" />
      ))}
    </>
  ),
  RS: () => hStripes(['#C6363C', '#0C4076', '#ffffff']),
  KE: () => (
    <>
      {hStripes(['#1a1a1a', '#ffffff', '#BB0000', '#ffffff', '#006600'], [6, 1, 6, 1, 6])}
      <ellipse cx={15} cy={10} rx={2.6} ry={5} fill="#BB0000" stroke="#fff" strokeWidth={0.4} />
      <ellipse cx={15} cy={10} rx={1} ry={3} fill="#1a1a1a" />
    </>
  ),
  TN: () => (
    <>
      <rect width={30} height={20} fill="#E70013" />
      <circle cx={15} cy={10} r={5} fill="#fff" />
      <circle cx={15.2} cy={10} r={3.6} fill="#E70013" />
      <circle cx={16.2} cy={10} r={2.9} fill="#fff" />
      <Star cx={16.3} cy={10} r={1.8} fill="#E70013" />
    </>
  ),
  DZ: () => (
    <>
      {vStripes(['#006633', '#ffffff'])}
      <circle cx={15} cy={10} r={4.4} fill="#D21034" />
      <circle cx={16.2} cy={10} r={3.6} fill="#fff" />
      <rect x={15} y={4} width={1.5} height={12} fill="#fff" />
      <rect x={16.5} y={4} width={0} height={0} />
      <circle cx={16.2} cy={10} r={3.6} fill="none" />
      <Star cx={17.4} cy={10} r={1.7} fill="#D21034" />
    </>
  ),
  MA: () => (
    <>
      <rect width={30} height={20} fill="#C1272D" />
      <polygon points={starPoints(15, 10.4, 4.6)} fill="none" stroke="#006233" strokeWidth={0.9} />
    </>
  ),
  EG: () => (
    <>
      {hStripes(['#CE1126', '#ffffff', '#1a1a1a'])}
      <path d="M13.4,8.2 L16.6,8.2 L16,11.6 L14,11.6 Z" fill="#C09300" />
    </>
  ),
  ET: () => (
    <>
      {hStripes(['#078930', '#FCDD09', '#DA121A'])}
      <circle cx={15} cy={10} r={4} fill="#0F47AF" />
      <polygon points={starPoints(15, 10.2, 2.6)} fill="none" stroke="#FCDD09" strokeWidth={0.5} />
    </>
  ),
  ER: () => (
    <>
      <polygon points="0,0 30,0 30,10 0,10" fill="#12AD2B" />
      <polygon points="0,10 30,10 30,20 0,20" fill="#4189DD" />
      <polygon points="0,0 30,10 0,20" fill="#EA0437" />
      <circle cx={7.5} cy={10} r={3} fill="none" stroke="#FFC726" strokeWidth={0.8} />
    </>
  ),
  GR: () => (
    <>
      {Array.from({ length: 9 }, (_, i) => (
        <rect key={i} y={(i * 20) / 9} width={30} height={20 / 9 + 0.05} fill={i % 2 === 0 ? '#0D5EAF' : '#ffffff'} />
      ))}
      <rect width={11.1} height={11.1} fill="#0D5EAF" />
      <rect x={4.44} width={2.22} height={11.1} fill="#fff" />
      <rect y={4.44} width={11.1} height={2.22} fill="#fff" />
    </>
  ),
  MX: () => (
    <>
      {vStripes(['#006847', '#ffffff', '#CE1126'])}
      <circle cx={15} cy={10} r={2.4} fill="#8C5A2B" />
      <path d="M12.6,11.6 Q15,14 17.4,11.6" stroke="#006847" strokeWidth={0.7} fill="none" />
    </>
  ),
  QA: () => (
    <>
      <rect width={30} height={20} fill="#8A1538" />
      <path
        d={`M0,0 H8 ${Array.from({ length: 9 }, (_, i) => `L11,${(i * 20) / 9 + 20 / 18} L8,${((i + 1) * 20) / 9}`).join(' ')} H0 Z`}
        fill="#fff"
      />
    </>
  ),
  PK: () => (
    <>
      <rect width={30} height={20} fill="#01411C" />
      <rect width={7.5} height={20} fill="#fff" />
      <circle cx={19} cy={10} r={5} fill="#fff" />
      <circle cx={20.4} cy={8.9} r={4.3} fill="#01411C" />
      <Star cx={22} cy={7.4} r={1.6} fill="#fff" />
    </>
  ),
  PH: () => (
    <>
      {hStripes(['#0038A8', '#CE1126'])}
      <polygon points="0,0 17.3,10 0,20" fill="#fff" />
      <circle cx={6} cy={10} r={2.2} fill="#FCD116" />
      <Star cx={2} cy={2.6} r={0.9} fill="#FCD116" />
      <Star cx={2} cy={17.4} r={0.9} fill="#FCD116" />
      <Star cx={14} cy={10} r={0.9} fill="#FCD116" />
    </>
  ),
  LC: () => (
    <>
      <rect width={30} height={20} fill="#66CCFF" />
      <polygon points="15,3 21,17 9,17" fill="#fff" />
      <polygon points="15,4.6 20,17 10,17" fill="#1a1a1a" />
      <polygon points="15,10 21,17 9,17" fill="#FCD116" />
    </>
  ),
  KZ: () => (
    <>
      <rect width={30} height={20} fill="#00AFCA" />
      <circle cx={15} cy={9} r={3.4} fill="#FEC50C" />
      <path d="M11,13.4 Q15,11.6 19,13.4" stroke="#FEC50C" strokeWidth={0.9} fill="none" />
      <rect x={2} y={1.5} width={1.2} height={17} fill="#FEC50C" opacity={0.85} />
    </>
  ),
  IN: () => (
    <>
      {hStripes(['#FF9933', '#ffffff', '#138808'])}
      <circle cx={15} cy={10} r={2.6} fill="none" stroke="#000080" strokeWidth={0.6} />
      <circle cx={15} cy={10} r={0.6} fill="#000080" />
    </>
  ),
  CZ: () => (
    <>
      {hStripes(['#ffffff', '#D7141A'])}
      <polygon points="0,0 15,10 0,20" fill="#11457E" />
    </>
  ),
  BW: () => (
    <>
      <rect width={30} height={20} fill="#75AADB" />
      <rect y={7.2} width={30} height={5.6} fill="#fff" />
      <rect y={8.2} width={30} height={3.6} fill="#1a1a1a" />
    </>
  ),
};

interface FlagProps {
  code: string;
  className?: string;
  title?: boolean;
}

export function Flag({ code, className, title = true }: FlagProps) {
  const draw = FLAGS[code];
  return (
    <svg className={className} viewBox="0 0 30 20" role="img" aria-label={COUNTRY_NAMES[code] ?? code} preserveAspectRatio="xMidYMid slice">
      {title && <title>{COUNTRY_NAMES[code] ?? code}</title>}
      {draw ? draw() : <rect width={30} height={20} fill="#777" />}
      <rect width={30} height={20} fill="none" stroke="rgba(0,0,0,.25)" strokeWidth={0.8} />
    </svg>
  );
}
