import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import type { StickerRecord } from "@/lib/stickers/types";

const DEMO_GLYPHS: Record<string, string> = {
  "demo-laugh": "😂",
  "demo-love": "🫶",
  "demo-good": "👍",
  "demo-chai": "☕",
  "demo-happy": "😊",
  "demo-yes": "🙌",
  "demo-sad": "🥲",
  "demo-shy": "🙈",
  "demo-angry": "😡",
  "demo-surprise": "🤯",
  "demo-party": "💃",
  "demo-no": "🙅",
};
const CARD_COLORS = ["#F4E8D9", "#E5F2E9", "#EBE5F8", "#F9E5DE", "#E6EFF5", "#F5EDCF"];

type StickerCardProps = {
  sticker: StickerRecord;
  width: number;
  index: number;
  onPress: () => void;
};

export function StickerCard({ sticker, width, index, onPress }: StickerCardProps) {
  const demoGlyph = DEMO_GLYPHS[sticker.id];
  const color = CARD_COLORS[index % CARD_COLORS.length];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${sticker.name}. ${sticker.tags.slice(0, 3).join(", ")}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, { width }, pressed && styles.pressed]}
    >
      <View style={[styles.art, { backgroundColor: color }]}>
        {sticker.uri ? (
          <Image source={{ uri: sticker.uri }} resizeMode="contain" style={styles.image} />
        ) : (
          <Text style={styles.glyph}>{demoGlyph ?? "✨"}</Text>
        )}
        <View style={styles.corner}><Text style={styles.cornerText}>{sticker.source === "demo" ? "TRY" : "STK"}</Text></View>
      </View>
      <View style={styles.copy}>
        <Text numberOfLines={1} style={styles.name}>{sticker.name}</Text>
        <Text numberOfLines={1} style={styles.tags}>{sticker.tags.slice(0, 3).join(" · ") || "Add a tag"}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { overflow: "hidden", borderRadius: 20, borderWidth: 1, borderColor: "#E9E1D8", backgroundColor: "#FFFFFF", marginBottom: 12 },
  pressed: { opacity: 0.88, transform: [{ scale: 0.985 }] },
  art: { position: "relative", width: "100%", aspectRatio: 1.08, justifyContent: "center", alignItems: "center", overflow: "hidden" },
  image: { width: "78%", height: "78%" },
  glyph: { fontSize: 62, includeFontPadding: false },
  corner: { position: "absolute", top: 9, right: 9, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 4, backgroundColor: "rgba(255,249,240,0.88)" },
  cornerText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.8, color: "#6D625B" },
  copy: { paddingHorizontal: 12, paddingVertical: 11 },
  name: { fontSize: 14, fontWeight: "700", color: "#292326" },
  tags: { marginTop: 4, fontSize: 11, color: "#81776F" },
});
