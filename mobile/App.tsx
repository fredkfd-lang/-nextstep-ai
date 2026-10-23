import React, { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import { useShareIntent } from "expo-share-intent";


type Language = "rw" | "en" | "de" | "fr";
const LANGUAGES: { id: Language; label: string }[] = [
  { id: "rw", label: "Kinyarwanda" },
  { id: "en", label: "English" },
  { id: "de", label: "Deutsch" },
  { id: "fr", label: "Français" },
];
const COPY: Record<Language, Record<string, string>> = {
  rw: {
    subtitle: "Amatsinda · Inama · Umuryango", heroTitle: "Huza itsinda ryawe",
    heroText: "Sangiza ubutumire bw’itsinda ukoresheje Share → Linkora. Link izaza hano mu buryo bwikora iyo app imaze gushyirwaho neza.",
    language: "Ururimi", groupName: "Izina ry’itsinda", namePlaceholder: "Urugero: Inshuti zo mu Budage",
    invite: "Link y’ubutumire bw’itsinda", linkPlaceholder: "Link izaza hano uhisemo Share → Linkora",
    permission: "Ndi admin cyangwa nemerewe na admin gusangiza iyi link.",
    save: "Emeza kandi ubike itsinda", saved: "Amatsinda wabitswe", empty: "Nta tsinda rirabikwa kuri iyi telefoni.",
    remove: "Kuraho", disclaimer: "Icyitonderwa: Linkora ntishobora gusoma amatsinda yawe bwite. Yakira gusa link uhisemo gusangiza. Amakuru abikwa kuri iyi telefoni gusa.",
    initial: "Sangiza invite link ukoresheje Share → Linkora.", loaded: "Twakiriye link. Andika izina ry’itsinda, wemeze uburenganzira, hanyuma ubike.",
    invalidShared: "Twakiriye ibyo wasangije, ariko nta link y’itsinda ishyigikiwe yabonetse.",
    savedStatus: "Itsinda ryabitswe kuri iyi telefoni gusa.", readError: "Ntibyashobotse gusoma amatsinda yabitswe.",
    nameRequired: "Andika izina ry’itsinda.", linkInvalid: "Shyiramo link y’ubutumire itangirana na https://.",
    permissionRequired: "Banza wemeze ko wemerewe gusangiza invite link.", saveError: "Ntibyashobotse kubika itsinda. Ongera ugerageze.",
    removeError: "Ntibyashobotse gukuraho iri tsinda.", nameTitle: "Izina rirakenewe", linkTitle: "Link ntikwiye",
    permissionTitle: "Emeza uburenganzira", errorTitle: "Ikibazo", groupLabel: "Itsinda",
  },
  en: {
    subtitle: "Groups · Meetups · Community", heroTitle: "Connect your group",
    heroText: "Share a group invite using Share → Linkora. The link will appear here automatically once the app is properly installed.",
    language: "Language", groupName: "Group name", namePlaceholder: "Example: Friends in Germany",
    invite: "Group invite link", linkPlaceholder: "The link appears here after Share → Linkora",
    permission: "I’m an admin or have permission from the admin to share this link.",
    save: "Confirm and save group", saved: "Saved groups", empty: "No groups saved on this phone yet.",
    remove: "Remove", disclaimer: "Note: Linkora cannot read your private groups. It only receives links you choose to share. Data is stored on this phone only.",
    initial: "Share an invite link using Share → Linkora.", loaded: "Invite link received. Enter the group name, confirm permission, then save.",
    invalidShared: "Shared content received, but no supported group invite link was found.",
    savedStatus: "Group saved on this phone only.", readError: "Could not load saved groups.",
    nameRequired: "Enter a group name.", linkInvalid: "Enter a valid invite link starting with https://.",
    permissionRequired: "Please confirm you have permission to share this invite link.", saveError: "Could not save the group. Please try again.",
    removeError: "Could not remove this group.", nameTitle: "Group name required", linkTitle: "Invalid link",
    permissionTitle: "Permission required", errorTitle: "Error", groupLabel: "Group",
  },
  de: {
    subtitle: "Gruppen · Treffen · Community", heroTitle: "Gruppe verbinden",
    heroText: "Teile eine Gruppeneinladung über Teilen → Linkora. Der Link erscheint hier automatisch, sobald die App richtig installiert ist.",
    language: "Sprache", groupName: "Gruppenname", namePlaceholder: "Beispiel: Freunde in Deutschland",
    invite: "Einladungslink der Gruppe", linkPlaceholder: "Der Link erscheint nach Teilen → Linkora",
    permission: "Ich bin Admin oder darf den Link mit Erlaubnis des Admins teilen.",
    save: "Bestätigen und Gruppe speichern", saved: "Gespeicherte Gruppen", empty: "Auf diesem Telefon wurden noch keine Gruppen gespeichert.",
    remove: "Entfernen", disclaimer: "Hinweis: Linkora kann deine privaten Gruppen nicht lesen. Die App erhält nur Links, die du selbst teilst. Daten werden nur auf diesem Telefon gespeichert.",
    initial: "Teile einen Einladungslink über Teilen → Linkora.", loaded: "Einladungslink empfangen. Gruppennamen eingeben, Berechtigung bestätigen und speichern.",
    invalidShared: "Geteilte Inhalte empfangen, aber kein unterstützter Gruppeneinladungslink gefunden.",
    savedStatus: "Gruppe nur auf diesem Telefon gespeichert.", readError: "Gespeicherte Gruppen konnten nicht geladen werden.",
    nameRequired: "Bitte einen Gruppennamen eingeben.", linkInvalid: "Bitte einen gültigen Einladungslink mit https:// eingeben.",
    permissionRequired: "Bitte bestätige, dass du den Einladungslink teilen darfst.", saveError: "Gruppe konnte nicht gespeichert werden. Bitte erneut versuchen.",
    removeError: "Gruppe konnte nicht entfernt werden.", nameTitle: "Gruppenname erforderlich", linkTitle: "Ungültiger Link",
    permissionTitle: "Berechtigung erforderlich", errorTitle: "Fehler", groupLabel: "Gruppe",
  },
  fr: {
    subtitle: "Groupes · Rencontres · Communauté", heroTitle: "Connectez votre groupe",
    heroText: "Partagez un lien d’invitation avec Partager → Linkora. Le lien apparaîtra ici automatiquement une fois l’application correctement installée.",
    language: "Langue", groupName: "Nom du groupe", namePlaceholder: "Exemple : Amis en Allemagne",
    invite: "Lien d’invitation du groupe", linkPlaceholder: "Le lien apparaît après Partager → Linkora",
    permission: "Je suis administrateur ou j’ai son autorisation de partager ce lien.",
    save: "Confirmer et enregistrer le groupe", saved: "Groupes enregistrés", empty: "Aucun groupe enregistré sur ce téléphone.",
    remove: "Supprimer", disclaimer: "Remarque : Linkora ne peut pas lire vos groupes privés. L’application reçoit uniquement les liens que vous choisissez de partager. Les données restent sur ce téléphone.",
    initial: "Partagez un lien d’invitation avec Partager → Linkora.", loaded: "Lien reçu. Saisissez le nom du groupe, confirmez l’autorisation, puis enregistrez.",
    invalidShared: "Contenu reçu, mais aucun lien d’invitation de groupe pris en charge n’a été trouvé.",
    savedStatus: "Groupe enregistré uniquement sur ce téléphone.", readError: "Impossible de charger les groupes enregistrés.",
    nameRequired: "Saisissez le nom du groupe.", linkInvalid: "Saisissez un lien d’invitation valide commençant par https://.",
    permissionRequired: "Confirmez que vous êtes autorisé à partager ce lien.", saveError: "Impossible d’enregistrer le groupe. Réessayez.",
    removeError: "Impossible de supprimer ce groupe.", nameTitle: "Nom requis", linkTitle: "Lien invalide",
    permissionTitle: "Autorisation requise", errorTitle: "Erreur", groupLabel: "Groupe",
  },
};

type SavedGroup = { id: string; name: string; link: string; savedAt: string };
const STORAGE_KEY = "linkora.savedWhatsAppGroups.v1";
const INVITE_PATTERN = /https?:\/\/chat\.whatsapp\.com\/[A-Za-z0-9_-]+/i;

function extractInvite(value: string): string {
  return value.match(INVITE_PATTERN)?.[0] ?? "";
}

export default function App() {
  const { hasShareIntent, shareIntent, resetShareIntent, error: shareError } = useShareIntent();
  const [language, setLanguage] = useState<Language>("rw");
  const t = COPY[language];
  const [groupName, setGroupName] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [hasPermission, setHasPermission] = useState(false);
  const [status, setStatus] = useState("Sangiza invite link ukoresheje Share → Linkora.");
  const [savedGroups, setSavedGroups] = useState<SavedGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => setSavedGroups(value ? JSON.parse(value) as SavedGroup[] : []))
      .catch(() => setStatus(t.readError))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!hasShareIntent) return;
    const sharedText = [shareIntent?.webUrl ?? "", shareIntent?.text ?? ""].filter(Boolean).join("\n");
    const invite = extractInvite(sharedText);
    if (invite) {
      setInviteLink(invite);
      setStatus(t.loaded);
    } else {
      setStatus(t.invalidShared);
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
      Alert.alert(t.nameTitle, t.nameRequired);
      return;
    }
    if (!validLink) {
      Alert.alert(t.linkTitle, t.linkInvalid);
      return;
    }
    if (!hasPermission) {
      Alert.alert(t.permissionTitle, t.permissionRequired);
      return;
    }
    const next: SavedGroup[] = [{ id: String(Date.now()), name, link, savedAt: new Date().toISOString() }, ...savedGroups];
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setSavedGroups(next);
      setGroupName("");
      setInviteLink("");
      setHasPermission(false);
      setStatus(t.savedStatus);
    } catch {
      Alert.alert(t.errorTitle, t.saveError);
    }
  }

  async function removeGroup(id: string) {
    const next = savedGroups.filter((group) => group.id !== id);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setSavedGroups(next);
    } catch {
      Alert.alert(t.errorTitle, t.removeError);
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
            <Text style={styles.subtitle}>{t.subtitle}</Text>
          </View>
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroTitle}>{t.heroTitle}</Text>
          <Text style={styles.heroText}>{t.heroText}</Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.label}>Izina ry’itsinda</Text>
          <TextInput value={groupName} onChangeText={setGroupName} placeholder={t.namePlaceholder} style={styles.input} maxLength={100} />
          <Text style={styles.label}>{t.invite}</Text>
          <TextInput value={inviteLink} onChangeText={setInviteLink} placeholder={t.linkPlaceholder} style={styles.input} autoCapitalize="none" keyboardType="url" autoCorrect={false} />
          <Pressable style={styles.checkRow} onPress={() => setHasPermission((v) => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: hasPermission }}>
            <View style={[styles.checkbox, hasPermission && styles.checkboxOn]}>{hasPermission ? <Text style={styles.checkmark}>✓</Text> : null}</View>
            <Text style={styles.checkText}>{t.permission}</Text>
          </Pressable>
          <Pressable style={styles.primaryButton} onPress={saveGroup}>
            <Text style={styles.primaryButtonText}>{t.save}</Text>
          </Pressable>
          <Text style={styles.status}>{shareError ? `Share error: ${String(shareError)}\n` : ""}{status}</Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t.saved}</Text>
          <Text style={styles.count}>{loading ? "…" : String(savedGroups.length)}</Text>
        </View>
        {savedGroups.length === 0 ? (
          <View style={styles.empty}><Text style={styles.emptyText}>{t.empty}</Text></View>
        ) : savedGroups.map((group) => (
          <View style={styles.groupCard} key={group.id}>
            <Text style={styles.groupName}>{group.name}</Text>
            <Text style={styles.groupLink} numberOfLines={2}>{group.link}</Text>
            <Pressable onPress={() => removeGroup(group.id)} style={styles.removeButton}><Text style={styles.removeText}>{t.remove}</Text></Pressable>
          </View>
        ))}
        <Text style={styles.disclaimer}>{t.disclaimer}</Text>
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
  languagePanel: { backgroundColor: "#fff", borderColor: "#e4e9f2", borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 14, gap: 9 },\n  languageRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },\n  languageChip: { borderWidth: 1, borderColor: "#dce3ef", borderRadius: 20, paddingVertical: 8, paddingHorizontal: 11, backgroundColor: "#fff" },\n  languageChipActive: { backgroundColor: "#2459d3", borderColor: "#2459d3" },\n  languageChipText: { color: "#38445c", fontSize: 12, fontWeight: "600" },\n  languageChipTextActive: { color: "#fff" },\n  panel: { backgroundColor: "#fff", borderColor: "#e4e9f2", borderWidth: 1, borderRadius: 18, padding: 17, gap: 10 },
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
