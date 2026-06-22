import React, { useEffect, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../../constants/theme";
import { useAuthContext } from "../../context/AuthContext";
import { useLanguage } from "../../i18n/languagecontext";
import { listenNotifs, markRead, markAllRead } from "../../services/Notif.service";
import ScreenHeader from "../../components/ScreenHeader";

const ICONS  = { commande: "📦", message: "💬", livraison: "🚚", annonce: "📍", rating: "⭐", abonnement: "💳", report: "🚨" };
const COLORS = { commande: C.accent, message: C.info, livraison: "#AB47BC", annonce: C.success, rating: "#F0A500", abonnement: "#22C55E", report: "#EF4444" };

function getCats(isRTL) {
  return [
    { key: "all",       label: isRTL ? "الكل"      : "Tout" },
    { key: "commande",  label: isRTL ? "الطلبات"   : "Commandes" },
    { key: "message",   label: isRTL ? "الرسائل"   : "Messages"  },
    { key: "livraison", label: isRTL ? "التوصيل"   : "Livraison" },
    { key: "annonce",   label: isRTL ? "الإعلانات" : "Annonces"  },
  ];
}

function timeAgo(date, isRTL) {
  if (!date) return "";
  const s = Math.floor((Date.now() - date) / 1000);
  if (s < 60)    return isRTL ? "الآن" : "À l'instant";
  if (s < 3600)  return isRTL ? `منذ ${Math.floor(s / 60)} د`  : `Il y a ${Math.floor(s / 60)}min`;
  if (s < 86400) return isRTL ? `منذ ${Math.floor(s / 3600)} س` : `Il y a ${Math.floor(s / 3600)}h`;
  return isRTL ? `منذ ${Math.floor(s / 86400)} ي` : `Il y a ${Math.floor(s / 86400)}j`;
}

export default function NotificationsScreen({ navigation }) {
  const { user }                    = useAuthContext();
  const { isRTL, t }                = useLanguage();
  const CATS                        = getCats(isRTL);
  const align                       = isRTL ? "right" : "left";
  const [notifs, setNotifs]         = useState([]);
  const [cat, setCat]               = useState("all");
  const [loading, setLoading]       = useState(true);

  const userId = user?.uid;

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    const unsub = listenNotifs(userId, (items) => {
      setNotifs(items);
      setLoading(false);
    });
    return unsub;
  }, [userId]);

  const filtered = cat === "all" ? notifs : notifs.filter((n) => n.type === cat);
  const unread   = notifs.filter((n) => !n.read).length;

  const handlePress = (item) => {
    if (!item.read) markRead(userId, item.id);
    if (item.data?.screen) navigation.navigate(item.data.screen, item.data);
  };

  return (
    <View style={s.container}>
      <ScreenHeader
        title={isRTL ? "الإشعارات" : "Notifications"}
        onBack={() => navigation.goBack()}
        right={
          unread > 0 ? (
            <TouchableOpacity onPress={() => markAllRead(userId)} style={s.readAllBtn}>
              <Text style={s.readAllTxt}>{isRTL ? "قراءة الكل" : "Tout lire"}</Text>
            </TouchableOpacity>
          ) : null
        }
      />

      {/* Filtres */}
      <FlatList
        horizontal data={CATS} keyExtractor={(i) => i.key}
        showsHorizontalScrollIndicator={false}
        style={{ height: 52, flexGrow: 0 }}
        contentContainerStyle={s.cats}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setCat(item.key)}
            style={[s.chip, cat === item.key && s.chipOn]}>
            <Text style={[s.chipTxt, cat === item.key && s.chipTxtOn]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {loading ? (
        <View style={s.center}><ActivityIndicator color={C.accent} size="large" /></View>
      ) : !user ? (
        <View style={s.center}>
          <Ionicons name="person-outline" size={44} color={C.textDim} />
          <Text style={s.emptyTxt}>
            {isRTL ? "سجّل دخولك لرؤية الإشعارات" : "Connectez-vous pour voir vos notifications"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          contentContainerStyle={filtered.length === 0 ? s.center : s.list}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyIcon}>🔕</Text>
              <Text style={s.emptyTxt}>{isRTL ? "لا توجد إشعارات" : "Aucune notification"}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => handlePress(item)}
              style={[s.card, !item.read && s.cardUnread]}
              activeOpacity={0.75}>
              {/* Icône */}
              <View style={[s.iconCircle, {
                backgroundColor: (COLORS[item.type] || C.accent) + "20",
              }]}>
                <Text style={s.iconTxt}>{ICONS[item.type] || "🔔"}</Text>
              </View>

              {/* Texte */}
              <View style={s.content}>
                <View style={s.row}>
                  <Text style={s.title} numberOfLines={1}>{item.title}</Text>
                  <Text style={s.time}>{timeAgo(item.createdAt, isRTL)}</Text>
                </View>
                <Text style={s.body} numberOfLines={2}>{item.body}</Text>
              </View>

              {/* Pastille non lu */}
              {!item.read && <View style={s.dot} />}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: C.bg },
  center:       { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  readAllBtn:   { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: C.accent + "15", borderRadius: 10, borderWidth: 1, borderColor: C.accent + "40" },
  readAllTxt:   { fontSize: 12, fontWeight: "700", color: C.accent },
  cats:         { paddingHorizontal: 14, paddingVertical: 6, gap: 10, alignItems: "center" },
  chip:         { paddingHorizontal: 16, height: 36, borderRadius: 18, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, marginRight: 10, alignItems: "center", justifyContent: "center" },
  chipOn:       { backgroundColor: C.accent, borderColor: C.accent },
  chipTxt:      { fontSize: 12, fontWeight: "600", color: C.textMuted },
  chipTxtOn:    { color: "#000" },
  list:         { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 40 },
  empty:        { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyIcon:    { fontSize: 48 },
  emptyTxt:     { fontSize: 14, color: C.textMuted, textAlign: "center" },
  card:         { flexDirection: "row", alignItems: "center", backgroundColor: C.surface, borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.border },
  cardUnread:   { backgroundColor: "#1E1D12", borderLeftWidth: 3, borderLeftColor: C.accent },
  iconCircle:   { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", marginRight: 12 },
  iconTxt:      { fontSize: 22 },
  content:      { flex: 1 },
  row:          { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  title:        { fontSize: 14, fontWeight: "800", color: C.text, flex: 1 },
  time:         { fontSize: 11, color: C.textDim, marginLeft: 8 },
  body:         { fontSize: 13, color: C.textMuted, lineHeight: 18 },
  dot:          { width: 9, height: 9, borderRadius: 5, backgroundColor: C.accent, marginLeft: 10 },
});