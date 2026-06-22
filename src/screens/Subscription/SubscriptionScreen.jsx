// src/screens/Subscription/SubscriptionScreen.jsx

import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ScrollView, Linking, Image, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { C } from "../../constants/theme";
import { useAuthContext } from "../../context/AuthContext";
import { useSubscription } from "../../hooks/useSubscription";
import {
  requestRenewal, uploadReceiptPhoto,
  CCP_NUMBER, PLANS, DEFAULT_PLAN,
} from "../../services/subscription.service";

const fmt = (n) => (Number(n) || 0).toLocaleString("fr-DZ");
import { useLanguage } from "../../i18n/languagecontext";

export default function SubscriptionScreen({ navigation }) {
  const { user, profile }          = useAuthContext();
  const { status, daysLeft, isTrial } = useSubscription();
  const { isRTL }                  = useLanguage();

  const [loading, setLoading]       = useState(false);
  const [requested, setRequested]   = useState(false);
  const [receiptUri, setReceiptUri] = useState(null);
  const [uploading, setUploading]   = useState(false);
  const [planId, setPlanId]         = useState(DEFAULT_PLAN);
  const plan = PLANS[planId] || PLANS[DEFAULT_PLAN];

  const isExpired = status === "expired";
  const align = isRTL ? "right" : "left";

  useEffect(() => {
    if (isExpired) {
      Alert.alert(
        isRTL ? "🔒 اشتراكك منتهي" : "🔒 Abonnement expiré",
        isRTL
          ? "انتهت صلاحية اشتراكك. يجب دفع الاشتراك لمتابعة استخدام التطبيق."
          : `Votre abonnement a expiré. Renouvelez pour continuer.`,
        [{ text: isRTL ? "حسناً" : "Voir les détails", style: "default" }]
      );
    }
  }, []);

  // ── Choisir photo reçu ──────────────────────────────────────────────────────
  const pickReceipt = async () => {
    const { status: perm } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm !== "granted") {
      Alert.alert(
        isRTL ? "الإذن مطلوب" : "Permission requise",
        isRTL ? "يجب السماح بالوصول إلى الصور" : "Autorisez l'accès à vos photos"
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      setReceiptUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status: perm } = await ImagePicker.requestCameraPermissionsAsync();
    if (perm !== "granted") {
      Alert.alert(isRTL ? "الإذن مطلوب" : "Permission requise", isRTL ? "يجب السماح بالوصول إلى الكاميرا" : "Autorisez l'accès à la caméra");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 });
    if (!result.canceled && result.assets?.[0]) {
      setReceiptUri(result.assets[0].uri);
    }
  };

  const choosePhoto = () => {
    Alert.alert(
      isRTL ? "إضافة صورة الإيصال" : "Ajouter le reçu CCP",
      isRTL ? "اختر طريقة" : "Choisissez une méthode",
      [
        { text: isRTL ? "التقاط صورة" : "Prendre une photo", onPress: takePhoto },
        { text: isRTL ? "من المعرض" : "Depuis la galerie", onPress: pickReceipt },
        { text: isRTL ? "إلغاء" : "Annuler", style: "cancel" },
      ]
    );
  };

  // ── Envoyer demande ─────────────────────────────────────────────────────────
  const handleRequest = async () => {
    if (!user) return;
    if (!receiptUri) {
      Alert.alert(
        isRTL ? "الصورة مطلوبة" : "Reçu requis",
        isRTL
          ? "يرجى إرفاق صورة إيصال الدفع قبل الإرسال"
          : "Veuillez joindre une photo du reçu CCP avant d'envoyer votre demande"
      );
      return;
    }

    setLoading(true);
    try {
      setUploading(true);
      const receiptUrl = await uploadReceiptPhoto(user.uid, receiptUri);
      setUploading(false);

      await requestRenewal(
        user.uid,
        profile?.displayName || user.email,
        profile?.phone || "—",
        receiptUrl,
        plan.id
      );
      setRequested(true);
      Alert.alert(
        isRTL ? "تم الإرسال ✅" : "Demande envoyée ✅",
        isRTL
          ? "تم إرسال طلبك مع صورة الإيصال. سيتم تفعيل اشتراكك خلال 24 ساعة."
          : `Votre demande avec le reçu a été envoyée.\n\nNotre équipe activera votre abonnement dans les 24h.`
      );
} catch (e) {
      setUploading(false);
      // ⚠️ Ne pas exposer les détails techniques à l'utilisateur final.
      // Log côté dev console pour le debug, message générique à l'écran.
      console.log("[subscription request]", e?.code, e?.message);
      Alert.alert(
        isRTL ? "خطأ" : "Erreur",
        isRTL
          ? "تعذر إرسال طلبك. حاول مرة أخرى أو تواصل مع الدعم."
          : "Impossible d'envoyer votre demande. Réessayez ou contactez le support WhatsApp."
      );
    }
  };

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}>

      {/* HEADER */}
      <View style={s.header}>
        <View style={s.iconWrap}>
          <Ionicons
            name={isExpired ? "lock-closed" : "time-outline"}
            size={40}
            color={isExpired ? C.danger : C.warning}
          />
        </View>
        <Text style={s.title}>
          {isExpired
            ? (isRTL ? "انتهى اشتراكك" : "Abonnement expiré")
            : (isRTL ? "الفترة التجريبية" : "Période d'essai")}
        </Text>
        <Text style={s.sub}>
          {isExpired
            ? (isRTL ? "جدد اشتراكك للمتابعة في البيع." : "Renouvelez votre abonnement pour continuer à vendre.")
            : (isRTL
                ? `متبقي ${daysLeft} يوم من الفترة التجريبية المجانية.`
                : `Il vous reste ${daysLeft} jour${daysLeft > 1 ? "s" : ""} d'essai gratuit.`)}
        </Text>
      </View>

      {/* PLAN PICKER : Mensuel vs Annuel */}
      <Text style={[s.sectionLabel, { textAlign: align }]}>
        {isRTL ? "اختر صيغة الاشتراك" : "Choisissez votre formule"}
      </Text>
      <View style={s.plansRow}>
        {Object.values(PLANS).map((p) => {
          const selected = p.id === planId;
          const label    = isRTL ? p.labelAr       : p.label;
          const desc     = isRTL ? p.descriptionAr : p.description;
          const badge    = isRTL ? p.badgeAr       : p.badge;
          return (
            <TouchableOpacity
              key={p.id}
              onPress={() => setPlanId(p.id)}
              activeOpacity={0.85}
              style={[s.planOpt, selected && s.planOptOn]}>
              {selected && (
                <View style={s.planOptCheck}>
                  <Ionicons name="checkmark" size={14} color="#000" />
                </View>
              )}
              {badge ? (
                <View style={s.planBadge}>
                  <Text style={s.planBadgeTxt}>{badge}</Text>
                </View>
              ) : null}
              <Text style={[s.planOptLabel, selected && { color: C.accent }]}>
                {label}
              </Text>
              <View style={s.planOptPriceRow}>
                <Text style={s.planOptPrice}>{fmt(p.monthlyDA)}</Text>
                <Text style={s.planOptUnit}>DA/{isRTL ? "شهر" : "mois"}</Text>
              </View>
              {p.id === "yearly" ? (
                <Text style={s.planOptTotal}>
                  {isRTL
                    ? `إجمالي ${fmt(p.totalDA)} دج لـ 12 شهر`
                    : `Soit ${fmt(p.totalDA)} DA pour 12 mois`}
                </Text>
              ) : (
                <Text style={s.planOptTotal}>
                  {isRTL ? "تجديد كل شهر" : "Renouvelable chaque mois"}
                </Text>
              )}
              <Text style={[s.planOptDesc, { textAlign: align }]}>{desc}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* AVANTAGES */}
      <View style={s.planCard}>
        <Text style={[s.planName, { marginBottom: 12 }]}>
          {isRTL ? "ما الذي ستحصل عليه" : "Ce qui est inclus"}
        </Text>
        {[
          "Annonces illimitées",
          "Gestion des commandes",
          "Messagerie avec les clients",
          "Tableau de bord vendeur",
          "Notifications en temps réel",
          "Support prioritaire",
        ].map((f) => (
          <View key={f} style={s.featureRow}>
            <Ionicons name="checkmark-circle" size={18} color={C.success} />
            <Text style={[s.featureTxt, { textAlign: align }]}>{f}</Text>
          </View>
        ))}
      </View>

      {/* TRIAL BANNER */}
      {isTrial && (
        <View style={s.trialBanner}>
          <Ionicons name="gift-outline" size={20} color={C.accent} />
          <Text style={s.trialTxt}>
            {isRTL ? "أنت في الفترة التجريبية المجانية لمدة شهرين !" : "Vous bénéficiez de 2 mois d'essai gratuit !"}
          </Text>
        </View>
      )}

      {/* PAYMENT INSTRUCTIONS */}
      {isExpired && (
        <View style={s.paymentBox}>
          <Text style={s.paymentTitle}>{isRTL ? "كيف تجدد اشتراكك؟" : "Comment renouveler ?"}</Text>

          {/* ÉTAPE 1 */}
          <View style={s.step}>
            <View style={s.stepNum}><Text style={s.stepNumTxt}>1</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.stepTitle}>{isRTL ? "قم بالتحويل" : "Effectuez le virement"}</Text>
              <Text style={s.stepDesc}>
                {isRTL
                  ? `أرسل ${fmt(plan.totalDA)} دج على حساب CCP (${plan.months === 12 ? "اشتراك سنوي" : "اشتراك شهري"}):`
                  : `Envoyez ${fmt(plan.totalDA)} DA sur le compte CCP (${plan.months === 12 ? "abonnement annuel" : "abonnement mensuel"}) :`}
              </Text>
              <TouchableOpacity
                style={s.ccpBox}
                onLongPress={() => Alert.alert(isRTL ? "تم النسخ" : "Copié", CCP_NUMBER)}>
                <Text style={s.ccpNumber}>{CCP_NUMBER}</Text>
                <Ionicons name="copy-outline" size={16} color={C.accent} />
              </TouchableOpacity>
            </View>
          </View>

          {/* ÉTAPE 2 — PHOTO REÇU */}
          <View style={s.step}>
            <View style={s.stepNum}><Text style={s.stepNumTxt}>2</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.stepTitle}>{isRTL ? "التقط صورة الإيصال" : "Photographiez le reçu"}</Text>
              <Text style={s.stepDesc}>
                {isRTL
                  ? "التقط صورة واضحة لإيصال الدفع كدليل على التحويل."
                  : "Prenez une photo claire du reçu CCP comme preuve de paiement."}
              </Text>

              {receiptUri ? (
                <View style={s.receiptPreview}>
                  <Image source={{ uri: receiptUri }} style={s.receiptImg} resizeMode="cover" />
                  <TouchableOpacity style={s.changePhotoBtn} onPress={choosePhoto}>
                    <Ionicons name="camera-outline" size={14} color={C.accent} />
                    <Text style={s.changePhotoTxt}>{isRTL ? "تغيير الصورة" : "Changer la photo"}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={s.photoPickerBtn} onPress={choosePhoto}>
                  <Ionicons name="camera-outline" size={24} color={C.accent} />
                  <Text style={s.photoPickerTxt}>{isRTL ? "إضافة صورة الإيصال" : "Ajouter la photo du reçu"}</Text>
                  <Text style={s.photoPickerSub}>{isRTL ? "مطلوب للتحقق من الدفع" : "Obligatoire pour la vérification"}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* ÉTAPE 3 */}
          <View style={s.step}>
            <View style={s.stepNum}><Text style={s.stepNumTxt}>3</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.stepTitle}>{isRTL ? "أرسل الطلب" : "Envoyez la demande"}</Text>
              <Text style={s.stepDesc}>
                {isRTL
                  ? "انقر على الزر أدناه. سيتحقق فريقنا من الإيصال ويفعّل اشتراكك خلال 24 ساعة."
                  : "Cliquez ci-dessous. Notre équipe vérifiera le reçu et activera votre abonnement sous 24h."}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* CTA */}
      {isExpired && (
        <TouchableOpacity
          style={[
            s.cta,
            requested && s.ctaDone,
            !receiptUri && s.ctaDisabled,
          ]}
          onPress={requested ? null : handleRequest}
          disabled={loading || requested}
          activeOpacity={0.8}>
          {uploading ? (
            <><ActivityIndicator color="#000" size="small" /><Text style={s.ctaTxt}>Upload en cours...</Text></>
          ) : loading ? (
            <><ActivityIndicator color="#000" size="small" /><Text style={s.ctaTxt}>Envoi...</Text></>
          ) : requested ? (
            <><Ionicons name="checkmark-circle" size={20} color={C.success} /><Text style={[s.ctaTxt, { color: C.success }]}>Demande envoyée ✓</Text></>
          ) : (
            <><Ionicons name="send-outline" size={20} color={receiptUri ? "#000" : C.textDim} />
              <Text style={[s.ctaTxt, !receiptUri && { color: C.textDim }]}>
                {isRTL
                  ? `إرسال الطلب — ${fmt(plan.totalDA)} دج`
                  : `Envoyer la demande — ${fmt(plan.totalDA)} DA`}
              </Text></>
          )}
        </TouchableOpacity>
      )}

      {!receiptUri && isExpired && !requested && (
        <Text style={s.photoRequired}>
          {isRTL ? "⚠️ صورة الإيصال مطلوبة قبل الإرسال" : "⚠️ La photo du reçu est requise avant d'envoyer"}
        </Text>
      )}

      {/* CONTACT */}
      <TouchableOpacity
        style={s.contactRow}
        onPress={() => Linking.openURL("https://wa.me/213555000000")}>
        <Ionicons name="logo-whatsapp" size={18} color={C.success} />
        <Text style={s.contactTxt}>{isRTL ? "تواصل مع الدعم عبر WhatsApp" : "Contacter le support WhatsApp"}</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: C.bg, padding: 20 },
  header:          { alignItems: "center", paddingVertical: 32 },
  iconWrap:        { width: 80, height: 80, borderRadius: 40, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  title:           { fontSize: 24, fontWeight: "900", color: C.text, marginBottom: 8, textAlign: "center" },
  sub:             { fontSize: 14, color: C.textMuted, textAlign: "center", lineHeight: 22, paddingHorizontal: 20 },
  planCard:        { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 20, padding: 20, marginBottom: 16 },
  planHeader:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  planName:        { fontSize: 16, fontWeight: "800", color: C.text },
  planBilling:     { fontSize: 11, color: C.textMuted, marginTop: 3 },
  planPrice:       { alignItems: "flex-end" },
  planPriceN:      { fontSize: 28, fontWeight: "900", color: C.accent },
  planPriceDA:     { fontSize: 12, color: C.textMuted, fontWeight: "600" },
  divider:         { height: 1, backgroundColor: C.border, marginBottom: 16 },
  featureRow:      { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  featureTxt:      { fontSize: 14, color: C.text, flex: 1 },
  trialBanner:     { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.accent + "12", borderWidth: 1, borderColor: C.accent + "30", borderRadius: 14, padding: 14, marginBottom: 16 },
  trialTxt:        { flex: 1, fontSize: 13, color: C.accent, fontWeight: "600", lineHeight: 20 },
  paymentBox:      { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 20, marginBottom: 16, gap: 20 },
  paymentTitle:    { fontSize: 16, fontWeight: "800", color: C.text, marginBottom: 4 },
  step:            { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  stepNum:         { width: 28, height: 28, borderRadius: 14, backgroundColor: C.accent, alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 },
  stepNumTxt:      { fontSize: 13, fontWeight: "900", color: "#000" },
  stepTitle:       { fontSize: 14, fontWeight: "700", color: C.text, marginBottom: 4 },
  stepDesc:        { fontSize: 12, color: C.textMuted, lineHeight: 18, marginBottom: 10 },
  ccpBox:          { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12 },
  ccpNumber:       { fontSize: 15, fontWeight: "900", color: C.accent, letterSpacing: 1 },
  // ← Photo picker
  photoPickerBtn:  { borderWidth: 2, borderColor: C.accent + "50", borderStyle: "dashed", borderRadius: 12, padding: 20, alignItems: "center", gap: 8, backgroundColor: C.accent + "08" },
  photoPickerTxt:  { fontSize: 14, fontWeight: "700", color: C.accent },
  photoPickerSub:  { fontSize: 11, color: C.textDim },
  receiptPreview:  { borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: C.border },
  receiptImg:      { width: "100%", height: 180 },
  changePhotoBtn:  { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, padding: 10, backgroundColor: C.surface },
  changePhotoTxt:  { fontSize: 13, color: C.accent, fontWeight: "600" },
  // ← CTA
  cta:             { backgroundColor: C.accent, borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 8 },
  ctaDone:         { backgroundColor: C.success + "15", borderWidth: 1, borderColor: C.success + "30" },
  ctaDisabled:     { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  ctaTxt:          { fontSize: 15, fontWeight: "800", color: "#000" },
  photoRequired:   { textAlign: "center", fontSize: 12, color: C.warning, marginBottom: 16 },
  contactRow:      { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 12 },
  contactTxt:      { fontSize: 13, color: C.success, fontWeight: "600" },

  // ── Plan picker ─────────────────────────────────────────────────────────
  sectionLabel:    { fontSize: 12, fontWeight: "800", color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  plansRow:        { flexDirection: "row", gap: 10, marginBottom: 16 },
  planOpt:         { flex: 1, backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border, borderRadius: 16, padding: 14, position: "relative" },
  planOptOn:       { borderColor: C.accent, backgroundColor: C.accent + "10" },
  planOptCheck:    { position: "absolute", top: 10, right: 10, width: 22, height: 22, borderRadius: 11, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" },
  planBadge:       { alignSelf: "flex-start", backgroundColor: C.success + "20", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8 },
  planBadgeTxt:    { fontSize: 9, fontWeight: "900", color: C.success, letterSpacing: 0.4 },
  planOptLabel:    { fontSize: 14, fontWeight: "900", color: C.text, marginBottom: 6 },
  planOptPriceRow: { flexDirection: "row", alignItems: "baseline", gap: 4, marginBottom: 4 },
  planOptPrice:    { fontSize: 22, fontWeight: "900", color: C.accent },
  planOptUnit:     { fontSize: 11, color: C.textMuted, fontWeight: "700" },
  planOptTotal:    { fontSize: 11, color: C.textMuted, fontWeight: "600", marginBottom: 6 },
  planOptDesc:     { fontSize: 10, color: C.textDim, lineHeight: 14 },
});