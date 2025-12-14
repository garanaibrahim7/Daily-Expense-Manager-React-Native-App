import { useTransactions } from '@/providers/TransactionProvider';
import { Transaction } from '@/types/transaction';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, TrendingDown, TrendingUp, Wallet, X } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface TransactionModalProps {
    visible: boolean;
    onClose: () => void;
    initialData?: Transaction | null; // If provided, we are editing
    defaultModeId?: string; // Pre-select a mode if adding
}

export default function TransactionModal({
    visible,
    onClose,
    initialData,
    defaultModeId,
}: TransactionModalProps) {
    const { modes, transactions, addTransaction, updateTransaction, isAddingTransaction } = useTransactions();

    const [amount, setAmount] = useState('');
    const [type, setType] = useState<'in' | 'out'>('in');
    const [selectedModeId, setSelectedModeId] = useState('');
    const [note, setNote] = useState('');
    const [date, setDate] = useState(new Date());
    const [isExcluded, setIsExcluded] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);

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
            } else {
                // Adding
                setAmount('');
                setType('in'); // Default type? Could be passed as prop too if needed
                setNote('');
                setDate(new Date());
                setIsExcluded(false);

                // Mode selection logic for adding
                if (defaultModeId) {
                    setSelectedModeId(defaultModeId);
                } else {
                    // Default to 'Cash' or first available
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
    }, [visible, initialData, defaultModeId, modes]);

    const handleSubmit = async () => {
        if (!amount || !selectedModeId) return;

        if (initialData) {
            // Update
            updateTransaction({
                id: initialData.id,
                modeId: selectedModeId,
                amount: parseFloat(amount),
                type,
                note: note || undefined,
                date: date.getTime(),
                isExcluded,
            });
        } else {
            // Add
            addTransaction({
                modeId: selectedModeId,
                amount: parseFloat(amount),
                type,
                note: note || undefined,
                date: date.getTime(),
                isExcluded,
            });
        }

        onClose();
        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    };

    const isSubmitting = isAddingTransaction; // Or use isUpdating if available? Hook types check needed.
    // Actually hook returns `isAddingTransaction`. It doesn't seem to return `isUpdatingTransaction` from the snippets I saw.
    // I'll stick to generic loading or just ignore it for Edit state for now, or assume it's fast.

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalContentWrapper}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>
                            {initialData ? 'Edit Transaction' : 'Add Transaction'}
                        </Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <X size={24} color="#333" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={styles.typeSelector}>
                            <TouchableOpacity
                                style={[styles.typeButton, type === 'in' && styles.inButtonActive]}
                                onPress={() => {
                                    setType('in');
                                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                }}
                            >
                                <TrendingUp size={20} color={type === 'in' ? '#fff' : '#10b981'} />
                                <Text
                                    style={[
                                        styles.typeButtonText,
                                        type === 'in' && styles.typeButtonTextActive,
                                    ]}
                                >
                                    Income
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.typeButton, type === 'out' && styles.outButtonActive]}
                                onPress={() => {
                                    setType('out');
                                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                }}
                            >
                                <TrendingDown size={20} color={type === 'out' ? '#fff' : '#ef4444'} />
                                <Text
                                    style={[
                                        styles.typeButtonText,
                                        type === 'out' && styles.typeButtonTextActive,
                                    ]}
                                >
                                    Expense
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Date</Text>
                            <TouchableOpacity
                                style={styles.dateSelector}
                                onPress={() => setShowDatePicker(true)}
                            >
                                <Calendar size={20} color="#666" />
                                <Text style={styles.dateText}>{date.toLocaleDateString()}</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Amount</Text>
                            <TextInput
                                style={styles.input}
                                value={amount}
                                onChangeText={setAmount}
                                placeholder="0.00"
                                keyboardType="decimal-pad"
                                placeholderTextColor="#999"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Account</Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={styles.modeSelector}
                                keyboardShouldPersistTaps="handled"
                            >
                                {modes.map((mode) => (
                                    <TouchableOpacity
                                        key={mode.id}
                                        style={[
                                            styles.modeSelectorItem,
                                            selectedModeId === mode.id && styles.modeSelectorItemActive,
                                            {
                                                borderColor:
                                                    selectedModeId === mode.id ? mode.color : '#e5e5e5',
                                            },
                                            selectedModeId === mode.id && { backgroundColor: mode.color },
                                            { borderColor: mode.color },
                                        ]}
                                        onPress={() => {
                                            setSelectedModeId(mode.id);
                                            if (Platform.OS !== 'web')
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        }}
                                    >
                                        <Wallet
                                            size={16}
                                            color={selectedModeId === mode.id ? '#fff' : mode.color}
                                        />
                                        <Text
                                            style={[
                                                styles.modeSelectorText,
                                                selectedModeId === mode.id && styles.modeSelectorTextActive,
                                            ]}
                                        >
                                            {mode.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Note (Optional)</Text>
                            <TextInput
                                style={styles.input}
                                value={note}
                                onChangeText={setNote}
                                placeholder="Add a note..."
                                placeholderTextColor="#999"
                            />
                        </View>

                        {frequentNotes.length > 0 && (
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={styles.chipContainer}
                            >
                                {frequentNotes.map((n, i) => (
                                    <TouchableOpacity
                                        key={i}
                                        style={styles.chip}
                                        onPress={() => setNote(n)}
                                    >
                                        <Text style={styles.chipText}>{n}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        )}

                        <View style={styles.switchContainer}>
                            <Text style={styles.switchLabel}>
                                {initialData ? 'Exclude from Totals' : 'Exclude from Totals'}
                            </Text>
                            <Switch
                                value={isExcluded}
                                onValueChange={setIsExcluded}
                                trackColor={{ false: '#767577', true: '#81b0ff' }}
                                thumbColor={isExcluded ? '#f5dd4b' : '#f4f3f4'}
                            />
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.submitButton,
                                (!amount || !selectedModeId || isSubmitting) &&
                                styles.submitButtonDisabled,
                            ]}
                            onPress={handleSubmit}
                            disabled={!amount || !selectedModeId || isSubmitting}
                        >
                            <LinearGradient
                                colors={
                                    !amount || !selectedModeId || isSubmitting
                                        ? ['#ccc', '#999']
                                        : type === 'in'
                                            ? ['#10b943ff', '#059669']
                                            : ['#ff3232ff', '#c42121ff']
                                }
                                style={styles.submitButtonGradient}
                            >
                                <Text style={styles.submitButtonText}>
                                    {isSubmitting
                                        ? 'Saving...'
                                        : initialData
                                            ? 'Save Changes'
                                            : 'Add Transaction'}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>
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
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
        paddingHorizontal: 24,
        paddingTop: 24,
        maxHeight: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    closeButton: {
        padding: 8,
        backgroundColor: '#f5f5f5',
        borderRadius: 20,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#333',
    },
    typeSelector: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    typeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#e5e5e5',
        backgroundColor: '#fff',
    },
    inButtonActive: {
        backgroundColor: '#00ad09ff',
        borderColor: '#0f7c18ff',
    },
    outButtonActive: {
        backgroundColor: '#e2000bff',
        borderColor: '#a7151dff',
    },
    typeButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    typeButtonTextActive: {
        color: '#fff',
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#333',
    },
    modeSelector: {
        marginTop: 8,
    },
    modeSelectorItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 20,
        borderWidth: 2,
        marginRight: 12,
        backgroundColor: '#fff',
    },
    modeSelectorItemActive: {
        backgroundColor: '#667eea',
        borderColor: '#667eea',
    },
    modeSelectorText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    modeSelectorTextActive: {
        color: '#fff',
    },
    submitButton: {
        marginTop: 8,
        marginBottom: 30, // Extra margin at bottom
        borderRadius: 12,
        overflow: 'hidden',
    },
    submitButtonDisabled: {
        opacity: 0.5,
    },
    submitButtonGradient: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    submitButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
    dateSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#f5f5f5',
        padding: 14,
        borderRadius: 12,
    },
    dateText: {
        fontSize: 16,
        color: '#333',
    },
    chipContainer: {
        flexDirection: 'row',
        marginBottom: 20,
        maxHeight: 40,
    },
    chip: {
        backgroundColor: '#ddddddff',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        marginRight: 8,
    },
    chipText: {
        color: '#44434dff',
        fontSize: 12,
        fontWeight: '600',
    },
    switchContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
        paddingHorizontal: 4,
    },
    switchLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
});
