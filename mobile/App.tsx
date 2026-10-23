import React, { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import { useShareIntent } from "expo-share-intent";

type SavedGroup = { id: string; name: string; link: string; savedAt: string };
const STORAGE_KEY = "linkora.savedWhatsAppGroups.v1";
const INVITE_PATTERN = /https?:\/\/chat\.whatsapp\.com\/[A-Za-z0-9_-]+/i;

function extractInvite(value: string): string {
  return value.match(INVITE_PATTERN)?.[0] ?? "";
}

export default function App() {
  const { hasShareIntent, shareIntent, resetShareIntent, error: shareError } = useShareIntent();
  const [groupName, setGroupName] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [hasPermission, setHasPermission] = useState(false);
  const [status, setStatus] = useState("Sangiza WhatsApp group invite link ukoresheje Share → Linkora.");
  const [savedGroups, setSavedGroups] = useState<SavedGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => setSavedGroups(value ? JSON.parse(value) as SavedGroup[] : []))
      .catch(() => setStatus("Ntibyashobotse gusoma amatsinda yabitswe kuri iyi telefoni."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!hasShareIntent) return;
    const sharedText = [shareIntent?.webUrl ?? "", shareIntent?.text ?? ""].filter(Boolean).join("\n");
    const invite = extractInvite(sharedText);
    if (invite) {
      setInviteLink(invite);
      setStatus("Twakiriye invite link ya WhatsApp. Andika izina ry’itsinda, wemeze ko wemerewe kuyisangiza, hanyuma ubike.");
    } else {
      setStatus("Twakiriye ibintu wasangije, ariko nta WhatsApp group invite link ibirimo. Gerageza gusangiza invite link y’itsinda.");
    }
    resetShareIntent();
  }, [hasShareIntent, shareIntent, resetShareIntent]);

  const validLink = useMemo(() => {
    try {
      const url = new URL(inviteLink.trim());
      return url.protocol === "https:" && url.hostname.toLowerCase() === "chat.whatsapp.com";
    } catch {
      return false;
    }
  }, [inviteLink]);

  async function saveGroup() {
    const name = groupName.trim();
    const link = inviteLink.trim();
    if (!name) {
      Alert.alert("Izina rirakenewe", "Andika izina ry’itsinda rya WhatsApp.");
      return;
    }
    if (!validLink) {
      Alert.alert("Link ntikwiye", "Shyiramo WhatsApp invite link itangirwa na https://chat.whatsapp.com/.");
      return;
    }
    if (!hasPermission) {
      Alert.alert("Emeza uburenganzira", "Banza wemeze ko uri admin cyangwa wemerewe n’admin gusangiza invite link.");
      return;
    }
    const next: SavedGroup[] = [{ id: String(Date.now()), name, link, savedAt: new Date().toISOString() }, ...savedGroups];
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setSavedGroups(next);
      setGroupName("");
      setInviteLink("");
      setHasPermission(false);
      setStatus("Itsinda ryabitswe kuri iyi telefoni gusa. Nta banyamuryango ba WhatsApp twakuye mu itsinda.");
    } catch {
      Alert.alert("Ikibazo cyo kubika", "Ntibyashobotse kubika itsinda. Ongera ugerageze.");
    }
  }

  async function removeGroup(id: string) {
    const next = savedGroups.filter((group) => group.id !== id);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setSavedGroups(next);
    } catch {
      Alert.alert("Ikibazo", "Ntibyashobotse gukuraho iri tsinda.");
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.brandRow}>
          <View style={styles.logo}><Text style={styles.logoText}>L</Text></View>
          <View>
            <Text style={styles.brand}>Linkora</Text>
            <Text style={styles.subtitle}>Groups · Meetups · Community</Text>
          </View>
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Huza WhatsApp group</Text>
          <Text style={styles.heroText}>Muri WhatsApp, fungura Group info → Invite via link → Share, hanyuma uhitemo Linkora muri Share menu.</Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.label}>Izina ry’itsinda</Text>
          <TextInput value={groupName} onChangeText={setGroupName} placeholder="Urugero: Inshuti zo mu Budage" style={styles.input} maxLength={100} />
          <Text style={styles.label}>WhatsApp invite link</Text>
          <TextInput value={inviteLink} onChangeText={setInviteLink} placeholder="Izagaragara hano umaze gukoresha Share → Linkora" style={styles.input} autoCapitalize="none" keyboardType="url" autoCorrect={false} />
          <Pressable style={styles.checkRow} onPress={() => setHasPermission((v) => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: hasPermission }}>
            <View style={[styles.checkbox, hasPermission && styles.checkboxOn]}>{hasPermission ? <Text style={styles.checkmark}>✓</Text> : null}</View>
            <Text style={styles.checkText}>Ndi admin cyangwa nemerewe na admin gusangiza iyi invite link.</Text>
          </Pressable>
          <Pressable style={styles.primaryButton} onPress={saveGroup}>
            <Text style={styles.primaryButtonText}>Emeza kandi ubike itsinda</Text>
          </Pressable>
          <Text style={styles.status}>{shareError ? `Share error: ${String(shareError)}\n` : ""}{status}</Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Amatsinda wabitswe</Text>
          <Text style={styles.count}>{loading ? "…" : String(savedGroups.length)}</Text>
        </View>
        {savedGroups.length === 0 ? (
          <View style={styles.empty}><Text style={styles.emptyText}>Nta tsinda rirabikwa kuri iyi telefoni.</Text></View>
        ) : savedGroups.map((group) => (
          <View style={styles.groupCard} key={group.id}>
            <Text style={styles.groupName}>{group.name}</Text>
            <Text style={styles.groupLink} numberOfLines={2}>{group.link}</Text>
            <Pressable onPress={() => removeGroup(group.id)} style={styles.removeButton}><Text style={styles.removeText}>Kuraho</Text></Pressable>
          </View>
        ))}
        <Text style={styles.disclaimer}>Icyitonderwa: Linkora ntishobora gusoma urutonde rw’amatsinda yawe bwite muri WhatsApp. Iyi app yakira gusa link uhisemo gusangiza. Amakuru abikwa kuri iyi telefoni; nta backend cyangwa sync hagati y’abantu irimo.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f5f7fc" },
  container: { padding: 18, paddingBottom: 40, maxWidth: 720, width: "100%", alignSelf: "center" },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  logo: { width: 48, height: 48, borderRadius: 15, backgroundColor: "#2459d3", alignItems: "center", justifyContent: "center" },
  logoText: { color: "#fff", fontSize: 28, fontWeight: "900" },
  brand: { color: "#18233b", fontSize: 26, fontWeight: "900" },
  subtitle: { color: "#68758d", fontSize: 12 },
  hero: { backgroundColor: "#173c99", padding: 22, borderRadius: 20, marginBottom: 16 },
  heroTitle: { color: "#fff", fontSize: 25, fontWeight: "800", marginBottom: 8 },
  heroText: { color: "#eaf0ff", lineHeight: 22 },
  panel: { backgroundColor: "#fff", borderColor: "#e4e9f2", borderWidth: 1, borderRadius: 18, padding: 17, gap: 10 },
  label: { fontWeight: "700", color: "#18233b", marginTop: 4 },
  input: { borderWidth: 1, borderColor: "#dce3ef", borderRadius: 11, paddingHorizontal: 12, paddingVertical: 12, color: "#18233b", backgroundColor: "#fff" },
  checkRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginVertical: 5 },
  checkbox: { width: 22, height: 22, borderWidth: 1, borderColor: "#aab7cb", borderRadius: 6, alignItems: "center", justifyContent: "center" },
  checkboxOn: { backgroundColor: "#2459d3", borderColor: "#2459d3" },
  checkmark: { color: "#fff", fontWeight: "900" },
  checkText: { flex: 1, color: "#38445c", lineHeight: 21 },
  primaryButton: { backgroundColor: "#2459d3", padding: 14, borderRadius: 12, alignItems: "center", marginTop: 3 },
  primaryButtonText: { color: "#fff", fontWeight: "800" },
  status: { color: "#44536d", fontSize: 13, lineHeight: 19, backgroundColor: "#f0f4ff", borderRadius: 10, padding: 11 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 24, marginBottom: 10 },
  sectionTitle: { fontSize: 19, fontWeight: "800", color: "#18233b" },
  count: { color: "#2459d3", fontWeight: "800" },
  empty: { padding: 18, backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#e4e9f2" },
  emptyText: { color: "#68758d" },
  groupCard: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e4e9f2", borderRadius: 14, padding: 14, marginBottom: 10 },
  groupName: { color: "#18233b", fontWeight: "800", fontSize: 16 },
  groupLink: { color: "#68758d", marginTop: 5, fontSize: 12 },
  removeButton: { alignSelf: "flex-start", paddingVertical: 8, paddingHorizontal: 10, backgroundColor: "#fff0f0", borderRadius: 8, marginTop: 8 },
  removeText: { color: "#a11", fontWeight: "700" },
  disclaimer: { color: "#68758d", fontSize: 12, lineHeight: 18, marginTop: 18 }
});
