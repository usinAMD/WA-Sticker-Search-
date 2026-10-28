import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BrandMark } from "@/components/stickers/brand-mark";
import { StickerCard } from "@/components/stickers/sticker-card";
import { DEMO_STICKERS } from "@/lib/stickers/demo-data";
import { indexSticker } from "@/lib/stickers/indexing";
import { importStickers } from "@/lib/stickers/import";
import { normalizeText } from "@/lib/stickers/normalize";
import { searchStickers, suggestRelatedStickers } from "@/lib/stickers/search";
import { loadStickers, removeSticker, saveSticker } from "@/lib/stickers/storage";
import { shareSticker } from "@/lib/stickers/share";
import type { ImportMode, StickerRecord } from "@/lib/stickers/types";

const COLORS = {
  paper: "#FFF9F0",
  ink: "#292326",
  muted: "#82776F",
  persimmon: "#F26B4F",
  marigold: "#F4C95D",
  line: "#E9E1D8",
  white: "#FFFFFF",
  mint: "#E5F2E9",
  lilac: "#EBE5F8",
};

const SEARCH_CHIPS = [
  { label: "hansi", query: "hansi", emoji: "😂" },
  { label: "pyaar", query: "pyaar", emoji: "🫶" },
  { label: "अच्छा", query: "अच्छा", emoji: "👍" },
  { label: "chai", query: "chai", emoji: "☕" },
];

type Notice = { message: string; tone: "info" | "success" | "error" } | null;
type TabName = "find" | "library";

function formatCount(count: number): string {
  return `${count} ${count === 1 ? "sticker" : "stickers"}`;
}

