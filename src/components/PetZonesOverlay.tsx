import { StyleSheet, Text, View } from 'react-native';

import { PET_ZONES, PetZoneId } from '../engine/hitTest';

type PetZonesOverlayProps = {
  size: number;
  activeZoneId?: PetZoneId;
};

export function PetZonesOverlay({ size, activeZoneId }: PetZonesOverlayProps) {
  const scale = size / 32;

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.root]}>
      {PET_ZONES.map((zone) => {
        const bounds = getPolygonBounds(zone.polygon);
        const isActive = zone.id === activeZoneId;

        return (
          <View
            key={zone.id}
            style={[
              styles.zone,
              zone.isNegative && styles.negativeZone,
              isActive && styles.activeZone,
              {
                left: bounds.x * scale,
                top: bounds.y * scale,
                width: bounds.width * scale,
                height: bounds.height * scale,
              },
            ]}
          >
            <Text style={styles.label}>{zone.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

function getPolygonBounds(polygon: { x: number; y: number }[]) {
  const xs = polygon.map((point) => point.x);
  const ys = polygon.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);

  return {
    x: minX,
    y: minY,
    width: Math.max(...xs) - minX,
    height: Math.max(...ys) - minY,
  };
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
  },
  zone: {
    alignItems: 'center',
    borderColor: 'rgba(44, 112, 74, 0.65)',
    borderWidth: 1,
    justifyContent: 'center',
    position: 'absolute',
  },
  activeZone: {
    backgroundColor: 'rgba(255, 214, 102, 0.35)',
  },
  negativeZone: {
    borderColor: 'rgba(181, 70, 70, 0.7)',
  },
  label: {
    color: '#4a3528',
    fontSize: 9,
    fontWeight: '700',
  },
});
