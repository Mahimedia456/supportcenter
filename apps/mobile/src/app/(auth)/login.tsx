import React, {
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  ImageBackground,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAwareScreen } from '@/components/layout/KeyboardAwareScreen';
import { AppTextField } from '@/components/ui/AppTextField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { finalTheme } from '@/constants/final-theme';
import { useAuth } from '@/context/AuthContext';

const BACKGROUND = require('../../../assets/brand/final/auth-background.png');
const LOGO = require('../../../assets/brand/final/support-command-center-logo-transparent.png');

let launchIntroPlayed = false;

export default function LoginScreen() {
  const { signIn } = useAuth();

  const passwordRef = useRef<TextInput>(null);
  const screenHeight = useRef(Dimensions.get('window').height).current;
  const playLaunchIntro = useRef(!launchIntroPlayed).current;

  const compact = screenHeight < 720;

  const logoProgress = useRef(
    new Animated.Value(playLaunchIntro ? 0 : 1),
  ).current;

  const formOpacity = useRef(
    new Animated.Value(playLaunchIntro ? 0 : 1),
  ).current;

  const formTranslateY = useRef(
    new Animated.Value(playLaunchIntro ? 26 : 0),
  ).current;

  const brandTextOpacity = useRef(
    new Animated.Value(playLaunchIntro ? 0 : 1),
  ).current;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const logoStartY = compact ? 148 : 205;
  const logoEndY = compact ? 8 : 20;

  const logoTranslateY = logoProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [logoStartY, logoEndY],
  });

  const logoScale = logoProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1.0, compact ? 0.64 : 0.70],
  });

  useEffect(() => {
    if (!playLaunchIntro) return;

    launchIntroPlayed = true;

    const animation = Animated.sequence([
      // Real visible splash hold.
      Animated.delay(3000),

      // Logo travels from center to its permanent top position.
      Animated.parallel([
        Animated.timing(logoProgress, {
          toValue: 1,
          duration: 850,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(360),
          Animated.timing(brandTextOpacity, {
            toValue: 1,
            duration: 360,
            useNativeDriver: true,
          }),
        ]),
      ]),

      // Login becomes available at about the 4 second mark.
      Animated.parallel([
        Animated.timing(formOpacity, {
          toValue: 1,
          duration: 380,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(formTranslateY, {
          toValue: 0,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]);

    animation.start();

    return () => animation.stop();
  }, [
    brandTextOpacity,
    formOpacity,
    formTranslateY,
    logoProgress,
    playLaunchIntro,
  ]);

  async function submit() {
    if (busy) return;

    if (!email.trim() || !password) {
      setError('Enter your work email and password.');
      return;
    }

    Keyboard.dismiss();
    setBusy(true);
    setError('');

    try {
      await Promise.race([
        signIn(email.trim(), password),
        new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(
              new Error(
                'Login request timed out. Check the backend URL and internet connection.',
              ),
            );
          }, 15000);
        }),
      ]);

      // No manual router.replace here.
      // AuthContext updates the session and the existing root auth gate
      // moves the authenticated manager into /(tabs). This avoids the
      // previous navigation/session race that could leave Sign In loading.
    } catch (e: any) {
      setError(
        e?.message ||
          'Unable to sign in. Please check the backend and credentials.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAwareScreen contentStyle={s.scrollContent}>
      <ImageBackground
        source={BACKGROUND}
        resizeMode="cover"
        style={s.background}
        imageStyle={s.backgroundImage}
      >
        <View pointerEvents="none" style={s.tint} />

        <Animated.View
          pointerEvents="none"
          style={[
            s.brand,
            {
              transform: [
                { translateY: logoTranslateY },
                { scale: logoScale },
              ],
            },
          ]}
        >
          <Image
            source={LOGO}
            resizeMode="contain"
            style={s.logo}
          />

          <Animated.View style={{ opacity: brandTextOpacity }}>
         
          </Animated.View>
        </Animated.View>

        <Animated.View
          style={[
            s.formWrap,
            compact && s.formWrapCompact,
            {
              opacity: formOpacity,
              transform: [{ translateY: formTranslateY }],
            },
          ]}
          pointerEvents={playLaunchIntro ? 'auto' : 'auto'}
        >
          <View style={s.card}>
            <View style={s.accent} />

            <Text style={s.title}>Welcome back</Text>
            <Text style={s.subtitle}>
              Sign in to access your manager workspace
            </Text>

            <View style={s.form}>
              <AppTextField
                label="Work email"
                icon="mail-outline"
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  if (error) setError('');
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                textContentType="emailAddress"
                blurOnSubmit={false}
                onSubmitEditing={() => {
                  passwordRef.current?.focus();
                }}
              />

              <AppTextField
                ref={passwordRef}
                label="Password"
                icon="lock-closed-outline"
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  if (error) setError('');
                }}
                password
                secureTextEntry
                returnKeyType="done"
                textContentType="password"
                blurOnSubmit={false}
                onSubmitEditing={submit}
              />

              {error ? (
                <View style={s.errorBox}>
                  <Text style={s.errorText}>{error}</Text>
                </View>
              ) : null}

              <Text style={s.workspaceHint}>
                Your workspace is selected automatically from your manager email.
              </Text>

              <PrimaryButton
                label="Sign In"
                onPress={submit}
                loading={busy}
                disabled={!email.trim() || !password}
                style={s.button}
              />

              <Pressable
                onPress={() => {
                  setError(
                    'Password reset is managed by your Support Command Center administrator.',
                  );
                }}
                style={s.forgot}
              >
                <Text style={s.forgotText}>Forgot password?</Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </ImageBackground>
    </KeyboardAwareScreen>
  );
}

const s = StyleSheet.create({
  scrollContent: {
    minHeight: '100%',
  },
  background: {
    flex: 1,
    minHeight: 760,
    paddingHorizontal: 18,
    paddingBottom: 28,
  },
  backgroundImage: {
    opacity: 1,
  },
  tint: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(247,252,250,0.08)',
  },

  brand: {
    height: 278,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  logo: {
    width: 330,
    height: 230,
    marginBottom: -38,
  },
  brandTitle: {
    color: '#0C2923',
    fontSize: 28,
    lineHeight: 29,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.7,
  },
  brandSubtitle: {
    color: '#58706B',
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 1.6,
    textAlign: 'center',
    marginTop: 7,
  },

  formWrap: {
    marginTop: 4,
    zIndex: 3,
  },
  formWrapCompact: {
    marginTop: -14,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.985)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#DCE9E4',
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 19,
    shadowColor: '#0B3B31',
    shadowOpacity: 0.10,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 7,
    overflow: 'hidden',
  },
  accent: {
    position: 'absolute',
    top: 0,
    left: 74,
    right: 74,
    height: 3,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    backgroundColor: finalTheme.colors.cyan,
  },
  title: {
    color: finalTheme.colors.text,
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.7,
  },
  subtitle: {
    color: finalTheme.colors.textSoft,
    fontSize: 12.5,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 7,
    paddingHorizontal: 8,
  },
  form: {
    marginTop: 22,
  },
  workspaceHint: {
    color: finalTheme.colors.textSoft,
    fontSize: 10,
    lineHeight: 15,
    textAlign: 'center',
    paddingHorizontal: 12,
    marginTop: 2,
  },
  button: {
    marginTop: 17,
  },
  forgot: {
    alignItems: 'center',
    paddingTop: 15,
    paddingBottom: 2,
  },
  forgotText: {
    color: finalTheme.colors.primary,
    fontSize: 11.5,
    fontWeight: '800',
  },
  errorBox: {
    backgroundColor: '#FFF3F3',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  errorText: {
    color: finalTheme.colors.danger,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
});


