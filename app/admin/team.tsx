import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../providers/ThemeProvider';
import { useI18n } from '../../providers/I18nProvider';
import { useAuth } from '../../providers/AuthProvider';
import { supabase } from '../../lib/supabase';
import { showMessage } from '../../lib/alert';
import { useSafeBack } from '../../hooks/useSafeBack';
import { User, UserRole } from '../../lib/types';
import { type as typeP, font } from '../../lib/typography';

type InviteRole = 'admin' | 'editor';

export default function TeamScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const goBack = useSafeBack("/admin");
  const c = theme.colors;

  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<InviteRole>('editor');
  const [inviting, setInviting] = useState(false);

  const fetchTeam = useCallback(async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .in('role', ['admin', 'editor'])
      .order('role');

    if (error) {
      console.error('Error fetching team:', error);
    } else {
      setMembers((data as User[]) ?? []);
    }
  }, []);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    await fetchTeam();
    setLoading(false);
  }, [fetchTeam]);

  useFocusEffect(
    useCallback(() => {
      loadInitial();
    }, [loadInitial])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTeam();
    setRefreshing(false);
  };

  const openInviteModal = () => {
    setInviteEmail('');
    setInviteRole('editor');
    setModalVisible(true);
  };

  const handleSendInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email) {
      showMessage('Error', 'Please enter an email address.');
      return;
    }

    setInviting(true);

    // Look up user by email
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !data) {
      setInviting(false);
      showMessage('User Not Found', 'User must create an account first.');
      return;
    }

    const foundUser = data as User;

    // Update their role
    const { error: updateError } = await supabase
      .from('users')
      .update({ role: inviteRole as UserRole })
      .eq('email', email);

    setInviting(false);

    if (updateError) {
      showMessage('Error', 'Failed to update role. Please try again.');
      console.error('Role update error:', updateError);
      return;
    }

    setModalVisible(false);
    showMessage(
      'Role Updated',
      `${foundUser.display_name || email} has been assigned the ${inviteRole} role.`
    );
    await fetchTeam();
  };

  const getAvatarInitial = (member: User): string => {
    if (member.display_name) return member.display_name.charAt(0).toUpperCase();
    if (member.email) return member.email.charAt(0).toUpperCase();
    return '?';
  };

  const getRoleBadge = (role: UserRole) => {
    if (role === 'admin') {
      return { bg: c.accent + '28', border: c.accent, text: c.accent, label: 'ADMIN' };
    }
    return { bg: '#16a34a28', border: '#16a34a', text: '#16a34a', label: 'EDITOR' };
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },

    // ── Header ───────────────────────────────────────────────
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 60,
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    backBtn: { paddingRight: 16 },
    backBtnText: {
      fontFamily: font.serif,
      fontSize: 22,
      color: c.primary,
      lineHeight: 26,
    },
    headerSpacer: { flex: 1 },
    headerLabel: {
      ...typeP.label,
      color: c.textMuted,
    },

    // ── Hero ─────────────────────────────────────────────────
    hero: {
      paddingHorizontal: 28,
      paddingTop: 24,
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    heroKicker: {
      ...typeP.label,
      color: c.textMuted,
      marginBottom: 6,
    },
    heroTitle: {
      fontFamily: font.serif,
      fontSize: 28,
      color: c.primary,
      letterSpacing: -0.3,
      lineHeight: 34,
    },
    heroTitleItalic: {
      fontFamily: font.serifItalic,
    },

    // ── Section label ────────────────────────────────────────
    sectionWrap: {
      paddingHorizontal: 28,
      paddingTop: 28,
      paddingBottom: 16,
    },
    sectionLabel: {
      ...typeP.label,
      color: c.textMuted,
      marginBottom: 6,
    },
    sectionSubtitle: {
      fontFamily: font.serifItalic,
      fontSize: 20,
      color: c.primary,
      letterSpacing: -0.3,
    },

    // ── Member rows ──────────────────────────────────────────
    listContent: { paddingHorizontal: 16, paddingBottom: 20 },
    memberRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: c.border,
      padding: 14,
      marginBottom: 10,
      gap: 14,
    },
    avatarBox: {
      width: 44,
      height: 44,
      backgroundColor: c.primary,
      borderRadius: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontFamily: font.serifSemiBold,
      fontSize: 18,
      color: c.accent,
    },
    memberInfo: { flex: 1 },
    memberName: {
      fontFamily: font.serif,
      fontSize: 16,
      color: c.text,
      letterSpacing: -0.1,
      marginBottom: 3,
    },
    memberEmail: {
      fontFamily: font.sans,
      fontSize: 12,
      color: c.textMuted,
      letterSpacing: 0.2,
    },
    roleBadge: {
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderWidth: 1,
    },
    roleBadgeText: {
      fontFamily: font.sansMedium,
      fontSize: 10,
      letterSpacing: 1,
    },

    // ── Invite button ────────────────────────────────────────
    inviteBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: 16,
      marginTop: 4,
      marginBottom: 16,
      backgroundColor: c.accent,
      borderRadius: 4,
      paddingVertical: 15,
      gap: 6,
    },
    inviteBtnText: {
      ...typeP.button,
      color: c.primary,
    },

    // ── Permissions card ─────────────────────────────────────
    permissionsCard: {
      marginHorizontal: 16,
      marginTop: 8,
      marginBottom: 40,
      backgroundColor: c.surface,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: c.border,
      padding: 16,
    },
    permissionsTitle: {
      ...typeP.labelSmall,
      color: c.textMuted,
      marginBottom: 14,
    },
    permissionRow: {
      flexDirection: 'row',
      marginBottom: 8,
      gap: 10,
    },
    permissionRoleLabel: {
      fontFamily: font.sansSemiBold,
      fontSize: 12,
      letterSpacing: 0.5,
      minWidth: 52,
    },
    permissionDesc: {
      flex: 1,
      fontFamily: font.serif,
      fontSize: 14,
      color: c.textMuted,
      lineHeight: 20,
    },
    permissionDivider: {
      height: 1,
      backgroundColor: c.border,
      marginVertical: 10,
    },

    // ── Loading / empty ──────────────────────────────────────
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 48,
    },
    emptyText: {
      fontFamily: font.serifItalic,
      fontSize: 15,
      color: c.textMuted,
    },

    // ── Modal ────────────────────────────────────────────────
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: c.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 24,
      paddingBottom: 40,
    },
    modalHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.border,
      alignSelf: 'center',
      marginBottom: 20,
    },
    modalTitle: {
      fontFamily: font.serifItalic,
      fontSize: 22,
      color: c.primary,
      marginBottom: 20,
    },
    inputLabel: {
      ...typeP.labelSmall,
      color: c.textMuted,
      marginBottom: 8,
    },
    emailInput: {
      backgroundColor: c.surface2,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontFamily: font.serif,
      fontSize: 16,
      color: c.text,
      marginBottom: 20,
    },
    rolePills: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 24,
    },
    rolePill: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.surface2,
      alignItems: 'center',
    },
    rolePillAdmin: {
      borderColor: c.accent,
      backgroundColor: c.accent + '22',
    },
    rolePillEditor: {
      borderColor: '#16a34a',
      backgroundColor: '#16a34a22',
    },
    rolePillText: {
      fontFamily: font.sansMedium,
      fontSize: 13,
      letterSpacing: 0.5,
      color: c.textMuted,
    },
    rolePillTextAdmin: { color: c.accent },
    rolePillTextEditor: { color: '#16a34a' },
    sendBtn: {
      backgroundColor: c.primary,
      borderRadius: 4,
      paddingVertical: 14,
      alignItems: 'center',
    },
    sendBtnText: {
      ...typeP.button,
      color: c.accent,
    },
    cancelBtn: {
      marginTop: 12,
      alignItems: 'center',
      paddingVertical: 10,
    },
    cancelBtnText: {
      fontFamily: font.sansMedium,
      fontSize: 14,
      color: c.textMuted,
    },
  });

  const renderMember = ({ item }: { item: User }) => {
    const badge = getRoleBadge(item.role);
    const isCurrentUser = item.id === currentUser?.id;

    return (
      <View style={styles.memberRow}>
        <View style={styles.avatarBox}>
          <Text style={styles.avatarText}>{getAvatarInitial(item)}</Text>
        </View>

        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>
            {item.display_name || 'Unnamed'}
            {isCurrentUser ? ' (you)' : ''}
          </Text>
          <Text style={styles.memberEmail} numberOfLines={1}>
            {item.email}
          </Text>
        </View>

        <View style={[styles.roleBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
          <Text style={[styles.roleBadgeText, { color: badge.text }]}>{badge.label}</Text>
        </View>
      </View>
    );
  };

  const listHeader = (
    <>
      {/* Section label */}
      <View style={styles.sectionWrap}>
        <Text style={styles.sectionLabel}>05 · MEMBERS</Text>
        <Text style={styles.sectionSubtitle}>Your team</Text>
      </View>

      {/* Invite button */}
      <TouchableOpacity
        style={styles.inviteBtn}
        onPress={openInviteModal}
        activeOpacity={0.8}
      >
        <Text style={styles.inviteBtnText}>+ INVITE TEAM MEMBER</Text>
      </TouchableOpacity>
    </>
  );

  const listFooter = (
    <View style={styles.permissionsCard}>
      <Text style={styles.permissionsTitle}>ROLE PERMISSIONS</Text>

      <View style={styles.permissionRow}>
        <Text style={[styles.permissionRoleLabel, { color: c.accent }]}>Admin</Text>
        <Text style={styles.permissionDesc}>Full access, manage team, go live</Text>
      </View>

      <View style={styles.permissionDivider} />

      <View style={styles.permissionRow}>
        <Text style={[styles.permissionRoleLabel, { color: '#16a34a' }]}>Editor</Text>
        <Text style={styles.permissionDesc}>Upload content, manage categories</Text>
      </View>
    </View>
  );

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No team members yet</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Minimal header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={goBack}
          activeOpacity={0.7}
          accessibilityLabel="Back"
        >
          <Text style={styles.backBtnText}>‹ Back</Text>
        </TouchableOpacity>
        <View style={styles.headerSpacer} />
        <Text style={styles.headerLabel}>TEAM</Text>
      </View>

      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.heroKicker}>THE TEAM</Text>
        <Text style={styles.heroTitle}>
          Admins &{' '}
          <Text style={styles.heroTitleItalic}>editors</Text>
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={c.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item) => item.id}
          renderItem={renderMember}
          contentContainerStyle={[
            styles.listContent,
            members.length === 0 && { flex: 1 },
          ]}
          ListHeaderComponent={listHeader}
          ListFooterComponent={listFooter}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={c.primary}
              colors={[c.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Invite Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Invite Team Member</Text>

            <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
            <TextInput
              style={styles.emailInput}
              placeholder="user@example.com"
              placeholderTextColor={c.textMuted}
              value={inviteEmail}
              onChangeText={setInviteEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />

            <Text style={styles.inputLabel}>ROLE</Text>
            <View style={styles.rolePills}>
              <TouchableOpacity
                style={[styles.rolePill, inviteRole === 'admin' && styles.rolePillAdmin]}
                onPress={() => setInviteRole('admin')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.rolePillText,
                    inviteRole === 'admin' && styles.rolePillTextAdmin,
                  ]}
                >
                  Admin
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.rolePill, inviteRole === 'editor' && styles.rolePillEditor]}
                onPress={() => setInviteRole('editor')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.rolePillText,
                    inviteRole === 'editor' && styles.rolePillTextEditor,
                  ]}
                >
                  Editor
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.sendBtn}
              onPress={handleSendInvite}
              activeOpacity={0.8}
              disabled={inviting}
            >
              {inviting ? (
                <ActivityIndicator color={c.accent} />
              ) : (
                <Text style={styles.sendBtnText}>SEND INVITE</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setModalVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
