import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  batteryLevel: number;
}

function getBatteryColor(level: number): string {
  if (level > 50) return '#4caf50';
  if (level > 20) return '#fea501';
  return '#da1e28';
}

export default function DynamicBattery({ batteryLevel }: Props) {
  const color = getBatteryColor(batteryLevel);
  const fillPct = Math.max(0, Math.min(100, batteryLevel));

  return (
    <View style={styles.wrapper}>
      {/* Battery body with fill */}
      <View style={[styles.body, { borderColor: color }]}>
        <View style={[styles.fill, { width: `${fillPct}%` as any, backgroundColor: color }]} />
        {batteryLevel <= 10 && <Text style={styles.lowBang}>!</Text>}
      </View>
      {/* Terminal nub */}
      <View style={[styles.terminal, { backgroundColor: color }]} />
      {/* Percentage */}
      <Text style={[styles.pct, { color }]}>{Math.round(batteryLevel)}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderColor: '#313447',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    height: 32,
  },
  body: {
    width: 20,
    height: 11,
    borderWidth: 1.5,
    borderRadius: 2,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 1,
  },
  terminal: {
    width: 3,
    height: 6,
    borderRadius: 1,
    marginLeft: -1,
  },
  lowBang: {
    color: '#fff',
    fontSize: 7,
    fontWeight: 'bold',
    zIndex: 1,
  },
  pct: {
    fontSize: 12,
    fontWeight: '500',
    minWidth: 28,
    textAlign: 'center',
  },
});
