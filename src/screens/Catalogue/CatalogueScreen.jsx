import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, Modal, FlatList, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../../constants/theme";
// Et dans le composant :

// ─────────────────────────────────────────────────────────────────────────────
// DONNÉES CATALOGUE — Marché algérien 100% réel
// ─────────────────────────────────────────────────────────────────────────────

const BRANDS = [
  { id: "renault",  name: "Renault",  models: ["Symbol", "Clio II", "Clio III", "Clio IV", "Mégane II", "Mégane III", "Kangoo", "Laguna", "R19"] },
  { id: "dacia",    name: "Dacia",    models: ["Logan I", "Logan II", "Logan III", "Sandero I", "Sandero II", "Sandero Stepway", "Duster", "Dokker"] },
  { id: "peugeot",  name: "Peugeot",  models: ["206", "207", "208", "301", "307", "308", "405", "406", "Partner", "Expert"] },
  { id: "fiat",     name: "Fiat",     models: ["Tipo", "500", "Punto", "Palio", "Doblò", "Bravo", "Stilo"] },
  { id: "hyundai",  name: "Hyundai",  models: ["Accent", "i10", "Grand i10", "i20", "i30", "Tucson", "Atos", "Getz", "Elantra"] },
  { id: "volkswagen",name:"VW",       models: ["Golf IV", "Golf V", "Golf VI", "Golf VII", "Polo", "Caddy", "Passat", "Touareg"] },
  { id: "toyota",   name: "Toyota",   models: ["Corolla", "Yaris", "RAV4", "Hilux", "Land Cruiser", "Camry", "Auris"] },
  { id: "kia",      name: "Kia",      models: ["Picanto", "Rio", "Sportage", "Ceed", "Seltos", "Sorento"] },
  { id: "citroen",  name: "Citroën",  models: ["C3", "C4", "C5", "Berlingo", "C-Elysée", "Xsara Picasso", "Dispatch"] },
  { id: "seat",     name: "Seat",     models: ["Ibiza", "Leon", "Arona", "Ateca", "Toledo"] },
  { id: "geely",    name: "Geely",    models: ["GX3 Pro", "Coolray", "Emgrand", "Starray", "Okavango"] },
  { id: "chery",    name: "Chery",    models: ["Tiggo 2", "Tiggo 4 Pro", "Tiggo 7 Pro", "Tiggo 8 Pro", "Arrizo 5", "Arrizo 6"] },
  { id: "suzuki",   name: "Suzuki",   models: ["Swift", "Alto", "Vitara", "Jimny", "Celerio", "Baleno"] },
  { id: "skoda",    name: "Škoda",    models: ["Fabia", "Octavia", "Rapid", "Kodiaq"] },
  { id: "nissan",   name: "Nissan",   models: ["Micra", "Sunny", "Qashqai", "Navara", "Patrol"] },
];

