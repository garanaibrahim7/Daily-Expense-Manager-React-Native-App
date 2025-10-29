import { useAnalysis } from '@/providers/TransactionProvider';
import { AnalysisFilter } from '@/types/transaction';
import { Stack } from 'expo-router';
import { Calendar, TrendingDown, TrendingUp } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BarChart, PieChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');
const chartWidth = width - 40;

type DurationType = 'weekly' | 'monthly' | 'yearly';

export default function AnalysisScreen() {
  const [durationType, setDurationType] = useState<DurationType>('monthly');

  const filter: AnalysisFilter = {
    durationType,
  };

  const analysis = useAnalysis(filter);

  const pieData = analysis.transactionsByMode
    .filter((m: { income: number; expense: number }) => m.income > 0 || m.expense > 0)
    .map((m: { modeName: string; income: number; expense: number; color: string }) => ({
      name: m.modeName,
      population: m.income + m.expense,
      color: m.color,
      legendFontColor: '#333',
      legendFontSize: 14,
    }));

  const hasData = analysis.totalIncome > 0 || analysis.totalExpense > 0;

  const chartConfig = {
    backgroundColor: '#fff',
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(102, 126, 234, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(51, 51, 51, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForLabels: {
      fontSize: 12,
    },
  };

  const barData = {
    labels: analysis.transactionsByDate.slice(-7).map((d: { date: string }) => {
      const date = new Date(d.date);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }),
    datasets: [
      {
        data: analysis.transactionsByDate.slice(-7).map((d: { income: number }) => d.income),
        color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
      },
      {
        data: analysis.transactionsByDate.slice(-7).map((d: { expense: number }) => d.expense),
        color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
      },
    ],
    legend: ['Income', 'Expense'],
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{
        title: 'Analysis',
        headerShown: true,
        statusBarStyle: 'light',
        headerStyle: { backgroundColor: '#131b31ff' },
        headerTitleStyle: { color: '#fff' },
        headerTintColor: '#fff',
      }} />

      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[styles.filterButton, durationType === 'weekly' && styles.filterButtonActive]}
          onPress={() => setDurationType('weekly')}
        >
          <Text style={[styles.filterButtonText, durationType === 'weekly' && styles.filterButtonTextActive]}>
            Weekly
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, durationType === 'monthly' && styles.filterButtonActive]}
          onPress={() => setDurationType('monthly')}
        >
          <Text style={[styles.filterButtonText, durationType === 'monthly' && styles.filterButtonTextActive]}>
            Monthly
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, durationType === 'yearly' && styles.filterButtonActive]}
          onPress={() => setDurationType('yearly')}
        >
          <Text style={[styles.filterButtonText, durationType === 'yearly' && styles.filterButtonTextActive]}>
            Yearly
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCards}>
          <View style={[styles.summaryCard, styles.incomeCard]}>
            <TrendingUp size={24} color="#10b981" />
            <Text style={styles.summaryLabel}>Income</Text>
            <Text style={styles.summaryAmount}>₹{analysis.totalIncome.toFixed(2)}</Text>
          </View>

          <View style={[styles.summaryCard, styles.expenseCard]}>
            <TrendingDown size={24} color="#ef4444" />
            <Text style={styles.summaryLabel}>Expense</Text>
            <Text style={styles.summaryAmount}>₹{analysis.totalExpense.toFixed(2)}</Text>
          </View>

          <View style={[styles.summaryCard, styles.balanceCard]}>
            <Calendar size={24} color="#667eea" />
            <Text style={styles.summaryLabel}>Balance</Text>
            <Text style={[styles.summaryAmount, analysis.balance >= 0 ? styles.positiveBalance : styles.negativeBalance]}>
              ₹{analysis.balance.toFixed(2)}
            </Text>
          </View>
        </View>

        {hasData ? (
          <>
            {analysis.transactionsByDate.length > 0 && (
              <View style={styles.chartSection}>
                <Text style={styles.chartTitle}>Daily Trend (Last 7 Days)</Text>
                <BarChart
                  data={barData}
                  width={chartWidth}
                  height={220}
                  chartConfig={chartConfig}
                  style={styles.chart}
                  yAxisLabel="₹"
                  yAxisSuffix=""
                  fromZero
                />
              </View>
            )}

            {pieData.length > 0 && (
              <View style={styles.chartSection}>
                <Text style={styles.chartTitle}>Distribution by Account</Text>
                <PieChart
                  data={pieData}
                  width={chartWidth}
                  height={220}
                  chartConfig={chartConfig}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  style={styles.chart}
                />
              </View>
            )}

            <View style={styles.breakdownSection}>
              <Text style={styles.breakdownTitle}>Account Breakdown</Text>
              {analysis.transactionsByMode.map((mode: { modeId: string; modeName: string; color: string; balance: number; income: number; expense: number }) => (
                <View key={mode.modeId} style={styles.breakdownCard}>
                  <View style={styles.breakdownHeader}>
                    <View style={styles.breakdownLeft}>
                      <View style={[styles.colorDot, { backgroundColor: mode.color }]} />
                      <Text style={styles.breakdownName}>{mode.modeName}</Text>
                    </View>
                    <Text style={[styles.breakdownBalance, mode.balance >= 0 ? styles.positiveBalance : styles.negativeBalance]}>
                      ₹{mode.balance.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.breakdownDetails}>
                    <View style={styles.breakdownDetailItem}>
                      <Text style={styles.breakdownDetailLabel}>Income:</Text>
                      <Text style={[styles.breakdownDetailValue, styles.positiveBalance]}>
                        ₹{mode.income.toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.breakdownDetailItem}>
                      <Text style={styles.breakdownDetailLabel}>Expense:</Text>
                      <Text style={[styles.breakdownDetailValue, styles.negativeBalance]}>
                        ₹{mode.expense.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Calendar size={48} color="#ccc" />
            <Text style={styles.emptyText}>No data available</Text>
            <Text style={styles.emptySubtext}>Add some transactions to see analysis</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  filterBar: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#727479ff',
    backgroundColor: '#ffffffff',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#161e3fff',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#636364ff',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  summaryCards: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  incomeCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  expenseCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  balanceCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#667eea',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#333',
  },
  positiveBalance: {
    color: '#10b981',
  },
  negativeBalance: {
    color: '#ef4444',
  },
  chartSection: {
    padding: 20,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#333',
    marginBottom: 16,
  },
  chart: {
    borderRadius: 16,
  },
  breakdownSection: {
    padding: 20,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#333',
    marginBottom: 16,
  },
  breakdownCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  breakdownName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#333',
  },
  breakdownBalance: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  breakdownDetails: {
    flexDirection: 'row',
    gap: 24,
  },
  breakdownDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breakdownDetailLabel: {
    fontSize: 14,
    color: '#666',
  },
  breakdownDetailValue: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
});
