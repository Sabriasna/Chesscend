import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { C, F, radius } from '../theme/ui';
import Piece from './Piece';
import { PillButton } from './ui';

export function PromotionModal({ visible, color, theme, onChoose, onCancel }) {
  const choices = [
    { t: 'q', name: 'Queen' },
    { t: 'r', name: 'Rook' },
    { t: 'b', name: 'Bishop' },
    { t: 'n', name: 'Knight' },
  ];
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Promote your pawn</Text>
          <Text style={styles.sub}>Most players choose the queen.</Text>
          <View style={styles.row}>
            {choices.map((c) => (
              <Pressable
                key={c.t}
                onPress={() => onChoose(c.t)}
                style={({ pressed }) => [styles.choice, { backgroundColor: pressed ? C.goldLight : C.goldPale }]}
              >
                <Piece type={c.t} color={color} size={54} theme={theme} />
                <Text style={styles.choiceText}>{c.name}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

export function GameOverModal({ visible, title, subtitle, extra, onReplay, onClose, onMenu }) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.trophy}>
            <MaterialCommunityIcons name="trophy" size={40} color={C.gold} />
          </View>
          <Text style={[styles.title, { fontSize: 28 }]}>{title}</Text>
          <Text style={styles.sub}>{subtitle}</Text>
          {extra ? <Text style={[styles.sub, { color: C.ink, fontFamily: F.semibold, marginTop: 6 }]}>{extra}</Text> : null}
          <View style={{ gap: 10, marginTop: 20, alignSelf: 'stretch' }}>
            <PillButton label="Play again" icon="rotate-cw" onPress={onReplay} />
            <PillButton label="View the board" variant="light" size="m" onPress={onClose} />
            <PillButton label="Back to home" variant="light" size="m" onPress={onMenu} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function ConfirmModal({ visible, title, text, confirm, cancel, onConfirm, onCancel }) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.trophy}>
            <MaterialCommunityIcons name="flag-outline" size={36} color={C.gold} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.sub}>{text}</Text>
          <View style={{ gap: 10, marginTop: 20, alignSelf: 'stretch' }}>
            <PillButton label={confirm} onPress={onConfirm} />
            <PillButton label={cancel} variant="light" size="m" onPress={onCancel} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Simple information sheet (notifications, "coming soon"…). */
export function InfoModal({ visible, icon = 'bell-outline', title, text, onClose }) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.sheet}>
          <View style={styles.trophy}>
            <MaterialCommunityIcons name={icon} size={36} color={C.gold} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={[styles.sub, { lineHeight: 22 }]}>{text}</Text>
          <PillButton label="Got it" size="m" onPress={onClose} style={{ marginTop: 18, alignSelf: 'stretch' }} />
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(30, 20, 5, 0.45)', alignItems: 'center', justifyContent: 'center', padding: 22 },
  sheet: { backgroundColor: C.card, borderRadius: radius.l, padding: 22, alignItems: 'center', width: '100%', maxWidth: 380 },
  title: { fontFamily: F.bold, fontSize: 20, color: C.ink, textAlign: 'center' },
  sub: { fontFamily: F.regular, fontSize: 15, color: C.muted, textAlign: 'center', marginTop: 4 },
  row: { flexDirection: 'row', gap: 8, marginTop: 16 },
  choice: { borderRadius: radius.s, padding: 6, alignItems: 'center' },
  choiceText: { fontFamily: F.semibold, fontSize: 11, color: C.ink },
  trophy: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: C.goldPale, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
});
