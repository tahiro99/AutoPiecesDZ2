// src/screens/Messages/ChatScreen.jsx
import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, KeyboardAvoidingView, Platform, Image, Alert,
  ActivityIndicator, Modal, Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { C } from "../../constants/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMessages } from "../../hooks/useMessages";
import { useAuthContext } from "../../context/AuthContext";
import { sendMessage, markAsRead } from "../../services/db.service";
import { createNotif } from "../../services/Notif.service";
import { auth } from "../../config/firebase";
import { addDoc, collection, serverTimestamp, updateDoc, doc } from "firebase/firestore";
import { db } from "../../config/firebase";
import { useLanguage } from "../../i18n/languagecontext";

const STORAGE_BUCKET = "sustained-hold-486101-b9.firebasestorage.app";

async function uploadImage(uri, uid) {
  // Compresse avant l'upload : 5MB → ~200KB (économies massives de bandwidth)
  const { compressImage } = await import("../../util/compressImage");
  uri = await compressImage(uri, "chat");

  const token    = await auth.currentUser?.getIdToken();
  const filename = `chat/${uid}/${Date.now()}.jpg`;
  const encoded  = encodeURIComponent(filename);
  const url      = `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o?uploadType=media&name=${encoded}`;
  const res = await FileSystem.uploadAsync(url, uri, {
    httpMethod: "POST",
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: { "Content-Type": "image/jpeg", "Authorization": `Bearer ${token}` },
  });
  if (res.status !== 200) throw new Error("Upload failed");

  // Firebase Storage returns metadata with `downloadTokens` — without it the
  // public URL is rejected by default rules and the <Image> shows blank.
  let downloadToken = "";
  try {
    const meta = JSON.parse(res.body || "{}");
    downloadToken = (meta.downloadTokens || "").split(",")[0] || "";
  } catch (_) {}

  const base = `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/${encoded}?alt=media`;
  return downloadToken ? `${base}&token=${downloadToken}` : base;
}

