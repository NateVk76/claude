import type { ReactNode } from 'react';
import type { Athlete, PoseId } from '../engine/types';

// Illustrations des cartes : pictogrammes façon Jeux olympiques (traits épais, tête ronde).
// Chaque pose est un squelette dans un repère 100×100. Les membres « lointains » sont atténués
// pour lire le mouvement. Encre = currentColor, accent = var(--pic-accent).

type P = [number, number];
interface Pose {
  head: P;
  neck: P;
  hip: P;
  /** [bras lointain, bras proche] : [coude, main] */
  arms: [[P, P], [P, P]];
  /** [jambe lointaine, jambe proche] : [genou, pied] */
  legs: [[P, P], [P, P]];
  /** épaules explicites (poses de face) */
  shoulders?: [P, P];
  hips?: [P, P];
  /** pose de face : pas d'atténuation des membres lointains */
  facing?: boolean;
  back?: ReactNode;
  front?: ReactNode;
  /** rotation globale (degrés) autour du centre bas */
  tilt?: number;
  /** personnage secondaire (ex. adversaire au judo) */
  extra?: Omit<Pose, 'extra' | 'back' | 'front'>;
}

const ACCENT = 'var(--pic-accent, currentColor)';

const POSES: Record<PoseId, Pose> = {
  'athle-sprint': {
    head: [64, 17], neck: [58, 28], hip: [47, 53],
    arms: [[[47, 38], [40, 48]], [[67, 40], [75, 31]]],
    legs: [[[38, 70], [26, 83]], [[64, 58], [60, 76]]],
    back: (
      <g stroke={ACCENT} strokeWidth={2.5} strokeLinecap="round" opacity={0.8}>
        <line x1={6} y1={40} x2={22} y2={40} />
        <line x1={2} y1={52} x2={24} y2={52} />
        <line x1={8} y1={64} x2={22} y2={64} />
      </g>
    ),
  },
  'athle-haies': {
    head: [68, 21], neck: [62, 31], hip: [52, 52],
    arms: [[[74, 36], [84, 42]], [[52, 38], [45, 48]]],
    legs: [[[38, 57], [30, 67]], [[68, 50], [85, 50]]],
    back: (
      <g stroke={ACCENT} strokeWidth={3} strokeLinecap="round">
        <line x1={40} y1={74} x2={72} y2={74} strokeWidth={5} />
        <line x1={44} y1={74} x2={44} y2={96} />
        <line x1={68} y1={74} x2={68} y2={96} />
        <line x1={38} y1={96} x2={48} y2={96} />
        <line x1={64} y1={96} x2={74} y2={96} />
      </g>
    ),
  },
  'athle-perche': {
    head: [56, 21], neck: [53, 31], hip: [45, 55],
    arms: [[[62, 30], [68, 24]], [[60, 22], [63, 13]]],
    legs: [[[57, 62], [53, 78]], [[41, 75], [37, 94]]],
    back: <line x1={52} y1={2} x2={98} y2={92} stroke={ACCENT} strokeWidth={3.2} strokeLinecap="round" />,
  },
  'sig-perche-record': {
    head: [27, 43], neck: [35, 36], hip: [50, 27],
    arms: [[[34, 25], [30, 13]], [[29, 25], [23, 13]]],
    legs: [[[62, 40], [70, 54]], [[64, 35], [75, 49]]],
    back: (
      <g strokeLinecap="round">
        <line x1={14} y1={98} x2={34} y2={52} stroke={ACCENT} strokeWidth={3} opacity={0.7} />
        <line x1={6} y1={45} x2={94} y2={45} stroke={ACCENT} strokeWidth={2.6} />
        <line x1={8} y1={45} x2={8} y2={98} stroke="currentColor" strokeWidth={2.4} opacity={0.5} />
        <line x1={92} y1={45} x2={92} y2={98} stroke="currentColor" strokeWidth={2.4} opacity={0.5} />
      </g>
    ),
  },
  'athle-saut': {
    head: [44, 19], neck: [46, 29], hip: [50, 51],
    arms: [[[38, 22], [33, 12]], [[53, 17], [59, 7]]],
    legs: [[[64, 58], [80, 69]], [[66, 53], [83, 62]]],
    back: (
      <g fill={ACCENT} opacity={0.75}>
        <path d="M54,94 Q76,86 98,94 Z" />
        <circle cx={62} cy={88} r={1.2} />
        <circle cx={72} cy={85} r={1.2} />
        <circle cx={86} cy={87} r={1.2} />
      </g>
    ),
  },
  'athle-lancer': {
    head: [55, 22], neck: [52, 32], hip: [48, 56],
    arms: [[[64, 35], [72, 39]], [[38, 30], [26, 28]]],
    legs: [[[42, 74], [30, 88]], [[62, 74], [70, 94]]],
    back: <line x1={8} y1={34} x2={84} y2={9} stroke={ACCENT} strokeWidth={2.6} strokeLinecap="round" />,
  },
  'sig-bolt': {
    head: [45, 21], neck: [47, 32], hip: [50, 57],
    arms: [[[34, 31], [43, 27]], [[58, 26], [71, 14]]],
    legs: [[[46, 76], [42, 95]], [[53, 76], [56, 95]]],
    front: <path d="M84,2 L76,16 L83,16 L74,32 L90,12 L83,12 L90,2 Z" fill={ACCENT} />,
  },
  natation: {
    head: [80, 55], neck: [72, 58], hip: [42, 62],
    arms: [[[56, 68], [44, 71]], [[80, 44], [92, 51]]],
    legs: [[[28, 66], [12, 69]], [[28, 60], [12, 57]]],
    front: (
      <g fill="none" stroke={ACCENT} strokeWidth={3} strokeLinecap="round">
        <path d="M2,76 Q10,70 18,76 T34,76 T50,76 T66,76 T82,76 T98,76" />
        <path d="M10,88 Q18,82 26,88 T42,88 T58,88 T74,88 T90,88" opacity={0.6} />
      </g>
    ),
  },
  cyclisme: {
    head: [72, 25], neck: [64, 32], hip: [40, 44],
    arms: [[[68, 42], [76, 48]], [[70, 40], [78, 46]]],
    legs: [[[48, 58], [42, 78]], [[56, 54], [50, 72]]],
    back: (
      <g fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        <circle cx={24} cy={72} r={15} />
        <circle cx={78} cy={72} r={15} />
        <path d="M24,72 L46,72 L40,50 Z M40,50 L70,50 L46,72 M70,50 L78,72 M70,50 L73,43 L80,45 M35,48 L45,48" stroke={ACCENT} />
      </g>
    ),
  },
  auto: {
    head: [56, 49], neck: [56, 49], hip: [56, 49],
    arms: [[[56, 49], [56, 49]], [[56, 49], [56, 49]]],
    legs: [[[56, 49], [56, 49]], [[56, 49], [56, 49]]],
    back: (
      <g>
        <path d="M4,72 L8,56 L16,56 L16,62 L40,60 L48,52 L66,52 L70,60 L90,64 L97,70 L96,76 L4,76 Z" fill="currentColor" />
        <path d="M44,53 Q56,44 68,53" fill="none" stroke={ACCENT} strokeWidth={2.5} />
        <circle cx={56} cy={49} r={6.5} fill={ACCENT} />
        <rect x={52} y={46.5} width={8} height={3} rx={1.5} fill="currentColor" opacity={0.7} />
        <circle cx={24} cy={76} r={11} fill="currentColor" />
        <circle cx={80} cy={76} r={11} fill="currentColor" />
        <circle cx={24} cy={76} r={4.5} fill={ACCENT} />
        <circle cx={80} cy={76} r={4.5} fill={ACCENT} />
        <g stroke={ACCENT} strokeWidth={2.4} strokeLinecap="round" opacity={0.8}>
          <line x1={0} y1={88} x2={16} y2={88} />
          <line x1={34} y1={92} x2={58} y2={92} />
        </g>
      </g>
    ),
  },
  'auto-moto': {
    head: [71, 40], neck: [63, 44], hip: [45, 52],
    arms: [[[67, 52], [74, 58]], [[69, 51], [76, 57]]],
    legs: [[[54, 64], [44, 72]], [[56, 62], [46, 70]]],
    tilt: -22,
    back: (
      <g>
        <circle cx={26} cy={76} r={13} fill="none" stroke="currentColor" strokeWidth={5} />
        <circle cx={78} cy={76} r={13} fill="none" stroke="currentColor" strokeWidth={5} />
        <path d="M28,70 L44,58 L66,56 L84,64 L76,72 L50,74 Z" fill={ACCENT} />
      </g>
    ),
  },
  'combat-boxe': {
    head: [54, 23], neck: [50, 33], hip: [46, 58],
    arms: [[[52, 46], [60, 35]], [[64, 34], [76, 31]]],
    legs: [[[40, 76], [32, 94]], [[58, 76], [64, 94]]],
    front: (
      <g fill={ACCENT}>
        <circle cx={78} cy={31} r={6.8} />
        <circle cx={62} cy={33} r={6.2} />
      </g>
    ),
  },
  'combat-judo': {
    head: [63, 39], neck: [57, 45], hip: [44, 63],
    arms: [[[64, 34], [59, 24]], [[61, 32], [55, 27]]],
    legs: [[[53, 79], [59, 95]], [[40, 79], [43, 95]]],
    extra: {
      head: [78, 44], neck: [71, 36], hip: [47, 22],
      arms: [[[62, 30], [57, 26]], [[66, 42], [72, 50]]],
      legs: [[[36, 20], [24, 23]], [[35, 13], [22, 7]]],
    },
  },
  rugby: {
    head: [61, 21], neck: [56, 31], hip: [46, 54],
    arms: [[[70, 30], [82, 26]], [[52, 44], [60, 40]]],
    legs: [[[38, 70], [26, 82]], [[62, 64], [58, 83]]],
    front: <ellipse cx={63} cy={41} rx={8} ry={5} transform="rotate(-25 63 41)" fill={ACCENT} />,
  },
  hand: {
    head: [53, 22], neck: [50, 32], hip: [46, 56],
    arms: [[[62, 36], [70, 32]], [[38, 22], [42, 11]]],
    legs: [[[40, 71], [44, 87]], [[56, 70], [52, 86]]],
    front: <circle cx={42} cy={6} r={5.5} fill={ACCENT} />,
  },
  volley: {
    head: [52, 24], neck: [49, 34], hip: [46, 58],
    arms: [[[58, 44], [64, 52]], [[60, 22], [66, 12]]],
    legs: [[[52, 74], [42, 88]], [[42, 74], [30, 83]]],
    front: <circle cx={75} cy={9} r={6.5} fill={ACCENT} />,
    back: (
      <g stroke="currentColor" strokeWidth={1.4} opacity={0.35}>
        <line x1={90} y1={40} x2={90} y2={98} strokeWidth={2.4} />
        <line x1={84} y1={40} x2={100} y2={40} strokeWidth={3} />
        <line x1={84} y1={50} x2={100} y2={50} />
        <line x1={84} y1={60} x2={100} y2={60} />
      </g>
    ),
  },
  'hiver-ski': {
    head: [66, 48], neck: [58, 54], hip: [40, 63],
    arms: [[[60, 64], [68, 58]], [[62, 66], [70, 60]]],
    legs: [[[54, 74], [48, 86]], [[56, 72], [50, 84]]],
    tilt: 16,
    back: (
      <g stroke={ACCENT} strokeLinecap="round" fill="none">
        <path d="M18,88 L84,88 Q90,88 92,83" strokeWidth={3.4} />
        <line x1={69} y1={59} x2={30} y2={72} strokeWidth={2} />
      </g>
    ),
  },
  'hiver-patin': {
    head: [74, 36], neck: [66, 42], hip: [50, 54],
    arms: [[[56, 34], [48, 26]], [[74, 48], [86, 48]]],
    legs: [[[36, 46], [20, 40]], [[51, 73], [52, 91]]],
    front: <line x1={44} y1={95} x2={62} y2={95} stroke={ACCENT} strokeWidth={3} strokeLinecap="round" />,
  },
  gym: {
    head: [50, 17], neck: [50, 28], hip: [50, 50],
    shoulders: [[44, 30], [56, 30]],
    arms: [[[38, 17], [31, 6]], [[62, 17], [69, 6]]],
    legs: [[[33, 52], [15, 49]], [[67, 48], [85, 45]]],
    facing: true,
    back: <path d="M10,82 Q50,74 90,82" fill="none" stroke={ACCENT} strokeWidth={2.6} strokeLinecap="round" />,
  },
  golf: {
    head: [51, 22], neck: [48, 32], hip: [48, 56],
    arms: [[[60, 30], [57, 19]], [[58, 26], [56, 18]]],
    legs: [[[40, 74], [36, 92]], [[50, 74], [48, 94]]],
    back: (
      <g strokeLinecap="round">
        <line x1={57} y1={18} x2={27} y2={29} stroke={ACCENT} strokeWidth={2.4} />
        <line x1={86} y1={56} x2={86} y2={94} stroke="currentColor" strokeWidth={2} />
        <path d="M86,56 L98,61 L86,66 Z" fill={ACCENT} />
        <ellipse cx={86} cy={95} rx={6} ry={1.6} fill="currentColor" />
      </g>
    ),
  },
  'glisse-surf': {
    head: [61, 28], neck: [56, 37], hip: [48, 56],
    arms: [[[44, 38], [34, 34]], [[68, 38], [80, 42]]],
    legs: [[[38, 64], [36, 75]], [[60, 64], [62, 71]]],
    back: (
      <g>
        <path d="M0,100 C28,96 56,86 72,62 C80,50 92,42 100,46 L100,100 Z" fill={ACCENT} opacity={0.35} />
        <line x1={24} y1={79} x2={80} y2={71} stroke="currentColor" strokeWidth={5} strokeLinecap="round" />
      </g>
    ),
  },
  'glisse-skate': {
    head: [55, 14], neck: [52, 24], hip: [50, 46],
    arms: [[[40, 30], [30, 34]], [[64, 30], [74, 26]]],
    legs: [[[40, 56], [40, 70]], [[62, 54], [62, 68]]],
    back: (
      <g>
        <line x1={30} y1={75} x2={72} y2={69} stroke={ACCENT} strokeWidth={4.5} strokeLinecap="round" />
        <circle cx={37} cy={80} r={3} fill="currentColor" />
        <circle cx={65} cy={76} r={3} fill="currentColor" />
      </g>
    ),
  },
  'glisse-escalade': {
    head: [56, 30], neck: [57, 38], hip: [52, 62],
    arms: [[[66, 47], [72, 41]], [[63, 23], [69, 12]]],
    legs: [[[55, 82], [66, 88]], [[61, 69], [69, 64]]],
    back: (
      <g>
        <rect x={76} y={0} width={24} height={100} fill={ACCENT} opacity={0.3} />
        <g fill={ACCENT}>
          <circle cx={72} cy={11} r={3.2} />
          <circle cx={74} cy={41} r={3.2} />
          <circle cx={71} cy={64} r={3.2} />
          <circle cx={69} cy={88} r={3.2} />
        </g>
      </g>
    ),
  },
  'foot-frappe': {
    head: [43, 20], neck: [45, 30], hip: [48, 54],
    arms: [[[34, 34], [26, 28]], [[56, 40], [64, 48]]],
    legs: [[[46, 74], [44, 94]], [[62, 66], [74, 74]]],
    front: <circle cx={82} cy={76} r={6.5} fill={ACCENT} />,
  },
  'foot-gardien': {
    head: [67, 40], neck: [60, 46], hip: [40, 62],
    arms: [[[70, 30], [78, 20]], [[72, 34], [82, 26]]],
    legs: [[[28, 74], [16, 82]], [[26, 66], [14, 70]]],
    front: <circle cx={88} cy={15} r={6.5} fill={ACCENT} />,
  },
  'basket-dunk': {
    head: [60, 30], neck: [57, 40], hip: [48, 62],
    arms: [[[46, 50], [40, 58]], [[66, 26], [74, 18]]],
    legs: [[[42, 76], [36, 90]], [[58, 72], [52, 88]]],
    back: (
      <g stroke="currentColor" strokeLinecap="round" fill="none">
        <line x1={93} y1={2} x2={93} y2={36} strokeWidth={3} />
        <line x1={72} y1={23} x2={93} y2={23} stroke={ACCENT} strokeWidth={3} />
        <path d="M74,23 L78,33 L87,33 L91,23" strokeWidth={1.4} opacity={0.6} />
      </g>
    ),
    front: <circle cx={77} cy={15} r={5.5} fill={ACCENT} />,
  },
  'basket-tir': {
    head: [52, 22], neck: [50, 32], hip: [48, 56],
    arms: [[[56, 24], [56, 12]], [[60, 22], [58, 10]]],
    legs: [[[46, 76], [46, 92]], [[50, 76], [52, 92]]],
    front: <circle cx={57} cy={5} r={5} fill={ACCENT} />,
  },
  'tennis-service': {
    head: [52, 28], neck: [50, 38], hip: [46, 60],
    arms: [[[40, 46], [36, 56]], [[58, 28], [62, 18]]],
    legs: [[[48, 78], [50, 96]], [[40, 78], [30, 92]]],
    front: (
      <g>
        <line x1={62} y1={18} x2={64} y2={12} stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
        <ellipse cx={66} cy={6} rx={5} ry={7} transform="rotate(15 66 6)" fill="none" stroke={ACCENT} strokeWidth={2.4} />
        <circle cx={78} cy={9} r={3.5} fill={ACCENT} />
      </g>
    ),
  },
  'tennis-coup-droit': {
    head: [50, 22], neck: [49, 32], hip: [47, 56],
    arms: [[[60, 40], [70, 40]], [[60, 30], [53, 22]]],
    legs: [[[40, 76], [34, 94]], [[56, 76], [62, 94]]],
    front: (
      <g>
        <line x1={53} y1={22} x2={48} y2={16} stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
        <ellipse cx={43} cy={11} rx={5} ry={7} transform="rotate(-40 43 11)" fill="none" stroke={ACCENT} strokeWidth={2.4} />
        <circle cx={84} cy={40} r={3.5} fill={ACCENT} />
      </g>
    ),
  },
  'us-football': {
    head: [53, 22], neck: [50, 32], hip: [46, 56],
    arms: [[[62, 34], [72, 30]], [[38, 24], [40, 12]]],
    legs: [[[40, 74], [34, 94]], [[56, 74], [62, 94]]],
    front: <ellipse cx={42} cy={9} rx={6.5} ry={4} transform="rotate(-30 42 9)" fill={ACCENT} />,
  },
  'us-baseball': {
    head: [51, 22], neck: [48, 32], hip: [46, 56],
    arms: [[[58, 38], [63, 33]], [[56, 42], [62, 34]]],
    legs: [[[40, 74], [32, 94]], [[56, 74], [64, 94]]],
    back: <line x1={60} y1={36} x2={90} y2={15} stroke={ACCENT} strokeWidth={4.5} strokeLinecap="round" />,
    front: <circle cx={95} cy={10} r={3.2} fill="currentColor" />,
  },
  'us-hockey': {
    head: [62, 30], neck: [56, 38], hip: [44, 56],
    arms: [[[56, 48], [60, 52]], [[60, 52], [66, 62]]],
    legs: [[[36, 72], [24, 84]], [[58, 72], [60, 90]]],
    back: (
      <g strokeLinecap="round">
        <line x1={56} y1={44} x2={82} y2={88} stroke={ACCENT} strokeWidth={3} />
        <line x1={80} y1={88} x2={92} y2={88} stroke={ACCENT} strokeWidth={3.6} />
        <rect x={93} y={86} width={6} height={3} rx={1} fill="currentColor" />
        <line x1={18} y1={87} x2={28} y2={85} stroke="currentColor" strokeWidth={2} />
        <line x1={55} y1={93} x2={66} y2={93} stroke="currentColor" strokeWidth={2} />
      </g>
    ),
  },
  'sig-siuu': {
    head: [50, 18], neck: [50, 29], hip: [50, 53],
    shoulders: [[44, 31], [56, 31]],
    hips: [[46, 53], [54, 53]],
    arms: [[[36, 40], [24, 48]], [[64, 40], [76, 48]]],
    legs: [[[38, 71], [29, 90]], [[62, 71], [71, 90]]],
    facing: true,
  },
  'sig-bras-croises': {
    head: [50, 17], neck: [50, 28], hip: [50, 56],
    shoulders: [[42, 31], [58, 31]],
    hips: [[45, 56], [55, 56]],
    arms: [[[37, 45], [58, 39]], [[63, 45], [42, 39]]],
    legs: [[[43, 75], [42, 95]], [[57, 75], [58, 95]]],
    facing: true,
  },
  'sig-night-night': {
    head: [47, 19], neck: [50, 29], hip: [50, 56],
    shoulders: [[42, 31], [58, 31]],
    hips: [[45, 56], [55, 56]],
    arms: [[[44, 44], [57, 24]], [[66, 38], [60, 22]]],
    legs: [[[44, 75], [42, 95]], [[56, 75], [58, 95]]],
    facing: true,
  },
  'sig-doigts-ciel': {
    head: [50, 20], neck: [50, 30], hip: [50, 56],
    shoulders: [[42, 32], [58, 32]],
    hips: [[45, 56], [55, 56]],
    arms: [[[39, 18], [37, 5]], [[61, 18], [63, 5]]],
    legs: [[[45, 76], [43, 95]], [[56, 75], [60, 94]]],
    facing: true,
  },
};

