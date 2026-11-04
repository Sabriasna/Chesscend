import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { SettingsProvider, useSettings } from './src/context/SettingsContext';
import GameScreen from './src/screens/GameScreen';
import HomeScreen from './src/screens/HomeScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { clearSavedGame, loadSavedGame } from './src/storage/storage';
function Root() {
    const { theme, ready } = useSettings();
    const [screen, setScreen] = useState({ name: 'home' });
    const [saved, setSaved] = useState(null);
    const [gameKey, setGameKey] = useState(0);
    // Recharge la partie sauvegardée à chaque retour sur l'accueil
    useEffect(() => {
        if (screen.name === 'home')
            loadSavedGame().then(setSaved);
    }, [screen.name]);
    if (!ready) {
        return (<View style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center' }}>
        <ActivityIndicator color={theme.accent}/>
      </View>);
    }
    return (<SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar style="light"/>
      {screen.name === 'home' && (<HomeScreen saved={saved} onStart={(config) => {
                clearSavedGame();
                setGameKey((k) => k + 1);
                setScreen({ name: 'game', config });
            }} onResume={() => {
                if (!saved)
                    return;
                setGameKey((k) => k + 1);
                setScreen({ name: 'game', config: saved.config, moves: saved.moves, clocks: saved.clocks });
            }} onSettings={() => setScreen({ name: 'settings' })}/>)}
      {screen.name === 'settings' && <SettingsScreen onBack={() => setScreen({ name: 'home' })}/>}
      {screen.name === 'game' && (<GameScreen key={gameKey} config={screen.config} initialMoves={screen.moves} initialClocks={screen.clocks} onExit={() => setScreen({ name: 'home' })}/>)}
    </SafeAreaView>);
}
export default function App() {
    return (<SafeAreaProvider>
      <SettingsProvider>
        <Root />
      </SettingsProvider>
    </SafeAreaProvider>);
}
