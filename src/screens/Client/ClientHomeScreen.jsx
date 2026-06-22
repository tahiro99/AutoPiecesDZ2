import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, ActivityIndicator, Image, Modal, KeyboardAvoidingView, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ExpoLocation from "expo-location";
import { C } from "../../constants/theme";
import { CATEGORIES } from "../../constants/categories";
import { useCollection } from "../../hooks/useCollection";
import { useAuthContext } from "../../context/AuthContext";
import { addFavorite, removeFavorite } from "../../services/db.service";
import { getDistance, formatDistance } from "../../util/location";
import Spinner from "../../components/Spinner";
import { useLanguage } from "../../i18n/languagecontext";
import { WILAYAS } from "../../constants/wilayas";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { listingMatchesQuery } from "../../constants/partsAliases";
import { CAR_BRANDS, CAR_MODELS } from "../../constants/carBrands";
const RADIUS_KM = 30;

// Marques + modèles importés depuis src/constants/carBrands.js (en haut)

const PRICE_RANGES = [
  { label: "Moins de 5 000 DA", min: 0, max: 5000 },
  { label: "5 000 – 20 000 DA", min: 5000, max: 20000 },
  { label: "20 000 – 50 000 DA", min: 20000, max: 50000 },
  { label: "50 000 – 100 000 DA", min: 50000, max: 100000 },
  { label: "Plus de 100 000 DA", min: 100000, max: null },
];