export default function ChatScreen({ route, navigation }) {
  const { t, isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const {
    conversationId: initialConvId, sellerName, listingTitle,
    listingPrice, sellerId, buyerId,
  } = route.params;

  const { user }              = useAuthContext();
  const [convId, setConvId]   = useState(initialConvId);
  const realConvId            = typeof convId === "string" ? convId : null;
  const { messages, loading } = useMessages(realConvId);
  const [text, setText]       = useState("");
  const [sending, setSending] = useState(false);
  const [viewerImg, setViewerImg] = useState(null);
  const [uploadingImg, setUploadingImg] = useState(false);
  const flatRef = useRef(null);
  const uid = user?.uid || "guest";

  useEffect(() => { if (typeof convId === "string") markAsRead(convId).catch(() => {}); }, [convId]);
  useEffect(() => {
    if (messages.length > 0) setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  // ── ENVOYER TEXTE ──
  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const newConvId = await sendMessage(convId, uid, text.trim());
      if (newConvId && newConvId !== convId) setConvId(newConvId);
      const otherUserId = uid === sellerId ? buyerId : sellerId;
      if (otherUserId) {
        createNotif(otherUserId, {
          type: "message",
          title: isRTL ? "رسالة جديدة 💬" : "Nouveau message 💬",
          body: text.trim().substring(0, 80),
          data: { screen: "Chat", conversationId: newConvId || convId, sellerName, listingTitle, listingPrice },
        }).catch(() => {});
      }
      setText("");
    } catch (e) { console.log(e); }
    setSending(false);
  };

  // ── ENVOYER IMAGE ──
  const sendImage = async (uri) => {
    setUploadingImg(true);
    try {
      const imageUrl = await uploadImage(uri, uid);
      // Sauvegarder le message image dans Firestore
      const msgData = {
        senderId:  uid,
        text:      "",
        imageUrl,
        type:      "image",
        read:      false,
        createdAt: serverTimestamp(),
      };
      if (realConvId) {
        await addDoc(collection(db, "conversations", realConvId, "messages"), msgData);
        await updateDoc(doc(db, "conversations", realConvId), {
          lastMessage:   isRTL ? "📷 صورة" : "📷 Image",
          lastMessageAt: serverTimestamp(),
          unread:        1,
        });
      }
      const otherUserId = uid === sellerId ? buyerId : sellerId;
      if (otherUserId) {
        createNotif(otherUserId, {
          type:  "message",
          title: isRTL ? "صورة جديدة 📷" : "Nouvelle image 📷",
          body:  isRTL ? "أرسل لك صورة" : "Vous a envoyé une image",
          data:  { screen: "Chat", conversationId: convId },
        }).catch(() => {});
      }
    } catch (e) {
      Alert.alert("Erreur", isRTL ? "فشل إرسال الصورة" : "Impossible d'envoyer l'image");
    }
    setUploadingImg(false);
  };

  // ── CHOISIR IMAGE ──
  const pickImage = () => {
    Alert.alert(
      isRTL ? "إرسال صورة" : "Envoyer une image",
      "",
      [
        {
          text: isRTL ? "الكاميرا" : "Caméra",
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== "granted") return;
            const r = await ImagePicker.launchCameraAsync({ quality: 0.7, aspect: [4,3], allowsEditing: true });
            if (!r.canceled && r.assets?.[0]) sendImage(r.assets[0].uri);
          },
        },
        {
          text: isRTL ? "المعرض" : "Galerie",
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== "granted") return;
            const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, aspect: [4,3], allowsEditing: true });
            if (!r.canceled && r.assets?.[0]) sendImage(r.assets[0].uri);
          },
        },
        { text: isRTL ? "إلغاء" : "Annuler", style: "cancel" },
      ]
    );
  };

  const renderMessage = ({ item }) => {
    const isMe = item.senderId === uid;
    const time  = item.createdAt?.toDate
      ? item.createdAt.toDate().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
      : "";

    const isImage = item.type === "image" && item.imageUrl;

    // Messenger-style: image messages have NO bubble background, just the
    // rounded photo + a tiny timestamp below it.
    if (isImage) {
      return (
        <View style={[s.msgRow, isMe && s.msgRowMe]}>
          <View style={s.imgWrap}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setViewerImg(item.imageUrl)}
            >
              <Image
                source={{ uri: item.imageUrl }}
                style={s.msgImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
            {item.text ? (
              <Text
                style={[s.imgCaption, { textAlign: isRTL ? "right" : "left" }]}
                numberOfLines={3}
              >
                {item.text}
              </Text>
            ) : null}
            <Text style={[s.imgTime, isMe ? s.imgTimeMe : null]}>{time}</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={[s.msgRow, isMe && s.msgRowMe]}>
        <View style={[s.bubble, isMe ? s.bubbleMe : s.bubbleThem]}>
          {item.text ? (
            <Text style={[s.msgTxt, isMe && s.msgTxtMe, { textAlign: isRTL ? "right" : "left" }]}>
              {item.text}
            </Text>
          ) : null}
          <Text style={[s.msgTime, isMe && { color: "#00000060" }]}>{time}</Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}>

      {/* ── HEADER ── */}
      <View style={[s.header, { flexDirection: isRTL ? "row-reverse" : "row", paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={20} color={C.text} />
        </TouchableOpacity>
        <View style={[s.sellerInfo, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View style={s.avatar}>
            <Text style={s.avatarTxt}>{(sellerName || "?")[0].toUpperCase()}</Text>
          </View>
          <View>
            <Text style={[s.sellerName, { textAlign: isRTL ? "right" : "left" }]}>{sellerName}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.success }} />
              <Text style={{ fontSize: 10, color: C.success, fontWeight: "700" }}>
                {isRTL ? "متصل" : "En ligne"}
              </Text>
            </View>
          </View>
        </View>
        <View style={[s.listingBadge, { alignItems: isRTL ? "flex-start" : "flex-end" }]}>
          <Text style={s.listingTitle} numberOfLines={1}>{(listingTitle || "").substring(0, 16)}</Text>
          <Text style={s.listingPrice}>{(listingPrice || 0).toLocaleString()} DA</Text>
        </View>
      </View>

      {/* ── MESSAGES ── */}
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={item => item.id}
        contentContainerStyle={s.msgList}
        showsVerticalScrollIndicator={false}
        renderItem={renderMessage}
        ListEmptyComponent={!loading ? (
          <View style={s.emptyChat}>
            <Ionicons name="chatbubbles-outline" size={40} color={C.textDim} />
            <Text style={{ color: C.textMuted, marginTop: 10, fontSize: 13 }}>
              {isRTL ? "ابدأ المحادثة" : "Commencez la conversation"}
            </Text>
          </View>
        ) : null}
      />

      {/* ── BARRE D'ENTRÉE ── */}
      <View style={[s.inputBar, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        {/* Bouton image */}
        <TouchableOpacity onPress={pickImage} style={s.imgBtn} disabled={uploadingImg}>
          {uploadingImg
            ? <ActivityIndicator size="small" color={C.accent} />
            : <Ionicons name="image-outline" size={22} color={C.accent} />
          }
        </TouchableOpacity>

        <TextInput
          style={[s.input, { textAlign: isRTL ? "right" : "left" }]}
          placeholder={t("writeMessage")}
          placeholderTextColor={C.textDim}
          value={text}
          onChangeText={setText}
          onSubmitEditing={send}
          returnKeyType="send"
          multiline
        />

        <TouchableOpacity
          style={[s.sendBtn, (!text.trim() || sending) && s.sendBtnOff]}
          onPress={send}
          disabled={!text.trim() || sending}>
          <Ionicons name="send" size={18} color={text.trim() ? "#000" : C.textDim} />
        </TouchableOpacity>
      </View>

      {/* ── Visionneuse plein écran ── */}
      <Modal
        visible={!!viewerImg}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerImg(null)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={s.viewerBg}
          onPress={() => setViewerImg(null)}
        >
          <TouchableOpacity
            style={s.viewerClose}
            onPress={() => setViewerImg(null)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          {viewerImg ? (
            <Image
              source={{ uri: viewerImg }}
              style={s.viewerImg}
              resizeMode="contain"
            />
          ) : null}
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: C.bg },
  header:       { alignItems: "center", gap: 10, paddingHorizontal: 12, paddingBottom: 12, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn:      { width: 36, height: 36, borderRadius: 10, backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  sellerInfo:   { flex: 1, alignItems: "center", gap: 10 },
  avatar:       { width: 40, height: 40, borderRadius: 20, backgroundColor: C.accent + "20", borderWidth: 2, borderColor: C.accent, alignItems: "center", justifyContent: "center" },
  avatarTxt:    { fontSize: 16, fontWeight: "900", color: C.accent },
  sellerName:   { fontSize: 13, fontWeight: "800", color: C.text },
  listingBadge: { backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 6, maxWidth: 120 },
  listingTitle: { fontSize: 9, color: C.textMuted },
  listingPrice: { fontSize: 11, fontWeight: "800", color: C.accent },
  msgList:      { padding: 12, flexGrow: 1 },
  emptyChat:    { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80 },
  msgRow:       { flexDirection: "row", justifyContent: "flex-start", marginBottom: 10 },
  msgRowMe:     { justifyContent: "flex-end" },
  bubble:       { maxWidth: "78%", borderRadius: 16, padding: 10 },
  bubbleMe:     { backgroundColor: C.accent, borderBottomRightRadius: 4 },
  bubbleThem:   { backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border, borderBottomLeftRadius: 4 },
  // Messenger-style image bubble: no background, rounded photo, small caption
  imgWrap:         { maxWidth: 200 },
  msgImage:        { width: 200, height: 200, borderRadius: 18 },
  imgCaption:      { fontSize: 13, color: C.text, marginTop: 6, lineHeight: 18 },
  imgTime:         { fontSize: 10, color: C.textDim, marginTop: 4, alignSelf: "flex-start" },
  imgTimeMe:       { alignSelf: "flex-end" },
  // Fullscreen viewer
  viewerBg:        { flex: 1, backgroundColor: "rgba(0,0,0,0.96)", alignItems: "center", justifyContent: "center" },
  viewerClose:     { position: "absolute", top: 60, right: 20, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  viewerImg:       { width: Dimensions.get("window").width, height: Dimensions.get("window").height * 0.85 },
  msgTxt:       { fontSize: 13, color: C.text, lineHeight: 18 },
  msgTxtMe:     { color: "#000" },
  msgTime:      { fontSize: 9, color: C.textMuted, marginTop: 4, textAlign: "right" },
  inputBar:     { gap: 8, padding: 10, backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.border, alignItems: "flex-end" },
  imgBtn:       { width: 42, height: 42, borderRadius: 12, backgroundColor: C.accent + "15", borderWidth: 1, borderColor: C.accent + "30", alignItems: "center", justifyContent: "center" },
  input:        { flex: 1, backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, color: C.text, fontSize: 13, maxHeight: 100 },
  sendBtn:      { width: 42, height: 42, borderRadius: 12, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" },
  sendBtnOff:   { backgroundColor: C.surfaceAlt },
});