function getDemoGlyph(id: string): string {
  const glyphs: Record<string, string> = {
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
  return glyphs[id] ?? "✨";
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [library, setLibrary] = useState<StickerRecord[]>([]);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<TabName>("find");
  const [loadingLibrary, setLoadingLibrary] = useState(true);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [selected, setSelected] = useState<StickerRecord | null>(null);
  const [draftTags, setDraftTags] = useState("");
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  useEffect(() => {
    let mounted = true;
    loadStickers()
      .then((records) => {
        if (mounted) setLibrary(records);
      })
      .catch(() => {
        if (mounted) setNotice({ message: "Your local library could not be opened. Check browser or device storage settings.", tone: "error" });
      })
      .finally(() => {
        if (mounted) setLoadingLibrary(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const isDemo = library.length === 0;
  const source = tab === "library" ? library : isDemo ? DEMO_STICKERS : library;
  const results = useMemo(() => searchStickers(source, query), [source, query]);
  const relatedResults = useMemo(
    () => suggestRelatedStickers(source, query, results),
    [source, query, results],
  );
  const columns = width > 1100 ? 4 : width > 760 ? 3 : 2;
  const gridWidth = Math.min(Math.max(width - 44, 250), 1080);
  const cardWidth = (gridWidth - (columns - 1) * 12) / columns;
  const isAndroid = Platform.OS === "android";
  const hasQuery = Boolean(normalizeText(query));
  const sampleNotice = isDemo && tab === "find";
  const sectionTitle = tab === "library" ? "Your sticker shelf" : hasQuery ? "Closest matches" : "Your next reaction";

  async function handleImport(mode: ImportMode) {
    setNotice(null);
    setImporting(true);
    try {
      const assets = await importStickers(mode);
      if (!assets.length) {
        setNotice({
          message: mode === "folder" ? "No supported images found there. Try the WhatsApp Stickers folder or choose files instead." : "No sticker images were selected.",
          tone: "info",
        });
        return;
      }

      const added: StickerRecord[] = [];
      let failed = 0;
      setProgress({ current: 0, total: assets.length });
      for (let index = 0; index < assets.length; index += 1) {
        setProgress({ current: index + 1, total: assets.length });
        try {
          const record = await indexSticker(assets[index]);
          await saveSticker(record, assets[index].blob);
          added.push(record);
        } catch {
          failed += 1;
        }
      }

      if (added.length) {
        setLibrary((current) => [...added, ...current]);
        setQuery("");
        setTab("library");
        setNotice({
          message: `${formatCount(added.length)} added. Text and tags were indexed locally on this ${Platform.OS === "web" ? "browser" : "device"}.${failed ? ` ${failed} could not be saved.` : ""}`,
          tone: failed ? "info" : "success",
        });
      } else {
        setNotice({ message: "Those files could not be added. Try another image format or a smaller set.", tone: "error" });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "The import did not finish.";
      setNotice({ message, tone: "error" });
    } finally {
      setImporting(false);
      setProgress(null);
    }
  }

  function openSticker(sticker: StickerRecord) {
    setSelected(sticker);
    setDraftTags(sticker.tags.join(", "));
    setConfirmingRemove(false);
  }

  async function handleSaveTags() {
    if (!selected || selected.source !== "imported") return;
    const tags = Array.from(new Set(draftTags.split(/[\n,;]+/).map((tag) => tag.trim()).filter(Boolean))).slice(0, 20);
    const updated = { ...selected, tags };
    try {
      await saveSticker(updated);
      setLibrary((current) => current.map((item) => item.id === updated.id ? updated : item));
      setSelected(updated);
      setNotice({ message: "Tags saved on this device.", tone: "success" });
    } catch {
      setNotice({ message: "Tags could not be saved. Check local storage and try again.", tone: "error" });
    }
  }

  async function handleShare() {
    if (!selected || selected.source !== "imported") return;
    try {
      const result = await shareSticker(selected);
      setNotice({
        message: result === "downloaded" ? "Sticker downloaded. Attach it in WhatsApp when you are ready." : "Choose WhatsApp from the share sheet to send this sticker.",
        tone: "success",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "This sticker could not be shared.";
      setNotice({ message, tone: "error" });
    }
  }

  async function handleRemove() {
    if (!selected || selected.source !== "imported") return;
    try {
      await removeSticker(selected.id);
      setLibrary((current) => current.filter((item) => item.id !== selected.id));
      setSelected(null);
      setConfirmingRemove(false);
      setNotice({ message: "Sticker removed from your local library.", tone: "info" });
    } catch {
      setNotice({ message: "The sticker could not be removed from local storage.", tone: "error" });
    }
  }

  const listHeader = (
    <View style={styles.listHeader}>
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <BrandMark size={44} />
          <View>
            <Text style={styles.wordmark}>stickly</Text>
            <Text style={styles.brandSubtitle}>YOUR STICKER SHELF</Text>
          </View>
        </View>
        <View style={styles.privacyPill}>
          <View style={styles.privacyDot} />
          <Text style={styles.privacyText}>ON DEVICE</Text>
        </View>
      </View>

      <View style={styles.hero}>
        <View style={styles.heroCopy}>
          <Text style={styles.eyebrow}>A BETTER WAY TO REACT</Text>
          <Text style={styles.title}>Find the sticker.{"\n"}Keep the moment.</Text>
          <Text style={styles.subtitle}>Search your own WhatsApp stickers in English, Hinglish, or Hindi.</Text>
        </View>
        {width >= 390 ? (
          <View style={styles.heroBadge}>
            <Text style={styles.heroEmoji}>😌</Text>
            <View style={styles.heroSpark}><Text style={styles.heroSparkText}>✦</Text></View>
          </View>
        ) : null}
      </View>

      <View style={styles.searchCard}>
        <View style={styles.searchRow}>
          <Text style={styles.searchGlyph}>⌕</Text>
          <TextInput
            accessibilityLabel="Search stickers in English, Hinglish, or Hindi"
            value={query}
            onChangeText={setQuery}
            placeholder="Try ‘hansi’, ‘happy’, or ‘हँसी’"
            placeholderTextColor="#9B9189"
            style={styles.searchInput}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setQuery("")} style={styles.clearButton}>
              <Text style={styles.clearText}>×</Text>
            </Pressable>
          ) : null}
        </View>
        <View style={styles.chipRow}>
          {SEARCH_CHIPS.map((chip) => (
            <Pressable key={chip.label} accessibilityRole="button" onPress={() => setQuery(chip.query)} style={({ pressed }) => [styles.searchChip, pressed && styles.pressed]}>
              <Text style={styles.chipEmoji}>{chip.emoji}</Text>
              <Text style={styles.chipLabel}>{chip.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {notice ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Dismiss message" onPress={() => setNotice(null)} style={[styles.notice, notice.tone === "success" ? styles.noticeSuccess : notice.tone === "error" ? styles.noticeError : styles.noticeInfo]}>
          <Text style={styles.noticeText}>{notice.message}</Text>
          <Text style={styles.noticeDismiss}>×</Text>
        </Pressable>
      ) : null}

      {sampleNotice ? (
        <View style={styles.demoBanner}>
          <View style={styles.demoIcon}><Text>✦</Text></View>
          <View style={styles.demoCopy}>
            <Text style={styles.demoTitle}>A tiny sample shelf</Text>
            <Text style={styles.demoText}>Try a search, then import your own for real matches.</Text>
          </View>
          <Text style={styles.demoCount}>12</Text>
        </View>
      ) : null}

      <View style={styles.sectionHeading}>
        <View style={styles.sectionTitleWrap}>
          <Text style={styles.sectionTitle}>{sectionTitle}</Text>
          <Text style={styles.sectionCount}>{loadingLibrary ? "Loading…" : tab === "library" || !isDemo ? formatCount(library.length) : "SAMPLE SET"}</Text>
        </View>
        {isAndroid ? (
          <Pressable disabled={importing} accessibilityRole="button" onPress={() => handleImport("folder")} style={({ pressed }) => [styles.smallAction, pressed && styles.pressed, importing && styles.disabled]}>
            <Text style={styles.smallActionText}>↗ WhatsApp folder</Text>
          </Pressable>
        ) : null}
      </View>

      {importing && progress ? (
        <View style={styles.progressRow}>
          <ActivityIndicator size="small" color={COLORS.persimmon} />
          <Text style={styles.progressText}>Indexing {progress.current} of {progress.total} locally…</Text>
        </View>
      ) : null}
    </View>
  );

  const emptyContent = loadingLibrary && tab === "library" ? (
    <View style={styles.loadingEmpty}>
      <ActivityIndicator color={COLORS.persimmon} />
      <Text style={styles.emptyBody}>Opening your local shelf…</Text>
    </View>
  ) : tab === "library" && library.length === 0 ? (
    <View style={styles.emptyCard}>
      <View style={styles.emptyBadge}><Text style={styles.emptyEmoji}>🧺</Text></View>
      <Text style={styles.emptyTitle}>Your shelf is ready.</Text>
      <Text style={styles.emptyBody}>{isAndroid ? "Browse to Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Stickers (if present), or choose individual sticker files." : "Pick sticker image files from your device. They stay in this browser."}</Text>
      <View style={styles.emptyActions}>
        {isAndroid ? <Pressable accessibilityRole="button" onPress={() => handleImport("folder")} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}><Text style={styles.primaryButtonText}>Choose WhatsApp folder</Text></Pressable> : null}
        <Pressable accessibilityRole="button" onPress={() => handleImport("files")} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}><Text style={styles.secondaryButtonText}>＋ Select sticker files</Text></Pressable>
      </View>
    </View>
  ) : (
    <View style={styles.emptyCard}>
      <View style={[styles.emptyBadge, { backgroundColor: COLORS.lilac }]}><Text style={styles.emptyEmoji}>🧭</Text></View>
      <Text style={styles.emptyTitle}>No close match yet.</Text>
      <Text style={styles.emptyBody}>{relatedResults.length ? "Here are a few neighboring reactions from your shelf. Try another spelling or add a tag to improve the match." : "Try another spelling, switch scripts, or add a tag to one of your stickers."}</Text>
      <View style={styles.emptyChipRow}>
        {SEARCH_CHIPS.slice(0, 3).map((chip) => <Pressable key={chip.label} accessibilityRole="button" onPress={() => setQuery(chip.query)} style={styles.suggestChip}><Text style={styles.suggestChipText}>{chip.emoji} {chip.label}</Text></Pressable>)}
      </View>
    </View>
  );

  const listFooter = (
    <View style={styles.listFooter}>
      {relatedResults.length > 0 ? (
        <View style={styles.relatedSection}>
          <View style={styles.sectionHeading}>
            <View style={styles.sectionTitleWrap}>
              <Text style={styles.sectionTitle}>Related picks</Text>
              <Text style={styles.sectionCount}>FROM YOUR SHELF</Text>
            </View>
          </View>
          <View style={[styles.relatedGrid, { width: gridWidth }]}>
            {relatedResults.map((sticker, index) => (
              <StickerCard key={sticker.id} sticker={sticker} width={cardWidth} index={index + results.length} onPress={() => openSticker(sticker)} />
            ))}
          </View>
        </View>
      ) : null}
      <View style={styles.trustLine}>
        <Text style={styles.trustIcon}>⌂</Text>
        <Text style={styles.trustText}>{tab === "library" ? `Private library · stored only in this ${Platform.OS === "web" ? "browser" : "device"}` : "Your stickers stay yours · no public pack scraping"}</Text>
      </View>
      {Platform.OS === "web" ? <Text style={styles.webOcrNote}>First OCR may download language models; sticker images stay in this browser and are never uploaded.</Text> : null}
    </View>
  );

  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, 10) }]}>
      <FlatList
        key={`sticker-grid-${columns}`}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={results}
        numColumns={columns}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => <StickerCard sticker={item} width={cardWidth} index={index} onPress={() => openSticker(item)} />}
        columnWrapperStyle={styles.gridRow}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={emptyContent}
        ListFooterComponent={listFooter}
        initialNumToRender={columns * 5}
        maxToRenderPerBatch={columns * 6}
        updateCellsBatchingPeriod={45}
        windowSize={7}
        removeClippedSubviews={Platform.OS === "android"}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />

      <View style={[styles.bottomNavWrap, { paddingBottom: Math.max(insets.bottom, Platform.OS === "web" ? 12 : 8) }]}>
        <View style={[styles.bottomNav, { maxWidth: 1080 }]}>
          <Pressable accessibilityRole="button" accessibilityState={{ selected: tab === "find" }} onPress={() => setTab("find")} style={[styles.navItem, tab === "find" && styles.navItemActive]}>
            <Text style={[styles.navIcon, tab === "find" && styles.navIconActive]}>⌕</Text>
            <Text style={[styles.navLabel, tab === "find" && styles.navLabelActive]}>Find</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityState={{ selected: tab === "library" }} onPress={() => setTab("library")} style={[styles.navItem, tab === "library" && styles.navItemActive]}>
            <Text style={[styles.navIcon, tab === "library" && styles.navIconActive]}>▦</Text>
            <Text numberOfLines={1} style={[styles.navLabel, tab === "library" && styles.navLabelActive]}>My shelf{library.length ? ` · ${library.length}` : ""}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" disabled={importing} onPress={() => handleImport("files")} style={({ pressed }) => [styles.navImport, pressed && styles.pressed, importing && styles.disabled]}>
            <Text style={styles.navImportPlus}>＋</Text>
            <Text style={styles.navImportLabel}>Import</Text>
          </Pressable>
        </View>
      </View>

      <Modal transparent visible={Boolean(selected)} animationType="slide" onRequestClose={() => { setSelected(null); setConfirmingRemove(false); }}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalScrim}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => { setSelected(null); setConfirmingRemove(false); }} accessibilityRole="button" accessibilityLabel="Close sticker details" />
          <View style={styles.sheet}>
            <View style={styles.sheetGrabber} />
            {selected ? confirmingRemove ? (
              <View style={styles.confirmContent}>
                <Text style={styles.sheetEyebrow}>REMOVE STICKER</Text>
                <Text style={styles.sheetTitle}>Take it off your shelf?</Text>
                <Text style={styles.sheetBody}>This removes the local copy and its search tags from this device.</Text>
                <View style={styles.sheetActions}>
                  <Pressable accessibilityRole="button" onPress={() => setConfirmingRemove(false)} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Keep it</Text></Pressable>
                  <Pressable accessibilityRole="button" onPress={handleRemove} style={styles.dangerButton}><Text style={styles.primaryButtonText}>Remove</Text></Pressable>
                </View>
              </View>
            ) : (
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <View style={styles.detailArt}>
                  {selected.uri ? <Image source={{ uri: selected.uri }} contentFit="contain" style={styles.detailImage} /> : <Text style={styles.detailEmoji}>{getDemoGlyph(selected.id)}</Text>}
                  <View style={styles.detailStamp}><Text style={styles.detailStampText}>{selected.source === "demo" ? "SAMPLE" : "YOUR STICKER"}</Text></View>
                </View>
                <Text style={styles.sheetEyebrow}>{selected.source === "demo" ? "PREVIEW STICKER" : "LOCAL INDEX"}</Text>
                <Text style={styles.sheetTitle}>{selected.name}</Text>
                <Text style={styles.sheetBody}>{selected.description}</Text>
                {selected.source === "imported" ? (
                  <>
                    <Text style={styles.fieldLabel}>Search tags · separate with commas</Text>
                    <TextInput value={draftTags} onChangeText={setDraftTags} style={styles.tagInput} multiline placeholder="hansi, funny, हँसी" placeholderTextColor="#9B9189" accessibilityLabel="Sticker search tags" />
                    {selected.ocrText ? <Text style={styles.ocrNote}>Read on this device: “{selected.ocrText.slice(0, 90)}{selected.ocrText.length > 90 ? "…" : ""}”</Text> : <Text style={styles.ocrNote}>No text detected. Add a couple of tags to make this easier to find.</Text>}
                    <View style={styles.sheetActions}>
                      <Pressable accessibilityRole="button" onPress={handleSaveTags} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}><Text style={styles.secondaryButtonText}>Save tags</Text></Pressable>
                      <Pressable accessibilityRole="button" onPress={handleShare} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}><Text style={styles.primaryButtonText}>↗ Share to WhatsApp</Text></Pressable>
                    </View>
                    <Pressable accessibilityRole="button" onPress={() => setConfirmingRemove(true)} style={styles.removeLink}><Text style={styles.removeLinkText}>Remove from my library</Text></Pressable>
                  </>
                ) : (
                  <View style={styles.demoModalNote}><Text style={styles.demoModalText}>This sample helps you try search. Import your own sticker to share it from your library.</Text></View>
                )}
              </ScrollView>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.paper },
  list: { flex: 1 },
  listContent: { width: "100%", maxWidth: 1124, alignSelf: "center", paddingHorizontal: 22, paddingTop: 12, paddingBottom: 18 },
  listHeader: { width: "100%" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 30 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  wordmark: { color: COLORS.ink, fontSize: 23, fontWeight: "900", letterSpacing: -1.1, lineHeight: 25 },
  brandSubtitle: { color: COLORS.muted, fontSize: 8, fontWeight: "800", letterSpacing: 1.35, marginTop: 2 },
  privacyPill: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 18, borderWidth: 1, borderColor: "#E7DED4", backgroundColor: "#FFFCF7" },
  privacyDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#69A87A" },
  privacyText: { color: "#6C655D", fontSize: 9, fontWeight: "800", letterSpacing: 1.1 },
  hero: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 22 },
  heroCopy: { flex: 1, maxWidth: 700 },
  eyebrow: { color: COLORS.persimmon, fontSize: 10, fontWeight: "900", letterSpacing: 1.6, marginBottom: 8 },
  title: { color: COLORS.ink, fontSize: 36, lineHeight: 39, fontWeight: "900", letterSpacing: -1.7 },
  subtitle: { maxWidth: 420, marginTop: 9, color: COLORS.muted, fontSize: 14, lineHeight: 20 },
  heroBadge: { width: 88, height: 88, borderRadius: 28, backgroundColor: COLORS.marigold, borderWidth: 1.5, borderColor: COLORS.ink, alignItems: "center", justifyContent: "center", transform: [{ rotate: "5deg" }], marginRight: 5 },
  heroEmoji: { fontSize: 44 },
  heroSpark: { position: "absolute", width: 27, height: 27, borderRadius: 9, backgroundColor: COLORS.persimmon, borderWidth: 1.4, borderColor: COLORS.ink, alignItems: "center", justifyContent: "center", right: -9, top: -7 },
  heroSparkText: { color: COLORS.white, fontSize: 15, fontWeight: "900" },
  searchCard: { borderRadius: 22, padding: 13, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line, shadowColor: "#6A5040", shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 2, marginBottom: 19 },
  searchRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 11, minHeight: 52, borderRadius: 15, backgroundColor: "#F8F4EE" },
  searchGlyph: { width: 30, color: COLORS.persimmon, fontSize: 30, lineHeight: 36, fontWeight: "500", textAlign: "center" },
  searchInput: { flex: 1, minWidth: 0, color: COLORS.ink, fontSize: 15, paddingHorizontal: 7, paddingVertical: 10 },
  clearButton: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#E9E1D8" },
  clearText: { color: COLORS.ink, fontSize: 22, lineHeight: 24 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, paddingTop: 11, paddingHorizontal: 2 },
  searchChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 14, borderWidth: 1, borderColor: "#EFE7DE", backgroundColor: "#FFFCF8" },
  chipEmoji: { fontSize: 12 },
  chipLabel: { color: "#625A54", fontSize: 11, fontWeight: "700" },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.5 },
  notice: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 13, paddingVertical: 11, borderRadius: 14, marginBottom: 15 },
  noticeSuccess: { backgroundColor: "#E4F2E6", borderWidth: 1, borderColor: "#C8E4CE" },
  noticeInfo: { backgroundColor: "#F5EDCF", borderWidth: 1, borderColor: "#EBE0B7" },
  noticeError: { backgroundColor: "#F8E5E0", borderWidth: 1, borderColor: "#F0CBC1" },
  noticeText: { flex: 1, color: COLORS.ink, fontSize: 12, lineHeight: 17 },
  noticeDismiss: { color: COLORS.muted, fontSize: 20, fontWeight: "500" },
  demoBanner: { flexDirection: "row", alignItems: "center", padding: 12, marginBottom: 20, borderRadius: 17, backgroundColor: "#F6EED8", borderWidth: 1, borderColor: "#EDE1C3" },
  demoIcon: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "#FFF9F0", marginRight: 10 },
  demoCopy: { flex: 1 },
  demoTitle: { color: COLORS.ink, fontSize: 12, fontWeight: "800" },
  demoText: { color: COLORS.muted, fontSize: 11, marginTop: 3 },
  demoCount: { color: "#8A7D67", fontSize: 13, fontWeight: "800", paddingHorizontal: 7 },
  sectionHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 3, marginBottom: 12 },
  sectionTitleWrap: { flexDirection: "row", alignItems: "baseline", flexWrap: "wrap", gap: 8 },
  sectionTitle: { color: COLORS.ink, fontSize: 20, fontWeight: "900", letterSpacing: -0.5 },
  sectionCount: { color: COLORS.muted, fontSize: 10, fontWeight: "800", letterSpacing: 0.9 },
  smallAction: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 13, backgroundColor: "#F4E6DE", borderWidth: 1, borderColor: "#EED4C9" },
  smallActionText: { color: "#A14D38", fontSize: 10, fontWeight: "800" },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: COLORS.white, borderRadius: 12, padding: 11, marginBottom: 12 },
  progressText: { color: COLORS.muted, fontSize: 12, fontWeight: "600" },
  gridRow: { justifyContent: "space-between", gap: 12 },
  emptyCard: { borderWidth: 1, borderColor: COLORS.line, borderStyle: "dashed", borderRadius: 24, backgroundColor: "#FFFCF7", paddingHorizontal: 21, paddingVertical: 24, alignItems: "center", marginTop: 4, marginBottom: 14 },
  loadingEmpty: { alignItems: "center", gap: 10, paddingVertical: 40 },
  emptyBadge: { width: 56, height: 56, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.mint, marginBottom: 14 },
  emptyEmoji: { fontSize: 27 },
  emptyTitle: { color: COLORS.ink, fontSize: 20, fontWeight: "900", textAlign: "center" },
  emptyBody: { maxWidth: 380, color: COLORS.muted, fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 7 },
  emptyActions: { width: "100%", maxWidth: 360, gap: 9, marginTop: 18 },
  primaryButton: { minHeight: 46, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 15, backgroundColor: COLORS.persimmon, alignItems: "center", justifyContent: "center" },
  primaryButtonText: { color: COLORS.white, fontSize: 13, fontWeight: "800" },
  secondaryButton: { minHeight: 44, paddingHorizontal: 15, paddingVertical: 11, borderRadius: 15, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line, alignItems: "center", justifyContent: "center" },
  secondaryButtonText: { color: COLORS.ink, fontSize: 13, fontWeight: "800" },
  emptyChipRow: { flexDirection: "row", justifyContent: "center", flexWrap: "wrap", gap: 8, marginTop: 15 },
  suggestChip: { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line },
  suggestChipText: { color: COLORS.ink, fontSize: 11, fontWeight: "700" },
  listFooter: { width: "100%", paddingTop: 4 },
  relatedSection: { marginTop: 9 },
  relatedGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignSelf: "center" },
  trustLine: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, paddingTop: 14, paddingBottom: 4 },
  trustIcon: { color: "#8B8079", fontSize: 14 },
  trustText: { color: "#8B8079", fontSize: 10, fontWeight: "600", textAlign: "center" },
  webOcrNote: { alignSelf: "center", maxWidth: 500, color: "#8B8079", fontSize: 10, lineHeight: 15, textAlign: "center", paddingBottom: 8 },
  bottomNavWrap: { width: "100%", paddingTop: 9, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: COLORS.line, backgroundColor: "rgba(255,249,240,0.98)" },
  bottomNav: { width: "100%", alignSelf: "center", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  navItem: { minWidth: 78, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 9, paddingVertical: 10, borderRadius: 15 },
  navItemActive: { backgroundColor: "#F3E8D8" },
  navIcon: { color: "#958A82", fontSize: 19, lineHeight: 21 },
  navIconActive: { color: COLORS.persimmon },
  navLabel: { color: "#80766E", fontSize: 11, fontWeight: "700" },
  navLabelActive: { color: COLORS.ink },
  navImport: { marginLeft: 2, minWidth: 90, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 16, backgroundColor: COLORS.ink },
  navImportPlus: { color: COLORS.marigold, fontSize: 20, lineHeight: 21, fontWeight: "500" },
  navImportLabel: { color: COLORS.white, fontSize: 11, fontWeight: "800" },
  modalScrim: { flex: 1, justifyContent: "flex-end", alignItems: "center", backgroundColor: "rgba(35,29,25,0.44)" },
  sheet: { width: "100%", maxWidth: 560, maxHeight: "92%", borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: COLORS.paper, paddingHorizontal: 22, paddingBottom: 26, paddingTop: 9, overflow: "hidden" },
  sheetGrabber: { width: 42, height: 4, borderRadius: 3, alignSelf: "center", backgroundColor: "#D8CDC3", marginBottom: 17 },
  detailArt: { width: "100%", height: 205, borderRadius: 21, backgroundColor: "#F1E9DD", alignItems: "center", justifyContent: "center", marginBottom: 18, position: "relative" },
  detailImage: { width: "72%", height: "84%" },
  detailEmoji: { fontSize: 84 },
  detailStamp: { position: "absolute", top: 12, right: 12, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 9, backgroundColor: "#FFF9F0" },
  detailStampText: { color: COLORS.muted, fontSize: 9, fontWeight: "900", letterSpacing: 0.9 },
  sheetEyebrow: { color: COLORS.persimmon, fontSize: 9, letterSpacing: 1.4, fontWeight: "900", marginBottom: 5 },
  sheetTitle: { color: COLORS.ink, fontSize: 23, lineHeight: 28, fontWeight: "900", letterSpacing: -0.5 },
  sheetBody: { color: COLORS.muted, fontSize: 13, lineHeight: 19, marginTop: 6, marginBottom: 15 },
  fieldLabel: { color: COLORS.ink, fontSize: 11, fontWeight: "800", marginBottom: 7 },
  tagInput: { minHeight: 66, maxHeight: 110, textAlignVertical: "top", paddingHorizontal: 13, paddingVertical: 11, borderWidth: 1, borderColor: COLORS.line, borderRadius: 14, color: COLORS.ink, backgroundColor: COLORS.white, fontSize: 13 },
  ocrNote: { color: COLORS.muted, fontSize: 11, lineHeight: 16, marginTop: 8, marginBottom: 12 },
  sheetActions: { flexDirection: "row", alignItems: "center", gap: 9, marginTop: 5 },
  removeLink: { alignSelf: "center", paddingVertical: 13, paddingHorizontal: 12 },
  removeLinkText: { color: "#AA5142", fontSize: 12, fontWeight: "700" },
  demoModalNote: { borderRadius: 14, padding: 13, backgroundColor: "#F6EED8", marginTop: 4 },
  demoModalText: { color: "#6C6255", fontSize: 12, lineHeight: 18 },
  confirmContent: { paddingBottom: 14 },
  dangerButton: { flex: 1, minHeight: 44, paddingHorizontal: 15, paddingVertical: 11, borderRadius: 15, backgroundColor: "#B34B3B", alignItems: "center", justifyContent: "center" },
});
