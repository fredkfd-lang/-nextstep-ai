import React, { useMemo, useState } from "react";
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { addDoc, collection, doc, getDoc, getDocs, onSnapshot, query as firestoreQuery, setDoc, where, deleteDoc } from "firebase/firestore";
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
  const [cv, setCv] = useState(null);
  const [jobsData, setJobsData] = useState(JOBS);
  const [savedData, setSavedData] = useState([]);
  const [applicationsData, setApplicationsData] = useState([]);
  const [employerApplications, setEmployerApplications] = useState([]);
  const [accountType, setAccountType] = useState("candidate");
  const [employerJobs, setEmployerJobs] = useState([]);
  const [profileForm, setProfileForm] = useState({ name: "", phone: "", city: "", companyName: "", website: "" });
  const [authLoading, setAuthLoading] = useState(true);

  React.useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, async current => {
      try {
        setUser(current);
        if (current && db) {
          const snap = await getDoc(doc(db, "users", current.uid));
          const data = snap.exists() ? snap.data() : {};
          setAccountType(data.role === "employer" ? "employer" : "candidate");
          setProfileForm(x => ({ ...x, ...data }));
        } else {
          setAccountType("candidate");
          setProfileForm({ name: "", phone: "", city: "", companyName: "", website: "" });
        }
      } finally {
        setAuthLoading(false);
      }
    });
  }, []);

  React.useEffect(() => {
    if (!db) return;
    return onSnapshot(firestoreQuery(collection(db, "jobs")), snapshot => {
      const remote = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setJobsData(remote.length ? remote : JOBS);
    }, () => setJobsData(JOBS));
  }, []);

  React.useEffect(() => {
    if (!db || !user) {
      setSavedData([]);
      setApplicationsData([]);
      return;
    }
    const unsubSaved = onSnapshot(collection(db, "users", user.uid, "savedJobs"), snap => setSavedData(snap.docs.map(d => d.id)));
    const unsubApps = onSnapshot(collection(db, "users", user.uid, "applications"), snap => setApplicationsData(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { unsubSaved(); unsubApps(); };
  }, [user]);

  React.useEffect(() => {
    if (!db || !user || accountType !== "employer") {
      setEmployerJobs([]);
      setEmployerApplications([]);
      return;
    }
    const jobsQ = firestoreQuery(collection(db, "jobs"), where("employerId", "==", user.uid));
    const appsQ = firestoreQuery(collection(db, "applications"), where("employerId", "==", user.uid));
    const unsubJobs = onSnapshot(jobsQ, snap => setEmployerJobs(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubApps = onSnapshot(appsQ, snap => setEmployerApplications(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { unsubJobs(); unsubApps(); };
  }, [user, accountType]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return jobsData;
    return jobsData.filter(j => [j.title, j.company, j.location, j.type, ...(j.tags || [])].join(" ").toLowerCase().includes(q));
  }, [query, jobsData]);

  const requireLogin = action => {
    if (!loggedIn) {
      Alert.alert("Konto erforderlich", "Bitte erst kostenlos anmelden oder einloggen.");
      setScreen("login");
      return;
    }
    action();
  };

  const toggleSave = id => requireLogin(async () => {
    if (!db || !user) return;
    try {
      const refDoc = doc(db, "users", user.uid, "savedJobs", id);
      if (savedData.includes(id)) await deleteDoc(refDoc);
      else await setDoc(refDoc, { jobId: id, savedAt: new Date().toISOString() });
    } catch {
      Alert.alert("Speichern", "Die Stelle konnte gerade nicht gespeichert werden.");
    }
  });

  const apply = id => requireLogin(async () => {
    if (!db || !user) return;
    const job = jobsData.find(j => j.id === id);
    if (!job) return;
    try {
      const alreadyApplied = applicationsData.some(a => a.jobId === id);
      if (!alreadyApplied) {
        await addDoc(collection(db, "users", user.uid, "applications"), {
          employerId: job.employerId || "", applicantId: user.uid, jobId: id,
          title: job.title, company: job.company, location: job.location, type: job.type,
          status: "Gesendet", appliedAt: new Date().toISOString()
        });
      }

      if (job.employerId) {
        const employerApps = await getDocs(
          firestoreQuery(
            collection(db, "applications"),
            where("applicantId", "==", user.uid),
            where("jobId", "==", id)
          )
        );

        if (employerApps.empty) {
          await addDoc(collection(db, "applications"), {
            applicantId: user.uid, employerId: job.employerId, jobId: id,
            title: job.title, company: job.company, location: job.location, type: job.type,
            status: "Neu", createdAt: new Date().toISOString()
          });
        }
      }

      Alert.alert(
        "Bewerbung",
        alreadyApplied ? "Du hast dich bereits auf diese Stelle beworben." : "Die Bewerbung wurde in deinem BerOpp-Konto gespeichert."
      );
    } catch (error) {
      Alert.alert("Bewerbung", error?.message || "Die Bewerbung konnte gerade nicht gespeichert werden.");
    }
  });

  const saveProfile = async () => {
    if (!user || !db) return;
    try {
      await setDoc(doc(db, "users", user.uid), {
        email: user.email || "", role: accountType, ...profileForm, updatedAt: new Date().toISOString()
      }, { merge: true });
      Alert.alert("Profil gespeichert", "Deine Angaben wurden gespeichert.");
    } catch (error) {
      Alert.alert("Profil", error?.message || "Das Profil konnte nicht gespeichert werden.");
    }
  };

  const submitAuth = async () => {
    if (!firebaseConfigured || !auth) {
      Alert.alert("Firebase noch nicht verbunden", "Firebase-Konfiguration fehlt.");
      return;
    }
    if (!email.trim() || password.length < 6) {
      Alert.alert("Anmeldung", "Bitte E-Mail eingeben und ein Passwort mit mindestens 6 Zeichen verwenden.");
      return;
    }
    try {
      const result = authMode === "login"
        ? await signInWithEmailAndPassword(auth, email.trim(), password)
        : await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (authMode === "register" && db) {
        await setDoc(doc(db, "users", result.user.uid), {
          email: result.user.email, role: accountType, createdAt: new Date().toISOString()
        }, { merge: true });
      }
      setScreen(accountType === "employer" ? "employer" : "profile");
    } catch (error) {
      const messages = {
        "auth/invalid-credential": "E-Mail oder Passwort ist nicht korrekt.",
        "auth/email-already-in-use": "Diese E-Mail-Adresse wird bereits verwendet.",
        "auth/invalid-email": "Bitte gib eine gültige E-Mail-Adresse ein.",
        "auth/weak-password": "Das Passwort muss mindestens 6 Zeichen haben.",
        "auth/network-request-failed": "Keine Internetverbindung. Bitte versuche es erneut."
      };
      Alert.alert("Anmeldung fehlgeschlagen", messages[error?.code] || "Bitte prüfe E-Mail und Passwort.");
    }
  };

  const pickCV = async () => {
    if (!loggedIn) return setScreen("login");
    const result = await DocumentPicker.getDocumentAsync({ type: "application/pdf", copyToCacheDirectory: true });
    if (result.canceled) return;
    const asset = result.assets[0];
    setCv(asset);
    if (!storage || !db || !user) return;
    try {
      const blob = await (await fetch(asset.uri)).blob();
      const fileRef = ref(storage, `users/${user.uid}/cv/${asset.name || "cv.pdf"}`);
      await uploadBytes(fileRef, blob, { contentType: "application/pdf" });
      const url = await getDownloadURL(fileRef);
      await setDoc(doc(db, "users", user.uid), { cvName: asset.name || "cv.pdf", cvUrl: url, updatedAt: new Date().toISOString() }, { merge: true });
      Alert.alert("CV gespeichert", "Dein CV wurde in deinem BerOpp-Konto gespeichert.");
    } catch (error) {
      Alert.alert("CV Upload", error?.message || "Der Firebase-Upload ist fehlgeschlagen.");
    }
  };

  const createJob = async (form) => {
    if (!user || !db) return;
    if (!form.title.trim() || !form.company.trim() || !form.location.trim()) {
      Alert.alert("Fehlende Angaben", "Bitte Titel, Unternehmen und Ort ausfüllen.");
      return;
    }
    try {
      await addDoc(collection(db, "jobs"), {
        ...form, title: form.title.trim(), company: form.company.trim(), location: form.location.trim(),
        tags: form.tags.split(",").map(x => x.trim()).filter(Boolean),
        employerId: user.uid, createdAt: new Date().toISOString(), status: "published"
      });
      Alert.alert("Veröffentlicht", "Die Stelle wurde zu BerOpp hinzugefügt.");
    } catch (error) {
      Alert.alert("Fehler", error?.message || "Die Stelle konnte nicht veröffentlicht werden.");
    }
  };

  const updateApplicationStatus = async (applicationId, status) => {
    if (!db) return;
    try {
      await setDoc(doc(db, "applications", applicationId), { status, updatedAt: new Date().toISOString() }, { merge: true });
      const app = employerApplications.find(x => x.id === applicationId);
      if (app?.applicantId) {
        const snap = await getDocs(firestoreQuery(collection(db, "users", app.applicantId, "applications"), where("jobId", "==", app.jobId)));
        for (const d of snap.docs) await setDoc(d.ref, { status }, { merge: true });
      }
    } catch (error) {
      Alert.alert("Status", error?.message || "Der Status konnte nicht aktualisiert werden.");
    }
  };

  const deleteEmployerJob = async id => {
    if (!db) return;
    Alert.alert("Stelle löschen", "Möchtest du diese Veröffentlichung wirklich löschen?", [
      { text: "Abbrechen", style: "cancel" },
      { text: "Löschen", style: "destructive", onPress: async () => {
        try { await deleteDoc(doc(db, "jobs", id)); }
        catch (error) { Alert.alert("Fehler", error?.message || "Die Stelle konnte nicht gelöscht werden."); }
      }}
    ]);
  };

  const jobs = screen === "ausbildung" ? filtered.filter(j => j.type === "Ausbildung") : filtered;
  const savedIds = savedData;
  const applications = applicationsData;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View><Text style={styles.logo}>BerOpp</Text><Text style={styles.tagline}>Find your next opportunity</Text></View>
        <TouchableOpacity style={styles.accountBtn} onPress={() => setScreen(loggedIn ? (accountType === "employer" ? "employer" : "profile") : "login")}><Text style={styles.accountText}>{loggedIn ? "Profil" : "Login"}</Text></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {authLoading ? <View style={styles.empty}><Text style={styles.cardTitle}>BerOpp wird geladen…</Text><Text style={styles.muted}>Bitte einen Moment warten.</Text></View> : <>
        {screen === "home" && <>
          <Text style={styles.heroTitle}>Deine nächste Chance beginnt hier.</Text>
          <Text style={styles.muted}>Jobs, Ausbildung und internationale Möglichkeiten an einem Ort.</Text>
          <TextInput value={query} onChangeText={setQuery} placeholder="Job, Ausbildung oder Ort suchen..." style={styles.search} />
          <View style={styles.row}><Action title="Jobs" onPress={() => setScreen("jobs")} /><Action title="Ausbildung" onPress={() => setScreen("ausbildung")} /></View>
          <Action title="International" secondary onPress={() => setScreen("international")} />
          <SectionTitle title="Aktuelle Möglichkeiten" />
          {filtered.slice(0, 3).map(job => <JobCard key={job.id} job={job} saved={savedIds.includes(job.id)} applied={applications.some(a => a.jobId === job.id)} onSave={() => toggleSave(job.id)} onApply={() => apply(job.id)} />)}
        </>}

        {(screen === "jobs" || screen === "ausbildung") && <>
          <Text style={styles.pageTitle}>{screen === "jobs" ? "Jobs" : "Ausbildung"}</Text>
          <TextInput value={query} onChangeText={setQuery} placeholder="Suchen..." style={styles.search} />
          {jobs.map(job => <JobCard key={job.id} job={job} saved={savedIds.includes(job.id)} applied={applications.some(a => a.jobId === job.id)} onSave={() => toggleSave(job.id)} onApply={() => apply(job.id)} />)}
          {!jobs.length && <Empty text="Keine passenden Möglichkeiten gefunden." />}
        </>}

        {screen === "international" && <>
          <Text style={styles.pageTitle}>International</Text>
          <Text style={styles.muted}>Chancen außerhalb Deutschlands – dieser Bereich ist vorbereitet und kann später mit echten Angeboten verbunden werden.</Text>
          <View style={styles.card}><Text style={styles.cardTitle}>Ausbildung & Jobs international</Text><Text style={styles.muted}>Beispiele: Logistik, Technik, Pflege, Handwerk und weitere Berufe.</Text><Text style={styles.tag}>Demnächst mit echten Angeboten</Text></View>
          <View style={styles.card}><Text style={styles.cardTitle}>Für internationale Bewerber</Text><Text style={styles.muted}>BerOpp soll Unternehmen und Bewerber auch über Ländergrenzen hinweg zusammenbringen.</Text></View>
        </>}

        {screen === "saved" && <>
          <Text style={styles.pageTitle}>Gespeichert</Text>
          {jobsData.filter(j => savedIds.includes(j.id)).map(job => <JobCard key={job.id} job={job} saved applied={applications.some(a => a.jobId === job.id)} onSave={() => toggleSave(job.id)} onApply={() => apply(job.id)} />)}
          {!savedIds.length && <Empty text="Noch keine Stellen gespeichert." />}
        </>}

        {screen === "applications" && <>
          <Text style={styles.pageTitle}>Meine Bewerbungen</Text>
          {applications.map(app => <View style={styles.card} key={app.id}><Text style={styles.cardTitle}>{app.title}</Text><Text style={styles.muted}>{app.company} · {app.location}</Text><Text style={styles.status}>{app.status || "Gesendet"}</Text></View>)}
          {!applications.length && <Empty text="Noch keine Bewerbungen." />}
        </>}

        {screen === "employer" && <EmployerScreen profileForm={profileForm} setProfileForm={setProfileForm} saveProfile={saveProfile} createJob={createJob} employerJobs={employerJobs} deleteEmployerJob={deleteEmployerJob} employerApplications={employerApplications} updateApplicationStatus={updateApplicationStatus} />}

        {screen === "profile" && <>
          <Text style={styles.pageTitle}>Mein Profil</Text>
          {!loggedIn && <View style={styles.card}><Text style={styles.cardTitle}>Noch nicht angemeldet</Text><Text style={styles.muted}>Melde dich an, um Bewerbungen und CV zu speichern.</Text><Action title="Anmelden / Registrieren" onPress={() => setScreen("login")} /></View>}
          {loggedIn && <View style={styles.card}>
            <Text style={styles.cardTitle}>Persönliche Angaben</Text>
            <TextInput value={profileForm.name} onChangeText={v => setProfileForm(x => ({...x,name:v}))} placeholder="Name" style={styles.input} />
            <TextInput value={profileForm.phone} onChangeText={v => setProfileForm(x => ({...x,phone:v}))} placeholder="Telefon" style={styles.input} />
            <TextInput value={profileForm.city} onChangeText={v => setProfileForm(x => ({...x,city:v}))} placeholder="Adresse / Ort" style={styles.input} />
            <Action title="Profil speichern" onPress={saveProfile} />
          </View>}
          {loggedIn && <View style={styles.card}>
            <Text style={styles.cardTitle}>Lebenslauf (PDF)</Text>
            <Text style={styles.muted}>{cv?.name || profileForm.cvName || "Noch kein CV hochgeladen."}</Text>
            <Action title={cv || profileForm.cvName ? "CV ändern" : "CV hochladen"} onPress={pickCV} />
            <Text style={styles.muted}>Kontotyp: {accountType === "employer" ? "Unternehmen" : "Bewerber"}</Text>
            <Action title="Abmelden" secondary onPress={() => auth && signOut(auth)} />
          </View>}
        </>}

        {screen === "login" && <View style={styles.login}>
          <Text style={styles.pageTitle}>{authMode === "login" ? "Einloggen" : "Konto erstellen"}</Text>
          <Text style={styles.muted}>BerOpp Konto: Jobs, Bewerbungen und CV an einem Ort.</Text>
          <TextInput value={email} onChangeText={setEmail} placeholder="E-Mail" keyboardType="email-address" autoCapitalize="none" style={styles.input} />
          <TextInput value={password} onChangeText={setPassword} placeholder="Passwort" secureTextEntry style={styles.input} />
          <Action title={authMode === "login" ? "Einloggen" : "Konto erstellen"} onPress={submitAuth} />
          <Action title={accountType === "candidate" ? "Ich bin ein Unternehmen" : "Ich suche Arbeit"} secondary onPress={() => setAccountType(accountType === "candidate" ? "employer" : "candidate")} />
          <Action title={authMode === "login" ? "Neu bei BerOpp? Registrieren" : "Ich habe bereits ein Konto"} secondary onPress={() => setAuthMode(authMode === "login" ? "register" : "login")} />
          <Text style={styles.muted}>{firebaseConfigured ? "Firebase ist verbunden." : "Firebase-Konfiguration fehlt."}</Text>
        </View>}
        </>}
      </ScrollView>
      <View style={styles.nav}>
        <Nav title="Home" active={screen === "home"} onPress={() => setScreen("home")} />
        <Nav title="Jobs" active={screen === "jobs"} onPress={() => setScreen("jobs")} />
        <Nav title="Gespeichert" active={screen === "saved"} onPress={() => setScreen("saved")} />
        <Nav title="Bewerbungen" active={screen === "applications"} onPress={() => setScreen("applications")} />
        <Nav title={accountType === "employer" ? "Firma" : "Profil"} active={screen === "profile" || screen === "employer"} onPress={() => setScreen(loggedIn ? (accountType === "employer" ? "employer" : "profile") : "login")} />
      </View>
    </SafeAreaView>
  );
}

function EmployerScreen({ profileForm, setProfileForm, saveProfile, createJob, employerJobs, deleteEmployerJob, employerApplications, updateApplicationStatus }) {
  const [form, setForm] = useState({ title: "", company: profileForm.companyName || "", location: profileForm.city || "", type: "Job", tags: "" });
  return <><Text style={styles.pageTitle}>Unternehmen</Text>
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Unternehmensprofil</Text>
      <TextInput value={profileForm.companyName} onChangeText={v => setProfileForm(x => ({...x,companyName:v}))} placeholder="Unternehmen" style={styles.input} />
      <TextInput value={profileForm.website} onChangeText={v => setProfileForm(x => ({...x,website:v}))} placeholder="Website" style={styles.input} />
      <Action title="Unternehmensprofil speichern" onPress={saveProfile} />
    </View>
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Neue Stelle veröffentlichen</Text>
      {["title","company","location","type","tags"].map(key => <TextInput key={key} value={form[key]} onChangeText={v => setForm(x => ({...x,[key]:v}))} placeholder={key === "title" ? "Job-/Ausbildungsname" : key === "company" ? "Unternehmen" : key === "location" ? "Ort" : key === "type" ? "Job oder Ausbildung" : "Tags, z.B. Lager, Vollzeit, 2027"} style={styles.input} />)}
      <Action title="Stelle veröffentlichen" onPress={async () => { await createJob(form); setForm(x => ({...x, title:"", tags:""})); }} />
    </View>
    <SectionTitle title="Meine Veröffentlichungen" />
    {employerJobs.map(job => <View style={styles.card} key={job.id}><Text style={styles.cardTitle}>{job.title}</Text><Text style={styles.muted}>{job.company} · {job.location}</Text><Text style={styles.status}>Online</Text><Action title="Stelle löschen" secondary onPress={() => deleteEmployerJob(job.id)} /></View>)}
    {!employerJobs.length && <Empty text="Du hast noch keine Stellen veröffentlicht." />}
    <SectionTitle title="Bewerbungen" />
    {employerApplications.map(app => <View style={styles.card} key={app.id}><Text style={styles.cardTitle}>{app.title}</Text><Text style={styles.muted}>Bewerber-ID: {app.applicantId}</Text><Text style={styles.status}>Status: {app.status || "Neu"}</Text><View style={styles.row}><Action title="Angesehen" secondary onPress={() => updateApplicationStatus(app.id, "Angesehen")} /><Action title="Eingeladen" onPress={() => updateApplicationStatus(app.id, "Eingeladen")} /></View><Action title="Abgelehnt" secondary onPress={() => updateApplicationStatus(app.id, "Abgelehnt")} /></View>)}
    {!employerApplications.length && <Empty text="Noch keine Bewerbungen." />}
  </>;
}

function JobCard({ job, saved, applied, onSave, onApply }) {
  return <View style={styles.card}><View style={styles.badgeRow}><Text style={styles.badge}>{job.type}</Text><Text style={styles.location}>{job.location}</Text></View><Text style={styles.cardTitle}>{job.title}</Text><Text style={styles.muted}>{job.company}</Text><View style={styles.tagRow}>{(job.tags || []).map(t => <Text style={styles.tag} key={t}>{t}</Text>)}</View><View style={styles.row}><TouchableOpacity style={styles.smallBtn} onPress={onSave}><Text>{saved ? "★ Gespeichert" : "☆ Speichern"}</Text></TouchableOpacity><TouchableOpacity style={styles.smallBtnPrimary} onPress={onApply}><Text style={styles.white}>{applied ? "Bewerbung gesendet" : "Bewerben"}</Text></TouchableOpacity></View></View>;
}
function Action({ title, onPress, secondary }) { return <TouchableOpacity style={[styles.action, secondary && styles.secondary]} onPress={onPress}><Text style={[styles.actionText, secondary && styles.secondaryText]}>{title}</Text></TouchableOpacity>; }
function Nav({ title, onPress, active }) { return <TouchableOpacity onPress={onPress}><Text style={[styles.navText, active && styles.navActive]}>{title}</Text></TouchableOpacity>; }
function SectionTitle({ title }) { return <Text style={styles.section}>{title}</Text>; }
function Empty({ text }) { return <View style={styles.empty}><Text style={styles.muted}>{text}</Text></View>; }

const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:"#f4f7fb"}, header:{backgroundColor:"#4f46e5",paddingHorizontal:18,paddingVertical:16,flexDirection:"row",justifyContent:"space-between",alignItems:"center"}, logo:{color:"#fff",fontSize:27,fontWeight:"800"}, tagline:{color:"#e0e7ff",fontSize:12}, accountBtn:{backgroundColor:"#fff",paddingHorizontal:14,paddingVertical:9,borderRadius:12},accountText:{color:"#3730a3",fontWeight:"700"},content:{padding:18,paddingBottom:110},heroTitle:{fontSize:29,fontWeight:"800",color:"#172033",marginTop:8},pageTitle:{fontSize:27,fontWeight:"800",marginBottom:8,color:"#172033"},muted:{color:"#64748b",lineHeight:21},search:{backgroundColor:"#fff",borderRadius:14,padding:14,marginTop:18,marginBottom:10,borderWidth:1,borderColor:"#e2e8f0"},input:{backgroundColor:"#fff",borderRadius:12,padding:14,marginTop:10},row:{flexDirection:"row",gap:8,marginVertical:6},action:{flex:1,backgroundColor:"#4f46e5",borderRadius:13,padding:14,alignItems:"center",marginVertical:5},secondary:{backgroundColor:"#e9eafc"},actionText:{color:"#fff",fontWeight:"800"},secondaryText:{color:"#3730a3"},section:{fontSize:19,fontWeight:"800",marginTop:22,marginBottom:4},card:{backgroundColor:"#fff",padding:16,borderRadius:17,marginVertical:7,shadowColor:"#000",shadowOpacity:0.05,shadowRadius:8,elevation:2},cardTitle:{fontSize:17,fontWeight:"800",color:"#172033",marginVertical:5},badgeRow:{flexDirection:"row",justifyContent:"space-between"},badge:{backgroundColor:"#eef2ff",color:"#4338ca",paddingHorizontal:9,paddingVertical:5,borderRadius:20,overflow:"hidden",fontSize:12,fontWeight:"700"},location:{color:"#64748b",fontSize:12},tagRow:{flexDirection:"row",flexWrap:"wrap",gap:6,marginVertical:8},tag:{backgroundColor:"#f1f5f9",paddingHorizontal:8,paddingVertical:5,borderRadius:8,color:"#475569",fontSize:12},smallBtn:{flex:1,backgroundColor:"#f1f5f9",padding:11,borderRadius:10,alignItems:"center"},smallBtnPrimary:{flex:1,backgroundColor:"#4f46e5",padding:11,borderRadius:10,alignItems:"center"},white:{color:"#fff",fontWeight:"700"},status:{color:"#166534",backgroundColor:"#dcfce7",alignSelf:"flex-start",padding:6,borderRadius:8,marginTop:8},empty:{backgroundColor:"#fff",padding:20,borderRadius:15,marginTop:10},login:{marginTop:25},nav:{position:"absolute",bottom:0,left:0,right:0,backgroundColor:"#fff",borderTopWidth:1,borderTopColor:"#e2e8f0",paddingVertical:10,flexDirection:"row",justifyContent:"space-around"},navText:{fontSize:11,color:"#64748b"},navActive:{color:"#4f46e5",fontWeight:"800"}
});
