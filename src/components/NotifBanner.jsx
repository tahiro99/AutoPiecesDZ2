import React, { useEffect, useRef, useState } from "react";
import { Animated, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import messaging from "@react-native-firebase/messaging";
import { C } from "../constants/theme";
import { routeFromData } from "../services/push.service";

export default function NotifBanner() {
  const insets = useSafeAreaInsets();
  const [msg, setMsg] = useState(null);
  const slide = useRef(new Animated.Value(-140)).current;
  const hideTimer = useRef(null);

  const show = (remoteMessage) => {
    const n = remoteMessage?.notification;
    if (!n?.title && !n?.body) return;
    setMsg({
      title: n.title || "AutoPièces DZ",
      body: n.body || "",
      data: remoteMessage?.data || {},
    });
    Animated.spring(slide, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(hide, 4500);
  };

  const hide = () => {
    Animated.timing(slide, {
      toValue: -140,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setMsg(null));
  };

  useEffect(() => {
    const unsubMsg = messaging().onMessage(show);

    const unsubOpen = messaging().onNotificationOpenedApp((rm) => {
      routeFromData(rm?.data);
    });

    messaging()
      .getInitialNotification()
      .then((rm) => {
        if (rm) routeFromData(rm.data);
      })
      .catch(() => {});

    return () => {
      unsubMsg();
      unsubOpen();
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  if (!msg) return null;

  return (
    <Animated.View
      style={[
        s.wrap,
        { paddingTop: (insets.top || (Platform.OS === "ios" ? 50 : 10)) + 6, transform: [{ translateY: slide }] },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => {
          hide();
          routeFromData(msg.data);
        }}
        style={s.card}
      >
        <Ionicons name="notifications" size={20} color={C.accent} />
        <Animated.View style={{ flex: 1 }}>
          <Text style={s.title} numberOfLines={1}>{msg.title}</Text>
          {!!msg.body && <Text style={s.body} numberOfLines={2}>{msg.body}</Text>}
        </Animated.View>
        <TouchableOpacity onPress={hide} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={18} color={C.textDim} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    zIndex: 9999,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  title: { fontSize: 14, fontWeight: "800", color: C.text },
  body: { fontSize: 12, color: C.textMuted, marginTop: 2 },
});
