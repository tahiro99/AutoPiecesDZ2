// src/constants/partsAliases.js
// Dictionnaire de synonymes pièces auto — Marché algérien
// Français officiel + Darija (marché/casse) + Arabe
// Utilisé pour la recherche : un acheteur tape n'importe quel mot → trouve l'annonce

export const PARTS_ALIASES = [
  // ── 1. MOTEUR ──
  { fr: "Bloc moteur",          aliases: ["moteur complet","moteur","standard","المحرك","محرك","moteur"] },
  { fr: "Culasse",              aliases: ["culasse","koussa","الكلاص","كلاص","ras lmoteur"] },
  { fr: "Joint de culasse",     aliases: ["joint de culasse","el joint","joint","الجوان","جوان الكلاص"] },
  { fr: "Vilebrequin",          aliases: ["vilebrequin","vibrekan","el vibrekan","العامود","فيلبروكان"] },
  { fr: "Arbre à cames",        aliases: ["arbre a cames","arbre cames","came","الكامة"] },
  { fr: "Piston",               aliases: ["piston","pistons","البيستون","بيستون"] },
  { fr: "Segment de piston",    aliases: ["segment","segments","les segments","السقمونات"] },
  { fr: "Bielle",               aliases: ["bielle","bielles","البييال","بييال"] },
  { fr: "Coussinet",            aliases: ["coussinet","coussinets","الكوسينة","كوسينة"] },
  { fr: "Soupape",              aliases: ["soupape","soupapes","admission","echappement","السوباب","سوباب"] },
  { fr: "Guide de soupape",     aliases: ["guide","guides","guide soupape","القيدات"] },
  { fr: "Poussoir hydraulique", aliases: ["poussoir","poussoirs","pastille","pastilles","البوسوار"] },
  { fr: "Kit de distribution",  aliases: ["kit distribution","chaine","kit de chaine","distribution","courroie distribution","الشين","شين","kit chaine"] },
  { fr: "Chaîne de distribution", aliases: ["chaine de fer","chaine metallique","chaine distribution","الشين الحديد"] },
  { fr: "Courroie d'accessoires", aliases: ["courroie","courroie alternateur","courroie accessoires","السير","سير"] },
  { fr: "Galet tendeur",        aliases: ["galet","tendeur","le galet","le tendeur","الغالي","غالي"] },
  { fr: "Support moteur",       aliases: ["support moteur","silentbloc moteur","patte moteur","patte de moteur","تيكو موتور","support"] },
  { fr: "Carter d'huile",       aliases: ["carter","carter huile","الكارتي","كارتي"] },
  { fr: "Joint de cache-culbuteurs", aliases: ["joint cache culbuteur","joint tared","cache culbuteur"] },

  // ── 2. FILTRATION ──
  { fr: "Filtre à huile",       aliases: ["filtre a huile","filtre huile","filtre de l huile","فيلتر الزيت","فلتر زيت","filtre zit"] },
  { fr: "Filtre à air",         aliases: ["filtre a air","filtre air","فيلتر الهواء","فلتر هواء"] },
  { fr: "Filtre à gasoil",      aliases: ["filtre gasoil","filtre mazout","filtre a carburant","filtre diesel","فيلتر المازوت","فلتر مازوت"] },
  { fr: "Filtre à essence",     aliases: ["filtre essence","filtre a essence","فيلتر البنزين"] },
  { fr: "Filtre d'habitacle",   aliases: ["filtre climatiseur","filtre cabine","filtre antipollen","filtre clim","فيلتر الكليما"] },
  { fr: "Huile moteur",         aliases: ["huile","zit","le zit","10w40","5w40","15w40","الزيت","زيت","huile moteur"] },

  // ── 3. INJECTION ──
  { fr: "Injecteur",            aliases: ["injecteur","injecteurs","bosch","delphi","البخاخات","بخاخ","انجكتور"] },
  { fr: "Pompe à injection",    aliases: ["pompe injection","pompe haute pression","pompe a injection","طرومبة الانجكسيون","طرومبة"] },
  { fr: "Pompe de gavage",      aliases: ["pompe gavage","pompe reservoir","pompe de gavage","طرومبة الريزرفوار"] },
  { fr: "Rampe d'injection",    aliases: ["rampe","flute","la flute","common rail","الرامب"] },
  { fr: "Turbocompresseur",     aliases: ["turbo","le turbo","turbocompresseur","التوربو","توربو"] },
  { fr: "Boîtier papillon",     aliases: ["papillon","boitier papillon","le papillon","البابيون"] },
  { fr: "Intercooler",          aliases: ["intercooler","radiateur turbo","echangeur","الانتركولر"] },

  // ── 4. ÉCHAPPEMENT ──
  { fr: "Collecteur d'échappement", aliases: ["collecteur","collecteur echappement","الكولكتور"] },
  { fr: "Catalyseur",           aliases: ["catalyseur","boite fap","convertisseur","الكتاليزور","كتاليزور"] },
  { fr: "Filtre à particules",  aliases: ["fap","filtre a particule","filtre particules","الفاب"] },
  { fr: "Vanne EGR",            aliases: ["vanne egr","egr","la vanne","الفان","فان egr"] },
  { fr: "Pot d'échappement",    aliases: ["pot","silencieux","echappement","chatement","chatmoun","الشاطمون","شاطمون","pot echappement"] },

  // ── 5. EMBRAYAGE & TRANSMISSION ──
  { fr: "Kit d'embrayage",      aliases: ["embrayage","mecanisme","kit embrayage","clutch","kalatch","الامبرياج","امبرياج","disque embrayage"] },
  { fr: "Butée d'embrayage",    aliases: ["butee","butee embrayage","la butee","البوتي","بوتي"] },
  { fr: "Volant moteur",        aliases: ["volant moteur","volant bi-masse","bimasse","volant bimasse","الفولان"] },
  { fr: "Boîte de vitesses",    aliases: ["boite","boite vitesses","caseta","la boite","boite de vitesse","الكاص","كاص","boite vitesse"] },
  { fr: "Émetteur récepteur d'embrayage", aliases: ["emetteur","recepteur","pompe embrayage","pompes embrayage","emetteur recepteur"] },
  { fr: "Cardan",               aliases: ["cardan","le cardan","cardan droit","cardan gauche","الكاردان","كاردان"] },
  { fr: "Soufflet de cardan",   aliases: ["soufflet","soufflet cardan","plastique cardan","الصوفلي"] },

  // ── 6. TRAIN ROULANT / SUSPENSION ──
  { fr: "Amortisseur",          aliases: ["amortisseur","amortisseurs","الامورتيسور","امورتيسور","amorti"] },
  { fr: "Ressort de suspension", aliases: ["ressort","ressort amortisseur","ressort suspension","الروسور","روسور"] },
  { fr: "Triangle de suspension", aliases: ["triangle","bras de force","bras suspension","triangle suspension","التريانڨل","تريانقل"] },
  { fr: "Rotule de suspension", aliases: ["rotule de force","rotule suspension","rotule force","الروتيل"] },
  { fr: "Rotule de direction",  aliases: ["rotule direction","rotule de direction","روتيل ديريكسيون"] },
  { fr: "Biellette",            aliases: ["biellette","biellette suspension","biellette stabilisatrice","البيات","بيات"] },
  { fr: "Barre stabilisatrice", aliases: ["barre stabilisatrice","barre stable","stabilisateur","البار"] },
  { fr: "Silentbloc",           aliases: ["silentbloc","silonbloc","el silonbloc","السيلون بلوك","سيلون بلوك"] },
  { fr: "Crémaillère de direction", aliases: ["cremaillere","la cremaillere","cremaillere direction","الكريمايير"] },
  { fr: "Pompe de direction assistée", aliases: ["pompe direction","pompe assistee","pompe de direction","طرومبة الديريكسيون"] },
  { fr: "Roulement de roue",    aliases: ["roulement","roulement roue","الرولمان","رولمان"] },
  { fr: "Moyeu de roue",        aliases: ["moyeu","fusee roue","fusee de roue","المويو"] },
  { fr: "Berceau moteur",       aliases: ["berceau","le berceau","chassis avant","البيرصو"] },

  // ── 7. FREINAGE ──
  { fr: "Plaquettes de frein",  aliases: ["plaquettes","patins","les patins","plaquette frein","البلاكيت","بلاكيت","plaquette"] },
  { fr: "Disques de frein",     aliases: ["disques","disque frein","disques frein","الديسك","ديسك","disque"] },
  { fr: "Étrier de frein",      aliases: ["etrier","etrier frein","l etrier","الايتريي"] },
  { fr: "Mâchoires de frein",   aliases: ["machoires","ferrodo","les ferrodo","freins arriere","frein arriere","الفرودو","فرودو"] },
  { fr: "Cylindre de roue",     aliases: ["cylindre roue","cylindre frein","cylindre de roue","السيلاندر"] },
  { fr: "Mastervac / Servo-frein", aliases: ["mastervac","cerveau frein","servo frein","servofrein","الماستر فاك"] },
  { fr: "Maître-cylindre",      aliases: ["maitre cylindre","pompe frein","pompe de frein","طرومبة الفران"] },
  { fr: "Câble de frein à main", aliases: ["cable frein","frein a main","cable frein main","cable de frein","كابل الفران"] },

  // ── 8. REFROIDISSEMENT / CLIM ──
  { fr: "Radiateur moteur",     aliases: ["radiateur","radiateur moteur","الرادياتور","رادياتور","رديتور"] },
  { fr: "Vase d'expansion",     aliases: ["vase","bouteille eau","bouteille d eau","vase expansion","le vase","قارورة الماء"] },
  { fr: "Bouchon de vase",      aliases: ["bouchon radiateur","bouchon vase","bouchon bouteille","البوشون"] },
  { fr: "Pompe à eau",          aliases: ["pompe a eau","pompe eau","طرومبة الماء","طرومبة ماء"] },
  { fr: "Thermostat",           aliases: ["thermostat","calorstat","manon temperature","le calorstat","الترموستا"] },
  { fr: "Ventilateur de radiateur", aliases: ["ventilateur","ventilo","le ventilo","moto ventilateur","الفونتيلاتور","فونتيلاتور"] },
  { fr: "Durite de refroidissement", aliases: ["durite","durites","durite refroidissement","الديريت","ديريت"] },
  { fr: "Compresseur de climatisation", aliases: ["compresseur","compresseur clim","compresseur climatisation","الكمبريسور","كمبريسور"] },
  { fr: "Condenseur de climatisation", aliases: ["condenseur","radiateur clim","radiateur de clim","الكوندنسور"] },
  { fr: "Détendeur / Évaporateur", aliases: ["detendeur","evaporateur","l evaporateur","الديتاندور"] },

  // ── 9. ÉLECTRICITÉ ──
  { fr: "Alternateur",          aliases: ["alternateur","l alternateur","الالترناتور","التيرناتور","الترنتور"] },
  { fr: "Démarreur",            aliases: ["demarreur","dimareur","el dimareur","le demarreur","الديمارور","ديمارور"] },
  { fr: "Batterie",             aliases: ["batterie","la batterie","البطارية","بطارية"] },
  { fr: "Bougie d'allumage",    aliases: ["bougie","bougies","bougie essence","bougies essence","البوجيات","بوجي"] },
  { fr: "Bougie de préchauffage", aliases: ["bougie prechauffage","bougie chauffage","bougie diesel","bougies diesel","بوجي الديزل"] },
  { fr: "Bobine d'allumage",    aliases: ["bobine","faisceau allumage","la bobine","البوبين","بوبين"] },
  { fr: "Calculateur moteur",   aliases: ["calculateur","ecu","la memoire","le cerveau","calculateur moteur","الكالكولاتور","كالكولاتور"] },
  { fr: "Capteur PMH",          aliases: ["capteur pmh","pmh","capteur marche","capteur vilebrequin","capteur"] },
  { fr: "Débitmètre d'air",     aliases: ["debitmetre","le debitmetre","debitmetre air","الدبيمتر"] },
  { fr: "Sonde Lambda",         aliases: ["sonde lambda","sonde","sonde echappement","la sonde","السوند","سوند"] },
  { fr: "Manocontact de pression d'huile", aliases: ["manon huile","capteur huile","manocontact","manon d huile"] },
  { fr: "Commodo",              aliases: ["commodo","commodo volant","le commodo","commande clignotant","الكومودو"] },
  { fr: "BSI / UCH",            aliases: ["bsi","uch","boite fusibles","boite a fusibles","calculateur bsi"] },
  { fr: "Moteur de centralisation", aliases: ["centralisation","moteur fermeture","pompe centralisation","moteur centralisation"] },
  { fr: "Lève-vitre électrique", aliases: ["leve vitre","machine vitre","machine de vitre","leve vitre electrique","ماكينة الزجاج"] },

  // ── 10. OPTIQUES ──
  { fr: "Phare / Optique avant", aliases: ["phare","optique","el far","far","l optique","الضو","ضو","phare avant","feu avant"] },
  { fr: "Feu arrière",          aliases: ["feu arriere","stop arriere","el feu","feu","ضو لور","stop"] },
  { fr: "Antibrouillard",       aliases: ["antibrouillard","loupes","les loupes","anti brouillard","الانتي برويار"] },
  { fr: "Clignotant",           aliases: ["clignotant","repetiteur","le clignotant","clignotant lateral","الكلينيوتان","كلينيوتان"] },

  // ── 11. CARROSSERIE ──
  { fr: "Pare-chocs",           aliases: ["pare chocs","parshoc","el parshoc","pare choc","pare-choc","البارشوك","بارشوك"] },
  { fr: "Grille de calandre",   aliases: ["calandre","grille calandre","la calandre","الكلاندر"] },
  { fr: "Capot moteur",         aliases: ["capot","le capot","capot moteur","الكابو","كابو"] },
  { fr: "Aile",                 aliases: ["aile","aile avant","aile arriere","l aile","الجناح","الايل"] },
  { fr: "Portière",             aliases: ["porte","portiere","el bab","la porte","porte avant","porte arriere","الباب","باب"] },
  { fr: "Hayon / Malle arrière", aliases: ["malle","el mala","hayon","le hayon","porte coffre","malle arriere","المالة"] },
  { fr: "Rétroviseur extérieur", aliases: ["retro","retroviseur","le retro","retroviseur exterieur","الريتروفيزور","ريتروفيزور","مرايا"] },
  { fr: "Pare-brise",           aliases: ["pare brise","le pare brise","pare-brise","الزجاج الامامي","فيتر"] },
  { fr: "Lunette arrière",      aliases: ["lunette","vitre arriere","lunette arriere","الزجاج الخلفي"] },
  { fr: "Vitre latérale",       aliases: ["vitre","verre porte","verre de porte","vitre laterale","الزجاج","زجاج"] },
  { fr: "Passage de roue",      aliases: ["pare boue","passage roue","plastique aile","garde boue","البارا بو"] },
  { fr: "Renfort de pare-chocs", aliases: ["absorbeur","renfort","renfort pare chocs","l absorbeur"] },

  // ── 12. HABITACLE ──
  { fr: "Balai d'essuie-glace", aliases: ["essuie glace","balais","les balais","essuie-glace","balai essuie glace","الايسوي قلاص"] },
  { fr: "Commande de climatisation", aliases: ["commande clim","bloc chauffage","commande climatisation","commande de clim"] },
  { fr: "Tableau de bord",      aliases: ["compteur","tableau","tableau bord","le compteur","combine","الكونتور","كونتور"] },
  { fr: "Volant de direction",  aliases: ["volant","le volant","volant direction","الفولان","فولان"] },
  { fr: "Airbag",               aliases: ["airbag","ballon","le ballon","l airbag","الايرباڨ","ايرباق"] },
  { fr: "Ceinture de sécurité", aliases: ["ceinture","ceintures","ceinture securite","les ceintures","الحزام","حزام"] },
];

