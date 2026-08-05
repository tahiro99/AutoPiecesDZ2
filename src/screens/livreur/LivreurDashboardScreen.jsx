import React, { useEffect, useState, useCallback, useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Linking, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { collection, query, getDocs, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../config/firebase";
import { useAuthContext } from "../../context/AuthContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C } from "../../constants/theme";

const DELIVERY_STATUSES = {
  pending:    { label: "À ramasser",   color: "#F59E0B", next: "assigned"   },
  assigned:   { label: "Assignée",     color: "#4C9EFF", next: "picked_up"  },
  picked_up:  { label: "Récupérée",    color: "#F0A500", next: "in_transit" },
  in_transit: { label: "En livraison", color: "#FF6B35", next: "delivered"  },
  delivered:  { label: "Livrée",       color: "#0ECB81", next: null         },
  returned:   { label: "Retournée",    color: "#F6465D", next: null         },
};

export default function LivreurDashboardScreen() {
  const { user, profile } = useAuthContext();
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("active"); // active | delivered | all
  const [tracking, setTracking] = useState({});

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const s = await getDocs(query(collection(db, "orders")));
      setOrders(s.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      Alert.alert("Erreur", "Chargement impossible");
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let list = orders;
    if (filter === "active") list = list.filter(o => (o.deliveryStatus || "pending") !== "delivered" && o.deliveryStatus !== "returned");
    else if (filter === "delivered") list = list.filter(o => o.deliveryStatus === "delivered");
    return list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  }, [orders, filter]);

  const totals = useMemo(() => ({
    pending: orders.filter(o => !o.deliveryStatus || o.deliveryStatus === "pending").length,
    inProgress: orders.filter(o => o.deliveryStatus && !["pending", "delivered", "returned"].includes(o.deliveryStatus)).length,
    delivered: orders.filter(o => o.deliveryStatus === "delivered").length,
    revenue: orders.filter(o => o.deliveryStatus === "delivered").reduce((s, o) => s + (o.deliveryFee || 0), 0),
  }), [orders]);

  const updateStatus = async (orderId, newStatus) => {
    try {
      const t = tracking[orderId];
      const payload = {
        deliveryStatus: newStatus,
        deliveryPartner: profile?.email || "partner",
        deliveryUpdatedAt: serverTimestamp(),
      };
      if (t) payload.trackingId = t;
      if (newStatus === "delivered") {
        payload.status = "delivered";
        payload.deliveredAt = serverTimestamp();
      }
      await updateDoc(doc(db, "orders", orderId), payload);
      Alert.alert("✓", "Statut mis à jour");
      load();
    } catch (e) {
      Alert.alert("Erreur", e.message);
    }
  };

  const call = (phone) => phone && Linking.openURL(`tel:${phone}`);
  const openMap = (lat, lng) => Linking.openURL(`https://www.google.com/maps?q=${lat},${lng}`);

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <View>
          <Text style={s.hLabel}>PARTENAIRE LIVRAISON</Text>
          <Text style={s.hTitle}>📦 Livraisons</Text>
          <Text style={s.hSub}>{profile?.displayName} · {profile?.wilaya || "—"}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
        {/* KPIs */}
        <View style={s.kpis}>
          {[
            { i: "⏳", n: totals.pending, l: "À ramasser", c: "#F59E0B" },
            { i: "🚚", n: totals.inProgress, l: "En cours", c: C.accent },
            { i: "✅", n: totals.delivered, l: "Livrées", c: "#0ECB81" },
            { i: "💰", n: totals.revenue.toLocaleString() + " DA", l: "CA", c: C.accent },
          ].map(k => (
            <View key={k.l} style={s.kCard}>
              <Text style={s.kIcon}>{k.i}</Text>
              <Text style={[s.kNum, { color: k.c }]}>{k.n}</Text>
              <Text style={s.kLabel}>{k.l}</Text>
            </View>
          ))}
        </View>

        {/* Filtres */}
        <View style={s.filters}>
          {[["active", "Actives"], ["delivered", "Livrées"], ["all", "Tout"]].map(([k, label]) => (
            <TouchableOpacity key={k} onPress={() => setFilter(k)}
              style={[s.fBtn, filter === k && s.fBtnOn]}>
              <Text style={[s.fTxt, filter === k && s.fTxtOn]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.count}>{filtered.length} commande{filtered.length !== 1 ? "s" : ""}</Text>

        {loading ? (
          <ActivityIndicator color={C.accent} style={{ marginTop: 40 }} />
        ) : filtered.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="cube-outline" size={50} color={C.textDim} />
            <Text style={s.emptyTxt}>Aucune commande</Text>
          </View>
        ) : filtered.map(o => {
          const ds = o.deliveryStatus || "pending";
          const st = DELIVERY_STATUSES[ds];
          return (
            <View key={o.id} style={s.card}>
              <View style={s.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardId}>#{o.id.slice(-6).toUpperCase()}</Text>
                  <Text style={s.cardTitle}>{o.listingTitle}</Text>
                </View>
                <View style={[s.badge, { backgroundColor: st.color + "20" }]}>
                  <Text style={[s.badgeTxt, { color: st.color }]}>{st.label}</Text>
                </View>
              </View>

              <View style={s.priceRow}>
                <Text style={s.priceLabel}>À encaisser</Text>
                <Text style={s.priceVal}>{(o.codAmount || o.totalPrice || o.price || 0).toLocaleString()} DA</Text>
              </View>

              {/* Pickup + Destination */}
              <View style={s.pickBox}>
                <Text style={s.pickTitle}>📤 RAMASSAGE</Text>
                <Text style={s.pickName}>{o.sellerName || "—"}</Text>
                {o.sellerPhone && (
                  <TouchableOpacity onPress={() => call(o.sellerPhone)} style={s.linkRow}>
                    <Ionicons name="call" size={14} color={C.accent} />
                    <Text style={s.linkTxt}>{o.sellerPhone}</Text>
                  </TouchableOpacity>
                )}
                <Text style={s.pickAddr}>📍 {o.pickupWilaya || o.sellerWilaya || o.wilaya || "—"}</Text>
                {o.pickupLat && o.pickupLng && (
                  <TouchableOpacity onPress={() => openMap(o.pickupLat, o.pickupLng)} style={s.mapBtn}>
                    <Ionicons name="map" size={13} color={C.accent} />
                    <Text style={s.mapTxt}>Google Maps</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={s.destBox}>
                <Text style={s.destTitle}>📥 LIVRAISON</Text>
                <Text style={s.pickName}>{o.buyerName || "—"}</Text>
                {(o.destPhone || o.buyerPhone) && (
                  <TouchableOpacity onPress={() => call(o.destPhone || o.buyerPhone)} style={s.linkRow}>
                    <Ionicons name="call" size={14} color={C.accent} />
                    <Text style={s.linkTxt}>{o.destPhone || o.buyerPhone}</Text>
                  </TouchableOpacity>
                )}
                <Text style={s.pickAddr}>📍 {o.destWilaya || o.wilaya} — {o.destAddress || o.address}</Text>
              </View>

              {/* Actions */}
              {st.next && (
                <View style={s.actions}>
                  {ds === "pending" && (
                    <TextInput
                      style={s.trackInp}
                      placeholder="N° suivi (optionnel)"
                      placeholderTextColor={C.textDim}
                      value={tracking[o.id] || ""}
                      onChangeText={(v) => setTracking({ ...tracking, [o.id]: v })}
                    />
                  )}
                  <TouchableOpacity onPress={() => updateStatus(o.id, st.next)} style={s.nextBtn}>
                    <Text style={s.nextBtnTxt}>→ {DELIVERY_STATUSES[st.next].label}</Text>
                  </TouchableOpacity>
                  {!["returned", "delivered"].includes(ds) && (
                    <TouchableOpacity onPress={() => updateStatus(o.id, "returned")} style={s.retBtn}>
                      <Text style={s.retBtnTxt}>⚠️ Retourné</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  hLabel: { fontSize: 10, fontWeight: "800", color: C.textMuted, letterSpacing: 1 },
  hTitle: { fontSize: 24, fontWeight: "900", color: C.text, marginTop: 4 },
  hSub: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  kpis: { flexDirection: "row", flexWrap: "wrap", padding: 10, gap: 8 },
  kCard: { width: "48%", backgroundColor: C.surface, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: C.border },
  kIcon: { fontSize: 18 },
  kNum: { fontSize: 20, fontWeight: "900", marginTop: 4 },
  kLabel: { fontSize: 10, color: C.textMuted, fontWeight: "700", textTransform: "uppercase", marginTop: 2 },
  filters: { flexDirection: "row", paddingHorizontal: 14, gap: 6, marginTop: 8 },
  fBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  fBtnOn: { backgroundColor: C.accent, borderColor: C.accent },
  fTxt: { fontSize: 12, fontWeight: "700", color: C.textMuted },
  fTxtOn: { color: "#000" },
  count: { fontSize: 12, color: C.textMuted, paddingHorizontal: 14, marginTop: 10, marginBottom: 8 },
  empty: { alignItems: "center", padding: 50, gap: 10 },
  emptyTxt: { color: C.textMuted, fontSize: 13 },
  card: { backgroundColor: C.surface, marginHorizontal: 14, marginBottom: 10, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  cardId: { fontSize: 10, color: C.textDim, fontWeight: "700", fontFamily: "monospace" },
  cardTitle: { fontSize: 14, fontWeight: "700", color: C.text, marginTop: 3 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeTxt: { fontSize: 10, fontWeight: "800" },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10, paddingVertical: 8, borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.border },
  priceLabel: { fontSize: 11, color: C.textMuted },
  priceVal: { fontSize: 18, fontWeight: "900", color: C.accent },
  pickBox: { backgroundColor: C.bg, borderRadius: 10, padding: 10, marginTop: 10 },
  destBox: { backgroundColor: C.bg, borderRadius: 10, padding: 10, marginTop: 8 },
  pickTitle: { fontSize: 9, fontWeight: "800", color: C.accent, letterSpacing: 0.5, marginBottom: 4 },
  destTitle: { fontSize: 9, fontWeight: "800", color: "#FF6B35", letterSpacing: 0.5, marginBottom: 4 },
  pickName: { fontSize: 13, fontWeight: "700", color: C.text },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 },
  linkTxt: { fontSize: 12, color: C.accent, fontWeight: "600" },
  pickAddr: { fontSize: 11, color: C.textMuted, marginTop: 3 },
  mapBtn: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  mapTxt: { fontSize: 11, color: C.accent, fontWeight: "700" },
  actions: { marginTop: 12, gap: 8 },
  trackInp: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 10, color: C.text, fontSize: 12 },
  nextBtn: { backgroundColor: C.accent, borderRadius: 10, padding: 12, alignItems: "center" },
  nextBtnTxt: { fontSize: 13, fontWeight: "900", color: "#000" },
  retBtn: { borderWidth: 1, borderColor: "#F6465D40", borderRadius: 10, padding: 10, alignItems: "center", backgroundColor: "#F6465D10" },
  retBtnTxt: { fontSize: 11, fontWeight: "800", color: "#F6465D" },
});