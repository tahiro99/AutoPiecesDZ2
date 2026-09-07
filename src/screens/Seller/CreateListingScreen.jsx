import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, Alert, ActivityIndicator, Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ExpoLocation from "expo-location";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { auth } from "../../config/firebase";
import { C } from "../../constants/theme";
import { CATEGORIES } from "../../constants/categories";
import { useAuthContext } from "../../context/AuthContext";
import { WILAYAS } from "../../constants/wilayas";
import { addListing } from "../../services/db.service";
import ScreenHeader from "../../components/ScreenHeader";
import Btn from "../../components/Btn";
import MapPicker from "../../components/MapPicker";
import { useLanguage } from "../../i18n/languagecontext";
import { useSubscription } from "../../hooks/useSubscription";
import { USE_API } from "../../config/backend";
import { apiUpload } from "../../services/api.client";

// Véhicules compatibles en Algérie
const VEHICLES = [
  { brand: "Renault",  models: ["Symbol", "Clio II", "Clio III", "Clio IV", "Mégane II", "Mégane III", "Kangoo", "Logan", "Sandero", "Duster", "R19"] },
  { brand: "Peugeot",  models: ["206", "207", "208", "301", "307", "308", "405", "406", "Partner"] },
  { brand: "Citroën",  models: ["C3", "C4", "C5", "Berlingo", "C-Elysée", "Xsara"] },
  { brand: "Dacia",    models: ["Logan I", "Logan II", "Sandero", "Sandero Stepway", "Duster", "Dokker"] },
  { brand: "Volkswagen",models: ["Golf IV", "Golf V", "Golf VI", "Golf VII", "Polo", "Passat", "Caddy"] },
  { brand: "Hyundai",  models: ["Accent", "i10", "Grand i10", "i20", "Tucson", "Atos", "Getz"] },
  { brand: "Kia",      models: ["Picanto", "Rio", "Sportage", "Ceed", "Seltos"] },
  { brand: "Toyota",   models: ["Corolla", "Yaris", "RAV4", "Hilux", "Land Cruiser"] },
  { brand: "Fiat",     models: ["Tipo", "500", "Punto", "Palio", "Doblò"] },
  { brand: "Seat",     models: ["Ibiza", "Leon", "Arona", "Toledo"] },
  { brand: "Geely",    models: ["GX3 Pro", "Coolray", "Emgrand", "Starray"] },
  { brand: "Chery",    models: ["Tiggo 2", "Tiggo 4 Pro", "Tiggo 7 Pro", "Arrizo 5", "Arrizo 6"] },
  { brand: "Suzuki",   models: ["Swift", "Alto", "Vitara", "Jimny"] },
  { brand: "Nissan",   models: ["Micra", "Sunny", "Qashqai", "Navara"] },
  { brand: "Chevrolet",models: ["Aveo", "Cruze", "Spark", "Optra"] },
];

const INIT = {
  title: "", price: "", stock: "1", category: "",
  brand: "", model: "", year: "", wilaya: "Alger",
  condition: "Neuf", description: "",
  lat: null, lng: null,
  compatibleVehicles: [],
};

const MAX_PHOTOS = 4;

