import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../../constants/theme";

import { CATEGORIES } from "../../constants/categories";
import { useCollection } from "../../hooks/useCollection";
import { useAuthContext } from "../../context/AuthContext";
import { addFavorite, removeFavorite } from "../../services/db.service";
import { navigate as globalNavigate } from "../../navigation/navigationRef";
import Spinner from "../../components/Spinner";
import Tag from "../../components/Tag";
import { useLanguage } from "../../i18n/languagecontext";
import { collection, getCountFromServer, query, where } from "firebase/firestore";
import { db } from "../../config/firebase";
function ListingCard({ listing, onPress, onFav, isFav, isRTL }) {
  const hasPhoto = listing.img?.startsWith("http");
  return (
    <TouchableOpacity onPress={onPress} style={s.card} activeOpacity={0.88}>
      <View style={s.cardImg}>
        {hasPhoto
          ? <Image source={{ uri: listing.img.trim() }} style={s.cardPhoto} resizeMode="cover" />
          : <Text style={s.cardLetter}>{listing.img || listing.title?.[0]?.toUpperCase() || "P"}</Text>
        }
        <TouchableOpacity onPress={onFav} style={s.favBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name={isFav ? "heart" : "heart-outline"} size={18} color={isFav ? C.danger : C.textMuted} />
        </TouchableOpacity>
      </View>
      <View style={s.cardBody}>
        <Text style={[s.cardTitle, { textAlign: isRTL ? "right" : "left" }]} numberOfLines={2}>{listing.title}</Text>
        <View style={s.tagsRow}>
          <Tag color={listing.condition === "Neuf" ? C.success : C.info}>{listing.condition || "N/A"}</Tag>
          <Tag color={C.textMuted}>{listing.wilaya || ""}</Tag>
        </View>
        <View style={[s.cardBottom, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <Text style={s.price}>{(listing.price || 0).toLocaleString()} <Text style={s.da}>DA</Text></Text>
        </View>
        <View style={[s.cardFooter, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <Text style={s.sellerTxt} numberOfLines={1}>{listing.sellerName}</Text>
          <Text style={[s.stockTxt, { color: (listing.stock || 0) <= 3 ? C.danger : C.success }]}>
            {listing.stock || 0} dispo
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen({ navigation }) {
  const { t, isRTL } = useLanguage();
  const { user, profile } = useAuthContext();
  const { data: listings, loading } = useCollection("listings");
  const { data: favDocs }           = useCollection("favorites");
  const [cat, setCat]               = useState(null);
  const [realStats, setRealStats] = useState({ listings: 0, vendeurs: 0 });

useEffect(() => {
  const loadStats = async () => {
    try {
      const listingsSnap = await getCountFromServer(collection(db, "listings"));
      const vendeursSnap = await getCountFromServer(
        query(collection(db, "users"), where("role", "==", "vendeur"))
      );
      setRealStats({
        listings: listingsSnap.data().count,
        vendeurs: vendeursSnap.data().count,
      });
    } catch (e) {
      // Silent fail
    }
  };
  loadStats();
}, []);

  const userId = user?.uid || null;
  const favIds = userId ? (favDocs || []).filter((f) => f.userId === userId).map((f) => f.listingId) : [];
  const filtered = (listings || [])
    .filter((l) => l.sellerId === userId)
    .filter((l) => !cat || l.category === cat)
    .slice(0, 10);

  const toggleFav = (listing) => {
    if (!userId) { navigation.navigate("Login"); return; }
    if (favIds.includes(listing.id)) removeFavorite(userId, listing.id).catch(console.log);
    else addFavorite(userId, listing).catch(console.log);
  };

  const align = isRTL ? "right" : "left";
  const row   = isRTL ? "row-reverse" : "row";

  return (
    <View style={s.container}>
      <View style={[s.header, { flexDirection: row }]}>
        <Text style={s.logo}>Auto<Text style={{ color: C.accent }}>Pieces</Text> <Text style={s.logoDZ}>DZ</Text></Text>
        <View style={[s.headerRight, { flexDirection: row }]}>
          <TouchableOpacity style={s.iconBtn} onPress={() => globalNavigate("Notifications")}>
            <Ionicons name="notifications-outline" size={20} color={C.text} />
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn} onPress={() => globalNavigate("Cart")}>
            <Ionicons name="bag-outline" size={20} color={C.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.hero}>
          <View style={[s.liveRow, { flexDirection: row }]}>
            <View style={s.liveDot} />
            <Text style={s.liveTxt}>{t("onlineFirebase")}</Text>
          </View>
          <Text style={[s.heroTitle, { textAlign: align }]}>
            {isRTL ? "قطع غيار\n" : "Pièces Auto\n"}
            <Text style={{ color: C.accent }}>{isRTL ? "في كل الجزائر" : "toute l'Algérie"}</Text>
          </Text>
          <Text style={[s.heroSub, { textAlign: align }]}>{t("fastDelivery")}</Text>
          <View style={[s.statsRow, { flexDirection: row }]}>
       {[
  [realStats.listings.toLocaleString(), isRTL ? "إعلان" : "ANNONCES"],
  [realStats.vendeurs.toLocaleString(), isRTL ? "بائع" : "VENDEURS"],
  ["69",  isRTL ? "ولاية" : "WILAYAS"],
  ["4.8", isRTL ? "التقييم" : "NOTE MOY."],
].map(([n, l]) => (
              <View key={l} style={s.statCard}>
                <Text style={s.statN}>{n}</Text>
                <Text style={s.statL}>{l}</Text>
              </View>
            ))}
          </View>
        </View>

        {profile ? (
          <View style={[s.greetingRow, { flexDirection: row }]}>
            <Text style={[s.greetingTxt, { textAlign: align }]}>
              {t("hello")}, <Text style={{ color: C.accent, fontWeight: "800" }}>{profile.displayName?.split(" ")[0]}</Text> 👋
            </Text>
            {profile.role === "vendeur" ? (
              <View style={[s.roleBadge, { flexDirection: row }]}>
                <Ionicons name="storefront-outline" size={11} color={C.accent} />
                <Text style={s.roleTxt}>{t("vendeur")}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={[s.actionsRow, { flexDirection: row }]}>
          <TouchableOpacity style={[s.actPrimary, { flexDirection: row }]}
            onPress={() => user ? navigation.getParent()?.navigate("CreateListing") : navigation.navigate("Login")}
            activeOpacity={0.85}>
            <View style={s.actIconWrap}><Ionicons name="add" size={22} color="#000" /></View>
            <View>
              <Text style={[s.actTitle, { textAlign: align }]}>{t("sell")}</Text>
              <Text style={[s.actSub, { textAlign: align }]}>{t("publishListing")}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actSecondary, { flexDirection: row }]}
            onPress={() => user ? navigation.getParent()?.navigate("SellerDashboard") : navigation.navigate("Login")}
            activeOpacity={0.85}>
            <View style={s.actIconWrap2}><Ionicons name="stats-chart-outline" size={20} color={C.accent} /></View>
            <View>
              <Text style={[s.actTitle, { textAlign: align }]}>{t("dashboard")}</Text>
              <Text style={[s.actSub, { textAlign: align }]}>{isRTL ? "فضاء البائع" : "Espace vendeur"}</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={[s.secRow, { flexDirection: row }]}>
          <Text style={s.secTitle}>{t("categories")}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.catScroll}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity key={c.id} onPress={() => setCat(cat === c.id ? null : c.id)}
              style={[s.catChip, cat === c.id && s.catChipActive]} activeOpacity={0.8}>
              <View style={[s.catLetter, cat === c.id && s.catLetterActive]}>
                <Text style={[s.catLetterTxt, cat === c.id && { color: "#000" }]}>{c.letter}</Text>
              </View>
              <Text style={[s.catLabel, cat === c.id && { color: C.accent }]}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={[s.secRow, { flexDirection: row }]}>
          <Text style={s.secTitle}>{t("myListings")}</Text>
          <TouchableOpacity onPress={() => navigation.getParent()?.navigate("AllListings", { sellerId: userId, title: t("myListings") })}>
            <Text style={s.seeAll}>{t("seeAll")}</Text>
          </TouchableOpacity>
        </View>
        {loading ? <Spinner /> : (
          <View style={s.grid}>
            {filtered.map((l) => (
              <ListingCard key={l.id} listing={l} isRTL={isRTL}
                isFav={favIds.includes(l.id)}
                onFav={() => toggleFav(l)}
                onPress={() => globalNavigate("ListingDetail", { listing: l })} />
            ))}
            {filtered.length === 0 && (
              <View style={s.noData}>
                <Ionicons name="cube-outline" size={40} color={C.textDim} />
                <Text style={{ color: C.textMuted, marginTop: 10, fontSize: 13 }}>{t("noListings")}</Text>
              </View>
            )}
          </View>
        )}
        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: C.bg },
  header:       { justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14, paddingTop: Platform.OS === "ios" ? 54 : 20, backgroundColor: C.bg, borderBottomWidth: 1, borderBottomColor: C.border },
  logo:         { fontSize: 22, fontWeight: "900", color: C.text },
  logoDZ:       { fontSize: 12, color: C.textMuted, fontWeight: "600" },
  headerRight:  { gap: 8 },
  iconBtn:      { width: 40, height: 40, borderRadius: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  hero:         { backgroundColor: C.surface, margin: 12, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: C.border },
  liveRow:      { alignItems: "center", gap: 6, marginBottom: 10 },
  liveDot:      { width: 7, height: 7, borderRadius: 4, backgroundColor: C.success },
  liveTxt:      { fontSize: 10, color: C.success, fontWeight: "800", letterSpacing: 0.5 },
  heroTitle:    { fontSize: 28, fontWeight: "900", color: C.text, lineHeight: 36, marginBottom: 6 },
  heroSub:      { fontSize: 12, color: C.textMuted, marginBottom: 16 },
  statsRow:     { gap: 8 },
  statCard:     { flex: 1, backgroundColor: C.surfaceAlt, borderRadius: 10, padding: 10, alignItems: "center", borderWidth: 1, borderColor: C.border },
  statN:        { fontSize: 16, fontWeight: "900", color: C.accent },
  statL:        { fontSize: 7, color: C.textMuted, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.3, marginTop: 2, textAlign: "center" },
  greetingRow:  { alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10 },
  greetingTxt:  { fontSize: 15, color: C.textMuted, fontWeight: "600" },
  roleBadge:    { alignItems: "center", gap: 4, backgroundColor: C.accent + "15", borderWidth: 1, borderColor: C.accent + "30", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  roleTxt:      { fontSize: 9, color: C.accent, fontWeight: "800", letterSpacing: 0.5 },
  actionsRow:   { gap: 10, paddingHorizontal: 12, marginBottom: 4 },
  actPrimary:   { flex: 1, alignItems: "center", gap: 12, backgroundColor: C.accent, borderRadius: 14, padding: 16 },
  actSecondary: { flex: 1, alignItems: "center", gap: 12, backgroundColor: C.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.border },
  actIconWrap:  { width: 36, height: 36, borderRadius: 10, backgroundColor: "#00000030", alignItems: "center", justifyContent: "center" },
  actIconWrap2: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.accent + "15", alignItems: "center", justifyContent: "center" },
  actTitle:     { fontSize: 14, fontWeight: "800", color: C.text },
  actSub:       { fontSize: 10, color: C.textMuted, marginTop: 1 },
  secRow:       { justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  secTitle:     { fontSize: 16, fontWeight: "800", color: C.text },
  seeAll:       { fontSize: 13, color: C.accent, fontWeight: "700" },
  catScroll:    { paddingHorizontal: 12, paddingBottom: 8, gap: 8 },
  catChip:      { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface },
  catChipActive:{ borderColor: C.accent, backgroundColor: C.accent + "10" },
  catLetter:    { width: 22, height: 22, borderRadius: 6, backgroundColor: C.accent + "20", alignItems: "center", justifyContent: "center" },
  catLetterActive: { backgroundColor: C.accent },
  catLetterTxt: { fontSize: 10, fontWeight: "900", color: C.accent },
  catLabel:     { fontSize: 11, fontWeight: "700", color: C.textMuted },
  grid:         { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12, gap: 10 },
  card:         { width: "47.5%", backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: "hidden" },
  cardImg:      { height: 100, backgroundColor: C.surfaceAlt, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  cardPhoto:    { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  cardLetter:   { fontSize: 52, fontWeight: "900", color: C.accent },
  favBtn:       { position: "absolute", top: 8, right: 8, width: 30, height: 30, borderRadius: 15, backgroundColor: C.bg + "CC", alignItems: "center", justifyContent: "center" },
  cardBody:     { padding: 10 },
  cardTitle:    { fontSize: 13, fontWeight: "700", color: C.text, marginBottom: 7, lineHeight: 17 },
  tagsRow:      { flexDirection: "row", flexWrap: "wrap", gap: 4, marginBottom: 8 },
  cardBottom:   { justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  price:        { fontSize: 16, fontWeight: "900", color: C.accent },
  da:           { fontSize: 11, fontWeight: "600" },
  cardFooter:   { justifyContent: "space-between"},
  sellerTxt:    { fontSize: 10, color: C.textMuted, flex: 1 },
  stockTxt:     { fontSize: 10, fontWeight: "700" },
  noData:       { width: "100%", alignItems: "center", paddingVertical: 50 },
});