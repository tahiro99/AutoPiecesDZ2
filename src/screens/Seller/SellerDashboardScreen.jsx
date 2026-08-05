// src/screens/Seller/SellerDashboardScreen.jsx
import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, Modal, TextInput, Image, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { doc, deleteDoc, updateDoc } from "firebase/firestore";
import { useLanguage } from "../../i18n/languagecontext";
import { createNotif } from "../../services/Notif.service";
import { db } from "../../config/firebase";
import { C } from "../../constants/theme";
import { useCollection } from "../../hooks/useCollection";
import { useAuthContext } from "../../context/AuthContext";
import ScreenHeader from "../../components/ScreenHeader";
import Tag from "../../components/Tag";
import Spinner from "../../components/Spinner";
import SubscriptionBanner from "../../components/SubscriptionBanner";
import { useSubscription } from "../../hooks/useSubscription";
import { CATEGORIES } from "../../constants/categories";
import { WILAYAS } from "../../constants/wilayas";
import { useEffect } from "react";
import { collection, getCountFromServer, query, where } from "firebase/firestore";

const WILAYAS_LIST = WILAYAS || ["Alger","Oran","Constantine","Blida","Sétif","Annaba","Tlemcen","Batna"];

const STATUS_COLORS = {
  pending:   C.warning,
  confirmed: C.info,
  shipping:  C.accent,
  delivered: C.success,
  archived:  C.textDim,
};

const getStatusLabels = (t) => ({
  pending:   t?.("pending")   || "En attente",
  confirmed: t?.("confirmed") || "Confirmée",
  shipping:  t?.("shipping")  || "En livraison",
  delivered: t?.("delivered") || "Livrée",
  archived:  t?.("archived")  || "Archivée",
});

const PAYMENT_LABELS = { cash: "Cash à la livraison", cib: "CIB", dahabia: "Dahabia CCP" };

