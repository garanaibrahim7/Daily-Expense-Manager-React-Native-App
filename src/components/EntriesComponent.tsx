import DateTimePicker from '@react-native-community/datetimepicker';
import {
    endOfMonth,
    endOfYear,
    format,
    startOfMonth,
    startOfYear,
} from 'date-fns';
import * as Haptics from 'expo-haptics';
import {
    Calendar,
    Search,
    TrendingDown,
    TrendingUp,
    X
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
    Platform,
    ScrollView,
    SectionList,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

import { Colors } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useFilteredTransactions } from '@/providers/TransactionProvider';
import { Transaction } from '@/types/transaction';
import ChartComponent from './ChartComponent';

import { ThemedText } from './ThemedText';
import { Card } from './ui/Card';

interface EntriesComponentProps {
    modeId?: string | null;
    onEdit: (transaction: Transaction) => void;
    onDelete: (transactionId: string) => void;
    transactions?: Transaction[];
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

    const surfaceColor = useThemeColor({}, 'surface');
    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const textSecondaryColor = useThemeColor({}, 'textSecondary');
    const tintColor = useThemeColor({}, 'tint');

    // Apply initial filter type if provided
    React.useEffect(() => {
        if (initialFilterType) {
            setFilterType(initialFilterType);
        }
        if (initialStartDate && initialEndDate) {
            setCustomStartDate(initialStartDate);
            setCustomEndDate(initialEndDate);
        }
    }, [initialFilterType, initialStartDate, initialEndDate]);

    // Reset filters when showChart becomes false
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
        const isIncome = item.type === 'in';
        const itemColor = isIncome ? Colors.light.success : Colors.light.error;

        return (
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => onEdit(item)}
                style={{ marginBottom: 12, marginHorizontal: 16 }}
            >
                <Card variant="elevated" style={styles.transactionCard}>
                    <View style={styles.transactionLeft}>
                        <View style={[styles.transactionIcon, { backgroundColor: itemColor + '15' }]}>
                            {isIncome ? (
                                <TrendingUp size={20} color={itemColor} />
                            ) : (
                                <TrendingDown size={20} color={itemColor} />
                            )}
                        </View>
                        <View style={styles.transactionInfo}>
                            <ThemedText style={{ fontWeight: '600', fontSize: 16 }}>{item.note || (isIncome ? 'Income' : 'Expense')}</ThemedText>
                            <ThemedText style={{ fontSize: 13, color: textSecondaryColor, marginTop: 2 }}>{format(new Date(item.date), 'h:mm a')}</ThemedText>
                        </View>
                    </View>
                    <View style={styles.transactionRight}>
                        <ThemedText style={{ fontSize: 16, fontWeight: '700', color: itemColor }}>
                            {isIncome ? '+' : '-'}₹{item.amount.toFixed(2)}
                        </ThemedText>
                    </View>
                </Card>
            </TouchableOpacity>
        );
    };

    const renderSectionHeader = ({ section: { title } }: { section: { title: string } }) => (
        <View style={[styles.dateHeader, { backgroundColor }]}>
            <ThemedText style={{ fontSize: 13, fontWeight: '600', color: textSecondaryColor, opacity: 0.8 }}>
                {format(new Date(title), 'MMM dd, yyyy').toUpperCase()}
            </ThemedText>
        </View>
    );

    const renderHeader = () => {
        if (!showChart) return null;
        return (
            <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
                <ChartComponent
                    transactions={filteredTransactions}
                    startDate={startDate}
                    endDate={endDate}
                />
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor }]}>
            {/* Filter Bar */}
            <View style={[styles.stickyHeaderContainer, { backgroundColor, borderBottomColor: surfaceColor, borderBottomWidth: 1 }]}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterBarContent}
                >
                    <FilterButton
                        label="Month"
                        active={filterType === 'month'}
                        onPress={() => setFilterType('month')}
                    />
                    <FilterButton
                        label="Year"
                        active={filterType === 'year'}
                        onPress={() => setFilterType('year')}
                    />
                    <FilterButton
                        label={customStartDate && customEndDate ? `${format(customStartDate, 'dd MMM')} - ${format(customEndDate, 'dd MMM')}` : 'Custom'}
                        active={filterType === 'custom'}
                        onPress={() => {
                            setFilterType('custom');
                            setIsSelectingStart(true);
                            setShowDatePicker(true);
                        }}
                        icon={<Calendar size={14} color={filterType === 'custom' ? '#fff' : textSecondaryColor} />}
                    />

                    <View style={styles.verticalDivider} />

                    <FilterButton
                        label="Income"
                        active={selectedType === 'in'}
                        onPress={() => setSelectedType(selectedType === 'in' ? 'all' : 'in')}
                        color={Colors.light.success}
                    />
                    <FilterButton
                        label="Expense"
                        active={selectedType === 'out'}
                        onPress={() => setSelectedType(selectedType === 'out' ? 'all' : 'out')}
                        color={Colors.light.error}
                    />
                </ScrollView>

                {/* Search Bar */}
                <View style={[styles.searchContainer, { backgroundColor: surfaceColor }]}>
                    <Search size={18} color={textSecondaryColor} />
                    <TextInput
                        style={[styles.searchInput, { color: textColor }]}
                        placeholder="Search entries..."
                        placeholderTextColor={textSecondaryColor}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                            <X size={16} color={textSecondaryColor} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* List */}
            <View style={styles.listContainer}>
                {sections.length === 0 ? (
                    <>
                        {renderHeader()}
                        <View style={styles.emptyState}>
                            <Calendar size={48} color={textSecondaryColor} style={{ opacity: 0.3 }} />
                            <ThemedText style={{ color: textSecondaryColor, marginTop: 12 }}>No entries found</ThemedText>
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

// Mini component for Filter Button to keep code clean
function FilterButton({ label, active, onPress, icon, color }: any) {
    const tint = useThemeColor({}, 'tint');
    const textSecondary = useThemeColor({}, 'textSecondary');
    const surface = useThemeColor({}, 'surface');

    // If specific color provided (like for Income/Expense), use it for active state bg or border
    const activeBg = color || tint;
    const activeColor = '#fff';
    const inactiveColor = textSecondary;

    return (
        <TouchableOpacity
            style={[
                styles.filterButton,
                {
                    backgroundColor: active ? activeBg : surface,
                    borderColor: active ? activeBg : 'transparent' // or surfaceHighlight
                }
            ]}
            onPress={() => {
                onPress();
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
        >
            {icon}
            <ThemedText style={{
                fontSize: 13,
                fontWeight: '600',
                color: active ? activeColor : inactiveColor
            }}>
                {label}
            </ThemedText>
        </TouchableOpacity>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    stickyHeaderContainer: {
        zIndex: 10,
        paddingBottom: 8,
    },
    filterBarContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 8,
    },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
    },
    verticalDivider: {
        width: 1,
        height: 20,
        backgroundColor: '#e5e5e5',
        marginHorizontal: 4,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 8, // reduced
        marginBottom: 4,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        paddingLeft: 8,
        height: 36,
        paddingVertical: 0,
    },
    listContainer: {
        flex: 1,
    },
    listContent: {
        paddingBottom: 40,
    },
    dateHeader: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingTop: 24,
    },
    transactionCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20, // More rounded
    },
    transactionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    transactionIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    transactionInfo: {
        flex: 1,
    },
    transactionRight: {
        alignItems: 'flex-end',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
});
