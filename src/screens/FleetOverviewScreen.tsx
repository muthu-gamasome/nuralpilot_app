import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Modal,
  Pressable,
  Dimensions,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '@/lib/colors';
import FleetSidebar from '@/components/FleetSidebar';
import FleetMapView from '@/components/FleetMap';
import { robotApi } from '@/api/robot';
import { useSocket } from '@/contexts/SocketContext';
import { useAuth } from '@/contexts/AuthContext';
import { useStaleOfflineDetection } from '@/hooks/useStaleOfflineDetection';
import type { Hardware, FleetStats } from '@/lib/types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const IS_TABLET = SCREEN_WIDTH >= 768;

const GARAGE_MARKER: Hardware = {
  id: 'garage-home',
  name: 'garage',
  hardwareClass: 'garage',
  aliasName: 'Garage',
  status: 'online',
  state: 'Garage',
  battery: 100,
  uptime: 0,
  lastPing: new Date(),
  location: 'Home Garage',
  coordinates: {
    lat: parseFloat(process.env.EXPO_PUBLIC_DEFAULT_MAP_LAT ?? '37.403052'),
    lng: parseFloat(process.env.EXPO_PUBLIC_DEFAULT_MAP_LNG ?? '-122.049954'),
  },
  position: {
    lat: parseFloat(process.env.EXPO_PUBLIC_DEFAULT_MAP_LAT ?? '37.403052'),
    lng: parseFloat(process.env.EXPO_PUBLIC_DEFAULT_MAP_LNG ?? '-122.049954'),
    yaw: 0,
  },
  deliveryCount: 0,
  warningCount: 0,
  sequenceId: '',
  yaw: 0,
  online: true,
};

type ViewMode = 'list' | 'map' | 'split';

