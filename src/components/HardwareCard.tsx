import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Modal, Pressable, ScrollView, Image,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Colors } from '@/lib/colors';
import DynamicBattery from './DynamicBattery';
import type { Hardware } from '@/lib/types';

interface Alert {
  id: string;
  title: string;
  description: string;
  status: 'low' | 'warning' | 'severe';
  color?: string;
  lastSeen: number;
}

interface Props {
  hardware: Hardware;
  isSelected: boolean;
  onSelect: (id: string) => void;
  isMissionExecuting?: boolean;
}

function formatTime(date: Date): string {
  try {
    const totalSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (totalSeconds < 0) return '0s';
    const totalMinutes = Math.floor(totalSeconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h ago`;
    if (hours > 0) return `${hours}h ${totalMinutes % 60}m ago`;
    if (totalMinutes > 0) return `${totalMinutes}m ago`;
    return `${totalSeconds}s ago`;
  } catch {
    return 'Unknown';
  }
}

function formatUptime(uptime?: number): string {
  if (!uptime || uptime <= 0) return '0 Mins';
  const totalSeconds = Math.floor(uptime);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${totalMinutes % 60}m`;
  if (totalMinutes > 0) return `${totalMinutes}m ${totalSeconds % 60}s`;
  return `${totalSeconds}s`;
}

function WifiIcon({ online }: { online: boolean }) {
  const bg = online ? 'rgba(56,142,60,0.10)' : 'rgba(218,30,40,0.10)';
  const bc = online ? 'rgba(56,142,60,0.50)' : 'rgba(218,30,40,0.50)';

  return (
    <View style={[styles.iconBox, { backgroundColor: bg, borderColor: bc }]}>
      {online ? (
        <Svg width="17" height="18" viewBox="0 0 17 18" fill="none">
          <Path fillRule="evenodd" clipRule="evenodd" d="M8.5 9C9.69426 9 10.9448 9.39579 11.8097 10.2606C12.0842 10.5352 12.0842 10.9804 11.8097 11.255C11.5351 11.5296 11.0899 11.5296 10.8153 11.255C10.2739 10.7136 9.41512 10.4062 8.5 10.4062C7.58488 10.4062 6.72611 10.7136 6.18469 11.255C5.9101 11.5296 5.4649 11.5296 5.19031 11.255C4.91573 10.9804 4.91573 10.5352 5.19031 10.2606C6.05514 9.39579 7.30574 9 8.5 9Z" fill="#388E3C"/>
          <Path fillRule="evenodd" clipRule="evenodd" d="M3.47958 8.1083C6.54471 5.55401 10.6135 5.53596 13.5362 8.1218C13.8271 8.37914 13.8542 8.82352 13.5969 9.11433C13.3396 9.40521 12.8953 9.43235 12.6044 9.17508C10.229 7.07342 6.9397 7.05537 4.37984 9.18858C4.08151 9.43721 3.63815 9.39692 3.38955 9.09858C3.14095 8.80024 3.18125 8.35685 3.47958 8.1083Z" fill="#388E3C"/>
          <Path fillRule="evenodd" clipRule="evenodd" d="M8.50002 3.02344C11.098 3.02342 13.6595 4.03813 15.9849 6.00177C16.2816 6.25231 16.319 6.69592 16.0685 6.99262C15.8179 7.28932 15.3743 7.32673 15.0776 7.0762C12.9623 5.28993 10.7128 4.42968 8.50002 4.42969C6.28718 4.42969 4.03779 5.28996 1.92241 7.07627C1.62572 7.32681 1.18209 7.2894 0.931556 6.9927C0.681016 6.69601 0.718431 6.25239 1.01512 6.00185C3.34054 4.03818 5.902 3.02345 8.50002 3.02344Z" fill="#388E3C"/>
          <Path fillRule="evenodd" clipRule="evenodd" d="M6.91797 13.2227C6.91797 12.349 7.6263 11.6406 8.5 11.6406C9.3737 11.6406 10.082 12.349 10.082 13.2227C10.082 14.0964 9.3737 14.8047 8.5 14.8047C7.6263 14.8047 6.91797 14.0964 6.91797 13.2227Z" fill="#388E3C"/>
        </Svg>
      ) : (
        <Svg width="17" height="16" viewBox="0 0 17 16" fill="none">
          <Path fillRule="evenodd" clipRule="evenodd" d="M5.74239 9.17325C6.60807 8.31973 7.67601 7.91069 8.88529 8.01634C9.24629 8.04784 9.51345 8.36612 9.48188 8.72719C9.45032 9.08826 9.13204 9.35542 8.77097 9.32386C7.96463 9.25337 7.26999 9.5103 6.66387 10.1079C6.40578 10.3623 5.99027 10.3594 5.73581 10.1013C5.48135 9.84321 5.4843 9.42767 5.74239 9.17325Z" fill="#DA1E28"/>
          <Path fillRule="evenodd" clipRule="evenodd" d="M8.83583 5.93169C8.89089 5.57346 9.22591 5.32766 9.58415 5.3827C10.9059 5.58577 12.1486 6.24963 13.2006 7.18036C13.472 7.42055 13.4974 7.8353 13.2573 8.10672C13.0171 8.37822 12.6023 8.40355 12.3309 8.16336C11.4238 7.36083 10.4056 6.83682 9.38485 6.67998C9.0266 6.62495 8.78077 6.28992 8.83583 5.93169Z" fill="#DA1E28"/>
          <Path fillRule="evenodd" clipRule="evenodd" d="M7.15296 6.14941C7.26901 6.49276 7.08476 6.86521 6.74142 6.98124C6.02322 7.22398 5.31568 7.62521 4.65451 8.1762C4.37608 8.40825 3.96228 8.37058 3.73024 8.0922C3.49822 7.81376 3.53584 7.39992 3.81427 7.16787C4.58766 6.52341 5.43544 6.03724 6.32112 5.73786C6.66447 5.6218 7.0369 5.80606 7.15296 6.14941Z" fill="#DA1E28"/>
          <Path fillRule="evenodd" clipRule="evenodd" d="M6.73244 2.58995C9.73752 2.01586 12.7785 2.91878 15.4821 5.20183C15.759 5.43566 15.7939 5.8497 15.5601 6.12662C15.3263 6.40353 14.9122 6.43846 14.6353 6.20462C12.1831 4.13391 9.53369 3.39103 6.97873 3.87913C6.62274 3.94714 6.279 3.71368 6.211 3.35769C6.14298 3.00168 6.37644 2.65796 6.73244 2.58995Z" fill="#DA1E28"/>
          <Path fillRule="evenodd" clipRule="evenodd" d="M4.82136 3.76135C4.98345 4.08552 4.85204 4.47971 4.52788 4.6418C3.94712 4.93217 3.16081 5.52138 2.36091 6.19685C2.084 6.43069 1.66995 6.39577 1.43612 6.11885C1.20228 5.84194 1.2372 5.4279 1.51411 5.19406C2.32084 4.51283 3.20916 3.83374 3.94091 3.46786C4.26508 3.30578 4.65927 3.43717 4.82136 3.76135Z" fill="#DA1E28"/>
          <Path fillRule="evenodd" clipRule="evenodd" d="M1.47346 0.981272C1.72974 0.724993 2.14526 0.724993 2.40154 0.981272L15.5265 14.1063C15.7828 14.3625 15.7828 14.7781 15.5265 15.0343C15.2703 15.2906 14.8547 15.2906 14.5985 15.0343L1.47346 1.90935C1.21718 1.65307 1.21718 1.23756 1.47346 0.981272Z" fill="#DA1E28"/>
          <Path d="M8.5 10.625C7.77511 10.625 7.1875 11.2126 7.1875 11.9375C7.1875 12.6624 7.77511 13.25 8.5 13.25C9.22489 13.25 9.8125 12.6624 9.8125 11.9375C9.8125 11.2126 9.22489 10.625 8.5 10.625Z" fill="#DA1E28"/>
        </Svg>
      )}
    </View>
  );
}

export default function HardwareCard({ hardware, isSelected, onSelect, isMissionExecuting = false }: Props) {
  const [showAlerts, setShowAlerts] = useState(false);
  const [liveAlerts, setLiveAlerts] = useState<Alert[]>([]);

  const isOnline = hardware.online ?? false;
  const staticAlertCount = (hardware.alerts?.length ?? 0) || (hardware.warningCount ?? 0);
  const hasAlerts = liveAlerts.length > 0 || staticAlertCount > 0;
  const alertCount = liveAlerts.length || staticAlertCount;

  // Clean up stale live alerts after 2s
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setLiveAlerts(prev => prev.filter(a => (now - a.lastSeen) < 2000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const timeDisplay = hardware.status === 'offline'
    ? formatTime(hardware.lastPing)
    : hardware.uptime
    ? formatUptime(hardware.uptime)
    : formatTime(hardware.lastPing);

  const alertsToShow: Array<{ title: string; message: string; level: string; color?: string }> = liveAlerts.length
    ? liveAlerts.map(a => ({ title: a.title, message: a.description, level: a.status.toUpperCase(), color: a.color }))
    : (hardware.alerts ?? []);

  return (
    <>
      <TouchableOpacity
        style={[styles.card, isSelected && styles.cardSelected]}
        onPress={() => onSelect(hardware.id)}
        activeOpacity={0.85}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          {/* Robot image */}
          {hardware.source ? (
            <Image source={{ uri: hardware.source }} style={styles.robotImg} resizeMode="cover" />
          ) : (
            <View style={styles.robotImgPlaceholder}>
              <Text style={styles.robotPlaceholderText}>🤖</Text>
            </View>
          )}

          {/* Info column */}
          <View style={styles.infoCol}>
            {/* Class + Sim badges */}
            <View style={styles.badgeRow}>
              {!!hardware.hardwareClass && (
                <View style={styles.classBadge}>
                  <Text style={styles.classBadgeText}>
                    {hardware.hardwareClass.charAt(0).toUpperCase() + hardware.hardwareClass.slice(1).toLowerCase()}
                  </Text>
                </View>
              )}
              {hardware.simulated && (
                <View style={styles.simBadge}>
                  <Text style={styles.simBadgeText}>Sim</Text>
                </View>
              )}
            </View>
            <Text style={styles.aliasName} numberOfLines={1}>{hardware.aliasName}</Text>
            <Text style={styles.hwName} numberOfLines={1}>
              {hardware.simulated ? `[sim]${hardware.name}` : hardware.name}
            </Text>
          </View>

          {/* Right icons */}
          <View style={styles.iconsCol}>
            {isMissionExecuting && (
              <View style={[styles.iconBox, { backgroundColor: Colors.primaryDim, borderColor: Colors.primaryBorder }]}>
                <View style={styles.missionDot} />
              </View>
            )}
            {hasAlerts && (
              <TouchableOpacity
                style={[styles.iconBox, { backgroundColor: Colors.inputBg, borderColor: Colors.borderLight }]}
                onPress={(e) => { e.stopPropagation?.(); setShowAlerts(true); }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                  <Text style={{ fontSize: 8 }}>⚠️</Text>
                  <Text style={styles.alertCountText}>{alertCount}</Text>
                </View>
              </TouchableOpacity>
            )}
            <WifiIcon online={isOnline} />
          </View>
        </View>

        {/* ── Stats Row ── */}
        <View style={styles.statsRow}>
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>{hardware.status === 'offline' ? 'Last Ping' : 'Up time'}</Text>
            <Text style={[styles.statValue, hardware.status === 'offline' && { color: Colors.red }]} numberOfLines={1}>
              {timeDisplay}
            </Text>
          </View>
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>State</Text>
            <Text style={styles.statValue} numberOfLines={1}>{hardware.state}</Text>
          </View>
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>Seq ID</Text>
            <Text style={styles.statValue} numberOfLines={1}>{String(hardware.sequenceId ?? '')}</Text>
          </View>
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <DynamicBattery batteryLevel={hardware.battery ?? 0} />
        </View>
      </TouchableOpacity>

      {/* Alert popup modal */}
      <Modal visible={showAlerts} transparent animationType="fade" onRequestClose={() => setShowAlerts(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowAlerts(false)}>
          <Pressable style={styles.alertModal}>
            <View style={styles.alertHeader}>
              <Text style={styles.alertHeaderTitle}>Alerts</Text>
              <TouchableOpacity onPress={() => setShowAlerts(false)}>
                <Text style={styles.closeX}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.alertScroll} showsVerticalScrollIndicator={false}>
              {alertsToShow.length === 0 && (
                <Text style={styles.noAlerts}>No alert details available.</Text>
              )}
              {alertsToShow.map((alert, i) => {
                const c = alert.color ?? (alert.level === 'SEVERE' ? '#FF4040' : alert.level === 'WARNING' ? '#FFC107' : '#FEA500');
                return (
                  <View key={i} style={styles.alertRow}>
                    <View style={{ flex: 1, gap: 6 }}>
                      <Text style={[styles.alertTitle, { color: c }]}>{alert.title}</Text>
                      <Text style={styles.alertMessage}>{alert.message}</Text>
                    </View>
                    <View style={[styles.alertBadge, { borderColor: c, backgroundColor: `${c}1A` }]}>
                      <Text style={[styles.alertBadgeText, { color: c }]}>{String(alert.level).toUpperCase()}</Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cardSelected: {
    borderColor: Colors.primaryBorder,
    backgroundColor: 'rgba(76,175,80,0.05)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    paddingBottom: 6,
    gap: 10,
  },
  robotImg: {
    width: 60,
    height: 60,
    borderRadius: 8,
    flexShrink: 0,
  },
  robotImgPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#464646',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  robotPlaceholderText: { fontSize: 28 },
  infoCol: {
    flex: 1,
    gap: 3,
    minWidth: 0,
    paddingTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  classBadge: {
    backgroundColor: Colors.primaryDim,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  classBadgeText: { color: Colors.primary, fontSize: 10, fontWeight: '600' },
  simBadge: {
    backgroundColor: 'rgba(59,130,246,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.30)',
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  simBadgeText: { color: '#3b82f6', fontSize: 10, fontWeight: '600' },
  aliasName: { color: Colors.text, fontSize: 15, fontWeight: '600' },
  hwName: { color: Colors.textSecondary, fontSize: 11 },
  iconsCol: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'flex-start',
    paddingTop: 2,
    flexShrink: 0,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  missionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  alertCountText: { color: Colors.warning, fontSize: 11, fontWeight: '700' },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
  },
  statCol: { flex: 1, gap: 4, minWidth: 0 },
  statLabel: { color: Colors.textSecondary, fontSize: 10 },
  statValue: { color: Colors.text, fontSize: 13, fontWeight: '600' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#313447',
  },
  // Alert modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.70)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  alertModal: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#191a1e',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#3b3e51',
    maxHeight: 300,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#3b3e51',
  },
  alertHeaderTitle: { color: Colors.text, fontSize: 18, fontWeight: '600' },
  closeX: { color: Colors.textSecondary, fontSize: 20 },
  alertScroll: { padding: 10 },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.sidebar,
    borderRadius: 8,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  alertTitle: { fontSize: 14, fontWeight: '500' },
  alertMessage: { color: '#b2b9ca', fontSize: 12 },
  alertBadge: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 4,
    borderWidth: 1,
  },
  alertBadgeText: { fontSize: 8, fontWeight: '700' },
  noAlerts: { color: Colors.textSecondary, textAlign: 'center', padding: 16 },
});
