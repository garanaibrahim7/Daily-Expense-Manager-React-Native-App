import { Colors } from '@/constants/theme';
import { useFilteredTransactions, useTransactions } from '@/providers/TransactionProvider';
import {
  endOfMonth,
  endOfYear,
  format,
  startOfMonth,
  startOfYear,
} from 'date-fns';
import * as Haptics from 'expo-haptics';
import { Stack } from 'expo-router';
import {
  Calendar,
  Edit2,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
  X
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function HistoryScreen() {
  const { modes, updateTransaction, deleteTransaction } = useTransactions();

  const [filterType, setFilterType] = useState<'month' | 'year' | 'custom'>('month');
  const [selectedModeId, setSelectedModeId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<'all' | 'in' | 'out'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSelectingStart, setIsSelectingStart] = useState(true);


  const [customStartDate, setCustomStartDate] = useState<number | null>(null);
  const [customEndDate, setCustomEndDate] = useState<number | null>(null);

  const getDateRange = () => {
    const now = new Date();
    if (filterType === 'month') return [startOfMonth(now).getTime(), endOfMonth(now).getTime()];
    if (filterType === 'year') return [startOfYear(now).getTime(), endOfYear(now).getTime()];
    if (filterType === 'custom' && customStartDate && customEndDate)
      return [customStartDate, customEndDate];
    return [0, Date.now()];
  };

  const [startDate, endDate] = getDateRange();

  const baseTransactions = useFilteredTransactions(startDate, endDate);

  const transactions = useMemo(() => {
    return baseTransactions.filter(t => {
      if (selectedModeId && t.modeId !== selectedModeId) return false;
      if (selectedType !== 'all' && t.type !== selectedType) return false;
      const query = searchQuery.toLowerCase();
      if (query) {
        const noteMatch = t.note?.toLowerCase().includes(query);
        const amountMatch = t.amount.toString().includes(query);
        if (!noteMatch && !amountMatch) return false;
      }
      return true;
    });
  }, [baseTransactions, selectedModeId, selectedType, searchQuery]);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editType, setEditType] = useState<'in' | 'out'>('in');
  const [editModeId, setEditModeId] = useState('');
  const [editNote, setEditNote] = useState('');

  const handleEdit = (transaction: any) => {
    setEditingTransaction(transaction);
    setEditAmount(transaction.amount.toString());
    setEditType(transaction.type);
    setEditModeId(transaction.modeId);
    setEditNote(transaction.note || '');
    setEditModalVisible(true);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSaveEdit = () => {
    if (!editingTransaction || !editAmount || !editModeId) return;

    updateTransaction({
      id: editingTransaction.id,
      modeId: editModeId,
      amount: parseFloat(editAmount),
      type: editType,
      note: editNote || undefined,
      date: editingTransaction.date,
    });

    setEditModalVisible(false);
    setEditingTransaction(null);
    if (Platform.OS !== 'web')
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleDelete = (transactionId: string) => {
    if (Platform.OS !== 'web')
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    deleteTransaction(transactionId);
  };

  const getModeById = (modeId: string) => modes.find(m => m.id === modeId);

  const groupedTransactions = transactions.reduce((acc, transaction) => {
    const dateKey = format(new Date(transaction.date), 'yyyy-MM-dd');
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(transaction);
    return acc;
  }, {} as Record<string, typeof transactions>);

  const sortedDates = Object.keys(groupedTransactions).sort((a, b) => b.localeCompare(a));

  return (
    <View style={styles.container}>
      <Stack.Screen options={{
        title: 'Transaction History',
        headerShown: true,
        statusBarStyle: 'light', 
        headerStyle: { backgroundColor: '#131b31ff' }, 
        headerTitleStyle: { color: '#fff' }, 
        headerTintColor: '#fff',
      }} />

      {/* Filter Bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={styles.filterBarContent}
      >
        <TouchableOpacity
          style={[styles.filterButton, filterType === 'month' && styles.filterButtonActive]}
          onPress={() => setFilterType('month')}
        >
          <Text style={[styles.filterButtonText, filterType === 'month' && styles.filterButtonTextActive]}>
            This Month
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, filterType === 'year' && styles.filterButtonActive]}
          onPress={() => setFilterType('year')}
        >
          <Text style={[styles.filterButtonText, filterType === 'year' && styles.filterButtonTextActive]}>
            This Year
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, filterType === 'custom' && styles.filterButtonActive]}
          onPress={() => {
            setFilterType('custom');
            setIsSelectingStart(true);
            setShowDatePicker(true);
          }}
        >
          <Calendar size={14} color={filterType === 'custom' ? '#fff' : '#667eea'} />
          <Text style={[styles.filterButtonText, filterType === 'custom' && styles.filterButtonTextActive]}>
            {customStartDate && customEndDate
              ? `${format(customStartDate, 'dd MMM')} - ${format(customEndDate, 'dd MMM')}`
              : 'Custom'}
          </Text>
        </TouchableOpacity>


        <TouchableOpacity
          style={[styles.filterButton, selectedType === 'in' && styles.filterButtonActive]}
          onPress={() => setSelectedType(selectedType === 'in' ? 'all' : 'in')}
        >
          <TrendingUp size={14} color={selectedType === 'in' ? '#fff' : '#10b981'} />
          <Text style={[styles.filterButtonText, selectedType === 'in' && styles.filterButtonTextActive]}>
            Income
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, selectedType === 'out' && styles.filterButtonActive]}
          onPress={() => setSelectedType(selectedType === 'out' ? 'all' : 'out')}
        >
          <TrendingDown size={14} color={selectedType === 'out' ? '#fff' : '#ef4444'} />
          <Text style={[styles.filterButtonText, selectedType === 'out' && styles.filterButtonTextActive]}>
            Expense
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Mode Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.modeFilterBar}
        contentContainerStyle={styles.modeFilterBarContent}
      >
        <TouchableOpacity
          style={[
            styles.modeFilterItem,
            !selectedModeId && { backgroundColor: '#667eea20', borderColor: '#667eea' },
          ]}
          onPress={() => setSelectedModeId(null)}
        >
          <Text style={{ color: '#667eea', fontWeight: '600' }}>All Accounts</Text>
        </TouchableOpacity>

        {modes.map(mode => (
          <TouchableOpacity
            key={mode.id}
            style={[
              styles.modeFilterItem,
              selectedModeId === mode.id && {
                backgroundColor: mode.color,
                borderColor: mode.color,
              },
            ]}
            onPress={() => setSelectedModeId(selectedModeId === mode.id ? null : mode.id)}
          >
            <Wallet size={14} color={selectedModeId === mode.id ? '#fff' : mode.color} />
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

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search size={18} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by note or amount..."
          placeholderTextColor="#aaa"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Transactions */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.transactionScrollContainer}
      >
        {sortedDates.length === 0 ? (
          <View style={styles.emptyState}>
            <Calendar size={48} color="#ccc" />
            <Text style={styles.emptyText}>No transactions found</Text>
            <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
          </View>
        ) : (
          sortedDates.map(date => (
            <View key={date} style={styles.dateSection}>
              <Text style={styles.dateHeader}>{format(new Date(date), 'MMM dd, yyyy')}</Text>
              {groupedTransactions[date].map(transaction => {
                const mode = getModeById(transaction.modeId);
                return (
                  <View key={transaction.id} style={styles.transactionCard}>
                    <View style={styles.transactionLeft}>
                      <View
                        style={[
                          styles.transactionIcon,
                          { backgroundColor: mode?.color + '20' || '#ccc' },
                        ]}
                      >
                        {transaction.type === 'in' ? (
                          <TrendingUp size={20} color="#10b981" />
                        ) : (
                          <TrendingDown size={20} color="#ef4444" />
                        )}
                      </View>
                      <View style={styles.transactionInfo}>
                        <View style={styles.transactionTopRow}>
                          <Text style={styles.transactionType}>
                            {transaction.type === 'in' ? 'Income' : 'Expense'}
                          </Text>
                          <View style={styles.modeTag}>
                            <Wallet size={12} color={mode?.color || '#999'} />
                            <Text style={[styles.modeTagText, { color: mode?.color || '#999' }]}>
                              {mode?.name || 'Unknown'}
                            </Text>
                          </View>
                        </View>
                        {transaction.note && <Text style={styles.transactionNote}>{transaction.note}</Text>}
                        <Text style={styles.transactionTime}>
                          {format(new Date(transaction.date), 'h:mm a')}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.transactionRight}>
                      <Text
                        style={[
                          styles.transactionAmount,
                          transaction.type === 'in' ? styles.incomeAmount : styles.expenseAmount,
                        ]}
                      >
                        {transaction.type === 'in' ? '+' : '-'}₹{transaction.amount.toFixed(2)}
                      </Text>
                      <View style={styles.transactionActions}>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleEdit(transaction)}
                        >
                          <Edit2 size={16} color="#667eea" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleDelete(transaction.id)}
                        >
                          <Trash2 size={16} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>

      {showDatePicker && (
        <DateTimePicker
          value={new Date(isSelectingStart ? customStartDate || Date.now() : customEndDate || Date.now())}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            if (selectedDate) {
              if (isSelectingStart) {
                setCustomStartDate(selectedDate.getTime());
                setIsSelectingStart(false);
              } else {
                setCustomEndDate(selectedDate.getTime());
                setShowDatePicker(false);
              }
            } else {
              setShowDatePicker(false);
            }
          }}
        />
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  filterBar: { backgroundColor: '#fff', maxHeight: 50 },
  filterBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#192142',
    backgroundColor: '#fff',
    marginRight: 8,
  },
  filterButtonActive: { backgroundColor: '#192142', borderColor: '#192142' },
  filterButtonText: { fontSize: 13, fontWeight: '600', color: '#192142' },
  filterButtonTextActive: { color: '#fff' },
  modeFilterBar: { backgroundColor: '#fff', maxHeight: 50 },
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#eee',
  },
  searchInput: { flex: 1, fontSize: 14, paddingLeft: 6, color: '#333', height: 34 },
  content: { flex: 1, backgroundColor: '#f5f5f5' },
  transactionScrollContainer: { flexGrow: 1, paddingBottom: 50 },
  dateSection: { marginBottom: 24 },
  dateHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  transactionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  transactionLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionInfo: { flex: 1 },
  transactionTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  transactionType: { fontSize: 16, fontWeight: '600', color: '#333' },
  modeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
  },
  modeTagText: { fontSize: 12, fontWeight: '600' },
  transactionNote: { fontSize: 14, color: '#666', marginBottom: 4 },
  transactionTime: { fontSize: 12, color: '#999' },
  transactionRight: { alignItems: 'flex-end' },
  transactionAmount: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  incomeAmount: { color: '#10b981' },
  expenseAmount: { color: '#ef4444' },
  transactionActions: { flexDirection: 'row', gap: 8 },
  actionButton: { padding: 6 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#666', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#999', marginTop: 8 },
});