// ── CARD ──────────────────────────────────────────────────────────────────────
function ListingCard({ item, isFav, onFav, onPress, distance }) {
  return (
    <TouchableOpacity onPress={onPress} style={cs.card} activeOpacity={0.88}>
      <View style={cs.cardImg}>
        {item.img?.startsWith("http")
          ? <Image source={{ uri: item.img }} style={cs.cardPhoto} resizeMode="cover" />
          : <Text style={cs.cardLetter}>{item.img || item.title?.[0]?.toUpperCase() || "P"}</Text>
        }
        <TouchableOpacity onPress={onFav} style={cs.favBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name={isFav ? "heart" : "heart-outline"} size={18}
            color={isFav ? C.danger : C.textMuted} />
        </TouchableOpacity>
        {item.condition === "Neuf" && (
          <View style={cs.newBadge}><Text style={cs.newTxt}>NEUF</Text></View>
        )}
        {distance != null && (
          <View style={cs.distBadge}>
            <Ionicons name="location" size={9} color={C.accent} />
            <Text style={cs.distTxt}>{formatDistance(distance)}</Text>
          </View>
        )}
      </View>
      <View style={cs.cardBody}>
        <Text style={cs.cardTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={cs.cardSeller} numberOfLines={1}>{item.sellerName}</Text>
        <View style={cs.cardBottom}>
          <Text style={cs.price}>{(item.price || 0).toLocaleString()}<Text style={cs.da}> DA</Text></Text>
          <View style={[cs.stockBadge, { backgroundColor: (item.stock || 0) > 0 ? C.success + "20" : C.danger + "20" }]}>
            <Text style={[cs.stockTxt, { color: (item.stock || 0) > 0 ? C.success : C.danger }]}>
              {(item.stock || 0) > 0 ? `${item.stock} dispo` : "Épuisé"}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── SCREEN ────────────────────────────────────────────────────────────────────
export default function ClientHomeScreen({ navigation }) {
  const { t, isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { user, profile }           = useAuthContext();
  const { data: listings, loading } = useCollection("listings");
  const { data: favDocs }           = useCollection("favorites");

  const [search, setSearch]         = useState("");
  const [activeCat, setActiveCat]   = useState(null);
  const [userLat, setUserLat]       = useState(null);
  const [userLng, setUserLng]       = useState(null);
  const [locLoading, setLocLoading] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [nearbyMode, setNearbyMode] = useState(false);

  // ── Filtres avancés ──
  const [filterCondition, setFilterCondition] = useState(null);
  const [filterWilaya, setFilterWilaya]       = useState(null);
  const [filterBrand, setFilterBrand]         = useState(null);
  const [filterModel, setFilterModel]         = useState(null);
  const [filterPriceRange, setFilterPriceRange] = useState(null);
  const [filterPriceMin, setFilterPriceMin]   = useState("");
  const [filterPriceMax, setFilterPriceMax]   = useState("");
  const [filterCategory, setFilterCategory]   = useState(null);
  // ── Filtres avancés (boîte, carburant, année, kilométrage) ──
  const [filterGearbox, setFilterGearbox]     = useState(null); // "Manuelle" | "Automatique"
  const [filterFuel, setFilterFuel]           = useState(null); // "Essence" | "Diesel" | "Hybride" | "Électrique" | "GPL"
  const [filterYearFrom, setFilterYearFrom]   = useState("");
  const [filterYearTo, setFilterYearTo]       = useState("");

  const activeFiltersCount = [
    filterCondition, filterWilaya, filterBrand, filterModel,
    filterPriceRange || (filterPriceMin || filterPriceMax),
    filterCategory,
    filterGearbox, filterFuel,
    (filterYearFrom || filterYearTo) ? "year" : null,
  ].filter(Boolean).length;

  const userId = user?.uid || null;
  const favIds = userId
    ? (favDocs || []).filter((f) => f.userId === userId).map((f) => f.listingId)
    : [];

  const fetchLocation = async () => {
    setLocLoading(true);
    try {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== "granted") { setLocLoading(false); return; }
      const loc = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.Balanced });
      setUserLat(loc.coords.latitude);
      setUserLng(loc.coords.longitude);
      setNearbyMode(true);
    } catch (_) {}
    setLocLoading(false);
  };

  const withDistance = (list) => list.map((l) => ({
    ...l,
    _distance: (userLat && userLng && l.lat && l.lng)
      ? getDistance(userLat, userLng, l.lat, l.lng) : null,
  }));

  const toggleFav = (item) => {
    if (!userId) { navigation.getParent()?.navigate("Login"); return; }
    if (favIds.includes(item.id)) removeFavorite(userId, item.id).catch(console.log);
    else addFavorite(userId, item).catch(console.log);
  };

  const goToDetail = (item) =>
    navigation.getParent()?.navigate("ListingDetail", { listing: item });

  const all = withDistance(listings || []);

  let filtered = all.filter((l) => {
    const matchQ   = listingMatchesQuery(l, search);   // FR + darija + arabe
    const matchCat = !activeCat || l.category === activeCat;
    return matchQ && matchCat;
  });

  const nearby = nearbyMode
    ? all.filter((l) => l._distance != null && l._distance <= RADIUS_KM).sort((a, b) => a._distance - b._distance)
    : [];

  const recent   = filtered.slice(0, 6);
  const occasion = all.filter((l) => l.condition === "Occasion").slice(0, 5);
  const firstName = profile?.displayName?.split(" ")[0] || "";

  const handleApplyFilter = () => {
    setShowFilter(false);
    const params = {
      title: isRTL ? "نتائج البحث" : "Résultats filtrés",
      condition: filterCondition || undefined,
      wilaya: filterWilaya || undefined,
      carModel: filterModel || filterBrand || undefined,
      category: filterCategory || undefined,
      priceMin: filterPriceRange ? filterPriceRange.min : (filterPriceMin ? parseInt(filterPriceMin) : undefined),
      priceMax: filterPriceRange ? filterPriceRange.max : (filterPriceMax ? parseInt(filterPriceMax) : undefined),
      // Filtres avancés
      gearbox: filterGearbox || undefined,
      fuel: filterFuel || undefined,
      yearFrom: filterYearFrom ? parseInt(filterYearFrom) : undefined,
      yearTo: filterYearTo ? parseInt(filterYearTo) : undefined,
    };
    navigation.navigate("AllListings", params);
  };

  const handleResetFilters = () => {
    setFilterCondition(null);
    setFilterWilaya(null);
    setFilterBrand(null);
    setFilterModel(null);
    setFilterPriceRange(null);
    setFilterPriceMin("");
    setFilterPriceMax("");
    setFilterCategory(null);
    setFilterGearbox(null);
    setFilterFuel(null);
    setFilterYearFrom("");
    setFilterYearTo("");
  };

  const ACTIONS = [
    { icon: "heart",         label: t("favorites"),  color: C.danger,   onPress: () => navigation.getParent()?.navigate("Favorites") },
    { icon: "chatbubbles",   label: t("messages"),   color: C.success,  onPress: () => navigation.navigate("Messages") },
    { icon: "notifications", label: isRTL ? "تنبيهات" : "Alertes", color: C.warning, onPress: () => navigation.getParent()?.navigate("Notifications") },
  ];

  return (
    <View style={cs.container}>
      <View style={[cs.header, { paddingTop: insets.top + 8 }]}>
        <View>
          <Text style={cs.greeting}>{firstName ? `${t("hello")}, ${firstName} 👋` : `${t("hello")} 👋`}</Text>
          <Text style={cs.tagline}>{isRTL ? "ابحث عن قطع غيار سيارتك" : "Trouvez vos pièces auto"}</Text>
        </View>
        <TouchableOpacity style={cs.iconBtn} onPress={() => navigation.getParent()?.navigate("Notifications")}>
          <Ionicons name="notifications-outline" size={20} color={C.text} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={cs.searchRow}>
          <View style={cs.searchBar}>
            <Ionicons name="search-outline" size={18} color={C.textDim} />
            <TextInput style={cs.searchInput}
              placeholder={isRTL ? "ابحث عن قطعة، ماركة..." : "Rechercher une pièce, marque..."}
              placeholderTextColor={C.textDim}
              value={search} onChangeText={setSearch} />
            {search ? <TouchableOpacity onPress={() => setSearch("")}><Ionicons name="close-circle" size={18} color={C.textDim} /></TouchableOpacity> : null}
          </View>
          <TouchableOpacity style={[cs.filterBtn, activeFiltersCount > 0 && cs.filterBtnActive]} onPress={() => setShowFilter(true)}>
            <Ionicons name="options-outline" size={20} color={activeFiltersCount > 0 ? "#000" : C.text} />
            {activeFiltersCount > 0 && (
              <View style={cs.filterBadge}><Text style={cs.filterBadgeTxt}>{activeFiltersCount}</Text></View>
            )}
          </TouchableOpacity>
        </View>

        {!search && (
          <View style={cs.banner}>
            <View style={cs.bannerLeft}>
              <View style={cs.liveRow}><View style={cs.liveDot} /><Text style={cs.liveTxt}>MARKETPLACE ALGÉRIE</Text></View>
              <Text style={cs.bannerTitle}>{all.length}+ annonces{"\n"}<Text style={{ color: C.accent }}>disponibles</Text></Text>
              <TouchableOpacity style={cs.bannerBtn} onPress={() => navigation.navigate("Catalogue")}>
                <Text style={cs.bannerBtnTxt}>Explorer tout</Text>
                <Ionicons name="arrow-forward" size={13} color="#000" />
              </TouchableOpacity>
            </View>
            <View style={cs.bannerRight}>
              {[["58", "Wilayas"], ["3K+", "Vendeurs"], ["4.8★", "Note"]].map(([n, l]) => (
                <View key={l} style={cs.bStat}><Text style={cs.bStatN}>{n}</Text><Text style={cs.bStatL}>{l}</Text></View>
              ))}
            </View>
          </View>
        )}

        {!search && (
          <View style={cs.actRow}>
            {ACTIONS.map((a) => (
              <TouchableOpacity key={a.label} style={cs.actCard} onPress={a.onPress} activeOpacity={0.8}>
                <View style={[cs.actIcon, { backgroundColor: a.color + "22" }]}><Ionicons name={a.icon} size={22} color={a.color} /></View>
                <Text style={cs.actLabel}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {!search && (
          <TouchableOpacity onPress={nearbyMode ? () => setNearbyMode(false) : fetchLocation}
            style={[cs.nearbyBtn, nearbyMode && cs.nearbyBtnActive]} activeOpacity={0.85}>
            {locLoading ? <ActivityIndicator size="small" color={nearbyMode ? "#000" : C.accent} /> : <Ionicons name="locate" size={16} color={nearbyMode ? "#000" : C.accent} />}
            <Text style={[cs.nearbyTxt, nearbyMode && cs.nearbyTxtActive]}>
              {nearbyMode ? `📍 ${nearby.length} annonces à moins de ${RADIUS_KM} km` : `${isRTL ? "إعلانات قريبة مني" : "Annonces près de moi"} (${RADIUS_KM} km)`}
            </Text>
            {nearbyMode && <Ionicons name="close" size={14} color="#000" />}
          </TouchableOpacity>
        )}

        {!search && !nearbyMode && (
          <>
            <View style={cs.secRow}>
              <Text style={cs.secTitle}>Catégories</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={cs.catsRow}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity key={cat.id} onPress={() => setActiveCat(activeCat === cat.id ? null : cat.id)}
                  style={[cs.catChip, activeCat === cat.id && cs.catChipActive]} activeOpacity={0.8}>
                  <View style={[cs.catLetter, activeCat === cat.id && cs.catLetterActive]}>
                    <Text style={[cs.catLetterTxt, activeCat === cat.id && { color: "#000" }]}>{cat.letter}</Text>
                  </View>
                  <Text style={[cs.catLabel, activeCat === cat.id && { color: C.accent }]}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {search ? (
          <>
            <Text style={cs.searchCount}>{filtered.length} résultat{filtered.length !== 1 ? "s" : ""} pour "{search}"</Text>
            {loading ? <Spinner /> : (
              <View style={cs.grid}>
                {filtered.map((item) => (
                  <ListingCard key={item.id} item={item} isFav={favIds.includes(item.id)} distance={item._distance} onFav={() => toggleFav(item)} onPress={() => goToDetail(item)} />
                ))}
                {filtered.length === 0 && <View style={cs.empty}><Ionicons name="search-outline" size={44} color={C.textDim} /><Text style={cs.emptyTitle}>Aucun résultat</Text></View>}
              </View>
            )}
          </>
        ) : nearbyMode ? (
          <>
            <View style={cs.secRow}><Text style={cs.secTitle}>📍 À moins de {RADIUS_KM} km</Text><Text style={cs.seeAll}>{nearby.length} annonces</Text></View>
            {loading ? <Spinner /> : nearby.length === 0 ? (
              <View style={cs.empty}>
                <Ionicons name="map-outline" size={44} color={C.textDim} />
                <Text style={cs.emptyTitle}>Aucune annonce dans ce rayon</Text>
                <TouchableOpacity onPress={() => setNearbyMode(false)} style={{ marginTop: 12 }}>
                  <Text style={{ color: C.accent, fontWeight: "800" }}>Voir toutes les annonces</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={cs.grid}>
                {nearby.map((item) => <ListingCard key={item.id} item={item} isFav={favIds.includes(item.id)} distance={item._distance} onFav={() => toggleFav(item)} onPress={() => goToDetail(item)} />)}
              </View>
            )}
          </>
        ) : (
          <>
            <View style={cs.secRow}>
              <Text style={cs.secTitle}>{activeCat ? CATEGORIES.find((c) => c.id === activeCat)?.label : t("recentListings")}</Text>
              <TouchableOpacity onPress={() => { if (activeCat) setActiveCat(null); else navigation.getParent()?.navigate("AllListings", { title: t("recentListings") }); }}>
                <Text style={[cs.seeAll, activeCat && { color: C.danger }]}>{activeCat ? (isRTL ? "عرض الكل" : "Tout afficher") : t("Tout afficher →")}</Text>
              </TouchableOpacity>
            </View>
            {loading ? <Spinner /> : (
              <View style={cs.grid}>
                {recent.map((item) => <ListingCard key={item.id} item={item} isFav={favIds.includes(item.id)} distance={item._distance} onFav={() => toggleFav(item)} onPress={() => goToDetail(item)} />)}
              </View>
            )}
            {!activeCat && occasion.length > 0 && (
              <>
                <View style={cs.secRow}>
                  <Text style={cs.secTitle}>{isRTL ? "قطع مستعملة" : "Pièces d'occasion"}</Text>
                  <TouchableOpacity onPress={() => navigation.getParent()?.navigate("AllListings", { condition: "Occasion", title: isRTL ? "قطع مستعملة" : "Pièces d'occasion" })}>
                    <Text style={cs.seeAll}>{t("Tout afficher →")}</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={cs.hRow}>
                  {occasion.map((item) => (
                    <TouchableOpacity key={item.id} style={cs.hCard} onPress={() => goToDetail(item)} activeOpacity={0.88}>
                      <View style={cs.hCardImg}>
                        {item.img?.startsWith("http") ? <Image source={{ uri: item.img }} style={cs.hCardPhoto} resizeMode="cover" /> : <Text style={cs.hCardLetter}>{item.img || item.title?.[0] || "P"}</Text>}
                      </View>
                      <View style={cs.hCardBody}>
                        <Text style={cs.hCardTitle} numberOfLines={2}>{item.title}</Text>
                        <Text style={cs.hCardPrice}>{(item.price || 0).toLocaleString()} DA</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}
          </>
        )}
        <View style={{ height: 32 }} />
      </ScrollView>

      <FilterModal
        visible={showFilter}
        onClose={() => setShowFilter(false)}
        onApply={handleApplyFilter}
        onReset={handleResetFilters}
        filterCondition={filterCondition}   setFilterCondition={setFilterCondition}
        filterWilaya={filterWilaya}         setFilterWilaya={setFilterWilaya}
        filterBrand={filterBrand}           setFilterBrand={setFilterBrand}
        filterModel={filterModel}           setFilterModel={setFilterModel}
        filterPriceRange={filterPriceRange} setFilterPriceRange={setFilterPriceRange}
        filterPriceMin={filterPriceMin}     setFilterPriceMin={setFilterPriceMin}
        filterPriceMax={filterPriceMax}     setFilterPriceMax={setFilterPriceMax}
        filterCategory={filterCategory}     setFilterCategory={setFilterCategory}
        filterGearbox={filterGearbox}       setFilterGearbox={setFilterGearbox}
        filterFuel={filterFuel}             setFilterFuel={setFilterFuel}
        filterYearFrom={filterYearFrom}     setFilterYearFrom={setFilterYearFrom}
        filterYearTo={filterYearTo}         setFilterYearTo={setFilterYearTo}
        isRTL={isRTL}
      />
    </View>
  );
}

const cs = StyleSheet.create({
  container:       { flex: 1, backgroundColor: C.bg },
  header:          { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingBottom: 10 },
  greeting:        { fontSize: 20, fontWeight: "900", color: C.text },
  tagline:         { fontSize: 12, color: C.textMuted, marginTop: 2 },
  iconBtn:         { width: 40, height: 40, borderRadius: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  searchRow:       { flexDirection: "row", gap: 10, paddingHorizontal: 14, paddingBottom: 14 },
  searchBar:       { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingHorizontal: 14, height: 48 },
  searchInput:     { flex: 1, color: C.text, fontSize: 14 },
  filterBtn:       { width: 48, height: 48, borderRadius: 14, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  filterBtnActive: { backgroundColor: C.accent, borderColor: C.accent },
  filterBadge:     { position: "absolute", top: 6, right: 6, width: 16, height: 16, borderRadius: 8, backgroundColor: C.danger, alignItems: "center", justifyContent: "center" },
  filterBadgeTxt:  { fontSize: 9, fontWeight: "900", color: "#fff" },
  banner:          { flexDirection: "row", backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 18, marginHorizontal: 14, marginBottom: 14, padding: 18, gap: 12 },
  bannerLeft:      { flex: 1, gap: 10 },
  liveRow:         { flexDirection: "row", alignItems: "center", gap: 6 },
  liveDot:         { width: 6, height: 6, borderRadius: 3, backgroundColor: C.success },
  liveTxt:         { fontSize: 9, color: C.success, fontWeight: "800", letterSpacing: 0.5 },
  bannerTitle:     { fontSize: 22, fontWeight: "900", color: C.text, lineHeight: 28 },
  bannerBtn:       { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.accent, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14, alignSelf: "flex-start" },
  bannerBtnTxt:    { fontSize: 12, fontWeight: "800", color: "#000" },
  bannerRight:     { justifyContent: "space-around" },
  bStat:           { alignItems: "center" },
  bStatN:          { fontSize: 16, fontWeight: "900", color: C.accent },
  bStatL:          { fontSize: 9, color: C.textMuted, fontWeight: "700" },
  actRow:          { flexDirection: "row", paddingHorizontal: 14, paddingBottom: 14, gap: 10 },
  actCard:         { flex: 1, alignItems: "center", gap: 6 },
  actIcon:         { width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.border },
  actLabel:        { fontSize: 9, fontWeight: "700", color: C.textMuted, textAlign: "center" },
  nearbyBtn:       { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 14, marginBottom: 14, backgroundColor: C.accent + "12", borderWidth: 1.5, borderColor: C.accent + "40", borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13 },
  nearbyBtnActive: { backgroundColor: C.accent, borderColor: C.accent },
  nearbyTxt:       { flex: 1, fontSize: 13, fontWeight: "800", color: C.accent },
  nearbyTxtActive: { color: "#000" },
  secRow:          { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingTop: 4, paddingBottom: 12 },
  secTitle:        { fontSize: 16, fontWeight: "900", color: C.text },
  seeAll:          { fontSize: 12, color: C.accent, fontWeight: "700" },
  catsRow:         { paddingHorizontal: 14, paddingBottom: 14, gap: 8 },
  catChip:         { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 22, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface },
  catChipActive:   { borderColor: C.accent, backgroundColor: C.accent + "10" },
  catLetter:       { width: 22, height: 22, borderRadius: 7, backgroundColor: C.accent + "25", alignItems: "center", justifyContent: "center" },
  catLetterActive: { backgroundColor: C.accent },
  catLetterTxt:    { fontSize: 10, fontWeight: "900", color: C.accent },
  catLabel:        { fontSize: 12, fontWeight: "700", color: C.textMuted },
  searchCount:     { paddingHorizontal: 14, paddingBottom: 10, fontSize: 13, color: C.textMuted, fontWeight: "700" },
  grid:            { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 14, gap: 10 },
  card:            { width: "47.5%", backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: "hidden" },
  cardImg:         { height: 110, backgroundColor: C.surfaceAlt, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  cardPhoto:       { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  cardLetter:      { fontSize: 52, fontWeight: "900", color: C.accent },
  favBtn:          { position: "absolute", top: 8, right: 8, width: 30, height: 30, borderRadius: 15, backgroundColor: C.bg + "CC", alignItems: "center", justifyContent: "center" },
  newBadge:        { position: "absolute", top: 8, left: 8, backgroundColor: C.success, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  newTxt:          { fontSize: 8, fontWeight: "900", color: "#fff" },
  distBadge:       { position: "absolute", bottom: 8, left: 8, flexDirection: "row", alignItems: "center", gap: 2, backgroundColor: "rgba(0,0,0,0.65)", borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3 },
  distTxt:         { fontSize: 9, color: C.accent, fontWeight: "800" },
  cardBody:        { padding: 10, gap: 5 },
  cardTitle:       { fontSize: 12, fontWeight: "700", color: C.text, lineHeight: 17 },
  cardSeller:      { fontSize: 10, color: C.textDim },
  cardBottom:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  price:           { fontSize: 15, fontWeight: "900", color: C.accent },
  da:              { fontSize: 10 },
  stockBadge:      { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  stockTxt:        { fontSize: 9, fontWeight: "800" },
  hRow:            { paddingHorizontal: 14, paddingBottom: 16, gap: 12 },
  hCard:           { width: 148, backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border, overflow: "hidden" },
  hCardImg:        { height: 80, backgroundColor: C.surfaceAlt, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  hCardPhoto:      { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  hCardLetter:     { fontSize: 36, fontWeight: "900", color: C.accent },
  hCardBody:       { padding: 10, gap: 4 },
  hCardTitle:      { fontSize: 11, fontWeight: "700", color: C.text, lineHeight: 15 },
  hCardPrice:      { fontSize: 14, fontWeight: "900", color: C.accent },
  empty:           { width: "100%", alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyTitle:      { fontSize: 16, fontWeight: "800", color: C.text },
  emptySub:        { fontSize: 13, color: C.textMuted },
});

// ── FILTER MODAL ──────────────────────────────────────────────────────────────
function FilterModal({
  visible, onClose, onApply, onReset, isRTL,
  filterCondition, setFilterCondition,
  filterWilaya, setFilterWilaya,
  filterBrand, setFilterBrand,
  filterModel, setFilterModel,
  filterPriceRange, setFilterPriceRange,
  filterPriceMin, setFilterPriceMin,
  filterPriceMax, setFilterPriceMax,
  filterCategory, setFilterCategory,
  filterGearbox, setFilterGearbox,
  filterFuel, setFilterFuel,
  filterYearFrom, setFilterYearFrom,
  filterYearTo, setFilterYearTo,
}) {
  const [step, setStep] = useState("main"); // main | wilayas | brands | models
  const models = filterBrand ? (CAR_MODELS[filterBrand] || []) : [];

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView style={fm.overlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={fm.sheet}>
          <View style={fm.handle} />

          {/* ── HEADER ── */}
          <View style={fm.header}>
            {step !== "main" ? (
              <TouchableOpacity onPress={() => setStep("main")} style={fm.backBtn}>
                <Ionicons name="chevron-back" size={20} color={C.text} />
              </TouchableOpacity>
            ) : <View style={{ width: 32 }} />}
            <Text style={fm.title}>
              {step === "wilayas" ? "Choisir une wilaya" : step === "brands" ? "Marque de voiture" : step === "models" ? `Modèles ${filterBrand}` : isRTL ? "تصفية النتائج" : "Filtrer les résultats"}
            </Text>
            <TouchableOpacity onPress={onReset}>
              <Text style={{ color: C.danger, fontWeight: "700", fontSize: 12 }}>{isRTL ? "إعادة" : "Réinitialiser"}</Text>
            </TouchableOpacity>
          </View>

          {/* ── WILAYA PICKER ── */}
          {step === "wilayas" && (
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {WILAYAS.map((w) => (
                <TouchableOpacity key={w} style={[fm.listItem, filterWilaya === w && fm.listItemActive]}
                  onPress={() => { setFilterWilaya(filterWilaya === w ? null : w); setStep("main"); }}>
                  <Text style={[fm.listItemTxt, filterWilaya === w && { color: C.accent, fontWeight: "800" }]}>{w}</Text>
                  {filterWilaya === w && <Ionicons name="checkmark-circle" size={18} color={C.accent} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* ── BRAND PICKER ── */}
          {step === "brands" && (
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {CAR_BRANDS.map((b) => (
                <TouchableOpacity key={b} style={[fm.listItem, filterBrand === b && fm.listItemActive]}
                  onPress={() => { setFilterBrand(filterBrand === b ? null : b); setFilterModel(null); setStep("main"); }}>
                  <Text style={[fm.listItemTxt, filterBrand === b && { color: C.accent, fontWeight: "800" }]}>{b}</Text>
                  {filterBrand === b && <Ionicons name="checkmark-circle" size={18} color={C.accent} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* ── MODEL PICKER ── */}
          {step === "models" && (
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {models.map((m) => (
                <TouchableOpacity key={m} style={[fm.listItem, filterModel === m && fm.listItemActive]}
                  onPress={() => { setFilterModel(filterModel === m ? null : m); setStep("main"); }}>
                  <Text style={[fm.listItemTxt, filterModel === m && { color: C.accent, fontWeight: "800" }]}>{m}</Text>
                  {filterModel === m && <Ionicons name="checkmark-circle" size={18} color={C.accent} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* ── MAIN FILTERS ── */}
          {step === "main" && (
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>

              {/* ÉTAT */}
              <Text style={fm.label}>{isRTL ? "الحالة" : "État"}</Text>
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
                {["Neuf", "Occasion"].map((cond) => (
                  <TouchableOpacity key={cond}
                    style={[fm.chip, filterCondition === cond && fm.chipActive]}
                    onPress={() => setFilterCondition(filterCondition === cond ? null : cond)}>
                    <Text style={[fm.chipTxt, filterCondition === cond && { color: "#000" }]}>{cond}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* MARQUE */}
              <Text style={fm.label}>{isRTL ? "الماركة" : "Marque de voiture"}</Text>
              <TouchableOpacity style={fm.selectRow} onPress={() => setStep("brands")}>
                <Text style={[fm.selectTxt, filterBrand && { color: C.text, fontWeight: "700" }]}>
                  {filterBrand || (isRTL ? "اختر الماركة" : "Choisir une marque")}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={C.textDim} />
              </TouchableOpacity>

              {/* MODÈLE */}
              {filterBrand && (
                <>
                  <Text style={fm.label}>{isRTL ? "الموديل" : "Modèle"}</Text>
                  <TouchableOpacity style={fm.selectRow} onPress={() => setStep("models")}>
                    <Text style={[fm.selectTxt, filterModel && { color: C.text, fontWeight: "700" }]}>
                      {filterModel || (isRTL ? "اختر الموديل" : "Choisir un modèle")}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color={C.textDim} />
                  </TouchableOpacity>
                </>
              )}

              {/* WILAYA */}
              <Text style={fm.label}>{isRTL ? "الولاية" : "Wilaya"}</Text>
              <TouchableOpacity style={fm.selectRow} onPress={() => setStep("wilayas")}>
                <Text style={[fm.selectTxt, filterWilaya && { color: C.text, fontWeight: "700" }]}>
                  {filterWilaya || (isRTL ? "اختر الولاية" : "Choisir une wilaya")}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={C.textDim} />
              </TouchableOpacity>

              {/* ──────────── FILTRES AVANCÉS ──────────── */}

              {/* BOÎTE DE VITESSES */}
              <Text style={fm.label}>{isRTL ? "علبة السرعات" : "Boîte de vitesses"}</Text>
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
                {[
                  { v: "Manuelle",    fr: "⚙️ Manuelle",    ar: "⚙️ يدوية" },
                  { v: "Automatique", fr: "🤖 Automatique", ar: "🤖 أوتوماتيكي" },
                ].map((g) => (
                  <TouchableOpacity key={g.v}
                    style={[fm.chip, filterGearbox === g.v && fm.chipActive]}
                    onPress={() => setFilterGearbox(filterGearbox === g.v ? null : g.v)}>
                    <Text style={[fm.chipTxt, filterGearbox === g.v && { color: "#000" }]}>
                      {isRTL ? g.ar : g.fr}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* CARBURANT */}
              <Text style={fm.label}>{isRTL ? "الوقود" : "Carburant"}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {[
                    { v: "Essence",    fr: "⛽ Essence",      ar: "⛽ بنزين" },
                    { v: "Diesel",     fr: "🛢 Diesel",       ar: "🛢 ديزل" },
                    { v: "GPL",        fr: "🔥 GPL",          ar: "🔥 GPL" },
                    { v: "Hybride",    fr: "♻️ Hybride",      ar: "♻️ هجين" },
                    { v: "Électrique", fr: "⚡ Électrique",   ar: "⚡ كهربائي" },
                  ].map((fu) => (
                    <TouchableOpacity key={fu.v}
                      style={[fm.chip, filterFuel === fu.v && fm.chipActive]}
                      onPress={() => setFilterFuel(filterFuel === fu.v ? null : fu.v)}>
                      <Text style={[fm.chipTxt, { fontSize: 11 }, filterFuel === fu.v && { color: "#000" }]}>
                        {isRTL ? fu.ar : fu.fr}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* ANNÉE */}
              <Text style={fm.label}>{isRTL ? "سنة الصنع" : "Année du véhicule"}</Text>
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 20, alignItems: "center" }}>
                <TextInput
                  style={[fm.priceInput, { textAlign: isRTL ? "right" : "left" }]}
                  placeholder={isRTL ? "من" : "De"} placeholderTextColor={C.textDim}
                  keyboardType="number-pad" maxLength={4}
                  value={filterYearFrom} onChangeText={setFilterYearFrom} />
                <Text style={{ color: C.textDim }}>–</Text>
                <TextInput
                  style={[fm.priceInput, { textAlign: isRTL ? "right" : "left" }]}
                  placeholder={isRTL ? "إلى" : "À"} placeholderTextColor={C.textDim}
                  keyboardType="number-pad" maxLength={4}
                  value={filterYearTo} onChangeText={setFilterYearTo} />
              </View>


            

              {/* PRIX — custom */}
              <Text style={[fm.label, { marginBottom: 8 }]}>{isRTL ? "أو أدخل نطاق مخصص" : " saisir un prix personnalisé"}</Text>
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
                <TextInput style={[fm.input, { flex: 1, marginBottom: 0 }]}
                  placeholder={isRTL ? "الحد الأدنى" : "Min DA"}
                  placeholderTextColor={C.textDim}
                  value={filterPriceMin} onChangeText={(v) => { setFilterPriceMin(v); setFilterPriceRange(null); }}
                  keyboardType="numeric" />
                <TextInput style={[fm.input, { flex: 1, marginBottom: 0 }]}
                  placeholder={isRTL ? "الحد الأقصى" : "Max DA"}
                  placeholderTextColor={C.textDim}
                  value={filterPriceMax} onChangeText={(v) => { setFilterPriceMax(v); setFilterPriceRange(null); }}
                  keyboardType="numeric" />
              </View>

              <View style={{ height: 8 }} />
            </ScrollView>
          )}

          {/* ── BOUTONS ── */}
          {step === "main" && (
            <>
              <TouchableOpacity style={fm.applyBtn} onPress={onApply}>
                <Text style={fm.applyTxt}>{isRTL ? "تطبيق الفلاتر" : "Appliquer les filtres"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ alignItems: "center", padding: 14 }} onPress={onClose}>
                <Text style={{ color: C.textMuted, fontSize: 14 }}>{isRTL ? "إلغاء" : "Annuler"}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const fm = StyleSheet.create({
  overlay:       { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet:         { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  handle:        { width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  header:        { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  backBtn:       { width: 32, height: 32, borderRadius: 10, backgroundColor: C.surfaceAlt, alignItems: "center", justifyContent: "center" },
  title:         { fontSize: 16, fontWeight: "900", color: C.text },
  label:         { fontSize: 11, fontWeight: "800", color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  chip:          { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border },
  chipActive:    { backgroundColor: C.accent, borderColor: C.accent },
  chipTxt:       { fontSize: 13, fontWeight: "600", color: C.textMuted },
  selectRow:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 18 },
  selectTxt:     { fontSize: 14, color: C.textDim },
  input:         { backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: C.text, fontSize: 14, marginBottom: 20 },
  listItem:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  listItemActive:{ backgroundColor: C.accent + "08" },
  listItemTxt:   { fontSize: 14, color: C.text },
  applyBtn:      { backgroundColor: C.accent, borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  applyTxt:      { fontSize: 15, fontWeight: "900", color: "#000" },
});