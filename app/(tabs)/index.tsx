import { useTransactions } from '@/providers/TransactionProvider';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from 'expo-router';
import { Plus, TrendingDown, TrendingUp, Wallet, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DashboardScreen() {
  const { modes, addTransaction, isAddingTransaction } = useTransactions();
  const insets = useSafeAreaInsets();
  const [showAddModal, setShowAddModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'in' | 'out'>('in');
  const [selectedModeId, setSelectedModeId] = useState('');
  const [note, setNote] = useState('');

  const totalBalance = modes.reduce((sum, mode) => sum + mode.currentBalance, 0);

  const handleOpenModal = () => {
    const cashMode = modes.find(m => m.name.toLowerCase() === 'cash');
    if (cashMode) {
      setSelectedModeId(cashMode.id);
    } else if (modes.length > 0) {
      setSelectedModeId(modes[0].id);
    }
    setShowAddModal(true);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleAddTransaction = () => {
    if (!amount || !selectedModeId) return;

    addTransaction({
      modeId: selectedModeId,
      amount: parseFloat(amount),
      type,
      note: note || undefined,
    });

    setAmount('');
    setNote('');
    setShowAddModal(false);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  useEffect(() => {
    console.log(modes);

  }, [])

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={['#271c5aff', '#203a4eff']} style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <View style={styles.headerContent}>
          <Text style={styles.headerLabel}>Total Balance</Text>
          <Text style={styles.headerAmount}>₹{totalBalance.toFixed(2)}</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.modesSection}>
          <Text style={styles.sectionTitle}>Your Accounts</Text>
          <View style={styles.modesGrid}>
            {modes.map((mode) => (
              <View key={mode.id} style={[styles.modeCard, { borderLeftColor: mode.color }]}>
                <View style={styles.modeHeader}>
                  <View style={[styles.modeIcon, { backgroundColor: mode.color + '20' }]}>
                    <Wallet size={20} color={mode.color} />
                  </View>
                  <Text style={styles.modeName}>{mode.name}</Text>
                </View>
                <Text style={styles.modeBalance}>₹{mode.currentBalance.toFixed(2)}</Text>
              </View>
            ))}
          </View>

          {modes.length === 0 && (
            <View style={styles.emptyState}>
              <Wallet size={48} color="#ccc" />
              <Text style={styles.emptyText}>No accounts yet</Text>
              <Text style={styles.emptySubtext}>Add your first account to get started</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={handleOpenModal}
        activeOpacity={0.8}
      >
        <LinearGradient colors={['#000000ff', '#4d4d4dff']} style={styles.fabGradient}>
          <Plus size={28} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalContentWrapper}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Transaction</Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <X size={24} color="#333" />
                </TouchableOpacity>
              </View>

              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[styles.typeButton, type === 'in' && styles.inButtonActive]}
                  onPress={() => {
                    setType('in');
                    if (Platform.OS !== 'web') {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  }}
                >
                  <TrendingUp size={20} color={type === 'in' ? '#fff' : '#10b981'} />
                  <Text style={[styles.typeButtonText, type === 'in' && styles.typeButtonTextActive]}>
                    Income
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.typeButton, type === 'out' && styles.outButtonActive]}
                  onPress={() => {
                    setType('out');
                    if (Platform.OS !== 'web') {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  }}
                >
                  <TrendingDown size={20} color={type === 'out' ? '#fff' : '#ef4444'} />
                  <Text style={[styles.typeButtonText, type === 'out' && styles.typeButtonTextActive]}>
                    Expense
                  </Text>
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
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modeSelector} keyboardShouldPersistTaps="handled">
                  {modes.map((mode) => (
                    <TouchableOpacity
                      key={mode.id}
                      style={[
                        styles.modeSelectorItem,
                        selectedModeId === mode.id && styles.modeSelectorItemActive,
                        { borderColor: selectedModeId === mode.id ? mode.color : '#e5e5e5' },
                        selectedModeId === mode.id && { backgroundColor: mode.color },
                        { borderColor: mode.color },
                      ]}
                      onPress={() => {
                        setSelectedModeId(mode.id);
                        if (Platform.OS !== 'web') {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }
                      }}
                    >
                      <Wallet size={16} color={selectedModeId === mode.id ? '#fff' : mode.color} />
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

              <TouchableOpacity
                style={[styles.submitButton, (!amount || !selectedModeId || isAddingTransaction) && styles.submitButtonDisabled]}
                onPress={handleAddTransaction}
                disabled={!amount || !selectedModeId || isAddingTransaction}
              >
                <LinearGradient
                  colors={(!amount || !selectedModeId || isAddingTransaction) ? ['#ccc', '#999'] : type === 'in' ? ['#10b943ff', '#059669'] : ['#ff3232ff', '#c42121ff']}
                  style={styles.submitButtonGradient}
                >
                  <Text style={styles.submitButtonText}>
                    {isAddingTransaction ? 'Adding...' : 'Add Transaction'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerLabel: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 8,
  },
  headerAmount: {
    fontSize: 42,
    fontWeight: '700' as const,
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  modesSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#333',
    marginBottom: 16,
  },
  modesGrid: {
    gap: 12,
  },
  modeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  modeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  modeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  modeName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#333',
  },
  modeBalance: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#333',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#333',
  },
  modalContentWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
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
  typeButtonActive: {
    backgroundColor: '#182e5eff',
    borderColor: '#000000ff',
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
    fontWeight: '600' as const,
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
    fontWeight: '600' as const,
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
    fontWeight: '600' as const,
    color: '#333',
  },
  modeSelectorTextActive: {
    color: '#fff',
  },
  submitButton: {
    marginTop: 8,
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
    fontWeight: '700' as const,
    color: '#fff',
  },
});
