import ChartComponent from '@/components/ChartComponent';
import { useFilteredTransactions, useTransactions } from '@/providers/TransactionProvider';
import { endOfMonth, endOfYear, startOfMonth, startOfYear, subMonths } from 'date-fns';
import { Stack, useRouter } from 'expo-router';
import { TrendingDown, TrendingUp, Wallet } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type DurationType = 'weekly' | 'monthly' | 'yearly';

function AccountInsights() {
  const router = useRouter();
  const { modes } = useTransactions();
  const now = new Date();

  // Current Month Range
  const curStart = startOfMonth(now).getTime();
  const curEnd = endOfMonth(now).getTime();

  // Previous Month Range
  const prevStart = startOfMonth(subMonths(now, 1)).getTime();
  const prevEnd = endOfMonth(subMonths(now, 1)).getTime();

  // Fetch transactions for both periods
  const curTransactions = useFilteredTransactions(curStart, curEnd);
  const prevTransactions = useFilteredTransactions(prevStart, prevEnd);

  const insights = useMemo(() => {
    return modes.map(mode => {
      const curSpend = curTransactions
        .filter(t => t.modeId === mode.id && t.type === 'out' && !t.isExcluded)
        .reduce((sum, t) => sum + t.amount, 0);

      const prevSpend = prevTransactions
        .filter(t => t.modeId === mode.id && t.type === 'out' && !t.isExcluded)
        .reduce((sum, t) => sum + t.amount, 0);

      const diff = curSpend - prevSpend;
      const percent = prevSpend > 0 ? (diff / prevSpend) * 100 : 0;

      return {
        mode,
        curSpend,
        prevSpend,
        diff,
        percent
      };
    }).filter(i => i.curSpend > 0 || i.prevSpend > 0); // Only show active accounts
  }, [modes, curTransactions, prevTransactions]);

  if (insights.length === 0) return null;

  return (
    <View style={styles.insightsContainer}>
      <Text style={styles.sectionTitle}>Monthly Spending Insights</Text>
      {insights.map(({ mode, curSpend, diff, percent }) => (
        <TouchableOpacity
          key={mode.id}
          style={styles.insightCard}
          onPress={() => {
            router.push({
              pathname: '/(tabs)/transactions',
              params: {
                showChart: 'true',
                modeId: mode.id,
                filterType: 'custom',
                startDate: prevStart.toString(),
                endDate: prevEnd.toString(),
                tabTitle: `${mode.name} - Last Month Transactions`
              }
            });
          }}
        >
          <View style={styles.insightHeader}>
            <View style={[styles.modeIcon, { backgroundColor: mode.color + '20' }]}>
              <Wallet size={16} color={mode.color} />
            </View>
            <Text style={styles.insightModeName}>{mode.name}</Text>
          </View>

          <View style={styles.insightContent}>
            <Text style={styles.insightAmount}>₹{curSpend.toFixed(0)}</Text>
            <View style={styles.insightBadge}>
              {diff > 0 ? (
                <View style={[styles.badgeContainer, { backgroundColor: '#fee2e2' }]}>
                  <TrendingUp size={12} color="#ef4444" />
                  <Text style={[styles.badgeText, { color: '#ef4444' }]}>
                    +{Math.abs(percent).toFixed(0)}% (₹{Math.abs(diff).toFixed(0)})
                  </Text>
                </View>
              ) : diff < 0 ? (
                <View style={[styles.badgeContainer, { backgroundColor: '#d1fae5' }]}>
                  <TrendingDown size={12} color="#10b981" />
                  <Text style={[styles.badgeText, { color: '#10b981' }]}>
                    -{Math.abs(percent).toFixed(0)}% (₹{Math.abs(diff).toFixed(0)})
                  </Text>
                </View>
              ) : (
                <View style={[styles.badgeContainer, { backgroundColor: '#f3f4f6' }]}>
                  <Text style={[styles.badgeText, { color: '#6b7280' }]}>Same as last month</Text>
                </View>
              )}
            </View>
          </View>
          <Text style={styles.insightFooter}>vs. Last Month</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function AnalysisScreen() {
  const [durationType, setDurationType] = useState<DurationType>('monthly');

  const getDateRange = () => {
    const now = new Date();
    if (durationType === 'weekly') {
      const start = new Date(now);
      start.setDate(now.getDate() - 7);
      return [start.getTime(), now.getTime()];
    }
    if (durationType === 'monthly') return [startOfMonth(now).getTime(), endOfMonth(now).getTime()];
    if (durationType === 'yearly') return [startOfYear(now).getTime(), endOfYear(now).getTime()];
    return [0, Date.now()];
  };

  const [startDate, endDate] = getDateRange();

  const transactions = useFilteredTransactions(startDate, endDate);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{
        title: 'Analysis',
        headerShown: true,
        statusBarStyle: 'light',
        headerStyle: { backgroundColor: '#ffffffff' },
        headerTitleStyle: { color: '#000000ff' },
        headerTintColor: '#000000ff',
      }} />

      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[styles.filterButton, durationType === 'weekly' && styles.filterButtonActive]}
          onPress={() => setDurationType('weekly')}
        >
          <Text style={[styles.filterButtonText, durationType === 'weekly' && styles.filterButtonTextActive]}>
            Last 7 Days
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, durationType === 'monthly' && styles.filterButtonActive]}
          onPress={() => setDurationType('monthly')}
        >
          <Text style={[styles.filterButtonText, durationType === 'monthly' && styles.filterButtonTextActive]}>
            This Month
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, durationType === 'yearly' && styles.filterButtonActive]}
          onPress={() => setDurationType('yearly')}
        >
          <Text style={[styles.filterButtonText, durationType === 'yearly' && styles.filterButtonTextActive]}>
            This Year
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.chartWrapper}>
          <ChartComponent
            transactions={transactions}
            startDate={startDate}
            endDate={endDate}
          />
        </View>
        <AccountInsights />
        <View style={{ height: 40 }} />
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
    borderColor: '#161e3fff',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#636364ff',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  chartWrapper: {
    marginBottom: 20,
  },
  insightsContainer: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  insightCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  modeIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightModeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  insightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  insightAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  insightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  insightFooter: {
    fontSize: 12,
    color: '#999',
  },
});
