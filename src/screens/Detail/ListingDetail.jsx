import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, Image, useWindowDimensions, Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../../constants/theme";
import { useAuthContext } from "../../context/AuthContext";
import ScreenHeader from "../../components/ScreenHeader";
import Tag from "../../components/Tag";
import { incrementViews, startConversation, addFavorite, removeFavorite } from "../../services/db.service";
import { useCollection } from "../../hooks/useCollection";
import { useLanguage } from "../../i18n/languagecontext";
import ReportModal from "../../components/ReportModal";

export default function ListingDetail({ route, navigation }) {
  const { t, isRTL }        = useLanguage();
  const { width }           = useWindowDimensions();
  const { listing }         = route.params;
  const { user, profile }   = useAuthContext();
  const [isFav, setIsFav]   = useState(false);
  const [contacting, setContacting] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const { data: ratings } = useCollection("ratings");
  const sellerRatings = (ratings || []).filter(r => r.sellerId === listing.sellerId);
  const avgRating = sellerRatings.length > 0
    ? (sellerRatings.reduce((s, r) => s + (r.stars || 0), 0) / sellerRatings.length).toFixed(1)
    : null;

  const uid       = user?.uid || null;
  const isOwner   = uid === listing.sellerId;
  const isVendeur = profile?.role === "vendeur";
  const align     = isRTL ? "right" : "left";
  const row       = isRTL ? "row-reverse" : "row";

  useEffect(() => { incrementViews(listing.id).catch(() => {}); }, []);

  // ── PARTAGER ──
  const handleShare = async () => {
    try {
      await Share.share({
        title: listing.title,
        message: isRTL
          ? `🔧 ${listing.title}\n💰 ${(listing.price || 0).toLocaleString()} DA\n📍 ${listing.wilaya || "Algérie"}\n\nتجدها على AutoPièces DZ 🇩🇿`
          : `🔧 ${listing.title}\n💰 ${(listing.price || 0).toLocaleString()} DA\n📍 ${listing.wilaya || "Algérie"}\n\nTrouvez-la sur AutoPièces DZ 🇩🇿\nhttps://autopiecesdz.com`,
      });
    } catch (e) {}
  };

  // ── CONTACTER ──
  const handleContact = async () => {
    if (!user) {
      Alert.alert(t("loginRequired"), t("loginToContact"), [
        { text: t("login"), onPress: () => navigation.navigate("Login") },
        { text: t("cancel"), style: "cancel" },
      ]);
      return;
    }
    setContacting(true);
    try {
      const convId = await startConversation(listing, uid, profile?.displayName || "Client");
      navigation.navigate("Chat", {
        conversationId: convId, sellerName: listing.sellerName,
        listingTitle: listing.title, listingPrice: listing.price,
        sellerId: listing.sellerId, buyerId: uid,
      });
    } catch (e) {
      Alert.alert(t("error"), t("errorContact"));
    }
    setContacting(false);
  };

  // ── ACHETER ──
  const handleBuy = () => {
    if (!user) {
      Alert.alert(t("loginRequired"), isRTL ? "سجل دخولك للشراء." : "Connectez-vous pour acheter.", [
        { text: t("login"), onPress: () => navigation.navigate("Login") },
        { text: t("cancel"), style: "cancel" },
      ]);
      return;
    }
    if ((listing.stock || 0) <= 0) {
      Alert.alert(isRTL ? "نفد المخزون" : "Rupture de stock", isRTL ? "هذه القطعة غير متوفرة." : "Cette pièce n'est plus disponible.");
      return;
    }
    navigation.navigate("Cart", { directBuy: listing });
  };

  // ── FAVORIS ──
  const toggleFav = async () => {
    if (!user) { navigation.navigate("Login"); return; }
    try {
      if (isFav) { await removeFavorite(uid, listing.id); setIsFav(false); }
      else        { await addFavorite(uid, listing);       setIsFav(true);  }
    } catch (e) {}
  };

  const hasPhotos   = listing.photos?.length > 0;
  const conditionNew = listing.condition === "Neuf" || listing.condition === "جديد";

  return (
    <View style={s.container}>
      <ScreenHeader
        title={t("listingDetail")}
        onBack={() => navigation.goBack()}
        right={
          <View style={{ flexDirection: "row", gap: 8 }}>
            {/* ── Bouton Partager ── */}
            <TouchableOpacity onPress={handleShare} style={s.iconBtn}>
              <Ionicons name="share-social-outline" size={20} color={C.text} />
            </TouchableOpacity>
            {/* ── Bouton Favori ── */}
            <TouchableOpacity onPress={toggleFav} style={s.iconBtn}>
              <Ionicons name={isFav ? "heart" : "heart-outline"} size={20} color={isFav ? C.danger : C.text} />
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── PHOTOS ── */}
        {hasPhotos ? (
          <View style={{ width, height: 260 }}>
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ width, height: 260 }}>
              {listing.photos.map((url, i) => (
                <Image key={i} source={{ uri: url?.trim() }} style={{ width, height: 260 }} resizeMode="cover" />
              ))}
            </ScrollView>
            {listing.photos.length > 1 && (
              <View style={s.photoCount}>
                <Ionicons name="images-outline" size={12} color="#fff" />
                <Text style={s.photoCountTxt}>{listing.photos.length} {t("photos")}</Text>
              </View>
            )}
            {conditionNew && <View style={s.newBadge}><Text style={s.newTxt}>{t("new")}</Text></View>}
          </View>
        ) : (
          <View style={s.imgBlock}>
            {listing.img?.startsWith("http")
              ? <Image source={{ uri: listing.img.trim() }} style={s.imgFull} resizeMode="cover" />
              : <Text style={s.imgLetter}>{listing.img || listing.title?.[0]?.toUpperCase() || "P"}</Text>
            }
            {conditionNew && <View style={s.newBadge}><Text style={s.newTxt}>{t("new")}</Text></View>}
          </View>
        )}

        <View style={s.pad}>
          {/* ── TITRE + PRIX ── */}
          <View style={[s.topRow, { flexDirection: row }]}>
            <View style={{ flex: 1, marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0 }}>
              <Text style={[s.title, { textAlign: align }]}>{listing.title}</Text>
              <View style={[s.tagsRow, { flexDirection: row }]}>
                <Tag color={conditionNew ? C.success : C.info}>{listing.condition || "N/A"}</Tag>
                <Tag color={C.textMuted}>{listing.wilaya || ""}</Tag>
                {listing.verified ? <Tag color={C.accent}>{t("verified").toUpperCase()}</Tag> : null}
              </View>
            </View>
            <View style={[s.priceBlock, { alignItems: isRTL ? "flex-start" : "flex-end" }]}>
              <Text style={s.price}>{(listing.price || 0).toLocaleString()}</Text>
              <Text style={s.priceDA}>DA</Text>
              <Text style={[s.stock, { color: (listing.stock || 0) <= 2 ? C.danger : C.success }]}>
                {(listing.stock || 0) > 0 ? `${listing.stock} ${t("inStock")}` : t("outOfStock")}
              </Text>
            </View>
          </View>

          {/* ── STATS ── */}
          <View style={[s.statsRow, { flexDirection: row }]}>
            {[
              [avgRating ? `⭐ ${avgRating}` : "N/A", t("note")],
              [listing.reviews || 0, t("reviews")],
              [listing.views   || 0, t("views")],
            ].map(([n, l]) => (
              <View key={l} style={s.statCard}>
                <Text style={s.statN}>{n}</Text>
                <Text style={s.statL}>{l}</Text>
              </View>
            ))}
          </View>

          {/* ── INFOS ── */}
          {(listing.brand || listing.model || listing.year || listing.category) ? (
            <View style={s.infoBlock}>
              <Text style={[s.infoTitle, { textAlign: align }]}>{t("information")}</Text>
              <View style={[s.infoGrid, { flexDirection: row }]}>
                {[
                  [t("brand"),    listing.brand],
                  [t("model"),    listing.model],
                  [t("year"),     listing.year],
                  [t("category"), listing.category],
                ].filter(([, v]) => v).map(([label, value]) => (
                  <View key={label} style={s.infoItem}>
                    <Text style={[s.infoLabel, { textAlign: align }]}>{label}</Text>
                    <Text style={[s.infoValue, { textAlign: align }]}>{value}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* ── VÉHICULES COMPATIBLES ── */}
          {listing.compatibleVehicles?.length > 0 && (
            <View style={s.infoBlock}>
              <Text style={[s.infoTitle, { textAlign: align }]}>{t("compatibleVehicles")}</Text>
              <View style={[s.infoGrid, { flexDirection: row, flexWrap: "wrap" }]}>
                {listing.compatibleVehicles.map((v, i) => (
                  <View key={i} style={s.compatTag}>
                    <Text style={[s.compatTagTxt, { textAlign: align }]}>{v.brand} {v.model}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── DESCRIPTION ── */}
          {listing.description ? (
            <View style={s.descBlock}>
              <Text style={[s.infoTitle, { textAlign: align }]}>{t("description")}</Text>
              <Text style={[s.descTxt, { textAlign: align }]}>{listing.description}</Text>
            </View>
          ) : null}

          {/* ── VENDEUR ── */}
          <View style={[s.sellerCard, { flexDirection: row }]}>
            <View style={s.sellerAvatar}>
              <Text style={s.sellerAvatarTxt}>{(listing.sellerName || "V")[0].toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.sellerName, { textAlign: align }]}>{listing.sellerName}</Text>
              <Text style={[s.sellerMeta, { textAlign: align }]}>{listing.wilaya || "Algérie"}</Text>
            </View>
            {listing.verified && (
              <View style={[s.verifiedBadge, { flexDirection: row }]}>
                <Ionicons name="checkmark-circle" size={14} color={C.success} />
                <Text style={s.verifiedTxt}>{t("verified")}</Text>
              </View>
            )}
            {!isOwner && user && (
              <TouchableOpacity onPress={() => setShowReport(true)} style={s.reportBtn} activeOpacity={0.7}>
                <Ionicons name="flag-outline" size={14} color={C.danger} />
                <Text style={s.reportTxt}>{isRTL ? "إبلاغ" : "Signaler"}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── LIVRAISON ── */}
          <View style={s.deliveryBox}>
            <View style={[s.deliveryRow, { flexDirection: row }]}>
              <Ionicons name="car-outline" size={18} color={C.accent} />
              <View style={{ flex: 1 }}>
                <Text style={[s.deliveryTitle, { textAlign: align }]}>{t("deliveryInfo")}</Text>
                <Text style={[s.deliverySub, { textAlign: align }]}>{t("deliverySub")}</Text>
              </View>
            </View>
            <View style={[s.deliveryRow, { flexDirection: row }]}>
              <Ionicons name="shield-checkmark-outline" size={18} color={C.success} />
              <View style={{ flex: 1 }}>
                <Text style={[s.deliveryTitle, { textAlign: align }]}>{t("securePayment")}</Text>
                <Text style={[s.deliverySub, { textAlign: align }]}>{t("securePaySub")}</Text>
              </View>
            </View>
          </View>

          {/* ── BOUTON PARTAGER (bas de page) ── */}
          <TouchableOpacity onPress={handleShare} style={[s.shareBtn, { flexDirection: row }]} activeOpacity={0.8}>
            <Ionicons name="share-social-outline" size={18} color={C.accent} />
            <Text style={s.shareTxt}>{isRTL ? "مشاركة هذا الإعلان" : "Partager cette annonce"}</Text>
          </TouchableOpacity>

          <View style={{ height: 20 }} />
        </View>
      </ScrollView>

      {/* ── ACTIONS BAS ── */}
      {!isOwner && (
        <View style={[s.actions, { flexDirection: row }]}>
          <TouchableOpacity onPress={handleContact}
            style={[s.contactBtn, { flexDirection: row }]} disabled={contacting}>
            <Ionicons name="chatbubble-outline" size={18} color={C.accent} />
            <Text style={s.contactTxt}>{contacting ? "..." : t("contact")}</Text>
          </TouchableOpacity>
          {!isVendeur && (
            <TouchableOpacity onPress={handleBuy}
              style={[s.buyBtn, { flexDirection: row }, (listing.stock || 0) <= 0 && s.buyBtnDisabled]}
              disabled={(listing.stock || 0) <= 0}>
              <Ionicons name="bag-handle-outline" size={18} color="#000" />
              <Text style={s.buyTxt}>{(listing.stock || 0) <= 0 ? t("outOfStock") : t("buy")}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {isOwner && (
        <View style={s.actions}>
          <View style={[s.ownerBadge, { flexDirection: row }]}>
            <Ionicons name="storefront-outline" size={16} color={C.accent} />
            <Text style={s.ownerTxt}>{t("yourListing")}</Text>
          </View>
        </View>
      )}

      <ReportModal
        visible={showReport}
        onClose={() => setShowReport(false)}
        targetUserId={listing.sellerId}
        targetUserName={listing.sellerName}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: C.bg },
  iconBtn:         { width: 36, height: 36, borderRadius: 10, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  imgFull:         { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  imgBlock:        { height: 240, backgroundColor: C.surface, alignItems: "center", justifyContent: "center", borderBottomWidth: 1, borderBottomColor: C.border, position: "relative" },
  imgLetter:       { fontSize: 100, fontWeight: "900", color: C.accent },
  newBadge:        { position: "absolute", top: 16, left: 16, backgroundColor: C.success, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  newTxt:          { fontSize: 10, fontWeight: "900", color: "#fff" },
  pad:             { padding: 16 },
  topRow:          { alignItems: "flex-start", marginBottom: 16 },
  title:           { fontSize: 20, fontWeight: "900", color: C.text, lineHeight: 26, marginBottom: 8 },
  tagsRow:         { flexWrap: "wrap", gap: 6 },
  priceBlock:      { minWidth: 90 },
  price:           { fontSize: 26, fontWeight: "900", color: C.accent },
  priceDA:         { fontSize: 13, color: C.textMuted, fontWeight: "700", marginTop: -4 },
  stock:           { fontSize: 11, fontWeight: "700", marginTop: 4 },
  statsRow:        { gap: 10, marginBottom: 16 },
  statCard:        { flex: 1, backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 12, alignItems: "center" },
  statN:           { fontSize: 15, fontWeight: "900", color: C.text },
  statL:           { fontSize: 9, color: C.textMuted, fontWeight: "700", marginTop: 2 },
  infoBlock:       { backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 14 },
  infoTitle:       { fontSize: 13, fontWeight: "800", color: C.text, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  infoGrid:        { flexWrap: "wrap", gap: 10 },
  infoItem:        { width: "47%", backgroundColor: C.surfaceAlt, borderRadius: 10, padding: 10 },
  infoLabel:       { fontSize: 10, color: C.textDim, marginBottom: 3, fontWeight: "700", textTransform: "uppercase" },
  infoValue:       { fontSize: 13, fontWeight: "700", color: C.text },
  compatTag:       { backgroundColor: C.accent + "15", borderRadius: 8, borderWidth: 1, borderColor: C.accent + "30", paddingHorizontal: 10, paddingVertical: 5 },
  compatTagTxt:    { fontSize: 11, fontWeight: "700", color: C.accent },
  descBlock:       { backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 14 },
  descTxt:         { fontSize: 14, color: C.textMuted, lineHeight: 22 },
  sellerCard:      { alignItems: "center", gap: 12, backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 14, flexWrap: "wrap" },
  sellerAvatar:    { width: 44, height: 44, borderRadius: 22, backgroundColor: C.accent + "20", borderWidth: 2, borderColor: C.accent, alignItems: "center", justifyContent: "center" },
  sellerAvatarTxt: { fontSize: 18, fontWeight: "900", color: C.accent },
  sellerName:      { fontSize: 15, fontWeight: "800", color: C.text },
  sellerMeta:      { fontSize: 11, color: C.textMuted, marginTop: 2 },
  verifiedBadge:   { alignItems: "center", gap: 4, backgroundColor: C.success + "15", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  verifiedTxt:     { fontSize: 10, color: C.success, fontWeight: "800" },
  reportBtn:       { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: C.danger + "12", borderRadius: 8, borderWidth: 1, borderColor: C.danger + "30" },
  reportTxt:       { fontSize: 11, color: C.danger, fontWeight: "700" },
  deliveryBox:     { backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 14, gap: 12 },
  deliveryRow:     { alignItems: "flex-start", gap: 12 },
  deliveryTitle:   { fontSize: 13, fontWeight: "800", color: C.text, marginBottom: 2 },
  deliverySub:     { fontSize: 11, color: C.textMuted },
  shareBtn:        { alignItems: "center", justifyContent: "center", gap: 10, borderWidth: 1.5, borderColor: C.accent + "50", borderRadius: 14, paddingVertical: 13, backgroundColor: C.accent + "08" },
  shareTxt:        { fontSize: 14, fontWeight: "700", color: C.accent },
  actions:         { gap: 12, padding: 16, paddingBottom: 28, backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.border },
  contactBtn:      { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 2, borderColor: C.accent, borderRadius: 14, paddingVertical: 14 },
  contactTxt:      { fontSize: 15, fontWeight: "800", color: C.accent },
  buyBtn:          { flex: 2, alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.accent, borderRadius: 14, paddingVertical: 14 },
  buyBtnDisabled:  { backgroundColor: C.textDim, opacity: 0.5 },
  buyTxt:          { fontSize: 15, fontWeight: "900", color: "#000" },
  ownerBadge:      { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.accent + "15", borderRadius: 14, paddingVertical: 14, borderWidth: 1, borderColor: C.accent + "30" },
  ownerTxt:        { fontSize: 14, fontWeight: "800", color: C.accent },
  photoCount:      { position: "absolute", bottom: 12, right: 12, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  photoCountTxt:   { fontSize: 11, color: "#fff", fontWeight: "700" },
});