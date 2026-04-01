import React, { useState, useRef, useEffect } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../../constants/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMessages } from "../../hooks/useMessages";
import { useAuthContext } from "../../context/AuthContext";
import { sendMessage, markAsRead } from "../../services/db.service";
import { createNotif } from "../../services/Notif.service";
import { useLanguage } from "../../i18n/languagecontext";

export default function ChatScreen({ route, navigation }) {
  const { t, isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { conversationId: initialConvId, sellerName, listingTitle, listingPrice, sellerId, buyerId } = route.params;
  const { user }              = useAuthContext();
  const realConvId = typeof convId === "string" ? convId : null;
  const { messages, loading } = useMessages(realConvId);
  const [text, setText]       = useState("");
  const [sending, setSending] = useState(false);
  const flatRef = useRef(null);
  const uid = user?.uid || "guest";
  const [convId, setConvId] = useState(initialConvId);

  useEffect(() => { if (typeof convId === "string") markAsRead(convId).catch(()=>{}); }, [convId]);
  useEffect(() => {
    if (messages.length > 0) setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

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
    }
    catch (e) { console.log(e); }
    setSending(false);
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS==="ios"?"padding":"height"} keyboardVerticalOffset={Platform.OS==="ios"?90:0}>
      <View style={[s.header, { flexDirection: isRTL ? "row-reverse" : "row", paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={()=>navigation.goBack()} style={s.backBtn}>
          <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={20} color={C.text} />
        </TouchableOpacity>
        <View style={[s.sellerInfo, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View style={s.avatar}>
            <Text style={s.avatarTxt}>{(sellerName||"?")[0].toUpperCase()}</Text>
          </View>
          <View>
            <Text style={[s.sellerName, { textAlign: isRTL ? "right" : "left" }]}>{sellerName}</Text>
            <View style={{flexDirection:"row",alignItems:"center",gap:4}}>
              <View style={{width:6,height:6,borderRadius:3,backgroundColor:C.success}} />
              <Text style={{fontSize:10,color:C.success,fontWeight:"700"}}>{isRTL ? "متصل" : "En ligne"}</Text>
            </View>
          </View>
        </View>
        <View style={[s.listingBadge, { alignItems: isRTL ? "flex-start" : "flex-end" }]}>
          <Text style={s.listingTitle} numberOfLines={1}>{(listingTitle||"").substring(0,16)}</Text>
          <Text style={s.listingPrice}>{(listingPrice||0).toLocaleString()} DA</Text>
        </View>
      </View>

      <FlatList ref={flatRef} data={messages} keyExtractor={(item)=>item.id}
        contentContainerStyle={s.msgList} showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const isMe = item.senderId === uid;
          return (
            <View style={[s.msgRow, isMe&&s.msgRowMe]}>
              <View style={[s.bubble, isMe?s.bubbleMe:s.bubbleThem]}>
                <Text style={[s.msgTxt, isMe&&s.msgTxtMe, { textAlign: isRTL ? "right" : "left" }]}>{item.text}</Text>
                <Text style={[s.msgTime, isMe&&{color:"#00000060"}]}>
                  {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"}) : ""}
                </Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={!loading ? (
          <View style={s.emptyChat}>
            <Ionicons name="chatbubbles-outline" size={40} color={C.textDim} />
            <Text style={{color:C.textMuted,marginTop:10,fontSize:13}}>{isRTL ? "ابدأ المحادثة" : "Commencez la conversation"}</Text>
          </View>
        ) : null}
      />

      <View style={[s.inputBar, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <TextInput style={[s.input, { textAlign: isRTL ? "right" : "left" }]}
          placeholder={t("writeMessage")} placeholderTextColor={C.textDim}
          value={text} onChangeText={setText} onSubmitEditing={send} returnKeyType="send" multiline />
        <TouchableOpacity style={[s.sendBtn,(!text.trim()||sending)&&s.sendBtnOff]}
          onPress={send} disabled={!text.trim()||sending}>
          <Ionicons name={isRTL ? "send" : "send"} size={18} color={text.trim()?"#000":C.textDim} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container:    {flex:1,backgroundColor:C.bg},
  header:       {alignItems:"center",gap:10,paddingHorizontal:12,paddingBottom:12,backgroundColor:C.surface,borderBottomWidth:1,borderBottomColor:C.border},
  backBtn:      {width:36,height:36,borderRadius:10,backgroundColor:C.surfaceAlt,borderWidth:1,borderColor:C.border,alignItems:"center",justifyContent:"center"},
  sellerInfo:   {flex:1,alignItems:"center",gap:10},
  avatar:       {width:40,height:40,borderRadius:20,backgroundColor:C.accent+"20",borderWidth:2,borderColor:C.accent,alignItems:"center",justifyContent:"center"},
  avatarTxt:    {fontSize:16,fontWeight:"900",color:C.accent},
  sellerName:   {fontSize:13,fontWeight:"800",color:C.text},
  listingBadge: {backgroundColor:C.surfaceAlt,borderWidth:1,borderColor:C.border,borderRadius:8,padding:6,maxWidth:120},
  listingTitle: {fontSize:9,color:C.textMuted},
  listingPrice: {fontSize:11,fontWeight:"800",color:C.accent},
  msgList:      {padding:12,flexGrow:1},
  emptyChat:    {flex:1,alignItems:"center",justifyContent:"center",paddingTop:80},
  msgRow:       {flexDirection:"row",justifyContent:"flex-start",marginBottom:10},
  msgRowMe:     {justifyContent:"flex-end"},
  bubble:       {maxWidth:"78%",borderRadius:16,padding:12},
  bubbleMe:     {backgroundColor:C.accent,borderBottomRightRadius:4},
  bubbleThem:   {backgroundColor:C.surfaceAlt,borderWidth:1,borderColor:C.border,borderBottomLeftRadius:4},
  msgTxt:       {fontSize:13,color:C.text,lineHeight:18},
  msgTxtMe:     {color:"#000"},
  msgTime:      {fontSize:9,color:C.textMuted,marginTop:4,textAlign:"right"},
  inputBar:     {gap:8,padding:10,backgroundColor:C.surface,borderTopWidth:1,borderTopColor:C.border,alignItems:"flex-end"},
  input:        {flex:1,backgroundColor:C.surfaceAlt,borderWidth:1,borderColor:C.border,borderRadius:12,paddingHorizontal:14,paddingVertical:10,color:C.text,fontSize:13,maxHeight:100},
  sendBtn:      {width:42,height:42,borderRadius:12,backgroundColor:C.accent,alignItems:"center",justifyContent:"center"},
  sendBtnOff:   {backgroundColor:C.surfaceAlt},
});