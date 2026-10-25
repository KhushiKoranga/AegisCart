import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';
import { formatPrice } from '../utils/format';

export default function ProductCard({ product, onPress }) {
  const soldOut = product.totalStock === 0;
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <Image source={{ uri: product.imageUrl }} style={styles.image} />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>{formatPrice(product.currentPrice)}</Text>
          {product.onSale ? <Text style={styles.oldPrice}>{formatPrice(product.basePrice)}</Text> : null}
        </View>
        {product.onSale ? <Text style={styles.saleTag}>Flash sale</Text> : null}
        {soldOut ? <Text style={styles.soldOut}>Sold out</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, margin: 6, backgroundColor: colors.card, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  image: { width: '100%', aspectRatio: 3 / 4, backgroundColor: colors.border },
  info: { padding: 10, gap: 3 },
  name: { fontSize: 14, fontWeight: '600', color: colors.text },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  price: { fontSize: 15, fontWeight: '700', color: colors.primary },
  oldPrice: { fontSize: 12, color: colors.muted, textDecorationLine: 'line-through' },
  saleTag: { fontSize: 12, color: colors.accent, fontWeight: '600' },
  soldOut: { fontSize: 12, color: colors.danger, fontWeight: '600' },
});
