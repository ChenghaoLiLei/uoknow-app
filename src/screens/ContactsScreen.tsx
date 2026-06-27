import React, { useCallback, useContext, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Contact, RootStackParamList } from '../types';
import { spacing, fontSizes, radius } from '../theme';
import { useColors } from '../ThemeContext';
import {
  addContact,
  deleteContact,
  getContacts,
  getDeviceId,
  updateContact,
} from '../utils/storage';
import { apiSyncContacts } from '../utils/api';
import { t } from '../i18n';
import { countryName } from '../i18n/countries';
import { LanguageContext } from '../LanguageContext';
import { PremiumContext } from '../PremiumContext';

const FREE_MAX = 3;
const PREMIUM_MAX = 5;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[\d\s\-().]{5,18}$/;

// Country names are localized at render time via countryName() (see i18n/countries.ts).
const COUNTRY_CODES = [
  { code: '+86',  flag: '🇨🇳' },
  { code: '+49',  flag: '🇩🇪' },
  { code: '+1',   flag: '🇺🇸' },
  { code: '+44',  flag: '🇬🇧' },
  { code: '+33',  flag: '🇫🇷' },
  { code: '+39',  flag: '🇮🇹' },
  { code: '+34',  flag: '🇪🇸' },
  { code: '+31',  flag: '🇳🇱' },
  { code: '+46',  flag: '🇸🇪' },
  { code: '+47',  flag: '🇳🇴' },
  { code: '+45',  flag: '🇩🇰' },
  { code: '+358', flag: '🇫🇮' },
  { code: '+7',   flag: '🇷🇺' },
  { code: '+81',  flag: '🇯🇵' },
  { code: '+82',  flag: '🇰🇷' },
  { code: '+852', flag: '🇭🇰' },
  { code: '+886', flag: '🇹🇼' },
  { code: '+65',  flag: '🇸🇬' },
  { code: '+61',  flag: '🇦🇺' },
  { code: '+64',  flag: '🇳🇿' },
  { code: '+91',  flag: '🇮🇳' },
  { code: '+55',  flag: '🇧🇷' },
  { code: '+52',  flag: '🇲🇽' },
  { code: '+90',  flag: '🇹🇷' },
  { code: '+66',  flag: '🇹🇭' },
];

const DEFAULT_DIAL = COUNTRY_CODES[0];

function parsePhone(fullPhone: string): { dialCode: string; local: string } {
  if (!fullPhone) return { dialCode: DEFAULT_DIAL.code, local: '' };
  // Sort by code length descending so +852 matches before +85
  const sorted = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);
  for (const c of sorted) {
    if (fullPhone.startsWith(c.code)) {
      return { dialCode: c.code, local: fullPhone.slice(c.code.length) };
    }
    // Also handle 00xx format (e.g. 0086 → +86)
    const withZeros = '00' + c.code.slice(1);
    if (fullPhone.startsWith(withZeros)) {
      return { dialCode: c.code, local: fullPhone.slice(withZeros.length) };
    }
  }
  return { dialCode: DEFAULT_DIAL.code, local: fullPhone };
}

const emptyForm = { name: '', email: '', dialCode: DEFAULT_DIAL.code, localPhone: '' };

