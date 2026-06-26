import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '@/lib/colors';
import HardwareCard from './HardwareCard';
import type { Hardware, FleetStats } from '@/lib/types';

type StatusFilter = 'all' | 'online' | 'offline' | 'warning';

interface Props {
  hardwares: Hardware[];
  selectedHardware: Hardware | null;
  fleetStats: FleetStats;
  isLoading: boolean;
  isConnected: boolean;
  executingRobotIds: Set<string>;
  onHardwareSelect: (id: string) => void;
  onReconnect: () => void;
  onRefresh: () => void;
  onAddRobot: () => void;
}

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'online', label: 'Online' },
  { key: 'offline', label: 'Offline' },
  { key: 'warning', label: 'Warning' },
];

export default function FleetSidebar({
  hardwares,
  selectedHardware,
  fleetStats,
  isLoading,
  isConnected,
  executingRobotIds,
  onHardwareSelect,
  onReconnect,
  onRefresh,
  onAddRobot,
}: Props) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredList = useMemo(() => {
    return hardwares.filter((hw) => {
      const matchesStatus = statusFilter === 'all' || hw.status === statusFilter;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        hw.id.toLowerCase().includes(q) ||
        hw.name.toLowerCase().includes(q) ||
        hw.aliasName?.toLowerCase().includes(q) ||
        (hw.location ?? '').toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [hardwares, statusFilter, searchQuery]);

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Overview</Text>
          <View style={[styles.connDot, { backgroundColor: isConnected ? Colors.primary : Colors.red }]} />
          {!isConnected && (
            <TouchableOpacity onPress={onReconnect}>
              <Text style={styles.retryText}>retry</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn} disabled={isLoading}>
          <Text style={[styles.refreshIcon, isLoading && styles.refreshDisabled]}>↻</Text>
        </TouchableOpacity>
      </View>

      {/* ── Fleet Stats ── */}
      <View style={styles.statsRow}>
        {[
          { label: 'Total', value: fleetStats.total, color: Colors.text },
          { label: 'Online', value: fleetStats.online, color: Colors.onlineGreen },
          { label: 'Offline', value: fleetStats.offline, color: Colors.red },
          { label: 'Warning', value: fleetStats.warning, color: Colors.warning },
        ].map((stat) => (
          <View key={stat.label} style={styles.statCard}>
            <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* ── Search ── */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by ID, name or location..."
          placeholderTextColor={Colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.clearIcon}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Status Filter Chips ── */}
      <View style={styles.filterRow}>
        {STATUS_FILTERS.map((f) => {
          const isActive = statusFilter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setStatusFilter(f.key)}
            >
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Hardware List ── */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Colors.primary} size="small" />
          <Text style={styles.loadingText}>Loading fleet...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredList}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <HardwareCard
              hardware={item}
              isSelected={selectedHardware?.id === item.id}
              onSelect={onHardwareSelect}
              isMissionExecuting={executingRobotIds.has(item.id)}
            />
          )}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📡</Text>
              <Text style={styles.emptyText}>No robots found</Text>
              <Text style={styles.emptySubtext}>
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'No robots registered yet'}
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ── Add Robot Button ── */}
      <TouchableOpacity style={styles.addRobotBtn} onPress={onAddRobot} activeOpacity={0.85}>
        <Text style={styles.addRobotIcon}>＋</Text>
        <Text style={styles.addRobotText}>Add Robot</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: Colors.sidebar,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  connDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  retryText: {
    color: Colors.red,
    fontSize: 11,
    textDecorationLine: 'underline',
  },
  refreshBtn: { padding: 4 },
  refreshIcon: { color: Colors.textSecondary, fontSize: 20 },
  refreshDisabled: { opacity: 0.4 },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    color: Colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginBottom: 10,
    backgroundColor: Colors.inputBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchIcon: { fontSize: 14 },
  searchInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 14,
  },
  clearIcon: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginBottom: 10,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primaryDim,
    borderColor: Colors.primaryBorder,
  },
  filterChipText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 80,
  },
  separator: { height: 10 },
  emptyContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 8,
  },
  emptyIcon: { fontSize: 36 },
  emptyText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    color: Colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
  addRobotBtn: {
    position: 'absolute',
    bottom: 16,
    left: 12,
    right: 12,
    height: 48,
    backgroundColor: Colors.primaryDim,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  addRobotIcon: {
    color: Colors.primary,
    fontSize: 18,
    fontWeight: '700',
  },
  addRobotText: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '500',
  },
});