export default function FleetOverviewScreen() {
  const { socket, isConnected, reconnect } = useSocket();
  const { logout, user } = useAuth();
  const navigation = useNavigation<any>();
  const [hardwares, setHardwares] = useState<Hardware[]>([GARAGE_MARKER]);
  const [selectedHardware, setSelectedHardware] = useState<Hardware | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [executingRobotIds, setExecutingRobotIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>(IS_TABLET ? 'split' : 'list');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userInitials = user?.name
    ? user.name.trim().split(/\s+/).length >= 2
      ? (user.name.trim().split(/\s+/)[0][0] + user.name.trim().split(/\s+/)[1][0]).toUpperCase()
      : user.name.trim().slice(0, 2).toUpperCase()
    : 'NP';

  const hardwaresRef = useRef(hardwares);
  hardwaresRef.current = hardwares;

  // Robots we've already asked the server for live status (avoid re-emitting).
  const statusRequestedRef = useRef<Set<string>>(new Set());

  // Flip robots offline ~2s after their updates stop — exactly like the web.
  useStaleOfflineDetection(setHardwares);

  // ── Fetch robots ──
  const fetchRobots = useCallback(async () => {
    try {
      setIsLoading(true);
      const robots = await robotApi.listRobots();
      setHardwares((prev) => {
        const merged = robots.map((apiHw) => {
          const existing = prev.find((h) => h.id === apiHw.id);
          if (existing) {
            return {
              ...apiHw,
              online: existing.online,
              status: existing.status,
              battery: existing.battery,
              state: existing.state,
              coordinates: existing.coordinates ?? apiHw.coordinates,
              position: existing.position ?? apiHw.position,
              lastPing: existing.lastPing,
              uptime: existing.uptime,
            };
          }
          return apiHw;
        });
        return [GARAGE_MARKER, ...merged];
      });
    } catch {
      // Keep garage marker at minimum
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchRobots(); }, [fetchRobots]);

  // ── Socket events ──
  useEffect(() => {
    if (!socket) return;

    // Server sends a BATCH: { robots: [{ robotId, online, state, battery,
    // location|position, lastUpdated, speed, uptime }, ...] } — same shape the
    // web app consumes. (The old single-robot shape never matched, so nothing
    // ever went online.)
    type RobotStatusUpdate = {
      robotId: string;
      online: boolean;
      state?: string;
      battery?: number;
      location?: { lat: number; lon: number; yaw?: number };
      position?: { lat: number; lon: number; yaw?: number };
      lastUpdated?: string;
      uptime?: number;
    };
    const handleRobotStatus = (data: { robots?: RobotStatusUpdate[] }) => {
      const updates = data?.robots;
      if (!Array.isArray(updates) || updates.length === 0) return;
      setHardwares((prev) =>
        prev.map((hw) => {
          const u = updates.find((r) => r.robotId === hw.id);
          if (!u) return hw;

          const status: Hardware['status'] =
            u.state === 'WARNING' ? 'warning' : u.online ? 'online' : 'offline';

          // Server prefers 'location', falls back to 'position'.
          const sp = u.location ?? u.position;
          const validPos =
            sp && typeof sp.lat === 'number' && typeof sp.lon === 'number' &&
            !(sp.lat === 0 && sp.lon === 0);

          return {
            ...hw,
            online: u.online,
            status,
            battery: u.battery ?? hw.battery,
            state: u.online ? (u.state ?? hw.state) : (hw.state ?? u.state),
            coordinates: validPos ? { lat: sp!.lat, lng: sp!.lon } : hw.coordinates,
            position: validPos ? { lat: sp!.lat, lng: sp!.lon, yaw: sp!.yaw ?? hw.yaw } : hw.position,
            lastPing: u.online ? new Date(u.lastUpdated ?? Date.now()) : (hw.lastPing ?? new Date()),
            uptime: u.uptime ?? hw.uptime,
          };
        }),
      );
    };

    const handleExecutionSync = (data: { robotId: string; executing: boolean }) => {
      setExecutingRobotIds((prev) => {
        const next = new Set(prev);
        data.executing ? next.add(data.robotId) : next.delete(data.robotId);
        return next;
      });
    };

    const handleExecutionInit = (states: { robotId: string; executing: boolean }[]) => {
      const ids = new Set(states.filter((s) => s.executing).map((s) => s.robotId));
      setExecutingRobotIds(ids);
    };

    const requestInitStates = () => socket.emit('execution:request-init');

    socket.on('robot:status', handleRobotStatus);
    socket.on('execution:sync', handleExecutionSync);
    socket.on('execution:init', handleExecutionInit);
    socket.on('connect', requestInitStates);

    if (socket.connected) requestInitStates();

    // On (re)connect, clear the requested set so we re-ask for everyone's status.
    const resetRequested = () => { statusRequestedRef.current = new Set(); };
    socket.on('connect', resetRequested);

    return () => {
      socket.off('robot:status', handleRobotStatus);
      socket.off('execution:sync', handleExecutionSync);
      socket.off('execution:init', handleExecutionInit);
      socket.off('connect', requestInitStates);
      socket.off('connect', resetRequested);
    };
  }, [socket]);

  // Request live status for each robot once it's actually known AND the socket
  // is connected. The previous code emitted at socket-mount time when only the
  // garage existed, so it asked for nothing and every robot stayed offline.
  // (Mirrors the web app's per-robot robot:request_status effect.)
  useEffect(() => {
    if (!socket || !isConnected || hardwares.length === 0) return;
    hardwares.forEach((hw) => {
      if (hw.id === 'garage-home') return;
      if (statusRequestedRef.current.has(hw.id)) return;
      statusRequestedRef.current.add(hw.id);
      socket.emit('robot:request_status', { robotId: hw.id });
    });
  }, [socket, isConnected, hardwares]);

  // ── Fleet stats ──
  const sidebarHardwares = useMemo(
    () => hardwares.filter((h) => h.id !== 'garage-home'),
    [hardwares],
  );

  const fleetStats: FleetStats = useMemo(() => ({
    total: sidebarHardwares.length,
    online: sidebarHardwares.filter((h) => h.status === 'online').length,
    offline: sidebarHardwares.filter((h) => h.status === 'offline').length,
    warning: sidebarHardwares.filter((h) => h.status === 'warning').length,
    inFleet: sidebarHardwares.filter((h) => h.state === 'In Fleet').length,
    maintenance: sidebarHardwares.filter((h) => h.state === 'Maintenance').length,
    totalDeliveries: sidebarHardwares.reduce((s, h) => s + (h.deliveryCount ?? 0), 0),
    averageBattery:
      sidebarHardwares.length > 0
        ? Math.round(sidebarHardwares.reduce((s, h) => s + h.battery, 0) / sidebarHardwares.length)
        : 0,
  }), [sidebarHardwares]);

  const handleHardwareSelect = useCallback((id: string) => {
    const hw = hardwaresRef.current.find((h) => h.id === id);
    setSelectedHardware(hw ?? null);
    // Switch to map view on mobile when a robot is selected
    if (!IS_TABLET) setViewMode('map');
  }, []);

  const handleDeselect = useCallback(() => setSelectedHardware(null), []);

  // ── View mode toggle bar ──
  const renderTabBar = () => {
    if (IS_TABLET) return null;
    return (
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, viewMode === 'list' && styles.tabActive]}
          onPress={() => setViewMode('list')}
        >
          <Text style={[styles.tabText, viewMode === 'list' && styles.tabTextActive]}>☰ List</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, viewMode === 'map' && styles.tabActive]}
          onPress={() => setViewMode('map')}
        >
          <Text style={[styles.tabText, viewMode === 'map' && styles.tabTextActive]}>🗺 Map</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Nav Bar */}
      <View style={styles.navBar}>
        {/* Left: Logo */}
        <Image
          source={require('../../assets/logo.png')}
          style={styles.navLogo}
          resizeMode="contain"
        />

        {/* Right: user button + logout */}
        <View style={styles.navRight}>
          <TouchableOpacity style={styles.userBtn} onPress={() => setShowUserMenu(true)} activeOpacity={0.8}>
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>{userInitials}</Text>
            </View>
            <View style={styles.userBtnInfo}>
              <Text style={styles.userBtnName} numberOfLines={1}>{user?.name ?? 'User'}</Text>
              <Text style={styles.userBtnRole} numberOfLines={1}>{(user as any)?.role ?? 'Member'}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

        </View>
      </View>

      {/* User menu modal */}
      <Modal visible={showUserMenu} transparent animationType="fade" onRequestClose={() => setShowUserMenu(false)}>
        <Pressable style={styles.menuOverlay} onPress={() => setShowUserMenu(false)}>
          <Pressable style={styles.userMenuCard}>
            {/* User info section */}
            <View style={styles.userMenuHeader}>
              <View style={styles.userMenuAvatar}>
                <Text style={styles.userMenuAvatarText}>{userInitials}</Text>
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={styles.userMenuName} numberOfLines={1}>{user?.name ?? 'User'}</Text>
                <Text style={styles.userMenuEmail} numberOfLines={1}>{(user as any)?.email ?? ''}</Text>
              </View>
            </View>

            <View style={styles.menuDivider} />

            {/* Logout row */}
            <TouchableOpacity style={styles.menuLogoutRow} onPress={() => { setShowUserMenu(false); logout(); }} activeOpacity={0.8}>
              <View style={styles.menuLogoutIcon}>
                {/* Logout SVG path as unicode arrow */}
                <Text style={styles.menuLogoutIconText}>⎋</Text>
              </View>
              <Text style={styles.menuLogoutText}>Log out</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Content */}
      {IS_TABLET ? (
        // Tablet: side-by-side split layout
        <View style={styles.splitContainer}>
          <View style={styles.sidebarPanel}>
            <FleetSidebar
              hardwares={sidebarHardwares}
              selectedHardware={selectedHardware}
              fleetStats={fleetStats}
              isLoading={isLoading}
              isConnected={isConnected}
              executingRobotIds={executingRobotIds}
              onHardwareSelect={handleHardwareSelect}
              onReconnect={reconnect}
              onRefresh={fetchRobots}
              onAddRobot={() => navigation.navigate('AddRobot')}
            />
          </View>
          <View style={styles.mapPanel}>
            <FleetMapView
              hardwares={hardwares}
              selectedHardware={selectedHardware}
              onHardwareSelect={handleHardwareSelect}
              onHardwareDeselect={handleDeselect}
            />
          </View>
        </View>
      ) : (
        // Phone: tab-switched list/map
        <View style={styles.flex}>
          {viewMode === 'list' && (
            <FleetSidebar
              hardwares={sidebarHardwares}
              selectedHardware={selectedHardware}
              fleetStats={fleetStats}
              isLoading={isLoading}
              isConnected={isConnected}
              executingRobotIds={executingRobotIds}
              onHardwareSelect={handleHardwareSelect}
              onReconnect={reconnect}
              onRefresh={fetchRobots}
              onAddRobot={() => navigation.navigate('AddRobot')}
            />
          )}
          {viewMode === 'map' && (
            <View style={styles.flex}>
              <FleetMapView
                hardwares={hardwares}
                selectedHardware={selectedHardware}
                onHardwareSelect={handleHardwareSelect}
                onHardwareDeselect={handleDeselect}
              />
              {selectedHardware && (
                <TouchableOpacity
                  style={styles.backToListBtn}
                  onPress={() => { handleDeselect(); setViewMode('list'); }}
                >
                  <Text style={styles.backToListText}>← Back to List</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          {renderTabBar()}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: { flex: 1 },
  navBar: {
    height: 60,
    backgroundColor: 'rgba(25,26,30,0.95)',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  navLogo: {
    width: 110,
    height: 48,
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  connBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
  },
  connDot: { width: 6, height: 6, borderRadius: 3 },
  connText: { fontSize: 11, fontWeight: '600' },
  // User button
  userBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(218,218,218,0.3)',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  userAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#cdcdcd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: { color: '#4e4e4e', fontSize: 10, fontWeight: '700' },
  userBtnInfo: { gap: 1 },
  userBtnName: { color: Colors.text, fontSize: 12, fontWeight: '600', maxWidth: 80 },
  userBtnRole: { color: Colors.textSecondary, fontSize: 10 },
  chevron: { color: Colors.textSecondary, fontSize: 18, marginLeft: 2 },
  // User menu modal
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 70,
    paddingRight: 16,
  },
  userMenuCard: {
    width: 260,
    backgroundColor: '#13141a',
    borderRadius: 15,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2a2b33',
  },
  userMenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    backgroundColor: '#212227',
  },
  userMenuAvatar: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: '#cdcdcd',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  userMenuAvatarText: { color: '#4e4e4e', fontSize: 16, fontWeight: '700' },
  userMenuName: { color: Colors.text, fontSize: 15, fontWeight: '600' },
  userMenuEmail: { color: Colors.textSecondary, fontSize: 12 },
  menuDivider: { height: 1, backgroundColor: '#2a2b33' },
  menuLogoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  menuLogoutIcon: {
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuLogoutIconText: { color: '#D1D1D2', fontSize: 18 },
  menuLogoutText: { color: Colors.text, fontSize: 15 },
  splitContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebarPanel: {
    width: 340,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  mapPanel: { flex: 1 },
  tabBar: {
    height: 52,
    flexDirection: 'row',
    backgroundColor: Colors.sidebar,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabActive: {
    borderTopWidth: 2,
    borderTopColor: Colors.primary,
    backgroundColor: Colors.primaryDim,
  },
  tabText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  backToListBtn: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: Colors.sidebar,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backToListText: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '500',
  },
});
