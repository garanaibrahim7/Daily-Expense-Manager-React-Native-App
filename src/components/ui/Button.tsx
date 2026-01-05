import { Colors } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, TouchableOpacityProps, View } from 'react-native';

export type ButtonProps = TouchableOpacityProps & {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    label?: string; // Made optional
    loading?: boolean;
    icon?: React.ReactNode;
    children?: React.ReactNode; // Added children
};

export function Button({
    variant = 'primary',
    size = 'md',
    label,
    loading,
    icon,
    style,
    disabled,
    children,
    ...props
}: ButtonProps) {
    const primaryGradient = Colors.light.gradients.primary;

    const tint = useThemeColor({}, 'tint');
    // ... colors ...

    const height = size === 'sm' ? 36 : size === 'md' ? 48 : 56;
    const fontSize = size === 'sm' ? 14 : size === 'md' ? 16 : 18;
    const paddingHorizontal = size === 'sm' ? 16 : 24;

    const isGradient = variant === 'primary' && !disabled;

    const content = label || children;

    const ButtonContent = (
        <View style={[styles.content]}>
            {loading ? (
                <ActivityIndicator color={variant === 'primary' ? 'white' : tint} style={{ marginRight: 8 }} />
            ) : icon ? (
                <View style={{ marginRight: 8 }}>{icon}</View>
            ) : null}
            {typeof content === 'string' ? (
                <Text style={[
                    styles.label,
                    { fontSize },
                    variant === 'primary' && { color: 'white', fontWeight: 'bold' },
                    variant === 'secondary' && { color: tint, fontWeight: '600' },
                    variant === 'outline' && { color: tint, fontWeight: '600' },
                    variant === 'ghost' && { color: tint },
                    variant === 'danger' && { color: 'white', fontWeight: 'bold' },
                    disabled && { color: '#999' }
                ]}>
                    {content}
                </Text>
            ) : (
                content
            )}
        </View>
    );

    if (isGradient) {
        return (
            <TouchableOpacity
                activeOpacity={0.8}
                disabled={disabled}
                style={[styles.container, { height, borderRadius: height / 2 }, style]}
                {...props}
            >
                <LinearGradient
                    colors={primaryGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.gradient, { paddingHorizontal }]}
                >
                    {ButtonContent}
                </LinearGradient>
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity
            activeOpacity={0.7}
            disabled={disabled}
            style={[
                styles.container,
                { height, borderRadius: height / 2, paddingHorizontal },
                variant === 'secondary' && { backgroundColor: useThemeColor({}, 'surfaceHighlight') },
                variant === 'outline' && { borderWidth: 2, borderColor: tint, backgroundColor: 'transparent' },
                variant === 'danger' && { backgroundColor: Colors.light.error }, // Simplification
                disabled && { backgroundColor: '#e5e5e5', borderColor: '#e5e5e5' },
                style
            ]}
            {...props}
        >
            {ButtonContent}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    gradient: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    label: {
        textAlign: 'center',
    }
});
