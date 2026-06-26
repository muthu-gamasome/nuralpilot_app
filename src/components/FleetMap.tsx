import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { Colors } from '@/lib/colors';
import type { Hardware } from '@/lib/types';

const DEFAULT_REGION: Region = {
  latitude: 37.403052,
  longitude: -122.049954,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

const STATUS_COLORS: Record<string, string> = {
  online: Colors.onlineGreen,
  offline: Colors.red,
  warning: Colors.warning,
  garage: '#000000',
};

interface Props {
  hardwares: Hardware[];
  selectedHardware: Hardware | null;
  onHardwareSelect: (id: string) => void;
  onHardwareDeselect: () => void;
}

function MarkerPin({ status, label }: { status: string; label: string }) {
  const color = STATUS_COLORS[status] ?? Colors.red;
  return (
    <View style={styles.markerContainer}>
      <View style={[styles.markerBubble, { backgroundColor: color }]}>
        <Text style={styles.markerLabel} numberOfLines={1}>{label}</Text>
      </View>
      <View style={[styles.markerTail, { borderTopColor: color }]} />
    </View>
  );
}

export default function FleetMapView({ hardwares, selectedHardware, onHardwareSelect, onHardwareDeselect }: Props) {
  const mapRef = useRef<MapView>(null);

  // Fly to selected hardware when it changes
  useEffect(() => {
    if (!selectedHardware) return;
    const coords = selectedHardware.coordinates ?? selectedHardware.position;
    if (!coords || (coords.lat === 0 && coords.lng === 0)) return;
    mapRef.current?.animateToRegion(
      {
        latitude: coords.lat,
        longitude: coords.lng,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      },
      600,
    );
  }, [selectedHardware?.id]);

  const markersWithCoords = hardwares.filter((hw) => {
    const c = hw.coordinates ?? hw.position;
    return c && !(c.lat === 0 && c.lng === 0);
  });

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={DEFAULT_REGION}
        customMapStyle={darkMapStyle}
        onPress={onHardwareDeselect}
        showsUserLocation={false}
        showsCompass
        showsScale
      >
        {markersWithCoords.map((hw) => {
          const coords = hw.coordinates ?? hw.position!;
          const isGarage = hw.id === 'garage-home';
          const isSelected = selectedHardware?.id === hw.id;

          return (
            <Marker
              key={hw.id}
              coordinate={{ latitude: coords.lat, longitude: coords.lng }}
              onPress={() => !isGarage && onHardwareSelect(hw.id)}
              anchor={{ x: 0.5, y: 1 }}
              zIndex={isSelected ? 10 : 1}
            >
              <MarkerPin
                status={isGarage ? 'garage' : hw.status}
                label={isGarage ? '🏠' : (hw.aliasName ?? hw.name)}
              />
            </Marker>
          );
        })}
      </MapView>

      {/* Map counter toolbar */}
      <View style={styles.toolbar}>
        <View style={styles.toolbarItem}>
          <View style={[styles.toolbarDot, { backgroundColor: Colors.onlineGreen }]} />
          <Text style={styles.toolbarCount}>
            {hardwares.filter((h) => h.status === 'online').length}
          </Text>
          <Text style={styles.toolbarLabel}>Online</Text>
        </View>
        <View style={styles.toolbarDivider} />
        <View style={styles.toolbarItem}>
          <View style={[styles.toolbarDot, { backgroundColor: Colors.red }]} />
          <Text style={styles.toolbarCount}>
            {hardwares.filter((h) => h.status === 'offline' && h.id !== 'garage-home').length}
          </Text>
          <Text style={styles.toolbarLabel}>Offline</Text>
        </View>
        <View style={styles.toolbarDivider} />
        <View style={styles.toolbarItem}>
          <View style={[styles.toolbarDot, { backgroundColor: Colors.warning }]} />
          <Text style={styles.toolbarCount}>
            {hardwares.filter((h) => h.status === 'warning').length}
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
  markerContainer: {
    alignItems: 'center',
  },
  markerBubble: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    minWidth: 36,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  markerLabel: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    maxWidth: 80,
  },
  markerTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
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
