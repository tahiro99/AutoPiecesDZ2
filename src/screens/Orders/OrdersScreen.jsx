import React, { useState } from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Modal, TextInput, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../../constants/theme";
import { useAuthContext } from "../../context/AuthContext";
import { useCollection } from "../../hooks/useCollection";
import { doc, updateDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../config/firebase";
import ScreenHeader from "../../components/ScreenHeader";
import Tag from "../../components/Tag";
import Spinner from "../../components/Spinner";
import { useLanguage } from "../../i18n/languagecontext";

const STATUS_C = { pending: C.warning, confirmed: C.info, shipped: C.accent, delivered: C.success, cancelled: C.danger };
const STEPS = ["pending", "confirmed", "shipped", "delivered"];

// ── Star Rating Component ──────────────────────────────────────────
function StarRating({ value, onChange, size = 32 }) {
  return (
    <View style={{ flexDirection: "row", gap: 8, justifyContent: "center", marginVertical: 12 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity key={star} onPress={() => onChange(star)}>
          <Ionicons
            name={star <= value ? "star" : "star-outline"}
            size={size}
            color={star <= value ? "#F0A500" : C.textDim}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── Rating Modal ───────────────────────────────────────────────────
function RatingModal({ visible, order, userId, onClose, isRTL, t }) {
  const [stars, setStars]     = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving]   = useState(false);

  const handleSubmit = async () => {
    if (stars === 0) {
      Alert.alert(isRTL ? "اختر تقييماً" : "Choisissez une note");
      return;
    }
    setSaving(true);
    try {
      // Save rating
      await addDoc(collection(db, "ratings"), {
        orderId:    order.id,
        sellerId:   order.sellerId,
        buyerId:    userId,
        sellerName: order.sellerName,
        buyerName:  order.buyerName || "",
        listing:    order.listingTitle,
        stars,
        comment:    comment.trim(),
        createdAt:  serverTimestamp(),
      });

      // Mark order as rated
      await updateDoc(doc(db, "orders", order.id), { rated: true });

      // Update seller rating in users collection
      // Get all ratings for this seller and compute average
      Alert.alert(
        isRTL ? "شكراً!" : "Merci !",
        isRTL ? "تم إرسال تقييمك." : "Votre avis a été envoyé.",
        [{ text: "OK", onPress: onClose }]
      );
    } catch (e) {
      Alert.alert(isRTL ? "خطأ" : "Erreur", e.message);
    }
    setSaving(false);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={rm.overlay}>
        <View style={rm.sheet}>
          <View style={rm.handle} />
          <Text style={rm.title}>{isRTL ? "قيّم البائع" : "Noter le vendeur"}</Text>
          <Text style={rm.sellerName}>{order?.sellerName}</Text>
          <Text style={rm.listing} numberOfLines={1}>{order?.listingTitle}</Text>

          <StarRating value={stars} onChange={setStars} />

          <Text style={rm.label}>{isRTL ? "تعليق (اختياري)" : "Commentaire (optionnel)"}</Text>
          <TextInput
            style={[rm.input, { textAlign: isRTL ? "right" : "left" }]}
            placeholder={isRTL ? "شاركنا تجربتك..." : "Partagez votre expérience..."}
            placeholderTextColor={C.textDim}
            value={comment}
            onChangeText={setComment}
            multiline
            maxLength={200}
          />

          <TouchableOpacity
            style={[rm.btn, stars === 0 && { opacity: 0.5 }]}
            onPress={handleSubmit}
            disabled={saving || stars === 0}>
            <Text style={rm.btnTxt}>{saving ? "..." : (isRTL ? "إرسال التقييم" : "Envoyer l'avis")}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={rm.cancelBtn}>
            <Text style={rm.cancelTxt}>{isRTL ? "إلغاء" : "Annuler"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Main Screen ───────────────────────────────────────────────────
export default function OrdersScreen({ navigation }) {
  const { t, isRTL } = useLanguage();
  const { data: orders, loading } = useCollection("orders");
  const { user } = useAuthContext();
  const USER_ID = user?.uid || "";
  const myOrders = (orders || []).filter((o) => o.buyerId === USER_ID);
  const [ratingOrder, setRatingOrder] = useState(null);

  const statusLabel = (status) => {
    const map = { pending: t("pending"), confirmed: t("confirmed"), shipped: t("shipping"), delivered: t("delivered"), cancelled: t("archived") };
    return map[status] || status;
  };

  return (
    <View style={s.container}>
      <ScreenHeader title={`${t("myOrdersTitle")} (${myOrders.length})`} onBack={() => navigation.goBack()} />

      {loading ? <Spinner /> : (
        <FlatList data={myOrders} keyExtractor={(item) => item.id}
          contentContainerStyle={s.list} showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const step = STEPS.indexOf(item.status);
            const isDelivered = item.status === "delivered";
            const alreadyRated = item.rated === true;

            return (
              <View style={s.card}>
                <View style={[s.cardTop, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <Text style={s.orderId}>#{(item.id || "").slice(-6).toUpperCase()}</Text>
                  <Tag color={STATUS_C[item.status] || C.textMuted}>{statusLabel(item.status)}</Tag>
                </View>
                <Text style={[s.itemTitle, { textAlign: isRTL ? "right" : "left" }]} numberOfLines={2}>{item.listingTitle}</Text>
                <Text style={[s.itemMeta, { textAlign: isRTL ? "right" : "left" }]}>{item.sellerName} · {item.wilaya}</Text>

                <View style={s.progressRow}>
                  {STEPS.map((st, i) => (
                    <React.Fragment key={st}>
                      <View style={[s.dot, i <= step && s.dotDone]} />
                      {i < STEPS.length - 1 ? <View style={[s.line, i < step && s.lineDone]} /> : null}
                    </React.Fragment>
                  ))}
                </View>
                <View style={s.progressLabels}>
                  {STEPS.map((st, i) => (
                    <Text key={st} style={[s.stepLabel, i <= step && { color: C.accent }]}>{statusLabel(st)}</Text>
                  ))}
                </View>

                <View style={[s.cardFooter, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <Text style={s.date}>{item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString("fr-FR") : ""}</Text>
                  <Text style={s.total}>{((item.price || 0) * (item.qty || 1)).toLocaleString()} DA</Text>
                </View>

                {/* Rating button */}
                {isDelivered && !alreadyRated && (
                  <TouchableOpacity
                    style={s.rateBtn}
                    onPress={() => setRatingOrder(item)}>
                    <Ionicons name="star-outline" size={16} color="#F0A500" />
                    <Text style={s.rateTxt}>{isRTL ? "قيّم البائع" : "Noter le vendeur"}</Text>
                  </TouchableOpacity>
                )}
                {isDelivered && alreadyRated && (
                  <View style={s.ratedBadge}>
                    <Ionicons name="star" size={14} color="#F0A500" />
                    <Text style={s.ratedTxt}>{isRTL ? "تم التقييم ✓" : "Noté ✓"}</Text>
                  </View>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="cube-outline" size={50} color={C.textDim} />
              <Text style={s.emptyTitle}>{t("noOrders")}</Text>
              <Text style={s.emptySub}>{t("noOrdersSub")}</Text>
            </View>
          } />
      )}

      {ratingOrder && (
        <RatingModal
          visible={true}
          order={ratingOrder}
          userId={USER_ID}
          isRTL={isRTL}
          t={t}
          onClose={() => setRatingOrder(null)}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: C.bg },
  list:           { padding: 12 },
  card:           { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 16, marginBottom: 12 },
  cardTop:        { justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  orderId:        { fontSize: 11, color: C.textMuted, fontWeight: "700" },
  itemTitle:      { fontSize: 14, fontWeight: "700", color: C.text, marginBottom: 4 },
  itemMeta:       { fontSize: 11, color: C.textMuted, marginBottom: 14 },
  progressRow:    { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  dot:            { width: 10, height: 10, borderRadius: 5, backgroundColor: C.border },
  dotDone:        { backgroundColor: C.accent },
  line:           { flex: 1, height: 3, backgroundColor: C.border },
  lineDone:       { backgroundColor: C.accent },
  progressLabels: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  stepLabel:      { fontSize: 8, color: C.textDim, fontWeight: "600", flex: 1, textAlign: "center" },
  cardFooter:     { justifyContent: "space-between", paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border },
  date:           { fontSize: 11, color: C.textMuted },
  total:          { fontSize: 18, fontWeight: "900", color: C.accent },
  rateBtn:        { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 12, backgroundColor: "#F0A50015", borderWidth: 1, borderColor: "#F0A50040", borderRadius: 12, paddingVertical: 10 },
  rateTxt:        { fontSize: 13, fontWeight: "800", color: "#F0A500" },
  ratedBadge:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 12, paddingVertical: 8 },
  ratedTxt:       { fontSize: 12, color: "#F0A500", fontWeight: "700" },
  empty:          { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyTitle:     { fontSize: 16, fontWeight: "800", color: C.text },
  emptySub:       { fontSize: 12, color: C.textMuted },
});

const rm = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet:      { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  handle:     { width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  title:      { fontSize: 20, fontWeight: "900", color: C.text, textAlign: "center", marginBottom: 6 },
  sellerName: { fontSize: 16, fontWeight: "800", color: C.accent, textAlign: "center", marginBottom: 4 },
  listing:    { fontSize: 12, color: C.textMuted, textAlign: "center", marginBottom: 4 },
  label:      { fontSize: 11, fontWeight: "700", color: C.textMuted, marginBottom: 8, textTransform: "uppercase" },
  input:      { backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, color: C.text, fontSize: 13, minHeight: 80, marginBottom: 16 },
  btn:        { backgroundColor: "#F0A500", borderRadius: 14, paddingVertical: 14, alignItems: "center", marginBottom: 10 },
  btnTxt:     { fontSize: 15, fontWeight: "900", color: "#000" },
  cancelBtn:  { alignItems: "center", paddingVertical: 10 },
  cancelTxt:  { fontSize: 14, color: C.textMuted },
});