export function poseFor(athlete: Athlete): PoseId {
  if (athlete.pose) return athlete.pose;
  switch (athlete.archetype) {
    case 'gardien':
      return 'foot-gardien';
    case 'meneur':
      return 'basket-tir';
    case 'tennis-defense':
      return 'tennis-coup-droit';
    case 'haies':
      return 'athle-haies';
    case 'sauteur':
      return 'athle-saut';
    case 'perchiste':
      return 'athle-perche';
    case 'lanceur':
      return 'athle-lancer';
    case 'pilote-moto':
      return 'auto-moto';
    case 'judoka':
      return 'combat-judo';
    case 'patineur':
      return 'hiver-patin';
    case 'surfeur':
      return 'glisse-surf';
    case 'skateur':
      return 'glisse-skate';
    case 'grimpeur-esc':
      return 'glisse-escalade';
    case 'baseball':
      return 'us-baseball';
    case 'hockey':
      return 'us-hockey';
    default:
      break;
  }
  const bySport: Record<Athlete['sport'], PoseId> = {
    foot: 'foot-frappe', basket: 'basket-dunk', tennis: 'tennis-service', athle: 'athle-sprint',
    natation: 'natation', cyclisme: 'cyclisme', auto: 'auto', combat: 'combat-boxe', rugby: 'rugby',
    hand: 'hand', volley: 'volley', hiver: 'hiver-ski', gym: 'gym', golf: 'golf', glisse: 'glisse-surf',
    us: 'us-football',
  };
  return bySport[athlete.sport];
}

