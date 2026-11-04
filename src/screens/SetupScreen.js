import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../context/AppContext';
import { BackHeader, Card, Page, PillButton, Segmented, T } from '../components/ui';
import { AI_LEVELS } from '../engine/ai';
import { TIME_CONTROLS } from '../data/timeControls';
import { C, F } from '../theme/ui';

const LEVEL_HELP = {
  1: 'Makes lots of mistakes. Perfect to learn the moves.',
  2: 'Plays simple moves. Great for your first wins.',
  3: 'Punishes pieces left undefended.',
  4: 'A real challenge. Think before every move!',
};

export default function SetupScreen({ mode: initialMode = 'ai', nav }) {
  const { settings, updateSettings } = useApp();
  const [mode, setMode] = useState(initialMode);
  const [level, setLevel] = useState(settings.preferredLevel);
  const [color, setColor] = useState('w');
  const [tc, setTc] = useState(0);

  const start = () => {
    const playerColor = color === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : color;
    if (mode === 'ai') updateSettings({ preferredLevel: level });
    nav.startGame({ mode, aiLevel: level, playerColor, timeControl: TIME_CONTROLS[tc].tc });
  };

  return (
    <>
      <BackHeader title="Custom Game" onBack={nav.back} />
      <Page>
        <Text style={styles.label}>OPPONENT</Text>
        <Segmented
          items={[{ key: 'ai', label: 'Computer' }, { key: 'local', label: 'Friend (same device)' }]}
          value={mode}
          onChange={setMode}
        />

        {mode === 'ai' && (
          <>
            <Text style={styles.label}>LEVEL</Text>
            <Card style={{ padding: 8 }}>
              {[1, 2, 3, 4].map((l) => (
                <Pressable key={l} onPress={() => setLevel(l)} style={[styles.option, l === level && styles.optionOn]}>
                  <View style={[styles.radio, l === level && styles.radioOn]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[T.h3, { fontSize: 16 }, l === level && { color: C.onDark }]}>{AI_LEVELS[l].label}</Text>
                    <Text style={[T.small, l === level && { color: '#DDD3BE' }]}>{LEVEL_HELP[l]}</Text>
                  </View>
                </Pressable>
              ))}
            </Card>

            <Text style={styles.label}>YOU PLAY</Text>
            <Segmented
              items={[{ key: 'w', label: 'White' }, { key: 'b', label: 'Black' }, { key: 'random', label: 'Random' }]}
              value={color}
              onChange={setColor}
            />
          </>
        )}

        <Text style={styles.label}>CLOCK</Text>
        <View style={styles.chips}>
          {TIME_CONTROLS.map((t, i) => (
            <Pressable key={t.label} onPress={() => setTc(i)} style={[styles.chip, i === tc && styles.chipOn]}>
              <Text style={[styles.chipText, i === tc && { color: C.onDark }]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>

        {nav.saved ? (
          <Text style={[T.small, { textAlign: 'center', marginTop: 20 }]}>Your unfinished game will be replaced.</Text>
        ) : null}

        <PillButton label="Start the Game" icon="play" onPress={start} style={{ marginTop: 22 }} />
      </Page>
    </>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: F.bold, fontSize: 12, letterSpacing: 1.5, color: C.muted, marginTop: 22, marginBottom: 10 },
  option: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 14, gap: 12 },
  optionOn: { backgroundColor: C.dark },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: C.faint },
  radioOn: { borderColor: C.gold, backgroundColor: C.gold },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999, backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder },
  chipOn: { backgroundColor: C.dark, borderColor: C.dark },
  chipText: { fontFamily: F.semibold, fontSize: 14, color: C.ink, marginTop: 2 },
});
