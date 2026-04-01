import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, Alert, Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../../constants/theme";
import { useAuthContext } from "../../context/AuthContext";
import { placeOrder } from "../../services/db.service";
import { createNotif } from "../../services/Notif.service";
import { MapView } from "../../components/MapPicker";
import { WILAYAS } from "../../constants/wilayas";
import ScreenHeader from "../../components/ScreenHeader";
import Btn from "../../components/Btn";
import { useLanguage } from "../../i18n/languagecontext";


const DELIVERY_FEES = {
  "Alger": 400, "Oran": 600, "Constantine": 700,
  "Blida": 450, "Sétif": 750, "Annaba": 800,
};
const DEFAULT_FEE = 800;

export default function CartScreen({ route, navigation }) {
  const { t, isRTL } = useLanguage();
  const { user, profile } = useAuthContext();
  const directBuy = route.params?.directBuy || null;

  const [wilaya, setWilaya]   = useState(profile?.wilaya || "Alger");
  const [address, setAddress] = useState("");
  const [phone, setPhone]     = useState(profile?.phone || "");
  const [payment, setPayment] = useState("cash");
  const [loading, setLoading] = useState(false);
  const [step, setStep]       = useState("form");

  const item = directBuy;
  const deliveryFee = DELIVERY_FEES[wilaya] || DEFAULT_FEE;
  const total = (item?.price || 0) + deliveryFee;
  const align = isRTL ? "right" : "left";
  const row = isRTL ? "row-reverse" : "row";

  const PAYMENT_METHODS = [
    { id: "cash",    icon: "cash-outline",            label: t("cash"),    desc: t("cashDesc")    },
    { id: "cib",     icon: "card-outline",             label: t("cib"),     desc: t("cibDesc")     },
    { id: "dahabia", icon: "phone-portrait-outline",   label: t("dahabia"), desc: t("dahabiaDesc") },
  ];

  const openMap = () => {
    const query = encodeURIComponent(`${wilaya}, Algérie`);
    Linking.openURL(`https://maps.google.com/?q=${query}`).catch(() =>
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`)
    );
  };

  const handleConfirm = () => {
    if (!address.trim()) { Alert.alert(isRTL ? "العنوان مطلوب" : "Adresse requise", t("addressRequired")); return; }
    if (!phone.trim())   { Alert.alert(isRTL ? "الهاتف مطلوب" : "Téléphone requis", t("phoneRequired")); return; }
    setStep("confirm");
  };

  const handleOrder = async () => {
    setLoading(true);
    try {
      await placeOrder([{ ...item, sellerId: item.sellerId }],
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
      Alert.alert(t("error"), isRTL ? "تعذر إتمام الطلب. تحقق من اتصالك." : "Commande impossible. Vérifiez votre connexion.");
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
          <Btn onPress={() => navigation.navigate("Login")} style={{ marginTop: 16, width: 200 }}>
            {t("login")}
          </Btn>
        </View>
      </View>
    );
  }

  if (step === "success") {
    return (
      <View style={s.successScreen}>
        <View style={s.successIcon}>
          <Ionicons name="checkmark-circle" size={64} color={C.success} />
        </View>
        <Text style={[s.successTitle, { textAlign: "center" }]}>{t("orderConfirmed")}</Text>
        <Text style={[s.successSub, { textAlign: "center" }]}>
          {isRTL ? "سيتواصل معك البائع خلال 24 ساعة لتأكيد التوصيل." : "Le vendeur va vous contacter sous 24h pour confirmer la livraison."}
        </Text>
        <View style={s.successInfo}>
          {[
            [isRTL ? "القطعة" : "Pièce",          item?.title || "—"],
            [isRTL ? "التوصيل" : "Livraison",      wilaya],
            [isRTL ? "رسوم التوصيل" : "Frais livraison", `${deliveryFee.toLocaleString()} DA`],
            [isRTL ? "المجموع" : "Total payé",     `${total.toLocaleString()} DA`],
            [isRTL ? "الدفع" : "Paiement",         PAYMENT_METHODS.find((p) => p.id === payment)?.label || "—"],
          ].map(([l, v]) => (
            <View key={l} style={[s.successRow, { flexDirection: row }]}>
              <Text style={[s.successLabel, { textAlign: align }]}>{l}</Text>
              <Text style={[s.successValue, { textAlign: align }]}>{v}</Text>
            </View>
          ))}
        </View>
        <Btn onPress={() => navigation.goBack()} style={{ width: "100%", marginTop: 10 }}>
          {t("backListings")}
        </Btn>
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
              [isRTL ? "الولاية" : "Wilaya",    wilaya],
              [isRTL ? "العنوان" : "Adresse",   address],
              [isRTL ? "الهاتف" : "Téléphone",  phone],
            ].map(([l, v]) => (
              <View key={l} style={[s.confirmRow, { flexDirection: row }]}>
                <Text style={[s.confirmLabel, { textAlign: align }]}>{l}</Text>
                <Text style={[s.confirmVal, { textAlign: align }]}>{v}</Text>
              </View>
            ))}
          </View>
          <View style={s.confirmCard}>
            <Text style={[s.confirmSec, { textAlign: align }]}>{isRTL ? "الدفع" : "Paiement"}</Text>
            <Text style={[s.confirmVal, { textAlign: align }]}>
              {PAYMENT_METHODS.find((p) => p.id === payment)?.label}
            </Text>
          </View>
          <View style={s.totalCard}>
            {[
              [isRTL ? "سعر القطعة" : "Prix pièce",       `${(item?.price || 0).toLocaleString()} DA`],
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
          <Btn onPress={handleOrder} loading={loading}>{t("confirmer")}</Btn>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <ScreenHeader title={t("order")} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
        {item ? (
          <View style={[s.itemCard, { flexDirection: row }]}>
            <View style={s.itemImg}>
              <Text style={s.itemLetter}>{item.img || item.title?.[0] || "P"}</Text>
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
            <Text style={[s.emptySub, { textAlign: "center" }]}>{t("emptyCartSub")}</Text>
          </View>
        )}

        {item && (
          <>
            <Text style={[s.secTitle, { textAlign: align }]}>📦 {isRTL ? "التوصيل" : "Livraison"}</Text>

            <Text style={[s.label, { textAlign: align }]}>{t("deliveryWilaya")}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: "row", gap: 8, paddingRight: 8 }}>
                {["Alger","Oran","Constantine","Blida","Sétif","Annaba","Tlemcen","Batna"].map((w) => (
                  <TouchableOpacity key={w} onPress={() => setWilaya(w)}
                    style={[s.wilayaChip, wilaya === w && s.wilayaChipActive]}>
                    <Text style={[s.wilayaTxt, wilaya === w && { color: C.accent }]}>{w}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

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
            ) : (
              <TouchableOpacity onPress={openMap} style={[s.mapBtn, { flexDirection: row }]}>
                <Ionicons name="map-outline" size={18} color={C.accent} />
                <Text style={s.mapTxt}>{isRTL ? `عرض ${wilaya} على خرائط Google` : `Voir ${wilaya} sur Google Maps`}</Text>
                <Ionicons name="open-outline" size={14} color={C.accent} />
              </TouchableOpacity>
            )}

            <View style={[s.deliveryFeeBox, { flexDirection: row }]}>
              <Ionicons name="car-outline" size={18} color={C.accent} />
              <Text style={[s.deliveryFeeTxt, { textAlign: align }]}>
                {t("deliveryFee")} <Text style={{ color: C.accent, fontWeight: "800" }}>{wilaya}</Text>
              </Text>
              <Text style={s.deliveryFeeAmt}>{deliveryFee.toLocaleString()} DA</Text>
            </View>

            <Text style={[s.label, { textAlign: align }]}>{t("fullAddress")}</Text>
            <View style={[s.inputWrap, { flexDirection: row }]}>
              <Ionicons name="home-outline" size={16} color={C.textDim} />
              <TextInput style={[s.input, { textAlign: align }]}
                placeholder={t("addressPlaceholder")} placeholderTextColor={C.textDim}
                value={address} onChangeText={setAddress} multiline />
            </View>

            <Text style={[s.label, { textAlign: align }]}>{t("phone")}</Text>
            <View style={[s.inputWrap, { flexDirection: row }]}>
              <Ionicons name="call-outline" size={16} color={C.textDim} />
              <TextInput style={[s.input, { textAlign: align }]}
                placeholder={t("phonePlaceholder")} placeholderTextColor={C.textDim}
                value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            </View>

            <Text style={[s.secTitle, { textAlign: align }]}>{t("paymentMethod")}</Text>
            <View style={s.paymentList}>
              {PAYMENT_METHODS.map((p) => (
                <TouchableOpacity key={p.id} onPress={() => setPayment(p.id)}
                  style={[s.paymentCard, { flexDirection: row }, payment === p.id && s.paymentCardActive]}
                  activeOpacity={0.8}>
                  <View style={[s.paymentIcon, payment === p.id && { backgroundColor: C.accent }]}>
                    <Ionicons name={p.icon} size={20} color={payment === p.id ? "#000" : C.textMuted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.paymentLabel, { textAlign: align }, payment === p.id && { color: C.accent }]}>{p.label}</Text>
                    <Text style={[s.paymentDesc, { textAlign: align }]}>{p.desc}</Text>
                  </View>
                  {payment === p.id && <Ionicons name="checkmark-circle" size={20} color={C.accent} />}
                </TouchableOpacity>
              ))}
            </View>

            <View style={s.totalCard}>
              {[
                [isRTL ? "سعر القطعة" : "Prix pièce", `${(item.price || 0).toLocaleString()} DA`],
                [isRTL ? "رسوم التوصيل" : "Frais livraison", `${deliveryFee.toLocaleString()} DA`],
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
  itemImg:          { width: 70, height: 70, borderRadius: 12, backgroundColor: C.surfaceAlt, alignItems: "center", justifyContent: "center" },
  itemLetter:       { fontSize: 32, fontWeight: "900", color: C.accent },
  itemTitle:        { fontSize: 14, fontWeight: "800", color: C.text, marginBottom: 4 },
  itemSeller:       { fontSize: 11, color: C.textDim, marginBottom: 6 },
  itemPrice:        { fontSize: 18, fontWeight: "900", color: C.accent },
  emptyCart:        { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyTitle:       { fontSize: 18, fontWeight: "800", color: C.text },
  emptySub:         { fontSize: 13, color: C.textMuted },
  secTitle:         { fontSize: 15, fontWeight: "900", color: C.text, marginTop: 8, marginBottom: 14 },
  label:            { fontSize: 11, fontWeight: "700", color: C.textMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  wilayaChip:       { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface },
  wilayaChipActive: { borderColor: C.accent, backgroundColor: C.accent + "15" },
  wilayaTxt:        { fontSize: 13, fontWeight: "700", color: C.textMuted },
  mapBtn:           { alignItems: "center", gap: 8, backgroundColor: C.accent + "10", borderWidth: 1, borderColor: C.accent + "30", borderRadius: 12, padding: 12, marginBottom: 14 },
  mapTxt:           { flex: 1, fontSize: 13, color: C.accent, fontWeight: "700" },
  deliveryFeeBox:   { alignItems: "center", gap: 10, backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 12, marginBottom: 14 },
  deliveryFeeTxt:   { flex: 1, fontSize: 13, color: C.textMuted },
  deliveryFeeAmt:   { fontSize: 14, fontWeight: "900", color: C.accent },
  inputWrap:        { alignItems: "center", gap: 10, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 14 },
  input:            { flex: 1, color: C.text, fontSize: 14 },
  paymentList:      { gap: 10, marginBottom: 16 },
  paymentCard:      { alignItems: "center", gap: 12, backgroundColor: C.surface, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, padding: 14 },
  paymentCardActive:{ borderColor: C.accent, backgroundColor: C.accent + "08" },
  paymentIcon:      { width: 40, height: 40, borderRadius: 12, backgroundColor: C.surfaceAlt, alignItems: "center", justifyContent: "center" },
  paymentLabel:     { fontSize: 14, fontWeight: "800", color: C.text },
  paymentDesc:      { fontSize: 11, color: C.textDim, marginTop: 2 },
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