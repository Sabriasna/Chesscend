import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { AppHeader, Card, Hero, Page, PillButton, SectionHeader, T, Tile } from '../components/ui';
import { C } from '../theme/ui';

const UPCOMING = [
  { icon: 'account-multiple-plus-outline', title: 'Play with friends online', text: 'Send an invitation code and play from anywhere.' },
  { icon: 'account-search-outline', title: 'Find an opponent', text: 'Get matched with players of your level.' },
  { icon: 'shield-crown-outline', title: 'Clubs and events', text: 'Join a club, take part in friendly tournaments.' },
];

export default function CommunityScreen({ nav }) {
  const { settings } = useApp();
  return (
    <>
      <AppHeader onProfile={nav.profile} onBell={nav.bell} initial={settings.playerName.charAt(0).toUpperCase()} />
      <Page>
        <Hero title="Community" subtitle="Connect, share and grow with other chess players." pieces={['p', 'n']} />

        <View style={styles.row}>
          <Tile icon="users" label="Players" soon onPress={() => nav.soon('Players')} />
          <Tile icon="message-circle" label="Forums" soon onPress={() => nav.soon('Forums')} />
          <Tile mci="account-group-outline" label="Clubs" soon onPress={() => nav.soon('Clubs')} />
          <Tile icon="calendar" label="Events" soon onPress={() => nav.soon('Events')} />
        </View>

        <SectionHeader title="Coming Soon" />
        <Card style={{ paddingVertical: 6 }}>
          {UPCOMING.map((u, i) => (
            <View key={u.title} style={[styles.item, i < UPCOMING.length - 1 && styles.border]}>
              <View style={styles.icon}>
                <MaterialCommunityIcons name={u.icon} size={26} color={C.goldDeep} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={T.h3}>{u.title}</Text>
                <Text style={T.small}>{u.text}</Text>
              </View>
            </View>
          ))}
        </Card>

        <Card style={styles.cta}>
          <MaterialCommunityIcons name="crown" size={34} color={C.ink} />
          <View style={{ flex: 1, marginHorizontal: 12 }}>
            <Text style={T.h3}>Meanwhile, play a friend</Text>
            <Text style={T.small}>Pass the phone and play on the same device.</Text>
          </View>
          <PillButton label="Play" size="m" onPress={() => nav.go({ name: 'setup', mode: 'local' })} />
        </Card>
      </Page>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  border: { borderBottomWidth: 1, borderBottomColor: C.cardBorder },
  icon: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.goldPale, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cta: { flexDirection: 'row', alignItems: 'center', marginTop: 18, backgroundColor: C.goldPale },
});
