import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../../constants/theme";
import { ALGMAP_WILAYAS } from "../../constants/wilayas";
import { useCollection } from "../../hooks/useCollection";

const { width } = Dimensions.get("window");
const MAP_W = width - 24;
const MAP_H = MAP_W * 0.65;

export default function MapScreen({ navigation }) {
  const { data: listings } = useCollection("listings");
  const [selected, setSelected] = useState(null);

  const wilayaData = ALGMAP_WILAYAS.map((w) => {
    const real = (listings || []).filter((l) => l.wilaya === w.name).length;
    return { ...w, count: real > 0 ? real : w.count };
  });
  const maxCount = Math.max(...wilayaData.map((w) => w.count), 1);
  const sorted   = [...wilayaData].sort((a, b) => b.count - a.count);

  const handleSelect = (name) => {
    setSelected(name === selected ? null : name);
    if (name !== selected) {
      setTimeout(() => navigation.navigate("Catalogue"), 400);
    }
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Carte des annonces</Text>
        <Text style={s.sub}>Cliquez sur une wilaya pour filtrer les annonces — données Firebase temps réel</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Map */}
        <View style={s.mapContainer}>
          {/* Algeria shape background */}
          <View style={s.mapBg}>
            <View style={s.algeriaShape} />
          </View>
          {/* Dots */}
          {wilayaData.map((w) => {
            const ratio = w.count / maxCount;
            const size  = Math.round(18 + ratio * 36);
            const glow  = selected === w.name;
            return (
              <TouchableOpacity key={w.name} onPress={() => handleSelect(w.name)}
                style={[s.dot, {
                  left:   `${w.x}%`,
                  top:    `${w.y}%`,
                  width:  size,
                  height: size,
                  borderRadius: size / 2,
                  backgroundColor: glow ? C.accent : C.accent + "CC",
                  shadowColor: C.accent,
                  shadowOpacity: glow ? 0.9 : 0.4,
                  shadowRadius: glow ? 12 : 5,
                  shadowOffset: { width: 0, height: 0 },
                  elevation: glow ? 10 : 4,
                  transform: [{ translateX: -(size / 2) }, { translateY: -(size / 2) }],
                }]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              />
            );
          })}
        </View>

        {/* Top Wilayas */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>TOP WILAYAS — DONNÉES EN TEMPS RÉEL</Text>
          <View style={s.topGrid}>
            {sorted.slice(0, 6).map((w) => (
              <TouchableOpacity key={w.name} onPress={() => handleSelect(w.name)}
                style={[s.topCard, selected === w.name && s.topCardActive]}>
                <Text style={s.topCount}>{w.count}</Text>
                <Text style={s.topName}>{w.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Full list */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>TOUTES LES WILAYAS</Text>
          {sorted.map((w) => (
            <TouchableOpacity key={w.name} onPress={() => handleSelect(w.name)} style={s.listRow}>
              <View style={[s.listDot, { backgroundColor: selected === w.name ? C.accent : C.accent + "80" }]} />
              <Text style={[s.listName, selected === w.name && { color: C.accent }]}>{w.name}</Text>
              <View style={s.barWrap}>
                <View style={[s.barFill, { width: `${Math.max((w.count / maxCount) * 100, 2)}%` }]} />
              </View>
              <Text style={[s.listCount, selected === w.name && { color: C.accent }]}>{w.count}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: C.bg },
  header:       { padding: 16, backgroundColor: C.bg, borderBottomWidth: 1, borderBottomColor: C.border },
  title:        { fontSize: 18, fontWeight: "800", color: C.text, marginBottom: 4 },
  sub:          { fontSize: 11, color: C.textMuted, lineHeight: 16 },
  mapContainer: { width: MAP_W, height: MAP_H, margin: 12, position: "relative" },
  mapBg:        { ...StyleSheet.absoluteFillObject, borderRadius: 16, overflow: "hidden", backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  algeriaShape: { flex: 1, backgroundColor: C.surfaceAlt, margin: 20, borderRadius: 12 },
  dot:          { position: "absolute" },
  section:      { paddingHorizontal: 12, marginBottom: 16 },
  sectionLabel: { fontSize: 10, fontWeight: "800", color: C.textMuted, letterSpacing: 0.8, marginBottom: 12 },
  topGrid:      { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  topCard:      { width: "30.5%", backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 14, alignItems: "center" },
  topCardActive:{ borderColor: C.accent, backgroundColor: C.accent + "10" },
  topCount:     { fontSize: 22, fontWeight: "900", color: C.accent, marginBottom: 2 },
  topName:      { fontSize: 10, color: C.textMuted, fontWeight: "600", textAlign: "center" },
  listRow:      { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  listDot:      { width: 8, height: 8, borderRadius: 4 },
  listName:     { width: 100, fontSize: 13, fontWeight: "600", color: C.text },
  barWrap:      { flex: 1, height: 4, backgroundColor: C.surfaceAlt, borderRadius: 2, overflow: "hidden" },
  barFill:      { height: "100%", backgroundColor: C.accent, borderRadius: 2, opacity: 0.75 },
  listCount:    { fontSize: 13, fontWeight: "800", color: C.textMuted, width: 36, textAlign: "right" },
});
