import { useFilteredTransactions } from '@/providers/TransactionProvider';
import { Transaction } from '@/types/transaction';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
    endOfMonth,
    endOfYear,
    format,
    startOfMonth,
    startOfYear,
} from 'date-fns';
import {
    Calendar,
    Edit2,
    Search,
    Trash2,
    TrendingDown,
    TrendingUp,
    X,
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
    ScrollView,
    SectionList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import ChartComponent from './ChartComponent';

interface EntriesComponentProps {
    modeId?: string | null;
    onEdit: (transaction: Transaction) => void;
    onDelete: (transactionId: string) => void;
    transactions?: Transaction[]; // Optional: Pass explicit transactions or use provider
    showChart?: boolean;
    initialFilterType?: 'month' | 'year' | 'custom';
    initialStartDate?: number;
    initialEndDate?: number;
}

export default function EntriesComponent({
    modeId,
    onEdit,
    onDelete,
    transactions: explicitTransactions,
    showChart = false,
    initialFilterType,
    initialStartDate,
    initialEndDate
}: EntriesComponentProps) {
    const [filterType, setFilterType] = useState<'month' | 'year' | 'custom'>('month');
    const [selectedType, setSelectedType] = useState<'all' | 'in' | 'out'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const [showDatePicker, setShowDatePicker] = useState(false);
    const [isSelectingStart, setIsSelectingStart] = useState(true);
    const [customStartDate, setCustomStartDate] = useState<number | null>(null);
    const [customEndDate, setCustomEndDate] = useState<number | null>(null);

    // Apply initial filter type if provided (e.g. from Analysis screen)
    React.useEffect(() => {
        if (initialFilterType) {
            setFilterType(initialFilterType);
        }
        if (initialStartDate && initialEndDate) {
            setCustomStartDate(initialStartDate);
            setCustomEndDate(initialEndDate);
        }
    }, [initialFilterType, initialStartDate, initialEndDate]);

    // Reset filters when showChart becomes false (simulating 'reset' on tab press/new navigation)
    React.useEffect(() => {
        if (!showChart) {
            setFilterType('month');
            setSelectedType('all');
            setSearchQuery('');
            setCustomStartDate(null);
            setCustomEndDate(null);
        }
    }, [showChart]);

    const getDateRange = () => {
        const now = new Date();
        if (filterType === 'month') return [startOfMonth(now).getTime(), endOfMonth(now).getTime()];
        if (filterType === 'year') return [startOfYear(now).getTime(), endOfYear(now).getTime()];
        if (filterType === 'custom' && customStartDate && customEndDate) {
            const end = new Date(customEndDate);
            end.setHours(23, 59, 59, 999);
            return [customStartDate, end.getTime()];
        }
        return [0, Date.now()];
    };

    const [startDate, endDate] = getDateRange();

    // ... (rest of filtering logic handles itself via dependencies) ... 
    // We just need to ensure explicitTransactions or providerTransactions are correct.
    const providerTransactions = useFilteredTransactions(startDate, endDate);
    const rawTransactions = explicitTransactions || providerTransactions;

    const filteredTransactions = useMemo(() => {
        let base = rawTransactions;
        if (explicitTransactions) {
            base = base.filter(t => {
                const tDate = new Date(t.date).getTime();
                return tDate >= startDate && tDate <= endDate;
            });
        }

        return base.filter((t) => {
            if (modeId && t.modeId !== modeId) return false;
            if (selectedType !== 'all' && t.type !== selectedType) return false;
            const query = searchQuery.toLowerCase();
            if (query) {
                const noteMatch = t.note?.toLowerCase().includes(query);
                const amountMatch = t.amount.toString().includes(query);
                if (!noteMatch && !amountMatch) return false;
            }
            return true;
        });
    }, [rawTransactions, modeId, selectedType, searchQuery, startDate, endDate, explicitTransactions]);

    const sections = useMemo(() => {
        const grouped = filteredTransactions.reduce((acc, transaction) => {
            const dateKey = format(new Date(transaction.date), 'yyyy-MM-dd');
            if (!acc[dateKey]) acc[dateKey] = [];
            acc[dateKey].push(transaction);
            return acc;
        }, {} as Record<string, Transaction[]>);

        return Object.keys(grouped)
            .sort((a, b) => b.localeCompare(a))
            .map((date) => ({
                title: date,
                data: grouped[date],
            }));
    }, [filteredTransactions]);

    const renderTransactionItem = ({ item }: { item: Transaction }) => {
        return (
            <View key={item.id} style={styles.transactionCard}>
                <View style={styles.transactionLeft}>
                    <View style={[styles.transactionIcon, { backgroundColor: item.type === 'in' ? '#d1fae5' : '#fee2e2' }]}>
                        {item.type === 'in' ? (
                            <TrendingUp size={20} color="#10b981" />
                        ) : (
                            <TrendingDown size={20} color="#ef4444" />
                        )}
                    </View>
                    <View style={styles.transactionInfo}>
                        <View style={styles.transactionTopRow}>
                            <Text style={styles.transactionType}>
                                {item.type === 'in' ? 'Income' : 'Expense'}
                            </Text>
                        </View>
                        {item.note && (
                            <Text style={styles.transactionNote}>{item.note}</Text>
                        )}
                        <Text style={styles.transactionTime}>
                            {format(new Date(item.date), 'h:mm a')}
                        </Text>
                    </View>
                </View>
                <View style={styles.transactionRight}>
                    <Text
                        style={[
                            styles.transactionAmount,
                            item.type === 'in' ? styles.incomeAmount : styles.expenseAmount,
                        ]}
                    >
                        {item.type === 'in' ? '+' : '-'}₹{item.amount.toFixed(2)}
                    </Text>
                    <View style={styles.transactionActions}>
                        <TouchableOpacity style={styles.actionButton} onPress={() => onEdit(item)}>
                            <Edit2 size={16} color="#667eea" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionButton} onPress={() => onDelete(item.id)}>
                            <Trash2 size={16} color="#ef4444" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    const renderSectionHeader = ({ section: { title } }: { section: { title: string } }) => (
        <Text style={styles.dateHeader}>{format(new Date(title), 'MMM dd, yyyy')}</Text>
    );

    // Chart header now ONLY contains the chart, so it scrolls with the list
    const renderHeader = () => {
        if (!showChart) return null;
        return (
            <View style={{ paddingHorizontal: 16 }}>
                <ChartComponent
                    transactions={filteredTransactions}
                    startDate={startDate}
                    endDate={endDate}
                />
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Sticky Filters Section (Fixed at Top) */}
            <View style={styles.stickyHeaderContainer}>
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

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <Search size={18} color="#999" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search entries..."
                        placeholderTextColor="#aaa"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                            <X size={16} color="#999" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* List with Chart as Header */}
            <View style={styles.listContainer}>
                {sections.length === 0 ? (
                    <>
                        {renderHeader()}
                        <View style={styles.emptyState}>
                            <Calendar size={48} color="#ccc" />
                            <Text style={styles.emptyText}>No entries found</Text>
                        </View>
                    </>
                ) : (
                    <SectionList
                        sections={sections}
                        keyExtractor={(item) => item.id}
                        renderItem={renderTransactionItem}
                        renderSectionHeader={renderSectionHeader}
                        ListHeaderComponent={renderHeader}
                        contentContainerStyle={styles.listContent}
                        stickySectionHeadersEnabled={false}
                        initialNumToRender={15}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </View>

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
    container: {
        flex: 1,
    },
    stickyHeaderContainer: {
        backgroundColor: '#fff',
        zIndex: 10,
        elevation: 2,
    },
    // filterBar styles unchanged
    filterBar: {
        backgroundColor: '#fff',
        maxHeight: 50,
        marginBottom: 8, // Add spacing below filter bar since it scrolls now
    },
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
    filterButtonActive: {
        backgroundColor: '#192142',
        borderColor: '#192142',
    },
    filterButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#192142',
    },
    filterButtonTextActive: {
        color: '#fff',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 12,
        marginTop: 0,
        marginBottom: 12,
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: '#eee',
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        paddingLeft: 8,
        color: '#333',
        height: 40, // Fixed height for alignment
        paddingVertical: 0,
        textAlignVertical: 'center',
    },
    listContainer: {
        flex: 1,
    },
    listContent: {
        paddingBottom: 20,
    },
    dateHeader: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: '#f5f5f5',
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
    transactionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
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
    transactionTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    transactionType: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    transactionNote: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    transactionTime: {
        fontSize: 12,
        color: '#999',
    },
    transactionRight: {
        alignItems: 'flex-end',
    },
    transactionAmount: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 8,
    },
    incomeAmount: {
        color: '#10b981',
    },
    expenseAmount: {
        color: '#ef4444',
    },
    transactionActions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        padding: 6,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 16,
        color: '#999',
        marginTop: 12,
    },
});
