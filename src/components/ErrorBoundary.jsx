import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import crashlytics from "@react-native-firebase/crashlytics";
import { C } from "../constants/theme";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMsg: "" };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, errorMsg: error?.message || "Erreur inconnue" };
  }

  componentDidCatch(error, errorInfo) {
    try {
      crashlytics().recordError(error);
      crashlytics().log("componentStack: " + (errorInfo?.componentStack || ""));
    } catch (_) {}
    console.log("[ErrorBoundary]", error, errorInfo);
  }

  reset = () => this.setState({ hasError: false, errorMsg: "" });

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <View style={s.container}>
        <Text style={s.emoji}>😕</Text>
        <Text style={s.title}>Oups, une erreur est survenue</Text>
        <Text style={s.body}>
          L'app a rencontré un problème. Vous pouvez réessayer ou la relancer.
        </Text>
        <Text style={s.errorMsg}>{this.state.errorMsg}</Text>
        <TouchableOpacity onPress={this.reset} style={s.btn}>
          <Text style={s.btnTxt}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center", padding: 24 },
  emoji:     { fontSize: 48, marginBottom: 16 },
  title:     { fontSize: 20, fontWeight: "900", color: C.text, marginBottom: 8, textAlign: "center" },
  body:      { fontSize: 14, color: C.textMuted, textAlign: "center", marginBottom: 16, lineHeight: 20 },
  errorMsg:  { fontSize: 11, color: C.textDim, fontFamily: "monospace", textAlign: "center", marginBottom: 24, paddingHorizontal: 16 },
  btn:       { backgroundColor: C.accent, paddingHorizontal: 30, paddingVertical: 12, borderRadius: 12 },
  btnTxt:    { color: "#000", fontWeight: "900", fontSize: 14 },
});
