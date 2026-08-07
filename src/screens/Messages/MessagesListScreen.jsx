import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../../constants/theme";
import { useCollection } from "../../hooks/useCollection";
import { useAuthContext } from "../../context/AuthContext";
import Spinner from "../../components/Spinner";
import { useLanguage } from "../../i18n/languagecontext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../config/firebase";

export default function MessagesListScreen({ navigation }) {
const { user, profile } = useAuthContext();
  const uid = user?.uid || null;
  const [userNames, setUserNames] = useState({});

  const { data: convsRaw, loading } = useCollection("conversations", {
    filters: uid ? [["participants", "array-contains", uid]] : [],
    orderField: "lastMessageAt",
    max: 100,
    enabled: !!uid,
  });

  const myConvs = convsRaw || [];
  const total = myConvs.reduce((s, c) => s + (c.unread || 0), 0);

  // Récupère les noms des utilisateurs manquants
  useEffect(() => {
    const isVendeur = profile?.role === "vendeur";
    const missing = myConvs.filter(c => {
      const name = isVendeur ? c.buyerName : c.sellerName;
      return !name && (isVendeur ? c.buyerId : c.sellerId);
    });

    missing.forEach(async (c) => {
      const otherId = isVendeur ? c.buyerId : c.sellerId;
      if (!otherId || userNames[otherId]) return;
      try {
        const snap = await getDoc(doc(db, "users", otherId));
        if (snap.exists()) {
          setUserNames(prev => ({
            ...prev,
            [otherId]: snap.data().displayName || "Utilisateur"
          }));
        }
      } catch (e) {}
    });
  }, [myConvs, profile]);

  if (!user) {
    return (
      <View style={s.container}>
        <View style={[s.header, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <Text style={s.title}>{t("messages")}</Text>
        </View>
        <View style={s.empty}>
          <Ionicons name="chatbubbles-outline" size={50} color={C.textDim} />
          <Text style={s.emptyTitle}>{t("loginRequired")}</Text>
          <TouchableOpacity style={s.loginBtn} onPress={() => navigation.navigate("Login")}>
            <Text style={s.loginTxt}>{t("login")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={[s.header, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <Text style={s.title}>{t("messages")}</Text>
        {total > 0 ? <View style={s.badge}><Text style={s.badgeTxt}>{total}</Text></View> : null}
      </View>
      {loading ? <Spinner /> : (
        <FlatList
          data={myConvs}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isVendeur = profile?.role === "vendeur";
            const otherId   = isVendeur ? item.buyerId : item.sellerId;

            // Nom depuis Firestore conversation → fallback depuis users collection
            const otherName = isVendeur
              ? (item.buyerName || userNames[otherId] || (isRTL ? "عميل" : "Client"))
              : (item.sellerName || userNames[otherId] || (isRTL ? "بائع" : "Vendeur"));

            return (
              <TouchableOpacity
                style={[s.row, { flexDirection: isRTL ? "row-reverse" : "row" }]}
                activeOpacity={0.8}
                onPress={() => navigation.navigate("Chat", {
                  conversationId: item.id,
                  sellerName: otherName,
                  listingTitle: item.listingTitle,
                  listingPrice: item.listingPrice,
                  sellerId: item.sellerId,
                  buyerId: item.buyerId,
                })}>
                <View style={[s.avatar, item.unread > 0 && s.avatarUnread]}>
                  <Text style={s.avatarTxt}>{(otherName || "?")[0].toUpperCase()}</Text>
                </View>
                <View style={s.content}>
                  <View style={[s.topRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                    <Text style={[s.name, { textAlign: isRTL ? "right" : "left" }]}>{otherName}</Text>
                    <Text style={s.time}>
                      {item.lastMessageAt?.toDate
                        ? item.lastMessageAt.toDate().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
                        : ""}
                    </Text>
                  </View>
                  <Text style={[s.lastMsg, { textAlign: isRTL ? "right" : "left" }]} numberOfLines={1}>
                    {item.lastMessage || (isRTL ? "محادثة جديدة" : "Nouvelle conversation")}
                  </Text>
                  <Text style={[s.listing, { textAlign: isRTL ? "right" : "left" }]} numberOfLines={1}>
                    {item.listingTitle} · {(item.listingPrice || 0).toLocaleString()} DA
                  </Text>
                </View>
                {item.unread > 0
                  ? <View style={s.unreadBadge}><Text style={s.unreadTxt}>{item.unread}</Text></View>
                  : null}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="chatbubbles-outline" size={50} color={C.textDim} />
              <Text style={s.emptyTitle}>{t("noConversations")}</Text>
              <Text style={[s.emptySub, { textAlign: "center" }]}>
                {profile?.role === "vendeur"
                  ? (isRTL ? "رسائل عملائك ستظهر هنا" : "Les messages de vos clients apparaîtront ici")
                  : (isRTL ? "تواصل مع بائع من إعلان" : "Contactez un vendeur depuis une annonce")}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: C.bg },
  header:      { alignItems: "center", gap: 10, paddingHorizontal: 16, paddingBottom: 16, paddingTop: Platform.OS === "ios" ? 54 : 20, backgroundColor: C.bg, borderBottomWidth: 1, borderBottomColor: C.border },
  title:       { fontSize: 20, fontWeight: "900", color: C.text },
  badge:       { backgroundColor: C.accent, borderRadius: 10, minWidth: 22, height: 22, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  badgeTxt:    { fontSize: 11, fontWeight: "900", color: "#000" },
  row:         { gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: C.border, alignItems: "center" },
  avatar:      { width: 48, height: 48, borderRadius: 24, backgroundColor: C.accent + "20", borderWidth: 2, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  avatarUnread:{ borderColor: C.accent },
  avatarTxt:   { fontSize: 18, fontWeight: "900", color: C.accent },
  content:     { flex: 1 },
  topRow:      { justifyContent: "space-between", marginBottom: 3 },
  name:        { fontSize: 14, fontWeight: "800", color: C.text },
  time:        { fontSize: 10, color: C.textMuted },
  lastMsg:     { fontSize: 12, color: C.textMuted, marginBottom: 3 },
  listing:     { fontSize: 10, color: C.textDim },
  unreadBadge: { backgroundColor: C.accent, borderRadius: 12, minWidth: 22, height: 22, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  unreadTxt:   { fontSize: 10, fontWeight: "900", color: "#000" },
  empty:       { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyTitle:  { fontSize: 16, fontWeight: "800", color: C.text },
  emptySub:    { fontSize: 12, color: C.textMuted, paddingHorizontal: 40 },
  loginBtn:    { backgroundColor: C.accent, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
  loginTxt:    { fontSize: 14, fontWeight: "800", color: "#000" },
});