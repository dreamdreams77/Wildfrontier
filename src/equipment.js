// Field equipment used in rescues. Durable items are required but not used up; consumables are spent each use.
export const EQUIPMENT={
 firstAid:{label:'First-aid kit',icon:'🩹',price:35,consumed:true,blurb:'Bandages, saline and splints for on-the-spot stabilisation.'},
 net:{label:'Capture net',icon:'🕸',price:60,consumed:false,blurb:'A soft net for catching small and medium animals safely.'},
 crate:{label:'Transport crate',icon:'📦',price:90,consumed:false,blurb:'A ventilated crate for moving animals to the clinic.'},
 tranq:{label:'Sedation kit',icon:'💉',price:120,consumed:true,blurb:'A calibrated dose for dangerous or very frightened animals. Vet-approved use only.'},
};
export const DEFAULT_EQUIPMENT={firstAid:4,net:1,crate:1,tranq:1};