// ── Normalisation : enlève accents, minuscules, tirets ──
export function normalizeSearch(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")  // accents latins
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Étend une requête avec tous ses synonymes ──
// Ex: "phare" → ["phare", "optique", "far", "el far", "ضو", ...]
export function expandQuery(query) {
  const q = normalizeSearch(query);
  if (!q) return [];

  const terms = new Set([q]);

  for (const part of PARTS_ALIASES) {
    const allNames = [part.fr, ...part.aliases].map(normalizeSearch);
    // Si la requête correspond à un des noms/alias → ajoute tous les autres
    const matches = allNames.some(name => name.includes(q) || q.includes(name));
    if (matches) {
      allNames.forEach(name => terms.add(name));
      // Ajoute aussi les versions arabes non normalisées (pour matcher l'arabe brut)
      [part.fr, ...part.aliases].forEach(name => terms.add(name.toLowerCase()));
    }
  }

  return Array.from(terms).filter(Boolean);
}

// ── Vérifie si une annonce correspond à la requête (avec synonymes) ──
export function listingMatchesQuery(listing, query) {
  if (!query?.trim()) return true;

  const expandedTerms = expandQuery(query);
  const haystack = normalizeSearch(
    [listing.title, listing.brand, listing.model, listing.description, listing.category].join(" ")
  );
  const haystackRaw = (
    [listing.title, listing.brand, listing.model, listing.description].join(" ")
  ).toLowerCase();

  // Match si un des termes étendus est dans le titre/description
  return expandedTerms.some(term =>
    haystack.includes(term) || haystackRaw.includes(term)
  );
}