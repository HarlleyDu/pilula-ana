import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Alert, TextInput, Linking, Modal, Animated, Image, Platform,
  ActivityIndicator, Dimensions, PanResponder, StatusBar
} from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { initializeApp } from 'firebase/app';
import {
  getDatabase, ref, set, get, onValue, push, remove, off
} from 'firebase/database';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, updateProfile
} from 'firebase/auth';

// ─── Firebase Config ───────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyChpMCwE1A8Yl3Cm4Oyhc0bJoXBJLSbPuo",
  authDomain: "pilula-ana.firebaseapp.com",
  databaseURL: "https://pilula-ana-default-rtdb.firebaseio.com",
  projectId: "pilula-ana",
  storageBucket: "pilula-ana.firebasestorage.app",
  messagingSenderId: "1005101278287",
  appId: "1:1005101278287:android:e749bbfad114aacbfd763a"
};
const firebaseApp = initializeApp(firebaseConfig);
const db  = getDatabase(firebaseApp);
const auth = getAuth(firebaseApp);

// ─── Constants ─────────────────────────────────────────────────────────────────
const VERSAO_ATUAL = "5.0.0";
const APK_URL      = "https://github.com/HarlleyDu/pilula-ana/releases/latest/download/pilula-ana.apk";
const ADMIN_EMAIL  = "Harlleyduarte@gmail.com";
const { width: SW } = Dimensions.get('window');

// ─── Themes ────────────────────────────────────────────────────────────────────
const TEMAS = {
  roxo:   { primary:'#ff2d78', bg:'#0a0010', card:'#130020', border:'#2a1040', accent:'#7b2fff', text:'#fff', sub:'#aa88cc' },
  dourado:{ primary:'#ffd60a', bg:'#0a0800', card:'#1a1200', border:'#3a2a00', accent:'#ff9500', text:'#fff', sub:'#ccaa44' },
  ciano:  { primary:'#00e5ff', bg:'#000a10', card:'#001520', border:'#003040', accent:'#0088cc', text:'#fff', sub:'#44aacc' },
  verde:  { primary:'#00ff87', bg:'#000a05', card:'#001510', border:'#003020', accent:'#00cc66', text:'#fff', sub:'#44cc88' },
};

// ─── Date Helpers ──────────────────────────────────────────────────────────────
const dateToKey = d => d.toISOString().slice(0,10);
const todayKey  = () => dateToKey(new Date());
const addDias   = (key, n) => {
  const d = new Date(key + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return dateToKey(d);
};
const diasNoMes = (mes, ano) => new Date(ano, mes+1, 0).getDate();
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const MESES_CURTOS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

// ─── Notification Handler ──────────────────────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert:true, shouldPlaySound:true, shouldSetBadge:false }),
});

