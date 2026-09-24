import React, { useMemo, useState } from "react";
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { auth, db, storage, firebaseConfigured } from "./firebase";
import * as DocumentPicker from "expo-document-picker";

const JOBS = [
  { id: "1", title: "Fachlagerist (m/w/d)", company: "BerOpp Demo Unternehmen", location: "Hamburg", type: "Ausbildung", tags: ["Lager", "Staplerschein"] },
  { id: "2", title: "Fachkraft für Lagerlogistik (m/w/d)", company: "Logistik Hamburg GmbH", location: "Harburg", type: "Ausbildung", tags: ["Logistik", "2027"] },
  { id: "3", title: "Elektroniker für Betriebstechnik (m/w/d)", company: "Nord Technik GmbH", location: "Hamburg", type: "Ausbildung", tags: ["Elektro", "Technik"] },
  { id: "4", title: "Lagerhelfer (m/w/d)", company: "Hamburg Logistics", location: "Neu Wulmstorf", type: "Job", tags: ["Lager", "Vollzeit"] }
];

export default function App() {
  const [screen, setScreen] = useState("home");
  const [query, setQuery] = useState("");
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const loggedIn = !!user;
  const [saved, setSaved] = useState([]);
  const [applied, setApplied] = useState([]);
  const [cv, setCv] = useState(null);

  React.useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, setUser);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return JOBS;
    return JOBS.filter(j => [j.title, j.company, j.location, j.type, ...j.tags].join(" ").toLowerCase().includes(q));
  }, [query]);

  const openLogin = () => setScreen("login");

  const requireLogin = (action) => {
    if (!loggedIn) {
      Alert.alert("Konto erforderlich", "Bitte erst kostenlos anmelden oder einloggen.");
      setScreen("login");
      return;
    }
    action();
  };

  const toggleSave = (id) => requireLogin(() => {
    setSaved(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  });

  const apply = (id) => requireLogin(() => {
    if (!applied.includes(id)) setApplied(a => [...a, id]);
    Alert.alert("Bewerbung", "Die Bewerbung wurde in deinem BerOpp-Konto gespeichert.");
  });

  const saveProfile = async () => {
    if (!user || !db) return;
    await setDoc(doc(db, "users", user.uid), { email: user.email || "", updatedAt: new Date().toISOString() }, { merge: true });
  };

  const submitAuth = async () => {
    if (!firebaseConfigured) {
      Alert.alert("Firebase noch nicht verbunden", "Die App-Struktur ist bereit. Firebase-Werte müssen noch in mobile/.env eingetragen werden.");
      return;
    }
    try {
      const result = authMode === "login"
        ? await signInWithEmailAndPassword(auth, email.trim(), password)
        : await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (authMode === "register" && db) await setDoc(doc(db, "users", result.user.uid), { email: result.user.email, createdAt: new Date().toISOString() }, { merge: true });
      setScreen("profile");
    } catch (error) {
      Alert.alert("Anmeldung fehlgeschlagen", error?.message || "Bitte prüfe E-Mail und Passwort.");
    }
  };

  const pickCV = async () => {
    if (!loggedIn) return openLogin();
    const result = await DocumentPicker.getDocumentAsync({ type: "application/pdf", copyToCacheDirectory: true });
    if (!result.canceled) {
      const asset = result.assets[0];
      setCv(asset);
      if (firebaseConfigured && user && storage) {
        try {
          const blob = await (await fetch(asset.uri)).blob();
          const fileRef = ref(storage, `users/${user.uid}/cv/${asset.name || "cv.pdf"}`);
          await uploadBytes(fileRef, blob, { contentType: "application/pdf" });
          const url = await getDownloadURL(fileRef);
          if (db) await setDoc(doc(db, "users", user.uid), { cvName: asset.name || "cv.pdf", cvUrl: url, updatedAt: new Date().toISOString() }, { merge: true });
          Alert.alert("CV gespeichert", "Dein CV wurde in deinem BerOpp-Konto gespeichert.");
        } catch (error) {
          Alert.alert("CV Upload", "Die Datei wurde lokal ausgewählt, aber der Firebase-Upload ist noch nicht vollständig konfiguriert.");
        }
      }
    }
  };

  const jobs = screen === "ausbildung" ? filtered.filter(j => j.type === "Ausbildung") : filtered;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.logo}>BerOpp</Text>
          <Text style={styles.tagline}>Find your next opportunity</Text>
        </View>
        <TouchableOpacity style={styles.accountBtn} onPress={() => setScreen(loggedIn ? "profile" : "login")}>
          <Text style={styles.accountText}>{loggedIn ? "Profil" : "Login"}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {screen === "home" && (
          <>
            <Text style={styles.heroTitle}>Deine nächste Chance beginnt hier.</Text>
            <Text style={styles.muted}>Jobs, Ausbildung und internationale Möglichkeiten an einem Ort.</Text>
            <TextInput value={query} onChangeText={setQuery} placeholder="Job, Ausbildung oder Ort suchen..." style={styles.search} />
            <View style={styles.row}>
              <Action title="Jobs" onPress={() => setScreen("jobs")} />
              <Action title="Ausbildung" onPress={() => setScreen("ausbildung")} />
            </View>
            <Action title="International" secondary onPress={() => Alert.alert("International", "Internationale Chancen werden als nächster Bereich ergänzt.")} />
            <SectionTitle title="Aktuelle Möglichkeiten" />
            {filtered.slice(0, 3).map(job => <JobCard key={job.id} job={job} saved={saved.includes(job.id)} applied={applied.includes(job.id)} onSave={() => toggleSave(job.id)} onApply={() => apply(job.id)} />)}
          </>
        )}

        {(screen === "jobs" || screen === "ausbildung") && (
          <>
            <Text style={styles.pageTitle}>{screen === "jobs" ? "Jobs" : "Ausbildung"}</Text>
            <TextInput value={query} onChangeText={setQuery} placeholder="Suchen..." style={styles.search} />
            {jobs.map(job => <JobCard key={job.id} job={job} saved={saved.includes(job.id)} applied={applied.includes(job.id)} onSave={() => toggleSave(job.id)} onApply={() => apply(job.id)} />)}
          </>
        )}

        {screen === "saved" && (
          <>
            <Text style={styles.pageTitle}>Gespeichert</Text>
            {JOBS.filter(j => saved.includes(j.id)).map(job => <JobCard key={job.id} job={job} saved applied={applied.includes(job.id)} onSave={() => toggleSave(job.id)} onApply={() => apply(job.id)} />)}
            {!saved.length && <Empty text="Noch keine Stellen gespeichert." />}
          </>
        )}

        {screen === "applications" && (
          <>
            <Text style={styles.pageTitle}>Meine Bewerbungen</Text>
            {JOBS.filter(j => applied.includes(j.id)).map(job => (
              <View style={styles.card} key={job.id}>
                <Text style={styles.cardTitle}>{job.title}</Text>
                <Text style={styles.muted}>{job.company} · {job.location}</Text>
                <Text style={styles.status}>Gesendet</Text>
              </View>
            ))}
            {!applied.length && <Empty text="Noch keine Bewerbungen." />}
          </>
        )}

        {screen === "profile" && (
          <>
            <Text style={styles.pageTitle}>Mein Profil</Text>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{loggedIn ? "BerOpp Konto" : "Noch nicht angemeldet"}</Text>
              <Text style={styles.muted}>{loggedIn ? "Dein Profil und CV werden hier verwaltet." : "Melde dich an, um Bewerbungen und CV zu speichern."}</Text>
              {!loggedIn && <Action title="Anmelden / Registrieren" onPress={openLogin} />}
            </View>
            {loggedIn && <View style={styles.card}>
              <Text style={styles.cardTitle}>Lebenslauf (PDF)</Text>
              <Text style={styles.muted}>{cv ? cv.name : "Noch kein CV hochgeladen."}</Text>
              <Action title={cv ? "CV ändern" : "CV hochladen"} onPress={pickCV} />
              <Action title="Abmelden" secondary onPress={() => auth && signOut(auth)} />
            </View>}
          </>
        )}

        {screen === "login" && (
          <View style={styles.login}>
            <Text style={styles.pageTitle}>BerOpp Konto</Text>
            <Text style={styles.muted}>Kostenlos anmelden und Jobs, Bewerbungen und CV an einem Ort speichern.</Text>
            <TextInput value={email} onChangeText={setEmail} placeholder="E-Mail" keyboardType="email-address" autoCapitalize="none" style={styles.input} />
            <TextInput value={password} onChangeText={setPassword} placeholder="Passwort" secureTextEntry style={styles.input} />
            <Action title={authMode === "login" ? "Einloggen" : "Konto erstellen"} onPress={submitAuth} />
            <Action title={authMode === "login" ? "Neu bei BerOpp? Registrieren" : "Ich habe bereits ein Konto"} secondary onPress={() => setAuthMode(authMode === "login" ? "register" : "login")} />
            <Text style={styles.muted}>{firebaseConfigured ? "Firebase ist verbunden." : "Firebase-Konfiguration fehlt noch in der mobilen Entwicklungsumgebung."}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.nav}>
        <Nav title="Home" active={screen === "home"} onPress={() => setScreen("home")} />
        <Nav title="Jobs" active={screen === "jobs"} onPress={() => setScreen("jobs")} />
        <Nav title="Gespeichert" active={screen === "saved"} onPress={() => setScreen("saved")} />
        <Nav title="Bewerbungen" active={screen === "applications"} onPress={() => setScreen("applications")} />
        <Nav title="Profil" active={screen === "profile"} onPress={() => setScreen("profile")} />
      </View>
    </SafeAreaView>
  );
}

