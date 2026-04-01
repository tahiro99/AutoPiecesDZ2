import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const LANG_KEY = "@apz_language";

const TR = {
  fr: {
    login: "Se connecter", logout: "Se déconnecter", register: "Créer un compte",
    email: "Email", password: "Mot de passe", forgotPassword: "Mot de passe oublié ?",
    noAccount: "Pas de compte ?", hasAccount: "Déjà un compte ?",
    fullName: "Nom complet", phone: "Téléphone",
    verified: "Vérifié", notVerified: "Non vérifié",
    home: "Accueil", catalogue: "Catalogue", messages: "Messages",
    profile: "Profil", dashboard: "Dashboard", loading: "Chargement...",
    save: "Enregistrer", cancel: "Annuler", delete: "Supprimer",
    confirm: "Confirmer", back: "Retour", search: "Rechercher",
    seeAll: "Voir tout", error: "Erreur", success: "Succès",
    send: "Envoyer", edit: "Modifier", add: "Ajouter",
    hello: "Bonjour", nearMe: "Annonces près de moi",
    recentListings: "Annonces récentes", categories: "Catégories",
    favorites: "Favoris", available: "dispo",
    sell: "Vendre", publishListing: "Publier une annonce",
    myListings: "Mes annonces", myAccount: "MON COMPTE",
    myOrders: "Mes commandes", myFavorites: "Mes favoris",
    notifications: "Notifications", becomeVendeur: "DEVENIR VENDEUR",
    switchVendeur: "Passer en mode vendeur", help: "AIDE",
    helpCenter: "Centre d'aide", terms: "Conditions",
    client: "CLIENT", vendeur: "VENDEUR", orders: "Commandes",
    loginRequired: "Connexion requise",
    loginToProfile: "Connectez-vous pour accéder à votre profil",
    mySellerSpace: "MON ESPACE VENDEUR", myListingsMenu: "Mes annonces",
    clientMessages: "Messages clients", pending: "En attente",
    confirmed: "Confirmée", shipping: "En livraison",
    delivered: "Livrée", archived: "Archivée",
    noActiveOrders: "Aucune commande active",
    ordersAppear: "Les commandes clients apparaîtront ici",
    noListings: "Aucune annonce", publishNow: "Publier maintenant →",
    writeMessage: "Écrire un message...", noConversations: "Aucune conversation",
    allNotifs: "Tout", orderNotifs: "Commandes",
    messageNotifs: "Messages", deliveryNotifs: "Livraison",
    listingNotifs: "Annonces", noNotifications: "Aucune notification",
    markAllRead: "Tout lire", myFavs: "Mes Favoris",
    noFavs: "Aucun favori", noFavsSub: "Ajoutez des pièces en favoris",
    myOrdersTitle: "Mes Commandes", noOrders: "Aucune commande",
    noOrdersSub: "Vos commandes apparaîtront ici",
    publishAnnounce: "Publier une annonce", publishBtn: "Publier l'annonce",
    publishing: "Publication...", publishedTitle: "Annonce publiée !",
    backDashboard: "Retour au dashboard", publishAnother: "Publier une autre",
    compatVehicles: "VÉHICULES COMPATIBLES",
    compatSub: "Sélectionnez tous les modèles compatibles",
    selectedVehicles: "véhicule(s) sélectionné(s)",
    gpsBtn: "Utiliser ma position GPS", gpsLocating: "Localisation...",
    catalogueParts: "Catalogue Pièces",
    algerianMarket: "Marché algérien — Prix indicatifs en DA",
    searchPart: "Chercher une pièce...", selectVehicle: "Sélectionner mon véhicule",
    order: "Commander", total: "Total", placeOrder: "Passer la commande",
    orderConfirmed: "Commande confirmée !", backListings: "Retour aux annonces",
    contact: "Contacter", buy: "Acheter", description: "Description",
    deliveryInfo: "Livraison disponible", securePayment: "Paiement sécurisé",
    compatibleVehicles: "Véhicules compatibles",
    note: "Note", reviews: "Avis", views: "Vues",
    inStock: "en stock", outOfStock: "Épuisé", new: "NEUF",
    information: "Informations", brand: "Marque", model: "Modèle",
    year: "Année", category: "Catégorie", photos: "photos",
    deliverySub: "Partout en Algérie — délai 2 à 5 jours ouvrables",
    securePaySub: "Cash à la livraison · CIB · Dahabia",
    listingDetail: "Détail annonce",
    confirmOrder: "Confirmer la commande",
    cash: "Cash à la livraison", cib: "CIB", dahabia: "Dahabia",
    cashDesc: "Paiement à la réception", cibDesc: "Carte CIB", dahabiaDesc: "Carte Dahabia",
    deliveryWilaya: "WILAYA DE LIVRAISON", vendorPosition: "Position du vendeur",
    openRoute: "Voir l'itinéraire", deliveryFee: "Frais de livraison vers",
    fullAddress: "ADRESSE COMPLÈTE", phonePlaceholder: "0555 123 456",
    addressPlaceholder: "Rue, quartier, commune...", addressRequired: "Veuillez entrer votre adresse",
    phoneRequired: "Veuillez entrer votre téléphone", paymentMethod: "MODE DE PAIEMENT",
    emptyCart: "Panier vide", emptyCartSub: "Ajoutez une pièce depuis les annonces",
    onlineFirebase: "EN LIGNE — FIREBASE CONNECTÉ", fastDelivery: "58 wilayas — livraison rapide — vendeurs vérifiés",
    listings: "Annonces", allCategories: "Toutes les catégories",
    qualityTip: "💡 Conseil qualité", close: "Fermer",
    loginToSeeNotifs: "Connectez-vous pour voir vos notifications",
  },
  ar: {
    login: "تسجيل الدخول", logout: "تسجيل الخروج", register: "إنشاء حساب",
    email: "البريد الإلكتروني", password: "كلمة المرور",
    forgotPassword: "نسيت كلمة المرور؟",
    noAccount: "ليس لديك حساب؟", hasAccount: "لديك حساب بالفعل؟",
    fullName: "الاسم الكامل", phone: "رقم الهاتف",
    verified: "موثق", notVerified: "غير موثق",
    home: "الرئيسية", catalogue: "الكتالوج", messages: "الرسائل",
    profile: "الملف الشخصي", dashboard: "لوحة التحكم", loading: "جاري التحميل...",
    save: "حفظ", cancel: "إلغاء", delete: "حذف",
    confirm: "تأكيد", back: "رجوع", search: "بحث",
    seeAll: "رؤية الكل", error: "خطأ", success: "نجاح",
    send: "إرسال", edit: "تعديل", add: "إضافة",
    hello: "مرحبا", nearMe: "إعلانات قريبة مني",
    recentListings: "آخر الإعلانات", categories: "الفئات",
    favorites: "المفضلة", available: "متوفر",
    sell: "بيع", publishListing: "نشر إعلان",
    myListings: "إعلاناتي", myAccount: "حسابي",
    myOrders: "طلباتي", myFavorites: "مفضلتي",
    notifications: "الإشعارات", becomeVendeur: "أصبح بائعاً",
    switchVendeur: "التحويل إلى وضع البائع", help: "المساعدة",
    helpCenter: "مركز المساعدة", terms: "الشروط والأحكام",
    client: "مشتري", vendeur: "بائع", orders: "الطلبات",
    loginRequired: "تسجيل الدخول مطلوب",
    loginToProfile: "سجل دخولك للوصول إلى ملفك الشخصي",
    mySellerSpace: "فضائي كبائع", myListingsMenu: "إعلاناتي",
    clientMessages: "رسائل العملاء", pending: "في الانتظار",
    confirmed: "مؤكد", shipping: "في الطريق",
    delivered: "تم التوصيل", archived: "مؤرشف",
    noActiveOrders: "لا توجد طلبات نشطة",
    ordersAppear: "ستظهر طلبات العملاء هنا",
    noListings: "لا توجد إعلانات", publishNow: "انشر الآن ←",
    writeMessage: "اكتب رسالة...", noConversations: "لا توجد محادثات",
    allNotifs: "الكل", orderNotifs: "الطلبات",
    messageNotifs: "الرسائل", deliveryNotifs: "التوصيل",
    listingNotifs: "الإعلانات", noNotifications: "لا توجد إشعارات",
    markAllRead: "تحديد الكل كمقروء", myFavs: "مفضلتي",
    noFavs: "لا توجد مفضلة", noFavsSub: "أضف قطعاً إلى المفضلة",
    myOrdersTitle: "طلباتي", noOrders: "لا توجد طلبات",
    noOrdersSub: "ستظهر طلباتك هنا",
    publishAnnounce: "نشر إعلان", publishBtn: "نشر الإعلان",
    publishing: "جاري النشر...", publishedTitle: "تم نشر الإعلان!",
    backDashboard: "العودة للوحة التحكم", publishAnother: "نشر إعلان آخر",
    compatVehicles: "السيارات المتوافقة",
    compatSub: "اختر جميع الموديلات المتوافقة مع هذه القطعة",
    selectedVehicles: "سيارة مختارة",
    gpsBtn: "استخدام موقعي الحالي", gpsLocating: "جاري تحديد الموقع...",
    catalogueParts: "كتالوج قطع الغيار",
    algerianMarket: "السوق الجزائري — أسعار استرشادية بالدينار",
    searchPart: "ابحث عن قطعة...", selectVehicle: "اختر سيارتك",
    order: "طلب", total: "الإجمالي", placeOrder: "تأكيد الطلب",
    orderConfirmed: "تم تأكيد الطلب!", backListings: "العودة للإعلانات",
    contact: "تواصل", buy: "شراء", description: "الوصف",
    deliveryInfo: "التوصيل متاح", securePayment: "دفع آمن",
    compatibleVehicles: "السيارات المتوافقة",
    note: "التقييم", reviews: "آراء", views: "مشاهدات",
    inStock: "في المخزون", outOfStock: "نفد", new: "جديد",
    information: "معلومات", brand: "الماركة", model: "الموديل",
    year: "السنة", category: "الفئة", photos: "صور",
    deliverySub: "في جميع أنحاء الجزائر — من 2 إلى 5 أيام عمل",
    securePaySub: "الدفع عند الاستلام · CIB · داهبية",
    listingDetail: "تفاصيل الإعلان",
    confirmOrder: "تأكيد الطلب",
    cash: "الدفع عند الاستلام", cib: "بطاقة CIB", dahabia: "بطاقة داهبية",
    cashDesc: "ادفع عند وصول الطلب", cibDesc: "بطاقة CIB", dahabiaDesc: "بطاقة داهبية",
    deliveryWilaya: "ولاية التوصيل", vendorPosition: "موقع البائع",
    openRoute: "عرض المسار", deliveryFee: "رسوم التوصيل إلى",
    fullAddress: "العنوان الكامل", phonePlaceholder: "0555 123 456",
    addressPlaceholder: "الشارع، الحي، البلدية...", addressRequired: "الرجاء إدخال عنوانك",
    phoneRequired: "الرجاء إدخال رقم هاتفك", paymentMethod: "طريقة الدفع",
    emptyCart: "السلة فارغة", emptyCartSub: "أضف قطعة من الإعلانات",
    onlineFirebase: "متصل — Firebase",
    fastDelivery: "58 ولاية — توصيل سريع — بائعون موثوقون",
    listings: "الإعلانات", allCategories: "جميع الفئات",
    qualityTip: "💡 نصيحة الجودة", close: "إغلاق",
    loginToSeeNotifs: "سجل دخولك لرؤية إشعاراتك",
  },
};

// ── Contexte global partagé entre tous les écrans ──────────────────
const LanguageContext = createContext({
  lang: "fr", t: (k) => k, toggleLang: () => {}, isRTL: false,
});

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState("fr");
  const [ready, setReady] = useState(false);

  // Charger la langue sauvegardée au démarrage
  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY)
      .then((v) => {
        if (v === "ar" || v === "fr") setLang(v);
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const toggleLang = useCallback(async () => {
    const newLang = lang === "fr" ? "ar" : "fr";
    setLang(newLang); // ← met à jour le contexte global immédiatement
    try {
      await AsyncStorage.setItem(LANG_KEY, newLang);
    } catch (_) {}
  }, [lang]);

  const t = useCallback(
    (key) => TR[lang]?.[key] || TR.fr?.[key] || key,
    [lang]
  );

  if (!ready) return null; // attend la lecture AsyncStorage

  return (
    <LanguageContext.Provider value={{ lang, t, toggleLang, isRTL: lang === "ar" }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}