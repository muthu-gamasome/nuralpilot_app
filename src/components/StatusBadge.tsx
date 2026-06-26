import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/lib/colors';

type Status = 'online' | 'offline' | 'warning';

interface Props {
  status: Status;
  size?: 'sm' | 'md';
}

const STATUS_CONFIG: Record<Status, { label: string; color: string; bg: string; dot: string }> = {
  online: { label: 'Online', color: Colors.onlineGreen, bg: Colors.onlineGreenDim, dot: Colors.onlineGreen },
  offline: { label: 'Offline', color: Colors.red, bg: Colors.redDim, dot: Colors.red },
  warning: { label: 'Warning', color: Colors.warning, bg: 'rgba(254,165,0,0.10)', dot: Colors.warning },
};

export default function StatusBadge({ status, size = 'sm' }: Props) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.offline;
  const isSmall = size === 'sm';

  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }, isSmall ? styles.badgeSm : styles.badgeMd]}>
      <View style={[styles.dot, { backgroundColor: cfg.dot }, isSmall ? styles.dotSm : styles.dotMd]} />
      <Text style={[styles.label, { color: cfg.color }, isSmall ? styles.labelSm : styles.labelMd]}>
        {cfg.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    gap: 5,
  },
  badgeSm: { paddingHorizontal: 8, paddingVertical: 3 },
  badgeMd: { paddingHorizontal: 10, paddingVertical: 5 },
  dot: { borderRadius: 99 },
  dotSm: { width: 6, height: 6 },
  dotMd: { width: 8, height: 8 },
  label: { fontWeight: '600' },
  labelSm: { fontSize: 11 },
  labelMd: { fontSize: 13 },
});