export default function CreateListingScreen({ navigation }) {
  const { t, isRTL } = useLanguage();
  const { user, profile } = useAuthContext();
  const { isExpired } = useSubscription();
  const [form, setForm]         = useState(INIT);
  const [photos, setPhotos]     = useState([]);        // { uri, uploading, url }
  const [saving, setSaving]     = useState(false);
  const [success, setSuccess]   = useState(false);
  const [error, setError]       = useState("");
  const [locating, setLocating] = useState(false);
  const [showMap, setShowMap]   = useState(false);
  const [selectedBrand, setSelectedBrand]   = useState(null);
  const [compatVehicles, setCompatVehicles] = useState([]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const toggleVehicle = (brand, model) => {
    setCompatVehicles((prev) => {
      const exists = prev.some((v) => v.brand === brand && v.model === model);
      if (exists) return prev.filter((v) => !(v.brand === brand && v.model === model));
      return [...prev, { brand, model }];
    });
  };

  const isVehicleSelected = (brand, model) =>
    compatVehicles.some((v) => v.brand === brand && v.model === model);

  // ── Choisir photo depuis galerie ──────────────────────────────────────────
  const pickImage = async () => {
    if (photos.length >= MAX_PHOTOS) {
      Alert.alert("Maximum atteint", `Vous pouvez ajouter jusqu'à ${MAX_PHOTOS} photos.`);
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission requise", "Autorisez l'accès à la galerie dans les paramètres.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      quality: 0.7,
      aspect: [4, 3],
      allowsEditing: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      const uri = asset.uri || asset.localUri;
      if (!uri) { Alert.alert("Erreur", "Impossible de lire cette photo."); return; }
      const idx = photos.length;
      setPhotos((p) => [...p, { uri, uploading: true, url: null }]);
      uploadPhoto(uri, idx);
    }
  };

  // ── Prendre photo avec la caméra ──────────────────────────────────────────
  const takePhoto = async () => {
    if (photos.length >= MAX_PHOTOS) {
      Alert.alert("Maximum atteint", `Vous pouvez ajouter jusqu'à ${MAX_PHOTOS} photos.`);
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission requise", "Autorisez l'accès à la caméra dans les paramètres.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      aspect: [4, 3],
      allowsEditing: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      const uri = asset.uri || asset.localUri;
      if (!uri) { Alert.alert("Erreur", "Impossible de lire cette photo."); return; }
      const idx = photos.length;
      setPhotos((p) => [...p, { uri, uploading: true, url: null }]);
      uploadPhoto(uri, idx);
    }
  };

  // ── Upload photo (API ou Firebase Storage) ────────────────────────────────
  const uploadPhoto = async (uri, index) => {
    try {
      if (!uri) throw new Error("URI manquante");

      // ── MODE API ──
      // Le serveur compresse, convertit en WebP et génère la vignette
      if (USE_API) {
        const { url } = await apiUpload(uri, "listing");
        setPhotos((prev) =>
          prev.map((p, i) => i === index ? { ...p, uploading: false, url } : p)
        );
        return;
      }

      // ── MODE FIREBASE ──
      const { compressImage } = await import("../../util/compressImage");
      uri = await compressImage(uri, "listing");

      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Non connecté");

      const filename    = `listings/${user?.uid || "anon"}/${Date.now()}_${index}.jpg`;
      const encodedPath = encodeURIComponent(filename);
      const uploadUrl   = `https://firebasestorage.googleapis.com/v0/b/sustained-hold-486101-b9.firebasestorage.app/o?uploadType=media&name=${encodedPath}`;

      const uploadResult = await FileSystem.uploadAsync(uploadUrl, uri, {
        httpMethod: "POST",
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: {
          "Content-Type": "image/jpeg",
          "Authorization": `Bearer ${token}`,
        },
      });

      if (uploadResult.status !== 200) {
        throw new Error(`Upload failed: ${uploadResult.status}`);
      }

      const url = `https://firebasestorage.googleapis.com/v0/b/sustained-hold-486101-b9.firebasestorage.app/o/${encodedPath}?alt=media`;

      setPhotos((prev) =>
        prev.map((p, i) => i === index ? { ...p, uploading: false, url } : p)
      );
    } catch (e) {
      console.log("[uploadPhoto]", e?.status, e?.message);
      setPhotos((prev) =>
        prev.map((p, i) => i === index ? { ...p, uploading: false, error: true } : p)
      );
      Alert.alert("Erreur upload", e?.message || "Impossible d'envoyer la photo. Réessayez.");
    }
  };

  // ── Supprimer une photo ───────────────────────────────────────────────────
  const removePhoto = (index) => {
    Alert.alert("Supprimer", "Supprimer cette photo ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive",
        onPress: () => setPhotos((p) => p.filter((_, i) => i !== index)) },
    ]);
  };

  // ── Source photos (dialog) ────────────────────────────────────────────────
  const showPhotoOptions = () => {
    Alert.alert("Ajouter une photo", "Choisissez la source", [
      { text: "📷 Prendre une photo", onPress: takePhoto },
      { text: "🖼  Galerie",          onPress: pickImage },
      { text: "Annuler", style: "cancel" },
    ]);
  };

  // ── GPS ───────────────────────────────────────────────────────────────────
  const handleGetLocation = async () => {
    setLocating(true);
    try {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission refusée", "Autorisez la localisation dans les paramètres.");
        setLocating(false);
        return;
      }
      const loc = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.Balanced,
      });
      setForm((f) => ({ ...f, lat: loc.coords.latitude, lng: loc.coords.longitude }));
      setShowMap(true);
    } catch (e) {
      Alert.alert("Erreur", "Impossible d'obtenir votre position.");
    }
    setLocating(false);
  };

  // ── Publier ───────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.title.trim())    { setError("Le titre est obligatoire");     return; }
    if (!form.price)           { setError("Le prix est obligatoire");      return; }
    if (!form.category)        { setError("La catégorie est obligatoire"); return; }

    if (!form.lat || !form.lng) {
      Alert.alert(
        "Position requise",
        "Ajoutez votre position pour que les clients proches trouvent votre annonce.",
        [
          { text: "Annuler", style: "cancel" },
          { text: "Ajouter ma position", onPress: handleGetLocation },
        ]
      );
      return;
    }

    if (photos.some((p) => p.uploading)) {
      Alert.alert("Patientez", "Les photos sont en cours d'upload...");
      return;
    }

    setError("");
    setSaving(true);

    try {
      const photoUrls  = photos.filter((p) => p.url).map((p) => p.url);
      const sellerName = profile?.displayName || user?.displayName || "Vendeur";

      // Les puces d'état sont en français OU en arabe selon la langue
      const isNeuf = form.condition === "Neuf" || form.condition === "جديد";

      const payload = USE_API
        ? {
            title:       form.title.trim(),
            price:       parseInt(form.price) || 0,
            stock:       parseInt(form.stock) || 1,
            condition:   isNeuf ? "new" : "used",
            category:    form.category || null,
            brand:       form.brand.trim() || null,
            model:       form.model.trim() || null,
            year:        form.year.trim() ? parseInt(form.year) : null,
            wilaya:      form.wilaya || null,
            description: form.description.trim(),
            photos:      photoUrls,
            lat:         form.lat ?? null,
            lng:         form.lng ?? null,
            compatibleVehicles: compatVehicles,
          }
        : {
            title:       form.title.trim(),
            price:       parseInt(form.price) || 0,
            stock:       parseInt(form.stock) || 1,
            category:    form.category,
            brand:       form.brand.trim(),
            model:       form.model.trim(),
            year:        form.year.trim(),
            wilaya:      form.wilaya,
            condition:   form.condition,
            description: form.description.trim(),
            img:         photoUrls[0] || CATEGORIES.find((c) => c.id === form.category)?.letter || "P",
            photos:      photoUrls,
            sellerName,
            lat:         form.lat,
            lng:         form.lng,
            verified:    false,
            rating:      0,
            reviews:     0,
            compatibleVehicles: compatVehicles,
          };

      await addListing(payload, user?.uid);
      setSuccess(true);
    } catch (e) {
      console.log("[publish]", e?.status, e?.message);
      setError(e?.message || "Erreur lors de la publication");
    }

    setSaving(false);
  };

  // ── BLOCAGE ABONNEMENT EXPIRÉ ─────────────────────────────────────────────
  if (isExpired) {
    return (
      <View style={s.container}>
        <ScreenHeader title={t("publishAnnounce")} onBack={() => navigation.goBack()} />
        <View style={s.successWrap}>
          <View style={[s.successIcon, { backgroundColor: C.danger + "20", borderColor: C.danger }]}>
            <Ionicons name="lock-closed" size={44} color={C.danger} />
          </View>
          <Text style={s.successTitle}>Abonnement expiré</Text>
          <Text style={s.successSub}>
            Renouvelez votre abonnement pour pouvoir publier de nouvelles annonces.
          </Text>
          <Btn onPress={() => navigation.navigate("Subscription")} style={{ marginTop: 24, width: "100%" }}>
            Renouveler mon abonnement
          </Btn>
          <Text style={{ fontSize: 12, color: C.textDim, marginTop: 16 }}>
            Paiement par CCP · 0027890277 23
          </Text>
        </View>
      </View>
    );
  }

  // ── SUCCÈS ────────────────────────────────────────────────────────────────
  if (success) {
    return (
      <View style={s.container}>
        <ScreenHeader title={t("publishedTitle")} onBack={() => navigation.goBack()} />
        <View style={s.successWrap}>
          <View style={s.successIcon}>
            <Ionicons name="checkmark" size={44} color={C.success} />
          </View>
          <Text style={s.successTitle}>{t("publishedTitle")}</Text>
          <Text style={s.successSub}>
            Visible dans le catalogue avec {photos.filter((p) => p.url).length} photo(s)
          </Text>
          <Btn onPress={() => navigation.goBack()} style={{ marginTop: 24, width: "100%" }}>
            Retour au dashboard
          </Btn>
          <Btn variant="secondary"
            onPress={() => { setForm(INIT); setPhotos([]); setSuccess(false); setShowMap(false); setCompatVehicles([]); setSelectedBrand(null); }}
            style={{ marginTop: 10, width: "100%" }}>
            Publier une autre
          </Btn>
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <ScreenHeader title={t("publishAnnounce")} onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.body}
        keyboardShouldPersistTaps="handled">

        {/* ── ERREUR ── */}
        {error ? (
          <View style={s.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color={C.danger} />
            <Text style={s.errorTxt}>{error}</Text>
          </View>
        ) : null}

        {/* PHOTOS */}
        <Text style={s.label}>PHOTOS ({photos.length}/{MAX_PHOTOS})</Text>
        <Text style={s.sublabel}>La première photo sera l'image principale de l'annonce</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.photosRow}>

          {photos.map((photo, i) => (
            <View key={i} style={s.photoThumb}>
              <Image source={{ uri: photo.uri }} style={s.photoImg} />
              {i === 0 && (
                <View style={s.mainBadge}>
                  <Text style={s.mainBadgeTxt}>Principal</Text>
                </View>
              )}
              {photo.uploading && (
                <View style={s.photoOverlay}>
                  <ActivityIndicator color={C.accent} />
                </View>
              )}
              {photo.error && (
                <View style={[s.photoOverlay, { backgroundColor: C.danger + "AA" }]}>
                  <Ionicons name="alert" size={20} color="#fff" />
                </View>
              )}
              {!photo.uploading && (
                <TouchableOpacity onPress={() => removePhoto(i)} style={s.deletePhoto}>
                  <Ionicons name="close" size={12} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
          ))}

          {photos.length < MAX_PHOTOS && (
            <TouchableOpacity onPress={showPhotoOptions} style={s.addPhoto} activeOpacity={0.8}>
              <Ionicons name="camera-outline" size={28} color={C.accent} />
              <Text style={s.addPhotoTxt}>Ajouter</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* ── TITRE ── */}
        <Text style={s.label}>TITRE *</Text>
        <TextInput style={s.input} placeholder={isRTL ? "مثال: أقراص فرامل بيجو 208" : "Ex: Disques de frein Peugeot 208"}
          placeholderTextColor={C.textDim} value={form.title}
          onChangeText={(v) => set("title", v)} />

        {/* ── PRIX / STOCK ── */}
        <View style={s.row2}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>PRIX (DA) *</Text>
            <TextInput style={s.input} placeholder="0" placeholderTextColor={C.textDim}
              keyboardType="numeric" value={form.price}
              onChangeText={(v) => set("price", v.replace(/\D/g, ""))} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>STOCK</Text>
            <TextInput style={s.input} placeholder="1" placeholderTextColor={C.textDim}
              keyboardType="numeric" value={form.stock}
              onChangeText={(v) => set("stock", v.replace(/\D/g, ""))} />
          </View>
        </View>

        {/* ── CATÉGORIE ── */}
        <Text style={s.label}>CATÉGORIE *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={s.chipRow}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity key={cat.id} onPress={() => set("category", cat.id)}
                style={[s.chip, form.category === cat.id && s.chipActive]}>
                <Text style={[s.chipLetter, form.category === cat.id && { color: "#000" }]}>
                  {cat.letter}
                </Text>
                <Text style={[s.chipTxt, form.category === cat.id && { color: C.accent }]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* ── MARQUE / MODÈLE ── */}
        <View style={s.row2}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>MARQUE</Text>
            <TextInput style={s.input} placeholder={isRTL ? "بيجو" : "Peugeot"} placeholderTextColor={C.textDim}
              value={form.brand} onChangeText={(v) => set("brand", v)} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>MODÈLE</Text>
            <TextInput style={s.input} placeholder="208" placeholderTextColor={C.textDim}
              value={form.model} onChangeText={(v) => set("model", v)} />
          </View>
        </View>

        {/* ── ÉTAT ── */}
        <Text style={s.label}>ÉTAT</Text>
        <View style={s.chipRow}>
          {[isRTL ? "جديد" : "Neuf", isRTL ? "مستعمل" : "Occasion"].map((c) => (
            <TouchableOpacity key={c} onPress={() => set("condition", c)}
              style={[s.chip, form.condition === c && s.chipActive]}>
              <Text style={[s.chipTxt, form.condition === c && { color: C.accent }]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── WILAYA ── */}
        <Text style={s.label}>WILAYA</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={s.chipRow}>
            {WILAYAS.map((w) => (
              <TouchableOpacity key={w} onPress={() => set("wilaya", w)}
                style={[s.chip, form.wilaya === w && s.chipActive]}>
                <Text style={[s.chipTxt, form.wilaya === w && { color: C.accent }]}>{w}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* ── DESCRIPTION ── */}
        <Text style={s.label}>DESCRIPTION</Text>
        <TextInput style={[s.input, s.textarea]} placeholder={isRTL ? "صف قطعتك..." : "Décrivez votre pièce..."}
          placeholderTextColor={C.textDim} multiline numberOfLines={4}
          value={form.description} onChangeText={(v) => set("description", v)} />

        {/* ── VÉHICULES COMPATIBLES ── */}
        <Text style={s.label}>{t("compatVehicles")}</Text>
        <Text style={s.sublabel}>{t("compatSub")}</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {VEHICLES.map((v) => (
              <TouchableOpacity key={v.brand}
                onPress={() => setSelectedBrand(selectedBrand === v.brand ? null : v.brand)}
                style={[s.chip, selectedBrand === v.brand && s.chipActive]}>
                <Text style={[s.chipTxt, selectedBrand === v.brand && { color: C.accent }]}>{v.brand}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {selectedBrand && (
          <View style={s.chipRow}>
            {VEHICLES.find((v) => v.brand === selectedBrand)?.models.map((model) => {
              const selected = isVehicleSelected(selectedBrand, model);
              return (
                <TouchableOpacity key={model}
                  onPress={() => toggleVehicle(selectedBrand, model)}
                  style={[s.chip, selected && s.chipActive]}>
                  {selected && <Ionicons name="checkmark" size={12} color={C.accent} />}
                  <Text style={[s.chipTxt, selected && { color: C.accent }]}>{model}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {compatVehicles.length > 0 && (
          <View style={s.compatList}>
            <Text style={s.compatTitle}>{compatVehicles.length} {t("selectedVehicles")} :</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
              {compatVehicles.map((v, i) => (
                <TouchableOpacity key={i} onPress={() => toggleVehicle(v.brand, v.model)}
                  style={s.compatTag}>
                  <Text style={s.compatTagTxt}>{v.brand} {v.model}</Text>
                  <Ionicons name="close" size={11} color={C.accent} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ── LOCALISATION ── */}
        <Text style={s.label}>{isRTL ? "الموقع على الخريطة *" : "POSITION SUR LA CARTE *"}</Text>
        <Text style={s.sublabel}>{isRTL ? "إلزامي — حتى يجدك العملاء القريبون" : "Obligatoire — pour être trouvé par les clients proches"}</Text>

        <TouchableOpacity onPress={handleGetLocation} style={s.gpsBtn}
          disabled={locating} activeOpacity={0.8}>
          {locating
            ? <ActivityIndicator size="small" color={C.accent} />
            : <Ionicons name="locate" size={18} color={C.accent} />
          }
          <Text style={s.gpsTxt}>
            {locating ? "Localisation..." : form.lat ? "Recentrer sur ma position" : t("gpsBtn")}
          </Text>
          {form.lat && !locating && (
            <Ionicons name="checkmark-circle" size={16} color={C.success} />
          )}
        </TouchableOpacity>

        {showMap && form.lat && (
          <>
            <Text style={s.sublabel}>Appuyez ou faites glisser le marqueur pour ajuster</Text>
            <MapPicker
              lat={form.lat} lng={form.lng} height={280}
              onPick={({ lat, lng }) => setForm((f) => ({ ...f, lat, lng }))}
            />
          </>
        )}

        {!showMap && !form.lat && (
          <View style={s.locPlaceholder}>
            <Ionicons name="map-outline" size={32} color={C.textDim} />
            <Text style={s.locPlaceholderTxt}>{isRTL ? "لم يتم تحديد الموقع" : "Aucune position sélectionnée"}</Text>
          </View>
        )}

        <View style={{ height: 20 }} />
        <Btn onPress={handleSubmit} loading={saving}>
          {saving ? "Publication..." : t("publishBtn")}
        </Btn>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:         { flex: 1, backgroundColor: C.bg },
  body:              { padding: 16 },
  successWrap:       { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  successIcon:       { width: 90, height: 90, borderRadius: 45, backgroundColor: C.success + "20", borderWidth: 2, borderColor: C.success, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  successTitle:      { fontSize: 24, fontWeight: "900", color: C.text, marginBottom: 8 },
  successSub:        { fontSize: 13, color: C.textMuted, textAlign: "center" },
  errorBox:          { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.danger + "15", borderWidth: 1, borderColor: C.danger + "40", borderRadius: 10, padding: 12, marginBottom: 16 },
  errorTxt:          { fontSize: 12, color: C.danger, flex: 1 },
  label:             { fontSize: 10, fontWeight: "800", color: C.textMuted, letterSpacing: 0.5, marginBottom: 6, marginTop: 10 },
  sublabel:          { fontSize: 11, color: C.textDim, marginBottom: 8, marginTop: -4 },
  input:             { backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: C.text, fontSize: 13, marginBottom: 4 },
  textarea:          { minHeight: 100, textAlignVertical: "top", paddingTop: 12 },
  row2:              { flexDirection: "row", gap: 10 },
  chipRow:           { flexDirection: "row", gap: 6, flexWrap: "wrap", marginBottom: 8 },
  chip:              { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18, borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceAlt },
  chipActive:        { borderColor: C.accent, backgroundColor: C.accent + "18" },
  chipLetter:        { fontSize: 10, fontWeight: "900", color: C.accent },
  chipTxt:           { fontSize: 11, fontWeight: "700", color: C.textMuted },
  photosRow:         { paddingBottom: 12, gap: 10 },
  photoThumb:        { width: 110, height: 110, borderRadius: 12, overflow: "hidden", position: "relative", borderWidth: 1, borderColor: C.border },
  photoImg:          { width: "100%", height: "100%", resizeMode: "cover" },
  mainBadge:         { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: C.accent + "EE", paddingVertical: 3, alignItems: "center" },
  mainBadgeTxt:      { fontSize: 9, fontWeight: "900", color: "#000" },
  photoOverlay:      { position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  deletePhoto:       { position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(0,0,0,0.7)", alignItems: "center", justifyContent: "center" },
  addPhoto:          { width: 110, height: 110, borderRadius: 12, borderWidth: 1.5, borderColor: C.accent + "60", borderStyle: "dashed", backgroundColor: C.accent + "08", alignItems: "center", justifyContent: "center", gap: 6 },
  addPhotoTxt:       { fontSize: 11, fontWeight: "700", color: C.accent },
  gpsBtn:            { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.accent + "12", borderWidth: 1.5, borderColor: C.accent + "40", borderRadius: 14, padding: 14, marginBottom: 12 },
  gpsTxt:            { flex: 1, fontSize: 13, fontWeight: "800", color: C.accent },
  locPlaceholder:    { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 30, alignItems: "center", gap: 8, marginBottom: 8 },
  locPlaceholderTxt: { fontSize: 14, fontWeight: "700", color: C.textMuted },
  compatList:        { backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.accent + "30", padding: 12, marginBottom: 12 },
  compatTitle:       { fontSize: 11, fontWeight: "700", color: C.accent },
  compatTag:         { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.accent + "15", borderRadius: 8, borderWidth: 1, borderColor: C.accent + "40", paddingHorizontal: 10, paddingVertical: 5 },
  compatTagTxt:      { fontSize: 11, fontWeight: "700", color: C.accent },
});