// ══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════════════════════════
export default function App() {
  // ── Auth & Pair state ───────────────────────────────────────────────────────
  const [tela, setTela] = useState("splash");
  const [authUser, setAuthUser]       = useState(null);
  const [perfil, setPerfil]           = useState(null);
  const [casalId, setCasalId]         = useState(null);
  const [parceiro, setParceiro]       = useState(null);

  // ── Auth form ───────────────────────────────────────────────────────────────
  const [authMode, setAuthMode]       = useState('login');
  const [authEmail, setAuthEmail]     = useState('');
  const [authSenha, setAuthSenha]     = useState('');
  const [authNome, setAuthNome]       = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authErro, setAuthErro]       = useState('');

  // ── Pair ────────────────────────────────────────────────────────────────────
  const [modalPair, setModalPair]     = useState(false);
  const [pairStep, setPairStep]       = useState('menu');
  const [pairChave, setPairChave]     = useState('');
  const [pairInput, setPairInput]     = useState('');
  const [pairLoading, setPairLoading] = useState(false);

  // ── App data ────────────────────────────────────────────────────────────────
  const [historico, setHistorico]     = useState({});
  const [pausa, setPausa]             = useState(null);
  const [pontos, setPontos]           = useState({ ana:0, harlley:0 });
  const [dataInicio, setDataInicio]   = useState(null);
  const [fotos, setFotos]             = useState({});
  const [tema, setTemaState]          = useState(TEMAS.roxo);
  const [temaNome, setTemaNome]       = useState('roxo');
  const [sugestao, setSugestao]       = useState('');
  const [abaAtiva, setAbaAtiva]       = useState('home');
  const [atualizacao, setAtualizacao] = useState(null);
  const [adminUsers, setAdminUsers]   = useState([]);

  // ── Modals & Date Picker ────────────────────────────────────────────────────
  const [modalInicio, setModalInicio] = useState(false);
  const [pickerMes, setPickerMes]     = useState(new Date().getMonth());
  const [pickerDia, setPickerDia]     = useState(1);
  const [calMes, setCalMes]           = useState(new Date().getMonth());
  const [calAno, setCalAno]           = useState(new Date().getFullYear());
  const [modalAmor, setModalAmor]     = useState(false);
  const [modalTema, setModalTema]     = useState(false);
  const [modalAdmin, setModalAdmin]   = useState(false);
  const [modalFotoUrl, setModalFotoUrl] = useState(false);
  const [urlFotoTemp, setUrlFotoTemp] = useState('');

  // ── Animations ──────────────────────────────────────────────────────────────
  const fadeAmor   = useRef(new Animated.Value(0)).current;
  const pulseBtn   = useRef(new Animated.Value(1)).current;
  const confeteAnims = useRef(Array(16).fill(null).map(() => ({
    y: new Animated.Value(0), x: new Animated.Value(0),
    op: new Animated.Value(1), rot: new Animated.Value(0),
  }))).current;
  const [confete, setConfete] = useState(false);
  const confeteCores = ['#ff2d78','#ffd60a','#00ff87','#00e5ff','#7b2fff','#ff9500','#ff6b6b','#4ecdc4'];

  const ABAS = ['home','calendario','ranking','sugestoes','perfil'];
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 20 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderRelease: (_, g) => {
        const idx = ABAS.indexOf(abaAtiva);
        if (g.dx < -50 && idx < ABAS.length - 1) setAbaAtiva(ABAS[idx + 1]);
        if (g.dx > 50 && idx > 0) setAbaAtiva(ABAS[idx - 1]);
      },
    })
  ).current;

  const hoje = todayKey();
  const isAdmin = perfil?.isAdmin === true;
  const s = makeStyles(tema);
  const listenersRef = useRef([]);

  // ══════════════════════════════════════════════════════════════════════════
  // LIFECYCLE
  // ══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    checarAtualizacao();
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setAuthUser(user);
        await carregarPerfil(user.uid);
      } else {
        setAuthUser(null);
        setPerfil(null);
        setCasalId(null);
        setTela('auth');
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(pulseBtn, { toValue:1.05, duration:800, useNativeDriver:true }),
      Animated.timing(pulseBtn, { toValue:1,    duration:800, useNativeDriver:true }),
    ]));
    pulse.start();
    return () => pulse.stop();
  }, []);

  useEffect(() => {
    if (casalId) {
      iniciarListeners(casalId);
      return () => pararListeners();
    }
  }, [casalId]);

  // ══════════════════════════════════════════════════════════════════════════
  // CORE FUNCTIONS
  // ══════════════════════════════════════════════════════════════════════════
  async function checarAtualizacao() {
    try {
      const res = await fetch('https://raw.githubusercontent.com/HarlleyDu/pilula-ana/master/versao.json');
      const json = await res.json();
      if (json.versao !== VERSAO_ATUAL) setAtualizacao(json);
    } catch(e) {}
  }

  async function carregarPerfil(uid) {
    const snap = await get(ref(db, `usuarios/${uid}`));
    if (!snap.exists()) { setTela('auth'); return; }
    const p = snap.val();
    setPerfil({ ...p, uid });
    if (p.casalId) {
      setCasalId(p.casalId);
      setTela('app');
      const tSnap = await get(ref(db, `casais/${p.casalId}/tema`));
      if (tSnap.exists()) aplicarTema(tSnap.val());
    } else {
      setTela('pair');
    }
  }

  function iniciarListeners(cid) {
    const paths = ['historico','pausa','pontos','dataInicio','fotos','tema'];
    paths.forEach(p => {
      const r = ref(db, `casais/${cid}/${p}`);
      const unsub = onValue(r, snap => {
        const val = snap.val();
        if (p === 'historico')  setHistorico(val || {});
        if (p === 'pausa')      setPausa(val);
        if (p === 'pontos')     { if (val) setPontos(val); }
        if (p === 'dataInicio') { if (val) setDataInicio(val); }
        if (p === 'fotos')      { if (val) setFotos(val); }
        if (p === 'tema')       { if (val) aplicarTema(val); }
      });
      listenersRef.current.push({ r, unsub });
    });

    onValue(ref(db, `casais/${cid}/membros`), snap => {
      const m = snap.val() || {};
      const ids = Object.keys(m).filter(id => id !== authUser?.uid);
      if (ids.length > 0) setParceiro({ uid: ids[0], nome: m[ids[0]] });
    });

    if (perfil?.isAdmin) {
      onValue(ref(db, 'usuarios'), snap => {
        const u = snap.val() || {};
        setAdminUsers(Object.entries(u).map(([uid, d]) => ({ uid, ...d })));
      });
    }
    configurarAlarmes();
  }

  function pararListeners() {
    listenersRef.current.forEach(({ r, unsub }) => {
      off(r);
      if (unsub) unsub();
    });
    listenersRef.current = [];
  }

  function aplicarTema(t) {
    const nome = typeof t === 'string' ? t : t?.nome;
    if (nome && TEMAS[nome]) {
      setTemaNome(nome);
      setTemaState(TEMAS[nome]);
    }
  }

  async function salvarTema(nome) {
    await set(ref(db, `casais/${casalId}/tema`), nome);
    setModalTema(false);
  }

  async function configurarAlarmes() {
    if (!Device.isDevice) return;
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Hora da pílula! 💊', body: 'Ana, não esqueça de tomar o Yazflex hoje', sound: true },
      trigger: { hour: 20, minute: 30, repeats: true },
    });
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Ainda não tomou! ⏰', body: 'Lembra ela de tomar a pílula!', sound: true },
      trigger: { hour: 20, minute: 40, repeats: true },
    });
  }

  // ── Auth Logic ──────────────────────────────────────────────────────────────
  async function fazerLogin() {
    setAuthLoading(true); setAuthErro('');
    try {
      await signInWithEmailAndPassword(auth, authEmail.trim(), authSenha);
    } catch(e) {
      setAuthErro('Erro no login. Verifique seus dados.');
    }
    setAuthLoading(false);
  }

  async function fazerCadastro() {
    if (!authNome.trim()) { setAuthErro('Coloca seu nome!'); return; }
    if (authSenha.length < 6) { setAuthErro('Senha curta demais.'); return; }
    setAuthLoading(true); setAuthErro('');
    try {
      const cred = await createUserWithEmailAndPassword(auth, authEmail.trim(), authSenha);
      await updateProfile(cred.user, { displayName: authNome.trim() });
      const isHarlley = authEmail.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
      await set(ref(db, `usuarios/${cred.user.uid}`), {
        nome: authNome.trim(),
        email: authEmail.trim().toLowerCase(),
        isAdmin: isHarlley,
        casalId: null,
        criadoEm: new Date().toISOString(),
      });
    } catch(e) {
      setAuthErro('Erro no cadastro.');
    }
    setAuthLoading(false);
  }

  async function fazerLogout() {
    pararListeners();
    await signOut(auth);
    setHistorico({}); setPausa(null); setPontos({ ana:0, harlley:0 });
    setDataInicio(null); setFotos({}); setCasalId(null); setPerfil(null);
  }

  // ── Pair Logic ──────────────────────────────────────────────────────────────
  async function criarCasal() {
    setPairLoading(true);
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let chave = ''; for (let i=0; i<6; i++) chave += chars[Math.floor(Math.random()*chars.length)];
    const id = `casal_${Date.now()}`;
    await set(ref(db, `casais/${id}`), {
      criadoEm: new Date().toISOString(),
      chave,
      membros: { [authUser.uid]: perfil.nome },
    });
    await set(ref(db, `pairCodes/${chave}`), { casalId: id });
    await set(ref(db, `usuarios/${authUser.uid}/casalId`), id);
    setPairChave(chave);
    setCasalId(id);
    setPairStep('mostrarChave');
    setPairLoading(false);
  }

  async function entrarCasal() {
    const code = pairInput.trim().toUpperCase();
    if (code.length < 4) return;
    setPairLoading(true);
    const snap = await get(ref(db, `pairCodes/${code}`));
    if (snap.exists()) {
      const { casalId: cid } = snap.val();
      await set(ref(db, `casais/${cid}/membros/${authUser.uid}`), perfil.nome);
      await set(ref(db, `usuarios/${authUser.uid}/casalId`), cid);
      await remove(ref(db, `pairCodes/${code}`));
      setCasalId(cid);
      setTela('app');
    } else {
      Alert.alert('Erro', 'Chave não encontrada.');
    }
    setPairLoading(false);
  }

  // ── App Logic ───────────────────────────────────────────────────────────────
  async function marcarTomou() {
    if (!casalId) return;
    const d = new Date();
    const hora = d.toTimeString().slice(0,5);
    const minutos = d.getHours()*60 + d.getMinutes();
    const dentroDaJanela = minutos >= 20*60+30 && minutos <= 20*60+40;
    
    await set(ref(db, `casais/${casalId}/historico/${hoje}`), { data:hoje, hora, tomou:true });
    
    const np = { ...pontos };
    const pNome = (perfil?.nome || '').toLowerCase().includes('harlley') ? 'harlley' : 'ana';
    if (dentroDaJanela) np.ana = (np.ana||0)+1;
    else np[pNome] = (np[pNome]||0)+1;
    await set(ref(db, `casais/${casalId}/pontos`), np);

    const total = Object.keys(historico).length + 1;
    if (total % 28 === 0) {
      setConfete(true);
      setTimeout(() => setConfete(false), 3000);
    }

    setModalAmor(true);
    Animated.sequence([
      Animated.timing(fadeAmor, { toValue:1, duration:500, useNativeDriver:true }),
      Animated.delay(2000),
      Animated.timing(fadeAmor, { toValue:0, duration:500, useNativeDriver:true }),
    ]).start(() => setModalAmor(false));
  }

  async function adminToggleDia(key) {
    if (!isAdmin) return;
    if (historico[key]) await remove(ref(db, `casais/${casalId}/historico/${key}`));
    else await set(ref(db, `casais/${casalId}/historico/${key}`), { data:key, hora:'20:30', tomou:true });
  }

  async function definirDataInicio() {
    const ano = new Date().getFullYear();
    const dataStr = `${ano}-${String(pickerMes+1).padStart(2,'0')}-${String(pickerDia).padStart(2,'0')}`;
    await set(ref(db, `casais/${casalId}/dataInicio`), dataStr);
    setModalInicio(false);
  }

  async function iniciarPausa() {
    const fim = addDias(hoje, 4);
    await set(ref(db, `casais/${casalId}/pausa`), { inicio:hoje, fim, ativa:true });
  }

  async function despausar() {
    await set(ref(db, `casais/${casalId}/pausa/ativa`), false);
  }

  async function salvarFotoUrl() {
    if (!urlFotoTemp.trim()) return;
    await set(ref(db, `casais/${casalId}/fotos/${authUser.uid}`), urlFotoTemp.trim());
    setUrlFotoTemp(''); setModalFotoUrl(false);
  }

  async function enviarSugestao() {
    if (!sugestao.trim()) return;
    await push(ref(db, `casais/${casalId}/sugestoes`), {
      texto: sugestao.trim(), data: new Date().toISOString(), usuario: perfil?.nome
    });
    setSugestao('');
    Alert.alert('Sucesso', 'Sugestão enviada!');
  }

  // ── Render Helpers ──────────────────────────────────────────────────────────
  const tomouHoje  = !!historico[hoje];
  const totalDias  = Object.keys(historico).length;
  const diaCartela = totalDias % 28 || (totalDias > 0 ? 28 : 0);
  const cartelas   = Math.floor(totalDias / 28);
  const pD = pausa?.ativa ? Math.ceil((new Date(pausa.fim+'T23:59:59') - new Date()) / 86400000) : null;
  const fotoAtual  = fotos[authUser?.uid];
  const nomeAtual  = perfil?.nome || 'Usuário';

  if (tela === 'splash') return (
    <View style={s.splash}>
      <Text style={s.splashEmoji}>💊</Text>
      <Text style={s.splashTitle}>Pílula da Ana</Text>
      <ActivityIndicator color="#ff2d78" style={{ marginTop: 20 }} />
    </View>
  );

  if (tela === 'auth') return (
    <ScrollView contentContainerStyle={s.authWrap} keyboardShouldPersistTaps="handled">
      <Text style={s.splashEmoji}>💊</Text>
      <Text style={s.splashTitle}>Pílula da Ana</Text>
      <Text style={s.authSub}>{authMode === 'login' ? 'Entrar na conta' : 'Criar conta'}</Text>
      {authMode === 'cadastro' && <TextInput style={s.input} placeholder="Seu nome" placeholderTextColor="#555" value={authNome} onChangeText={setAuthNome} />}
      <TextInput style={s.input} placeholder="Email" placeholderTextColor="#555" value={authEmail} onChangeText={setAuthEmail} autoCapitalize="none" keyboardType="email-address" />
      <TextInput style={s.input} placeholder="Senha" placeholderTextColor="#555" value={authSenha} onChangeText={setAuthSenha} secureTextEntry />
      {!!authErro && <Text style={s.erroTxt}>{authErro}</Text>}
      <TouchableOpacity style={s.btnPrimary} onPress={authMode === 'login' ? fazerLogin : fazerCadastro} disabled={authLoading}>
        {authLoading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnPrimaryTxt}>{authMode === 'login' ? 'Entrar' : 'Criar conta'}</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setAuthMode(m => m==='login'?'cadastro':'login')}>
        <Text style={s.authSwitch}>{authMode === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entrar'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  if (tela === 'pair') return (
    <ScrollView contentContainerStyle={s.authWrap}>
      <Text style={{ fontSize: 52, marginBottom: 16 }}>💕</Text>
      <Text style={s.splashTitle}>Conectar dupla</Text>
      <Text style={s.authSub}>Olá, {nomeAtual}! Conecte-se com seu par.</Text>
      {pairStep === 'menu' && <>
        <TouchableOpacity style={s.btnPrimary} onPress={criarCasal}><Text style={s.btnPrimaryTxt}>✨ Criar nova dupla</Text></TouchableOpacity>
        <TouchableOpacity style={s.btnSecondary} onPress={() => setPairStep('entrar')}><Text style={s.btnSecondaryTxt}>🔑 Entrar com chave</Text></TouchableOpacity>
        <TouchableOpacity style={[s.btnSecondary, { marginTop: 8 }]} onPress={fazerLogout}><Text style={s.btnSecondaryTxt}>🚪 Trocar de conta</Text></TouchableOpacity>
      </>}
      {pairStep === 'mostrarChave' && <>
        <View style={s.chaveBox}>
          <Text style={s.chaveLabel}>Sua chave</Text>
          <Text style={s.chaveValor}>{pairChave}</Text>
        </View>
        <TouchableOpacity style={s.btnPrimary} onPress={() => setTela('app')}><Text style={s.btnPrimaryTxt}>Continuar →</Text></TouchableOpacity>
      </>}
      {pairStep === 'entrar' && <>
        <TextInput style={[s.input, s.inputChave]} placeholder="Chave" placeholderTextColor="#555" value={pairInput} onChangeText={t => setPairInput(t.toUpperCase())} maxLength={6} />
        <TouchableOpacity style={s.btnPrimary} onPress={entrarCasal}><Text style={s.btnPrimaryTxt}>🔑 Entrar na dupla</Text></TouchableOpacity>
        <TouchableOpacity style={s.btnSecondary} onPress={() => setPairStep('menu')}><Text style={s.btnSecondaryTxt}>← Voltar</Text></TouchableOpacity>
      </>}
    </ScrollView>
  );

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={false} />
      
      {/* Modals */}
      <Modal transparent visible={modalAmor} animationType="none">
        <Animated.View style={[s.modalAmor, { opacity: fadeAmor }]}>
          <Text style={{ fontSize: 80 }}>💕</Text>
          <Text style={s.modalAmorTxt}>Eu te amo amor</Text>
        </Animated.View>
      </Modal>

      <Modal transparent visible={modalFotoUrl} animationType="slide">
        <View style={s.modalWrap}><View style={s.modalCard}>
          <Text style={s.modalTitulo}>📷 URL da foto</Text>
          <TextInput style={s.input} placeholder="https://..." placeholderTextColor="#555" value={urlFotoTemp} onChangeText={setUrlFotoTemp} />
          <TouchableOpacity style={s.btnPrimary} onPress={salvarFotoUrl}><Text style={s.btnPrimaryTxt}>✅ Salvar</Text></TouchableOpacity>
          <TouchableOpacity style={s.btnSecondary} onPress={() => setModalFotoUrl(false)}><Text style={s.btnSecondaryTxt}>Cancelar</Text></TouchableOpacity>
        </View></View>
      </Modal>

      <Modal transparent visible={modalTema} animationType="slide">
        <View style={s.modalWrap}><View style={s.modalCard}>
          <Text style={s.modalTitulo}>🎨 Tema</Text>
          {Object.entries(TEMAS).map(([nome, t]) => (
            <TouchableOpacity key={nome} style={[s.temaBtn, temaNome === nome && { borderColor: t.primary }]} onPress={() => salvarTema(nome)}>
              <View style={[s.temaCor, { backgroundColor: t.primary }]} /><Text style={s.temaTxt}>{nome}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={s.btnSecondary} onPress={() => setModalTema(false)}><Text style={s.btnSecondaryTxt}>Fechar</Text></TouchableOpacity>
        </View></View>
      </Modal>

      <Modal transparent visible={modalAdmin} animationType="slide">
        <View style={s.modalWrap}><View style={s.modalCard}>
          <Text style={s.modalTitulo}>👑 Admin</Text>
          <TouchableOpacity style={s.adminBtn} onPress={() => { setModalAdmin(false); setModalInicio(true); }}><Text style={s.adminBtnTxt}>📅 Definir início</Text></TouchableOpacity>
          <TouchableOpacity style={s.adminBtn} onPress={() => { setModalAdmin(false); iniciarPausa(); }}><Text style={s.adminBtnTxt}>⏸️ Iniciar Pausa</Text></TouchableOpacity>
          <TouchableOpacity style={s.btnSecondary} onPress={() => setModalAdmin(false)}><Text style={s.btnSecondaryTxt}>Fechar</Text></TouchableOpacity>
        </View></View>
      </Modal>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.headerLeft} onPress={() => setAbaAtiva('perfil')}>
          {fotoAtual ? <Image source={{ uri: fotoAtual }} style={s.avatarHeader} /> : <View style={s.avatarVazio}><Text>👤</Text></View>}
          <View style={{ marginLeft: 10 }}>
            <Text style={s.headerTitle}>{nomeAtual}</Text>
            <Text style={s.headerSub}>{parceiro ? `💞 ${parceiro.nome}` : '💔 Sozinho'}</Text>
          </View>
        </TouchableOpacity>
        <View style={{ flexDirection:'row', gap:8 }}>
          <TouchableOpacity style={s.iconBtn} onPress={() => setModalTema(true)}><Text>🎨</Text></TouchableOpacity>
          {isAdmin && <TouchableOpacity style={[s.iconBtn, {backgroundColor:tema.primary}]} onPress={() => setModalAdmin(true)}><Text>👑</Text></TouchableOpacity>}
        </View>
      </View>

      {/* Abas */}
      <View style={s.abas}>
        {[['home','🏠'],['calendario','📅'],['ranking','🏆'],['sugestoes','💡'],['perfil','👤']].map(([aba,ic]) => (
          <TouchableOpacity key={aba} style={[s.aba, abaAtiva===aba && { borderBottomWidth:2, borderBottomColor:tema.primary }]} onPress={() => setAbaAtiva(aba)}>
            <Text style={[s.abaTxt, abaAtiva===aba && { opacity:1 }]}>{ic}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={s.body} contentContainerStyle={s.bodyContent} {...panResponder.panHandlers}>
        {abaAtiva === 'home' && <>
          {pD > 0 ? (
            <View style={[s.card, { borderColor:'#ffd60a' }]}>
              <Text style={{ fontSize:44 }}>⏸️</Text>
              <Text style={[s.cardTitulo, { color:'#ffd60a' }]}>Pausa ativa</Text>
              <Text style={s.cardSub}>{pD} dias restantes</Text>
            </View>
          ) : <>
            <View style={[s.card, { borderColor: tomouHoje ? '#00ff87' : tema.primary }]}>
              <Text style={{ fontSize:48 }}>{tomouHoje ? '✅' : '⏰'}</Text>
              <Text style={s.cardTitulo}>{tomouHoje ? 'Tomou hoje!' : 'Ainda não tomou'}</Text>
              <Text style={s.cardSub}>Dia {diaCartela}/28</Text>
            </View>
            {!tomouHoje && (
              <Animated.View style={{ transform:[{ scale: pulseBtn }] }}>
                <TouchableOpacity style={s.btnPrimary} onPress={marcarTomou}><Text style={s.btnPrimaryTxt}>💊 Marcar agora</Text></TouchableOpacity>
              </Animated.View>
            )}
          </>}
        </>}

        {abaAtiva === 'calendario' && <>
          <View style={s.calHeader}>
            <TouchableOpacity onPress={() => { if(calMes===0){setCalMes(11);setCalAno(a=>a-1)}else setCalMes(m=>m-1)}}><Text style={s.calNav}>‹</Text></TouchableOpacity>
            <Text style={s.calTitulo}>{MESES[calMes]} {calAno}</Text>
            <TouchableOpacity onPress={() => { if(calMes===11){setCalMes(0);setCalAno(a=>a+1)}else setCalMes(m=>m+1)}}><Text style={s.calNav}>›</Text></TouchableOpacity>
          </View>
          <View style={s.calGrid}>
            {['D','S','T','Q','Q','S','S'].map(d => <View key={d} style={s.calDiaSemana}><Text style={s.calDiaSemanaT}>{d}</Text></View>)}
            {(() => {
              const start = new Date(calAno, calMes, 1).getDay();
              const days = diasNoMes(calMes, calAno);
              const cells = [];
              for(let i=0; i<start; i++) cells.push(<View key={'e'+i} style={s.calCelVazia}/>);
              for(let d=1; d<=days; d++) {
                const key = `${calAno}-${String(calMes+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                const tomou = !!historico[key];
                cells.push(
                  <TouchableOpacity key={key} style={[s.calCel, tomou && {backgroundColor:tema.primary+'44'}]} onPress={() => adminToggleDia(key)}>
                    <Text style={[s.calDiaNum, tomou && {color:tema.primary}]}>{d}</Text>
                  </TouchableOpacity>
                );
              }
              return cells;
            })()}
          </View>
        </>}

        {abaAtiva === 'ranking' && <>
          <Text style={s.secLabel}>🏆 Ranking</Text>
          <View style={s.rankCard}><Text style={s.rankNome}>Ana</Text><Text style={s.rankPts}>{pontos.ana || 0} pts</Text></View>
          <View style={s.rankCard}><Text style={s.rankNome}>Harlley</Text><Text style={s.rankPts}>{pontos.harlley || 0} pts</Text></View>
        </>}

        {abaAtiva === 'perfil' && <>
          <View style={s.perfilCard}>
            <TouchableOpacity onPress={escolherFoto}>
              {fotoAtual ? <Image source={{uri:fotoAtual}} style={s.fotoPerfil}/> : <View style={s.fotoPerfilVazio}><Text>📷</Text></View>}
            </TouchableOpacity>
            <Text style={s.perfilNome}>{nomeAtual}</Text>
            <Text style={s.perfilVersao}>v{VERSAO_ATUAL}</Text>
            <TouchableOpacity style={s.btnSecondary} onPress={fazerLogout}><Text style={{color:'#ff4444'}}>Sair</Text></TouchableOpacity>
          </View>
        </>}
      </ScrollView>
    </View>
  );
}

const makeStyles = (tema) => StyleSheet.create({
  root: { flex:1, backgroundColor:tema.bg },
  splash: { flex:1, backgroundColor:'#0a0010', alignItems:'center', justifyContent:'center' },
  splashEmoji: { fontSize:64, marginBottom:16 },
  splashTitle: { fontSize:28, fontWeight:'800', color:'#fff' },
  authWrap: { flexGrow:1, backgroundColor:'#0a0010', padding:28, justifyContent:'center' },
  authSub: { fontSize:14, color:'#555', textAlign:'center', marginBottom:28 },
  authSwitch: { color:'#7b2fff', textAlign:'center', marginTop:16 },
  input: { backgroundColor:tema.card, borderRadius:12, padding:16, color:tema.text, marginBottom:12, borderWidth:1, borderColor:tema.border },
  btnPrimary: { backgroundColor:tema.primary, borderRadius:16, padding:18, alignItems:'center' },
  btnPrimaryTxt: { color:'#fff', fontWeight:'800' },
  btnSecondary: { padding:12, alignItems:'center', marginTop:8 },
  btnSecondaryTxt: { color:tema.sub },
  header: { flexDirection:'row', justifyContent:'space-between', padding:20, paddingTop:50, backgroundColor:tema.card },
  headerTitle: { color:'#fff', fontWeight:'800', fontSize:18 },
  headerSub: { color:tema.sub, fontSize:12 },
  avatarHeader: { width:40, height:40, borderRadius:20 },
  avatarVazio: { width:40, height:40, borderRadius:20, backgroundColor:'#333', alignItems:'center', justifyContent:'center' },
  iconBtn: { width:36, height:36, borderRadius:18, backgroundColor:'#333', alignItems:'center', justifyContent:'center' },
  abas: { flexDirection:'row', backgroundColor:tema.card, borderBottomWidth:1, borderBottomColor:tema.border },
  aba: { flex:1, padding:15, alignItems:'center' },
  abaTxt: { fontSize:20, opacity:0.4 },
  body: { flex:1 },
  bodyContent: { padding:20 },
  card: { backgroundColor:tema.card, borderRadius:24, padding:30, alignItems:'center', borderWidth:2, marginBottom:20 },
  cardTitulo: { fontSize:22, fontWeight:'900', color:'#fff', marginTop:10 },
  cardSub: { color:tema.sub, marginTop:5 },
  calHeader: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:20 },
  calTitulo: { color:'#fff', fontSize:18, fontWeight:'800' },
  calNav: { color:tema.primary, fontSize:30, paddingHorizontal:20 },
  calGrid: { flexDirection:'row', flexWrap:'wrap' },
  calDiaSemana: { width: (SW-40)/7, alignItems:'center', marginBottom:10 },
  calDiaSemanaT: { color:tema.sub, fontSize:12 },
  calCel: { width: (SW-40)/7, height:45, alignItems:'center', justifyContent:'center', borderRadius:8, borderWidth:1, borderColor:'transparent' },
  calCelVazia: { width: (SW-40)/7, height:45 },
  calDiaNum: { color:'#fff', fontSize:14 },
  rankCard: { flexDirection:'row', justifyContent:'space-between', backgroundColor:tema.card, padding:20, borderRadius:16, marginBottom:10 },
  rankNome: { color:'#fff', fontWeight:'700' },
  rankPts: { color:tema.primary, fontWeight:'800' },
  perfilCard: { alignItems:'center', padding:30, backgroundColor:tema.card, borderRadius:24 },
  fotoPerfil: { width:100, height:100, borderRadius:50, borderWidth:3, borderColor:tema.primary },
  fotoPerfilVazio: { width:100, height:100, borderRadius:50, backgroundColor:'#333', alignItems:'center', justifyContent:'center' },
  perfilNome: { color:'#fff', fontSize:22, fontWeight:'800', marginTop:15 },
  perfilVersao: { color:tema.sub, fontSize:12, marginTop:5 },
  modalWrap: { flex:1, backgroundColor:'rgba(0,0,0,0.8)', justifyContent:'center', padding:20 },
  modalCard: { backgroundColor:tema.card, borderRadius:24, padding:24, borderWidth:1, borderColor:tema.border },
  modalTitulo: { color:'#fff', fontSize:20, fontWeight:'800', marginBottom:20 },
  modalAmor: { flex:1, backgroundColor:'rgba(0,0,0,0.9)', alignItems:'center', justifyContent:'center' },
  modalAmorTxt: { color:'#fff', fontSize:24, fontWeight:'900', marginTop:20 },
  temaBtn: { flexDirection:'row', alignItems:'center', padding:15, borderRadius:12, borderWidth:1, borderColor:tema.border, marginBottom:10 },
  temaCor: { width:20, height:20, borderRadius:10, marginRight:15 },
  temaTxt: { color:'#fff', fontWeight:'600' },
  adminBtn: { padding:15, borderRadius:12, borderWidth:1, borderColor:tema.primary, marginBottom:10 },
  adminBtnTxt: { color:tema.primary, textAlign:'center', fontWeight:'700' },
  erroTxt: { color:'#ff4444', textAlign:'center', marginBottom:10 }
});
