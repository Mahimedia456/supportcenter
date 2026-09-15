import React, {
  forwardRef,
  useRef,
  useState,
} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { finalTheme } from '@/constants/final-theme';

type Props = TextInputProps & {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  error?: string;
  password?: boolean;
};

export const AppTextField = forwardRef<TextInput, Props>(
  function AppTextField(
    {
      label,
      icon,
      error,
      password = false,
      secureTextEntry,
      onFocus,
      onBlur,
      ...props
    },
    forwardedRef,
  ) {
    const innerRef = useRef<TextInput | null>(null);
    const [focused, setFocused] = useState(false);
    const [hidden, setHidden] = useState(
      password ? secureTextEntry !== false : false,
    );

    function assignRef(node: TextInput | null) {
      innerRef.current = node;

      if (typeof forwardedRef === 'function') {
        forwardedRef(node);
      } else if (forwardedRef) {
        forwardedRef.current = node;
      }
    }

    const handleFocus: NonNullable<TextInputProps['onFocus']> = (event) => {
      setFocused(true);
      onFocus?.(event);
    };

    const handleBlur: NonNullable<TextInputProps['onBlur']> = (event) => {
      setFocused(false);
      onBlur?.(event);
    };

    function togglePassword() {
      const keepFocus = innerRef.current?.isFocused();

      setHidden((value) => !value);

      if (keepFocus) {
        requestAnimationFrame(() => {
          innerRef.current?.focus();
        });
      }
    }

    return (
      <View style={s.block}>
        <Pressable
          onPress={() => innerRef.current?.focus()}
          style={[
            s.field,
            focused && s.fieldFocused,
            error ? s.fieldError : null,
          ]}
        >
          <Ionicons
            name={icon}
            size={21}
            color={
              focused
                ? finalTheme.colors.primary
                : finalTheme.colors.textSoft
            }
          />

          <View style={s.inputWrap}>
            <Text style={[s.label, focused && s.labelFocused]}>
              {label}
            </Text>

            <TextInput
              ref={assignRef}
              {...props}
              secureTextEntry={password ? hidden : secureTextEntry}
              placeholderTextColor="#8A9B97"
              selectionColor={finalTheme.colors.primary}
              cursorColor={finalTheme.colors.primary}
              style={s.input}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </View>

          {password ? (
            <Pressable
              onPress={togglePassword}
              hitSlop={12}
              style={s.eye}
              accessibilityRole="button"
              accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            >
              <Ionicons
                name={hidden ? 'eye-off-outline' : 'eye-outline'}
                size={21}
                color={finalTheme.colors.textSoft}
              />
            </Pressable>
          ) : null}
        </Pressable>

        {error ? <Text style={s.error}>{error}</Text> : null}
      </View>
    );
  },
);

const s = StyleSheet.create({
  block: {
    marginBottom: 14,
  },
  field: {
    minHeight: 62,
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: finalTheme.colors.border,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldFocused: {
    borderColor: finalTheme.colors.cyan,
    shadowColor: finalTheme.colors.cyan,
    shadowOpacity: 0.13,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  fieldError: {
    borderColor: finalTheme.colors.danger,
  },
  inputWrap: {
    flex: 1,
    marginLeft: 12,
  },
  label: {
    color: finalTheme.colors.textSoft,
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 2,
  },
  labelFocused: {
    color: finalTheme.colors.primary,
  },
  input: {
    minHeight: 37,
    color: finalTheme.colors.text,
    fontSize: 15,
    paddingVertical: 6,
    fontWeight: '700',
  },
  eye: {
    paddingLeft: 12,
    paddingVertical: 12,
  },
  error: {
    color: finalTheme.colors.danger,
    fontSize: 10,
    marginTop: 5,
    marginLeft: 6,
    fontWeight: '700',
  },
});
