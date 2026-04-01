import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../../constants/theme";
import { useCollection } from "../../hooks/useCollection";
import { useAuthContext } from "../../context/AuthContext";
import { logout } from "../../services/auth.service";
import Btn from "../../components/Btn";
import { useLanguage } from "../../i18n/languagecontext";

export default function ProfilScreen({ navigation }) {
  const { t, isRTL, lang, toggleLang } = useLanguage();
  const { user, profile } = useAuthContext();
  const { data: favDocs }  = useCollection("favorites");
  const { data: orders }   = useCollection("orders");
  const { data: listings } = useCollection("listings");
  const { data: ratings }  = useCollection("ratings");

  const userId     = user?.uid || null;
  const myFavs     = (favDocs  || []).filter((f) => f.userId   === userId);
  const myOrders   = (orders   || []).filter((o) => o.buyerId  === userId);
  const myListings = (listings || []).filter((l) => l.sellerId === userId);
  const isVendeur  = profile?.role === "vendeur";
  const myRatings  = (ratings || []).filter((r) => r.sellerId === userId);
  const avgRating  = myRatings.length > 0
    ? (myRatings.reduce((sum, r) => sum + (r.stars || 0), 0) / myRatings.length).toFixed(1)
    : null;
  const row = isRTL ? "row-reverse" : "row";
  const align = isRTL ? "right" : "left";
  const handleLogout = () => {
    Alert.alert(
      isRTL ? "تسجيل الخروج" : "Déconnexion",
      isRTL ? "هل تريد تسجيل الخروج؟" : "Voulez-vous vous déconnecter ?",
      [
        { text: t("cancel"), style: "cancel" },
        { text: isRTL ? "خروج" : "Déconnecter", style: "destructive",
          onPress: async () => {
            await logout();
            navigation.reset({ index: 0, routes: [{ name: "Welcome" }] });
          },
        },
      ]
    );
  };

  if (!user) {
    return (
      <View style={s.noAuth}>
        <View style={s.noAuthIcon}>
          <Ionicons name="person-outline" size={40} color={C.textDim} />
        </View>
        <Text style={s.noAuthTitle}>{isRTL ? "غير متصل" : "Non connecté"}</Text>
        <Text style={[s.noAuthSub, { textAlign: "center" }]}>{t("loginToProfile")}</Text>
        <Btn onPress={() => navigation.navigate("Login")} style={{ marginTop: 20, width: 220 }}>
          {t("login")}
        </Btn>
        <Btn variant="ghost" onPress={() => navigation.navigate("Register")} style={{ marginTop: 10, width: 220 }}>
          {t("register")}
        </Btn>
      </View>
    );
  }

  const displayName = profile?.displayName || user?.displayName || user?.email?.split("@")[0] || "Utilisateur";
  const initials    = displayName.split(" ").map((w) => w[0] || "").join("").toUpperCase().slice(0, 2) || "U";

  const clientSections = [
    {
      title: t("myAccount"),
      items: [
        { label: t("myOrders"),       icon: "cube-outline",          count: myOrders.length, screen: "Orders"        },
        { label: t("myFavorites"),    icon: "heart-outline",         count: myFavs.length,   screen: "Favorites"     },
        { label: t("notifications"),  icon: "notifications-outline", count: null,            screen: "Notifications" },
      ],
    },
    {
      title: t("becomeVendeur"),
      items: [
        { label: t("switchVendeur"), icon: "storefront-outline", count: null, screen: null, accent: true },
      ],
    },
    {
      title: t("help"),
      items: [
        { label: t("helpCenter"), icon: "help-circle-outline",   count: null, screen: null },
        { label: t("terms"),      icon: "document-text-outline", count: null, screen: null },
      ],
    },
  ];

  const vendeurSections = [
    {
      title: t("mySellerSpace"),
      items: [
        { label: t("dashboard"),       icon: "stats-chart-outline", count: null,              screen: "SellerDashboard" },
        { label: t("myListingsMenu"),  icon: "megaphone-outline",   count: myListings.length, screen: "SellerDashboard" },
        { label: t("clientMessages"),  icon: "chatbubbles-outline", count: null,              screen: "Messages"        },
      ],
    },
    {
      title: t("myAccount"),
      items: [
        { label: t("myOrders"),       icon: "cube-outline",          count: myOrders.length, screen: "Orders"        },
        { label: t("myFavorites"),    icon: "heart-outline",         count: myFavs.length,   screen: "Favorites"     },
        { label: t("notifications"),  icon: "notifications-outline", count: null,            screen: "Notifications" },
      ],
    },
    {
      title: t("help"),
      items: [
        { label: t("helpCenter"), icon: "help-circle-outline",   count: null, screen: null },
        { label: t("terms"),      icon: "document-text-outline", count: null, screen: null },
      ],
    },
  ];

  const sections = isVendeur ? vendeurSections : clientSections;

  const statsData = isVendeur
    ? [
        [myListings.length, t("listings")],
        [myOrders.length, t("orders")],
        [avgRating ? `⭐ ${avgRating}` : "—", isRTL ? "التقييم" : "Note"],
      ]
    : [[myOrders.length, t("orders")], [myFavs.length, t("favorites")]];

  return (
    <View style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── HEADER PROFIL ── */}
        <View style={[s.profileHeader, { paddingTop: Platform.OS === "ios" ? 54 : 28 }]}>
          {/* Bouton langue */}
          <TouchableOpacity onPress={toggleLang} style={s.langBtn}>
            <Text style={s.langTxt}>{lang === "fr" ? "عربي" : "FR"}</Text>
          </TouchableOpacity>

          <View style={s.avatarWrap}>
            <View style={s.avatar}><Text style={s.avatarTxt}>{initials}</Text></View>
            <View style={[s.roleDot, { backgroundColor: isVendeur ? C.accent : C.info }]} />
          </View>
          <Text style={s.name}>{displayName}</Text>
          <Text style={s.meta}>{profile?.phone ? profile.phone + " · " : ""}{profile?.wilaya || "Algérie"}</Text>

          <View style={[s.roleBadge, { flexDirection: row }, isVendeur && s.roleBadgeVendeur]}>
            <Ionicons name={isVendeur ? "storefront-outline" : "person-outline"} size={12} color={isVendeur ? C.accent : C.info} />
            <Text style={[s.roleTxt, { color: isVendeur ? C.accent : C.info }]}>
              {isVendeur ? t("vendeur") : t("client")}
            </Text>
          </View>

          <View style={[s.statsRow, { flexDirection: row }]}>
            {statsData.map(([n, l]) => (
              <View key={l} style={s.stat}>
                <Text style={s.statN}>{n}</Text>
                <Text style={s.statL}>{l}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Email */}
        <View style={[s.emailRow, { flexDirection: row }]}>
          <Ionicons name="mail-outline" size={14} color={C.textMuted} />
          <Text style={[s.emailTxt, { textAlign: align }]} numberOfLines={1}>{user.email}</Text>
          <View style={[s.verifiedBadge, { flexDirection: row, backgroundColor: (user.emailVerified ? C.success : C.warning) + "15" }]}>
            <Ionicons name={user.emailVerified ? "checkmark-circle" : "time-outline"} size={12} color={user.emailVerified ? C.success : C.warning} />
            <Text style={[s.verifiedTxt, { color: user.emailVerified ? C.success : C.warning }]}>
              {user.emailVerified ? t("verified") : t("notVerified")}
            </Text>
          </View>
        </View>

        {/* ── SECTIONS ── */}
        {sections.map((section) => (
          <View key={section.title}>
            <Text style={[s.secTitle, { textAlign: align }]}>{section.title}</Text>
            <View style={s.menuBlock}>
              {section.items.map((item, i) => (
                <TouchableOpacity
                  key={item.label}
                  onPress={() => item.screen && navigation.navigate(item.screen)}
                  style={[s.menuRow, { flexDirection: row }, i < section.items.length - 1 && s.menuRowBorder]}
                  activeOpacity={0.8}>
                  <View style={[s.menuIconWrap, item.accent && { backgroundColor: C.accent + "15" }]}>
                    <Ionicons name={item.icon} size={18} color={item.accent ? C.accent : C.textMuted} />
                  </View>
                  <Text style={[s.menuLabel, { textAlign: align }, item.accent && { color: C.accent }]}>{item.label}</Text>
                  <View style={{ flexDirection: row, alignItems: "center", gap: 8 }}>
                    {item.count !== null && item.count > 0 ? (
                      <View style={s.countBadge}><Text style={s.countTxt}>{item.count}</Text></View>
                    ) : null}
                    <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={16} color={C.textDim} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <View style={s.logoutWrap}>
          <Btn variant="ghost" onPress={handleLogout}>{t("logout")}</Btn>
        </View>
        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:        { flex: 1, backgroundColor: C.bg },
  noAuth:           { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, gap: 10, backgroundColor: C.bg },
  noAuthIcon:       { width: 80, height: 80, borderRadius: 40, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  noAuthTitle:      { fontSize: 20, fontWeight: "800", color: C.text },
  noAuthSub:        { fontSize: 13, color: C.textMuted },
  profileHeader:    { backgroundColor: C.surface, paddingHorizontal: 28, paddingBottom: 28, alignItems: "center", borderBottomWidth: 1, borderBottomColor: C.border },
  langBtn:          { position: "absolute", top: 16, right: 16, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: C.accent + "15", borderRadius: 10, borderWidth: 1, borderColor: C.accent + "40" },
  langTxt:          { fontSize: 13, fontWeight: "800", color: C.accent },
  avatarWrap:       { position: "relative", marginBottom: 12 },
  avatar:           { width: 80, height: 80, borderRadius: 40, backgroundColor: C.accent + "20", borderWidth: 3, borderColor: C.accent, alignItems: "center", justifyContent: "center" },
  avatarTxt:        { fontSize: 30, fontWeight: "900", color: C.accent },
  roleDot:          { position: "absolute", bottom: 2, right: 2, width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: C.surface },
  name:             { fontSize: 22, fontWeight: "900", color: C.text, marginBottom: 4 },
  meta:             { fontSize: 12, color: C.textMuted, marginBottom: 10 },
  roleBadge:        { alignItems: "center", gap: 5, backgroundColor: C.info + "15", borderWidth: 1, borderColor: C.info + "40", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 20 },
  roleBadgeVendeur: { backgroundColor: C.accent + "15", borderColor: C.accent + "40" },
  roleTxt:          { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  statsRow:         { gap: 32 },
  stat:             { alignItems: "center" },
  statN:            { fontSize: 24, fontWeight: "900", color: C.accent },
  statL:            { fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 },
  emailRow:         { alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },
  emailTxt:         { flex: 1, fontSize: 13, color: C.textMuted },
  verifiedBadge:    { alignItems: "center", gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  verifiedTxt:      { fontSize: 10, fontWeight: "700" },
  secTitle:         { fontSize: 10, color: C.textMuted, fontWeight: "800", letterSpacing: 0.6, paddingHorizontal: 16, paddingTop: 18, paddingBottom: 8 },
  menuBlock:        { backgroundColor: C.surface, borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.border },
  menuRow:          { alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 15 },
  menuRowBorder:    { borderBottomWidth: 1, borderBottomColor: C.border },
  menuIconWrap:     { width: 36, height: 36, borderRadius: 10, backgroundColor: C.surfaceAlt, alignItems: "center", justifyContent: "center" },
  menuLabel:        { flex: 1, fontSize: 14, fontWeight: "600", color: C.text },
  countBadge:       { backgroundColor: C.accent + "20", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  countTxt:         { fontSize: 11, color: C.accent, fontWeight: "800" },
  logoutWrap:       { padding: 16, marginTop: 8 },
  themeBtn: { position: "absolute", top: 16, left: 56, width: 36, height: 36,
  backgroundColor: C.surfaceAlt, borderRadius: 10, borderWidth: 1,
  borderColor: C.border, alignItems: "center", justifyContent: "center" },
themeTxt: { fontSize: 18 },
});