import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme as useNativeColorScheme } from 'react-native';

type ThemeType = 'light' | 'dark' | 'system';

interface ThemeContextType {
    theme: 'light' | 'dark';
    themePreference: ThemeType;
    setThemePreference: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const THEME_KEY = 'theme_preference';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const systemColorScheme = useNativeColorScheme();
    const [themePreference, setThemePreference] = useState<ThemeType>('system');
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        const loadTheme = async () => {
            try {
                const stored = await AsyncStorage.getItem(THEME_KEY);
                if (stored === 'light' || stored === 'dark' || stored === 'system') {
                    setThemePreference(stored);
                }
            } catch (e) {

            } finally {
                setLoaded(true);
            }
        };
        loadTheme();
    }, []);

    const setTheme = async (newTheme: ThemeType) => {
        setThemePreference(newTheme);
        try {
            await AsyncStorage.setItem(THEME_KEY, newTheme);
        } catch (e) {

        }
    };

    const activeTheme =
        themePreference === 'system'
            ? (systemColorScheme ?? 'light')
            : themePreference;

    if (!loaded) {
        return null; // Or a splash screen
    }

    return (
        <ThemeContext.Provider
            value={{
                theme: activeTheme,
                themePreference,
                setThemePreference: setTheme,
            }}
        >
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
