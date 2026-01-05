import EntriesComponent from '@/components/EntriesComponent';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import TransactionModal from '@/components/TransactionModal';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useTransactions } from '@/providers/TransactionProvider';
import { Transaction } from '@/types/transaction';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Wallet } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

export default function HistoryScreen() {
  const { modes, deleteTransaction } = useTransactions();
  const params = useLocalSearchParams();
  const backgroundColor = useThemeColor({}, 'background');
  const surfaceColor = useThemeColor({}, 'surface');
  const tintColor = useThemeColor({}, 'tint');

  const [selectedModeId, setSelectedModeId] = useState<string | null>(null);

  // Logic to show/hide chart based on params
  // Params come as strings.
  const showChart = params.showChart === 'true';

  useEffect(() => {
    if (params.modeId) {
      setSelectedModeId(params.modeId as string);
    }
  }, [params.modeId]);

  // Reset selected account when showChart becomes false (e.g. tapping "Transactions" tab)
  useEffect(() => {
    if (!showChart) {
      setSelectedModeId(null);
    }
  }, [showChart]);

  // Edit Modal State
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    if (Platform.OS !== 'web')
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleDelete = (transactionId: string) => {
    if (Platform.OS !== 'web')
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteTransaction(transactionId),
        },
      ]
    );
  };

  // Parse strings to numbers if present
  const initialStartDate = params.startDate ? parseInt(params.startDate as string) : undefined;
  const initialEndDate = params.endDate ? parseInt(params.endDate as string) : undefined;
  const tabTitle = params.tabTitle as string | undefined;

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Entries',
          headerShown: true,
          statusBarStyle: 'light', // Typically dark background for header in premium apps? Or match theme.
          headerStyle: { backgroundColor: surfaceColor },
          headerTitleStyle: { color: useThemeColor({}, 'text') },
          headerTintColor: tintColor,
          headerShadowVisible: false, // Cleaner
        }}
      />

      {/* Mode Filter */}
      {!showChart && (
        <View style={{ backgroundColor: surfaceColor, paddingBottom: 12, paddingTop: 12 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.modeFilterBar}
            contentContainerStyle={styles.modeFilterBarContent}
          >
            <TouchableOpacity
              activeOpacity={0.7}
              style={[
                styles.modeFilterItem,
                !selectedModeId && {
                  backgroundColor: tintColor,
                  borderColor: tintColor,
                  elevation: 4,
                  shadowColor: tintColor,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                },
                selectedModeId && {
                  backgroundColor: surfaceColor,
                  borderColor: useThemeColor({}, 'textSecondary') + '20',
                  borderWidth: 1,
                }
              ]}
              onPress={() => setSelectedModeId(null)}
            >
              <ThemedText style={{ color: !selectedModeId ? '#fff' : useThemeColor({}, 'textSecondary'), fontWeight: '700', fontSize: 13 }}>
                All
              </ThemedText>
            </TouchableOpacity>

            {modes.map((mode) => (
              <TouchableOpacity
                key={mode.id}
                activeOpacity={0.7}
                style={[
                  styles.modeFilterItem,
                  selectedModeId === mode.id && {
                    backgroundColor: mode.color,
                    borderColor: mode.color,
                    elevation: 4,
                    shadowColor: mode.color,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                  },
                  selectedModeId !== mode.id && {
                    backgroundColor: surfaceColor,
                    borderColor: useThemeColor({}, 'textSecondary') + '20',
                    borderWidth: 1,
                  }
                ]}
                onPress={() =>
                  setSelectedModeId(selectedModeId === mode.id ? null : mode.id)
                }
              >
                <Wallet
                  size={14}
                  color={selectedModeId === mode.id ? '#fff' : mode.color}
                />
                <ThemedText
                  style={[
                    styles.modeFilterText,
                    selectedModeId === mode.id && { color: '#fff' },
                    selectedModeId !== mode.id && { color: useThemeColor({}, 'textSecondary') }
                  ]}
                >
                  {mode.name}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Content - Entries Component */}
      <View style={styles.content}>
        <EntriesComponent
          modeId={selectedModeId}
          onEdit={handleEdit}
          onDelete={handleDelete}
          showChart={showChart}
          initialFilterType={params.filterType as any}
          initialStartDate={initialStartDate}
          initialEndDate={initialEndDate}
        />
      </View>

      {/* Transaction Modal for Editing */}
      <TransactionModal
        visible={!!editingTransaction}
        onClose={() => setEditingTransaction(null)}
        initialData={editingTransaction}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  modeFilterBar: { maxHeight: 50, zIndex: 10 },
  modeFilterBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 5,
  },
  modeFilterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    marginRight: 10,
  },
  modeFilterText: { fontSize: 13, fontWeight: '600', marginLeft: 6 },
  content: { flex: 1 },
});
