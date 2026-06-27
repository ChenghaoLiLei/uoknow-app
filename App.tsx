import React, { useCallback, useEffect, useState } from 'react';
import { LogBox } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

LogBox.ignoreLogs([
  'Open debugger',
  'vulnerabilities',
]);

import { RootStackParamList } from './src/types';
import { useColors } from './src/ThemeContext';
import { ThemeProvider } from './src/ThemeContext';
import HomeScreen from './src/screens/HomeScreen';
import ContactsScreen from './src/screens/ContactsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import PrivacyPolicyScreen from './src/screens/PrivacyPolicyScreen';
import PaywallScreen from './src/screens/PaywallScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import * as Localization from 'expo-localization';
import { setLocale, t } from './src/i18n';
import { getLanguage, saveLanguage, getSettings, getDeviceId } from './src/utils/storage';
import { scheduleDailyReminder } from './src/utils/notifications';
import { LanguageContext } from './src/LanguageContext';
import { apiSyncSettings } from './src/utils/api';
import { PremiumProvider } from './src/PremiumContext';

const Stack = createNativeStackNavigator<RootStackParamList>();

const SUPPORTED_LANGUAGES = [
  'en', 'zh', 'zh-TW', 'ja', 'ko', 'de', 'fr', 'es', 'pt', 'it',
  'ru', 'nl', 'pl', 'sv', 'da', 'no', 'fi', 'tr', 'uk', 'ar',
  'hi', 'th', 'vi', 'id', 'ms',
];

// Pick the best-matching supported language from the device locale on first launch.
function detectDeviceLanguage(): string {
  try {
    const locale = Localization.getLocales()[0];
    if (!locale) return 'en';
    const code = (locale.languageCode ?? 'en').toLowerCase();
    if (code === 'zh') {
      const tag = (locale.languageTag ?? '').toLowerCase();
      const region = (locale.regionCode ?? '').toUpperCase();
      const isTraditional =
        tag.includes('hant') || ['TW', 'HK', 'MO'].includes(region);
      return isTraditional ? 'zh-TW' : 'zh';
    }
    return SUPPORTED_LANGUAGES.includes(code) ? code : 'en';
  } catch {
    return 'en';
  }
}

function AppNavigator() {
  const colors = useColors();
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.primaryDark,
          headerTitleStyle: { fontWeight: '700' },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Contacts" component={ContactsScreen} options={{ title: t('contactsScreenTitle') }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: t('settingsScreenTitle') }} />
        <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} options={{ title: t('privacyPolicyTitle') }} />
        <Stack.Screen name="Paywall" component={PaywallScreen} options={{ title: t('paywallScreenTitle') }} />
        <Stack.Screen name="History" component={HistoryScreen} options={{ title: t('historyScreenTitle') }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const [language, setLanguage] = useState<string | null>(null);

  useEffect(() => {
    getLanguage().then((saved) => {
      const lang = saved ?? detectDeviceLanguage();
      setLocale(lang);
      setLanguage(lang);
    });
  }, []);

  const changeLanguage = useCallback(async (code: string) => {
    await saveLanguage(code);
    setLocale(code);
    setLanguage(code);
    const [settings, deviceId] = await Promise.all([getSettings(), getDeviceId()]);
    await Promise.all([
      apiSyncSettings(deviceId, settings, code),
      scheduleDailyReminder(settings.reminderHour, settings.reminderMinute),
    ]);
  }, []);

  if (language === null) return null;

  return (
    <LanguageContext.Provider value={{ language, changeLanguage }}>
      <PremiumProvider>
        <ThemeProvider>
          <SafeAreaProvider>
            <AppNavigator key={language} />
          </SafeAreaProvider>
        </ThemeProvider>
      </PremiumProvider>
    </LanguageContext.Provider>
  );
}