export default function ContactsScreen() {
  const { isPremium } = useContext(PremiumContext);
  const { language } = useContext(LanguageContext);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const colors = useColors();
  const maxContacts = isPremium ? PREMIUM_MAX : FREE_MAX;

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  const reload = useCallback(async () => {
    const loaded = await getContacts();
    setContacts(loaded);
    // Silently re-sync to server every time this screen is opened
    const deviceId = await getDeviceId();
    apiSyncContacts(deviceId, loaded).catch(() => {});
  }, []);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const syncToServer = async (updated: Contact[]) => {
    const deviceId = await getDeviceId();
    await apiSyncContacts(deviceId, updated);
  };

  const openAddModal = () => {
    if (contacts.length >= maxContacts) {
      navigation.navigate('Paywall');
      return;
    }
    setEditing(null);
    setForm(emptyForm);
    setShowCountryDropdown(false);
    setModalVisible(true);
  };

  const openEditModal = (contact: Contact) => {
    setEditing(contact);
    const { dialCode, local } = parsePhone(contact.phone);
    setForm({ name: contact.name, email: contact.email, dialCode, localPhone: local });
    setShowCountryDropdown(false);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (savingRef.current) return;

    const name = form.name.trim();
    if (!name) {
      Alert.alert(t('nameRequired'));
      return;
    }
    const email = form.email.trim();
    const localPhone = form.localPhone.trim();
    const phone = localPhone ? `${form.dialCode}${localPhone}` : '';
    if (!email && !phone) {
      Alert.alert(t('contactMethodRequired'));
      return;
    }
    if (email && !EMAIL_RE.test(email)) {
      Alert.alert(t('invalidEmail'));
      return;
    }
    if (localPhone && !PHONE_RE.test(localPhone)) {
      Alert.alert(t('invalidPhone'));
      return;
    }

    savingRef.current = true;
    setSaving(true);
    Keyboard.dismiss();
    try {
      const contactData = { name, email, phone };
      if (editing) {
        await updateContact({ ...editing, ...contactData });
      } else {
        await addContact(contactData);
      }
      const updated = await getContacts();
      setContacts(updated);
      try {
        await syncToServer(updated);
      } catch {
        Alert.alert(t('syncWarning'), t('syncWarningMsg'));
      }
      setModalVisible(false);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const handleDelete = (contact: Contact) => {
    Alert.alert(
      t('deleteContactTitle'),
      t('deleteContactMsg', { name: contact.name }),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('deleteBtn'),
          style: 'destructive',
          onPress: async () => {
            await deleteContact(contact.id);
            const updated = await getContacts();
            setContacts(updated);
            await syncToServer(updated);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.sectionHint, { color: colors.textMuted }]}>
          {isPremium
            ? t('contactsHintPremium', { max: PREMIUM_MAX })
            : t('contactsHintFree', { max: FREE_MAX })}
        </Text>

        {contacts.map((contact) => (
          <View key={contact.id} style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={[styles.cardAvatar, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.avatarText, { color: colors.primaryDark }]}>{contact.name[0]?.toUpperCase()}</Text>
            </View>
            <View style={styles.cardInfo}>
              <Text style={[styles.cardName, { color: colors.textPrimary }]}>{contact.name}</Text>
              {contact.email ? <Text style={[styles.cardDetail, { color: colors.textSecondary }]}>📧 {contact.email}</Text> : null}
              {contact.phone ? <Text style={[styles.cardDetail, { color: colors.textSecondary }]}>📱 {contact.phone}</Text> : null}
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity style={[styles.editBtn, { borderColor: colors.primary }]} onPress={() => openEditModal(contact)}>
                <Text style={[styles.editBtnText, { color: colors.primary }]}>{t('editBtn')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.deleteBtn, { borderColor: colors.danger }]} onPress={() => handleDelete(contact)}>
                <Text style={[styles.deleteBtnText, { color: colors.danger }]}>{t('deleteBtn')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {contacts.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{t('emptyTitle')}</Text>
            <Text style={[styles.emptyHint, { color: colors.textMuted }]}>{t('emptyHint')}</Text>
          </View>
        )}

        <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.primary }]} onPress={openAddModal}>
          <Text style={styles.addButtonText}>{t('addContact')}</Text>
        </TouchableOpacity>

        {contacts.length >= FREE_MAX && !isPremium && (
          <TouchableOpacity style={[styles.upgradeHint, { backgroundColor: colors.surface, borderColor: colors.warning }]} onPress={() => navigation.navigate('Paywall')}>
            <Text style={[styles.upgradeHintText, { color: colors.warning }]}>⭐ {t('upgradeForMoreContacts')}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.modal, { backgroundColor: colors.background }]}
        >
          <View style={[styles.modalHeader, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
            <TouchableOpacity onPress={() => { Keyboard.dismiss(); setModalVisible(false); }}>
              <Text style={[styles.modalCancel, { color: colors.textSecondary }]}>{t('cancel')}</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {editing ? t('editContactTitle') : t('addContactTitle')}
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              <Text style={[styles.modalSave, { color: saving ? colors.textMuted : colors.primary }]}>
                {saving ? '...' : t('save')}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('nameLabel')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              value={form.name}
              onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
              placeholder={t('namePlaceholder')}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
            />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('emailLabel')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              value={form.email}
              onChangeText={(v) => setForm((f) => ({ ...f, email: v }))}
              placeholder="example@email.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('phoneLabel')}</Text>
            <View style={styles.phoneRow}>
              <TouchableOpacity
                style={[styles.dialCodeBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setShowCountryDropdown((v) => !v)}
              >
                <Text style={[styles.dialCodeText, { color: colors.textPrimary }]}>
                  {COUNTRY_CODES.find(c => c.code === form.dialCode)?.flag ?? '🌐'} {form.dialCode} {showCountryDropdown ? '▴' : '▾'}
                </Text>
              </TouchableOpacity>
              <TextInput
                style={[styles.phoneInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                value={form.localPhone}
                onChangeText={(v) => setForm((f) => ({ ...f, localPhone: v }))}
                placeholder="138 0000 0000"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />
            </View>

            {showCountryDropdown && (
              <ScrollView
                style={[styles.dropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
              >
                {COUNTRY_CODES.map((item) => (
                  <TouchableOpacity
                    key={item.code}
                    style={[
                      styles.dropdownItem,
                      { borderBottomColor: colors.border },
                      item.code === form.dialCode && { backgroundColor: colors.primaryLight },
                    ]}
                    onPress={() => {
                      setForm((f) => ({ ...f, dialCode: item.code }));
                      setShowCountryDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownFlag}>{item.flag}</Text>
                    <Text style={[styles.dropdownLabel, { color: colors.textPrimary }]}>{countryName(item.code, language)}</Text>
                    <Text style={[styles.dropdownCode, { color: colors.textSecondary }]}>{item.code}</Text>
                    {item.code === form.dialCode && (
                      <Text style={[styles.dropdownCheck, { color: colors.primary }]}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <Text style={[styles.fieldHint, { color: colors.textMuted }]}>{t('contactMethodHint')}</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: spacing.md, gap: spacing.md },
  sectionHint: { fontSize: fontSizes.sm, lineHeight: 20, marginBottom: spacing.sm },
  card: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.lg, padding: spacing.md, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  cardAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: fontSizes.lg, fontWeight: '700' },
  cardInfo: { flex: 1, marginLeft: spacing.md, gap: 2 },
  cardName: { fontSize: fontSizes.md, fontWeight: '600' },
  cardDetail: { fontSize: fontSizes.sm },
  cardActions: { gap: spacing.xs },
  editBtn: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.sm, borderWidth: 1 },
  editBtnText: { fontSize: fontSizes.xs, fontWeight: '600' },
  deleteBtn: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.sm, borderWidth: 1 },
  deleteBtnText: { fontSize: fontSizes.xs, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { fontSize: fontSizes.lg, fontWeight: '600' },
  emptyHint: { fontSize: fontSizes.sm, textAlign: 'center', marginTop: spacing.sm, lineHeight: 20 },
  addButton: { borderRadius: radius.lg, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  addButtonText: { fontSize: fontSizes.md, fontWeight: '700', color: '#fff' },
  upgradeHint: { borderRadius: radius.md, padding: spacing.md, marginTop: spacing.sm, borderWidth: 1 },
  upgradeHintText: { fontSize: fontSizes.sm, textAlign: 'center', lineHeight: 20 },
  modal: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, borderBottomWidth: 1 },
  modalTitle: { fontSize: fontSizes.md, fontWeight: '600' },
  modalCancel: { fontSize: fontSizes.md },
  modalSave: { fontSize: fontSizes.md, fontWeight: '700' },
  modalBody: { padding: spacing.md },
  fieldLabel: { fontSize: fontSizes.sm, fontWeight: '600', marginTop: spacing.md, marginBottom: spacing.xs },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, fontSize: fontSizes.md },
  fieldHint: { fontSize: fontSizes.xs, marginTop: spacing.md, lineHeight: 18 },
  phoneRow: { flexDirection: 'row', gap: spacing.xs },
  dialCodeBtn: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm + 2, justifyContent: 'center' },
  dialCodeText: { fontSize: fontSizes.sm, fontWeight: '600' },
  phoneInput: { flex: 1, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, fontSize: fontSizes.md },
  dropdown: { borderWidth: 1, borderRadius: radius.md, marginTop: spacing.xs, maxHeight: 280 },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: spacing.sm },
  dropdownFlag: { fontSize: 20 },
  dropdownLabel: { flex: 1, fontSize: fontSizes.sm },
  dropdownCode: { fontSize: fontSizes.sm },
  dropdownCheck: { fontSize: fontSizes.sm, fontWeight: '700' },
});
