// src/screens/Cart/CartScreen.jsx
import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, Alert, Linking, Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../../constants/theme";
import { useAuthContext } from "../../context/AuthContext";
import { placeOrder } from "../../services/db.service";
import { createNotif } from "../../services/Notif.service";
import { MapView } from "../../components/MapPicker";
import { WILAYAS } from "../../constants/wilayas";
import { DELIVERY_FEES, DEFAULT_FEE, getDeliveryInfo, ZONE_SUMMARY } from "../../constants/deliveryPrices";
import ScreenHeader from "../../components/ScreenHeader";
import Btn from "../../components/Btn";
import { useLanguage } from "../../i18n/languagecontext";

export default function CartScreen({ route, navigation }) {
  const { t, isRTL } = useLanguage();
  const { user, profile } = useAuthContext();
  const directBuy = route.params?.directBuy || null;

  const [wilaya, setWilaya]   = useState(profile?.wilaya || "Alger");
  const [address, setAddress] = useState("");
  const [phone, setPhone]     = useState(profile?.phone || "");
  const [loading, setLoading] = useState(false);
  const [step, setStep]       = useState("form");
  const [showZones, setShowZones] = useState(false);

  const item         = directBuy;
  // Origin = where the listing is (seller's wilaya). Destination = buyer's selected wilaya.
  const deliveryInfo = getDeliveryInfo(wilaya, item?.wilaya);
  const deliveryFee  = deliveryInfo.price;
  const total        = (item?.price || 0) + deliveryFee;
  const align        = isRTL ? "right" : "left";
  const row          = isRTL ? "row-reverse" : "row";
  const payment      = "cash";
  const paymentLabel = isRTL ? "الدفع عند الاستلام" : "Paiement à la livraison";

  const openMap = () => {
    const lat = item?.lat, lng = item?.lng;
    let url;
    if (lat != null && lng != null) {
      // Itinéraire (directions) jusqu'à la position exacte du vendeur
      url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    } else {
      // Repli : recherche sur la wilaya si aucune coordonnée
      const query = encodeURIComponent(`${wilaya}, Algérie`);
      url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    }
    Linking.openURL(url).catch(() => {});
  };

  const handleConfirm = () => {
    if (!address.trim()) { Alert.alert(isRTL ? "العنوان مطلوب" : "Adresse requise", t("addressRequired")); return; }
    if (!phone.trim())   { Alert.alert(isRTL ? "الهاتف مطلوب" : "Téléphone requis", t("phoneRequired")); return; }
    setStep("confirm");
  };

  const handleOrder = async () => {
    setLoading(true);
    try {
      await placeOrder(
        [{ ...item, sellerId: item.sellerId }],
        user.uid, address, wilaya, payment, phone,
        profile?.displayName || user?.displayName || "Client",
        user?.email || "",
      );
      if (item?.sellerId) {
        createNotif(item.sellerId, {
          type: "commande",
          title: isRTL ? "طلب جديد ! 📦" : "Nouvelle commande ! 📦",
          body: `"${item.title}" — ${(item.price || 0).toLocaleString()} DA`,
          data: { screen: "SellerDashboard" },
        }).catch(() => {});
      }
      setStep("success");
    } catch (e) {
      Alert.alert(t("error"), isRTL ? "تعذر إتمام الطلب." : "Commande impossible. Vérifiez votre connexion.");
    }
    setLoading(false);
  };

  if (!user) {
    return (
      <View style={s.noAuth}>
        <ScreenHeader title={t("order")} onBack={() => navigation.goBack()} />
        <View style={s.noAuthBody}>
          <Ionicons name="bag-outline" size={50} color={C.textDim} />
          <Text style={s.noAuthTitle}>{t("loginRequired")}</Text>
          <Btn onPress={() => navigation.navigate("Login")} style={{ marginTop: 16, width: 200 }}>{t("login")}</Btn>
        </View>
      </View>
    );
  }

  if (step === "success") {
    return (
      <View style={s.successScreen}>
        <View style={s.successIcon}><Ionicons name="checkmark-circle" size={64} color={C.success} /></View>
        <Text style={[s.successTitle, { textAlign: "center" }]}>{t("orderConfirmed")}</Text>
        <Text style={[s.successSub, { textAlign: "center" }]}>
          {isRTL ? "سيتواصل معك البائع خلال 24 ساعة." : "Le vendeur vous contactera sous 24h pour confirmer la livraison."}
        </Text>
        <View style={s.successInfo}>
          {[
            [isRTL ? "القطعة" : "Pièce",                item?.title || "—"],
            [isRTL ? "التوصيل" : "Livraison",           wilaya],
            [isRTL ? "المنطقة" : "Zone",                deliveryInfo.zoneLabel],
            [isRTL ? "رسوم التوصيل" : "Frais livraison", `${deliveryFee.toLocaleString()} DA`],
            [isRTL ? "المجموع" : "Total",               `${total.toLocaleString()} DA`],
            [isRTL ? "الدفع" : "Paiement",              paymentLabel],
          ].map(([l, v]) => (
            <View key={l} style={[s.successRow, { flexDirection: row }]}>
              <Text style={[s.successLabel, { textAlign: align }]}>{l}</Text>
              <Text style={[s.successValue, { textAlign: align }]}>{v}</Text>
            </View>
          ))}
        </View>
        <Btn onPress={() => navigation.goBack()} style={{ width: "100%", marginTop: 10 }}>{t("backListings")}</Btn>
      </View>
    );
  }

  if (step === "confirm") {
    return (
      <View style={s.container}>
        <ScreenHeader title={t("confirmOrder")} onBack={() => setStep("form")} />
        <ScrollView contentContainerStyle={s.pad}>
          <View style={s.confirmCard}>
            <Text style={[s.confirmSec, { textAlign: align }]}>{isRTL ? "القطعة المطلوبة" : "Pièce commandée"}</Text>
            <Text style={[s.confirmTitle, { textAlign: align }]}>{item?.title}</Text>
            <Text style={[s.confirmPrice, { textAlign: align }]}>{(item?.price || 0).toLocaleString()} DA</Text>
          </View>
          <View style={s.confirmCard}>
            <Text style={[s.confirmSec, { textAlign: align }]}>{isRTL ? "التوصيل" : "Livraison"}</Text>
            {[
              [isRTL ? "الولاية" : "Wilaya",   `${wilaya} (${deliveryInfo.zoneLabel})`],
              [isRTL ? "العنوان" : "Adresse",  address],
              [isRTL ? "الهاتف" : "Téléphone", phone],
            ].map(([l, v]) => (
              <View key={l} style={[s.confirmRow, { flexDirection: row }]}>
                <Text style={[s.confirmLabel, { textAlign: align }]}>{l}</Text>
                <Text style={[s.confirmVal, { textAlign: align }]}>{v}</Text>
              </View>
            ))}
          </View>
          <View style={s.paymentInfoCard}>
            <Ionicons name="cash-outline" size={22} color={C.success} />
            <View style={{ flex: 1 }}>
              <Text style={[s.paymentInfoTitle, { textAlign: align }]}>{isRTL ? "الدفع عند الاستلام" : "Paiement à la livraison"}</Text>
              <Text style={[s.paymentInfoDesc, { textAlign: align }]}>{isRTL ? "ادفع نقداً عند استلام الطرد" : "Payez en espèces à la réception"}</Text>
            </View>
            <Ionicons name="checkmark-circle" size={20} color={C.success} />
          </View>
          <View style={s.totalCard}>
            {[
              [isRTL ? "سعر القطعة" : "Prix pièce",     `${(item?.price || 0).toLocaleString()} DA`],
              [isRTL ? `رسوم ${wilaya}` : `Livraison ${wilaya}`, `${deliveryFee.toLocaleString()} DA`],
            ].map(([l, v]) => (
              <View key={l} style={[s.totalRow, { flexDirection: row }]}>
                <Text style={s.totalLabel}>{l}</Text>
                <Text style={s.totalVal}>{v}</Text>
              </View>
            ))}
            <View style={[s.totalRow, s.totalFinal, { flexDirection: row }]}>
              <Text style={s.totalFinalLabel}>{t("total")}</Text>
              <Text style={s.totalFinalVal}>{total.toLocaleString()} DA</Text>
            </View>
          </View>
          <Btn onPress={handleOrder} loading={loading}>{t("confirmer")}</Btn>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <ScreenHeader title={t("order")} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">

        {/* ── ARTICLE ── */}
        {item ? (
          <View style={[s.itemCard, { flexDirection: row }]}>
            <View style={s.itemImg}>
              {(() => {
                const photoUrl =
                  item.photos?.[0] ||
                  (typeof item.img === "string" && item.img.startsWith("http")
                    ? item.img
                    : null);
                if (photoUrl) {
                  return (
                    <Image
                      source={{ uri: photoUrl.trim() }}
                      style={s.itemPhoto}
                      resizeMode="cover"
                    />
                  );
                }
                return (
                  <Text style={s.itemLetter}>
                    {(item.title || "P").charAt(0).toUpperCase()}
                  </Text>
                );
              })()}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.itemTitle, { textAlign: align }]} numberOfLines={2}>{item.title}</Text>
              <Text style={[s.itemSeller, { textAlign: align }]}>{item.sellerName}</Text>
              <Text style={[s.itemPrice, { textAlign: align }]}>{(item.price || 0).toLocaleString()} DA</Text>
            </View>
          </View>
        ) : (
          <View style={s.emptyCart}>
            <Ionicons name="bag-outline" size={50} color={C.textDim} />
            <Text style={s.emptyTitle}>{t("emptyCart")}</Text>
          </View>
        )}

        {item && (
          <>
            <Text style={[s.secTitle, { textAlign: align }]}>📦 {isRTL ? "التوصيل" : "Livraison"}</Text>

            {/* ── WILAYA CHIPS ── */}
            <Text style={[s.label, { textAlign: align }]}>{t("deliveryWilaya")}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: "row", gap: 8, paddingRight: 8 }}>
                {WILAYAS.map(w => (
                  <TouchableOpacity key={w} onPress={() => setWilaya(w)}
                    style={[s.wilayaChip, wilaya === w && s.wilayaChipActive]}>
                    <Text style={[s.wilayaTxt, wilaya === w && { color: "#000" }]}>{w}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* ── FRAIS DE LIVRAISON AVEC ZONE ── */}
            <View style={[
              s.deliveryFeeBox,
              { flexDirection: row },
              deliveryInfo.sameWilaya && { borderColor: C.success + "60", backgroundColor: C.success + "12" }
            ]}>
              <View style={[
                s.zoneBadge,
                { backgroundColor: (deliveryInfo.sameWilaya ? C.success : deliveryInfo.zoneColor) + "20" }
              ]}>
                <Text style={[
                  s.zoneTxt,
                  { color: deliveryInfo.sameWilaya ? C.success : deliveryInfo.zoneColor }
                ]}>
                  {deliveryInfo.sameWilaya ? "🏠" : `Z${deliveryInfo.zoneId}`}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.deliveryFeeTxt, { textAlign: align }]}>
                  {deliveryInfo.sameWilaya
                    ? (isRTL ? "توصيل محلي" : "Livraison locale")
                    : (isRTL ? `التوصيل إلى ${wilaya}` : `Livraison vers ${wilaya}`)}
                </Text>
                <Text style={[
                  s.zoneLabel,
                  { textAlign: align, color: deliveryInfo.sameWilaya ? C.success : deliveryInfo.zoneColor }
                ]}>
                  {deliveryInfo.sameWilaya
                    ? (isRTL ? `البائع في نفس الولاية (${wilaya})` : `Vendeur dans la même wilaya (${wilaya})`)
                    : deliveryInfo.zoneLabel}
                </Text>
              </View>
              <Text style={s.deliveryFeeAmt}>{deliveryFee.toLocaleString()} DA</Text>
            </View>

            {/* ── TABLEAU ZONES ── */}
            <TouchableOpacity onPress={() => setShowZones(!showZones)} style={s.zonesToggle}>
              <Ionicons name="information-circle-outline" size={15} color={C.accent} />
              <Text style={s.zonesToggleTxt}>
                {showZones
                  ? (isRTL ? "إخفاء أسعار المناطق" : "Masquer les zones")
                  : (isRTL ? "عرض جميع أسعار التوصيل" : "Voir tous les tarifs de livraison")}
              </Text>
              <Ionicons name={showZones ? "chevron-up" : "chevron-down"} size={13} color={C.accent} />
            </TouchableOpacity>

            {showZones && (
              <View style={s.zonesTable}>
                <Text style={s.zonesTitle}>{isRTL ? "أسعار التوصيل حسب المنطقة" : "Tarifs Yalidine Express 2025"}</Text>
                {ZONE_SUMMARY.map(z => (
                  <View key={z.zone} style={[s.zoneRow, { flexDirection: row }]}>
                    <View style={[s.zoneColorDot, { backgroundColor: z.color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.zoneRowLabel}>{z.label}</Text>
                      <Text style={s.zoneRowExample}>{z.example}</Text>
                    </View>
                    <Text style={[s.zoneRowPrice, { color: z.color }]}>{z.price.toLocaleString()} DA</Text>
                  </View>
                ))}
              </View>
            )}

            {/* ── MAP ── */}
            {item?.lat && item?.lng ? (
              <View style={{ marginBottom: 14 }}>
                <Text style={[s.label, { marginBottom: 8, textAlign: align }]}>{t("vendorPosition")}</Text>
                <MapView lat={item.lat} lng={item.lng} title={item.sellerName || "Vendeur"} height={200} />
                <TouchableOpacity onPress={openMap} style={[s.mapBtn, { flexDirection: row }]}>
                  <Ionicons name="navigate-outline" size={16} color={C.accent} />
                  <Text style={s.mapTxt}>{t("openRoute")}</Text>
                  <Ionicons name="open-outline" size={13} color={C.accent} />
                </TouchableOpacity>
              </View>
            ) : null}

            {/* ── ADRESSE ── */}
            <Text style={[s.label, { textAlign: align }]}>{t("fullAddress")}</Text>
            <View style={[s.inputWrap, { flexDirection: row }]}>
              <Ionicons name="home-outline" size={16} color={C.textDim} />
              <TextInput style={[s.input, { textAlign: align }]}
                placeholder={t("addressPlaceholder")} placeholderTextColor={C.textDim}
                value={address} onChangeText={setAddress} multiline />
            </View>

            {/* ── TÉLÉPHONE ── */}
            <Text style={[s.label, { textAlign: align }]}>{t("phone")}</Text>
            <View style={[s.inputWrap, { flexDirection: row }]}>
              <Ionicons name="call-outline" size={16} color={C.textDim} />
              <TextInput style={[s.input, { textAlign: align }]}
                placeholder={t("phonePlaceholder")} placeholderTextColor={C.textDim}
                value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            </View>

            {/* ── PAIEMENT ── */}
            <Text style={[s.secTitle, { textAlign: align }]}>{isRTL ? "💳 طريقة الدفع" : "💳 Mode de paiement"}</Text>
            <View style={s.paymentInfoCard}>
              <Ionicons name="cash-outline" size={24} color={C.success} />
              <View style={{ flex: 1 }}>
                <Text style={[s.paymentInfoTitle, { textAlign: align }]}>{isRTL ? "الدفع عند الاستلام" : "Paiement à la livraison"}</Text>
                <Text style={[s.paymentInfoDesc, { textAlign: align }]}>{isRTL ? "ادفع نقداً عند استلام طلبك" : "Payez en espèces à la réception — Sécurisé"}</Text>
              </View>
              <Ionicons name="checkmark-circle" size={22} color={C.success} />
            </View>

            {/* ── TOTAL ── */}
            <View style={s.totalCard}>
              {[
                [isRTL ? "سعر القطعة" : "Prix pièce",       `${(item.price || 0).toLocaleString()} DA`],
                [isRTL ? `رسوم التوصيل (${wilaya})` : `Livraison (${wilaya})`, `${deliveryFee.toLocaleString()} DA`],
              ].map(([l, v]) => (
                <View key={l} style={[s.totalRow, { flexDirection: row }]}>
                  <Text style={s.totalLabel}>{l}</Text>
                  <Text style={s.totalVal}>{v}</Text>
                </View>
              ))}
              <View style={[s.totalRow, s.totalFinal, { flexDirection: row }]}>
                <Text style={s.totalFinalLabel}>{t("total")}</Text>
                <Text style={s.totalFinalVal}>{total.toLocaleString()} DA</Text>
              </View>
            </View>

            <Btn onPress={handleConfirm}>{t("placeOrder")}</Btn>
          </>
        )}
        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:        { flex: 1, backgroundColor: C.bg },
  pad:              { padding: 16 },
  noAuth:           { flex: 1, backgroundColor: C.bg },
  noAuthBody:       { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  noAuthTitle:      { fontSize: 18, fontWeight: "800", color: C.text },
  itemCard:         { gap: 14, backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 20 },
  itemImg:          { width: 70, height: 70, borderRadius: 12, backgroundColor: C.surfaceAlt, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  itemPhoto:        { width: "100%", height: "100%" },
  itemLetter:       { fontSize: 32, fontWeight: "900", color: C.accent },
  itemTitle:        { fontSize: 14, fontWeight: "800", color: C.text, marginBottom: 4 },
  itemSeller:       { fontSize: 11, color: C.textDim, marginBottom: 6 },
  itemPrice:        { fontSize: 18, fontWeight: "900", color: C.accent },
  emptyCart:        { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyTitle:       { fontSize: 18, fontWeight: "800", color: C.text },
  secTitle:         { fontSize: 15, fontWeight: "900", color: C.text, marginTop: 8, marginBottom: 14 },
  label:            { fontSize: 11, fontWeight: "700", color: C.textMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  wilayaChip:       { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface },
  wilayaChipActive: { borderColor: C.accent, backgroundColor: C.accent },
  wilayaTxt:        { fontSize: 13, fontWeight: "700", color: C.textMuted },
  deliveryFeeBox:   { alignItems: "center", gap: 12, backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 8 },
  zoneBadge:        { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  zoneTxt:          { fontSize: 12, fontWeight: "900" },
  deliveryFeeTxt:   { fontSize: 13, color: C.text, fontWeight: "700" },
  zoneLabel:        { fontSize: 11, fontWeight: "600", marginTop: 2 },
  deliveryFeeAmt:   { fontSize: 18, fontWeight: "900", color: C.accent },
  zonesToggle:      { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  zonesToggleTxt:   { flex: 1, fontSize: 12, color: C.accent, fontWeight: "700" },
  zonesTable:       { backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 14, gap: 12 },
  zonesTitle:       { fontSize: 12, fontWeight: "800", color: C.text, marginBottom: 4 },
  zoneRow:          { alignItems: "flex-start", gap: 10 },
  zoneColorDot:     { width: 12, height: 12, borderRadius: 6, marginTop: 4, flexShrink: 0 },
  zoneRowLabel:     { fontSize: 13, fontWeight: "800", color: C.text },
  zoneRowExample:   { fontSize: 10, color: C.textMuted, marginTop: 2, lineHeight: 14 },
  zoneRowPrice:     { fontSize: 16, fontWeight: "900", minWidth: 70, textAlign: "right" },
  mapBtn:           { alignItems: "center", gap: 8, backgroundColor: C.accent + "10", borderWidth: 1, borderColor: C.accent + "30", borderRadius: 12, padding: 12, marginBottom: 14, marginTop: 8 },
  mapTxt:           { flex: 1, fontSize: 13, color: C.accent, fontWeight: "700" },
  inputWrap:        { alignItems: "center", gap: 10, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 14 },
  input:            { flex: 1, color: C.text, fontSize: 14 },
  paymentInfoCard:  { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.success + "10", borderWidth: 1.5, borderColor: C.success + "30", borderRadius: 14, padding: 14, marginBottom: 16 },
  paymentInfoTitle: { fontSize: 14, fontWeight: "800", color: C.text, marginBottom: 3 },
  paymentInfoDesc:  { fontSize: 12, color: C.textMuted, lineHeight: 18 },
  totalCard:        { backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 16, marginBottom: 16, gap: 10 },
  totalRow:         { justifyContent: "space-between" },
  totalLabel:       { fontSize: 13, color: C.textMuted },
  totalVal:         { fontSize: 13, fontWeight: "700", color: C.text },
  totalFinal:       { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 10, marginTop: 2 },
  totalFinalLabel:  { fontSize: 16, fontWeight: "900", color: C.text },
  totalFinalVal:    { fontSize: 20, fontWeight: "900", color: C.accent },
  confirmCard:      { backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 12 },
  confirmSec:       { fontSize: 10, fontWeight: "800", color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  confirmTitle:     { fontSize: 15, fontWeight: "800", color: C.text, marginBottom: 4 },
  confirmPrice:     { fontSize: 18, fontWeight: "900", color: C.accent },
  confirmRow:       { justifyContent: "space-between", paddingVertical: 4 },
  confirmLabel:     { fontSize: 13, color: C.textDim },
  confirmVal:       { fontSize: 13, fontWeight: "700", color: C.text },
  successScreen:    { flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center", padding: 28 },
  successIcon:      { marginBottom: 20 },
  successTitle:     { fontSize: 26, fontWeight: "900", color: C.text, marginBottom: 10 },
  successSub:       { fontSize: 14, color: C.textMuted, marginBottom: 24, lineHeight: 22 },
  successInfo:      { width: "100%", backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 16, gap: 10, marginBottom: 10 },
  successRow:       { justifyContent: "space-between" },
  successLabel:     { fontSize: 13, color: C.textDim },
  successValue:     { fontSize: 13, fontWeight: "700", color: C.text },
});