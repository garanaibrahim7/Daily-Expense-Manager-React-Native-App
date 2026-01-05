import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { ArrowLeftRight, Calendar, TrendingDown, TrendingUp, Wallet, X } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    TouchableOpacity,
    View,
} from 'react-native';

import { Colors } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useTransactions } from '@/providers/TransactionProvider';
import { Transaction } from '@/types/transaction';

import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface TransactionModalProps {
    visible: boolean;
    onClose: () => void;
    initialData?: Transaction | null;
    defaultModeId?: string;
    initialTab?: 'expense' | 'income' | 'transfer';
}

export default function TransactionModal({
    visible,
    onClose,
    initialData,
    defaultModeId,
    initialTab = 'expense',
}: TransactionModalProps) {
    const { modes, transactions, addTransaction, updateTransaction, isAddingTransaction } = useTransactions();
    const tintColor = useThemeColor({}, 'tint');
    const backgroundColor = useThemeColor({}, 'background');
    const surfaceColor = useThemeColor({}, 'surface');
    const textColor = useThemeColor({}, 'text');

    const [amount, setAmount] = useState('');
    const [type, setType] = useState<'in' | 'out'>('in');
    const [selectedModeId, setSelectedModeId] = useState('');
    const [note, setNote] = useState('');
    const [date, setDate] = useState(new Date());
    const [isExcluded, setIsExcluded] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Transfer Mode State
    const [isTransferMode, setIsTransferMode] = useState(false);
    const [targetModeId, setTargetModeId] = useState('');

    // Frequent notes logic
    const frequentNotes = useMemo(() => {
        const counts: Record<string, number> = {};
        transactions.forEach((t) => {
            if (t.note) counts[t.note] = (counts[t.note] || 0) + 1;
        });
        return Object.entries(counts)
            .filter(([_, count]) => count > 20)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([n]) => n);
    }, [transactions]);

    // Reset or Populate form when modal opens/changes
    useEffect(() => {
        if (visible) {
            if (initialData) {
                // Editing
                setAmount(initialData.amount.toString());
                setType(initialData.type);
                setSelectedModeId(initialData.modeId);
                setNote(initialData.note || '');
                setDate(new Date(initialData.date));
                setIsExcluded(!!initialData.isExcluded);
                setIsTransferMode(false);
                setTargetModeId('');
            } else {
                // Adding
                setAmount('');
                setType(initialTab === 'income' ? 'in' : 'out'); // Set based on tab
                setNote('');
                setDate(new Date());
                setIsExcluded(false);
                setIsTransferMode(initialTab === 'transfer'); // Set transfer mode
                setTargetModeId('');

                if (defaultModeId) {
                    setSelectedModeId(defaultModeId);
                } else {
                    const cashMode = modes.find((m) => m.name.toLowerCase() === 'cash');
                    if (cashMode) {
                        setSelectedModeId(cashMode.id);
                    } else if (modes.length > 0) {
                        setSelectedModeId(modes[0].id);
                    } else {
                        setSelectedModeId('');
                    }
                }
            }
        }
    }, [visible, initialData, defaultModeId, modes, initialTab]); // Added initialTab dependency

    const handleSubmit = async () => {
        if (!amount || !selectedModeId) return;

        if (isTransferMode) {
            if (!targetModeId) {
                Alert.alert('Selection Error', 'Please select a target account for transfer.');
                return;
            }
            if (selectedModeId === targetModeId) {
                Alert.alert('Selection Error', 'Source and Target accounts cannot be the same.');
                return;
            }

            const sourceMode = modes.find(m => m.id === selectedModeId);
            const targetMode = modes.find(m => m.id === targetModeId);

            addTransaction({
                modeId: selectedModeId,
                amount: parseFloat(amount),
                type: 'out',
                note: `Transfer to ${targetMode?.name} ${note ? '- ' + note : ''} `,
                date: date.getTime(),
                isExcluded: true,
            });

            addTransaction({
                modeId: targetModeId,
                amount: parseFloat(amount),
                type: 'in',
                note: `Transfer from ${sourceMode?.name} ${note ? '- ' + note : ''} `,
                date: date.getTime(),
                isExcluded: true,
            });

        } else {
            if (initialData) {
                updateTransaction({
                    id: initialData.id,
                    modeId: selectedModeId,
                    amount: parseFloat(amount),
                    type,
                    note: note?.trim() || undefined,
                    date: date.getTime(),
                    isExcluded,
                });
            } else {
                addTransaction({
                    modeId: selectedModeId,
                    amount: parseFloat(amount),
                    type,
                    note: note?.trim() || undefined,
                    date: date.getTime(),
                    isExcluded,
                });
            }
        }

        onClose();
        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    };

    const isSubmitting = isAddingTransaction;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalContentWrapper}>
                <View style={[styles.modalContent, { backgroundColor: surfaceColor }]}>

                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <ThemedText type="title" style={{ fontSize: 24 }}>
                            {initialData ? 'Edit Transaction' : 'Add Transaction'}
                        </ThemedText>
                        <TouchableOpacity
                            onPress={onClose}
                            style={[styles.closeButton, { backgroundColor: backgroundColor }]}
                        >
                            <X size={20} color={textColor} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={{ paddingBottom: 40 }}
                    >
                        {/* Type Toggle or Transfer Info */}
                        {!isTransferMode ? (
                            <View style={styles.typeSelector}>
                                <TouchableOpacity
                                    style={[
                                        styles.typeButton,
                                        { backgroundColor: type === 'in' ? Colors.light.success : backgroundColor },
                                        type === 'in' && styles.activeTypeButton
                                    ]}
                                    onPress={() => {
                                        setType('in');
                                        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    }}
                                >
                                    <TrendingUp size={20} color={type === 'in' ? '#fff' : Colors.light.success} />
                                    <ThemedText style={{ color: type === 'in' ? '#fff' : Colors.light.success, fontWeight: '700' }}>Income</ThemedText>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.typeButton,
                                        { backgroundColor: type === 'out' ? Colors.light.error : backgroundColor },
                                        type === 'out' && styles.activeTypeButton
                                    ]}
                                    onPress={() => {
                                        setType('out');
                                        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    }}
                                >
                                    <TrendingDown size={20} color={type === 'out' ? '#fff' : Colors.light.error} />
                                    <ThemedText style={{ color: type === 'out' ? '#fff' : Colors.light.error, fontWeight: '700' }}>Expense</ThemedText>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={[styles.transferBanner, { backgroundColor: tintColor + '20' }]}>
                                <ArrowLeftRight size={20} color={tintColor} />
                                <ThemedText style={{ color: tintColor, fontWeight: '600' }}>Transfer Mode Active</ThemedText>
                            </View>
                        )}

                        {/* Date Picker */}
                        <TouchableOpacity
                            style={[styles.dateSelector, { backgroundColor }]}
                            onPress={() => setShowDatePicker(true)}
                        >
                            <Calendar size={20} color={textColor} style={{ opacity: 0.6 }} />
                            <ThemedText style={{ fontWeight: '500' }}>{date.toLocaleDateString()}</ThemedText>
                        </TouchableOpacity>

                        {/* Amount Input */}
                        <Input
                            label="Amount"
                            value={amount}
                            onChangeText={setAmount}
                            placeholder="0.00"
                            keyboardType="decimal-pad"
                            style={{ fontSize: 24, fontWeight: '700', height: 60 }}
                        />

                        {/* Account Selector */}
                        <ThemedText style={styles.sectionLabel}>
                            {isTransferMode ? 'From Account' : 'Account'}
                        </ThemedText>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.modeSelector}
                            contentContainerStyle={{ gap: 12, paddingRight: 20 }}
                        >
                            {modes.map((mode) => (
                                <TouchableOpacity
                                    key={mode.id}
                                    style={[
                                        styles.modeItem,
                                        { borderColor: mode.color },
                                        selectedModeId === mode.id && { backgroundColor: mode.color }
                                    ]}
                                    onPress={() => {
                                        setSelectedModeId(mode.id);
                                        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    }}
                                >
                                    <Wallet size={16} color={selectedModeId === mode.id ? '#fff' : mode.color} />
                                    <ThemedText style={{ color: selectedModeId === mode.id ? '#fff' : mode.color, fontWeight: '600' }}>
                                        {mode.name}
                                    </ThemedText>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* Target Account for Transfer */}
                        {isTransferMode && (
                            <>
                                <ThemedText style={[styles.sectionLabel, { marginTop: 16 }]}>To Account</ThemedText>
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    style={styles.modeSelector}
                                    contentContainerStyle={{ gap: 12, paddingRight: 20 }}
                                >
                                    {modes.map((mode) => (
                                        <TouchableOpacity
                                            key={mode.id}
                                            style={[
                                                styles.modeItem,
                                                { borderColor: mode.color },
                                                targetModeId === mode.id && { backgroundColor: mode.color },
                                                selectedModeId === mode.id && { opacity: 0.3 }
                                            ]}
                                            onPress={() => {
                                                if (selectedModeId === mode.id) return;
                                                setTargetModeId(mode.id);
                                                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            }}
                                            disabled={selectedModeId === mode.id}
                                        >
                                            <Wallet size={16} color={targetModeId === mode.id ? '#fff' : mode.color} />
                                            <ThemedText style={{ color: targetModeId === mode.id ? '#fff' : mode.color, fontWeight: '600' }}>
                                                {mode.name}
                                            </ThemedText>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </>
                        )}

                        {/* Note Input */}
                        <View style={{ marginTop: 24 }}>
                            <Input
                                label="Note (Optional)"
                                value={note}
                                onChangeText={setNote}
                                placeholder="Add a note..."
                            />
                        </View>

                        {/* Frequent Notes */}
                        {frequentNotes.length > 0 && (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipContainer}>
                                {frequentNotes.map((n, i) => (
                                    <TouchableOpacity
                                        key={i}
                                        style={[styles.chip, { backgroundColor }]}
                                        onPress={() => setNote(n)}
                                    >
                                        <ThemedText style={{ fontSize: 13 }}>{n}</ThemedText>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        )}

                        {/* Excluded Switch */}
                        {!isTransferMode && (
                            <View style={styles.switchContainer}>
                                <ThemedText style={{ fontWeight: '600' }}>Exclude from Totals</ThemedText>
                                <Switch
                                    value={isExcluded}
                                    onValueChange={setIsExcluded}
                                    trackColor={{ false: '#767577', true: tintColor }}
                                    thumbColor={'#fff'}
                                />
                            </View>
                        )}

                        {/* Transfer Toggle */}
                        {!initialData && (
                            <Button
                                variant="ghost"
                                label={isTransferMode ? "Switch to Regular Transaction" : "Transfer to another account"}
                                onPress={() => {
                                    setIsTransferMode(!isTransferMode);
                                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                }}
                                style={{ marginTop: 16 }}
                            />
                        )}

                        {/* Submit Button */}
                        <View style={{ marginTop: 24 }}>
                            <Button
                                label={isSubmitting ? 'Saving...' : initialData ? 'Save Changes' : 'Add Transaction'}
                                variant={type === 'out' || isTransferMode ? 'danger' : 'primary'}
                                disabled={!amount || !selectedModeId || isSubmitting || (isTransferMode && !targetModeId)}
                                onPress={handleSubmit}
                            />
                        </View>
                    </ScrollView>
                </View>
            </View>

            {showDatePicker && (
                <DateTimePicker
                    value={date}
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) => {
                        setShowDatePicker(false);
                        if (selectedDate) {
                            setDate(selectedDate);
                        }
                    }}
                />
            )}
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalContentWrapper: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingHorizontal: 24,
        paddingTop: 32,
        maxHeight: '92%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32,
    },
    closeButton: {
        padding: 10,
        borderRadius: 50,
    },
    typeSelector: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 24,
    },
    typeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
        borderRadius: 24,
    },
    activeTypeButton: {
        // Active state handled by bg color in render
    },
    transferBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: 16,
        borderRadius: 24,
        marginBottom: 24,
    },
    dateSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 16,
        borderRadius: 24,
        marginBottom: 24,
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 12,
        opacity: 0.7,
    },
    modeSelector: {
        marginBottom: 8,
    },
    modeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 24,
        borderWidth: 2,
    },
    chipContainer: {
        flexDirection: 'row',
        marginBottom: 24,
        marginTop: 12,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 24,
        marginRight: 8,
    },
    switchContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingVertical: 8,
    },
});
