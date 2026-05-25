import React, { useCallback, useContext, useState } from 'react';
import {
  Alert,
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
import { colors, fontSizes, radius, spacing } from '../theme';
import {
  addContact,
  deleteContact,
  getContacts,
  getDeviceId,
  updateContact,
} from '../utils/storage';
import { apiSyncContacts } from '../utils/api';
import { t } from '../i18n';
import { PremiumContext } from '../PremiumContext';

const FREE_MAX = 3;
const PREMIUM_MAX = 5;

const emptyForm = { name: '', email: '', phone: '' };

export default function ContactsScreen() {
  const { isPremium } = useContext(PremiumContext);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const maxContacts = isPremium ? PREMIUM_MAX : FREE_MAX;

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [form, setForm] = useState(emptyForm);

  const reload = useCallback(async () => {
    setContacts(await getContacts());
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

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
    setModalVisible(true);
  };

  const openEditModal = (contact: Contact) => {
    setEditing(contact);
    setForm({ name: contact.name, email: contact.email, phone: contact.phone });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert(t('nameRequired'));
      return;
    }
    if (!form.email.trim() && !form.phone.trim()) {
      Alert.alert(t('contactMethodRequired'));
      return;
    }

    if (editing) {
      await updateContact({ ...editing, ...form });
    } else {
      await addContact(form);
    }

    const updated = await getContacts();
    setContacts(updated);
    await syncToServer(updated);
    setModalVisible(false);
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
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionHint}>
          {isPremium
            ? t('contactsHintPremium', { max: PREMIUM_MAX })
            : t('contactsHintFree', { max: FREE_MAX })}
        </Text>

        {contacts.map((contact) => (
          <View key={contact.id} style={styles.card}>
            <View style={styles.cardAvatar}>
              <Text style={styles.avatarText}>{contact.name[0]?.toUpperCase()}</Text>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardName}>{contact.name}</Text>
              {contact.email ? (
                <Text style={styles.cardDetail}>📧 {contact.email}</Text>
              ) : null}
              {contact.phone ? (
                <Text style={styles.cardDetail}>📱 {contact.phone}</Text>
              ) : null}
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => openEditModal(contact)}
              >
                <Text style={styles.editBtnText}>{t('editBtn')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDelete(contact)}
              >
                <Text style={styles.deleteBtnText}>{t('deleteBtn')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {contacts.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyTitle}>{t('emptyTitle')}</Text>
            <Text style={styles.emptyHint}>{t('emptyHint')}</Text>
          </View>
        )}

        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Text style={styles.addButtonText}>{t('addContact')}</Text>
        </TouchableOpacity>

        {contacts.length >= FREE_MAX && !isPremium && (
          <TouchableOpacity style={styles.upgradeHint} onPress={() => navigation.navigate('Paywall')}>
            <Text style={styles.upgradeHintText}>⭐ {t('upgradeForMoreContacts')}</Text>
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
          style={styles.modal}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCancel}>{t('cancel')}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editing ? t('editContactTitle') : t('addContactTitle')}
            </Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={styles.modalSave}>{t('save')}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <Text style={styles.fieldLabel}>{t('nameLabel')}</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
              placeholder={t('namePlaceholder')}
              autoCapitalize="words"
            />

            <Text style={styles.fieldLabel}>{t('emailLabel')}</Text>
            <TextInput
              style={styles.input}
              value={form.email}
              onChangeText={(v) => setForm((f) => ({ ...f, email: v }))}
              placeholder="example@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.fieldLabel}>{t('phoneLabel')}</Text>
            <TextInput
              style={styles.input}
              value={form.phone}
              onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))}
              placeholder="+1 555 000 0000"
              keyboardType="phone-pad"
            />

            <Text style={styles.fieldHint}>{t('contactMethodHint')}</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.md, gap: spacing.md },
  sectionHint: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.primaryDark },
  cardInfo: { flex: 1, marginLeft: spacing.md, gap: 2 },
  cardName: { fontSize: fontSizes.md, fontWeight: '600', color: colors.textPrimary },
  cardDetail: { fontSize: fontSizes.sm, color: colors.textSecondary },
  cardActions: { gap: spacing.xs },
  editBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  editBtnText: { fontSize: fontSizes.xs, color: colors.primary, fontWeight: '600' },
  deleteBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  deleteBtnText: { fontSize: fontSizes.xs, color: colors.danger, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { fontSize: fontSizes.lg, fontWeight: '600', color: colors.textPrimary },
  emptyHint: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  addButtonText: { fontSize: fontSizes.md, fontWeight: '700', color: '#fff' },
  upgradeHint: {
    backgroundColor: '#FFF8E1',
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  upgradeHintText: {
    fontSize: fontSizes.sm,
    color: '#7B4F00',
    textAlign: 'center',
    lineHeight: 20,
  },
  modal: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  modalTitle: { fontSize: fontSizes.md, fontWeight: '600', color: colors.textPrimary },
  modalCancel: { fontSize: fontSizes.md, color: colors.textSecondary },
  modalSave: { fontSize: fontSizes.md, fontWeight: '700', color: colors.primary },
  modalBody: { padding: spacing.md },
  fieldLabel: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  fieldHint: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: spacing.md, lineHeight: 18 },
});
