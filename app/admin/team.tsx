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
  Alert,
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
import { User, UserRole } from '../../lib/types';

type InviteRole = 'admin' | 'editor';

export default function TeamScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const colors = theme.colors;

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
      Alert.alert('Error', 'Please enter an email address.');
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
      Alert.alert('User Not Found', 'User must create an account first.');
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
      Alert.alert('Error', 'Failed to update role. Please try again.');
      console.error('Role update error:', updateError);
      return;
    }

    setModalVisible(false);
    Alert.alert(
      'Role Updated',
      `${foundUser.display_name || email} has been assigned the ${inviteRole} role.`
    );
    await fetchTeam();
  };

  const getAvatarBg = (role: UserRole): string => {
    if (role === 'admin') return colors.gold + '33';
    if (role === 'editor') return '#16a34a33';
    return colors.surface2;
  };

  const getAvatarInitial = (member: User): string => {
    if (member.display_name) return member.display_name.charAt(0).toUpperCase();
    if (member.email) return member.email.charAt(0).toUpperCase();
    return '?';
  };

  const getRoleBadgeStyle = (role: UserRole) => {
    if (role === 'admin') {
      return {
        bg: colors.gold + '22',
        border: colors.gold,
        text: colors.gold,
        label: 'Admin',
      };
    }
    return {
      bg: '#16a34a22',
      border: '#16a34a',
      text: '#16a34a',
      label: 'Editor',
    };
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 60,
      paddingBottom: 16,
      gap: 12,
    },
    backBtn: { marginRight: 4 },
    backText: { fontSize: 28, color: colors.text, lineHeight: 32 },
    headerTitle: { fontSize: 28, fontWeight: '700', color: colors.text, flex: 1 },
    adminBadge: {
      backgroundColor: colors.gold,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    adminBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#ffffff',
      letterSpacing: 1,
    },
    listContent: { paddingHorizontal: 16, paddingBottom: 20 },
    memberRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 10,
      gap: 12,
    },
    avatar: {
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    memberInfo: { flex: 1 },
    memberName: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 3,
    },
    memberEmail: {
      fontSize: 13,
      color: colors.textMuted,
    },
    roleBadge: {
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderWidth: 1,
    },
    roleBadgeText: {
      fontSize: 12,
      fontWeight: '600',
    },
    inviteBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: 16,
      marginTop: 4,
      marginBottom: 16,
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 14,
      gap: 6,
    },
    inviteBtnText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#ffffff',
    },
    permissionsCard: {
      marginHorizontal: 16,
      marginBottom: 40,
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
    },
    permissionsTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 12,
    },
    permissionRow: {
      flexDirection: 'row',
      marginBottom: 8,
      gap: 8,
    },
    permissionRoleLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
      minWidth: 52,
    },
    permissionDesc: {
      flex: 1,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    permissionDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 8,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 60,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 60,
    },
    emptyText: { fontSize: 15, color: colors.textMuted, marginTop: 8 },
    emptyEmoji: { fontSize: 40 },
    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 24,
      paddingBottom: 40,
    },
    modalHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 20,
    },
    inputLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 6,
    },
    emailInput: {
      backgroundColor: colors.surface2,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.text,
      marginBottom: 20,
    },
    rolePills: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 24,
    },
    rolePill: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface2,
      alignItems: 'center',
    },
    rolePillAdmin: {
      borderColor: colors.gold,
      backgroundColor: colors.gold + '22',
    },
    rolePillEditor: {
      borderColor: '#16a34a',
      backgroundColor: '#16a34a22',
    },
    rolePillText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textMuted,
    },
    rolePillTextAdmin: {
      color: colors.gold,
    },
    rolePillTextEditor: {
      color: '#16a34a',
    },
    sendBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
    },
    sendBtnText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#ffffff',
    },
    cancelBtn: {
      marginTop: 12,
      alignItems: 'center',
      paddingVertical: 10,
    },
    cancelBtnText: {
      fontSize: 15,
      color: colors.textMuted,
    },
  });

  const renderMember = ({ item }: { item: User }) => {
    const badgeStyle = getRoleBadgeStyle(item.role);
    const isCurrentUser = item.id === currentUser?.id;

    return (
      <View style={styles.memberRow}>
        <View style={[styles.avatar, { backgroundColor: getAvatarBg(item.role) }]}>
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

        <View
          style={[
            styles.roleBadge,
            { backgroundColor: badgeStyle.bg, borderColor: badgeStyle.border },
          ]}
        >
          <Text style={[styles.roleBadgeText, { color: badgeStyle.text }]}>
            {badgeStyle.label}
          </Text>
        </View>
      </View>
    );
  };

  const listHeader = (
    <>
      <TouchableOpacity
        style={styles.inviteBtn}
        onPress={openInviteModal}
        activeOpacity={0.8}
      >
        <Text style={{ fontSize: 18, color: '#ffffff' }}>+</Text>
        <Text style={styles.inviteBtnText}>
          {t('admin.inviteMember') || 'Invite Team Member'}
        </Text>
      </TouchableOpacity>
    </>
  );

  const listFooter = (
    <View style={styles.permissionsCard}>
      <Text style={styles.permissionsTitle}>Role Permissions</Text>

      <View style={styles.permissionRow}>
        <Text style={[styles.permissionRoleLabel, { color: colors.gold }]}>Admin</Text>
        <Text style={styles.permissionDesc}>
          Full access, manage team, go live
        </Text>
      </View>

      <View style={styles.permissionDivider} />

      <View style={styles.permissionRow}>
        <Text style={[styles.permissionRoleLabel, { color: '#16a34a' }]}>Editor</Text>
        <Text style={styles.permissionDesc}>
          Upload content, manage categories
        </Text>
      </View>
    </View>
  );

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>👥</Text>
        <Text style={styles.emptyText}>No team members yet</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
          accessibilityLabel="Back"
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('admin.team') || 'Team'}</Text>
        <View style={styles.adminBadge}>
          <Text style={styles.adminBadgeText}>ADMIN</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
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
              tintColor={colors.primary}
              colors={[colors.primary]}
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

            <Text style={styles.inputLabel}>Email Address</Text>
            <TextInput
              style={styles.emailInput}
              placeholder="user@example.com"
              placeholderTextColor={colors.textMuted}
              value={inviteEmail}
              onChangeText={setInviteEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />

            <Text style={styles.inputLabel}>Role</Text>
            <View style={styles.rolePills}>
              <TouchableOpacity
                style={[
                  styles.rolePill,
                  inviteRole === 'admin' && styles.rolePillAdmin,
                ]}
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
                style={[
                  styles.rolePill,
                  inviteRole === 'editor' && styles.rolePillEditor,
                ]}
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
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.sendBtnText}>Send Invite</Text>
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
