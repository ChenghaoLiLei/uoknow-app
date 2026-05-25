import React, { useCallback, useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RootStackParamList } from './src/types';
import { colors } from './src/theme';
import HomeScreen from './src/screens/HomeScreen';
import ContactsScreen from './src/screens/ContactsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import PrivacyPolicyScreen from './src/screens/PrivacyPolicyScreen';
import PaywallScreen from './src/screens/PaywallScreen';
import { setLocale, t } from './src/i18n';
import { getLanguage, saveLanguage, getSettings, getDeviceId } from './src/utils/storage';
import { LanguageContext } from './src/LanguageContext';
import { apiSyncSettings } from './src/utils/api';
import { PremiumProvider } from './src/PremiumContext';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [language, setLanguage] = useState<string | null>(null);

  useEffect(() => {
    getLanguage().then((saved) => {
      const lang = saved ?? 'en';
      setLocale(lang);
      setLanguage(lang);
    });
  }, []);

  const changeLanguage = useCallback(async (code: string) => {
    await saveLanguage(code);
    setLocale(code);
    setLanguage(code);
    // Sync language to server so notifications are sent in the user's language
    const [settings, deviceId] = await Promise.all([getSettings(), getDeviceId()]);
    await apiSyncSettings(deviceId, settings, code);
  }, []);

  if (language === null) return null;

  return (
    <LanguageContext.Provider value={{ language, changeLanguage }}>
      <PremiumProvider>
        <SafeAreaProvider>
          <NavigationContainer key={language}>
            <Stack.Navigator
              screenOptions={{
                headerStyle: { backgroundColor: colors.surface },
                headerTintColor: colors.primaryDark,
                headerTitleStyle: { fontWeight: '700' },
              }}
            >
              <Stack.Screen
                name="Home"
                component={HomeScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Contacts"
                component={ContactsScreen}
                options={{ title: t('contactsScreenTitle') }}
              />
              <Stack.Screen
                name="Settings"
                component={SettingsScreen}
                options={{ title: t('settingsScreenTitle') }}
              />
              <Stack.Screen
                name="PrivacyPolicy"
                component={PrivacyPolicyScreen}
                options={{ title: t('privacyPolicyTitle') }}
              />
              <Stack.Screen
                name="Paywall"
                component={PaywallScreen}
                options={{ title: t('paywallScreenTitle') }}
              />
            </Stack.Navigator>
          </NavigationContainer>
        </SafeAreaProvider>
      </PremiumProvider>
    </LanguageContext.Provider>
  );
}
