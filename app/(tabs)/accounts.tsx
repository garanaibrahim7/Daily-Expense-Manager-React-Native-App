import { useAuth } from '@/providers/AuthProvider';
import { useTransactions } from '@/providers/TransactionProvider';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from 'expo-router';
import { Edit2, LogOut, Plus, Wallet, X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Alert,
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

const COLORS = ['#667eea', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
const ICONS = ['wallet', 'bank', 'creditcard', 'piggybank'];

export default function AccountsScreen() {
  const { modes, addMode, updateMode, isAddingMode } = useTransactions();
  const { user, signOut } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMode, setEditingMode] = useState<any>(null);
  const [name, setName] = useState('');
  const [initialBalance, setInitialBalance] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState(ICONS[0]);

  const handleOpenAddModal = () => {
    setName('');
    setInitialBalance('');
    setSelectedColor(COLORS[0]);
    setSelectedIcon(ICONS[0]);
    setEditingMode(null);
    setShowAddModal(true);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleOpenEditModal = (mode: any) => {
    setName(mode.name);
    setInitialBalance(mode.initialBalance.toString());
    setSelectedColor(mode.color);
    setSelectedIcon(mode.icon);
    setEditingMode(mode);
    setShowAddModal(true);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleSave = () => {
    if (!name || !initialBalance) return;

    if (editingMode) {
      updateMode({
        ...editingMode,
        name,
        initialBalance: parseFloat(initialBalance),
        color: selectedColor,
        icon: selectedIcon,
      });
    } else {
      addMode({
        name,
        initialBalance: parseFloat(initialBalance),
        color: selectedColor,
        icon: selectedIcon,
      });
    }

    setShowAddModal(false);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              console.error('Sign out error:', error);
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{
        title: 'Manage Accounts',
        headerShown: true,
        statusBarStyle: 'light',
        headerStyle: { backgroundColor: '#131b31ff' },
        headerTitleStyle: { color: '#fff' },
        headerTintColor: '#fff',
      }} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.userSection}>
          <View style={styles.userInfo}>
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>
                {user?.displayName ? user.displayName.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
            <View>
              <Text style={styles.userName}>{user?.displayName || 'User'}</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <LogOut size={20} color="#ef4444" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
        {modes.length === 0 ? (
          <View style={styles.emptyState}>
            <Wallet size={48} color="#ccc" />
            <Text style={styles.emptyText}>No accounts yet</Text>
            <Text style={styles.emptySubtext}>Add your first account to start tracking transactions</Text>
          </View>
        ) : (
          <View style={styles.accountsList}>
            {modes.map((mode) => (
              <View key={mode.id} style={[styles.accountCard, { borderLeftColor: mode.color }]}>
                <View style={styles.accountLeft}>
                  <View style={[styles.accountIcon, { backgroundColor: mode.color + '20' }]}>
                    <Wallet size={24} color={mode.color} />
                  </View>
                  <View style={styles.accountInfo}>
                    <Text style={styles.accountName}>{mode.name}</Text>
                    <Text style={styles.accountBalance}>₹{mode.currentBalance.toFixed(2)}</Text>
                    <Text style={styles.accountInitial}>Initial: ₹{mode.initialBalance.toFixed(2)}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => handleOpenEditModal(mode)}
                >
                  <Edit2 size={20} color="#667eea" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>💡 Tips</Text>
          <Text style={styles.infoText}>• Add all your payment methods as accounts</Text>
          <Text style={styles.infoText}>• Cash, Bank accounts, Wallets, Credit cards, etc.</Text>
          <Text style={styles.infoText}>• Set initial balance to track your total worth</Text>
          <Text style={styles.infoText}>• Each transaction updates the account balance automatically</Text>
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={handleOpenAddModal}
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
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
              style={styles.modalContentWrapper}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingMode ? 'Edit Account' : 'Add Account'}
                </Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <X size={24} color="#333" />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Account Name</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g., Cash, Bank, Wallet"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Initial Balance</Text>
                <TextInput
                  style={styles.input}
                  value={initialBalance}
                  onChangeText={setInitialBalance}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Color</Text>
                <View style={styles.colorPicker}>
                  {COLORS.map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorOption,
                        { backgroundColor: color },
                        selectedColor === color && styles.colorOptionSelected,
                      ]}
                      onPress={() => {
                        setSelectedColor(color);
                        if (Platform.OS !== 'web') {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }
                      }}
                    >
                      {selectedColor === color && (
                        <View style={styles.colorCheckmark} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={[styles.submitButton, (!name || !initialBalance || isAddingMode) && styles.submitButtonDisabled]}
                onPress={handleSave}
                disabled={!name || !initialBalance || isAddingMode}
              >
                <LinearGradient
                  colors={(!name || !initialBalance || isAddingMode) ? ['#ccc', '#999'] : selectedColor ? [selectedColor, selectedColor] : ['#667eea', '#764ba2']}
                  style={styles.submitButtonGradient}
                >
                  <Text style={styles.submitButtonText}>
                    {isAddingMode ? 'Saving...' : editingMode ? 'Save Changes' : 'Add Account'}
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
  userSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  userInfo: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 16,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#364fbdff',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 16,
  },
  userAvatarText: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#fff',
  },
  userName: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#333',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
  },
  signOutButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#ef4444',
  },
  content: {
    flex: 1,
  },
  accountsList: {
    padding: 20,
    gap: 12,
  },
  accountCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  accountLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  accountIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#333',
    marginBottom: 4,
  },
  accountBalance: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#667eea',
    marginBottom: 2,
  },
  accountInitial: {
    fontSize: 12,
    color: '#999',
  },
  editButton: {
    padding: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
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
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  infoSection: {
    margin: 20,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#667eea',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#333',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
    marginBottom: 4,
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
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  colorCheckmark: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
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
