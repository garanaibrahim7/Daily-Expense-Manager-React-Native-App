import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import TransactionModal from '@/components/TransactionModal';
import { Card } from '@/components/ui/Card';
import { Colors } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { useTransactions } from '@/providers/TransactionProvider';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ArrowLeftRight, ArrowRight, BarChart3, Minus, Moon, Plus, Sun, Wallet } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const { modes, transactions } = useTransactions();
  const { user } = useAuth();
  const { theme, setThemePreference } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showAddModal, setShowAddModal] = useState(false);
  const [initialTab, setInitialTab] = useState<'expense' | 'income' | 'transfer'>('expense');

  const tintColor = useThemeColor({}, 'tint');
  const surfaceColor = useThemeColor({}, 'surface');
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');

  // Calculate Total Balance
  const totalBalance = modes.reduce((sum, mode) => sum + mode.currentBalance, 0);

  // Get Recent Transactions (last 5)
  const recentTransactions = transactions
    .sort((a, b) => b.date - a.date)
    .slice(0, 5);

  const handleOpenModal = (tab: 'expense' | 'income' | 'transfer' = 'expense') => {
    setInitialTab(tab);
    setShowAddModal(true);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Header Section */}
        <LinearGradient
          colors={Colors.light.gradients.primary}
          style={[styles.header, { paddingTop: insets.top + 20 }]}
        >
          <View style={styles.headerTop}>
            <View>
              <ThemedText style={styles.greeting}>{greeting()},</ThemedText>
              <ThemedText style={styles.username}>{user?.displayName?.split(' ')[0] || 'User'}</ThemedText>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                style={styles.profileButton}
                onPress={() => setThemePreference(theme === 'dark' ? 'light' : 'dark')}
              >
                {theme === 'dark' ? (
                  <Sun size={20} color="#fff" />
                ) : (
                  <Moon size={20} color="#fff" />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.profileButton}
                onPress={() => router.push('/(tabs)/accounts')}
              >
                <ThemedText style={styles.profileInitials}>{user?.email?.charAt(0).toUpperCase() || 'U'}</ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.balanceContainer}>
            <ThemedText style={styles.balanceLabel}>Total Balance</ThemedText>
            <ThemedText style={styles.balanceAmount}>₹ {totalBalance.toFixed(2)}</ThemedText>
          </View>
        </LinearGradient>

        <View style={styles.bodyContainer}>

          {/* Accounts Horizontal List */}
          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>Accounts</ThemedText>
            <TouchableOpacity onPress={() => router.push('/(tabs)/accounts')}>
              <ThemedText style={{ color: tintColor, fontSize: 14 }}>See all</ThemedText>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.accountsScroll}>
            {modes.map((mode) => (
              <TouchableOpacity
                key={mode.id}
                onPress={() => handleOpenModal('expense')}
                activeOpacity={0.8}
              >
                <Card variant="elevated" style={[styles.accountCard, { borderTopColor: mode.color, borderTopWidth: 4 }]}>
                  <View style={styles.accountCardHeader}>
                    <View style={[styles.miniIcon, { backgroundColor: mode.color + '20' }]}>
                      <Wallet size={16} color={mode.color} />
                    </View>
                    <ThemedText style={styles.accountCardName} numberOfLines={1}>{mode.name}</ThemedText>
                  </View>
                  <ThemedText style={[styles.accountCardBalance, { color: mode.color }]}>₹{mode.currentBalance.toFixed(0)}</ThemedText>
                </Card>
              </TouchableOpacity>
            ))}
            {modes.length === 0 && (
              <View style={[styles.emptyAccountCard, { backgroundColor: surfaceColor }]}>
                <ThemedText style={{ color: textSecondary }}>No Accounts</ThemedText>
              </View>
            )}
          </ScrollView>

          <View style={styles.actionGrid}>
            <TouchableOpacity style={[styles.actionCard, { backgroundColor: surfaceColor }]} onPress={() => handleOpenModal('income')}>
              <View style={[styles.actionIcon, { backgroundColor: '#10b98120' }]}>
                <Plus size={24} color="#10b981" />
              </View>
              <ThemedText style={styles.actionLabel}>Income</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionCard, { backgroundColor: surfaceColor }]} onPress={() => handleOpenModal('expense')}>
              <View style={[styles.actionIcon, { backgroundColor: '#ef444420' }]}>
                <Minus size={24} color="#ef4444" />
              </View>
              <ThemedText style={styles.actionLabel}>Expense</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionCard, { backgroundColor: surfaceColor }]} onPress={() => handleOpenModal('transfer')}>
              <View style={[styles.actionIcon, { backgroundColor: '#3b82f620' }]}>
                <ArrowLeftRight size={24} color="#3b82f6" />
              </View>
              <ThemedText style={styles.actionLabel}>Self Transfer</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionCard, { backgroundColor: surfaceColor }]} onPress={() => router.push('/(tabs)/analysis')}>
              <View style={[styles.actionIcon, { backgroundColor: '#8b5cf620' }]}>
                <BarChart3 size={24} color="#8b5cf6" />
              </View>
              <ThemedText style={styles.actionLabel}>Analysis</ThemedText>
            </TouchableOpacity>
          </View>
          {/* Recent Transactions List */}
          <View style={[styles.sectionHeader, { marginTop: 24 }]}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>Recent Activity</ThemedText>
            <TouchableOpacity onPress={() => router.push('/(tabs)/transactions')}>
              <ArrowRight size={20} color={tintColor} />
            </TouchableOpacity>
          </View>

          <View style={styles.recentList}>
            {recentTransactions.map((t) => {
              const mode = modes.find(m => m.id === t.modeId);
              return (
                <Card key={t.id} variant="flat" style={styles.transactionCard}>
                  <View style={[styles.transactionIcon, { backgroundColor: (t.type === 'in' ? '#10b981' : '#ef4444') + '15' }]}>
                    {t.type === 'in' ? <Plus size={18} color="#10b981" /> : <Minus size={18} color="#ef4444" />}
                  </View>
                  <View style={styles.transactionInfo}>
                    <ThemedText style={styles.transactionNote}>{t.note || t.category || 'Untitled'}</ThemedText>
                    <ThemedText style={styles.transactionDate}>{format(new Date(t.date), 'MMM dd, HH:mm')} • {mode?.name}</ThemedText>
                  </View>
                  <ThemedText style={[styles.transactionAmount, { color: t.type === 'in' ? '#10b981' : '#ef4444' }]}>
                    {t.type === 'in' ? '+' : '-'}₹{t.amount.toFixed(0)}
                  </ThemedText>
                </Card>
              );
            })}
            {recentTransactions.length === 0 && (
              <View style={styles.emptyState}>
                <ThemedText style={{ color: textSecondary, textAlign: 'center' }}>No recent transactions</ThemedText>
              </View>
            )}
          </View>

        </View>
      </ScrollView>

      <TransactionModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        initialTab={initialTab}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  header: {
    paddingBottom: 40,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 42,
    borderBottomRightRadius: 42,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  username: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitials: {
    color: '#fff',
    fontWeight: '700',
  },
  balanceContainer: {
    alignItems: 'flex-start',
    padding: 1
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  balanceAmount: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
    lineHeight: 52, // Fix Android clipping
  },
  bodyContainer: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 24,
  },
  actionGrid: {
    marginTop: 30,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: (width - 52) / 2, // 2 columns
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  accountsScroll: {
    paddingRight: 20,
    gap: 12,
  },
  accountCard: {
    width: 160,
    padding: 16,
    borderRadius: 18,
    marginRight: 0,
    marginBottom: 3,
  },
  accountCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  miniIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountCardName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  accountCardBalance: {
    fontSize: 18,
    fontWeight: '800',
  },
  emptyAccountCard: {
    width: 160,
    height: 100,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  recentList: {
    gap: 0,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 10,
    borderRadius: 24,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionNote: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    opacity: 0.5,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
});
