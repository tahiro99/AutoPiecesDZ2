import React, { useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, ScrollView,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { db, auth } from '../config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const REASONS = [
  'Annonce ou profil frauduleux',
  'Pièce non conforme à la description',
  'Comportement inapproprié ou irrespectueux',
  'Arnaque / Escroquerie',
  'Spam ou publicité abusive',
  'Contenu illégal',
  'Faux avis ou fausse note',
  'Autre raison',
];

export default function ReportModal({ visible, onClose, targetUserId, targetUserName }) {
  const [reason, setReason]   = useState('');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);

  const reset = () => { setReason(''); setDetails(''); };

  const handleSubmit = async () => {
    if (!reason) { Alert.alert('Erreur', 'Veuillez choisir une raison'); return; }
    const user = auth.currentUser;
    if (!user) { Alert.alert('Erreur', 'Vous devez être connecté pour signaler'); return; }
    if (user.uid === targetUserId) { Alert.alert('Erreur', 'Vous ne pouvez pas vous signaler vous-même'); return; }

    setLoading(true);
    try {
      await addDoc(collection(db, 'reports'), {
        reporterId:   user.uid,
        reporterName: user.displayName || user.email || 'Utilisateur',
        targetUserId,
        targetUserName,
        reason,
        details: details.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      Alert.alert(
        'Signalement envoyé ✅',
        'Notre équipe va examiner ce signalement dans les plus brefs délais. Merci.',
        [{ text: 'OK', onPress: () => { onClose(); reset(); } }]
      );
    } catch (e) {
      Alert.alert('Erreur', "Impossible d'envoyer le signalement. Réessayez.");
    }
    setLoading(false);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={() => { onClose(); reset(); }}>
      <KeyboardAvoidingView
        style={s.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <TouchableOpacity
          style={s.backdrop}
          activeOpacity={1}
          onPress={() => { onClose(); reset(); }} />
        <View style={s.sheet}>
          <View style={s.handle} />
          <Text style={s.title}>Signaler {targetUserName}</Text>
          <Text style={s.sub}>
            Ce signalement sera envoyé à l'équipe AutoPièces DZ. Nous l'examinerons et prendrons les mesures nécessaires.
          </Text>

          <Text style={s.label}>RAISON DU SIGNALEMENT *</Text>
          <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
            {REASONS.map(r => (
              <TouchableOpacity
                key={r}
                style={[s.reasonRow, reason === r && s.reasonRowActive]}
                onPress={() => setReason(r)}
                activeOpacity={0.7}>
                <View style={[s.radio, reason === r && s.radioActive]}>
                  {reason === r && <View style={s.radioDot} />}
                </View>
                <Text style={[s.reasonText, reason === r && s.reasonTextActive]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[s.label, { marginTop: 16 }]}>DÉTAILS SUPPLÉMENTAIRES (optionnel)</Text>
          <TextInput
            style={s.input}
            placeholder="Décrivez le problème en détail..."
            placeholderTextColor="#3D4756"
            value={details}
            onChangeText={setDetails}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[s.submitBtn, !reason && s.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading || !reason}>
            {loading
              ? <ActivityIndicator color="#000" />
              : <Text style={s.submitText}>Envoyer le signalement</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity style={s.cancelBtn} onPress={() => { onClose(); reset(); }}>
            <Text style={s.cancelText}>Annuler</Text>
          </TouchableOpacity>

          <Text style={s.legal}>
            Tout signalement abusif ou faux peut entraîner la suspension de votre compte.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay:          { flex: 1, justifyContent: 'flex-end' },
  backdrop:         { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,.75)' },
  sheet:            { backgroundColor: '#0F1219', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 },
  handle:           { width: 40, height: 4, backgroundColor: '#1E2838', borderRadius: 2, alignSelf: 'center', marginBottom: 22 },
  title:            { fontSize: 20, fontWeight: '800', color: '#EBF0F4', marginBottom: 8 },
  sub:              { fontSize: 13, color: '#8892A4', marginBottom: 22, lineHeight: 20 },
  label:            { fontSize: 10, fontWeight: '700', color: '#556070', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 },
  reasonRow:        { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 10, marginBottom: 6, backgroundColor: '#13181F', borderWidth: 1, borderColor: '#1E2838' },
  reasonRowActive:  { borderColor: '#F0A500', backgroundColor: 'rgba(240,165,0,.05)' },
  radio:            { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#556070', alignItems: 'center', justifyContent: 'center' },
  radioActive:      { borderColor: '#F0A500' },
  radioDot:         { width: 8, height: 8, borderRadius: 4, backgroundColor: '#F0A500' },
  reasonText:       { fontSize: 14, color: '#8892A4', flex: 1 },
  reasonTextActive: { color: '#F0A500', fontWeight: '600' },
  input:            { backgroundColor: '#13181F', borderWidth: 1, borderColor: '#1E2838', borderRadius: 10, padding: 12, color: '#EBF0F4', fontSize: 14, minHeight: 80, marginBottom: 18 },
  submitBtn:        { backgroundColor: '#F0A500', borderRadius: 12, padding: 15, alignItems: 'center', marginBottom: 10 },
  submitBtnDisabled:{ backgroundColor: '#3D4756', opacity: .6 },
  submitText:       { color: '#000', fontSize: 15, fontWeight: '800' },
  cancelBtn:        { padding: 12, alignItems: 'center' },
  cancelText:       { color: '#556070', fontSize: 14 },
  legal:            { fontSize: 11, color: '#3D4756', textAlign: 'center', marginTop: 8, lineHeight: 16 },
});
