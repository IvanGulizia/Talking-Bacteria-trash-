import { BacteriaType, BacteriaConfig } from './types';

export const BACTERIA_DATA: Record<BacteriaType, BacteriaConfig> = {
  [BacteriaType.HELIUM]: {
    id: BacteriaType.HELIUM,
    name: "Pip",
    description: "Petit, nerveux et très aigu.",
    color: "#F472B6", // Pink 400
    secondaryColor: "#FBCFE8",
    bgGradient: "from-pink-900 to-slate-900",
    eyeType: 'round',
    mouthType: 'smile'
  },
  [BacteriaType.TITAN]: {
    id: BacteriaType.TITAN,
    name: "Gorg",
    description: "Lourd, lent et voix grave.",
    color: "#60A5FA", // Blue 400
    secondaryColor: "#DBEAFE",
    bgGradient: "from-blue-900 to-slate-900",
    eyeType: 'squint',
    mouthType: 'o'
  },
  [BacteriaType.ECHO]: {
    id: BacteriaType.ECHO,
    name: "Ripples",
    description: "Répète tout... tout... tout...",
    color: "#4ADE80", // Green 400
    secondaryColor: "#DCFCE7",
    bgGradient: "from-green-900 to-slate-900",
    eyeType: 'crazy',
    mouthType: 'o'
  },
  [BacteriaType.FUZZY]: {
    id: BacteriaType.FUZZY,
    name: "Spike",
    description: "Électrique et distordu.",
    color: "#FB923C", // Orange 400
    secondaryColor: "#FFEDD5",
    bgGradient: "from-orange-900 to-slate-900",
    eyeType: 'squint',
    mouthType: 'tooth'
  },
  [BacteriaType.CAVE]: {
    id: BacteriaType.CAVE,
    name: "Om",
    description: "Mystique avec beaucoup de réverbération.",
    color: "#A78BFA", // Purple 400
    secondaryColor: "#EDE9FE",
    bgGradient: "from-purple-900 to-slate-900",
    eyeType: 'round',
    mouthType: 'o'
  },
  [BacteriaType.DEBUG]: {
    id: BacteriaType.DEBUG,
    name: "Dev_Null",
    description: "Mode expérimental. Accès total.",
    color: "#94a3b8", // Slate 400
    secondaryColor: "#cbd5e1",
    bgGradient: "from-slate-800 to-black",
    eyeType: 'crazy',
    mouthType: 'tooth'
  }
};