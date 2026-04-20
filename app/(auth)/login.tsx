import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../providers/ThemeProvider';
import { useI18n } from '../../providers/I18nProvider';
import { useAuth } from '../../providers/AuthProvider';

type AuthMode = 'phone' | 'email' | 'signup';

export default function LoginScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const {
    signInWithEmail, signUpWithEmail,
    signInWithPhone, verifyOtp,
    signInWithGoogle,
  } = useAuth();

  const [mode, setMode] = useState<AuthMode>('phone');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function showError(msg: string) {
    setErrorMsg(msg);
  }

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
    setErrorMsg(null);
    if (!phone.trim()) {
      showError('Please enter your phone number.');
      return;
    }
    setLoading(true);
    try {
      await signInWithPhone(phone.trim());
      setOtpSent(true);
    } catch (err: any) {
      showError(err?.message ?? 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    setErrorMsg(null);
    if (!otp.trim() || otp.length < 6) {
      showError('Please enter the 6-digit code.');
      return;
    }
    setLoading(true);
    try {
      await verifyOtp(phone.trim(), otp.trim());
      router.replace('/(tabs)');
    } catch (err: any) {
      showError(err?.message ?? 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailSubmit() {
    setErrorMsg(null);
    if (!email.trim() || !password.trim()) {
      showError('Please enter email and password.');
      return;
    }
    if (mode === 'signup' && !name.trim()) {
      showError('Please enter your name.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'signup') {
        await signUpWithEmail(email.trim(), password, name.trim());
      } else {
        await signInWithEmail(email.trim(), password);
      }
      router.replace('/(tabs)');
    } catch (err: any) {
      showError(err?.message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setErrorMsg(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      router.replace('/(tabs)');
    } catch (err: any) {
      showError(err?.message ?? 'Google sign-in failed.');
    } finally {
      setLoading(false);
    }
  }

  function getInputStyle(fieldName: string) {
    return [
      styles.input,
      { color: c.text, borderBottomColor: focusedField === fieldName ? c.gold : c.border },
    ];
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo block */}
        <View style={styles.logoBlock}>
          <Image
            source={require('../../assets/images/icon.png')}
            style={styles.logoMark}
            resizeMode="contain"
            accessibilityLabel="Ar-Rashid"
          />
          <Text style={[styles.logoSubtitle, { color: c.textSecondary }]}>
            Khanqah Maseeh-ul-Ummah
          </Text>
          <Text style={[styles.logoUrdu, { color: c.gold }]}>
            خانقاہ مسیح الامت
          </Text>
          <Text style={[styles.tagline, { color: c.textMuted }]}>
            SEEKING NEARNESS THROUGH SOUND
          </Text>
        </View>

        {/* Tabs: Phone / Email / Google */}
        <View style={[styles.tabRow, { borderBottomColor: c.hairline }]}>
          {(['phone', 'email'] as AuthMode[]).map((tab) => {
            const isActive = mode === tab || (tab === 'email' && mode === 'signup');
            return (
              <TouchableOpacity
                key={tab}
                style={styles.tab}
                onPress={() => {
                  if (tab === 'phone') { setMode('phone'); setOtpSent(false); setOtp(''); }
                  else { setMode('email'); }
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, { color: isActive ? c.primary : c.textMuted }]}>
                  {tab === 'phone' ? 'Phone' : 'Email'}
                </Text>
                {isActive && (
                  <View style={[styles.tabUnderline, { backgroundColor: c.gold }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {errorMsg && (
          <View style={[styles.errorBanner, { borderColor: c.liveRed, backgroundColor: theme.dark ? 'rgba(214,80,80,0.12)' : 'rgba(194,62,62,0.08)' }]}>
            <Text style={[styles.errorText, { color: c.liveRed }]}>{errorMsg}</Text>
            <TouchableOpacity
              onPress={() => setErrorMsg(null)}
              accessibilityLabel="Dismiss error"
              style={styles.errorDismiss}
            >
              <Text style={[styles.errorDismissText, { color: c.liveRed }]}>×</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Phone OTP Form */}
        {mode === 'phone' && (
          <View style={styles.form}>
            {!otpSent ? (
              <>
                <Text style={[styles.label, { color: c.textMuted }]}>PHONE NUMBER</Text>
                <TextInput
                  style={getInputStyle('phone')}
                  placeholder="+91 98765 43210"
                  placeholderTextColor={c.textMuted}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  onFocus={() => setFocusedField('phone')}
                  onBlur={() => setFocusedField(null)}
                />
                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: c.primary }, loading && styles.btnDisabled]}
                  onPress={handleSendOtp}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color={c.onPrimary} />
                  ) : (
                    <Text style={[styles.primaryBtnText, { color: c.onPrimary }]}>SEND CODE</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={[styles.otpHint, { color: c.textMuted }]}>
                  Code sent to {phone}
                </Text>
                <TextInput
                  style={[getInputStyle('otp'), styles.otpInput, { color: c.text }]}
                  placeholder="000000"
                  placeholderTextColor={c.textMuted}
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                  onFocus={() => setFocusedField('otp')}
                  onBlur={() => setFocusedField(null)}
                />
                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: c.primary }, loading && styles.btnDisabled]}
                  onPress={handleVerifyOtp}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color={c.onPrimary} />
                  ) : (
                    <Text style={[styles.primaryBtnText, { color: c.onPrimary }]}>VERIFY</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.resendRow}
                  onPress={() => { setOtpSent(false); setOtp(''); }}
                >
                  <Text style={[styles.resendText, { color: c.textMuted }]}>RESEND CODE</Text>
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
                <Text style={[styles.label, { color: c.textMuted }]}>YOUR NAME</Text>
                <TextInput
                  style={getInputStyle('name')}
                  placeholder="Full name"
                  placeholderTextColor={c.textMuted}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                />
              </>
            )}
            <Text style={[styles.label, { color: c.textMuted }]}>
              {t('auth.email') || 'EMAIL ADDRESS'}
            </Text>
            <TextInput
              style={getInputStyle('email')}
              placeholder="you@example.com"
              placeholderTextColor={c.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
            />
            <Text style={[styles.label, { color: c.textMuted }]}>
              {t('auth.password') || 'PASSWORD'}
            </Text>
            <TextInput
              style={getInputStyle('password')}
              placeholder="••••••••"
              placeholderTextColor={c.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
            />
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: c.primary }, loading && styles.btnDisabled]}
              onPress={handleEmailSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={c.onPrimary} />
              ) : (
                <Text style={[styles.primaryBtnText, { color: c.onPrimary }]}>
                  {mode === 'signup'
                    ? (t('auth.signUp') || 'CREATE ACCOUNT')
                    : (t('auth.signIn') || 'SIGN IN')}
                </Text>
              )}
            </TouchableOpacity>
            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: c.textMuted }]}>
                {mode === 'signup'
                  ? (t('auth.haveAccount') || 'Already have an account?')
                  : (t('auth.noAccount') || "Don't have an account?")}
              </Text>
              <TouchableOpacity onPress={() => setMode(mode === 'signup' ? 'email' : 'signup')}>
                <Text style={[styles.toggleLink, { color: c.primary }]}>
                  {mode === 'signup'
                    ? (t('auth.signIn') || ' Sign In')
                    : (t('auth.signUp') || ' Sign Up')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: c.hairline }]} />
          <Text style={[styles.dividerText, { color: c.textMuted }]}>or</Text>
          <View style={[styles.dividerLine, { backgroundColor: c.hairline }]} />
        </View>

        {/* Google button */}
        <TouchableOpacity
          style={[styles.googleBtn, { borderColor: c.border }]}
          onPress={handleGoogleSignIn}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={[styles.googleG, { color: '#4285F4' }]}>G</Text>
          <Text style={[styles.googleBtnText, { color: c.text }]}>
            {t('auth.googleSignIn') || 'Continue with Google'}
          </Text>
        </TouchableOpacity>

        {/* Guest link */}
        <TouchableOpacity
          style={styles.guestRow}
          onPress={() => router.replace('/(tabs)')}
          activeOpacity={0.7}
        >
          <Text style={[styles.guestText, { color: c.textMuted }]}>CONTINUE AS GUEST</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 32,
    paddingTop: 72,
    paddingBottom: 40,
  },

  // Logo block
  logoBlock: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoMark: {
    width: 180,
    height: 180,
    marginBottom: 8,
  },
  logoSubtitle: {
    fontFamily: 'CrimsonPro-Italic',
    fontSize: 20,
    marginBottom: 8,
  },
  logoUrdu: {
    fontFamily: 'NastaleeqUrdu',
    fontSize: 28,
    lineHeight: 48,
    textAlign: 'center',
    writingDirection: 'rtl',
    marginBottom: 12,
  },
  tagline: {
    fontFamily: 'DMSans',
    fontSize: 10,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginBottom: 28,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingBottom: 10,
  },
  tabText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  tabUnderline: {
    position: 'absolute',
    bottom: -1,
    left: '20%',
    right: '20%',
    height: 2,
    borderRadius: 1,
  },

  // Form
  form: {
    marginBottom: 8,
  },
  label: {
    fontFamily: 'DMSans',
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    marginTop: 20,
    marginBottom: 6,
  },
  input: {
    fontFamily: 'CrimsonPro',
    fontSize: 18,
    paddingVertical: 8,
    borderBottomWidth: 1,
    backgroundColor: 'transparent',
  },

  // Primary button
  primaryBtn: {
    height: 52,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
  },
  btnDisabled: {
    opacity: 0.65,
  },
  primaryBtnText: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  // OTP
  otpHint: {
    fontFamily: 'DMSans',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  otpInput: {
    textAlign: 'center',
    fontSize: 28,
    letterSpacing: 10,
  },
  resendRow: {
    alignItems: 'center',
    marginTop: 18,
  },
  resendText: {
    fontFamily: 'DMSans',
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },

  // Toggle sign-in / sign-up
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 18,
    flexWrap: 'wrap',
    gap: 4,
  },
  toggleLabel: {
    fontFamily: 'DMSans',
    fontSize: 13,
  },
  toggleLink: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: 13,
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontFamily: 'DMSans',
    fontSize: 12,
    marginHorizontal: 16,
  },

  // Google button
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: 14,
    gap: 12,
  },
  googleG: {
    fontSize: 16,
    fontWeight: '700',
  },
  googleBtnText: {
    fontFamily: 'CrimsonPro',
    fontSize: 17,
  },

  // Error banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontFamily: 'DMSans',
    fontSize: 13,
    lineHeight: 18,
  },
  errorDismiss: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorDismissText: {
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '600',
  },

  // Guest link
  guestRow: {
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 4,
  },
  guestText: {
    fontFamily: 'DMSans',
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
