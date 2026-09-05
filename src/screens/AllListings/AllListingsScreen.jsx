import React, { useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../../constants/theme";
import { useCollection } from "../../hooks/useCollection";
import { useAuthContext } from "../../context/AuthContext";
import { addFavorite, removeFavorite } from "../../services/db.service";
import ScreenHeader from "../../components/ScreenHeader";
import Tag from "../../components/Tag";
import Spinner from "../../components/Spinner";
import { useLanguage } from "../../i18n/languagecontext";
import { navigate as globalNavigate } from "../../navigation/navigationRef";
import { useFocusEffect } from "@react-navigation/native";
const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export default function AllListingsScreen({ route, navigation }) {
  const { t, isRTL } = useLanguage();
  const { user }     = useAuthContext();
   const userId = user?.uid || null;
  const { data: listings, loading } = useCollection("listings");
  const { data: favDocs, refresh: refreshFavs } = useCollection("favorites", {
    filters: userId ? [["userId", "==", userId]] : [],
    orderField: null,
    max: 300,
    enabled: !!userId,
  });
  const [search, setSearch]         = useState("");

  // Optional: filter by sellerId if passed (for vendeur "mes annonces")
  const sellerId  = route.params?.sellerId  || null;
  const condition = route.params?.condition || null;
  const wilaya    = route.params?.wilaya    || null;
  const carModel  = route.params?.carModel  || null;
  const category  = route.params?.category  || null;
  const priceMin  = route.params?.priceMin  || null;
  const priceMax  = route.params?.priceMax  || null;
  const title    = route.params?.title    || t("recentListings");

  const favIds = (favDocs || []).map((f) => f.listingId || f.id);
  const filtered = (listings || [])
    .filter((l) => !sellerId  || l.sellerId   === sellerId)
    .filter((l) => !condition || l.condition   === condition)
    .filter((l) => !wilaya    || norm(l.wilaya) === norm(wilaya))
    .filter((l) => !carModel  || l.title?.toLowerCase().includes(carModel.toLowerCase()) || (l.compatibleCars || []).some((car) => car.toLowerCase().includes(carModel.toLowerCase())))
    .filter((l) => !category  || l.category === category)
    .filter((l) => !priceMin  || (l.price || 0) >= priceMin)
    .filter((l) => !priceMax  || (l.price || 0) <= priceMax)
    .filter((l) => !search.trim() || l.title?.toLowerCase().includes(search.toLowerCase()));

   const toggleFav = async (item) => {
    if (!userId) { navigation.getParent()?.navigate("Login"); return; }
    try {
      if (favIds.includes(item.id)) await removeFavorite(userId, item.id);
      else                          await addFavorite(userId, item);
      refreshFavs?.();
    } catch (e) { console.log(e); }
  };

 
      useFocusEffect(
    React.useCallback(() => {
      refreshFavs?.();
    }, [refreshFavs])
  );
  return (
    <View style={s.container}>
      <ScreenHeader title={`${title} (${filtered.length})`} onBack={() => navigation.goBack()} />

      <View style={s.searchRow}>
        <Ionicons name="search-outline" size={16} color={C.textDim} />
        <TextInput style={[s.searchInput, { textAlign: isRTL ? "right" : "left" }]}
          placeholder={t("search")} placeholderTextColor={C.textDim}
          value={search} onChangeText={setSearch} />
        {search ? (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={16} color={C.textDim} />
          </TouchableOpacity>
        ) : null}
      </View>

      {loading ? <Spinner /> : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={s.row}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.card} activeOpacity={0.88}
              onPress={() => globalNavigate("ListingDetail", { listing: item })}>
              <View style={s.cardImg}>
                {item.img?.startsWith("http")
                  ? <Image source={{ uri: item.img.trim() }} style={s.cardPhoto} resizeMode="cover" />
                  : <Text style={s.cardLetter}>{item.img || item.title?.[0]?.toUpperCase() || "P"}</Text>
                }
                <TouchableOpacity onPress={() => toggleFav(item)} style={s.favBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name={favIds.includes(item.id) ? "heart" : "heart-outline"}
                    size={16} color={favIds.includes(item.id) ? C.danger : C.textMuted} />
                </TouchableOpacity>
                {item.condition === "Neuf" && (
                  <View style={s.newBadge}><Text style={s.newTxt}>{t("new")}</Text></View>
                )}
              </View>
              <View style={s.cardBody}>
                <Text style={[s.cardTitle, { textAlign: isRTL ? "right" : "left" }]} numberOfLines={2}>{item.title}</Text>
                <View style={s.tagsRow}>
                  <Tag color={item.condition === "Neuf" ? C.success : C.info}>{item.condition || "N/A"}</Tag>
                  <Tag color={C.textMuted}>{item.wilaya || ""}</Tag>
                </View>
                <Text style={s.price}>{(item.price || 0).toLocaleString()} <Text style={s.da}>DA</Text></Text>
                <Text style={s.seller} numberOfLines={1}>{item.sellerName}</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="cube-outline" size={44} color={C.textDim} />
              <Text style={{ color: C.textMuted, marginTop: 10, fontSize: 13 }}>{t("noListings")}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: C.bg },
  searchRow:  { flexDirection: "row", alignItems: "center", gap: 10, margin: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingHorizontal: 14, height: 44 },
  searchInput:{ flex: 1, color: C.text, fontSize: 13 },
  list:       { padding: 12 },
  row:        { gap: 10, marginBottom: 10 },
  card:       { width: "47.5%", backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: "hidden" },
  cardImg:    { height: 110, backgroundColor: C.surfaceAlt, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  cardPhoto:  { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  cardLetter: { fontSize: 48, fontWeight: "900", color: C.accent },
  favBtn:     { position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: C.bg + "CC", alignItems: "center", justifyContent: "center" },
  newBadge:   { position: "absolute", top: 8, left: 8, backgroundColor: C.success, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  newTxt:     { fontSize: 8, fontWeight: "900", color: "#fff" },
  cardBody:   { padding: 10 },
  cardTitle:  { fontSize: 12, fontWeight: "700", color: C.text, marginBottom: 6, lineHeight: 16 },
  tagsRow:    { flexDirection: "row", flexWrap: "wrap", gap: 4, marginBottom: 6 },
  price:      { fontSize: 14, fontWeight: "900", color: C.accent, marginBottom: 2 },
  da:         { fontSize: 10, fontWeight: "600" },
  seller:     { fontSize: 10, color: C.textMuted },
  empty:      { alignItems: "center", paddingVertical: 80 },
});