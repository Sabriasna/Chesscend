import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Piece from '../components/Piece';
import { Button, Chip, Header, SectionTitle } from '../components/ui';
import { useSettings } from '../context/SettingsContext';
import { AI_LEVELS, AiLevel } from '../engine/ai';
import type { Color } from '../engine/chess';
import type { GameConfig, GameMode, SavedGame, TimeControl } from '../storage/storage';
import { SERIF } from '../theme/themes';

const TIME_CONTROLS: { label: string; tc: TimeControl | null }[] = [
  { label: 'Sans pendule', tc: null },
  { label: '3 + 2', tc: { minutes: 3, increment: 2 } },
  { label: '5 min', tc: { minutes: 5, increment: 0 } },
  { label: '10 min', tc: { minutes: 10, increment: 0 } },
  { label: '15 + 10', tc: { minutes: 15, increment: 10 } },
  { label: '30 min', tc: { minutes: 30, increment: 0 } },
];

interface Props {
  saved: SavedGame | null;
  onStart: (config: GameConfig) => void;
  onResume: () => void;
  onSettings: () => void;
}

export default function HomeScreen({ saved, onStart, onResume, onSettings }: Props) {
  const { theme } = useSettings();
  const [setupMode, setSetupMode] = useState<GameMode | null>(null);
  const [level, setLevel] = useState<AiLevel>(2);
  const [color, setColor] = useState<Color | 'random'>('w');
  const [tcIndex, setTcIndex] = useState(0);

  if (setupMode) {
    const start = () => {
      const playerColor: Color = color === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : color;
      onStart({ mode: setupMode, aiLevel: level, playerColor, timeControl: TIME_CONTROLS[tcIndex].tc });
    };
    return (
      <View style={{ flex: 1 }}>
        <Header
          title={setupMode === 'ai' ? 'Contre l’ordinateur' : 'Deux joueurs'}
          onBack={() => setSetupMode(null)}
        />
        <ScrollView contentContainerStyle={styles.setup}>
          {setupMode === 'ai' && (
            <>
              <SectionTitle>Niveau</SectionTitle>
              <View style={styles.chips}>
                {([1, 2, 3, 4] as AiLevel[]).map((l) => (
                  <Chip key={l} label={AI_LEVELS[l].label} active={level === l} onPress={() => setLevel(l)} />
                ))}
              </View>

              <SectionTitle>Vous jouez</SectionTitle>
              <View style={styles.chips}>
                <Chip label="Les Blancs" active={color === 'w'} onPress={() => setColor('w')} />
                <Chip label="Les Noirs" active={color === 'b'} onPress={() => setColor('b')} />
                <Chip label="Au hasard" active={color === 'random'} onPress={() => setColor('random')} />
              </View>
            </>
          )}

          <SectionTitle>Cadence</SectionTitle>
          <View style={styles.chips}>
            {TIME_CONTROLS.map((t, i) => (
              <Chip key={t.label} label={t.label} active={tcIndex === i} onPress={() => setTcIndex(i)} />
            ))}
          </View>

          {saved && (
            <Text style={[styles.warning, { color: theme.textMuted }]}>
              La partie en cours sauvegardée sera remplacée.
            </Text>
          )}

          <Button label="Commencer la partie" icon="▶" onPress={start} style={{ marginTop: 30 }} />
        </ScrollView>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.home}>
      <View style={styles.hero}>
        <View style={[styles.emblem, { backgroundColor: theme.frame, borderColor: theme.accent }]}>
          <View style={[styles.emblemInner, { backgroundColor: theme.light }]}>
            <View style={{ transform: [{ rotate: '-45deg' }] }}>
              <Piece type="n" color="b" size={92} theme={theme} />
            </View>
          </View>
        </View>
        <Text style={[styles.title, { color: theme.text }]}>Chesscend</Text>
        <View style={[styles.rule, { backgroundColor: theme.accent }]} />
        <Text style={[styles.tagline, { color: theme.textMuted }]}>Le jeu des rois, dans votre poche</Text>
      </View>

      <View style={styles.menu}>
        {saved && (
          <Button
            label={`Reprendre la partie (${saved.moves.length} coups)`}
            icon="⏵"
            onPress={onResume}
          />
        )}
        <Button
          label="Contre l’ordinateur"
          icon={'♚︎'}
          variant={saved ? 'secondary' : 'primary'}
          onPress={() => setSetupMode('ai')}
        />
        <Button label="Deux joueurs" icon={'♔︎'} variant="secondary" onPress={() => setSetupMode('local')} />
        <Button label="En ligne · bientôt" icon="🌐" variant="secondary" onPress={() => {}} disabled />
        <Button label="Réglages et thèmes" icon="⚙" variant="ghost" onPress={onSettings} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  home: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  hero: { alignItems: 'center', marginBottom: 36 },
  emblem: { padding: 8, borderRadius: 30, borderWidth: 2, transform: [{ rotate: '45deg' }] },
  emblemInner: {
    width: 110, height: 110, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 48, fontFamily: SERIF, fontWeight: '700', marginTop: 34, letterSpacing: 1 },
  rule: { width: 56, height: 3, borderRadius: 2, marginVertical: 12 },
  tagline: { fontSize: 15, fontStyle: 'italic', fontFamily: SERIF },
  menu: { gap: 12, width: '100%', maxWidth: 420, alignSelf: 'center' },
  setup: { padding: 20, paddingBottom: 40, maxWidth: 520, width: '100%', alignSelf: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  warning: { marginTop: 24, fontSize: 13, textAlign: 'center' },
});
