// ─────────────────────────────────────────────────────────────────────────────
// Marques et modèles de voitures présents sur le marché algérien (2026).
// Inclut les marques européennes classiques + l'explosion des marques chinoises
// (Geely, Chery, BYD, Changan, JAC, Haval, GAC, MG…) qui dominent maintenant.
// ─────────────────────────────────────────────────────────────────────────────

export const CAR_BRANDS = [
  // ── Européennes (historique) ──
  "Renault", "Peugeot", "Citroën", "Volkswagen", "Dacia",
  "Fiat", "Opel", "Seat", "Skoda", "Ford",
  "Mercedes", "BMW", "Audi", "Jeep",
  // ── Asiatiques ──
  "Toyota", "Hyundai", "Kia", "Nissan", "Honda",
  "Suzuki", "Mitsubishi", "Mazda", "Subaru",
  // ── Chinoises (explosion du marché algérien 2024-2026) ──
  "Geely", "Chery", "BYD", "Changan", "JAC",
  "Haval", "MG", "GAC", "Dongfeng", "Faw",
  "Foton", "BAIC", "Brilliance", "Lifan", "Great Wall",
  "Chana", "DFSK",
  // ── Russes / autres ──
  "Lada", "Chevrolet", "Tata",
];

export const CAR_MODELS = {
  // ── EUROPÉENNES ─────────────────────────────────────────────
  Renault:    ["Clio","Symbol","Mégane","Megane","Logan","Duster","Koleos","Talisman","Sandero","Kangoo","Trafic","Master","Captur","Laguna","R19","R21"],
  Peugeot:    ["206","207","208","301","307","308","405","406","508","2008","3008","5008","Partner","Expert","Boxer","Rifter"],
  Citroën:    ["C3","C4","C5","Berlingo","Xsara","Picasso","C-Elysée","Jumper","Jumpy","DS3","DS4","DS5","C-Crosser"],
  Volkswagen: ["Golf","Polo","Passat","Tiguan","Touareg","Caddy","Jetta","Touran","T-Cross","T-Roc","Amarok","Arteon"],
  Dacia:      ["Logan","Sandero","Duster","Dokker","Lodgy","Sandero Stepway","Spring"],
  Fiat:       ["Punto","Bravo","Tipo","500","Doblò","Ducato","Panda","Palio","Linea","500X","500L","Stilo"],
  Opel:       ["Corsa","Astra","Vectra","Zafira","Insignia","Mokka","Crossland","Grandland","Combo","Movano"],
  Seat:       ["Ibiza","Leon","Arona","Ateca","Alhambra","Toledo","Tarraco","Cordoba"],
  Skoda:      ["Fabia","Octavia","Superb","Karoq","Kodiaq","Rapid","Yeti","Scala","Kamiq"],
  Ford:       ["Focus","Fiesta","Mondeo","Ranger","Transit","Fusion","Kuga","Edge","Explorer","EcoSport","Tourneo"],
  Mercedes:   ["Classe A","Classe B","Classe C","Classe E","Classe S","Sprinter","Vito","Viano","GLA","GLC","GLE","GLS","CLA","CLS"],
  BMW:        ["Série 1","Série 2","Série 3","Série 4","Série 5","Série 6","Série 7","X1","X2","X3","X4","X5","X6","X7"],
  Audi:       ["A1","A3","A4","A5","A6","A7","A8","Q2","Q3","Q4","Q5","Q7","Q8"],
  Jeep:       ["Renegade","Compass","Cherokee","Grand Cherokee","Wrangler","Wagoneer","Gladiator"],

  // ── ASIATIQUES ──────────────────────────────────────────────
  Toyota:     ["Corolla","Yaris","Camry","RAV4","Hilux","Land Cruiser","Avensis","Fortuner","C-HR","Auris","Prius","Yaris Cross","Land Cruiser Prado"],
  Hyundai:    ["i10","i20","i30","Tucson","Santa Fe","Accent","Elantra","Creta","Kona","Sonata","Grand i10","Bayon","Venue","Palisade"],
  Kia:        ["Picanto","Rio","Sportage","Sorento","Cerato","Soul","Stonic","Seltos","K5","Niro","Carnival","Ceed"],
  Nissan:     ["Micra","Qashqai","X-Trail","Navara","Pathfinder","Sunny","Patrol","Juke","Note","Almera","Kicks"],
  Honda:      ["Civic","Jazz","CR-V","HR-V","Accord","City","Pilot","Insight"],
  Suzuki:     ["Swift","Vitara","Jimny","Alto","Celerio","Baleno","S-Cross","Ignis","Dzire","SX4"],
  Mitsubishi: ["Colt","Lancer","Outlander","L200","Pajero","Mirage","ASX","Eclipse Cross","Xpander"],
  Mazda:      ["Mazda 2","Mazda 3","Mazda 6","CX-3","CX-5","CX-30","BT-50","MX-30"],
  Subaru:     ["Impreza","Forester","Outback","XV","Legacy"],

  // ── CHINOISES ───────────────────────────────────────────────
  Geely:      ["Coolray","Emgrand","GX3 Pro","Starray","Okavango","Tugella","Atlas","Monjaro","Boyue","GC2","GC4","GC7"],
  Chery:      ["Tiggo 2","Tiggo 4","Tiggo 4 Pro","Tiggo 5","Tiggo 7","Tiggo 7 Pro","Tiggo 8","Tiggo 8 Pro","Arrizo 5","Arrizo 6","Arrizo 8","QQ","Omoda 5"],
  BYD:        ["Atto 3","Dolphin","Seal","Han","Tang","Song","Yuan","F3","Qin","Seagull"],
  Changan:    ["CS35","CS35 Plus","CS55","CS75","CS85","CS95","Eado","Alsvin","Uni-T","Uni-K","Hunter"],
  JAC:        ["S2","S3","S4","S5","S7","T6","T8","J3","J5","J7","Sunray","iEV7"],
  Haval:      ["H1","H2","H6","H9","Jolion","F7","Dargo","H6 GT"],
  MG:         ["MG3","MG5","MG6","MG ZS","MG HS","MG GS","Marvel R","MG4"],
  GAC:        ["GS3","GS4","GS5","GS8","GA4","GA6","Empow","Aion S"],
  Dongfeng:   ["AX3","AX4","AX5","AX7","S30","H30","Rich","T5"],
  Faw:        ["Besturn","Bestune T77","X40","X80","V2","V5","Tiansu"],
  Foton:      ["Sauvana","Tunland","View","Aumark","Toano"],
  BAIC:       ["X25","X35","X55","X65","X75","D20","BJ40","BJ80"],
  Brilliance: ["V3","V5","V6","V7","H230","H320","H530","Cross"],
  Lifan:      ["520","620","720","820","X50","X60","X70","Cebrium","Marvel"],
  "Great Wall": ["Wingle","Voleex","Steed","H6","Poer","Tank"],
  Chana:      ["Star","Eado","Benni","Alsvin"],
  DFSK:       ["Glory 580","Glory 500","Glory 330","K01","K05","K07","V21","V27"],

  // ── RUSSES / AUTRES ─────────────────────────────────────────
  Lada:       ["Niva","Vesta","Granta","Largus","Priora","Kalina","XRAY"],
  Chevrolet:  ["Aveo","Cruze","Captiva","Spark","Malibu","Trax","Optra","Tahoe","Silverado"],
  Tata:       ["Indica","Indigo","Nano","Xenon","Telcoline","Sumo"],
};
