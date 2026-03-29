import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Alert, TextInput, Linking, Modal, Animated, Image, Platform,
  FlatList, ActivityIndicator, Dimensions
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
  apiKey: "AIzaSyChpMCwE1A8Yl3Cm4Oyhc0bJoXBJLSbPuo",   // ← substitua pelo seu
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
const VERSAO_ATUAL = "3.3.6";
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
  const [iniciando, setIniciando] = useState(true');
  const [authUser, setAuthUser]       = useState(null);   // Firebase Auth user
  const [perfil, setPerfil]           = useState(null);   // { nome, email, isAdmin, casalId, role }
  const [casalId, setCasalId]         = useState(null);
  const [parceiro, setParceiro]       = useState(null);

  // ── Auth form ───────────────────────────────────────────────────────────────
  const [authMode, setAuthMode]       = useState('login'); // login | cadastro
  const [authEmail, setAuthEmail]     = useState('');
  const [authSenha, setAuthSenha]     = useState('');
  const [authNome, setAuthNome]       = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authErro, setAuthErro]       = useState('');

  // ── Pair ────────────────────────────────────────────────────────────────────
  const [modalPair, setModalPair]     = useState(false);
  const [pairStep, setPairStep]       = useState('menu'); // menu | gerar | entrar
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

  // ── Date picker ─────────────────────────────────────────────────────────────
  const [modalInicio, setModalInicio] = useState(false);
  const [pickerMes, setPickerMes]     = useState(new Date().getMonth());
  const [pickerDia, setPickerDia]     = useState(1);

  // ── Calendar nav ────────────────────────────────────────────────────────────
  const [calMes, setCalMes]           = useState(new Date().getMonth());
  const [calAno, setCalAno]           = useState(new Date().getFullYear());

  // ── Modals ──────────────────────────────────────────────────────────────────
  const [modalAmor, setModalAmor]     = useState(false);
  const [modalTema, setModalTema]     = useState(false);
  const [modalAdmin, setModalAdmin]   = useState(false);

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

  function swipeAba(direcao) {
    const idx = ABAS.indexOf(abaAtiva);
    if (direcao === 'esq' && idx < ABAS.length - 1) setAbaAtiva(ABAS[idx + 1]);
    if (direcao === 'dir' && idx > 0) setAbaAtiva(ABAS[idx - 1]);
  }

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 20 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderRelease: (_, g) => {
        if (g.dx < -50) swipeAba('esq');
        if (g.dx > 50) swipeAba('dir');
      },
    })
  ).current;

  const hoje = todayKey();
  const isAdmin = perfil?.isAdmin === true;
  const s = makeStyles(tema);

  // ── Listeners refs (para cleanup) ───────────────────────────────────────────
  const listenersRef = useRef([]);

  // ══════════════════════════════════════════════════════════════════════════
  // LIFECYCLE
  // ══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    checarAtualizacao();
    const unsub = onAuthStateChanged(auth, async (user) => {
      setIniciando(false);
      if (user) {
        setAuthUser(user);
        await carregarPerfil(user.uid);
      } else {
        setAuthUser(null);
        setPerfil(null);
        setCasalId(null);
        setTela('auth'); setIniciando(false);
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
  // UPDATE CHECK
  // ══════════════════════════════════════════════════════════════════════════
  async function checarAtualizacao() {
    try {
      const res = await fetch('https://raw.githubusercontent.com/HarlleyDu/pilula-ana/master/versao.json');
      const json = await res.json();
      if (json.versao !== VERSAO_ATUAL) setAtualizacao(json);
    } catch(e) {}
  }

  // ══════════════════════════════════════════════════════════════════════════
  // AUTH
  // ══════════════════════════════════════════════════════════════════════════
  async function fazerLogin() {
    setAuthLoading(true); setAuthErro('');
    try {
      await signInWithEmailAndPassword(auth, authEmail.trim(), authSenha);
    } catch(e) {
      setAuthErro(traduzirErroAuth(e.code));
    }
    setAuthLoading(false);
  }

  async function fazerCadastro() {
    if (!authNome.trim()) { setAuthErro('Coloca seu nome!'); return; }
    if (authSenha.length < 6) { setAuthErro('Senha precisa ter ao menos 6 caracteres.'); return; }
    setAuthLoading(true); setAuthErro('');
    try {
      const cred = await createUserWithEmailAndPassword(auth, authEmail.trim(), authSenha);
      await updateProfile(cred.user, { displayName: authNome.trim() });
      // Salvar perfil no DB
      const isHarlley = authEmail.trim().toLowerCase() === 'harlleyduarte@gmail.com';
      await set(ref(db, `usuarios/${cred.user.uid}`), {
        nome: authNome.trim(),
        email: authEmail.trim().toLowerCase(),
        isAdmin: isHarlley,
        casalId: null,
        criadoEm: new Date().toISOString(),
      });
    } catch(e) {
      setAuthErro(traduzirErroAuth(e.code));
    }
    setAuthLoading(false);
  }

  async function fazerLogout() {
    pararListeners();
    await signOut(auth);
    setHistorico({}); setPausa(null); setPontos({ ana:0, harlley:0 });
    setDataInicio(null); setFotos({}); setCasalId(null); setPerfil(null);
  }

  function traduzirErroAuth(code) {
    const erros = {
      'auth/invalid-email': 'Email inválido.',
      'auth/user-not-found': 'Usuário não encontrado.',
      'auth/wrong-password': 'Senha incorreta.',
      'auth/email-already-in-use': 'Este email já está cadastrado.',
      'auth/weak-password': 'Senha muito fraca.',
      'auth/network-request-failed': 'Sem internet.',
      'auth/too-many-requests': 'Muitas tentativas. Tente mais tarde.',
    };
    return erros[code] || 'Erro desconhecido. Tente novamente.';
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PERFIL
  // ══════════════════════════════════════════════════════════════════════════
  async function carregarPerfil(uid) {
    const snap = await get(ref(db, `usuarios/${uid}`));
    if (!snap.exists()) { setTela('auth'); return; }
    const p = snap.val();
    setPerfil({ ...p, uid });
    if (p.casalId) {
      setCasalId(p.casalId);
      setTela('app');
    } else {
      setTela('pair');
    }
    // Carregar tema
    if (p.casalId) {
      const tSnap = await get(ref(db, `casais/${p.casalId}/tema`));
      if (tSnap.exists()) aplicarTema(tSnap.val());
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PAIR SYSTEM
  // ══════════════════════════════════════════════════════════════════════════
  function gerarChavePair() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let k = '';
    for (let i = 0; i < 6; i++) k += chars[Math.floor(Math.random()*chars.length)];
    return k;
  }

  async function criarCasal() {
    setPairLoading(true);
    const chave = gerarChavePair();
    const id    = `casal_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
    await set(ref(db, `casais/${id}`), {
      criadoEm: new Date().toISOString(),
      chave,
      membros: { [authUser.uid]: perfil.nome },
    });
    await set(ref(db, `pairCodes/${chave}`), { casalId: id, criadoEm: new Date().toISOString() });
    await set(ref(db, `usuarios/${authUser.uid}/casalId`), id);
    await set(ref(db, `usuarios/${authUser.uid}/role`), 'admin');
    setPairChave(chave);
    setCasalId(id);
    setPerfil(p => ({ ...p, casalId: id, role:'admin' }));
    setPairStep('mostrarChave');
    setPairLoading(false);
  }

  async function entrarCasal() {
    if (pairInput.trim().length < 4) { Alert.alert('Chave inválida'); return; }
    setPairLoading(true);
    const code = pairInput.trim().toUpperCase();
    const snap = await get(ref(db, `pairCodes/${code}`));
    if (!snap.exists()) {
      Alert.alert('Chave não encontrada', 'Verifique a chave e tente de novo.');
      setPairLoading(false); return;
    }
    const { casalId: cid } = snap.val();
    // Verificar se o casal já tem 2 membros
    const casalSnap = await get(ref(db, `casais/${cid}/membros`));
    const membros = casalSnap.val() || {};
    if (Object.keys(membros).length >= 2 && !membros[authUser.uid]) {
      Alert.alert('Casal cheio', 'Esse link já foi usado por outra pessoa.');
      setPairLoading(false); return;
    }
    await set(ref(db, `casais/${cid}/membros/${authUser.uid}`), perfil.nome);
    await set(ref(db, `usuarios/${authUser.uid}/casalId`), cid);
    await set(ref(db, `usuarios/${authUser.uid}/role`), 'parceiro');
    // Invalidar o código após uso
    await remove(ref(db, `pairCodes/${code}`));
    setCasalId(cid);
    setPerfil(p => ({ ...p, casalId: cid, role:'parceiro' }));
    setModalPair(false);
    setTela('app');
    setPairLoading(false);
  }

  async function sairDoCasal() {
    Alert.alert(
      'Sair da dupla?',
      'Você vai perder o acesso aos dados desta dupla.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: async () => {
          pararListeners();
          await remove(ref(db, `casais/${casalId}/membros/${authUser.uid}`));
          await set(ref(db, `usuarios/${authUser.uid}/casalId`), null);
          await set(ref(db, `usuarios/${authUser.uid}/role`), null);
          setCasalId(null); setPerfil(p => ({ ...p, casalId: null, role: null }));
          setHistorico({}); setPausa(null); setDataInicio(null); setFotos({});
          setTela('pair');
        }}
      ]
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FIREBASE LISTENERS
  // ══════════════════════════════════════════════════════════════════════════
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

    // Ouvir parceiro
    onValue(ref(db, `casais/${cid}/membros`), snap => {
      const m = snap.val() || {};
      const ids = Object.keys(m).filter(id => id !== authUser?.uid);
      if (ids.length > 0) setParceiro({ uid: ids[0], nome: m[ids[0]] });
    });

    // Carregar usuários para admin global
    if (perfil?.isAdmin) {
      onValue(ref(db, 'usuarios'), snap => {
        const u = snap.val() || {};
        setAdminUsers(Object.entries(u).map(([uid, d]) => ({ uid, ...d })));
      });
    }
    configurarAlarmes();
  }

  function pararListeners() {
    listenersRef.current.forEach(({ r }) => off(r));
    listenersRef.current = [];
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TEMA
  // ══════════════════════════════════════════════════════════════════════════
  function aplicarTema(t) {
    if (typeof t === 'string') { setTemaNome(t); setTemaState(TEMAS[t] || TEMAS.roxo); }
    else if (t?.nome) { setTemaNome(t.nome); setTemaState(TEMAS[t.nome] || TEMAS.roxo); }
  }

  async function salvarTema(nome) {
    await set(ref(db, `casais/${casalId}/tema`), nome);
    setModalTema(false);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // APP LOGIC
  // ══════════════════════════════════════════════════════════════════════════
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

  async function definirDataInicio() {
    const ano = new Date().getFullYear();
    const dataStr = `${ano}-${String(pickerMes+1).padStart(2,'0')}-${String(pickerDia).padStart(2,'0')}`;
    const novoHistorico = {};
    let d = dataStr;
    while (d <= hoje) {
      novoHistorico[d] = { data:d, hora:'20:30', tomou:true };
      const dt = new Date(d + 'T12:00:00');
      dt.setDate(dt.getDate() + 1);
      d = dateToKey(dt);
    }
    await set(ref(db, `casais/${casalId}/historico`), novoHistorico);
    await set(ref(db, `casais/${casalId}/dataInicio`), dataStr);
    setModalInicio(false);
    Alert.alert('✅ Pronto!', `Histórico preenchido desde ${dataStr} até hoje!`);
  }

  async function marcarTomou() {
    if (!casalId) return;
    const d = new Date();
    const hora = d.toTimeString().slice(0,5);
    const minutos = d.getHours()*60 + d.getMinutes();
    const dentroDaJanela = minutos >= 20*60+30 && minutos <= 20*60+40;
    await set(ref(db, `casais/${casalId}/historico/${hoje}`), { data:hoje, hora, tomou:true });
    const np = { ...pontos };
    const roleName = perfil?.nome?.toLowerCase() || 'ana';
    const pNome = roleName.includes('harlley') ? 'harlley' : 'ana';
    if (dentroDaJanela) np.ana = (np.ana||0)+1;
    else np[pNome] = (np[pNome]||0)+1;
    await set(ref(db, `casais/${casalId}/pontos`), np);

    const totalDias = Object.keys(historico).length + 1;
    if (totalDias % 28 === 0) {
      dispararConfete();
      Alert.alert('🎉 Parabéns!', 'Cartela completa! Inicie a pausa de 4 dias.');
    }

    setModalAmor(true);
    Animated.sequence([
      Animated.timing(fadeAmor, { toValue:1, duration:500, useNativeDriver:true }),
      Animated.delay(2500),
      Animated.timing(fadeAmor, { toValue:0, duration:500, useNativeDriver:true }),
    ]).start(() => setModalAmor(false));
  }

  // Toggle sem alert (apenas visual feedback sutil)
  async function adminToggleDia(key) {
    if (!isAdmin) return;
    if (historico[key]) {
      await remove(ref(db, `casais/${casalId}/historico/${key}`));
    } else {
      await set(ref(db, `casais/${casalId}/historico/${key}`), { data:key, hora:'20:30', tomou:true });
    }
    // Sem Alert! Feedback apenas pelo calendário mudando.
  }

  async function iniciarPausa() {
    const fim = addDias(hoje, 4);
    await set(ref(db, `casais/${casalId}/pausa`), { inicio:hoje, fim, ativa:true });
  }

  async function despausar() {
    await set(ref(db, `casais/${casalId}/pausa`), { ...pausa, ativa:false });
  }

  async function apagarHistorico() {
    Alert.alert('Apagar TUDO?', 'Isso apaga todo histórico!', [
      { text: 'Cancelar', style:'cancel' },
      { text: 'Apagar', style:'destructive', onPress: async () => {
        await remove(ref(db, `casais/${casalId}/historico`));
        await remove(ref(db, `casais/${casalId}/dataInicio`));
        setDataInicio(null);
      }}
    ]);
  }

  // ── Foto da galeria ─────────────────────────────────────────────────────────
  const [modalFotoUrl, setModalFotoUrl] = useState(false);
  const [urlFotoTemp, setUrlFotoTemp] = useState('');

  async function escolherFoto() {
    setModalFotoUrl(true);
  }

  async function salvarFotoUrl() {
    if (!urlFotoTemp.trim()) return;
    await set(ref(db, `casais/${casalId}/fotos/${authUser.uid}`), urlFotoTemp.trim());
    setUrlFotoTemp('');
    setModalFotoUrl(false);
  }

  // ── Email sugestão ──────────────────────────────────────────────────────────
  async function enviarSugestao() {
    if (!sugestao.trim()) return;
    const texto = sugestao.trim();
    await push(ref(db, `casais/${casalId}/sugestoes`), {
      texto, data: new Date().toISOString(), usuario: perfil?.nome
    });
    // Enviar via EmailJS (configure suas credenciais no emailjs.com)
    try {
      await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id:  'service_pilula',        // ← crie em emailjs.com
          template_id: 'template_sugestao',     // ← crie o template
          user_id:     'SUA_PUBLIC_KEY_EMAILJS', // ← sua public key
          template_params: {
            from_name: perfil?.nome || 'Usuário',
            message: texto,
            to_email: ADMIN_EMAIL,
          }
        })
      });
    } catch(e) { /* silencioso */ }
    setSugestao('');
    Alert.alert('Enviado! 💡', 'Sugestão registrada e enviada para o Harlley!');
  }

  // ═══════════════════════════════════════════════════
  // CALENDAR HELPERS
  // ═══════════════════════════════════════════════════
  function getDiasDoMes() {
    const total = diasNoMes(calMes, calAno);
    const cells = [];
    for (let d = 1; d <= total; d++) {
      const key = `${calAno}-${String(calMes+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const tomou   = !!historico[key];
      const eHoje   = key === hoje;
      const futuro  = key > hoje;
      const isPausa = pausa?.ativa && key >= pausa.inicio && key <= pausa.fim;
      const isFalta = !tomou && !futuro && !isPausa && dataInicio && key >= dataInicio;
      cells.push({ d, key, tomou, eHoje, futuro, isPausa, isFalta });
    }
    return cells;
  }

  function dispararConfete() {
    setConfete(true);
    confeteAnims.forEach(a => {
      a.y.setValue(0); a.x.setValue(0); a.op.setValue(1); a.rot.setValue(0);
      Animated.parallel([
        Animated.timing(a.y, { toValue:500+Math.random()*200, duration:1800, useNativeDriver:true }),
        Animated.timing(a.x, { toValue:(Math.random()-0.5)*280, duration:1800, useNativeDriver:true }),
        Animated.timing(a.op, { toValue:0, duration:1800, useNativeDriver:true }),
        Animated.timing(a.rot, { toValue:Math.random()*10, duration:1800, useNativeDriver:true }),
      ]).start();
    });
    setTimeout(() => setConfete(false), 2000);
  }

  // ── Computed ────────────────────────────────────────────────────────────────
  const tomouHoje  = !!historico[hoje];
  const totalDias  = Object.keys(historico).length;
  const diaCartela = totalDias % 28 || (totalDias > 0 ? 28 : 0);
  const cartelas   = Math.floor(totalDias / 28);
  const pausaDias  = () => {
    if (!pausa?.ativa) return null;
    const diff = Math.ceil((new Date(pausa.fim+'T23:59:59') - new Date()) / (1000*60*60*24));
    return diff > 0 ? diff : null;
  };
  const pD         = pausaDias();
  const fotoAtual  = fotos[authUser?.uid];
  const nomeAtual  = perfil?.nome || 'Usuário';

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER: SPLASH
  // ══════════════════════════════════════════════════════════════════════════
  if (tela === 'splash') return (
    <View style={s.splash}>
      <Text style={s.splashEmoji}>💊</Text>
      <Text style={s.splashTitle}>Pílula da Ana</Text>
      <ActivityIndicator color="#ff2d78" style={{ marginTop: 20 }} />
    </View>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER: AUTH
  // ══════════════════════════════════════════════════════════════════════════
  if (tela === 'auth') return (
    <ScrollView contentContainerStyle={s.authWrap} keyboardShouldPersistTaps="handled">
      <Text style={s.splashEmoji}>💊</Text>
      <Text style={s.splashTitle}>Pílula da Ana</Text>
      <Text style={s.authSub}>{authMode === 'login' ? 'Entrar na conta' : 'Criar conta'}</Text>

      {authMode === 'cadastro' && (
        <TextInput style={s.input} placeholder="Seu nome" placeholderTextColor="#555"
          value={authNome} onChangeText={setAuthNome} />
      )}
      <TextInput style={s.input} placeholder="Email" placeholderTextColor="#555"
        value={authEmail} onChangeText={setAuthEmail}
        autoCapitalize="none" keyboardType="email-address" />
      <TextInput style={s.input} placeholder="Senha (mín. 6 caracteres)" placeholderTextColor="#555"
        value={authSenha} onChangeText={setAuthSenha} secureTextEntry />

      {!!authErro && <Text style={s.erroTxt}>{authErro}</Text>}

      <TouchableOpacity style={s.btnPrimary}
        onPress={authMode === 'login' ? fazerLogin : fazerCadastro}
        disabled={authLoading}>
        {authLoading
          ? <ActivityIndicator color="#fff" />
          : <Text style={s.btnPrimaryTxt}>{authMode === 'login' ? 'Entrar' : 'Criar conta'}</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity onPress={() => { setAuthMode(m => m==='login'?'cadastro':'login'); setAuthErro(''); }}>
        <Text style={s.authSwitch}>
          {authMode === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entrar'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER: PAIR SCREEN
  // ══════════════════════════════════════════════════════════════════════════
  if (tela === 'pair') return (
    <ScrollView contentContainerStyle={s.authWrap}>
      <Text style={{ fontSize: 52, marginBottom: 16 }}>💕</Text>
      <Text style={s.splashTitle}>Conectar dupla</Text>
      <Text style={s.authSub}>Olá, {nomeAtual}! Conecte-se com seu par.</Text>

      {pairStep === 'menu' && <>
        <TouchableOpacity style={s.btnPrimary} onPress={() => { setPairStep('gerar'); criarCasal(); }}>
          <Text style={s.btnPrimaryTxt}>✨ Criar nova dupla</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.btnSecondary} onPress={() => setPairStep('entrar')}>
          <Text style={s.btnSecondaryTxt}>🔑 Entrar com chave</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.btnSecondary, { marginTop: 8 }]} onPress={fazerLogout}>
          <Text style={s.btnSecondaryTxt}>🚪 Trocar de conta</Text>
        </TouchableOpacity>
      </>}

      {pairStep === 'gerar' && (
        pairLoading ? <ActivityIndicator color="#ff2d78" size="large" style={{ marginTop: 32 }} />
        : <Text style={s.loadingTxt}>Criando dupla...</Text>
      )}

      {pairStep === 'mostrarChave' && <>
        <View style={s.chaveBox}>
          <Text style={s.chaveLabel}>Sua chave de convite</Text>
          <Text style={s.chaveValor}>{pairChave}</Text>
          <Text style={s.chaveSub}>Compartilhe com seu par. A chave expira após uso.</Text>
        </View>
        <TouchableOpacity style={s.btnPrimary} onPress={() => { setTela('app'); }}>
          <Text style={s.btnPrimaryTxt}>Continuar →</Text>
        </TouchableOpacity>
      </>}

      {pairStep === 'entrar' && <>
        <Text style={s.authSub}>Digite a chave que seu par gerou:</Text>
        <TextInput style={[s.input, s.inputChave]} placeholder="Ex: AB3K7X" placeholderTextColor="#555"
          value={pairInput} onChangeText={t => setPairInput(t.toUpperCase())}
          autoCapitalize="characters" maxLength={6} />
        {pairLoading
          ? <ActivityIndicator color="#ff2d78" />
          : <TouchableOpacity style={s.btnPrimary} onPress={entrarCasal}>
              <Text style={s.btnPrimaryTxt}>🔑 Entrar na dupla</Text>
            </TouchableOpacity>
        }
        <TouchableOpacity style={s.btnSecondary} onPress={() => setPairStep('menu')}>
          <Text style={s.btnSecondaryTxt}>← Voltar</Text>
        </TouchableOpacity>
      </>}
    </ScrollView>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER: UPDATE BANNER
  // ══════════════════════════════════════════════════════════════════════════
  const UpdateBanner = atualizacao ? (
    <TouchableOpacity style={s.updateBanner} onPress={() => Linking.openURL(APK_URL)}>
      <Text style={s.updateBannerTxt}>🔄 Nova versão disponível! Toque para atualizar.</Text>
    </TouchableOpacity>
  ) : null;

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER: MAIN APP
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={false} />

      {/* Modal foto URL */}
      <Modal transparent visible={modalFotoUrl} animationType="slide">
        <View style={s.modalWrap}>
          <View style={s.modalCard}>
            <Text style={s.modalTitulo}>📷 URL da foto</Text>
            <Text style={s.modalSub}>Cole um link direto de imagem (Imgur, etc)</Text>
            <TextInput style={s.input} placeholder="https://..." placeholderTextColor="#555"
              value={urlFotoTemp} onChangeText={setUrlFotoTemp} autoCapitalize="none" />
            <TouchableOpacity style={s.btnPrimary} onPress={salvarFotoUrl}>
              <Text style={s.btnPrimaryTxt}>✅ Salvar foto</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.btnSecondary} onPress={() => setModalFotoUrl(false)}>
              <Text style={s.btnSecondaryTxt}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal amor */}
      <Modal transparent visible={modalAmor} animationType="none">
        <Animated.View style={[s.modalAmor, { opacity: fadeAmor }]}>
          <Text style={{ fontSize: 80 }}>💕</Text>
          <Text style={s.modalAmorTxt}>Eu te amo amor</Text>
        </Animated.View>
      </Modal>

      {/* Confete */}
      {confete && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {confeteAnims.map((a, i) => (
            <Animated.View key={i} style={{
              position:'absolute', top:80 + Math.random()*60,
              left:30 + (i * 22) % (SW - 60),
              width:10, height:10, borderRadius:5,
              backgroundColor: confeteCores[i % confeteCores.length],
              opacity: a.op,
              transform:[
                { translateY: a.y }, { translateX: a.x },
                { rotate: a.rot.interpolate({ inputRange:[0,10], outputRange:['0deg','360deg'] }) }
              ]
            }} />
          ))}
        </View>
      )}

      {/* Modal Data Início — Picker visual */}
      <Modal transparent visible={modalInicio} animationType="slide">
        <View style={s.modalWrap}>
          <View style={s.modalCard}>
            <Text style={s.modalTitulo}>📅 Quando começou?</Text>
            <Text style={s.modalSub}>Ano: {new Date().getFullYear()}</Text>

            <Text style={s.pickerLabel}>Mês</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {MESES.map((m, i) => (
                <TouchableOpacity key={i}
                  style={[s.pickerChip, pickerMes === i && { backgroundColor: tema.primary }]}
                  onPress={() => setPickerMes(i)}>
                  <Text style={[s.pickerChipTxt, pickerMes === i && { color: '#fff' }]}>{MESES_CURTOS[i]}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={s.pickerLabel}>Dia</Text>
            <View style={s.pickerDiasGrid}>
              {Array.from({ length: diasNoMes(pickerMes, new Date().getFullYear()) }, (_,i) => i+1).map(d => (
                <TouchableOpacity key={d}
                  style={[s.pickerDiaChip, pickerDia === d && { backgroundColor: tema.primary }]}
                  onPress={() => setPickerDia(d)}>
                  <Text style={[s.pickerDiaChipTxt, pickerDia === d && { color: '#fff' }]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={s.pickerPreview}>
              <Text style={s.pickerPreviewTxt}>
                {new Date().getFullYear()}-{String(pickerMes+1).padStart(2,'0')}-{String(pickerDia).padStart(2,'0')}
              </Text>
            </View>

            <TouchableOpacity style={s.btnPrimary} onPress={definirDataInicio}>
              <Text style={s.btnPrimaryTxt}>✅ Confirmar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.btnSecondary} onPress={() => setModalInicio(false)}>
              <Text style={s.btnSecondaryTxt}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Pair */}
      <Modal transparent visible={modalPair} animationType="slide">
        <View style={s.modalWrap}>
          <View style={s.modalCard}>
            <Text style={s.modalTitulo}>💕 Dupla</Text>
            {parceiro
              ? <>
                  <Text style={s.modalSub}>Conectado com: <Text style={{ color: tema.primary }}>{parceiro.nome}</Text></Text>
                  <TouchableOpacity style={[s.btnSecondary, { borderColor:'#ff4444' }]} onPress={sairDoCasal}>
                    <Text style={[s.btnSecondaryTxt, { color:'#ff4444' }]}>💔 Sair da dupla</Text>
                  </TouchableOpacity>
                </>
              : <>
                  <Text style={s.modalSub}>Nenhum par conectado ainda.</Text>
                  {pairStep !== 'entrar' && (
                    <TouchableOpacity style={s.btnSecondary} onPress={() => setPairStep('entrar')}>
                      <Text style={s.btnSecondaryTxt}>🔑 Entrar com chave</Text>
                    </TouchableOpacity>
                  )}
                  {pairStep === 'entrar' && <>
                    <TextInput style={[s.input, s.inputChave]} placeholder="Chave do par" placeholderTextColor="#555"
                      value={pairInput} onChangeText={t => setPairInput(t.toUpperCase())} maxLength={6} />
                    <TouchableOpacity style={s.btnPrimary} onPress={entrarCasal}>
                      <Text style={s.btnPrimaryTxt}>🔑 Entrar</Text>
                    </TouchableOpacity>
                  </>}
                </>
            }
            <TouchableOpacity style={s.btnSecondary} onPress={() => { setModalPair(false); setPairStep('menu'); }}>
              <Text style={s.btnSecondaryTxt}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Tema */}
      <Modal transparent visible={modalTema} animationType="slide">
        <View style={s.modalWrap}>
          <View style={s.modalCard}>
            <Text style={s.modalTitulo}>🎨 Tema</Text>
            {Object.entries(TEMAS).map(([nome, t]) => (
              <TouchableOpacity key={nome}
                style={[s.temaBtn, temaNome === nome && { borderColor: t.primary }]}
                onPress={() => salvarTema(nome)}>
                <View style={[s.temaCor, { backgroundColor: t.primary }]} />
                <Text style={s.temaTxt}>{nome.charAt(0).toUpperCase()+nome.slice(1)}</Text>
                {temaNome === nome && <Text style={{ color: t.primary, fontWeight:'800' }}>✓</Text>}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={s.btnSecondary} onPress={() => setModalTema(false)}>
              <Text style={s.btnSecondaryTxt}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Admin */}
      <Modal transparent visible={modalAdmin} animationType="slide">
        <View style={s.modalWrap}>
          <View style={s.modalCard}>
            <Text style={s.modalTitulo}>👑 Painel Admin</Text>
            <TouchableOpacity style={s.adminBtn} onPress={() => { setModalAdmin(false); setModalInicio(true); }}>
              <Text style={s.adminBtnTxt}>📅 Definir data de início</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.adminBtn} onPress={() => { setModalAdmin(false); iniciarPausa(); }}>
              <Text style={s.adminBtnTxt}>⏸️ Forçar pausa de 4 dias</Text>
            </TouchableOpacity>
            {pausa?.ativa && (
              <TouchableOpacity style={s.adminBtn} onPress={() => { setModalAdmin(false); despausar(); }}>
                <Text style={s.adminBtnTxt}>▶️ Encerrar pausa agora</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[s.adminBtn, { borderColor:'#ff4444' }]}
              onPress={() => { setModalAdmin(false); apagarHistorico(); }}>
              <Text style={[s.adminBtnTxt, { color:'#ff4444' }]}>🗑️ Apagar todo histórico</Text>
            </TouchableOpacity>

            {perfil?.isAdmin && adminUsers.length > 0 && <>
              <Text style={[s.modalSub, { marginTop: 16 }]}>👥 Usuários cadastrados ({adminUsers.length})</Text>
              {adminUsers.slice(0,8).map(u => (
                <Text key={u.uid} style={s.adminUserLine}>
                  {u.nome} — {u.email} {u.casalId ? '✅' : '⏳'}
                </Text>
              ))}
            </>}

            <Text style={[s.modalSub, { marginTop: 12 }]}>
              Para editar dias: vá ao Calendário e toque no dia.
            </Text>
            <TouchableOpacity style={s.btnSecondary} onPress={() => setModalAdmin(false)}>
              <Text style={s.btnSecondaryTxt}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.headerLeft} onPress={() => setAbaAtiva('perfil')}>
          {fotoAtual
            ? <Image source={{ uri: fotoAtual }} style={s.avatarHeader} />
            : <View style={s.avatarVazio}><Text style={{ fontSize:16 }}>👤</Text></View>
          }
          <View style={{ marginLeft: 10 }}>
            <Text style={s.headerTitle}>{nomeAtual} {isAdmin ? '👑' : '💕'}</Text>
            <Text style={s.headerSub}>
              {parceiro ? `💞 Com ${parceiro.nome}` : '💔 Sem par conectado'}
            </Text>
          </View>
        </TouchableOpacity>
        <View style={{ flexDirection:'row', gap:8 }}>
          <TouchableOpacity style={s.iconBtn} onPress={() => setModalTema(true)}>
            <Text style={{ fontSize:18 }}>🎨</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn} onPress={() => setModalPair(true)}>
            <Text style={{ fontSize:18 }}>💕</Text>
          </TouchableOpacity>
          {isAdmin && (
            <TouchableOpacity style={[s.iconBtn, { backgroundColor: tema.primary }]} onPress={() => setModalAdmin(true)}>
              <Text style={{ fontSize:12, fontWeight:'800', color:'#fff' }}>ADM</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {UpdateBanner}

      {/* Abas */}
      <View style={s.abas}>
        {[['home','🏠'],['calendario','📅'],['ranking','🏆'],['sugestoes','💡'],['perfil','👤']].map(([aba,ic]) => (
          <TouchableOpacity key={aba} style={[s.aba, abaAtiva===aba && { borderBottomWidth:2.5, borderBottomColor:tema.primary }]}
            onPress={() => setAbaAtiva(aba)}>
            <Text style={[s.abaTxt, abaAtiva===aba && { opacity:1 }]}>{ic}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={s.body} contentContainerStyle={s.bodyContent} {...panResponder.panHandlers}>

        {/* ── HOME ── */}
        {abaAtiva === 'home' && <>
          {pD ? (
            <View style={[s.card, { borderColor:'#ffd60a' }]}>
              <Text style={{ fontSize:44, marginBottom:8 }}>⏸️</Text>
              <Text style={[s.cardTitulo, { color:'#ffd60a' }]}>Pausa ativa</Text>
              <Text style={s.cardSub}>{pD} dias restantes até {pausa?.fim}</Text>
              {isAdmin && (
                <TouchableOpacity style={[s.btnSecondary, { marginTop:12, width:'100%' }]} onPress={despausar}>
                  <Text style={s.btnSecondaryTxt}>▶️ Encerrar pausa</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : <>
            <View style={[s.card, { borderColor: tomouHoje ? '#00ff87' : tema.primary }]}>
              <Text style={{ fontSize:48, marginBottom:8 }}>{tomouHoje ? '✅' : '⏰'}</Text>
              <Text style={s.cardTitulo}>{tomouHoje ? 'Tomou hoje!' : 'Ainda não registrou'}</Text>
              <Text style={s.cardSub}>Lembrete às 20:30 · Dia {diaCartela}/28</Text>
            </View>
            {!tomouHoje && (
              <Animated.View style={{ transform:[{ scale: pulseBtn }] }}>
                <TouchableOpacity style={s.btnPrimary} onPress={marcarTomou}>
                  <Text style={s.btnPrimaryTxt}>💊 Marcar que tomou agora</Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </>}

          {dataInicio
            ? <View style={s.infoCard}>
                <Text style={s.infoTxt}>📅 Início: {dataInicio}</Text>
                <Text style={s.infoTxt}>💊 Total: {totalDias} dias</Text>
                <Text style={s.infoTxt}>📦 Cartelas completas: {cartelas}</Text>
                <Text style={s.infoTxt}>📍 Dia atual: {diaCartela}/28</Text>
              </View>
            : isAdmin && (
              <TouchableOpacity style={s.btnSecondary} onPress={() => setModalInicio(true)}>
                <Text style={s.btnSecondaryTxt}>📅 Definir data de início</Text>
              </TouchableOpacity>
            )
          }
        </>}

        {/* ── CALENDÁRIO ── */}
        {abaAtiva === 'calendario' && <>
          <View style={s.calHeader}>
            <TouchableOpacity onPress={() => {
              if (calMes===0) { setCalMes(11); setCalAno(a=>a-1); } else setCalMes(m=>m-1);
            }}>
              <Text style={s.calNav}>‹</Text>
            </TouchableOpacity>
            <Text style={s.calTitulo}>{MESES[calMes]} {calAno}</Text>
            <TouchableOpacity onPress={() => {
              if (calMes===11) { setCalMes(0); setCalAno(a=>a+1); } else setCalMes(m=>m+1);
            }}>
              <Text style={s.calNav}>›</Text>
            </TouchableOpacity>
          </View>

          {isAdmin && <Text style={s.adminDica}>👑 Toque em qualquer dia para marcar/desmarcar</Text>}

          <View style={s.calGrid}>
            {['D','S','T','Q','Q','S','S'].map((d,i) => (
              <View key={i} style={s.calDiaSemana}><Text style={s.calDiaSemanaT}>{d}</Text></View>
            ))}
            {(() => {
              const primeiroDia = new Date(calAno, calMes, 1).getDay();
              const cells = [];
              for (let i=0; i<primeiroDia; i++) cells.push(<View key={'e'+i} style={s.calCelVazia} />);
              getDiasDoMes().forEach(({ d, key, tomou, eHoje, futuro, isPausa, isFalta }) => {
                let celStyle = [s.calCel];
                let numStyle = [s.calDiaNum];
                let emoji = null;

                if (tomou) {
                  celStyle.push({ backgroundColor: tema.primary+'33', borderColor: tema.primary });
                  numStyle.push({ color: tema.primary, fontWeight:'800' });
                  emoji = '✓';
                } else if (isPausa) {
                  celStyle.push({ backgroundColor:'#ffd60a22', borderColor:'#ffd60a' });
                  numStyle.push({ color:'#ffd60a' });
                  emoji = '⏸';
                } else if (isFalta) {
                  celStyle.push({ backgroundColor:'#ff444422', borderColor:'#ff4444' });
                  numStyle.push({ color:'#ff4444' });
                  emoji = '✗';
                }

                if (eHoje) celStyle.push({ borderColor: tema.accent, borderWidth:2 });

                cells.push(
                  <TouchableOpacity key={key} style={celStyle}
                    onPress={() => isAdmin && !futuro && adminToggleDia(key)}
                    activeOpacity={isAdmin ? 0.6 : 1}>
                    <Text style={numStyle}>{d}</Text>
                    {emoji && <Text style={{ fontSize:8 }}>{emoji}</Text>}
                  </TouchableOpacity>
                );
              });
              return cells;
            })()}
          </View>

          <View style={s.calLegRow}>
            {[
              { cor: tema.primary+'33', bor: tema.primary, txt:'Tomou' },
              { cor:'#ffd60a22', bor:'#ffd60a', txt:'Pausa' },
              { cor:'#ff444422', bor:'#ff4444', txt:'Falta' },
              { cor:'transparent', bor: tema.accent, txt:'Hoje', bw:2 },
            ].map((l,i) => (
              <View key={i} style={s.calLegItem}>
                <View style={[s.calLegCor, { backgroundColor:l.cor, borderColor:l.bor, borderWidth:l.bw||1 }]} />
                <Text style={s.calLegTxt}>{l.txt}</Text>
              </View>
            ))}
          </View>
        </>}

        {/* ── RANKING ── */}
        {abaAtiva === 'ranking' && <>
          <Text style={s.secLabel}>🏆 Ranking</Text>
          <Text style={s.subLabel}>Ana pontua tomando entre 20:30–20:40</Text>
          {[
            { uid: authUser?.uid, nome: nomeAtual, foto: fotoAtual, pts: pontos[nomeAtual?.toLowerCase()] || 0 },
            { uid: parceiro?.uid, nome: parceiro?.nome||'Parceiro', foto: fotos[parceiro?.uid], pts: pontos[parceiro?.nome?.toLowerCase()] || 0 },
          ].map((p,i) => (
            <View key={i} style={[s.rankCard, i>0&&{marginTop:12}]}>
              {p.foto
                ? <Image source={{uri:p.foto}} style={s.rankFoto}/>
                : <Text style={{fontSize:32,marginRight:16}}>👤</Text>
              }
              <Text style={s.rankNome}>{p.nome}</Text>
              <Text style={[s.rankPts, { color:tema.primary }]}>{p.pts}</Text>
              <Text style={s.rankPtsSub}> pts</Text>
            </View>
          ))}
        </>}

        {/* ── SUGESTÕES ── */}
        {abaAtiva === 'sugestoes' && <>
          <Text style={s.secLabel}>💡 Sugestões</Text>
          <Text style={s.subLabel}>Sua ideia vai para o email do Harlley!</Text>
          <TextInput style={[s.input, { minHeight:130, textAlignVertical:'top' }]}
            placeholder="Escreva sua sugestão..." placeholderTextColor="#444"
            value={sugestao} onChangeText={setSugestao} multiline />
          <TouchableOpacity style={s.btnPrimary} onPress={enviarSugestao}>
            <Text style={s.btnPrimaryTxt}>📨 Enviar sugestão</Text>
          </TouchableOpacity>
        </>}

        {/* ── PERFIL ── */}
        {abaAtiva === 'perfil' && <>
          <Text style={s.secLabel}>👤 Perfil</Text>
          <View style={s.perfilCard}>
            <TouchableOpacity onPress={escolherFoto}>
              {fotoAtual
                ? <Image source={{uri:fotoAtual}} style={[s.fotoPerfil, { borderColor:tema.primary }]}/>
                : <View style={[s.fotoPerfilVazio, { borderColor:tema.primary }]}>
                    <Text style={{fontSize:36}}>📷</Text>
                  </View>
              }
              <View style={[s.editBadge, { backgroundColor:tema.primary }]}>
                <Text style={s.editBadgeTxt}>📷 Alterar foto</Text>
              </View>
            </TouchableOpacity>
            <Text style={s.perfilNome}>{nomeAtual}</Text>
            <Text style={s.perfilEmail}>{perfil?.email}</Text>
            {isAdmin && <Text style={[s.perfilRole, { color:tema.primary }]}>👑 Admin</Text>}
            <Text style={s.perfilVersao}>v{VERSAO_ATUAL}</Text>
          </View>

          <View style={s.statsRow}>
            {[
              { n: totalDias,      l:'Dias' },
              { n: diaCartela+'/28', l:'Cartela' },
              { n: cartelas,       l:'Completas' },
            ].map((st,i) => (
              <View key={i} style={s.statBox}>
                <Text style={[s.statNum, { color:tema.primary }]}>{st.n}</Text>
                <Text style={s.statLabel}>{st.l}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={s.btnSecondary} onPress={() => setModalTema(true)}>
            <Text style={s.btnSecondaryTxt}>🎨 Mudar tema</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.btnSecondary} onPress={() => setModalPair(true)}>
            <Text style={s.btnSecondaryTxt}>💕 Gerenciar dupla</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btnSecondary, { marginTop:4, borderColor:'#ff4444' }]} onPress={fazerLogout}>
            <Text style={[s.btnSecondaryTxt, { color:'#ff4444' }]}>🚪 Sair da conta</Text>
          </TouchableOpacity>
        </>}

      </ScrollView>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════════════════════
function makeStyles(tema) {
  return StyleSheet.create({
    root:         { flex:1, backgroundColor:tema.bg },
    splash:       { flex:1, backgroundColor:'#0a0010', alignItems:'center', justifyContent:'center', padding:24 },
    splashEmoji:  { fontSize:64, marginBottom:16 },
    splashTitle:  { fontSize:28, fontWeight:'800', color:'#fff', marginBottom:8, textAlign:'center' },

    authWrap:     { flexGrow:1, backgroundColor:'#0a0010', padding:28, justifyContent:'center', paddingBottom:60 },
    authSub:      { fontSize:14, color:'#555', textAlign:'center', marginBottom:28 },
    authSwitch:   { color:'#7b2fff', textAlign:'center', marginTop:16, fontSize:14 },
    erroTxt:      { color:'#ff4444', textAlign:'center', marginBottom:12, fontSize:13 },
    loadingTxt:   { color:'#555', textAlign:'center', marginTop:32 },

    // Pair
    chaveBox:     { backgroundColor:tema.card, borderRadius:20, padding:28, alignItems:'center', marginBottom:24, borderWidth:1, borderColor:tema.primary },
    chaveLabel:   { fontSize:13, color:tema.sub, marginBottom:8 },
    chaveValor:   { fontSize:42, fontWeight:'900', color:tema.primary, letterSpacing:8 },
    chaveSub:     { fontSize:12, color:'#555', marginTop:12, textAlign:'center' },
    inputChave:   { fontSize:28, fontWeight:'900', textAlign:'center', letterSpacing:6 },

    // Inputs / Buttons
    input:        { backgroundColor:tema.card, borderRadius:12, padding:16, color:tema.text, fontSize:15, marginBottom:12, borderWidth:1, borderColor:tema.border },
    btnPrimary:   { backgroundColor:tema.primary, borderRadius:16, padding:18, alignItems:'center', marginBottom:10 },
    btnPrimaryTxt:{ color:'#fff', fontWeight:'800', fontSize:16 },
    btnSecondary: { backgroundColor:tema.card, borderRadius:16, padding:16, alignItems:'center', marginBottom:10, borderWidth:1, borderColor:tema.border },
    btnSecondaryTxt:{ color:tema.sub, fontWeight:'700', fontSize:14 },

    // Header
    header:       { backgroundColor:tema.card, padding:16, paddingTop:48, flexDirection:'row', justifyContent:'space-between', alignItems:'center', borderBottomWidth:1, borderBottomColor:tema.border },
    headerLeft:   { flexDirection:'row', alignItems:'center' },
    headerTitle:  { fontSize:17, fontWeight:'800', color:tema.text },
    headerSub:    { fontSize:12, color:tema.sub, marginTop:2 },
    avatarHeader: { width:40, height:40, borderRadius:20, borderWidth:2, borderColor:tema.primary },
    avatarVazio:  { width:40, height:40, borderRadius:20, backgroundColor:tema.card, borderWidth:2, borderColor:tema.border, alignItems:'center', justifyContent:'center' },
    iconBtn:      { backgroundColor:tema.card, borderRadius:20, paddingHorizontal:12, paddingVertical:6, borderWidth:1, borderColor:tema.border },

    // Update
    updateBanner: { backgroundColor:'#ffd60a22', padding:10, alignItems:'center', borderBottomWidth:1, borderBottomColor:'#ffd60a' },
    updateBannerTxt:{ color:'#ffd60a', fontSize:12, fontWeight:'700' },

    // Abas
    abas:         { flexDirection:'row', backgroundColor:tema.card, borderBottomWidth:1, borderBottomColor:tema.border },
    aba:          { flex:1, padding:12, alignItems:'center' },
    abaTxt:       { fontSize:18, opacity:0.45 },

    // Body
    body:         { flex:1 },
    bodyContent:  { padding:20, paddingBottom:60 },

    // Cards
    card:         { backgroundColor:tema.card, borderRadius:20, padding:24, alignItems:'center', borderWidth:1, marginBottom:16 },
    cardTitulo:   { fontSize:20, fontWeight:'800', color:tema.text, marginBottom:4 },
    cardSub:      { fontSize:13, color:tema.sub, marginTop:4 },
    infoCard:     { backgroundColor:tema.card, borderRadius:14, padding:16, borderWidth:1, borderColor:tema.border, marginBottom:12 },
    infoTxt:      { color:tema.sub, fontSize:13, marginBottom:6 },

    // Labels
    secLabel:     { fontSize:11, fontWeight:'800', color:'#555', letterSpacing:1.5, textTransform:'uppercase', marginBottom:8 },
    subLabel:     { fontSize:13, color:'#555', marginBottom:16, lineHeight:20 },

    // Picker
    pickerLabel:  { fontSize:13, color:tema.sub, fontWeight:'700', marginBottom:8 },
    pickerChip:   { paddingHorizontal:14, paddingVertical:8, borderRadius:20, backgroundColor:tema.border, marginRight:8 },
    pickerChipTxt:{ color:tema.sub, fontWeight:'700', fontSize:13 },
    pickerDiasGrid:{ flexDirection:'row', flexWrap:'wrap', gap:6, marginBottom:16 },
    pickerDiaChip:{ width:38, height:38, borderRadius:10, backgroundColor:tema.border, alignItems:'center', justifyContent:'center' },
    pickerDiaChipTxt:{ color:tema.sub, fontWeight:'700', fontSize:13 },
    pickerPreview:{ backgroundColor:tema.border, borderRadius:12, padding:12, alignItems:'center', marginBottom:16 },
    pickerPreviewTxt:{ color:tema.primary, fontWeight:'900', fontSize:20, letterSpacing:2 },

    // Calendar
    calHeader:    { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:16 },
    calTitulo:    { fontSize:18, fontWeight:'800', color:tema.text },
    calNav:       { fontSize:30, color:tema.primary, paddingHorizontal:12 },
    calGrid:      { flexDirection:'row', flexWrap:'wrap' },
    calDiaSemana: { width:'14.28%', alignItems:'center', paddingBottom:8 },
    calDiaSemanaT:{ fontSize:12, color:'#555', fontWeight:'700' },
    calCel:       { width:'14.28%', aspectRatio:1, alignItems:'center', justifyContent:'center', borderRadius:8, borderWidth:1, borderColor:'transparent', marginBottom:4 },
    calCelVazia:  { width:'14.28%', aspectRatio:1 },
    calDiaNum:    { fontSize:13, color:tema.sub },
    adminDica:    { fontSize:11, color:tema.primary, textAlign:'center', marginBottom:10, fontWeight:'700' },
    calLegRow:    { flexDirection:'row', flexWrap:'wrap', gap:12, marginTop:16 },
    calLegItem:   { flexDirection:'row', alignItems:'center' },
    calLegCor:    { width:14, height:14, borderRadius:4 },
    calLegTxt:    { color:'#555', fontSize:11, marginLeft:5 },

    // Ranking
    rankCard:     { backgroundColor:tema.card, borderRadius:16, padding:20, flexDirection:'row', alignItems:'center', borderWidth:1, borderColor:tema.border },
    rankFoto:     { width:44, height:44, borderRadius:22, marginRight:16, borderWidth:2, borderColor:tema.primary },
    rankNome:     { fontSize:18, fontWeight:'800', color:tema.text, flex:1 },
    rankPts:      { fontSize:26, fontWeight:'900' },
    rankPtsSub:   { fontSize:13, color:tema.sub, alignSelf:'flex-end', marginBottom:2 },

    // Modals
    modalWrap:    { flex:1, backgroundColor:'rgba(0,0,0,0.88)', justifyContent:'center', padding:20 },
    modalCard:    { backgroundColor:tema.card, borderRadius:20, padding:24, borderWidth:1, borderColor:tema.border, maxHeight:'90%' },
    modalTitulo:  { fontSize:20, fontWeight:'800', color:tema.text, marginBottom:8 },
    modalSub:     { fontSize:13, color:'#555', marginBottom:16 },
    modalAmor:    { flex:1, backgroundColor:'rgba(255,45,120,0.95)', alignItems:'center', justifyContent:'center' },
    modalAmorTxt: { fontSize:32, fontWeight:'800', color:'#fff', marginTop:16 },

    // Tema
    temaBtn:      { flexDirection:'row', alignItems:'center', padding:14, borderRadius:12, borderWidth:1, borderColor:tema.border, marginBottom:8 },
    temaCor:      { width:22, height:22, borderRadius:11, marginRight:12 },
    temaTxt:      { fontSize:15, color:tema.text, flex:1 },

    // Admin
    adminBtn:     { padding:16, borderRadius:12, borderWidth:1, borderColor:tema.border, marginBottom:10 },
    adminBtnTxt:  { color:tema.text, fontWeight:'700', fontSize:14 },
    adminUserLine:{ color:tema.sub, fontSize:12, marginBottom:4 },

    // Perfil
    perfilCard:   { backgroundColor:tema.card, borderRadius:16, padding:24, alignItems:'center', borderWidth:1, borderColor:tema.border, marginBottom:16 },
    fotoPerfil:   { width:90, height:90, borderRadius:45, borderWidth:3 },
    fotoPerfilVazio:{ width:90, height:90, borderRadius:45, backgroundColor:tema.bg, borderWidth:3, alignItems:'center', justifyContent:'center' },
    editBadge:    { borderRadius:20, paddingHorizontal:12, paddingVertical:5, marginTop:10, alignSelf:'center' },
    editBadgeTxt: { color:'#fff', fontSize:12, fontWeight:'700' },
    perfilNome:   { fontSize:22, fontWeight:'800', color:tema.text, marginTop:12 },
    perfilEmail:  { fontSize:13, color:'#555', marginTop:4 },
    perfilRole:   { fontSize:13, fontWeight:'700', marginTop:4 },
    perfilVersao: { fontSize:11, color:'#444', marginTop:8 },
    statsRow:     { flexDirection:'row', gap:8, marginBottom:16 },
    statBox:      { flex:1, backgroundColor:tema.card, borderRadius:12, padding:14, alignItems:'center', borderWidth:1, borderColor:tema.border },
    statNum:      { fontSize:22, fontWeight:'800' },
    statLabel:    { fontSize:11, color:'#555', marginTop:4, textAlign:'center' },
  });
}
