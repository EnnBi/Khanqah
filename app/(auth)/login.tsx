import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useTheme } from '../../providers/ThemeProvider';
import { useI18n } from '../../providers/I18nProvider';
import { useAuth } from '../../providers/AuthProvider';

type AuthMode = 'phone' | 'email' | 'signup';

export default function LoginScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const {
    signInWithEmail, signUpWithEmail,
    signInWithPhone, verifyOtp,
    signInWithGoogle,
  } = useAuth();

  const [mode, setMode] = useState<AuthMode>('phone');
  const [loading, setLoading] = useState(false);

  // Phone OTP state
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');

  // Email state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const c = theme.colors;

  async function handleSendOtp() {
    if (!phone.trim()) {
      Alert.alert('Error', 'Please enter your phone number.');
      return;
    }
    setLoading(true);
    try {
      await signInWithPhone(phone.trim());
      setOtpSent(true);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    if (!otp.trim() || otp.length < 6) {
      Alert.alert('Error', 'Please enter the 6-digit code.');
      return;
    }
    setLoading(true);
    try {
      await verifyOtp(phone.trim(), otp.trim());
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailSubmit() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter email and password.');
      return;
    }
    if (mode === 'signup' && !name.trim()) {
      Alert.alert('Error', 'Please enter your name.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'signup') {
        await signUpWithEmail(email.trim(), password, name.trim());
      } else {
        await signInWithEmail(email.trim(), password);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Google sign-in failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.appName, { color: c.primary }]}>Khanqah Maseeh-ul-Ummah</Text>
          <Text style={[styles.arabicText, { color: c.gold }]}>خانقاہ مسیح الامت</Text>
          <Text style={[styles.subtitle, { color: c.textSecondary }]}>
            Hazrat Mufti Abdur Rasheed Miftahi Sahab
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: c.surface }]}>

          {/* Google Sign In */}
          <TouchableOpacity
            style={[styles.googleBtn, { borderColor: c.border }]}
            onPress={handleGoogleSignIn}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.googleIcon}>G</Text>
            <Text style={[styles.googleText, { color: c.text }]}>
              {t('auth.googleSignIn') || 'Continue with Google'}
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: c.border }]} />
            <Text style={[styles.dividerText, { color: c.textMuted }]}>or</Text>
            <View style={[styles.dividerLine, { backgroundColor: c.border }]} />
          </View>

          {/* Mode tabs: Phone | Email */}
          <View style={styles.modeTabs}>
            <TouchableOpacity
              style={[
                styles.modeTab,
                (mode === 'phone') && { borderBottomColor: c.primary, borderBottomWidth: 2 },
              ]}
              onPress={() => { setMode('phone'); setOtpSent(false); setOtp(''); }}
            >
              <Text style={[styles.modeTabText, { color: mode === 'phone' ? c.primary : c.textMuted }]}>
                Phone
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modeTab,
                (mode === 'email' || mode === 'signup') && { borderBottomColor: c.primary, borderBottomWidth: 2 },
              ]}
              onPress={() => setMode('email')}
            >
              <Text style={[styles.modeTabText, { color: (mode === 'email' || mode === 'signup') ? c.primary : c.textMuted }]}>
                Email
              </Text>
            </TouchableOpacity>
          </View>

          {/* Phone OTP Form */}
          {mode === 'phone' && (
            <View style={styles.form}>
              {!otpSent ? (
                <>
                  <Text style={[styles.label, { color: c.textSecondary }]}>Phone Number</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: c.surface2, color: c.text, borderColor: c.border }]}
                    placeholder="+91 98765 43210"
                    placeholderTextColor={c.textMuted}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    autoComplete="tel"
                  />
                  <TouchableOpacity
                    style={[styles.button, { backgroundColor: c.primary }, loading && styles.buttonDisabled]}
                    onPress={handleSendOtp}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.buttonText}>Send OTP</Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={[styles.otpInfo, { color: c.textSecondary }]}>
                    Code sent to {phone}
                  </Text>
                  <TextInput
                    style={[styles.input, styles.otpInput, { backgroundColor: c.surface2, color: c.text, borderColor: c.border }]}
                    placeholder="000000"
                    placeholderTextColor={c.textMuted}
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                  />
                  <TouchableOpacity
                    style={[styles.button, { backgroundColor: c.primary }, loading && styles.buttonDisabled]}
                    onPress={handleVerifyOtp}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.buttonText}>Verify</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { setOtpSent(false); setOtp(''); }} style={styles.resendBtn}>
                    <Text style={[styles.resendText, { color: c.primary }]}>Resend code</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          {/* Email Form */}
          {(mode === 'email' || mode === 'signup') && (
            <View style={styles.form}>
              {mode === 'signup' && (
                <>
                  <Text style={[styles.label, { color: c.textSecondary }]}>Name</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: c.surface2, color: c.text, borderColor: c.border }]}
                    placeholder="Your name"
                    placeholderTextColor={c.textMuted}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                  />
                </>
              )}
              <Text style={[styles.label, { color: c.textSecondary }]}>{t('auth.email') || 'Email'}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: c.surface2, color: c.text, borderColor: c.border }]}
                placeholder="you@example.com"
                placeholderTextColor={c.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Text style={[styles.label, { color: c.textSecondary }]}>{t('auth.password') || 'Password'}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: c.surface2, color: c.text, borderColor: c.border }]}
                placeholder="••••••••"
                placeholderTextColor={c.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              <TouchableOpacity
                style={[styles.button, { backgroundColor: c.primary }, loading && styles.buttonDisabled]}
                onPress={handleEmailSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>
                    {mode === 'signup' ? (t('auth.signUp') || 'Sign Up') : (t('auth.signIn') || 'Sign In')}
                  </Text>
                )}
              </TouchableOpacity>
              <View style={styles.toggleRow}>
                <Text style={[styles.toggleLabel, { color: c.textSecondary }]}>
                  {mode === 'signup' ? (t('auth.haveAccount') || 'Already have an account?') : (t('auth.noAccount') || "Don't have an account?")}
                </Text>
                <TouchableOpacity onPress={() => setMode(mode === 'signup' ? 'email' : 'signup')}>
                  <Text style={[styles.toggleLink, { color: c.primary }]}>
                    {mode === 'signup' ? (t('auth.signIn') || 'Sign In') : (t('auth.signUp') || 'Sign Up')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 32 },
  appName: { fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 6 },
  arabicText: { fontFamily: 'NastaleeqUrdu', fontSize: 26, textAlign: 'center', marginBottom: 4, lineHeight: 42 },
  subtitle: { fontSize: 13, textAlign: 'center' },
  card: { borderRadius: 16, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },

  // Google button
  googleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 10, paddingVertical: 12, gap: 10 },
  googleIcon: { fontSize: 18, fontWeight: '700', color: '#4285F4' },
  googleText: { fontSize: 15, fontWeight: '500' },

  // Divider
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: 12, fontSize: 13 },

  // Mode tabs
  modeTabs: { flexDirection: 'row', marginBottom: 16 },
  modeTab: { flex: 1, alignItems: 'center', paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  modeTabText: { fontSize: 15, fontWeight: '600' },

  // Form
  form: { marginTop: 4 },
  label: { fontSize: 13, marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  button: { borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  buttonDisabled: { opacity: 0.65 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  // OTP
  otpInfo: { fontSize: 13, textAlign: 'center', marginBottom: 12 },
  otpInput: { textAlign: 'center', fontSize: 24, letterSpacing: 8 },
  resendBtn: { alignItems: 'center', marginTop: 16 },
  resendText: { fontSize: 14, fontWeight: '500' },

  // Toggle
  toggleRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' },
  toggleLabel: { fontSize: 14 },
  toggleLink: { fontSize: 14, fontWeight: '600', marginLeft: 4 },
});
