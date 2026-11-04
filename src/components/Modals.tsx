import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Color, PieceType } from '../engine/chess';
import { useSettings } from '../context/SettingsContext';
import { SERIF } from '../theme/themes';
import Piece from './Piece';
import { Button } from './ui';

export function PromotionModal({
  visible, color, onChoose, onCancel,
}: {
  visible: boolean;
  color: Color;
  onChoose: (p: PieceType) => void;
  onCancel: () => void;
}) {
  const { theme } = useSettings();
  const choices: { t: PieceType; name: string }[] = [
    { t: 'q', name: 'Dame' },
    { t: 'r', name: 'Tour' },
    { t: 'b', name: 'Fou' },
    { t: 'n', name: 'Cavalier' },
  ];
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <Text style={[styles.title, { color: theme.text }]}>Promotion du pion</Text>
          <View style={styles.row}>
            {choices.map((c) => (
              <Pressable
                key={c.t}
                onPress={() => onChoose(c.t)}
                style={({ pressed }) => [
                  styles.choice,
                  { backgroundColor: pressed ? theme.selected : theme.light },
                ]}
              >
                <Piece type={c.t} color={color} size={56} theme={theme} />
                <Text style={{ color: theme.frame, fontSize: 11, fontWeight: '700' }}>{c.name}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

export function GameOverModal({
  visible, title, subtitle, onReplay, onClose, onMenu,
}: {
  visible: boolean;
  title: string;
  subtitle: string;
  onReplay: () => void;
  onClose: () => void;
  onMenu: () => void;
}) {
  const { theme } = useSettings();
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.accent, borderWidth: 1 }]}>
          <Text style={{ fontSize: 44, textAlign: 'center', color: theme.accent }}>{'♚︎'}</Text>
          <Text style={[styles.bigTitle, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>{subtitle}</Text>
          <View style={{ gap: 10, marginTop: 18, alignSelf: 'stretch' }}>
            <Button label="Rejouer" icon="↻" onPress={onReplay} />
            <Button label="Voir l'échiquier" variant="secondary" onPress={onClose} />
            <Button label="Menu principal" variant="ghost" onPress={onMenu} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { borderRadius: 20, padding: 22, alignItems: 'center', minWidth: 290, maxWidth: 380, width: '100%' },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 16, fontFamily: SERIF },
  row: { flexDirection: 'row', gap: 10 },
  choice: { borderRadius: 12, padding: 6, alignItems: 'center' },
  bigTitle: { fontSize: 26, fontFamily: SERIF, fontWeight: '700', textAlign: 'center', marginTop: 4 },
  subtitle: { fontSize: 15, textAlign: 'center', marginTop: 6 },
});