// ── ORDER CARD ────────────────────────────────────────────────────
function OrderCard({ order, onStatusChange, onArchive, t }) {
  const [expanded, setExpanded] = useState(false);
  const statusColor  = STATUS_COLORS[order.status] || C.textDim;
  const STATUS_LABELS = getStatusLabels(t);
  const statusLabel  = STATUS_LABELS[order.status] || order.status;
  const NEXT_STEPS   = {
    pending:   { label: "Confirmer",      next: "confirmed", icon: "checkmark-circle-outline", color: C.info    },
    confirmed: { label: "En livraison",   next: "shipping",  icon: "car-outline",              color: C.accent  },
    shipping:  { label: "Marquer livrée", next: "delivered", icon: "checkmark-done-outline",   color: C.success },
  };
  const nextStep = NEXT_STEPS[order.status];

  return (
    <View style={oc.card}>
      <TouchableOpacity onPress={() => setExpanded(!expanded)} style={oc.header} activeOpacity={0.8}>
        <View style={oc.headerLeft}>
          <View style={oc.itemImg}>
            <Text style={oc.itemLetter}>{order.listingTitle?.[0]?.toUpperCase() || "P"}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={oc.itemTitle} numberOfLines={1}>{order.listingTitle}</Text>
            <Text style={oc.itemPrice}>{(order.price || 0).toLocaleString()} DA</Text>
          </View>
        </View>
        <View style={oc.headerRight}>
          <View style={[oc.statusBadge, { backgroundColor: statusColor + "20", borderColor: statusColor + "50" }]}>
            <Text style={[oc.statusTxt, { color: statusColor }]}>{statusLabel}</Text>
          </View>
          <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={16} color={C.textDim} style={{ marginTop: 6 }} />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={oc.details}>
          <View style={oc.divider} />
          <Text style={oc.secLabel}>CLIENT</Text>
          <View style={oc.infoGrid}>
            <View style={oc.infoRow}><Ionicons name="person-outline" size={14} color={C.textDim} /><Text style={oc.infoTxt}>{order.buyerName || "Client anonyme"}</Text></View>
            <View style={oc.infoRow}><Ionicons name="call-outline" size={14} color={C.textDim} /><Text style={oc.infoTxt}>{order.buyerPhone || order.phone || "—"}</Text></View>
            <View style={oc.infoRow}><Ionicons name="mail-outline" size={14} color={C.textDim} /><Text style={oc.infoTxt}>{order.buyerEmail || "—"}</Text></View>
          </View>
          <Text style={[oc.secLabel, { marginTop: 10 }]}>LIVRAISON</Text>
          <View style={oc.infoGrid}>
            <View style={oc.infoRow}><Ionicons name="location-outline" size={14} color={C.textDim} /><Text style={oc.infoTxt}>{order.wilaya || "—"}</Text></View>
            <View style={oc.infoRow}><Ionicons name="home-outline" size={14} color={C.textDim} /><Text style={oc.infoTxt} numberOfLines={2}>{order.address || "—"}</Text></View>
          </View>
          <Text style={[oc.secLabel, { marginTop: 10 }]}>PAIEMENT</Text>
          <View style={oc.infoRow}><Ionicons name="card-outline" size={14} color={C.textDim} /><Text style={oc.infoTxt}>{PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod || "—"}</Text></View>
          <View style={oc.totalRow}>
            <Text style={oc.totalLabel}>Total reçu</Text>
            <Text style={oc.totalVal}>{((order.price || 0) + (order.deliveryFee || 0)).toLocaleString()} DA</Text>
          </View>
          {order.createdAt?.seconds && (
            <Text style={oc.dateTxt}>Commandé le {new Date(order.createdAt.seconds * 1000).toLocaleDateString("fr-DZ")}</Text>
          )}
          <View style={oc.btnRow}>
            {nextStep && (
              <TouchableOpacity onPress={() => onStatusChange(order.id, nextStep.next)}
                style={[oc.actionBtn, { backgroundColor: nextStep.color + "20", borderColor: nextStep.color + "50" }]} activeOpacity={0.8}>
                <Ionicons name={nextStep.icon} size={16} color={nextStep.color} />
                <Text style={[oc.actionTxt, { color: nextStep.color }]}>{nextStep.label}</Text>
              </TouchableOpacity>
            )}
            {order.status !== "archived" && (
              <TouchableOpacity onPress={() => onArchive(order)} style={oc.archiveBtn} activeOpacity={0.8}>
                <Ionicons name="archive-outline" size={16} color={C.textMuted} />
                <Text style={oc.archiveTxt}>Archiver</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

// ── EDIT LISTING MODAL ────────────────────────────────────────────
function EditListingModal({ listing, onClose, onSaved }) {
  const [title, setTitle]       = useState(listing?.title || "");
  const [price, setPrice]       = useState(String(listing?.price || ""));
  const [stock, setStock]       = useState(String(listing?.stock || "1"));
  const [desc, setDesc]         = useState(listing?.description || "");
  const [cond, setCond]         = useState(listing?.condition || "Neuf");
  const [wilaya, setWilaya]     = useState(listing?.wilaya || "Alger");
  const [brand, setBrand]       = useState(listing?.brand || "");
  const [model, setModel]       = useState(listing?.model || "");
  const [saving, setSaving]     = useState(false);

  const handleSave = async () => {
    if (!title.trim()) { Alert.alert("", "Le titre est obligatoire"); return; }
    if (!price)        { Alert.alert("", "Le prix est obligatoire");  return; }
    setSaving(true);
    try {
      await updateDoc(doc(db, "listings", listing.id), {
        title:       title.trim(),
        price:       parseInt(price) || 0,
        stock:       parseInt(stock) || 1,
        description: desc.trim(),
        condition:   cond,
        wilaya,
        brand:       brand.trim(),
        model:       model.trim(),
        updatedAt:   new Date().toISOString(),
      });
      Alert.alert("✅", "Annonce modifiée avec succès", [{ text: "OK", onPress: onSaved }]);
    } catch (e) {
      console.log("[edit listing]", e?.code, e?.message);
      Alert.alert("Erreur", "Impossible de modifier l'annonce. Réessayez.");
    }
    setSaving(false);
  };

  return (
    <Modal visible animationType="slide" transparent>
      <View style={em.bg}>
        <View style={em.box}>
          <View style={em.hdr}>
            <Text style={em.title}>✏️ Modifier l'annonce</Text>
            <TouchableOpacity onPress={onClose} style={em.close}>
              <Ionicons name="close" size={20} color={C.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ padding: 16 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            <Text style={em.lbl}>Titre *</Text>
            <TextInput style={em.inp} value={title} onChangeText={setTitle} placeholder="Titre de l'annonce" placeholderTextColor={C.textDim} />

            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={em.lbl}>Prix (DA) *</Text>
                <TextInput style={em.inp} value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="0" placeholderTextColor={C.textDim} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={em.lbl}>Stock</Text>
                <TextInput style={em.inp} value={stock} onChangeText={setStock} keyboardType="numeric" placeholder="1" placeholderTextColor={C.textDim} />
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={em.lbl}>Marque</Text>
                <TextInput style={em.inp} value={brand} onChangeText={setBrand} placeholder="Ex: Peugeot" placeholderTextColor={C.textDim} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={em.lbl}>Modèle</Text>
                <TextInput style={em.inp} value={model} onChangeText={setModel} placeholder="Ex: 208" placeholderTextColor={C.textDim} />
              </View>
            </View>

            <Text style={em.lbl}>État</Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
              {["Neuf", "Occasion"].map(c => (
                <TouchableOpacity key={c} onPress={() => setCond(c)}
                  style={[em.chip, cond === c && em.chipOn]}>
                  <Text style={[em.chipTxt, cond === c && { color: C.accent }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={em.lbl}>Wilaya</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {WILAYAS_LIST.slice(0, 20).map(w => (
                  <TouchableOpacity key={w} onPress={() => setWilaya(w)}
                    style={[em.chip, wilaya === w && em.chipOn]}>
                    <Text style={[em.chipTxt, wilaya === w && { color: C.accent }]}>{w}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={em.lbl}>Description</Text>
            <TextInput
              style={[em.inp, { minHeight: 80, textAlignVertical: "top", paddingTop: 12 }]}
              value={desc}
              onChangeText={setDesc}
              placeholder="Décrivez votre pièce..."
              placeholderTextColor={C.textDim}
              multiline
            />

            <TouchableOpacity style={[em.saveBtn, saving && { opacity: 0.7 }]}
              onPress={handleSave} disabled={saving} activeOpacity={0.8}>
              {saving
                ? <ActivityIndicator color="#000" />
                : <><Ionicons name="checkmark-circle" size={18} color="#000" />
                    <Text style={em.saveTxt}>Enregistrer les modifications</Text></>
              }
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── MAIN SCREEN ───────────────────────────────────────────────────
export default function SellerDashboardScreen({ navigation }) {
  const { t, isRTL } = useLanguage();
  const { isExpired, daysLeft, isTrial } = useSubscription();
  const STATUS_LABELS = getStatusLabels(t);
  const { user }                           = useAuthContext();
  const { data: listings, loading: loadL } = useCollection("listings");
  const { data: orders,   loading: loadO } = useCollection("orders");
  const { data: convs }                    = useCollection("conversations");

  const [activeTab, setActiveTab]         = useState("orders");
  const [editingListing, setEditingListing] = useState(null);

  const uid        = user?.uid || "";
  const myListings = (listings || []).filter(l => l.sellerId === uid);
  const myOrders   = (orders   || []).filter(o => o.sellerId === uid);
  const myConvs    = (convs    || []).filter(c => c.participants?.includes(uid));

  const activeOrders   = myOrders.filter(o => o.status !== "archived");
  const archivedOrders = myOrders.filter(o => o.status === "archived");
  const pendingCount   = myOrders.filter(o => o.status === "pending").length;
  const revenue        = myOrders.filter(o => ["delivered","archived"].includes(o.status)).reduce((s,o) => s+(o.price||0), 0);

  const STATUS_NOTIF_BODY = {
    confirmed: "Votre commande a été confirmée ✅",
    shipping:  "Votre commande est en route ! 🚚",
    delivered: "Votre commande a été livrée ! 🎉",
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await updateDoc(doc(db, "orders", orderId), { status: newStatus });
      const order = myOrders.find(o => o.id === orderId);
      if (order?.buyerId && STATUS_NOTIF_BODY[newStatus]) {
        createNotif(order.buyerId, { type: "livraison", title: "Commande mise à jour", body: STATUS_NOTIF_BODY[newStatus], data: { screen: "Orders" } }).catch(() => {});
      }
    } catch (e) {
      Alert.alert("Erreur", "Impossible de mettre à jour la commande.");
    }
  };

  const handleArchive = order => {
    Alert.alert("Archiver la commande", `Archiver "${order.listingTitle}" ?`, [
      { text: "Annuler", style: "cancel" },
      { text: "Archiver", onPress: async () => {
        try { await updateDoc(doc(db, "orders", order.id), { status: "archived" }); }
        catch (e) { Alert.alert("Erreur", "Impossible d'archiver."); }
      }},
    ]);
  };

  const handleDeleteListing = listing => {
    Alert.alert("Supprimer l'annonce", `Supprimer "${listing.title}" ?`, [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: async () => {
        try { await deleteDoc(doc(db, "listings", listing.id)); }
        catch (e) { Alert.alert("Erreur", "Impossible de supprimer"); }
      }},
    ]);
  };

  // ── FIX: navigation vers CreateListing ──
  const goToCreate = () => {
    try {
      navigation.navigate("CreateListing");
    } catch {
      navigation.getParent()?.navigate("CreateListing");
    }
  };

  const stats = [
    { num: activeOrders.length,      label: "Commandes",  icon: "cube-outline",      color: C.success },
    { num: pendingCount,             label: "En attente", icon: "time-outline",      color: C.warning },
    { num: myListings.length,        label: "Annonces",   icon: "megaphone-outline", color: C.accent  },
    { num: revenue.toLocaleString(), label: "CA (DA)",    icon: "cash-outline",      color: C.info    },
  ];

  const TABS = [
    { id: "orders",   label: "Commandes",  icon: "cube-outline",        count: activeOrders.length },
    { id: "listings", label: "Annonces",   icon: "megaphone-outline",   count: myListings.length   },
    { id: "messages", label: "Messages",   icon: "chatbubbles-outline", count: myConvs.length      },
  ];

  return (
    <View style={s.container}>
      <ScreenHeader title="Dashboard Vendeur" />
      <SubscriptionBanner navigation={navigation} />

      {/* ── BLOCAGE ABONNEMENT EXPIRÉ ── */}
      {isExpired ? (
        <View style={sb.container}>
          <View style={sb.icon}>
            <Ionicons name="lock-closed" size={48} color={C.danger} />
          </View>
          <Text style={sb.title}>Abonnement expiré</Text>
          <Text style={sb.sub}>
            Renouvelez votre abonnement pour accéder à votre dashboard et continuer à vendre.
          </Text>
          <View style={sb.priceBox}>
            <Text style={sb.priceLabel}>Abonnement mensuel</Text>
            <Text style={sb.price}>500 DA <Text style={sb.priceSub}>/mois</Text></Text>
          </View>
          <TouchableOpacity
            style={sb.btn}
            onPress={() => navigation.navigate("Subscription")}
            activeOpacity={0.85}>
            <Ionicons name="refresh-outline" size={18} color="#000" />
            <Text style={sb.btnTxt}>Renouveler maintenant</Text>
          </TouchableOpacity>
          <Text style={sb.ccp}>Paiement par CCP · 0027890277 23</Text>
        </View>
      ) : (
      <ScrollView showsVerticalScrollIndicator={false}>
        {pendingCount > 0 && (
          <View style={s.alertBanner}>
            <Ionicons name="alert-circle" size={18} color="#000" />
            <Text style={s.alertTxt}>{pendingCount} commande{pendingCount > 1 ? "s" : ""} en attente de confirmation !</Text>
          </View>
        )}

        <View style={s.statsGrid}>
          {stats.map(st => (
            <View key={st.label} style={s.statCard}>
              <View style={[s.statIcon, { backgroundColor: st.color + "18" }]}>
                <Ionicons name={st.icon} size={20} color={st.color} />
              </View>
              <Text style={[s.statNum, { color: st.color }]}>{st.num}</Text>
              <Text style={s.statLabel}>{st.label}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity onPress={goToCreate} style={s.publishBtn} activeOpacity={0.85}>
          <Ionicons name="add-circle-outline" size={20} color="#000" />
          <Text style={s.publishTxt}>Publier une nouvelle annonce</Text>
        </TouchableOpacity>

        <View style={s.tabRow}>
          {TABS.map(tab => (
            <TouchableOpacity key={tab.id} onPress={() => setActiveTab(tab.id)}
              style={[s.tab, activeTab === tab.id && s.tabActive]} activeOpacity={0.8}>
              <Ionicons name={tab.icon} size={14} color={activeTab === tab.id ? C.accent : C.textDim} />
              <Text style={[s.tabTxt, activeTab === tab.id && s.tabTxtActive]}>{tab.label}</Text>
              {tab.count > 0 && (
                <View style={[s.tabBadge, activeTab === tab.id && s.tabBadgeActive]}>
                  <Text style={[s.tabBadgeTxt, activeTab === tab.id && { color: C.accent }]}>{tab.count}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* ── COMMANDES ── */}
        {activeTab === "orders" && (
          <View style={s.tabContent}>
            {loadO ? <Spinner /> : activeOrders.length === 0 ? (
              <View style={s.emptyBlock}>
                <Ionicons name="cube-outline" size={40} color={C.textDim} />
                <Text style={s.emptyTitle}>Aucune commande active</Text>
                <Text style={s.emptySub}>Les commandes clients apparaîtront ici</Text>
              </View>
            ) : (
              <>
                {["pending","confirmed","shipping","delivered"].map(status => {
                  const group = activeOrders.filter(o => o.status === status);
                  if (!group.length) return null;
                  return (
                    <View key={status}>
                      <View style={s.groupHeader}>
                        <View style={[s.groupDot, { backgroundColor: STATUS_COLORS[status] }]} />
                        <Text style={s.groupTitle}>{STATUS_LABELS[status]} ({group.length})</Text>
                      </View>
                      {group.map(order => (
                        <OrderCard key={order.id} order={order} t={t}
                          onStatusChange={handleStatusChange} onArchive={handleArchive} />
                      ))}
                    </View>
                  );
                })}
                {archivedOrders.length > 0 && (
                  <View style={[s.archivedSection, { opacity: 0.6 }]}>
                    <View style={s.groupHeader}>
                      <Ionicons name="archive-outline" size={14} color={C.textDim} />
                      <Text style={[s.groupTitle, { color: C.textDim }]}>Archivées ({archivedOrders.length})</Text>
                    </View>
                    {archivedOrders.map(order => (
                      <View key={order.id} style={s.archivedCard}>
                        <Text style={s.archivedTitle} numberOfLines={1}>{order.listingTitle}</Text>
                        <Text style={s.archivedMeta}>{order.wilaya} · {(order.price||0).toLocaleString()} DA</Text>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {/* ── ANNONCES ── */}
        {activeTab === "listings" && (
          <View style={s.tabContent}>
            {loadL ? <Spinner /> : myListings.length === 0 ? (
              <View style={s.emptyBlock}>
                <Ionicons name="megaphone-outline" size={40} color={C.textDim} />
                <Text style={s.emptyTitle}>Aucune annonce</Text>
                <TouchableOpacity onPress={goToCreate} style={{ marginTop: 10 }}>
                  <Text style={{ color: C.accent, fontWeight: "800", fontSize: 14 }}>Publier maintenant →</Text>
                </TouchableOpacity>
              </View>
            ) : (
              myListings.map(l => (
                <View key={l.id} style={s.listingCard}>
                  {/* ── Image ou lettre ── */}
                  <View style={s.listingImg}>
                    {l.photos?.[0] || (l.img?.startsWith?.("http"))
                      ? <Image source={{ uri: l.photos?.[0] || l.img }} style={s.listingImgPhoto} />
                      : <Text style={{ fontSize: 20, color: C.accent, fontWeight: "900" }}>{l.title?.[0]?.toUpperCase() || "P"}</Text>
                    }
                  </View>

                  <View style={s.listingInfo}>
                    <Text style={s.listingTitle} numberOfLines={1}>{l.title}</Text>
                    <Text style={s.listingPrice}>{(l.price || 0).toLocaleString()} DA</Text>
                    <View style={{ flexDirection: "row", gap: 6, alignItems: "center", marginTop: 4 }}>
                      <Tag color={l.condition === "Neuf" ? C.success : C.info}>{l.condition || "N/A"}</Tag>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                        <Ionicons name="eye-outline" size={11} color={C.textMuted} />
                        <Text style={{ fontSize: 10, color: C.textMuted }}>{l.views || 0}</Text>
                      </View>
                      <Text style={[s.stockTxt, { color: (l.stock||0) <= 2 ? C.danger : C.success }]}>
                        {l.stock || 0} dispo
                      </Text>
                    </View>
                  </View>

                  {/* ── Boutons modifier + supprimer ── */}
                  <View style={{ gap: 6 }}>
                    <TouchableOpacity onPress={() => setEditingListing(l)}
                      style={s.editBtn} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
                      <Ionicons name="pencil-outline" size={16} color={C.accent} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteListing(l)}
                      style={s.deleteBtn} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
                      <Ionicons name="trash-outline" size={16} color={C.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* ── MESSAGES ── */}
        {activeTab === "messages" && (
          <View style={s.tabContent}>
            {myConvs.length === 0 ? (
              <View style={s.emptyBlock}>
                <Ionicons name="chatbubbles-outline" size={40} color={C.textDim} />
                <Text style={s.emptyTitle}>Aucun message</Text>
              </View>
            ) : (
              <View style={s.menuBlock}>
                {myConvs.map((c, i) => (
                  <TouchableOpacity key={c.id}
                    onPress={() => navigation.navigate("Chat", {
                      conversationId: c.id,
                      sellerName: c.buyerName || "Client",
                      listingTitle: c.listingTitle,
                      listingPrice: c.listingPrice,
                    })}
                    style={[s.msgRow, i < myConvs.length - 1 && s.msgRowBorder]}
                    activeOpacity={0.8}>
                    <View style={s.msgAvatar}>
                      <Text style={s.msgAvatarTxt}>{(c.buyerName || c.sellerName || "C")[0].toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: "700", color: C.text }}>{c.buyerName || c.sellerName || "Client"}</Text>
                      <Text style={{ fontSize: 11, color: C.textMuted }} numberOfLines={1}>{c.listingTitle || "Nouvelle conversation"}</Text>
                    </View>
                    {c.unread > 0 && (
                      <View style={s.unreadBadge}><Text style={s.unreadTxt}>{c.unread}</Text></View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
      )}

      {/* ── MODAL MODIFIER ANNONCE ── */}
      {editingListing && (
        <EditListingModal
          listing={editingListing}
          onClose={() => setEditingListing(null)}
          onSaved={() => setEditingListing(null)}
        />
      )}
    </View>
  );
}

// ── STYLES ────────────────────────────────────────────────────────
const sb = StyleSheet.create({
  container: { flex:1, alignItems:"center", justifyContent:"center", padding:32, paddingTop:60 },
  icon:      { width:90, height:90, borderRadius:45, backgroundColor:C.danger+"15", borderWidth:2, borderColor:C.danger+"40", alignItems:"center", justifyContent:"center", marginBottom:20 },
  title:     { fontSize:22, fontWeight:"900", color:C.text, marginBottom:10 },
  sub:       { fontSize:14, color:C.textMuted, textAlign:"center", lineHeight:22, marginBottom:24 },
  priceBox:  { backgroundColor:C.surface, borderRadius:16, borderWidth:1, borderColor:C.border, padding:20, alignItems:"center", marginBottom:24, width:"100%" },
  priceLabel:{ fontSize:12, color:C.textMuted, fontWeight:"700", textTransform:"uppercase", letterSpacing:0.5, marginBottom:8 },
  price:     { fontSize:32, fontWeight:"900", color:C.accent },
  priceSub:  { fontSize:16, fontWeight:"600", color:C.textMuted },
  btn:       { flexDirection:"row", alignItems:"center", gap:10, backgroundColor:C.accent, borderRadius:14, paddingVertical:14, paddingHorizontal:28, marginBottom:16 },
  btnTxt:    { fontSize:15, fontWeight:"900", color:"#000" },
  ccp:       { fontSize:12, color:C.textDim },
});

const oc = StyleSheet.create({
  card:        { backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, marginBottom: 10, overflow: "hidden" },
  header:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14 },
  headerLeft:  { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  headerRight: { alignItems: "flex-end", gap: 2 },
  itemImg:     { width: 44, height: 44, borderRadius: 12, backgroundColor: C.surfaceAlt, alignItems: "center", justifyContent: "center" },
  itemLetter:  { fontSize: 20, fontWeight: "900", color: C.accent },
  itemTitle:   { fontSize: 13, fontWeight: "700", color: C.text, marginBottom: 2, maxWidth: 160 },
  itemPrice:   { fontSize: 15, fontWeight: "900", color: C.accent },
  statusBadge: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  statusTxt:   { fontSize: 10, fontWeight: "800" },
  divider:     { height: 1, backgroundColor: C.border },
  details:     { padding: 14 },
  secLabel:    { fontSize: 9, fontWeight: "800", color: C.textDim, letterSpacing: 0.8, marginBottom: 8, textTransform: "uppercase" },
  infoGrid:    { gap: 6, marginBottom: 2 },
  infoRow:     { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  infoTxt:     { fontSize: 13, color: C.text, flex: 1 },
  totalRow:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: C.surfaceAlt, borderRadius: 10, padding: 12, marginTop: 12, marginBottom: 8 },
  totalLabel:  { fontSize: 13, color: C.textMuted, fontWeight: "700" },
  totalVal:    { fontSize: 18, fontWeight: "900", color: C.accent },
  dateTxt:     { fontSize: 11, color: C.textDim, marginBottom: 12 },
  btnRow:      { flexDirection: "row", gap: 10, marginTop: 4 },
  actionBtn:   { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderRadius: 10, paddingVertical: 10 },
  actionTxt:   { fontSize: 12, fontWeight: "800" },
  archiveBtn:  { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 },
  archiveTxt:  { fontSize: 12, fontWeight: "700", color: C.textMuted },
});

const em = StyleSheet.create({
  bg:      { flex: 1, backgroundColor: "rgba(0,0,0,.6)", justifyContent: "flex-end" },
  box:     { backgroundColor: C.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "92%", borderTopWidth: 1, borderColor: C.border },
  hdr:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, borderBottomWidth: 1, borderBottomColor: C.border },
  title:   { fontSize: 18, fontWeight: "800", color: C.text },
  close:   { width: 32, height: 32, borderRadius: 16, backgroundColor: C.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.border },
  lbl:     { fontSize: 11, fontWeight: "700", color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  inp:     { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, color: C.text, fontSize: 14, marginBottom: 14 },
  chip:    { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface },
  chipOn:  { borderColor: C.accent, backgroundColor: C.accent + "15" },
  chipTxt: { fontSize: 12, fontWeight: "700", color: C.textMuted },
  saveBtn: { backgroundColor: C.accent, borderRadius: 14, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 4 },
  saveTxt: { fontSize: 15, fontWeight: "800", color: "#000" },
});

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: C.bg },
  alertBanner:     { flexDirection: "row", alignItems: "center", gap: 10, margin: 14, marginBottom: 0, backgroundColor: C.accent, borderRadius: 14, padding: 14 },
  alertTxt:        { flex: 1, fontSize: 13, fontWeight: "700", color: "#000" },
  statsGrid:       { flexDirection: "row", flexWrap: "wrap", gap: 10, padding: 14 },
  statCard:        { width: "47%", backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14, alignItems: "center", gap: 4 },
  statIcon:        { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  statNum:         { fontSize: 24, fontWeight: "900" },
  statLabel:       { fontSize: 9, color: C.textMuted, fontWeight: "700", textTransform: "uppercase" },
  publishBtn:      { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: C.accent, borderRadius: 14, marginHorizontal: 14, paddingVertical: 14, marginBottom: 14 },
  publishTxt:      { fontSize: 14, fontWeight: "900", color: "#000" },
  tabRow:          { flexDirection: "row", marginHorizontal: 14, marginBottom: 14, backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 4 },
  tab:             { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 9, borderRadius: 10 },
  tabActive:       { backgroundColor: C.accent + "15", borderWidth: 1, borderColor: C.accent + "30" },
  tabTxt:          { fontSize: 10, fontWeight: "700", color: C.textDim, textTransform: "uppercase" },
  tabTxtActive:    { color: C.accent },
  tabBadge:        { backgroundColor: C.border, borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
  tabBadgeActive:  { backgroundColor: C.accent + "25" },
  tabBadgeTxt:     { fontSize: 9, fontWeight: "900", color: C.textDim },
  tabContent:      { paddingHorizontal: 14 },
  groupHeader:     { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8, marginTop: 4 },
  groupDot:        { width: 8, height: 8, borderRadius: 4 },
  groupTitle:      { fontSize: 11, fontWeight: "800", color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
  archivedSection: { marginTop: 8 },
  archivedCard:    { backgroundColor: C.surface, borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 12, marginBottom: 6 },
  archivedTitle:   { fontSize: 12, fontWeight: "700", color: C.textMuted },
  archivedMeta:    { fontSize: 11, color: C.textDim, marginTop: 2 },
  emptyBlock:      { alignItems: "center", paddingVertical: 50, gap: 10 },
  emptyTitle:      { fontSize: 15, fontWeight: "800", color: C.text },
  emptySub:        { fontSize: 12, color: C.textMuted },
  listingCard:     { flexDirection: "row", gap: 12, alignItems: "center", backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 12, marginBottom: 8 },
  listingImg:      { width: 52, height: 52, borderRadius: 10, backgroundColor: C.surfaceAlt, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  listingImgPhoto: { width: 52, height: 52, borderRadius: 10 },
  listingInfo:     { flex: 1 },
  listingTitle:    { fontSize: 12, fontWeight: "700", color: C.text, marginBottom: 2 },
  listingPrice:    { fontSize: 14, fontWeight: "900", color: C.accent },
  stockTxt:        { fontSize: 10, fontWeight: "700" },
  editBtn:         { width: 34, height: 34, borderRadius: 9, backgroundColor: C.accent + "15", borderWidth: 1, borderColor: C.accent + "30", alignItems: "center", justifyContent: "center" },
  deleteBtn:       { width: 34, height: 34, borderRadius: 9, backgroundColor: C.danger + "12", borderWidth: 1, borderColor: C.danger + "30", alignItems: "center", justifyContent: "center" },
  menuBlock:       { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 14, overflow: "hidden" },
  msgRow:          { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  msgRowBorder:    { borderBottomWidth: 1, borderBottomColor: C.border },
  msgAvatar:       { width: 38, height: 38, borderRadius: 19, backgroundColor: C.accent + "20", borderWidth: 2, borderColor: C.accent + "40", alignItems: "center", justifyContent: "center" },
  msgAvatarTxt:    { fontSize: 15, fontWeight: "900", color: C.accent },
  unreadBadge:     { backgroundColor: C.accent, borderRadius: 10, minWidth: 20, height: 20, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  unreadTxt:       { fontSize: 10, fontWeight: "900", color: "#000" },
});