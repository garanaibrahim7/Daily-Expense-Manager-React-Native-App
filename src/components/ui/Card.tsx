import { useThemeColor } from '@/hooks/use-theme-color';
import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';

export type CardProps = ViewProps & {
    variant?: 'elevated' | 'outlined' | 'flat';
};

export function Card({ style, variant = 'elevated', ...otherProps }: CardProps) {
    const backgroundColor = useThemeColor({}, 'surface');
    const borderColor = useThemeColor({}, 'border');
    const shadowColor = useThemeColor({}, 'text'); // Use text color for shadow to adapt to theme somewhat, or specific shadow color

    return (
        <View
            style={[
                styles.card,
                { backgroundColor },
                variant === 'outlined' && { borderWidth: 1, borderColor },
                variant === 'elevated' && {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.1,
                    shadowRadius: 12,
                    elevation: 5
                },
                style,
            ]}
            {...otherProps}
        />
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 20,
        padding: 20,
    },
});
