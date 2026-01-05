import { Colors } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Transaction } from '@/types/transaction';
import { format } from 'date-fns';
import { TrendingDown, TrendingUp } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { ThemedText } from './ThemedText';
import { Card } from './ui/Card';

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
    const textColor = useThemeColor({}, 'text');
    const textSecondaryColor = useThemeColor({}, 'textSecondary');
    const surfaceColor = useThemeColor({}, 'surface');

    // Theme-aware colors
    const incomeColor = Colors.light.success;
    const expenseColor = Colors.light.error;

    const { totalIncome, totalExpense, chartData } = useMemo(() => {
        let income = 0;
        let expense = 0;
        const dailyData: Record<string, { income: number; expense: number }> = {};

        transactions.forEach((t) => {
            if (t.type === 'in') income += t.amount;
            else expense += t.amount;

            const dateKey = format(new Date(t.date), 'yyyy-MM-dd');
            if (!dailyData[dateKey]) dailyData[dateKey] = { income: 0, expense: 0 };

            if (t.type === 'in') dailyData[dateKey].income += t.amount;
            else dailyData[dateKey].expense += t.amount;
        });

        const sortedDates = Object.keys(dailyData).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

        if (sortedDates.length === 0) {
            return {
                totalIncome: income, // Return accumulated totals even if empty breakdown? No, likely 0
                totalExpense: expense,
                chartData: null
            }
        }

        const rawLabels = sortedDates;
        const skipFactor = Math.ceil(rawLabels.length / 6);
        const labels = rawLabels.map((dateStr, index) => {
            if (index % skipFactor === 0) {
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
                        color: (opacity = 1) => incomeColor,
                        strokeWidth: 3,
                        withDots: false,
                    },
                    {
                        data: expenseData,
                        color: (opacity = 1) => expenseColor,
                        strokeWidth: 3,
                        withDots: false,
                    },
                ],
                legend: ['Income', 'Expense'],
            },
        };
    }, [transactions, incomeColor, expenseColor]);

    const chartConfig = {
        backgroundColor: surfaceColor,
        backgroundGradientFrom: surfaceColor,
        backgroundGradientTo: surfaceColor,
        decimalPlaces: 0,
        color: (opacity = 1) => textSecondaryColor,
        labelColor: (opacity = 1) => textSecondaryColor,
        style: {
            borderRadius: 24,
        },
        propsForDots: { r: '4', strokeWidth: '2', stroke: surfaceColor },
        propsForBackgroundLines: {
            strokeWidth: 1,
            stroke: textSecondaryColor + '20',
        },
    };

    const chartWidth = width - 40; // Full width minus padding

    return (
        <View style={styles.container}>
            {/* Header Stats */}
            <View style={styles.statsContainer}>
                <Card style={[styles.statItem, { flex: 1, marginRight: 8 }]} variant="flat">
                    <View style={[styles.iconContainer, { backgroundColor: incomeColor + '20' }]}>
                        <TrendingUp size={20} color={incomeColor} />
                    </View>
                    <View>
                        <ThemedText style={{ fontSize: 12, color: textSecondaryColor }}>Income</ThemedText>
                        <ThemedText style={{ fontSize: 18, fontWeight: '700', color: incomeColor }}>
                            ₹{totalIncome.toFixed(0)}
                        </ThemedText>
                    </View>
                </Card>
                <Card style={[styles.statItem, { flex: 1, marginLeft: 8 }]} variant="flat">
                    <View style={[styles.iconContainer, { backgroundColor: expenseColor + '20' }]}>
                        <TrendingDown size={20} color={expenseColor} />
                    </View>
                    <View>
                        <ThemedText style={{ fontSize: 12, color: textSecondaryColor }}>Expense</ThemedText>
                        <ThemedText style={{ fontSize: 18, fontWeight: '700', color: expenseColor }}>
                            ₹{totalExpense.toFixed(0)}
                        </ThemedText>
                    </View>
                </Card>
            </View>

            {/* Chart */}
            <Card style={styles.chartCard} variant="elevated">
                {chartData ? (
                    <View style={{ alignItems: 'center', overflow: 'hidden', borderRadius: 24 }}>
                        <LineChart
                            data={chartData}
                            width={chartWidth}
                            height={220}
                            chartConfig={chartConfig}
                            bezier
                            style={{ borderRadius: 24 }}
                            withDots={true}
                            withInnerLines={true}
                            withOuterLines={false}
                            withVerticalLines={false}
                            withHorizontalLines={true}
                            yAxisLabel="₹"
                            yAxisSuffix=""
                            yAxisInterval={1}
                            withShadow={false} // clean look
                            fromZero
                            segments={4}
                        />
                    </View>
                ) : (
                    <View style={styles.emptyChart}>
                        <ThemedText style={{ color: textSecondaryColor }}>No data for this period</ThemedText>
                    </View>
                )}
            </Card>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 16,
        borderRadius: 20,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    chartCard: {
        padding: 0,
        paddingVertical: 16,
        alignItems: 'center',
        borderRadius: 24,
    },
    emptyChart: {
        height: 200,
        alignItems: 'center',
        justifyContent: 'center'
    },
});
