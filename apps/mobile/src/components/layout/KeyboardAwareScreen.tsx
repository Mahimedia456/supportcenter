import React, {
  PropsWithChildren,
} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function KeyboardAwareScreen({
  children,
  contentStyle,
  scrollRef,
}: PropsWithChildren<{
  contentStyle?: ViewStyle;
  scrollRef?: React.RefObject<ScrollView | null>;
}>) {
  return (
    <SafeAreaView
      style={s.safe}
      edges={['top', 'bottom']}
    >
      <KeyboardAvoidingView
        style={s.flex}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
        keyboardVerticalOffset={
          Platform.OS === 'ios'
            ? 8
            : 0
        }
      >
        <ScrollView
          ref={scrollRef}
          style={s.flex}
          contentContainerStyle={[
            s.content,
            contentStyle,
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === 'ios'
              ? 'interactive'
              : 'on-drag'
          }
          automaticallyAdjustKeyboardInsets={
            Platform.OS === 'ios'
          }
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F7FCFA',
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingBottom: 28,
  },
});
