import React from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../../constants/theme";
import { useCollection } from "../../hooks/useCollection";
import { useAuthContext } from "../../context/AuthContext";
import { removeFavorite } from "../../services/db.service";
import ScreenHeader from "../../components/ScreenHeader";
import Tag from "../../components/Tag";
import Spinner from "../../components/Spinner";
import { useLanguage } from "../../i18n/languagecontext";

export default function FavoritesScreen({ navigation }) {
 const { user } = useAuthContext();
  const { t, isRTL } = useLanguage();
  const USER_ID = user?.uid || "";

  const { data: favDocs, loading } = useCollection("favorites", {
    filters: USER_ID ? [["userId", "==", USER_ID]] : [],
    orderField: null,
    max: 300,
    enabled: !!USER_ID,
  });

  const myFavs = favDocs || [];

  return (
    <View style={s.container}>
      <ScreenHeader title={`${t("myFavs")} (${myFavs.length})`} onBack={() => navigation.goBack()} />
      {loading ? <Spinner /> : (
        <FlatList data={myFavs} keyExtractor={(item) => item.id} numColumns={2}
          columnWrapperStyle={s.row} contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.card} activeOpacity={0.88}
              onPress={() => navigation.navigate("ListingDetail", { listing: { id: item.listingId, title: item.listingTitle, price: item.listingPrice, img: item.listingImg, sellerName: item.sellerName, wilaya: item.wilaya, condition: item.condition } })}>
              <View style={s.img}>
                {item.listingImg?.startsWith("http")
                  ? <Image source={{ uri: item.listingImg }} style={s.imgPhoto} resizeMode="cover" />
                  : <Text style={s.imgLetter}>{(item.listingTitle || "P")[0].toUpperCase()}</Text>
                }
                <TouchableOpacity onPress={() => removeFavorite(USER_ID, item.listingId).catch(console.log)} style={s.removeBtn}>
                  <Ionicons name="heart" size={18} color={C.danger} />
                </TouchableOpacity>
              </View>
              <View style={s.body}>
                <Text style={[s.title, { textAlign: isRTL ? "right" : "left" }]} numberOfLines={2}>{item.listingTitle}</Text>
                <View style={s.tags}>
                  <Tag color={item.condition === "Neuf" ? C.success : C.info}>{item.condition || "N/A"}</Tag>
                  <Tag color={C.textMuted}>{item.wilaya || ""}</Tag>
                </View>
                <Text style={[s.price, { textAlign: isRTL ? "right" : "left" }]}>{(item.listingPrice || 0).toLocaleString()} DA</Text>
                <Text style={[s.seller, { textAlign: isRTL ? "right" : "left" }]}>{item.sellerName}</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="heart-outline" size={50} color={C.textDim} />
              <Text style={s.emptyTitle}>{t("noFavs")}</Text>
              <Text style={s.emptySub}>{t("noFavsSub")}</Text>
            </View>
          } />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  list:      { padding: 12 },
  row:       { gap: 10, marginBottom: 10 },
  card:      { flex: 1, backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: "hidden" },
  img:       { height: 90, backgroundColor: C.surfaceAlt, alignItems: "center", justifyContent: "center", position: "relative" },
  imgLetter: { fontSize: 44, fontWeight: "900", color: C.accent },
  imgPhoto:  { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  removeBtn: { position: "absolute", top: 8, right: 8, width: 30, height: 30, borderRadius: 15, backgroundColor: C.bg + "CC", alignItems: "center", justifyContent: "center" },
  body:      { padding: 10 },
  title:     { fontSize: 12, fontWeight: "700", color: C.text, marginBottom: 6, lineHeight: 16 },
  tags:      { flexDirection: "row", flexWrap: "wrap", gap: 4, marginBottom: 6 },
  price:     { fontSize: 14, fontWeight: "900", color: C.accent, marginBottom: 2 },
  seller:    { fontSize: 10, color: C.textMuted },
  empty:     { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyTitle:{ fontSize: 16, fontWeight: "800", color: C.text },
  emptySub:  { fontSize: 12, color: C.textMuted, textAlign: "center", paddingHorizontal: 40 },
});