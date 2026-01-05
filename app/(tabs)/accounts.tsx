import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Colors } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { useTransactions } from '@/providers/TransactionProvider';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from 'expo-router';
import { Edit2, Moon, Plus, Settings, Sun, Trash2, Wallet, X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

const COLORS = ['#667eea', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
const ICONS = ['wallet', 'bank', 'creditcard', 'piggybank'];

export default function AccountsScreen() {
  const { modes, transactions, addMode, updateMode, deleteMode, isAddingMode, sync, isSyncing } = useTransactions();
  const { user, signOut } = useAuth();
  const { themePreference, setThemePreference } = useTheme();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMode, setEditingMode] = useState<any>(null);
  const [name, setName] = useState('');
  const [initialBalance, setInitialBalance] = useState('');
  const [spendLimit, setSpendLimit] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState(ICONS[0]);

  const tintColor = useThemeColor({}, 'tint');
  const surfaceColor = useThemeColor({}, 'surface');
  const textColor = useThemeColor({}, 'text');

  const handleOpenAddModal = () => {
    setName('');
    setInitialBalance('');
    setSpendLimit('');
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
    setSpendLimit(mode.spendLimit ? mode.spendLimit.toString() : '');
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
        spendLimit: parseFloat(spendLimit) || 0,
      });
    } else {
      addMode({
        name,
        initialBalance: parseFloat(initialBalance),
        color: selectedColor,
        icon: selectedIcon,
        spendLimit: parseFloat(spendLimit) || 0,
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

  const handleDeleteMode = () => {
    if (!editingMode) return;

    Alert.alert(
      'Delete Account',
      `Are you sure you want to delete "${editingMode.name}"? This will NOT delete the associated transactions, but they will be orphaned from this account.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteMode(editingMode.id);
            setShowAddModal(false);
            if (Platform.OS !== 'web') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          },
        },
      ]
    );
  };

  const ThemeOption = ({ label, value, icon }: { label: string, value: 'light' | 'dark' | 'system', icon: any }) => {
    const isActive = themePreference === value;
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        style={[
          styles.themeOption,
          isActive && {
            backgroundColor: tintColor,
            borderColor: tintColor,
            elevation: 4,
            shadowColor: tintColor,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
          },
          !isActive && {
            backgroundColor: surfaceColor,
            borderWidth: 1,
            borderColor: useThemeColor({}, 'textSecondary') + '30',
          }
        ]}
        onPress={() => {
          setThemePreference(value);
          if (Platform.OS !== 'web') Haptics.selectionAsync();
        }}
      >
        {React.cloneElement(icon, { color: isActive ? '#fff' : useThemeColor({}, 'textSecondary') })}
        <ThemedText style={[styles.themeOptionText, isActive ? { color: '#fff' } : { color: useThemeColor({}, 'textSecondary') }]}>{label}</ThemedText>
      </TouchableOpacity>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{
        title: 'Manage Accounts',
        headerShown: true,
        statusBarStyle: 'light',
        headerStyle: { backgroundColor: surfaceColor },
        headerTitleStyle: { color: useThemeColor({}, 'text') },
        headerTintColor: tintColor,
        headerShadowVisible: false,
      }} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={{ paddingHorizontal: 20, marginBottom: 8 }}>
          <Card variant="elevated" style={styles.userCard}>
            <View style={styles.userInfo}>
              <View style={styles.userAvatar}>
                <ThemedText style={styles.userAvatarText}>
                  {user?.displayName ? user.displayName.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || 'U'}
                </ThemedText>
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText type="defaultSemiBold" style={styles.userName}>{user?.displayName || 'User'}</ThemedText>
                <ThemedText style={styles.userEmail} numberOfLines={1}>{user?.email}</ThemedText>
              </View>
            </View>
            <View style={styles.userActions}>
              <Button
                variant="secondary"
                size="sm"
                onPress={() => sync(undefined, {
                  onSuccess: (data: any) => {
                    Alert.alert('Sync Success', `Uploaded ${data.uploaded} and downloaded ${data.downloaded} items.`);
                  },
                  onError: (err: any) => {
                    Alert.alert('Sync Error', err.message || 'Failed to sync data');
                  }
                })}
                disabled={isSyncing}
                style={{ flex: 1 }}
              >
                {isSyncing ? 'Syncing...' : 'Sync Data'}
              </Button>

              <Button
                variant="danger"
                size="sm"
                onPress={handleSignOut}
                style={{ flex: 1 }}
              >
                Sign Out
              </Button>
            </View>
          </Card>
        </View>

        {/* <View style={[styles.section, { backgroundColor: surfaceColor }]}>
          <ThemedText style={styles.sectionTitle}>Appearance</ThemedText>
          <View style={styles.themeSelector}>
            <ThemeOption label="System" value="system" icon={<Settings size={16} color={themePreference === 'system' ? tintColor : textColor} />} />
            <ThemeOption label="Light" value="light" icon={<Sun size={16} color={themePreference === 'light' ? tintColor : textColor} />} />
            <ThemeOption label="Dark" value="dark" icon={<Moon size={16} color={themePreference === 'dark' ? tintColor : textColor} />} />
          </View>
        </View> */}

        {modes.length === 0 ? (
          <View style={styles.emptyState}>
            <Wallet size={48} color={useThemeColor({}, 'icon')} style={{ opacity: 0.5 }} />
            <ThemedText style={styles.emptyText}>No accounts yet</ThemedText>
            <ThemedText style={styles.emptySubtext}>Add your first account to start tracking transactions</ThemedText>
          </View>
        ) : (
          <View style={styles.accountsList}>
            {modes.map((mode) => (
              <Card key={mode.id} variant="elevated" style={[styles.accountCard, { borderLeftColor: mode.color, borderLeftWidth: 4 }]}>
                <View style={styles.accountLeft}>
                  <View style={[styles.accountIcon, { backgroundColor: mode.color + '20' }]}>
                    <Wallet size={24} color={mode.color} />
                  </View>
                  <View style={styles.accountInfo}>
                    <ThemedText style={styles.accountName}>{mode.name}</ThemedText>
                    <ThemedText style={[styles.accountBalance, { color: mode.color }]}>₹{mode.currentBalance.toFixed(2)}</ThemedText>
                    <View style={styles.statsRow}>
                      <ThemedText style={styles.accountInitial}>Initial: ₹{mode.initialBalance.toFixed(2)}</ThemedText>
                      {(mode.spendLimit ?? 0) > 0 && (
                        <>
                          <ThemedText style={styles.accountLimit}> • Limit: ₹{mode.spendLimit!.toFixed(2)}</ThemedText>
                          <ThemedText style={[
                            styles.accountLimit,
                            { color: (mode.spendLimit! - transactions.filter(t => t.modeId === mode.id && t.type === 'out' && !t.isExcluded && new Date(t.date).getMonth() === new Date().getMonth() && new Date(t.date).getFullYear() === new Date().getFullYear()).reduce((sum, t) => sum + t.amount, 0)) < 0 ? '#ef4444' : '#10b981' }
                          ]}>
                            • Rem: ₹{(mode.spendLimit! - transactions.filter(t => t.modeId === mode.id && t.type === 'out' && !t.isExcluded && new Date(t.date).getMonth() === new Date().getMonth() && new Date(t.date).getFullYear() === new Date().getFullYear()).reduce((sum, t) => sum + t.amount, 0)).toFixed(2)}
                          </ThemedText>
                        </>
                      )}
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => handleOpenEditModal(mode)}
                >
                  <Edit2 size={20} color={tintColor} />
                </TouchableOpacity>
              </Card>
            ))}
          </View>
        )}

        <View style={{ paddingHorizontal: 20 }}>
          <Card variant="flat" style={[styles.infoSection, { backgroundColor: tintColor + '10', borderLeftColor: tintColor }]}>
            <ThemedText style={[styles.infoTitle, { color: tintColor }]}>💡 Tips</ThemedText>
            <ThemedText style={styles.infoText}>• Add all your payment methods as accounts</ThemedText>
            <ThemedText style={styles.infoText}>• Cash, Bank accounts, Wallets, Credit cards, etc.</ThemedText>
            <ThemedText style={styles.infoText}>• Set initial balance to track your total worth</ThemedText>
            <ThemedText style={styles.infoText}>• Each transaction updates the account balance automatically</ThemedText>
          </Card>
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={handleOpenAddModal}
        activeOpacity={0.8}
      >
        <LinearGradient colors={Colors.light.gradients.primary} style={styles.fabGradient}>
          <Plus size={28} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContentWrapper}>

          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: surfaceColor }]}>
              <View style={styles.modalHeader}>
                <ThemedText type="title">
                  {editingMode ? 'Edit Account' : 'Add Account'}
                </ThemedText>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <X size={24} color={textColor} />
                </TouchableOpacity>
              </View>

              <Input
                label="Account Name"
                value={name}
                onChangeText={setName}
                placeholder="e.g., Cash, Bank, Wallet"
                style={{ marginBottom: 16 }}
              />

              <Input
                label="Initial Balance"
                value={initialBalance}
                onChangeText={setInitialBalance}
                placeholder="0.00"
                keyboardType="decimal-pad"
                style={{ marginBottom: 16 }}
              />

              <Input
                label="Spending Limit (Optional)"
                value={spendLimit}
                onChangeText={setSpendLimit}
                placeholder="0.00"
                keyboardType="decimal-pad"
                style={{ marginBottom: 16 }}
              />

              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>Color</ThemedText>
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

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                {editingMode && (
                  <Button
                    variant="danger"
                    onPress={handleDeleteMode}
                    style={{ width: 50, paddingHorizontal: 0 }}
                  >
                    <Trash2 size={20} color="#fff" />
                  </Button>
                )}

                <Button
                  variant="primary"
                  onPress={handleSave}
                  disabled={!name || !initialBalance || isAddingMode}
                  loading={isAddingMode}
                  style={{ flex: 1 }}
                >
                  {editingMode ? 'Save Changes' : 'Add Account'}
                </Button>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  userCard: {
    padding: 20,
    borderRadius: 24,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#364fbdff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  userAvatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  userName: {
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    opacity: 0.7,
  },
  userActions: {
    flexDirection: 'row',
    gap: 12,
  },
  section: {
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 24,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  themeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  themeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    gap: 8,
  },
  themeOptionText: {
    fontSize: 14,
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
    padding: 16,
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
    fontWeight: '700',
    marginBottom: 4,
  },
  accountBalance: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  accountInitial: {
    fontSize: 12,
    opacity: 0.6,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountLimit: {
    fontSize: 12,
    marginLeft: 4,
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
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.6,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  infoSection: {
    padding: 24,
    borderRadius: 24,
    borderLeftWidth: 4,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    opacity: 0.8,
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
  modalContentWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
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
});