function line(points: P[]): string {
  return points.map(([x, y]) => `${x},${y}`).join(' ');
}

function shoulderOf(pose: Pick<Pose, 'neck' | 'hip'>): P {
  const [nx, ny] = pose.neck;
  const [hx, hy] = pose.hip;
  return [nx + (hx - nx) * 0.14, ny + (hy - ny) * 0.14];
}

function Figure({ pose, dimFar = true, weight = 1 }: { pose: Omit<Pose, 'extra'>; dimFar?: boolean; weight?: number }) {
  if (pose.head === pose.neck) return null; // pose sans personnage (ex. voiture)
  const shoulder = shoulderOf(pose);
  const [farShoulder, nearShoulder] = pose.shoulders ?? [shoulder, shoulder];
  const [farHip, nearHip] = pose.hips ?? [pose.hip, pose.hip];
  const farOpacity = pose.facing || !dimFar ? 1 : 0.5;
  const limb = 8 * weight;
  return (
    <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <g opacity={farOpacity} strokeWidth={limb}>
        <polyline points={line([farShoulder, ...pose.arms[0]])} />
        <polyline points={line([farHip, ...pose.legs[0]])} />
      </g>
      <polyline points={line([pose.neck, pose.hip])} strokeWidth={(pose.facing ? 13 : 10.5) * weight} />
      <g strokeWidth={limb}>
        <polyline points={line([nearHip, ...pose.legs[1]])} />
        <polyline points={line([nearShoulder, ...pose.arms[1]])} />
      </g>
      <circle cx={pose.head[0]} cy={pose.head[1]} r={7 * weight} fill="currentColor" stroke="none" />
    </g>
  );
}

interface PictogramProps {
  pose: PoseId;
  className?: string;
}

export function Pictogram({ pose: poseId, className }: PictogramProps) {
  const pose = POSES[poseId];
  const content = (
    <>
      {pose.back}
      {pose.extra && (
        <g opacity={0.55}>
          <Figure pose={pose.extra} dimFar={false} weight={0.85} />
        </g>
      )}
      <Figure pose={pose} />
      {pose.front}
    </>
  );
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true" overflow="visible">
      {pose.tilt ? <g transform={`rotate(${pose.tilt} 50 90)`}>{content}</g> : content}
    </svg>
  );
}

export const ALL_POSES = Object.keys(POSES) as PoseId[];
