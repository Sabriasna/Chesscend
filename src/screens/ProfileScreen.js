import React from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useApp } from '../context/AppContext';
import { Avatar, BackHeader, Card, Page, T } from '../components/ui';
import Piece from '../components/Piece';
import { THEMES } from '../theme/themes';
import { C, F } from '../theme/ui';

const TOGGLES = [
  { key: 'showHints', label: 'Hints & coach', help: 'Show possible moves, pieces in danger and friendly tips' },
  { key: 'showCoordinates', label: 'Coordinates', help: 'Letters and numbers on the board edge' },
  { key: 'autoFlip', label: 'Flip board each turn', help: 'Friend mode: the board turns to face the player to move' },
  { key: 'haptics', label: 'Vibrations', help: 'Small vibration on every move' },
];

export default function ProfileScreen({ nav }) {
  const { settings, updateSettings } = useApp();
  return (
    <>
      <BackHeader title="Profile & Settings" onBack={nav.back} />
      <Page>
        <View style={{ alignItems: 'center', marginTop: 8 }}>
          <Avatar name={settings.playerName} size={88} ring={C.gold} />
        </View>
        <Text style={styles.label}>YOUR NAME</Text>
        <TextInput
          value={settings.playerName}
          onChangeText={(t) => updateSettings({ playerName: t.slice(0, 20) || '' })}
          onEndEditing={() => !settings.playerName.trim() && updateSettings({ playerName: 'Player' })}
          placeholder="Player"
          placeholderTextColor={C.faint}
          style={styles.input}
          maxLength={20}
        />

        <Text style={styles.label}>BOARD THEME</Text>
        <View style={styles.grid}>
          {THEMES.map((t) => {
            const on = t.id === settings.themeId;
            return (
              <Pressable key={t.id} onPress={() => updateSettings({ themeId: t.id })} style={[styles.theme, on && { borderColor: C.ink }]}>
                <View style={{ padding: 3, backgroundColor: t.frame, borderRadius: 6 }}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: 64 }}>
                    {[0, 1, 2, 3].map((i) => (
                      <View key={i} style={{ width: 32, height: 32, backgroundColor: i === 0 || i === 3 ? t.light : t.dark }}>
                        {i === 0 ? <Piece type="n" color="b" size={32} theme={t} /> : null}
                        {i === 3 ? <Piece type="q" color="w" size={32} theme={t} /> : null}
                      </View>
                    ))}
                  </View>
                </View>
                <Text style={[styles.themeName, on && { fontFamily: F.bold }]} numberOfLines={1}>{t.name}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>OPTIONS</Text>
        <Card style={{ paddingVertical: 4 }}>
          {TOGGLES.map((o, i) => (
            <View key={o.key} style={[styles.toggle, i > 0 && { borderTopWidth: 1, borderTopColor: C.cardBorder }]}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={[T.h3, { fontSize: 16 }]}>{o.label}</Text>
                <Text style={T.small}>{o.help}</Text>
              </View>
              <Switch
                value={!!settings[o.key]}
                onValueChange={(v) => updateSettings({ [o.key]: v })}
                trackColor={{ true: C.dark, false: '#DDD3BE' }}
                thumbColor={settings[o.key] ? C.gold : '#fff'}
              />
            </View>
          ))}
        </Card>
      </Page>
    </>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: F.bold, fontSize: 12, letterSpacing: 1.5, color: C.muted, marginTop: 22, marginBottom: 10 },
  input: {
    fontFamily: F.semibold, fontSize: 17, color: C.ink, backgroundColor: C.card, borderRadius: 14, borderWidth: 1,
    borderColor: C.cardBorder, paddingHorizontal: 16, paddingVertical: 12,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  theme: {
    width: 100, alignItems: 'center', paddingVertical: 10, borderRadius: 16, borderWidth: 2, borderColor: 'transparent', backgroundColor: C.card,
  },
  themeName: { fontFamily: F.medium, fontSize: 12, color: C.ink, marginTop: 6 },
  toggle: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
});