const CATEGORIES = [
  {
    id: "moteur", icon: "⚙️", color: "#E67E22", name: "Moteur",
    desc: "Bloc moteur, culasse, joints, pompes…",
    subcats: [
      {
        name: "Joints & Étanchéité",
        parts: [
          { name: "Joint de culasse", tip: "Remplacer si surchauffe répétée ou huile dans l'eau", pMin: 3500, pMax: 18000 },
          { name: "Pochette de joints moteur complète", tip: "Ensemble de tous les joints du moteur", pMin: 8000, pMax: 35000 },
          { name: "Joint de carter d'huile", tip: "Fuite d'huile sous le moteur", pMin: 500, pMax: 2500 },
          { name: "Joint spy / Bague d'étanchéité", tip: "Fuite côté vilebrequin ou distribution", pMin: 300, pMax: 1500 },
        ],
      },
      {
        name: "Pompes",
        parts: [
          { name: "Pompe à eau", tip: "À remplacer avec le kit de distribution", pMin: 3000, pMax: 15000 },
          { name: "Pompe à huile", tip: "Si pression d'huile faible", pMin: 5000, pMax: 20000 },
          { name: "Pompe à carburant", tip: "Panne démarrage ou coupure moteur", pMin: 4000, pMax: 18000 },
        ],
      },
      {
        name: "Alimentation",
        parts: [
          { name: "Injecteur", tip: "Consommation élevée ou ratés moteur", pMin: 6000, pMax: 25000 },
          { name: "Boîtier papillon électronique", tip: "Régime moteur instable", pMin: 8000, pMax: 30000 },
          { name: "Débitmètre d'air (MAF)", tip: "Voyant moteur allumé, manque de puissance", pMin: 5000, pMax: 18000 },
          { name: "Vanne EGR", tip: "Fumées noires, perte de puissance diesel", pMin: 8000, pMax: 35000 },
        ],
      },
      {
        name: "Support & Capteurs",
        parts: [
          { name: "Silent bloc moteur", tip: "Vibrations excessives au ralenti", pMin: 1500, pMax: 8000 },
          { name: "Capteur régime moteur (PMH)", tip: "Moteur cale ou démarrage difficile", pMin: 2000, pMax: 8000 },
          { name: "Sonde lambda / Capteur O2", tip: "Voyant moteur, conso carburant élevée", pMin: 3500, pMax: 12000 },
        ],
      },
    ],
  },
  {
    id: "freinage", icon: "🛑", color: "#E74C3C", name: "Freinage",
    desc: "Plaquettes, disques, étriers, liquide…",
    subcats: [
      {
        name: "Freins à disque",
        parts: [
          { name: "Plaquettes de frein avant", tip: "À changer tous les 30 000–40 000 km, ou si grincement", pMin: 1500, pMax: 8000 },
          { name: "Plaquettes de frein arrière", tip: "Usure plus lente, vérifier tous les 50 000 km", pMin: 1200, pMax: 7000 },
          { name: "Disque de frein avant (paire)", tip: "À changer avec les plaquettes si rainuré", pMin: 4000, pMax: 18000 },
          { name: "Disque de frein arrière (paire)", tip: "Vibrations ou pulsations au freinage", pMin: 3500, pMax: 14000 },
          { name: "Étrier de frein complet", tip: "Frein qui bloque ou traîne", pMin: 6000, pMax: 22000 },
          { name: "Kit réparation étrier", tip: "Fuite de liquide au niveau de la roue", pMin: 800, pMax: 3000 },
        ],
      },
      {
        name: "Freins à tambour",
        parts: [
          { name: "Tambour de frein arrière", tip: "Voiture tire d'un côté au freinage", pMin: 3000, pMax: 10000 },
          { name: "Mâchoires de frein (garnitures)", tip: "Changer tous les 80 000–100 000 km", pMin: 1500, pMax: 6000 },
          { name: "Cylindre de roue", tip: "Fuite de liquide de frein dans le tambour", pMin: 1000, pMax: 4000 },
        ],
      },
      {
        name: "Hydraulique",
        parts: [
          { name: "Maître-cylindre de frein", tip: "Pédale de frein qui s'enfonce sans freiner", pMin: 5000, pMax: 18000 },
          { name: "Flexible de frein", tip: "Fuite ou flexibles gonflés/fissurés", pMin: 800, pMax: 3500 },
          { name: "Liquide de frein DOT 4", tip: "À changer tous les 2 ans", pMin: 600, pMax: 2000 },
          { name: "Servo-frein", tip: "Freinage dur et peu efficace", pMin: 8000, pMax: 28000 },
        ],
      },
    ],
  },
  {
    id: "suspension", icon: "🔧", color: "#2ECC71", name: "Suspension & Direction",
    desc: "Amortisseurs, rotules, crémaillère…",
    subcats: [
      {
        name: "Amortisseurs",
        parts: [
          { name: "Amortisseur avant", tip: "Voiture rebondit trop ou tient mal la route", pMin: 8000, pMax: 35000 },
          { name: "Amortisseur arrière", tip: "Caisse qui plonge à l'arrêt brusque", pMin: 6000, pMax: 28000 },
          { name: "Coupelle de suspension", tip: "Bruit lors de braquage ou passage de bosses", pMin: 1500, pMax: 6000 },
          { name: "Ressort de suspension", tip: "Voiture qui penche d'un côté", pMin: 3000, pMax: 12000 },
          { name: "Butée d'amortisseur", tip: "Bruit sourd sur les bosses", pMin: 800, pMax: 3500 },
        ],
      },
      {
        name: "Bras & Rotules",
        parts: [
          { name: "Rotule de suspension inférieure", tip: "Claquement dans le train avant sur les irrégularités", pMin: 2500, pMax: 9000 },
          { name: "Bras de suspension", tip: "Voiture tire d'un côté ou usure inégale des pneus", pMin: 5000, pMax: 20000 },
          { name: "Biellette de barre stabilisatrice", tip: "Bruit métallique en tournant", pMin: 1200, pMax: 5000 },
          { name: "Silent bloc de suspension", tip: "Vibrations et bruits de caisse", pMin: 800, pMax: 4000 },
        ],
      },
      {
        name: "Direction",
        parts: [
          { name: "Rotule de direction", tip: "Jeu au volant, insécurité en virage", pMin: 2000, pMax: 7000 },
          { name: "Biellette de direction", tip: "Volant qui vibre à certaines vitesses", pMin: 1500, pMax: 6000 },
          { name: "Crémaillère de direction", tip: "Direction dure ou imprécise", pMin: 15000, pMax: 55000 },
          { name: "Soufflet de direction", tip: "Protège la crémaillère, remplacer si déchiré", pMin: 500, pMax: 2500 },
          { name: "Pompe de direction assistée", tip: "Direction très dure", pMin: 12000, pMax: 40000 },
        ],
      },
      {
        name: "Roulements & Moyeux",
        parts: [
          { name: "Roulement de roue avant", tip: "Ronflement qui augmente avec la vitesse", pMin: 2500, pMax: 9000 },
          { name: "Roulement de roue arrière", tip: "Même symptôme côté arrière", pMin: 2000, pMax: 7500 },
          { name: "Capteur ABS (roue)", tip: "Voyant ABS allumé", pMin: 2000, pMax: 7000 },
        ],
      },
    ],
  },
  {
    id: "carrosserie", icon: "🚗", color: "#3498DB", name: "Carrosserie",
    desc: "Pare-chocs, optiques, vitrage, portes…",
    subcats: [
      {
        name: "Optiques & Éclairage",
        parts: [
          { name: "Phare avant complet", tip: "Cassé ou jauni, vérifier homologation", pMin: 8000, pMax: 45000 },
          { name: "Feu arrière", tip: "Obligatoire de remplacer immédiatement si cassé", pMin: 5000, pMax: 20000 },
          { name: "Antibrouillard avant", tip: "Pour visibilité réduite", pMin: 3000, pMax: 10000 },
          { name: "Clignotant latéral", tip: "Simple à remplacer soi-même", pMin: 400, pMax: 2000 },
          { name: "Ampoule feu de croisement (H4/H7)", tip: "Changer les 2 en même temps", pMin: 300, pMax: 2500 },
        ],
      },
      {
        name: "Éléments de carrosserie",
        parts: [
          { name: "Pare-chocs avant", tip: "Généralement en plastique, peut se réparer", pMin: 8000, pMax: 35000 },
          { name: "Pare-chocs arrière", tip: "Attention aux capteurs de recul intégrés", pMin: 7000, pMax: 30000 },
          { name: "Aile avant", tip: "Rouille ou choc, peut se débosseler", pMin: 5000, pMax: 20000 },
          { name: "Capot moteur", tip: "Vérifier l'alignement à la pose", pMin: 10000, pMax: 40000 },
        ],
      },
      {
        name: "Fermetures & Vitrage",
        parts: [
          { name: "Mécanisme de lève-vitre", tip: "Vitre coincée ou qui descend seule", pMin: 3000, pMax: 12000 },
          { name: "Moteur lève-vitre électrique", tip: "Vitre ne répond plus au bouton", pMin: 4000, pMax: 14000 },
          { name: "Serrure de porte", tip: "Porte qui ne ferme plus correctement", pMin: 2500, pMax: 8000 },
          { name: "Poignée de porte extérieure", tip: "Cassée ou rouillée", pMin: 1200, pMax: 5000 },
          { name: "Rétroviseur extérieur complet", tip: "Vérifier le câblage pour les rétros électriques", pMin: 4000, pMax: 18000 },
        ],
      },
    ],
  },
  {
    id: "electrique", icon: "⚡", color: "#F39C12", name: "Électrique",
    desc: "Batterie, alternateur, démarreur, capteurs…",
    subcats: [
      {
        name: "Démarrage & Charge",
        parts: [
          { name: "Batterie 60Ah", tip: "Durée de vie 3–5 ans, tester avant de changer l'alternateur", pMin: 8000, pMax: 22000 },
          { name: "Alternateur", tip: "Voyant batterie allumé en roulant", pMin: 18000, pMax: 55000 },
          { name: "Démarreur (starter)", tip: "Bruit de craquetis au démarrage", pMin: 12000, pMax: 40000 },
          { name: "Poulie roue libre alternateur", tip: "Sifflement côté alternateur", pMin: 2000, pMax: 8000 },
        ],
      },
      {
        name: "Allumage",
        parts: [
          { name: "Bougie d'allumage (unité)", tip: "Changer les 4 en même temps tous les 30–60 000 km", pMin: 400, pMax: 2500 },
          { name: "Bougie de préchauffage diesel", tip: "Démarrage difficile par temps froid", pMin: 600, pMax: 3000 },
          { name: "Bobine d'allumage", tip: "Raté d'allumage sur un cylindre", pMin: 4000, pMax: 15000 },
          { name: "Kit câbles d'allumage", tip: "Mauvaise combustion, consommation élevée", pMin: 2500, pMax: 8000 },
        ],
      },
      {
        name: "Commandes & Relais",
        parts: [
          { name: "Relais multifonction", tip: "Panne électrique sur un circuit spécifique", pMin: 800, pMax: 4000 },
          { name: "Boîte à fusibles + fusibles", tip: "Équipement électrique qui ne fonctionne plus", pMin: 500, pMax: 3000 },
          { name: "Contacteur d'allumage (neiman)", tip: "Clé tourne dans le vide", pMin: 3000, pMax: 10000 },
        ],
      },
    ],
  },
  {
    id: "clim", icon: "❄️", color: "#1ABC9C", name: "Climatisation",
    desc: "Compresseur, condenseur, filtre habitacle…",
    subcats: [
      {
        name: "Circuit climatisation",
        parts: [
          { name: "Compresseur de climatisation", tip: "La clim souffle chaud, à vérifier avec manomètre avant", pMin: 28000, pMax: 90000 },
          { name: "Condenseur de climatisation", tip: "Fuite de gaz ou efficacité réduite", pMin: 12000, pMax: 40000 },
          { name: "Filtre déshydrateur (bouteille)", tip: "Toujours remplacer lors d'une intervention sur le circuit", pMin: 3000, pMax: 8000 },
          { name: "Pressostat haute/basse pression", tip: "Compresseur qui se coupe tout seul", pMin: 2000, pMax: 7000 },
        ],
      },
      {
        name: "Ventilation & Habitacle",
        parts: [
          { name: "Pulseur d'air (moteur ventilateur)", tip: "La ventilation ne souffle plus ou par intermittence", pMin: 5000, pMax: 18000 },
          { name: "Résistance de chauffage pulseur", tip: "Ventilation bloquée sur une seule vitesse", pMin: 1500, pMax: 6000 },
          { name: "Filtre habitacle (filtre à pollen)", tip: "Changer tous les ans ou 15 000 km — améliore l'air intérieur", pMin: 600, pMax: 2500 },
          { name: "Radiateur de chauffage", tip: "Buée excessive ou odeur sucrée dans l'habitacle", pMin: 6000, pMax: 22000 },
        ],
      },
    ],
  },
  {
    id: "transmission", icon: "🔄", color: "#9B59B6", name: "Transmission",
    desc: "Embrayage, cardans, boîte de vitesses…",
    subcats: [
      {
        name: "Embrayage",
        parts: [
          { name: "Kit embrayage complet (disque + mécanisme + butée)", tip: "Patinage embrayage ou pédale dure — pièce maîtresse", pMin: 18000, pMax: 60000 },
          { name: "Volant moteur bi-masse", tip: "Vibrations en passant les vitesses", pMin: 25000, pMax: 85000 },
          { name: "Butée hydraulique d'embrayage", tip: "Grincement lors de l'appui sur la pédale", pMin: 3000, pMax: 10000 },
          { name: "Câble d'embrayage", tip: "Pédale molle ou embrayage mal réglé", pMin: 1000, pMax: 4000 },
        ],
      },
      {
        name: "Cardans & Transmission",
        parts: [
          { name: "Cardan de transmission (joint homocinétique)", tip: "Claquement en virage serré", pMin: 8000, pMax: 28000 },
          { name: "Soufflet de cardan", tip: "Remplacer immédiatement si déchiré — protège le cardan", pMin: 1500, pMax: 5000 },
          { name: "Joint spi de boîte de vitesses", tip: "Fuite d'huile côté boîte", pMin: 500, pMax: 2000 },
        ],
      },
    ],
  },
  {
    id: "distribution", icon: "⏱️", color: "#E74C3C", name: "Distribution",
    desc: "Courroie, chaîne, kit complet…",
    subcats: [
      {
        name: "Kit de distribution",
        parts: [
          { name: "Kit distribution (courroie + tendeur + galet)", tip: "OBLIGATOIRE tous les 60–120 000 km selon le modèle — ne pas attendre", pMin: 8000, pMax: 28000 },
          { name: "Kit distribution + pompe à eau", tip: "Recommandé : changer la pompe en même temps", pMin: 12000, pMax: 38000 },
          { name: "Courroie de distribution seule", tip: "Uniquement si les autres pièces sont récentes", pMin: 2000, pMax: 8000 },
          { name: "Tendeur de courroie", tip: "Grincement ou courroie qui saute", pMin: 2000, pMax: 7000 },
        ],
      },
      {
        name: "Courroie d'accessoires",
        parts: [
          { name: "Courroie d'accessoires (poly-V)", tip: "Sifflement moteur, à changer tous les 60 000 km", pMin: 1200, pMax: 5000 },
          { name: "Tendeur courroie d'accessoires", tip: "Toujours remplacer avec la courroie", pMin: 1500, pMax: 6000 },
        ],
      },
    ],
  },
  {
    id: "filtration", icon: "🔩", color: "#7F8C8D", name: "Filtration",
    desc: "Filtre huile, air, carburant, habitacle…",
    subcats: [
      {
        name: "Filtres essentiels",
        parts: [
          { name: "Filtre à huile", tip: "Changer à chaque vidange — toujours", pMin: 400, pMax: 2000 },
          { name: "Filtre à air moteur", tip: "Tous les 15–30 000 km selon l'environnement — Algérie = poussiéreux", pMin: 600, pMax: 2800 },
          { name: "Filtre à carburant (essence ou gazole)", tip: "Tous les 30–60 000 km, avant si pompe à carburant fragile", pMin: 800, pMax: 3500 },
          { name: "Filtre habitacle (pollen)", tip: "Tous les ans — indispensable dans les villes algériennes", pMin: 600, pMax: 2500 },
        ],
      },
    ],
  },
  {
    id: "refroidissement", icon: "🌡️", color: "#3498DB", name: "Refroidissement",
    desc: "Radiateur, thermostat, durites, liquide…",
    subcats: [
      {
        name: "Circuit de refroidissement",
        parts: [
          { name: "Radiateur moteur", tip: "Surchauffe fréquente ou fuite de liquide", pMin: 10000, pMax: 38000 },
          { name: "Thermostat d'eau", tip: "Moteur qui ne monte pas en température ou surchauffe", pMin: 1500, pMax: 6000 },
          { name: "Durite de radiateur (supérieure/inférieure)", tip: "Fissure, gonflement ou fuite", pMin: 1200, pMax: 5000 },
          { name: "Vase d'expansion", tip: "Fuite de liquide ou bouchon qui claque", pMin: 1500, pMax: 6000 },
          { name: "Liquide de refroidissement", tip: "Changer tous les 2 ans — ne jamais mélanger eau et liquide pur", pMin: 600, pMax: 2500 },
        ],
      },
    ],
  },
  {
    id: "echappement", icon: "💨", color: "#95A5A6", name: "Échappement",
    desc: "Pot, silencieux, catalyseur, EGR…",
    subcats: [
      {
        name: "Ligne d'échappement",
        parts: [
          { name: "Pot d'échappement (silencieux arrière)", tip: "Bruit fort, trou visible dans le pot", pMin: 6000, pMax: 22000 },
          { name: "Silencieux central", tip: "Étape intermédiaire souvent corrodée", pMin: 5000, pMax: 18000 },
          { name: "Collecteur d'échappement", tip: "Bruit moteur anormal, odeur de brûlé", pMin: 8000, pMax: 30000 },
          { name: "Catalyseur", tip: "Voyant dépollution, odeur d'œuf pourri", pMin: 15000, pMax: 60000 },
        ],
      },
    ],
  },
  {
    id: "huiles", icon: "🧴", color: "#F39C12", name: "Huiles & Fluides",
    desc: "Huile moteur, liquides, additifs…",
    subcats: [
      {
        name: "Huiles moteur",
        parts: [
          { name: "Huile moteur 5W30 synthétique", tip: "Moteurs récents (post-2010) essence & diesel", pMin: 1500, pMax: 3500 },
          { name: "Huile moteur 5W40 synthétique", tip: "Usage polyvalent, adapté au climat algérien", pMin: 1400, pMax: 3000 },
          { name: "Huile moteur 15W40 semi-synthétique", tip: "Moteurs anciens, R19, Clio II, 205", pMin: 900, pMax: 2000 },
          { name: "Huile boîte de vitesses", tip: "Changer tous les 60 000 km ou si difficultés de passage", pMin: 1200, pMax: 4000 },
        ],
      },
      {
        name: "Fluides & Produits",
        parts: [
          { name: "Liquide de frein DOT 4", tip: "Obligatoire tous les 2 ans — absorbe l'humidité", pMin: 600, pMax: 2000 },
          { name: "Liquide de refroidissement concentré", tip: "Ne jamais utiliser de l'eau pure — fait rouiller le circuit", pMin: 700, pMax: 2500 },
          { name: "Dégrippant lubrifiant (WD-40)", tip: "Boulons rouillés, contacts électriques", pMin: 400, pMax: 1500 },
          { name: "Pâte à joint (silicone)", tip: "Étanchéité carter, couvre-culasse", pMin: 500, pMax: 1800 },
        ],
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT PARTIE CARD
// ─────────────────────────────────────────────────────────────────────────────
// Marques compatibles selon la catégorie de pièce
const COMPATIBLE_BRANDS = {
  "Valeo":   ["Renault","Dacia","Peugeot","Citroën","Fiat","Seat","Volkswagen"],
  "Bosch":   ["Volkswagen","Seat","Renault","Dacia","Peugeot","Citroën","Hyundai","Kia","Toyota"],
  "SKF":     ["Renault","Dacia","Peugeot","Citroën","Volkswagen","Seat","Fiat"],
  "Sachs":   ["Volkswagen","Seat","Renault","Dacia","Peugeot","Fiat","Citroën"],
  "KYB":     ["Toyota","Hyundai","Kia","Renault","Dacia","Peugeot","Nissan"],
  "NGK":     ["Toyota","Hyundai","Kia","Renault","Dacia","Volkswagen","Nissan","Geely","Chery"],
  "Mahle":   ["Volkswagen","Seat","Renault","Dacia","Peugeot","Fiat","Hyundai","Kia"],
  "Brembo":  ["Volkswagen","Seat","Renault","Peugeot","Citroën","Fiat","Toyota"],
};

function getBrandsForVehicle(brandName) {
  if (!brandName) return [];
  return Object.entries(COMPATIBLE_BRANDS)
    .filter(([, vehicles]) => vehicles.includes(brandName))
    .map(([brand]) => brand)
    .slice(0, 4);
}

function PartCard({ part, vehicleBrand }) {
  const [open, setOpen] = useState(false);
  const compatBrands = vehicleBrand ? getBrandsForVehicle(vehicleBrand) : [];

  return (
    <TouchableOpacity onPress={() => setOpen(!open)} style={pc.card} activeOpacity={0.85}>
      <View style={pc.row}>
        <View style={{ flex: 1 }}>
          <Text style={pc.name}>{part.name}</Text>
          <Text style={pc.price}>
            {part.pMin.toLocaleString()} – {part.pMax.toLocaleString()} DA
          </Text>
        </View>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={C.textDim} />
      </View>
      {open && (
        <>
          <View style={pc.tip}>
            <Ionicons name="bulb-outline" size={14} color={C.accent} />
            <Text style={pc.tipTxt}>{part.tip}</Text>
          </View>
          {vehicleBrand && compatBrands.length > 0 && (
            <View style={pc.brandRow}>
              <Text style={pc.brandLabel}>Marques compatibles {vehicleBrand} :</Text>
              <View style={pc.brandTags}>
                {compatBrands.map((b) => (
                  <View key={b} style={pc.brandTag}>
                    <Text style={pc.brandTagTxt}>{b}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          <View style={pc.qualityRow}>
            <View style={[pc.qualityBadge, { backgroundColor: "#E74C3C20" }]}>
              <Text style={[pc.qualityTxt, { color: "#E74C3C" }]}>⭐ Origine</Text>
              <Text style={pc.qualityPrice}>{Math.round(part.pMax * 0.9).toLocaleString()}+ DA</Text>
            </View>
            <View style={[pc.qualityBadge, { backgroundColor: C.accent + "15" }]}>
              <Text style={[pc.qualityTxt, { color: C.accent }]}>🔧 Aftermarket</Text>
              <Text style={pc.qualityPrice}>{Math.round((part.pMin + part.pMax) / 2).toLocaleString()} DA</Text>
            </View>
            <View style={[pc.qualityBadge, { backgroundColor: "#95A5A620" }]}>
              <Text style={[pc.qualityTxt, { color: "#95A5A6" }]}>💰 Éco.</Text>
              <Text style={pc.qualityPrice}>{part.pMin.toLocaleString()} DA</Text>
            </View>
          </View>
        </>
      )}
    </TouchableOpacity>
  );
}

const pc = StyleSheet.create({
  card:         { backgroundColor: C.surfaceAlt, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: C.border },
  row:          { flexDirection: "row", alignItems: "center", gap: 10 },
  name:         { fontSize: 13, fontWeight: "700", color: C.text, marginBottom: 3 },
  price:        { fontSize: 11, color: C.accent, fontWeight: "700" },
  tip:          { flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 10, backgroundColor: C.accent + "10", borderRadius: 8, padding: 10 },
  tipTxt:       { flex: 1, fontSize: 11, color: C.textMuted, lineHeight: 16 },
  brandRow:     { marginTop: 8 },
  brandLabel:   { fontSize: 10, color: C.textDim, fontWeight: "700", marginBottom: 6 },
  brandTags:    { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  brandTag:     { backgroundColor: C.surface, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: C.border },
  brandTagTxt:  { fontSize: 10, fontWeight: "700", color: C.text },
  qualityRow:   { flexDirection: "row", gap: 6, marginTop: 8 },
  qualityBadge: { flex: 1, borderRadius: 8, padding: 8, alignItems: "center" },
  qualityTxt:   { fontSize: 9, fontWeight: "800", marginBottom: 2 },
  qualityPrice: { fontSize: 9, color: C.textMuted, fontWeight: "600" },
});

// ─────────────────────────────────────────────────────────────────────────────
// ÉCRAN PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function CatalogueScreen() {
  const [search, setSearch]           = useState("");
  const [selectedCat, setSelectedCat] = useState(null);
  const [brandModal, setBrandModal]   = useState(false);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [selectedModel, setSelectedModel] = useState(null);

  // Recherche globale
  const searchResults = search.trim().length > 1
    ? CATEGORIES.flatMap((cat) =>
        cat.subcats.flatMap((sub) =>
          sub.parts
            .filter((p) =>
              p.name.toLowerCase().includes(search.toLowerCase()) ||
              sub.name.toLowerCase().includes(search.toLowerCase()) ||
              cat.name.toLowerCase().includes(search.toLowerCase())
            )
            .map((p) => ({ ...p, catName: cat.name, subName: sub.name, catColor: cat.color }))
        )
      )
    : [];

  const displayCat = selectedCat
    ? CATEGORIES.find((c) => c.id === selectedCat)
    : null;

  return (
    <View style={s.container}>
      {/* ── HEADER ── */}
      <View style={[s.header, { paddingTop: Platform.OS === "ios" ? 54 : 24 }]}>
        <Text style={s.title}>Catalogue Pièces</Text>
        <Text style={s.subtitle}>Marché algérien — Prix indicatifs en DA</Text>
      </View>

      {/* ── BARRE DE RECHERCHE ── */}
      <View style={s.searchRow}>
        <View style={s.searchBar}>
          <Ionicons name="search-outline" size={18} color={C.textDim} />
          <TextInput
            style={s.searchInput}
            placeholder="Chercher une pièce… (plaquette, radiateur…)"
            placeholderTextColor={C.textDim}
            value={search}
            onChangeText={(v) => { setSearch(v); setSelectedCat(null); }}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color={C.textDim} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* ── SÉLECTEUR VÉHICULE ── */}
      <TouchableOpacity onPress={() => setBrandModal(true)} style={s.vehicleBtn} activeOpacity={0.85}>
        <Ionicons name="car-outline" size={18} color={C.accent} />
        <Text style={s.vehicleTxt}>
          {selectedBrand && selectedModel
            ? `${selectedBrand.name} ${selectedModel}`
            : selectedBrand
            ? selectedBrand.name
            : "Sélectionner mon véhicule"}
        </Text>
        {(selectedBrand || selectedModel) && (
          <TouchableOpacity onPress={(e) => { e.stopPropagation(); setSelectedBrand(null); setSelectedModel(null); }}>
            <Ionicons name="close-circle" size={16} color={C.textDim} />
          </TouchableOpacity>
        )}
        <Ionicons name="chevron-down" size={15} color={C.accent} />
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── RÉSULTATS RECHERCHE ── */}
        {search.trim().length > 1 ? (
          <View style={s.pad}>
            <Text style={s.secTitle}>
              {searchResults.length} résultat{searchResults.length !== 1 ? "s" : ""} pour "{search}"
            </Text>
            {searchResults.length === 0 ? (
              <View style={s.empty}>
                <Ionicons name="search-outline" size={40} color={C.textDim} />
                <Text style={s.emptyTxt}>Aucune pièce trouvée</Text>
                <Text style={s.emptySub}>Essayez avec le nom français de la pièce</Text>
              </View>
            ) : (
              searchResults.map((p, i) => (
                <View key={i}>
                  <View style={s.searchTag}>
                    <Text style={[s.searchTagTxt, { color: p.catColor }]}>
                      {p.catName} › {p.subName}
                    </Text>
                  </View>
                  <PartCard part={p} vehicleBrand={selectedBrand?.name} />
                </View>
              ))
            )}
          </View>
        ) : selectedCat && displayCat ? (
          /* ── CATÉGORIE SÉLECTIONNÉE ── */
          <View style={s.pad}>
            <TouchableOpacity onPress={() => setSelectedCat(null)} style={s.backBtn}>
              <Ionicons name="arrow-back" size={16} color={C.accent} />
              <Text style={s.backTxt}>Toutes les catégories</Text>
            </TouchableOpacity>
            <View style={s.catHeader}>
              <Text style={s.catEmoji}>{displayCat.icon}</Text>
              <View>
                <Text style={s.catHeaderName}>{displayCat.name}</Text>
                <Text style={s.catHeaderDesc}>{displayCat.desc}</Text>
              </View>
            </View>
            {displayCat.subcats.map((sub, i) => (
              <View key={i} style={s.subSection}>
                <Text style={[s.subTitle, { borderLeftColor: displayCat.color }]}>{sub.name}</Text>
                {sub.parts.map((part, j) => (
                  <PartCard key={j} part={part} />
                ))}
              </View>
            ))}
          </View>
        ) : (
          /* ── GRILLE DES CATÉGORIES ── */
          <View style={s.pad}>
            {selectedBrand && (
              <View style={s.vehicleInfo}>
                <Ionicons name="car" size={16} color={C.accent} />
                <Text style={s.vehicleInfoTxt}>
                  <Text style={{fontWeight:"900", color: C.accent}}>{selectedBrand.name}{selectedModel ? " " + selectedModel : ""}</Text>
                  {" — Appuyez sur une catégorie pour voir les pièces adaptées à votre véhicule avec les marques compatibles ({selectedBrand.name}, Valeo, Bosch…)"}
                </Text>
              </View>
            )}

            <Text style={s.secTitle}>
              {CATEGORIES.length} catégories • {
                CATEGORIES.reduce((t, c) => t + c.subcats.reduce((s, sc) => s + sc.parts.length, 0), 0)
              } pièces référencées
            </Text>

            <View style={s.grid}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setSelectedCat(cat.id)}
                  style={s.catCard}
                  activeOpacity={0.85}>
                  <View style={[s.catIconBg, { backgroundColor: cat.color + "18" }]}>
                    <Text style={s.catIcon}>{cat.icon}</Text>
                  </View>
                  <Text style={s.catName}>{cat.name}</Text>
                  <Text style={s.catDesc} numberOfLines={2}>{cat.desc}</Text>
                  <Text style={[s.catCount, { color: cat.color }]}>
                    {cat.subcats.reduce((t, s) => t + s.parts.length, 0)} pièces
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* NOTE MARCHÉ */}
            <View style={s.marketNote}>
              <Text style={s.marketNoteTitle}>💡 Conseil qualité</Text>
              <Text style={s.marketNoteTxt}>
                En Algérie, les pièces sont vendues en 3 gammes :{"\n"}
                <Text style={{ color: "#E74C3C" }}>⭐ Origine</Text> — pièce du constructeur, la meilleure qualité{"\n"}
                <Text style={{ color: "#F39C12" }}>🔧 Aftermarket (Valeo, Bosch, SKF…)</Text> — bon rapport qualité/prix{"\n"}
                <Text style={{ color: "#95A5A6" }}>💰 Économique</Text> — moins cher, qualité variable
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── MODAL SÉLECTION VÉHICULE ── */}
      <Modal visible={brandModal} animationType="slide" transparent>
        <View style={m.overlay}>
          <View style={m.sheet}>
            <View style={m.handleBar} />
            <Text style={m.title}>Votre véhicule</Text>

            {!selectedBrand ? (
              <>
                <Text style={m.label}>Choisissez la marque</Text>
                <FlatList
                  data={BRANDS}
                  keyExtractor={(b) => b.id}
                  numColumns={3}
                  columnWrapperStyle={{ gap: 8 }}
                  contentContainerStyle={{ gap: 8 }}
                  renderItem={({ item: b }) => (
                    <TouchableOpacity
                      onPress={() => setSelectedBrand(b)}
                      style={m.brandBtn}>
                      <Text style={m.brandTxt}>{b.name}</Text>
                    </TouchableOpacity>
                  )}
                />
              </>
            ) : (
              <>
                <TouchableOpacity onPress={() => setSelectedBrand(null)} style={m.backRow}>
                  <Ionicons name="arrow-back" size={16} color={C.accent} />
                  <Text style={m.backTxt}>Changer de marque</Text>
                </TouchableOpacity>
                <Text style={m.label}>Modèle — {selectedBrand.name}</Text>
                <FlatList
                  data={selectedBrand.models}
                  keyExtractor={(x) => x}
                  renderItem={({ item: model }) => (
                    <TouchableOpacity
                      onPress={() => { setSelectedModel(model); setBrandModal(false); }}
                      style={m.modelBtn}>
                      <Text style={m.modelTxt}>{model}</Text>
                      <Ionicons name="chevron-forward" size={16} color={C.textDim} />
                    </TouchableOpacity>
                  )}
                />
              </>
            )}

            <TouchableOpacity
              onPress={() => { setBrandModal(false); if (!selectedModel) setSelectedBrand(null); }}
              style={m.closeBtn}>
              <Text style={m.closeTxt}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: C.bg },
  header:          { paddingHorizontal: 16, paddingBottom: 10 },
  title:           { fontSize: 22, fontWeight: "900", color: C.text },
  subtitle:        { fontSize: 12, color: C.textMuted, marginTop: 3 },
  searchRow:       { paddingHorizontal: 14, paddingBottom: 10 },
  searchBar:       { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingHorizontal: 14, height: 48 },
  searchInput:     { flex: 1, color: C.text, fontSize: 13 },
  vehicleBtn:      { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 14, marginBottom: 14, backgroundColor: C.accent + "12", borderWidth: 1.5, borderColor: C.accent + "40", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
  vehicleTxt:      { flex: 1, fontSize: 13, fontWeight: "700", color: C.accent },
  vehicleInfo:     { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: C.info + "12", borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: C.info + "30" },
  vehicleInfoTxt:  { flex: 1, fontSize: 12, color: C.textMuted, lineHeight: 18 },
  pad:             { padding: 14 },
  secTitle:        { fontSize: 12, fontWeight: "700", color: C.textDim, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 },
  grid:            { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  catCard:         { width: "47.5%", backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 14, gap: 8 },
  catIconBg:       { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  catIcon:         { fontSize: 24 },
  catName:         { fontSize: 13, fontWeight: "900", color: C.text },
  catDesc:         { fontSize: 10, color: C.textMuted, lineHeight: 14 },
  catCount:        { fontSize: 10, fontWeight: "800" },
  marketNote:      { backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 14, marginTop: 14 },
  marketNoteTitle: { fontSize: 13, fontWeight: "800", color: C.text, marginBottom: 8 },
  marketNoteTxt:   { fontSize: 12, color: C.textMuted, lineHeight: 20 },
  backBtn:         { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  backTxt:         { fontSize: 13, color: C.accent, fontWeight: "700" },
  catHeader:       { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: C.surface, borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: C.border },
  catEmoji:        { fontSize: 36 },
  catHeaderName:   { fontSize: 18, fontWeight: "900", color: C.text },
  catHeaderDesc:   { fontSize: 12, color: C.textMuted, marginTop: 2 },
  subSection:      { marginBottom: 16 },
  subTitle:        { fontSize: 12, fontWeight: "800", color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10, borderLeftWidth: 3, paddingLeft: 8 },
  searchTag:       { marginBottom: 4 },
  searchTagTxt:    { fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  empty:           { alignItems: "center", paddingVertical: 50, gap: 8 },
  emptyTxt:        { fontSize: 15, fontWeight: "800", color: C.text },
  emptySub:        { fontSize: 12, color: C.textMuted },
});

const m = StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet:     { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "80%", paddingBottom: 34 },
  handleBar: { width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  title:     { fontSize: 18, fontWeight: "900", color: C.text, marginBottom: 16 },
  label:     { fontSize: 11, fontWeight: "700", color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 },
  backRow:   { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  backTxt:   { fontSize: 13, color: C.accent, fontWeight: "700" },
  brandBtn:  { flex: 1, backgroundColor: C.surfaceAlt, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 12, alignItems: "center" },
  brandTxt:  { fontSize: 12, fontWeight: "700", color: C.text },
  modelBtn:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  modelTxt:  { fontSize: 14, fontWeight: "600", color: C.text },
  closeBtn:  { marginTop: 16, backgroundColor: C.surfaceAlt, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  closeTxt:  { fontSize: 14, fontWeight: "700", color: C.textMuted },
});