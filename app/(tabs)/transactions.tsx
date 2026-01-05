import EntriesComponent from '@/components/EntriesComponent';
import TransactionModal from '@/components/TransactionModal';
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
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function HistoryScreen() {
  const { modes, deleteTransaction } = useTransactions();
  const params = useLocalSearchParams();

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
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: tabTitle || 'Transaction History',
          headerShown: true,
          statusBarStyle: 'light',
          headerStyle: { backgroundColor: '#ffffffff' },
          headerTitleStyle: { color: '#000000ff' },
          headerTintColor: '#000000ff',
        }}
      />

      {/* Mode Filter - Keep visible as per requirement, unless blocked by design? 
          "history tab should looks as it is, just keep accounts filter and then display entries component below"
      */}
      {!showChart && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.modeFilterBar}
          contentContainerStyle={styles.modeFilterBarContent}
        >
          <TouchableOpacity
            style={[
              styles.modeFilterItem,
              !selectedModeId && {
                backgroundColor: '#667eea20',
                borderColor: '#667eea',
              },
            ]}
            onPress={() => setSelectedModeId(null)}
          >
            <Text style={{ color: '#667eea', fontWeight: '600' }}>
              All Accounts
            </Text>
          </TouchableOpacity>

          {modes.map((mode) => (
            <TouchableOpacity
              key={mode.id}
              style={[
                styles.modeFilterItem,
                selectedModeId === mode.id && {
                  backgroundColor: mode.color,
                  borderColor: mode.color,
                },
              ]}
              onPress={() =>
                setSelectedModeId(selectedModeId === mode.id ? null : mode.id)
              }
            >
              <Wallet
                size={14}
                color={selectedModeId === mode.id ? '#fff' : mode.color}
              />
              <Text
                style={[
                  styles.modeFilterText,
                  selectedModeId === mode.id && { color: '#fff' },
                ]}
              >
                {mode.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Content - Entries Component */}
      {/* 
         If showChart is true (from Home), we enable it in EntriesComponent.
         EntriesComponent handles the list and date filters. 
      */}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  modeFilterBar: { backgroundColor: '#fff', maxHeight: 50, zIndex: 10 },
  modeFilterBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  modeFilterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1.5,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: '#fff',
  },
  modeFilterText: { fontSize: 13, fontWeight: '600', marginLeft: 5 },
  content: { flex: 1, backgroundColor: '#f5f5f5' },
});
