export const DELIVERY_ZONES = {
  1: { label: "Grand Alger",    price: 600,  color: "#10B981", wilayas: ["Alger","Blida","Boumerdès","Tipaza"] },
  2: { label: "Nord",           price: 900,  color: "#3B82F6", wilayas: ["Oran","Médéa","Bouira","Tizi Ouzou","Béjaïa","Jijel","Mila","Mostaganem","Aïn Témouchent","Tlemcen","Sidi Bel Abbès","Mascara","Relizane","Chlef","Tissemsilt","Tiaret","Constantine","Annaba","Guelma","Skikda","Souk Ahras","El Tarf","Oum El Bouaghi","Batna","Sétif","Khenchela","Tébessa","Bordj Bou Arréridj","Aïn Defla","Saïda","Naâma"] },
  3: { label: "Hauts Plateaux", price: 1100, color: "#F59E0B", wilayas: ["Laghouat","Djelfa","M'Sila","Biskra","El Oued","Ouargla","Ghardaïa","Touggourt","El Bayadh","El M'Ghair","El Menia","Ouled Djellal"] },
  4: { label: "Grand Sud",      price: 1400, color: "#EF4444", wilayas: ["Béchar","Tindouf","Béni Abbès","Adrar","Timimoun","Bordj Badji Mokhtar","In Salah"] },
  5: { label: "Extrême Sud",    price: 1600, color: "#8B5CF6", wilayas: ["In Guezzam","Tamanrasset","Djanet","Illizi"] },
};

export const DELIVERY_FEES = {
  "Alger":      600,
  "Blida":      600,
  "Boumerdès":  600,
  "Tipaza":     600,

  "Oran":               900,
  "Médéa":              900,
  "Bouira":             900,
  "Tizi Ouzou":         900,
  "Béjaïa":             900,
  "Jijel":              900,
  "Mila":               900,
  "Mostaganem":         900,
  "Aïn Témouchent":     900,
  "Tlemcen":            900,
  "Sidi Bel Abbès":     900,
  "Mascara":            900,
  "Relizane":           900,
  "Chlef":              900,
  "Tissemsilt":         900,
  "Tiaret":             900,
  "Constantine":        900,
  "Annaba":             900,
  "Guelma":             900,
  "Skikda":             900,
  "Souk Ahras":         900,
  "El Tarf":            900,
  "Oum El Bouaghi":     900,
  "Batna":              900,
  "Sétif":              900,
  "Khenchela":          900,
  "Tébessa":            900,
  "Bordj Bou Arréridj": 900,
  "Aïn Defla":          900,
  "Saïda":              900,
  "Naâma":              900,

  "Laghouat":      1100,
  "Djelfa":        1100,
  "M'Sila":        1100,
  "Biskra":        1100,
  "El Oued":       1100,
  "Ouargla":       1100,
  "Ghardaïa":      1100,
  "Touggourt":     1100,
  "El Bayadh":     1100,
  "El M'Ghair":    1100,
  "El Menia":      1100,
  "Ouled Djellal": 1100,

  "Béchar":               1400,
  "Tindouf":              1400,
  "Béni Abbès":           1400,
  "Adrar":                1400,
  "Timimoun":             1400,
  "Bordj Badji Mokhtar":  1400,
  "In Salah":             1400,

  "In Guezzam":   1600,
  "Tamanrasset":  1600,
  "Djanet":       1600,
  "Illizi":       1600,
};

export const DEFAULT_FEE = 900;

export const SAME_WILAYA_FEES = {
  1: 350, 
  2: 400, 
  3: 400, 
  4: 500,
  5: 600, 
};


export const ZONE_MATRIX = {
  1: { 1: 500,  2: 700,  3: 1000, 4: 1400, 5: 1600 },
  2: { 1: 700,  2: 800,  3: 1100, 4: 1400, 5: 1600 },
  3: { 1: 1000, 2: 1100, 3: 900,  4: 1300, 5: 1500 },
  4: { 1: 1400, 2: 1400, 3: 1300, 4: 1200, 5: 1500 },
  5: { 1: 1600, 2: 1600, 3: 1500, 4: 1500, 5: 1500 },
};

function getZone(wilaya) {
  const z = Object.entries(DELIVERY_ZONES).find(([, zz]) => zz.wilayas.includes(wilaya));
  return z ? { id: parseInt(z[0]), label: z[1].label, color: z[1].color, basePrice: z[1].price } : null;
}

export function getDeliveryInfo(destWilaya, originWilaya = null) {
  const destZone = getZone(destWilaya);
  if (!destZone) {
    return { price: DEFAULT_FEE, zoneId: 2, zoneLabel: "Nord", zoneColor: "#3B82F6", sameWilaya: false };
  }

  const base = {
    price: destZone.basePrice,
    zoneId: destZone.id,
    zoneLabel: destZone.label,
    zoneColor: destZone.color,
    originZoneId: null,
    sameWilaya: false,
    sameZone: false,
  };

  if (!originWilaya) return base;

  if (originWilaya === destWilaya) {
    return {
      ...base,
      price: SAME_WILAYA_FEES[destZone.id] || 400,
      originZoneId: destZone.id,
      sameWilaya: true,
    };
  }

  const originZone = getZone(originWilaya);
  if (!originZone) return base;

  return {
    ...base,
    price: ZONE_MATRIX[originZone.id]?.[destZone.id] || destZone.basePrice,
    originZoneId: originZone.id,
    sameZone: originZone.id === destZone.id,
  };
}

export const ZONE_SUMMARY = [
  { zone: 1, label: "Grand Alger",    price: 600,  example: "Alger, Blida, Boumerdès, Tipaza",                    color: "#10B981" },
  { zone: 2, label: "Nord",           price: 900,  example: "Oran, Constantine, Sétif, Annaba, Tlemcen...",       color: "#3B82F6" },
  { zone: 3, label: "Hauts Plateaux", price: 1100, example: "Laghouat, Djelfa, Biskra, Ghardaïa, El Oued...",     color: "#F59E0B" },
  { zone: 4, label: "Grand Sud",      price: 1400, example: "Béchar, Adrar, Tindouf, In Salah...",                color: "#EF4444" },
  { zone: 5, label: "Extrême Sud",    price: 1600, example: "Tamanrasset, Illizi, Djanet, In Guezzam",            color: "#8B5CF6" },
];
