import React, { useRef, useEffect, useState, useMemo } from 'react';
import { View, Text, Image, StyleSheet, Animated, Easing } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import Svg, { Path, Circle } from 'react-native-svg';
import { Colors } from '@/lib/colors';
import type { Hardware } from '@/lib/types';

const DEFAULT_REGION: Region = {
  latitude: 37.403052,
  longitude: -122.049954,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

// Exact colors from the web app (lib/map-styles.ts → getMarkerColor)
const STATUS_COLORS: Record<string, string> = {
  online: '#33A867',
  offline: '#EF4444',
  warning: '#FFC107',
  garage: '#000000',
};

// Overall pin size. The SVG keeps its 0 0 40 50 viewBox; width/height scale it
// on screen, and the icon/pulse/anchor derive from the same factor so they stay
// aligned. Bump PIN_SCALE to grow the pin (watch for clipping on tall markers).
const PIN_SCALE = 0.9; // overall pin (teardrop) size
const PIN_W = Math.round(40 * PIN_SCALE); // 56
const PIN_H = Math.round(50 * PIN_SCALE); // 70
const ICON = Math.round(22 * PIN_SCALE);  // 31
const PULSE = Math.round(36 * PIN_SCALE); // base pulse diameter

// Transparent box around the pin — gives the breathing pulse room. Increase PAD
// to grow the transparent square. A plain in-flow spacer (boxFill) forces the
// marker to measure the full box, so it renders without clipping.
const PAD = 6;
const BOX_W = PIN_W + PAD * 2;
const BOX_H = PIN_H + PAD * 2;
const PIN_LEFT = PAD;                                     // teardrop offset in box
const PIN_TOP = PAD;
const HEAD_X = PIN_LEFT + PIN_W / 2;                      // white-circle centre x
const HEAD_Y = PIN_TOP + Math.round((18 / 50) * PIN_H);  // white-circle centre y
const ANCHOR = { x: 0.5, y: (PIN_TOP + PIN_H) / BOX_H };  // pin tip on the coordinate

const PIN_ROBOT = require('../../assets/pin-robot.png');
const PIN_GARAGE = require('../../assets/pin-garage.png');
const PIN_BASE_STATION = require('../../assets/pin-base-station.png');

// Pick the pin icon exactly like the web app (lib map-view → createHardwareIcon)
function pinIconForName(name: string) {
  const n = (name ?? '').toLowerCase();
  if (n.includes('garage')) return PIN_GARAGE;
  if (n.includes('base') || n.includes('station')) return PIN_BASE_STATION;
  return PIN_ROBOT; // atv / terrain / everything else
}

interface Props {
  hardwares: Hardware[];
  selectedHardware: Hardware | null;
  onHardwareSelect: (id: string) => void;
  onHardwareDeselect: () => void;
}

// Online "breathing" pulse — ported from the web's createPinHTML keyframes:
// scale 1 → 2.2, opacity 0.3 → 0.05, 4s ease-in-out, infinite, behind the head.
function PulseRing({ color }: { color: string }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(v, {
        toValue: 1,
        duration: 4000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false, // marker bitmap re-rasterizes from JS-thread updates
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);

  return (
    <Animated.View
      style={[
        styles.pulse,
        {
          backgroundColor: color,
          opacity: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.3, 0.05, 0.3] }),
          transform: [{ scale: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.6, 1] }) }],
        },
      ]}
    />
  );
}

// Teardrop pin matching the web app's createPinHTML(): status-colored drop,
// white circle, robot image inside, breathing green pulse for online robots.
function MarkerPin({
  status, isGarage, icon, onImageLoad,
}: {
  status: string;
  isGarage: boolean;
  icon: any;
  onImageLoad?: () => void;
}) {
  const color = STATUS_COLORS[isGarage ? 'garage' : status] ?? '#6B7280';
  const isOnline = status === 'online' && !isGarage;

  return (
    <View style={styles.box}>
      {/* Plain in-flow spacer forces the marker to measure the full box. */}
      <View style={styles.boxFill} />
      {/* Pulse behind the teardrop (online only). */}
      {isOnline && <PulseRing color={color} />}
      <Svg style={styles.svg} width={PIN_W} height={PIN_H} viewBox="0 0 40 50">
        <Path d="M20,50 C20,50 0,35 0,20 A20 20 0 1 1 40 20 C40,35 20,50 20,50 Z" fill={color} />
        <Circle cx={20} cy={18} r={16} fill="white" />
      </Svg>
      <View style={styles.icon}>
        <Image source={icon} style={styles.img} resizeMode="contain" onLoad={onImageLoad} />
      </View>
    </View>
  );
}

