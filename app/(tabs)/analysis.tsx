import ChartComponent from '@/components/ChartComponent';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Card } from '@/components/ui/Card';
import { Colors } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useFilteredTransactions, useTransactions } from '@/providers/TransactionProvider';
import { endOfMonth, endOfYear, startOfMonth, startOfYear, subMonths } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { Stack, useRouter } from 'expo-router';
import { TrendingDown, TrendingUp, Wallet } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

type DurationType = 'weekly' | 'monthly' | 'yearly';

function AccountInsights() {
  const router = useRouter();
  const { modes } = useTransactions();
  const now = new Date();

  const textSecondaryColor = useThemeColor({}, 'textSecondary');

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
    }).filter(i => i.curSpend > 0 || i.prevSpend > 0);
  }, [modes, curTransactions, prevTransactions]);

  if (insights.length === 0) return null;

  return (
    <View style={styles.insightsContainer}>
      <ThemedText style={styles.sectionTitle}>Monthly Spending Insights</ThemedText>
      {insights.map(({ mode, curSpend, diff, percent }) => (
        <TouchableOpacity
          key={mode.id}
          activeOpacity={0.7}
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
          <Card variant="elevated" style={styles.insightCard}>
            <View style={styles.insightHeader}>
              <View style={[styles.modeIcon, { backgroundColor: mode.color + '20' }]}>
                <Wallet size={16} color={mode.color} />
              </View>
              <ThemedText style={styles.insightModeName}>{mode.name}</ThemedText>
            </View>

            <View style={styles.insightContent}>
              <ThemedText style={styles.insightAmount}>₹{curSpend.toFixed(0)}</ThemedText>
              <View style={styles.insightBadge}>
                {diff > 0 ? (
                  <View style={[styles.badgeContainer, { backgroundColor: Colors.light.error + '20' }]}>
                    <TrendingUp size={12} color={Colors.light.error} />
                    <ThemedText style={[styles.badgeText, { color: Colors.light.error }]}>
                      +{Math.abs(percent).toFixed(0)}% (₹{Math.abs(diff).toFixed(0)})
                    </ThemedText>
                  </View>
                ) : diff < 0 ? (
                  <View style={[styles.badgeContainer, { backgroundColor: Colors.light.success + '20' }]}>
                    <TrendingDown size={12} color={Colors.light.success} />
                    <ThemedText style={[styles.badgeText, { color: Colors.light.success }]}>
                      -{Math.abs(percent).toFixed(0)}% (₹{Math.abs(diff).toFixed(0)}) - Last Month
                    </ThemedText>
                  </View>
                ) : (
                  <View style={[styles.badgeContainer, { backgroundColor: textSecondaryColor + '10' }]}>
                    <ThemedText style={[styles.badgeText, { color: textSecondaryColor }]}>Same as last month</ThemedText>
                  </View>
                )}
              </View>
            </View>
            <ThemedText style={styles.insightFooter}>This Month</ThemedText>
          </Card>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function AnalysisScreen() {
  const [durationType, setDurationType] = useState<DurationType>('monthly');

  const backgroundColor = useThemeColor({}, 'background');
  const surfaceColor = useThemeColor({}, 'surface');
  const tintColor = useThemeColor({}, 'tint');

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
    <ThemedView style={styles.container}>
      <Stack.Screen options={{
        title: 'Analysis',
        headerShown: true,
        statusBarStyle: 'light',
        headerStyle: { backgroundColor: surfaceColor },
        headerTitleStyle: { color: useThemeColor({}, 'text') },
        headerTintColor: tintColor,
        headerShadowVisible: false,
      }} />

      <View style={[styles.filterBar, { backgroundColor: surfaceColor, paddingBottom: 12, paddingTop: 12 }]}>
        <FilterOption
          label="Last 7 Days"
          active={durationType === 'weekly'}
          onPress={() => setDurationType('weekly')}
        />
        <FilterOption
          label="This Month"
          active={durationType === 'monthly'}
          onPress={() => setDurationType('monthly')}
        />
        <FilterOption
          label="This Year"
          active={durationType === 'yearly'}
          onPress={() => setDurationType('yearly')}
        />
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
    </ThemedView>
  );
}

const FilterOption = function ({ label, active, onPress }: any) {
  const tint = useThemeColor({}, 'tint');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const surface = useThemeColor({}, 'surface');

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[
        styles.filterButton,
        active && {
          backgroundColor: tint,
          borderColor: tint,
          elevation: 4,
          shadowColor: tint,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
        },
        !active && {
          backgroundColor: surface,
          borderColor: textSecondary + '20',
          borderWidth: 1,
        }
      ]}
      onPress={() => {
        onPress();
        if (Platform.OS !== 'web') Haptics.selectionAsync();
      }}
    >
      <ThemedText style={[
        styles.filterButtonText,
        active ? { color: '#fff' } : { color: textSecondary }
      ]}>
        {label}
      </ThemedText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterBar: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  chartWrapper: {
    marginBottom: 20,
    marginHorizontal: -4, // Counteract padding slightly if needed or just fit
  },
  insightsContainer: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  insightCard: {
    padding: 16,
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
    opacity: 0.5,
    marginTop: 4,
  },
});