function JobCard({ job, saved, applied, onSave, onApply }) {
  return (
    <View style={styles.card}>
      <View style={styles.badgeRow}><Text style={styles.badge}>{job.type}</Text><Text style={styles.location}>{job.location}</Text></View>
      <Text style={styles.cardTitle}>{job.title}</Text>
      <Text style={styles.muted}>{job.company}</Text>
      <View style={styles.tagRow}>{job.tags.map(t => <Text style={styles.tag} key={t}>{t}</Text>)}</View>
      <View style={styles.row}>
        <TouchableOpacity style={styles.smallBtn} onPress={onSave}><Text>{saved ? "★ Gespeichert" : "☆ Speichern"}</Text></TouchableOpacity>
        <TouchableOpacity style={styles.smallBtnPrimary} onPress={onApply}><Text style={styles.white}>{applied ? "Bewerbung gesendet" : "Bewerben"}</Text></TouchableOpacity>
      </View>
    </View>
  );
}

function Action({ title, onPress, secondary }) {
  return <TouchableOpacity style={[styles.action, secondary && styles.secondary]} onPress={onPress}><Text style={[styles.actionText, secondary && styles.secondaryText]}>{title}</Text></TouchableOpacity>;
}
function Nav({ title, onPress, active }) {
  return <TouchableOpacity onPress={onPress}><Text style={[styles.navText, active && styles.navActive]}>{title}</Text></TouchableOpacity>;
}
function SectionTitle({ title }) { return <Text style={styles.section}>{title}</Text>; }
function Empty({ text }) { return <View style={styles.empty}><Text style={styles.muted}>{text}</Text></View>; }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f4f7fb" },
  header: { backgroundColor: "#4f46e5", paddingHorizontal: 18, paddingVertical: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  logo: { color: "#fff", fontSize: 27, fontWeight: "800" },
  tagline: { color: "#e0e7ff", fontSize: 12 },
  accountBtn: { backgroundColor: "#fff", paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12 },
  accountText: { color: "#3730a3", fontWeight: "700" },
  content: { padding: 18, paddingBottom: 110 },
  heroTitle: { fontSize: 29, fontWeight: "800", color: "#172033", marginTop: 8 },
  pageTitle: { fontSize: 27, fontWeight: "800", marginBottom: 8, color: "#172033" },
  muted: { color: "#64748b", lineHeight: 21 },
  search: { backgroundColor: "#fff", borderRadius: 14, padding: 14, marginTop: 18, marginBottom: 10, borderWidth: 1, borderColor: "#e2e8f0" },
  input: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginTop: 10 },
  row: { flexDirection: "row", gap: 8, marginVertical: 6 },
  action: { flex: 1, backgroundColor: "#4f46e5", borderRadius: 13, padding: 14, alignItems: "center", marginVertical: 5 },
  secondary: { backgroundColor: "#e9eafc" },
  actionText: { color: "#fff", fontWeight: "800" },
  secondaryText: { color: "#3730a3" },
  section: { fontSize: 19, fontWeight: "800", marginTop: 22, marginBottom: 4 },
  card: { backgroundColor: "#fff", padding: 16, borderRadius: 17, marginVertical: 7, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontSize: 17, fontWeight: "800", color: "#172033", marginVertical: 5 },
  badgeRow: { flexDirection: "row", justifyContent: "space-between" },
  badge: { backgroundColor: "#eef2ff", color: "#4338ca", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20, overflow: "hidden", fontSize: 12, fontWeight: "700" },
  location: { color: "#64748b", fontSize: 12 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginVertical: 8 },
  tag: { backgroundColor: "#f1f5f9", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, color: "#475569", fontSize: 12 },
  smallBtn: { flex: 1, backgroundColor: "#f1f5f9", padding: 11, borderRadius: 10, alignItems: "center" },
  smallBtnPrimary: { flex: 1, backgroundColor: "#4f46e5", padding: 11, borderRadius: 10, alignItems: "center" },
  white: { color: "#fff", fontWeight: "700" },
  status: { color: "#166534", backgroundColor: "#dcfce7", alignSelf: "flex-start", padding: 6, borderRadius: 8, marginTop: 8 },
  empty: { backgroundColor: "#fff", padding: 20, borderRadius: 15, marginTop: 10 },
  login: { marginTop: 25 },
  nav: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingVertical: 10, flexDirection: "row", justifyContent: "space-around" },
  navText: { fontSize: 11, color: "#64748b" },
  navActive: { color: "#4f46e5", fontWeight: "800" }
});