// Wrapper so each marker can stop tracking view changes once its image has
// loaded — keeps the map smooth while still rendering the custom pin.
function HardwareMarker({
  hardware, isGarage, isSelected, onSelect,
}: {
  hardware: Hardware;
  isGarage: boolean;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const base = hardware.coordinates ?? hardware.position!;
  // Match the web app: nudge the garage so it never sits exactly on a robot.
  const coords = isGarage ? { lat: base.lat + 0.0003, lng: base.lng - 0.0003 } : base;
  const isOnline = !isGarage && hardware.status === 'online';
  const [tracks, setTracks] = useState(true);
  const [imgLoaded, setImgLoaded] = useState(false);

  // Online pins must keep tracking so their breathing pulse animates. Offline /
  // garage pins rasterize when their colour changes, then freeze.
  //
  // The freeze MUST wait for the robot image to actually load: on Android the
  // marker is snapshotted to a bitmap, and freezing before the SVG teardrop +
  // image finish laying out captures a half-rendered (top-left-clipped) pin.
  // Keying the freeze off the real onLoad — plus a short settle window — instead
  // of a blind timer guarantees the frozen bitmap holds the complete pin.
  useEffect(() => {
    if (isOnline) {
      setTracks(true);
      return;
    }
    setTracks(true);
    if (!imgLoaded) return; // keep tracking until the image is in
    const t = setTimeout(() => setTracks(false), 250);
    return () => clearTimeout(t);
  }, [hardware.status, isOnline, imgLoaded]);

  return (
    <Marker
      coordinate={{ latitude: coords.lat, longitude: coords.lng }}
      onPress={() => !isGarage && onSelect(hardware.id)}
      anchor={ANCHOR}
      zIndex={isSelected ? 10 : isOnline ? 5 : isGarage ? 0 : 1}
      tracksViewChanges={isOnline ? true : tracks}
    >
      <MarkerPin
        status={isGarage ? 'garage' : hardware.status}
        isGarage={isGarage}
        icon={pinIconForName(hardware.name)}
        onImageLoad={() => setImgLoaded(true)}
      />
    </Marker>
  );
}

// Valid coords = present and not the (0,0) null-island placeholder.
function validCoords(hw?: Hardware | null) {
  const c = hw?.coordinates ?? hw?.position;
  if (!c || (c.lat === 0 && c.lng === 0)) return null;
  return c;
}

export default function FleetMapView({ hardwares, selectedHardware, onHardwareSelect, onHardwareDeselect }: Props) {
  const mapRef = useRef<MapView>(null);
  const isReady = useRef(false);

  // Region to focus the selected robot (or first valid one) — mirrors the
  // web app's getInitialCenter() priority so a fresh-mounted map starts there.
  const focusCoords =
    validCoords(selectedHardware) ?? validCoords(hardwares.find((h) => validCoords(h)));

  const initialRegion: Region = focusCoords
    ? { latitude: focusCoords.lat, longitude: focusCoords.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }
    : DEFAULT_REGION;

  const flyTo = (coords: { lat: number; lng: number }, duration = 600) => {
    mapRef.current?.animateToRegion(
      { latitude: coords.lat, longitude: coords.lng, latitudeDelta: 0.005, longitudeDelta: 0.005 },
      duration,
    );
  };

  // Fly to selected hardware whenever it changes (only once the map is ready —
  // animateToRegion is a no-op before the native map initializes).
  useEffect(() => {
    const coords = validCoords(selectedHardware);
    if (!coords || !isReady.current) return;
    flyTo(coords);
  }, [selectedHardware?.id]);

  // One pin per place: the garage always shows; robots are collapsed to a
  // single marker when several sit at the EXACT same coordinates (co-located
  // offline bots). No near-garage hiding — every distinct location is shown.
  // Independent of selection, so clicking a list item never swaps/ghosts a pin.
  const markersWithCoords = useMemo(() => {
    const seen = new Set<string>();
    return hardwares.filter((hw) => {
      const c = validCoords(hw);
      if (!c) return false;
      if (hw.id === 'garage-home') return true; // garage always shown (offset)
      const key = `${c.lat.toFixed(5)},${c.lng.toFixed(5)}`;
      if (seen.has(key)) return false; // another robot already at this spot
      seen.add(key);
      return true;
    });
  }, [hardwares]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={initialRegion}
        customMapStyle={darkMapStyle}
        onPress={onHardwareDeselect}
        onMapReady={() => {
          isReady.current = true;
          const coords = validCoords(selectedHardware);
          if (coords) flyTo(coords, 1);
        }}
        showsUserLocation={false}
        showsCompass
        showsScale
      >
        {markersWithCoords.map((hw) => (
          <HardwareMarker
            key={hw.id}
            hardware={hw}
            isGarage={hw.id === 'garage-home'}
            isSelected={selectedHardware?.id === hw.id}
            onSelect={onHardwareSelect}
          />
        ))}
      </MapView>

      {/* Map counter toolbar */}
      <View style={styles.toolbar}>
        <View style={styles.toolbarItem}>
          <View style={[styles.toolbarDot, { backgroundColor: STATUS_COLORS.online }]} />
          <Text style={styles.toolbarCount}>
            {hardwares.filter((h) => h.status === 'online' && h.id !== 'garage-home').length}
          </Text>
          <Text style={styles.toolbarLabel}>Online</Text>
        </View>
        <View style={styles.toolbarDivider} />
        <View style={styles.toolbarItem}>
          <View style={[styles.toolbarDot, { backgroundColor: STATUS_COLORS.offline }]} />
          <Text style={styles.toolbarCount}>
            {hardwares.filter((h) => h.status === 'offline' && h.id !== 'garage-home').length}
          </Text>
          <Text style={styles.toolbarLabel}>Offline</Text>
        </View>
        <View style={styles.toolbarDivider} />
        <View style={styles.toolbarItem}>
          <View style={[styles.toolbarDot, { backgroundColor: STATUS_COLORS.warning }]} />
          <Text style={styles.toolbarCount}>
            {hardwares.filter((h) => h.status === 'warning' && h.id !== 'garage-home').length}
          </Text>
          <Text style={styles.toolbarLabel}>Warn</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, position: 'relative' },
  map: { flex: 1 },
  box: { width: BOX_W, height: BOX_H },
  boxFill: { width: BOX_W, height: BOX_H }, // in-flow spacer → forces full measurement
  svg: { position: 'absolute', left: PIN_LEFT, top: PIN_TOP },
  icon: {
    position: 'absolute',
    left: PIN_LEFT + (PIN_W - ICON) / 2,
    top: HEAD_Y - ICON / 2,
    width: ICON,
    height: ICON,
    alignItems: 'center',
    justifyContent: 'center',
  },
  img: { width: ICON, height: ICON },
  pulse: {
    position: 'absolute',
    left: HEAD_X - PULSE / 2,
    top: HEAD_Y - PULSE / 2,
    width: PULSE,
    height: PULSE,
    borderRadius: PULSE / 2,
  },
  toolbar: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    backgroundColor: Colors.sidebar,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  toolbarItem: { alignItems: 'center', gap: 2 },
  toolbarDot: { width: 8, height: 8, borderRadius: 4 },
  toolbarCount: { color: Colors.text, fontSize: 15, fontWeight: '700' },
  toolbarLabel: { color: Colors.textSecondary, fontSize: 9 },
  toolbarDivider: { width: 1, height: 28, backgroundColor: Colors.border },
});

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#212121' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#757575' }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#bdbdbd' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#181818' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { featureType: 'poi.park', elementType: 'labels.text.stroke', stylers: [{ color: '#1b1b1b' }] },
  { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#2c2c2c' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8a' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#373737' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3c3c3c' }] },
  { featureType: 'road.highway.controlled_access', elementType: 'geometry', stylers: [{ color: '#4e4e4e' }] },
  { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { featureType: 'transit', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#000000' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3d3d3d' }] },
];
