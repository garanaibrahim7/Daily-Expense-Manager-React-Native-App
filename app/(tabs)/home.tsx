import TransactionModal from '@/components/TransactionModal';
import { useTransactions } from '@/providers/TransactionProvider';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { History, Plus, Wallet } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DashboardScreen() {
  const { modes } = useTransactions();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedModeId, setSelectedModeId] = useState('');

  const totalBalance = modes.reduce((sum, mode) => sum + mode.currentBalance, 0);

  const handleOpenModal = (modeId?: string) => {
    setSelectedModeId(modeId || '');
    setShowAddModal(true);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  useEffect(() => {
    // console.log(modes);
  }, []);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={['#000000ff', '#001525ff']}
        style={[styles.header, { paddingTop: insets.top + 20 }]}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerLabel}>Total Balance</Text>
          <Text style={styles.headerAmount}>₹ {totalBalance.toFixed(2)}</Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.modesSection}>
          <Text style={styles.sectionTitle}>Your Accounts</Text>
          <View style={styles.modesGrid}>
            {modes.map((mode) => (
              <TouchableOpacity
                key={mode.id}
                activeOpacity={0.9}
                onPress={() => handleOpenModal(mode.id)}
              >
                <View style={[styles.modeCard, { borderLeftColor: mode.color }]}>
                  <View style={styles.modeHeader}>
                    <View
                      style={[
                        styles.modeIcon,
                        { backgroundColor: mode.color + '20' },
                      ]}
                    >
                      <Wallet size={20} color={mode.color} />
                    </View>
                    <Text style={styles.modeName}>{mode.name}</Text>
                  </View>
                  <View style={styles.modeFooter}>
                    <Text style={styles.modeBalance}>
                      ₹{mode.currentBalance.toFixed(2)}
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.historyButton,
                        { backgroundColor: mode.color + '15' },
                      ]}
                      onPress={() =>
                        router.push({
                          pathname: '/(tabs)/transactions',
                          params: { modeId: mode.id, 
                                    filterType: 'month', 
                                    showChart: 'true',
                                    tabTitle: `Transactions of ${mode.name}` },
                        })
                      }
                    >
                      <History size={14} color={mode.color} />
                      <Text
                        style={[styles.historyButtonText, { color: mode.color }]}
                      >
                        Entries
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {modes.length === 0 && (
            <View style={styles.emptyState}>
              <Wallet size={48} color="#ccc" />
              <Text style={styles.emptyText}>No accounts yet</Text>
              <Text style={styles.emptySubtext}>
                Add your first account to get started
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => handleOpenModal()}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#000000ff', '#4d4d4dff']}
          style={styles.fabGradient}
        >
          <Plus size={28} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      <TransactionModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        defaultModeId={selectedModeId}
      />
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
    fontWeight: '700',
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
    fontWeight: '700',
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
    fontWeight: '600',
    color: '#333',
  },
  modeBalance: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  modeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 8,
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  historyButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
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
});
