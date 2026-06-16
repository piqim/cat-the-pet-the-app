import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  Cosmetic,
  CosmeticCategory,
  COSMETIC_CATEGORY_LABELS,
  COSMETIC_CATEGORY_ORDER,
  COSMETICS,
} from '../../data/cosmetics';
import { useCosmeticsStore } from '../../stores/cosmeticsStore';
import { useProgressStore } from '../../stores/progressStore';

type ShopProps = {
  visible: boolean;
  onClose: () => void;
};

type CosmeticStatus = 'equipped' | 'owned' | 'buyable' | 'unaffordable' | 'locked';

export function Shop({ visible, onClose }: ShopProps) {
  const [activeCategory, setActiveCategory] = useState<CosmeticCategory>('scene');
  const points = useProgressStore((state) => state.points);
  const level = useProgressStore((state) => state.level);
  const spendPoints = useProgressStore((state) => state.spendPoints);
  const ownedCosmeticIds = useCosmeticsStore((state) => state.ownedCosmeticIds);
  const equipped = useCosmeticsStore((state) => state.equipped);
  const purchase = useCosmeticsStore((state) => state.purchase);
  const equip = useCosmeticsStore((state) => state.equip);
  const unequip = useCosmeticsStore((state) => state.unequip);

  const items = useMemo(
    () => COSMETICS.filter((item) => item.category === activeCategory),
    [activeCategory],
  );

  const getStatus = (item: Cosmetic): CosmeticStatus => {
    if (equipped[item.slot] === item.id) {
      return 'equipped';
    }

    if (ownedCosmeticIds.includes(item.id)) {
      return 'owned';
    }

    if (level < item.unlockLevel) {
      return 'locked';
    }

    return points >= item.pricePoints ? 'buyable' : 'unaffordable';
  };

  const handlePress = (item: Cosmetic, status: CosmeticStatus) => {
    if (status === 'equipped') {
      // Scenes always need a backdrop; only accessories can be removed.
      if (item.slot !== 'scene') {
        unequip(item.slot);
      }

      return;
    }

    if (status === 'owned') {
      equip(item.slot, item.id);

      return;
    }

    if (status === 'buyable') {
      if (spendPoints(item.pricePoints)) {
        purchase(item.id);
        equip(item.slot, item.id);
      }
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Shop</Text>
              <Text style={styles.subtitle}>Spend points on cozy looks</Text>
            </View>
            <View style={styles.pointsPill}>
              <Text style={styles.pointsText}>{points} pts</Text>
            </View>
          </View>

          <View style={styles.tabs}>
            {COSMETIC_CATEGORY_ORDER.map((category) => {
              const isActive = category === activeCategory;

              return (
                <Pressable
                  key={category}
                  style={[styles.tab, isActive && styles.tabActive]}
                  onPress={() => setActiveCategory(category)}
                >
                  <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                    {COSMETIC_CATEGORY_LABELS[category]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
            {items.map((item) => {
              const status = getStatus(item);

              return (
                <CosmeticCard
                  key={item.id}
                  item={item}
                  status={status}
                  onPress={() => handlePress(item, status)}
                />
              );
            })}
          </ScrollView>

          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

type CosmeticCardProps = {
  item: Cosmetic;
  status: CosmeticStatus;
  onPress: () => void;
};

function CosmeticCard({ item, status, onPress }: CosmeticCardProps) {
  const disabled = status === 'locked' || status === 'unaffordable';

  return (
    <Pressable
      style={[styles.card, status === 'equipped' && styles.cardEquipped, disabled && styles.cardDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={[styles.swatch, { backgroundColor: item.swatch }]}>
        {item.glyph ? <Text style={styles.glyph}>{item.glyph}</Text> : null}
      </View>
      <Text style={styles.cardName} numberOfLines={1}>
        {item.displayName}
      </Text>
      <CardActionLabel item={item} status={status} />
    </Pressable>
  );
}

function CardActionLabel({ item, status }: { item: Cosmetic; status: CosmeticStatus }) {
  switch (status) {
    case 'equipped':
      return <Text style={[styles.cardAction, styles.actionEquipped]}>Equipped</Text>;
    case 'owned':
      return <Text style={[styles.cardAction, styles.actionOwned]}>Tap to wear</Text>;
    case 'buyable':
      return <Text style={[styles.cardAction, styles.actionBuy]}>{item.pricePoints} pts</Text>;
    case 'unaffordable':
      return <Text style={[styles.cardAction, styles.actionLocked]}>{item.pricePoints} pts</Text>;
    case 'locked':
      return <Text style={[styles.cardAction, styles.actionLocked]}>Lvl {item.unlockLevel}</Text>;
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(40, 28, 18, 0.45)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff8ee',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '82%',
    paddingBottom: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    color: '#4a3528',
    fontSize: 24,
    fontWeight: '900',
  },
  subtitle: {
    color: '#7d604d',
    fontSize: 13,
    marginTop: 2,
  },
  pointsPill: {
    backgroundColor: '#ffe6a8',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  pointsText: {
    color: '#4a3528',
    fontSize: 15,
    fontWeight: '800',
  },
  tabs: {
    backgroundColor: '#f0e2cf',
    borderRadius: 14,
    flexDirection: 'row',
    marginTop: 18,
    padding: 4,
  },
  tab: {
    borderRadius: 10,
    flex: 1,
    paddingVertical: 8,
  },
  tabActive: {
    backgroundColor: '#fff8ee',
  },
  tabText: {
    color: '#9a7c64',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  tabTextActive: {
    color: '#4a3528',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingVertical: 18,
  },
  card: {
    alignItems: 'center',
    backgroundColor: '#fffdf8',
    borderColor: '#efe2cf',
    borderRadius: 16,
    borderWidth: 2,
    paddingHorizontal: 10,
    paddingVertical: 14,
    width: '31%',
  },
  cardEquipped: {
    borderColor: '#f2b65a',
  },
  cardDisabled: {
    opacity: 0.55,
  },
  swatch: {
    alignItems: 'center',
    borderRadius: 14,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  glyph: {
    fontSize: 26,
  },
  cardName: {
    color: '#4a3528',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 10,
    textAlign: 'center',
  },
  cardAction: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4,
  },
  actionEquipped: {
    color: '#c98a16',
  },
  actionOwned: {
    color: '#3f8f5b',
  },
  actionBuy: {
    color: '#4a3528',
  },
  actionLocked: {
    color: '#a8917c',
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: '#4a3528',
    borderRadius: 999,
    paddingVertical: 14,
  },
  closeText: {
    color: '#fff2df',
    fontSize: 16,
    fontWeight: '800',
  },
});
