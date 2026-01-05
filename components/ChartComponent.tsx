import { Transaction } from '@/types/transaction';
import { format } from 'date-fns';
import { TrendingDown, TrendingUp } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');

interface ChartComponentProps {
    transactions: Transaction[];
    startDate: number;
    endDate: number;
}

export default function ChartComponent({
    transactions,
    startDate,
    endDate,
}: ChartComponentProps) {
    const { totalIncome, totalExpense, chartData } = useMemo(() => {
        let income = 0;
        let expense = 0;
        const dailyData: Record<string, { income: number; expense: number }> = {};

        // Initialize daily data map for the range (optional: or just map existing)
        // For simplicity and "line" nature, we'll map existing transactions to dates.
        // To show a proper line over time, we really should fill gaps, but let's start with present data for now
        // or better, generate labels for the range if it's small (7 days) or just pick localized points.

        // Better approach for "Line Graph":
        // 1. Calculate totals.
        // 2. Group by date.

        transactions.forEach((t) => {
            if (t.type === 'in') income += t.amount;
            else expense += t.amount;

            // Use ISO format for proper sorting across years
            const dateKey = format(new Date(t.date), 'yyyy-MM-dd');
            if (!dailyData[dateKey]) dailyData[dateKey] = { income: 0, expense: 0 };

            if (t.type === 'in') dailyData[dateKey].income += t.amount;
            else dailyData[dateKey].expense += t.amount;
        });

        // Sort dates chronologically
        const sortedDates = Object.keys(dailyData).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

        // If no data, provide defaults
        if (sortedDates.length === 0) {
            return {
                totalIncome: 0,
                totalExpense: 0,
                chartData: null
            }
        }

        // Fix for crowded labels: Only show ~6 labels evenly spaced
        const rawLabels = sortedDates;
        const skipFactor = Math.ceil(rawLabels.length / 6);
        const labels = rawLabels.map((dateStr, index) => {
            if (index % skipFactor === 0) {
                // Format for display (dd/MM - Indian Format) from the ISO key
                return format(new Date(dateStr), 'dd/MM');
            }
            return '';
        });

        const incomeData = sortedDates.map(d => dailyData[d].income);
        const expenseData = sortedDates.map(d => dailyData[d].expense);

        return {
            totalIncome: income,
            totalExpense: expense,
            chartData: {
                labels,
                datasets: [
                    {
                        data: incomeData,
                        color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`, // Green
                        strokeWidth: 3,
                    },
                    {
                        data: expenseData,
                        color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`, // Red
                        strokeWidth: 3,
                    },
                ],
                legend: ['Income', 'Expense'],
            },
        };
    }, [transactions]);

    const chartConfig = {
        backgroundColor: '#ffffff',
        backgroundGradientFrom: '#ffffff',
        backgroundGradientTo: '#ffffff',
        decimalPlaces: 0,
        color: (opacity = 1) => `rgba(51, 65, 85, ${opacity})`, // Darker labels
        labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
        style: {
            borderRadius: 16,
        },
        propsForDots: {
            r: '0',
        },
        propsForBackgroundLines: {
            strokeWidth: 1,
            stroke: "rgba(226, 232, 240, 0.5)", // Very subtle grid
            // strokeDasharray: [], // REMOVED to prevent crash
        },
        propsForLabels: {
            fontSize: 10,
            fontWeight: '600',
        },
    };

    const chartWidth = width - 72; // width of screen - (analysis padding 20*2) - (chartComponent padding 16*2)

    return (
        <View style={styles.container}>
            {/* Header Stats */}
            <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                    <View style={[styles.iconContainer, { backgroundColor: '#d1fae5' }]}>
                        <TrendingUp size={20} color="#10b981" />
                    </View>
                    <View>
                        <Text style={styles.statLabel}>Income</Text>
                        <Text style={[styles.statValue, { color: '#10b981' }]}>
                            ₹{totalIncome.toFixed(2)}
                        </Text>
                    </View>
                </View>
                <View style={styles.divider} />
                <View style={styles.statItem}>
                    <View style={[styles.iconContainer, { backgroundColor: '#fee2e2' }]}>
                        <TrendingDown size={20} color="#ef4444" />
                    </View>
                    <View>
                        <Text style={styles.statLabel}>Expense</Text>
                        <Text style={[styles.statValue, { color: '#ef4444' }]}>
                            ₹{totalExpense.toFixed(2)}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Chart */}
            {chartData && (
                <View style={styles.chartWrapper}>
                    <LineChart
                        data={chartData}
                        width={chartWidth}
                        height={220}
                        chartConfig={chartConfig}
                        bezier
                        style={styles.chart}
                        withDots={false}
                        withInnerLines={true}
                        withOuterLines={false}
                        withVerticalLines={false}
                        withHorizontalLines={true}
                        yAxisLabel="₹"
                        yAxisSuffix=""
                        yAxisInterval={1}
                        withShadow={false}
                    />
                </View>
            )}
            {!chartData && (
                <View style={styles.emptyChart}>
                    <Text style={styles.emptyText}>No data for this period</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        marginBottom: 16,
        // backgroundColor: '#fff',
        // borderRadius: 16,
        // shadowColor: '#000',
        // shadowOffset: { width: 0, height: 2 },
        // shadowOpacity: 0.1,
        // shadowRadius: 8,
        elevation: 3,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    divider: {
        width: 1,
        height: '100%',
        backgroundColor: '#f0f0f0',
        marginHorizontal: 8,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 16,
        fontWeight: '700',
    },
    chartWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    chart: {
        borderRadius: 16,
        marginLeft: -10, // Slight nudge to center the grid with Y-labels
    },
    emptyChart: {
        height: 200,
        alignItems: 'center',
        justifyContent: 'center'
    },
    emptyText: {
        color: '#999'
    }
});
