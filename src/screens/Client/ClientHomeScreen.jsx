import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, ActivityIndicator, Image,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

const RADIUS_KM = 30;

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
        <Text style={cs.cardSeller} numberOfLines={1}>
          {item.sellerName}
        </Text>
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
  const [nearbyMode, setNearbyMode] = useState(false);

  const userId = user?.uid || null;
  const favIds = userId
    ? (favDocs || []).filter((f) => f.userId === userId).map((f) => f.listingId)
    : [];

  // ── Obtenir la position GPS ──────────────────────────────────────────────
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

  // ── Calculer distance pour chaque annonce ──────────────────────────────
  const withDistance = (list) => list.map((l) => ({
    ...l,
    _distance: (userLat && userLng && l.lat && l.lng)
      ? getDistance(userLat, userLng, l.lat, l.lng)
      : null,
  }));

  const toggleFav = (item) => {
    if (!userId) { navigation.getParent()?.navigate("Login"); return; }
    if (favIds.includes(item.id)) removeFavorite(userId, item.id).catch(console.log);
    else addFavorite(userId, item).catch(console.log);
  };

  const goToDetail = (item) =>
    navigation.getParent()?.navigate("ListingDetail", { listing: item });

  const all = withDistance(listings || []);

  // ── Filtre principal ──────────────────────────────────────────────────────
  let filtered = all.filter((l) => {
    const q = search.toLowerCase();
    const matchQ   = !q || (l.title || "").toLowerCase().includes(q)
      || (l.brand || "").toLowerCase().includes(q)
      || (l.model || "").toLowerCase().includes(q);
    const matchCat = !activeCat || l.category === activeCat;
    return matchQ && matchCat;
  });

  // Mode "à proximité"
  const nearby = nearbyMode
    ? all
        .filter((l) => l._distance != null && l._distance <= RADIUS_KM)
        .sort((a, b) => a._distance - b._distance)
    : [];

  const recent   = filtered.slice(0, 6);
  const occasion = all.filter((l) => l.condition === "Occasion").slice(0, 5);
  const firstName = profile?.displayName?.split(" ")[0] || "";

  const ACTIONS = [
    { icon: "heart",         label: t("favorites"),  color: C.danger,
      onPress: () => navigation.getParent()?.navigate("Favorites") },
    { icon: "chatbubbles",   label: t("messages"), color: C.success,
      onPress: () => navigation.navigate("Messages") },
    { icon: "map",           label: "Carte",    color: C.info,
      onPress: () => navigation.navigate("Carte") },
    { icon: "notifications", label: isRTL ? "تنبيهات" : "Alertes",  color: C.warning,
      onPress: () => navigation.getParent()?.navigate("Notifications") },
  ];

  return (
    <View style={cs.container}>
      {/* ── HEADER ── */}
      <View style={[cs.header, { paddingTop: insets.top + 8 }]}>
        <View>
          <Text style={cs.greeting}>{firstName ? `${t("hello")}, ${firstName} 👋` : `${t("hello")} 👋`}</Text>
          <Text style={cs.tagline}>{isRTL ? "ابحث عن قطع غيار سيارتك" : "Trouvez vos pièces auto"}</Text>
        </View>
        <TouchableOpacity style={cs.iconBtn}
          onPress={() => navigation.getParent()?.navigate("Notifications")}>
          <Ionicons name="notifications-outline" size={20} color={C.text} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* ── SEARCH ── */}
        <View style={cs.searchRow}>
          <View style={cs.searchBar}>
            <Ionicons name="search-outline" size={18} color={C.textDim} />
            <TextInput style={cs.searchInput}
              placeholder={isRTL ? "ابحث عن قطعة، ماركة..." : "Rechercher une pièce, marque..."}
              placeholderTextColor={C.textDim}
              value={search} onChangeText={setSearch} />
            {search ? (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={18} color={C.textDim} />
              </TouchableOpacity>
            ) : null}
          </View>
          <TouchableOpacity style={cs.filterBtn} onPress={() => navigation.navigate("Catalogue")}>
            <Ionicons name="options-outline" size={20} color={C.text} />
          </TouchableOpacity>
        </View>

        {/* ── BANNIÈRE ── */}
        {!search && (
          <View style={cs.banner}>
            <View style={cs.bannerLeft}>
              <View style={cs.liveRow}>
                <View style={cs.liveDot} />
                <Text style={cs.liveTxt}>MARKETPLACE ALGÉRIE</Text>
              </View>
              <Text style={cs.bannerTitle}>
                {all.length}+ annonces{"\n"}<Text style={{ color: C.accent }}>disponibles</Text>
              </Text>
              <TouchableOpacity style={cs.bannerBtn} onPress={() => navigation.navigate("Catalogue")}>
                <Text style={cs.bannerBtnTxt}>Explorer tout</Text>
                <Ionicons name="arrow-forward" size={13} color="#000" />
              </TouchableOpacity>
            </View>
            <View style={cs.bannerRight}>
              {[["58", "Wilayas"], ["3K+", "Vendeurs"], ["4.8★", "Note"]].map(([n, l]) => (
                <View key={l} style={cs.bStat}>
                  <Text style={cs.bStatN}>{n}</Text>
                  <Text style={cs.bStatL}>{l}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── ACTIONS ── */}
        {!search && (
          <View style={cs.actRow}>
            {ACTIONS.map((a) => (
              <TouchableOpacity key={a.label} style={cs.actCard} onPress={a.onPress} activeOpacity={0.8}>
                <View style={[cs.actIcon, { backgroundColor: a.color + "22" }]}>
                  <Ionicons name={a.icon} size={22} color={a.color} />
                </View>
                <Text style={cs.actLabel}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── BOUTON "PRÈS DE MOI" ── */}
        {!search && (
          <TouchableOpacity
            onPress={nearbyMode ? () => setNearbyMode(false) : fetchLocation}
            style={[cs.nearbyBtn, nearbyMode && cs.nearbyBtnActive]}
            activeOpacity={0.85}>
            {locLoading
              ? <ActivityIndicator size="small" color={nearbyMode ? "#000" : C.accent} />
              : <Ionicons name="locate" size={16}
                  color={nearbyMode ? "#000" : C.accent} />
            }
            <Text style={[cs.nearbyTxt, nearbyMode && cs.nearbyTxtActive]}>
              {nearbyMode
                ? `📍 ${nearby.length} annonces à moins de ${RADIUS_KM} km`
                : `${isRTL ? "إعلانات قريبة مني" : "Annonces près de moi"} (${RADIUS_KM} km)`}
            </Text>
            {nearbyMode && (
              <Ionicons name="close" size={14} color="#000" />
            )}
          </TouchableOpacity>
        )}

        {/* ── CATÉGORIES ── */}
        {!search && !nearbyMode && (
          <>
            <View style={cs.secRow}>
              <Text style={cs.secTitle}>Catégories</Text>
              <TouchableOpacity onPress={() => navigation.navigate("Catalogue")}>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={cs.catsRow}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity key={cat.id}
                  onPress={() => setActiveCat(activeCat === cat.id ? null : cat.id)}
                  style={[cs.catChip, activeCat === cat.id && cs.catChipActive]}
                  activeOpacity={0.8}>
                  <View style={[cs.catLetter, activeCat === cat.id && cs.catLetterActive]}>
                    <Text style={[cs.catLetterTxt, activeCat === cat.id && { color: "#000" }]}>
                      {cat.letter}
                    </Text>
                  </View>
                  <Text style={[cs.catLabel, activeCat === cat.id && { color: C.accent }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* ── RÉSULTATS RECHERCHE ── */}
        {search ? (
          <>
            <Text style={cs.searchCount}>
              {filtered.length} résultat{filtered.length !== 1 ? "s" : ""} pour "{search}"
            </Text>
            {loading ? <Spinner /> : (
              <View style={cs.grid}>
                {filtered.map((item) => (
                  <ListingCard key={item.id} item={item}
                    isFav={favIds.includes(item.id)}
                    distance={item._distance}
                    onFav={() => toggleFav(item)}
                    onPress={() => goToDetail(item)} />
                ))}
                {filtered.length === 0 && (
                  <View style={cs.empty}>
                    <Ionicons name="search-outline" size={44} color={C.textDim} />
                    <Text style={cs.emptyTitle}>Aucun résultat</Text>
                  </View>
                )}
              </View>
            )}

          {/* ── MODE "PRÈS DE MOI" ── */}
          </>
        ) : nearbyMode ? (
          <>
            <View style={cs.secRow}>
              <Text style={cs.secTitle}>📍 À moins de {RADIUS_KM} km</Text>
              <Text style={cs.seeAll}>{nearby.length} annonces</Text>
            </View>
            {loading ? <Spinner /> : nearby.length === 0 ? (
              <View style={cs.empty}>
                <Ionicons name="map-outline" size={44} color={C.textDim} />
                <Text style={cs.emptyTitle}>Aucune annonce dans ce rayon</Text>
                <Text style={cs.emptySub}>Essayez avec un rayon plus grand</Text>
                <TouchableOpacity onPress={() => setNearbyMode(false)}
                  style={{ marginTop: 12 }}>
                  <Text style={{ color: C.accent, fontWeight: "800" }}>
                    Voir toutes les annonces
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={cs.grid}>
                {nearby.map((item) => (
                  <ListingCard key={item.id} item={item}
                    isFav={favIds.includes(item.id)}
                    distance={item._distance}
                    onFav={() => toggleFav(item)}
                    onPress={() => goToDetail(item)} />
                ))}
              </View>
            )}
          </>
        ) : (
          <>
            {/* ── ANNONCES RÉCENTES ── */}
            <View style={cs.secRow}>
              <Text style={cs.secTitle}>
                {activeCat
                  ? CATEGORIES.find((c) => c.id === activeCat)?.label
                  : t("recentListings")}
              </Text>
              <TouchableOpacity onPress={() => {
                if (activeCat) setActiveCat(null);
                else navigation.getParent()?.navigate("AllListings", { title: t("recentListings") });
              }}>
                <Text style={[cs.seeAll, activeCat && { color: C.danger }]}>
                  {activeCat ? (isRTL ? "عرض الكل" : "Tout afficher") : t("seeAll →")}
                </Text>
              </TouchableOpacity>
            </View>
            {loading ? <Spinner /> : (
              <View style={cs.grid}>
                {recent.map((item) => (
                  <ListingCard key={item.id} item={item}
                    isFav={favIds.includes(item.id)}
                    distance={item._distance}
                    onFav={() => toggleFav(item)}
                    onPress={() => goToDetail(item)} />
                ))}
              </View>
            )}

            {/* ── OCCASION ── */}
            {!activeCat && occasion.length > 0 && (
              <>
                <View style={cs.secRow}>
                  <Text style={cs.secTitle}>{isRTL ? "قطع مستعملة" : "Pièces d'occasion"}</Text>
                  <TouchableOpacity onPress={() => navigation.getParent()?.navigate("AllListings", { condition: "Occasion", title: isRTL ? "قطع مستعملة" : "Pièces d'occasion" })}>
                    <Text style={cs.seeAll}>{t("seeAll →")}</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  contentContainerStyle={cs.hRow}>
                  {occasion.map((item) => (
                    <TouchableOpacity key={item.id} style={cs.hCard}
                      onPress={() => goToDetail(item)} activeOpacity={0.88}>
                      <View style={cs.hCardImg}>
                        {item.img?.startsWith("http")
            ? <Image source={{ uri: item.img }} style={cs.hCardPhoto} resizeMode="cover" />
            : <Text style={cs.hCardLetter}>{item.img || item.title?.[0] || "P"}</Text>
          }
                      </View>
                      <View style={cs.hCardBody}>
                        <Text style={cs.hCardTitle} numberOfLines={2}>{item.title}</Text>
                        <Text style={cs.hCardPrice}>{(item.price || 0).toLocaleString()} DA</Text>
                        {item._distance != null && (
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 }}>
                            <Ionicons name="location-outline" size={9} color={C.accent} />
                            <Text style={{ fontSize: 9, color: C.accent, fontWeight: "700" }}>
                              {formatDistance(item._distance)}
                            </Text>
                          </View>
                        )}
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
    </View>
  );
}

const cs = StyleSheet.create({
  container:      { flex: 1, backgroundColor: C.bg },
  header:         { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingBottom: 10 },
  greeting:       { fontSize: 20, fontWeight: "900", color: C.text },
  tagline:        { fontSize: 12, color: C.textMuted, marginTop: 2 },
  iconBtn:        { width: 40, height: 40, borderRadius: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  searchRow:      { flexDirection: "row", gap: 10, paddingHorizontal: 14, paddingBottom: 14 },
  searchBar:      { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingHorizontal: 14, height: 48 },
  searchInput:    { flex: 1, color: C.text, fontSize: 14 },
  filterBtn:      { width: 48, height: 48, borderRadius: 14, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  banner:         { flexDirection: "row", backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 18, marginHorizontal: 14, marginBottom: 14, padding: 18, gap: 12 },
  bannerLeft:     { flex: 1, gap: 10 },
  liveRow:        { flexDirection: "row", alignItems: "center", gap: 6 },
  liveDot:        { width: 6, height: 6, borderRadius: 3, backgroundColor: C.success },
  liveTxt:        { fontSize: 9, color: C.success, fontWeight: "800", letterSpacing: 0.5 },
  bannerTitle:    { fontSize: 22, fontWeight: "900", color: C.text, lineHeight: 28 },
  bannerBtn:      { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.accent, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14, alignSelf: "flex-start" },
  bannerBtnTxt:   { fontSize: 12, fontWeight: "800", color: "#000" },
  bannerRight:    { justifyContent: "space-around" },
  bStat:          { alignItems: "center" },
  bStatN:         { fontSize: 16, fontWeight: "900", color: C.accent },
  bStatL:         { fontSize: 9, color: C.textMuted, fontWeight: "700" },
  actRow:         { flexDirection: "row", paddingHorizontal: 14, paddingBottom: 14, gap: 10 },
  actCard:        { flex: 1, alignItems: "center", gap: 6 },
  actIcon:        { width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.border },
  actLabel:       { fontSize: 9, fontWeight: "700", color: C.textMuted, textAlign: "center" },
  nearbyBtn:      { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 14, marginBottom: 14, backgroundColor: C.accent + "12", borderWidth: 1.5, borderColor: C.accent + "40", borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13 },
  nearbyBtnActive:{ backgroundColor: C.accent, borderColor: C.accent },
  nearbyTxt:      { flex: 1, fontSize: 13, fontWeight: "800", color: C.accent },
  nearbyTxtActive:{ color: "#000" },
  secRow:         { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingTop: 4, paddingBottom: 12 },
  secTitle:       { fontSize: 16, fontWeight: "900", color: C.text },
  seeAll:         { fontSize: 12, color: C.accent, fontWeight: "700" },
  catsRow:        { paddingHorizontal: 14, paddingBottom: 14, gap: 8 },
  catChip:        { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 22, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface },
  catChipActive:  { borderColor: C.accent, backgroundColor: C.accent + "10" },
  catLetter:      { width: 22, height: 22, borderRadius: 7, backgroundColor: C.accent + "25", alignItems: "center", justifyContent: "center" },
  catLetterActive:{ backgroundColor: C.accent },
  catLetterTxt:   { fontSize: 10, fontWeight: "900", color: C.accent },
  catLabel:       { fontSize: 12, fontWeight: "700", color: C.textMuted },
  searchCount:    { paddingHorizontal: 14, paddingBottom: 10, fontSize: 13, color: C.textMuted, fontWeight: "700" },
  grid:           { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 14, gap: 10 },
  card:           { width: "47.5%", backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: "hidden" },
  cardImg:        { height: 110, backgroundColor: C.surfaceAlt, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  cardPhoto:      { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  cardLetter:     { fontSize: 52, fontWeight: "900", color: C.accent },
  favBtn:         { position: "absolute", top: 8, right: 8, width: 30, height: 30, borderRadius: 15, backgroundColor: C.bg + "CC", alignItems: "center", justifyContent: "center" },
  newBadge:       { position: "absolute", top: 8, left: 8, backgroundColor: C.success, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  newTxt:         { fontSize: 8, fontWeight: "900", color: "#fff" },
  distBadge:      { position: "absolute", bottom: 8, left: 8, flexDirection: "row", alignItems: "center", gap: 2, backgroundColor: "rgba(0,0,0,0.65)", borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3 },
  distTxt:        { fontSize: 9, color: C.accent, fontWeight: "800" },
  cardBody:       { padding: 10, gap: 5 },
  cardTitle:      { fontSize: 12, fontWeight: "700", color: C.text, lineHeight: 17 },
  cardSeller:     { fontSize: 10, color: C.textDim },
  cardBottom:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  price:          { fontSize: 15, fontWeight: "900", color: C.accent },
  da:             { fontSize: 10 },
  stockBadge:     { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  stockTxt:       { fontSize: 9, fontWeight: "800" },
  hRow:           { paddingHorizontal: 14, paddingBottom: 16, gap: 12 },
  hCard:          { width: 148, backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border, overflow: "hidden" },
  hCardImg:       { height: 80, backgroundColor: C.surfaceAlt, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  hCardPhoto:     { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  hCardLetter:    { fontSize: 36, fontWeight: "900", color: C.accent },
  hCardBody:      { padding: 10, gap: 4 },
  hCardTitle:     { fontSize: 11, fontWeight: "700", color: C.text, lineHeight: 15 },
  hCardPrice:     { fontSize: 14, fontWeight: "900", color: C.accent },
  empty:          { width: "100%", alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyTitle:     { fontSize: 16, fontWeight: "800", color: C.text },
  emptySub:       { fontSize: 13, color: C.textMuted },
});