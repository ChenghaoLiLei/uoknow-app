import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontSizes, spacing } from '../theme';

type Section = { heading: string; body: string };

const SECTIONS: Section[] = [
  {
    heading: 'Overview',
    body:
      'UOK ("Are you OK?") is a personal safety check-in app. When you miss a check-in window, your nominated emergency contacts are notified. This policy explains what data we collect, how we use it, and your rights.',
  },
  {
    heading: 'Data We Collect',
    body:
      '• Emergency contact information – the names, email addresses, and phone numbers you add. Stored encrypted on your device via iOS Keychain.\n' +
      '• Check-in timestamps – the date and time of each check-in you record.\n' +
      '• Location (optional) – if you enable location sharing, your GPS coordinates at check-in time are attached to alerts sent to your contacts. Location is never collected in the background.\n' +
      '• Device identifier – a random ID generated locally on your device. It is not linked to your name or identity.',
  },
  {
    heading: 'How We Use Your Data',
    body:
      '• To deliver alert notifications to your emergency contacts when a check-in is missed.\n' +
      '• To schedule daily reminder push notifications on your device.\n' +
      '• To display your check-in history within the app.',
  },
  {
    heading: 'Data Sharing',
    body:
      'Your emergency contact details and device identifier are transmitted to our server solely to enable alert delivery. Your location (if enabled) is included in the alert message sent to your contacts.\n\n' +
      'We do not sell, rent, or share your data with advertisers, analytics providers, or any third parties beyond what is necessary to deliver the service.',
  },
  {
    heading: 'Data Storage & Security',
    body:
      '• Contact information is encrypted on your device using iOS Keychain (expo-secure-store).\n' +
      '• Our server retains only the minimum data required to deliver notifications.\n' +
      '• No passwords or authentication credentials are stored.',
  },
  {
    heading: 'Your Rights',
    body:
      '• Delete all app data at any time via Settings → Reset All Data.\n' +
      '• Disable location sharing at any time in Settings.\n' +
      '• Remove emergency contacts at any time.\n' +
      '• No account or registration is required to use this app.',
  },
  {
    heading: "Children's Privacy",
    body: 'UOK is not directed at children under 13. We do not knowingly collect data from children.',
  },
  {
    heading: 'Changes to This Policy',
    body:
      'We may update this policy from time to time. The latest version is always available within the app. Continued use of the app after changes constitutes acceptance of the updated policy.',
  },
  {
    heading: 'Contact',
    body:
      'For any privacy-related questions or data requests, please contact us through the App Store listing or via the support email listed there.',
  },
];

export default function PrivacyPolicyScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.updated}>Last updated: May 2026</Text>
        {SECTIONS.map((s) => (
          <View key={s.heading} style={styles.section}>
            <Text style={styles.heading}>{s.heading}</Text>
            <Text style={styles.body}>{s.body}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  updated: { fontSize: fontSizes.xs, color: colors.textMuted, marginBottom: spacing.lg },
  section: { marginBottom: spacing.lg },
  heading: { fontSize: fontSizes.md, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.xs },
  body: { fontSize: fontSizes.sm, color: colors.textSecondary, lineHeight: 22 },
});
