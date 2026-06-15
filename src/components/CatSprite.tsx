import { Canvas, Image as SkiaImage, useImage } from '@shopify/react-native-skia';
import { StyleSheet, View } from 'react-native';

const CAT_IDLE_SHEET = require('../assets/cat/cat_idle_sheet.png');
const FRAME_SIZE = 32;

type CatSpriteProps = {
  size: number;
  frameIndex?: number;
};

export function CatSprite({ size, frameIndex = 0 }: CatSpriteProps) {
  const image = useImage(CAT_IDLE_SHEET);
  const frameX = (frameIndex % 4) * FRAME_SIZE;

  if (!image) {
    return <View style={[styles.placeholder, { width: size, height: size }]} />;
  }

  return (
    <Canvas style={{ width: size, height: size }}>
      <SkiaImage
        image={image}
        x={0}
        y={0}
        width={size}
        height={size}
        fit="fill"
        rect={{ x: frameX, y: 0, width: FRAME_SIZE, height: FRAME_SIZE }}
      />
    </Canvas>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: '#f5dfc8',
  },
});
