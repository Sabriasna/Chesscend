import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold, Poppins_800ExtraBold,
} from '@expo-google-fonts/poppins';
import { AppProvider, useApp } from './src/context/AppContext';
import { Background } from './src/components/ui';
import TabBar from './src/components/TabBar';
import { InfoModal } from './src/components/Modals';
import { clearSavedGame, loadSavedGame } from './src/storage/storage';
import { C } from './src/theme/ui';
import HomeScreen from './src/screens/HomeScreen';
import PlayScreen from './src/screens/PlayScreen';
import RankingScreen from './src/screens/RankingScreen';
import CommunityScreen from './src/screens/CommunityScreen';
import LearnScreen from './src/screens/LearnScreen';
import GameScreen from './src/screens/GameScreen';
import SetupScreen from './src/screens/SetupScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import CourseScreen from './src/screens/CourseScreen';
import LessonScreen from './src/screens/LessonScreen';
import PuzzleScreen from './src/screens/PuzzleScreen';

function Root() {
  const { ready, settings } = useApp();
  const [tab, setTab] = useState('home');
  const [route, setRoute] = useState(null); // full-screen page on top of the tabs
  const [saved, setSaved] = useState(null);
  const [gameKey, setGameKey] = useState(0);
  const [info, setInfo] = useState(null); // { title, text, icon }

  // Refresh the saved game whenever we come back to the tabs
  useEffect(() => {
    if (!route) loadSavedGame().then(setSaved);
  }, [route]);

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: C.bgTop }}>
        <ActivityIndicator color={C.gold} />
      </View>
    );
  }

  const nav = {
    tab: (key) => {
      setRoute(null);
      setTab(key);
    },
    go: (r) => setRoute(r),
    back: () => setRoute(null),
    startGame: (config) => {
      clearSavedGame();
      setGameKey((k) => k + 1);
      setRoute({ name: 'game', config });
    },
    resume: () => {
      if (!saved) return;
      setGameKey((k) => k + 1);
      setRoute({ name: 'game', config: saved.config, moves: saved.moves, clocks: saved.clocks });
    },
    profile: () => setRoute({ name: 'profile' }),
    bell: () =>
      setInfo({
        title: 'No notifications yet',
        text: 'Game invitations and friend requests will appear here when online play arrives.',
        icon: 'bell-outline',
      }),
    soon: (feature) =>
      setInfo({
        title: `${feature} is coming soon`,
        text: 'We are working on it! For now, play against the computer or with a friend on the same device.',
        icon: 'rocket-launch-outline',
      }),
    /** Quick game against the computer at the preferred level. */
    quick: (timeControl = null) =>
      nav.startGame({ mode: 'ai', aiLevel: settings.preferredLevel, playerColor: 'w', timeControl }),
    saved,
  };

  let page = null;
  if (route) {
    if (route.name === 'game')
      page = (
        <GameScreen key={gameKey} config={route.config} initialMoves={route.moves} initialClocks={route.clocks} nav={nav} />
      );
    if (route.name === 'setup') page = <SetupScreen mode={route.mode} timeControl={route.timeControl} nav={nav} />;
    if (route.name === 'profile') page = <ProfileScreen nav={nav} />;
    if (route.name === 'course') page = <CourseScreen courseId={route.courseId} nav={nav} />;
    if (route.name === 'lesson') page = <LessonScreen key={route.lessonId} lessonId={route.lessonId} nav={nav} />;
    if (route.name === 'puzzles') page = <PuzzleScreen startId={route.startId} nav={nav} />;
  }

  const screens = { home: HomeScreen, play: PlayScreen, ranking: RankingScreen, community: CommunityScreen, learn: LearnScreen };
  const TabScreen = screens[tab];

  return (
    <Background>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <StatusBar style="dark" />
        {page ?? (
          <>
            <View style={{ flex: 1 }}>
              <TabScreen nav={nav} />
            </View>
            <TabBar active={tab} onChange={nav.tab} />
          </>
        )}
      </SafeAreaView>
      <InfoModal
        visible={!!info}
        icon={info?.icon}
        title={info?.title}
        text={info?.text}
        onClose={() => setInfo(null)}
      />
    </Background>
  );
}

export default function App() {
  const [loaded, error] = useFonts({
    Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold, Poppins_800ExtraBold,
  });
  if (!loaded && !error) {
    return <View style={{ flex: 1, backgroundColor: C.bgTop }} />;
  }
  return (
    <SafeAreaProvider>
      <AppProvider>
        <Root />
      </AppProvider>
    </SafeAreaProvider>
  );
}
