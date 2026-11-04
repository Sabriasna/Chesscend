import React from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Piece from '../components/Piece';
import { Header, SectionTitle } from '../components/ui';
import { useSettings } from '../context/SettingsContext';
import { THEMES } from '../theme/themes';
export default function SettingsScreen({ onBack }) {
    const { theme, settings, update } = useSettings();
    const toggles = [
        { key: 'showHints', label: 'Aide aux coups', help: 'Montre les coups possibles et les pièces en prise' },
        { key: 'showCoordinates', label: 'Coordonnées', help: 'Lettres et chiffres sur le bord de l’échiquier' },
        { key: 'autoFlip', label: 'Retourner à chaque tour', help: 'Mode deux joueurs : l’échiquier pivote vers le joueur au trait' },
        { key: 'haptics', label: 'Vibrations', help: 'Petite vibration à chaque coup' },
    ];
    return (<View style={{ flex: 1 }}>
      <Header title="Réglages" onBack={onBack}/>
      <ScrollView contentContainerStyle={styles.content}>
        <SectionTitle>Thème de l'échiquier</SectionTitle>
        <View style={styles.grid}>
          {THEMES.map((t) => (<ThemeCard key={t.id} t={t} active={t.id === settings.themeId} onPress={() => update({ themeId: t.id })}/>))}
        </View>

        <SectionTitle>Options</SectionTitle>
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          {toggles.map((o, i) => (<View key={o.key} style={[styles.toggle, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.textMuted }]}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600' }}>{o.label}</Text>
                <Text style={{ color: theme.textMuted, fontSize: 13, marginTop: 2 }}>{o.help}</Text>
              </View>
              <Switch value={settings[o.key]} onValueChange={(v) => update({ [o.key]: v })} trackColor={{ true: theme.accent, false: '#555' }} thumbColor="#fff"/>
            </View>))}
        </View>
      </ScrollView>
    </View>);
}
function ThemeCard({ t, active, onPress }) {
    const cell = 34;
    const pieces = [['n', 'b'], ['', 'w'], ['', 'w'], ['q', 'w']];
    return (<Pressable onPress={onPress} style={[styles.themeCard, { backgroundColor: t.background, borderColor: active ? t.accent : 'rgba(255,255,255,0.08)' }]}>
      <View style={{ padding: 4, backgroundColor: t.frame, borderRadius: 6 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: cell * 2 }}>
          {pieces.map(([p, c], i) => (<View key={i} style={{ width: cell, height: cell, backgroundColor: (i === 0 || i === 3) ? t.light : t.dark }}>
              {p ? <Piece type={p} color={c} size={cell} theme={t}/> : null}
            </View>))}
        </View>
      </View>
      <Text style={{ color: t.text, fontWeight: '700', marginTop: 8, fontSize: 13 }}>{t.name}</Text>
      {active && <Text style={{ color: t.accent, fontSize: 11, fontWeight: '700' }}>✓ Actif</Text>}
    </Pressable>);
}
const styles = StyleSheet.create({
    content: { padding: 20, paddingBottom: 40, maxWidth: 560, width: '100%', alignSelf: 'center' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    themeCard: { width: 100, alignItems: 'center', paddingVertical: 12, borderRadius: 14, borderWidth: 2 },
    card: { borderRadius: 14, paddingHorizontal: 16 },
    toggle: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
});
