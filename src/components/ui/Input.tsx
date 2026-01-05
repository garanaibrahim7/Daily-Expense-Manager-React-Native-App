import { useThemeColor } from '@/hooks/use-theme-color';
import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

export type InputProps = TextInputProps & {
    label?: string;
    error?: string;
};

export function Input({ label, error, style, ...props }: InputProps) {
    const backgroundColor = useThemeColor({}, 'surface');
    const textColor = useThemeColor({}, 'text');
    const placeholderColor = useThemeColor({}, 'textSecondary');
    const borderColor = error ? '#EF4444' : 'transparent';

    return (
        <View style={styles.container}>
            {label && <Text style={[styles.label, { color: textColor }]}>{label}</Text>}
            <TextInput
                style={[
                    styles.input,
                    { backgroundColor, color: textColor, borderColor },
                    error && { borderWidth: 1 },
                    style
                ]}
                placeholderTextColor={placeholderColor}
                {...props}
            />
            {error && <Text style={styles.error}>{error}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 8,
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        opacity: 0.9,
    },
    input: {
        height: 52,
        borderRadius: 16,
        paddingHorizontal: 16,
        fontSize: 16,
    },
    error: {
        color: '#EF4444',
        fontSize: 12,
    },
});
