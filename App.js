import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Alert, TextInput, Linking, Modal, Animated, Image, Platform
} from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, onValue, push, remove } from 'firebase/database';

const firebaseConfig = { databaseURL: "https://pilula-ana-default-rtdb.firebaseio.com" };
const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);

const VERSAO_ATUAL = "2.2.0";
const APK_URL = "https://expo.dev/artifacts/eas/uZSKEtJ8yBTbWBw56fK7aU.apk";

const TEMAS = {
  roxo: { primary: '#ff2d78', bg: '#0a0010', card: '#130020', border: '#2a1040', accent: '#7b2fff', text: '#fff', sub: '#aa88cc' },
  dourado: { primary: '#ffd60a', bg: '#0a0800', card: '#1a1200', border: '#3a2a00', accent: '#ff9500', text: '#fff', sub: '#ccaa44' },
  ciano: { primary: '#00e5ff', bg: '#000a10', card: '#001520', border: '#003040', accent: '#0088cc', text: '#fff', sub: '#44aacc' },
  verde: { primary: '#00ff87', bg: '#000a05', card: '#001510', border: '#003020', accent: '#00cc66', text: '#fff', sub: '#44cc88' },
  personalizado: { primary: '#ff2d78', bg: '#0a0010', card: '#130020', border: '#2a1040', accent: '#7b2fff', text: '#fff', sub: '#aa88cc' },
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false }),
});

function isAnoBissexto(ano) {
  return (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;
}

function diasNoMes(mes, ano) {
  const dias = [31, isAnoBissexto(ano) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return dias[mes];
}

function dateToKey(date) {
  return date.toISOString().slice(0, 10);
}

function addDias(dateStr, dias) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + dias);
  return dateToKey(d);
}

function diffDias(d1, d2) {
  const a = new Date(d1 + 'T12:00:00');
  const b = new Date(d2 + 'T12:00:00');
  return Math.floor((b - a) / (1000 * 60 * 60 * 24));
}

export default function App() {
  const [tela, setTela] = useState('splash');
  const [usuario, setUsuario] = useState(null);
  const [modoAdmin, setModoAdmin] = useState(false);
  const [historico, setHistorico] = useState({});
  const [pausa, setPausa] = useState(null);
  const [pontos, setPontos] = useState({ ana: 0, harlley: 0 });
  const [atualizacao, setAtualizacao] = useState(null);
  const [sugestao, setSugestao] = useState('');
  const [abaAtiva, setAbaAtiva] = useState('home');
  const [loginNome, setLoginNome] = useState('');
  const [loginSenha, setLoginSenha] = useState('');
  const [modalAmor, setModalAmor] = useState(false);
  const [fotoAna, setFotoAna] = useState(null);
  const [fotoHarlley, setFotoHarlley] = useState(null);
  const [editandoFoto, setEditandoFoto] = useState(false);
  const [urlFotoTemp, setUrlFotoTemp] = useState('');
  const [mesAtual, setMesAtual] = useState(new Date().getMonth());
  const [anoAtual, setAnoAtual] = useState(new Date().getFullYear());
  const [dataInicio, setDataInicio] = useState(null);
  const [modalInicio, setModalInicio] = useState(false);
  const [inputInicio, setInputInicio] = useState('');
  const [modalAdmin, setModalAdmin] = useState(false);
  const [modalTema, setModalTema] = useState(false);
  const [temaSelecionado, setTemaSelecionado] = useState('roxo');
  const [corPersonalizada, setCorPersonalizada] = useState('#ff2d78');
  const [confete, setConfete] = useState(false);
  const [pagHistorico, setPagHistorico] = useState(1);

  const fadeAmor = useRef(new Animated.Value(0)).current;
  const pulseBtnAnim = useRef(new Animated.Value(1)).current;
  const abaAnim = useRef(new Animated.Value(0)).current;
  const confeteAnims = useRef(Array(12).fill(null).map(() => ({
    y: new Animated.Value(0),
    x: new Animated.Value(0),
    op: new Animated.Value(1),
    rot: new Animated.Value(0),
  }))).current;

  const hoje = dateToKey(new Date());
  const tema = temaSelecionado === 'personalizado'
    ? { ...TEMAS.personalizado, primary: corPersonalizada, accent: corPersonalizada }
    : TEMAS[temaSelecionado];

  useEffect(() => { checarAtualizacao(); }, []);
  useEffect(() => { if (usuario) { iniciarApp(); } }, [usuario]);
  useEffect(() => { if (pausa) checarPausaExpirada(); }, [pausa]);

  useEffect(() => {
    if (tela === 'app') {
      Animated.timing(abaAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    }
  }, [abaAtiva]);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseBtnAnim, { toValue: 1.05, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseBtnAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  async function checarAtualizacao() {
    try {
      const res = await fetch('https://raw.githubusercontent.com/HarlleyDu/pilula-ana/master/versao.json');
      const json = await res.json();
      if (json.versao !== VERSAO_ATUAL) { setAtualizacao(json); setTela('atualizar'); }
      else setTela('login');
    } catch(e) { setTela('login'); }
  }

  async function checarPausaExpirada() {
    if (!pausa || !pausa.ativa) return;
    if (new Date() >= new Date(pausa.fim + 'T23:59:59')) {
      await set(ref(db, 'pausa'), { ...pausa, ativa: false });
      Alert.alert('Pausa encerrada! 💊', 'Os 4 dias acabaram. Hora de começar nova cartela!');
    }
  }

  function iniciarApp() {
    onValue(ref(db, 'historico'), (snap) => {
      setHistorico(snap.val() || {});
    });
    onValue(ref(db, 'pausa'), (snap) => setPausa(snap.val()));
    onValue(ref(db, 'pontos'), (snap) => { if (snap.val()) setPontos(snap.val()); });
    onValue(ref(db, 'dataInicio'), (snap) => { if (snap.val()) setDataInicio(snap.val()); });
    onValue(ref(db, 'fotos'), (snap) => {
      const d = snap.val();
      if (d) { if (d.ana) setFotoAna(d.ana); if (d.harlley) setFotoHarlley(d.harlley); }
    });
    onValue(ref(db, 'tema'), (snap) => {
      const d = snap.val();
      if (d) { if (d.nome) setTemaSelecionado(d.nome); if (d.cor) setCorPersonalizada(d.cor); }
    });
    configurarAlarmes();
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
      content: { title: 'Ana ainda não tomou! ⏰', body: 'Lembra ela de tomar a pílula!', sound: true },
      trigger: { hour: 20, minute: 40, repeats: true },
    });
  }

  async function definirDataInicio(dataStr) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataStr)) {
      Alert.alert('Formato inválido', 'Use o formato AAAA-MM-DD\nExemplo: 2025-03-01');
      return;
    }
    const inicio = dataStr;
    const novoHistorico = {};
    let d = inicio;
    while (d <= hoje) {
      novoHistorico[d] = { data: d, hora: '20:30', tomou: true };
      const dt = new Date(d + 'T12:00:00');
      dt.setDate(dt.getDate() + 1);
      d = dateToKey(dt);
    }
    await set(ref(db, 'historico'), novoHistorico);
    await set(ref(db, 'dataInicio'), inicio);
    setModalInicio(false);
    setInputInicio('');
    Alert.alert('✅ Pronto!', 'Histórico preenchido desde ' + inicio + ' até hoje!');
  }

  async function marcarTomou() {
    const d = new Date();
    const hora = d.toTimeString().slice(0, 5);
    const minutos = d.getHours() * 60 + d.getMinutes();
    const dentroDaJanela = minutos >= 20*60+30 && minutos <= 20*60+40;
    const novoHist = { ...historico, [hoje]: { data: hoje, hora, tomou: true } };
    await set(ref(db, 'historico/' + hoje), { data: hoje, hora, tomou: true });
    const np = { ...pontos };
    if (dentroDaJanela) np.ana = (np.ana||0)+1;
    else np.harlley = (np.harlley||0)+1;
    await set(ref(db, 'pontos'), np);

    const totalDias = Object.keys(novoHist).length;
    const diaCartela = totalDias % 28;
    if (diaCartela === 0 && totalDias > 0) {
      dispararConfete();
      await Notifications.scheduleNotificationAsync({
        content: { title: '🎉 Cartela completa!', body: 'Ana completou os 28 dias! Hora da pausa de 4 dias 💕', sound: true },
        trigger: null,
      });
      Alert.alert('🎉 Parabéns!', 'Ana completou os 28 dias! Inicie a pausa de 4 dias.');
    }

    setModalAmor(true);
    Animated.sequence([
      Animated.timing(fadeAmor, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.delay(2500),
      Animated.timing(fadeAmor, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start(() => setModalAmor(false));
  }

  async function adminToggleDia(dataKey) {
    if (!modoAdmin) return;
    if (historico[dataKey]) {
      const novoHist = { ...historico };
      delete novoHist[dataKey];
      await remove(ref(db, 'historico/' + dataKey));
      Alert.alert('Removido', 'Dia ' + dataKey + ' desmarcado.');
    } else {
      await set(ref(db, 'historico/' + dataKey), { data: dataKey, hora: '20:30', tomou: true });
      Alert.alert('Marcado', 'Dia ' + dataKey + ' marcado como tomado.');
    }
  }

  async function iniciarPausa() {
    const fim = addDias(hoje, 4);
    await set(ref(db, 'pausa'), { inicio: hoje, fim, ativa: true });
    Alert.alert('Pausa iniciada!', 'Nova cartela começa em ' + fim);
  }

  async function despausar() {
    await set(ref(db, 'pausa'), { ...pausa, ativa: false });
    Alert.alert('Pausa encerrada!', 'A Ana pode continuar tomando.');
  }

  async function apagarHistorico() {
    Alert.alert('Apagar TUDO?', 'Isso vai apagar todo o histórico e não pode ser desfeito!', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar tudo', style: 'destructive', onPress: async () => {
        await remove(ref(db, 'historico'));
        await remove(ref(db, 'dataInicio'));
        setDataInicio(null);
        Alert.alert('Apagado!', 'Histórico zerado.');
      }}
    ]);
  }

  async function salvarTema(nome, cor) {
    await set(ref(db, 'tema'), { nome, cor: cor || corPersonalizada });
    setTemaSelecionado(nome);
    setModalTema(false);
  }

  async function salvarFoto() {
    if (!urlFotoTemp.trim()) return;
    await set(ref(db, 'fotos/' + usuario), urlFotoTemp);
    setEditandoFoto(false);
    setUrlFotoTemp('');
  }

  function dispararConfete() {
    setConfete(true);
    confeteAnims.forEach((a, i) => {
      a.y.setValue(0); a.x.setValue(0); a.op.setValue(1); a.rot.setValue(0);
      Animated.parallel([
        Animated.timing(a.y, { toValue: 600 + Math.random()*200, duration: 2000, useNativeDriver: true }),
        Animated.timing(a.x, { toValue: (Math.random()-0.5)*300, duration: 2000, useNativeDriver: true }),
        Animated.timing(a.op, { toValue: 0, duration: 2000, useNativeDriver: true }),
        Animated.timing(a.rot, { toValue: Math.random()*10, duration: 2000, useNativeDriver: true }),
      ]).start();
    });
    setTimeout(() => setConfete(false), 2200);
  }

  function fazerLogin() {
    const nome = loginNome.trim().toLowerCase();
    const senha = loginSenha.trim();
    if (nome === 'ana' && senha === 'ana123') {
      setUsuario('ana'); setModoAdmin(false); setTela('app');
    } else if (nome === 'harlley' && senha === 'harl123') {
      setUsuario('harlley'); setModoAdmin(true); setTela('app');
    } else Alert.alert('Erro', 'Nome ou senha incorretos!');
  }

  const tomouHoje = !!historico[hoje];
  const pausaDias = () => {
    if (!pausa || !pausa.ativa) return null;
    const diff = Math.ceil((new Date(pausa.fim + 'T23:59:59') - new Date()) / (1000*60*60*24));
    return diff > 0 ? diff : null;
  };

  const getDiasDoMes = () => {
    const total = diasNoMes(mesAtual, anoAtual);
    const dias = [];
    for (let d = 1; d <= total; d++) {
      const key = `${anoAtual}-${String(mesAtual+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const tomou = !!historico[key];
      const eHoje = key === hoje;
      const futuro = key > hoje;
      const semInicio = dataInicio && key < dataInicio;
      dias.push({ d, key, tomou, eHoje, futuro, semInicio });
    }
    return dias;
  };

  const mesesNomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const totalDias = Object.keys(historico).length;
  const diaCartela = totalDias % 28 || (totalDias > 0 ? 28 : 0);
  const cartelas = Math.floor(totalDias / 28);
  const fotoAtual = usuario === 'ana' ? fotoAna : fotoHarlley;
  const pD = pausaDias();
  const confeteCores = ['#ff2d78','#ffd60a','#00ff87','#00e5ff','#7b2fff','#ff9500'];

  const s = makeStyles(tema);

  if (tela === 'splash') return (
    <View style={s.splash}>
      <Text style={s.splashEmoji}>💊</Text>
      <Text style={s.splashTitle}>Pílula da Ana</Text>
      <Text style={s.splashSub}>Carregando...</Text>
    </View>
  );

  if (tela === 'atualizar') return (
    <View style={s.splash}>
      <Text style={s.splashEmoji}>🔄</Text>
      <Text style={s.splashTitle}>Nova versão disponível!</Text>
      {atualizacao?.notas?.map((n,i) => <Text key={i} style={s.notaItem}>• {n}</Text>)}
      <TouchableOpacity style={s.btnPrimary} onPress={() => Linking.openURL(APK_URL)}>
        <Text style={s.btnPrimaryTxt}>Baixar atualização agora</Text>
      </TouchableOpacity>
    </View>
  );

  if (tela === 'login') return (
    <View style={s.loginWrap}>
      <Text style={s.splashEmoji}>💊</Text>
      <Text style={s.splashTitle}>Pílula da Ana</Text>
      <Text style={s.loginSub}>Entre na sua conta</Text>
      <TextInput style={s.input} placeholder="Seu nome" placeholderTextColor="#555"
        value={loginNome} onChangeText={setLoginNome} autoCapitalize="none" />
      <TextInput style={s.input} placeholder="Senha" placeholderTextColor="#555"
        value={loginSenha} onChangeText={setLoginSenha} secureTextEntry />
      <TouchableOpacity style={s.btnPrimary} onPress={fazerLogin}>
        <Text style={s.btnPrimaryTxt}>Entrar</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={s.root}>

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
              position: 'absolute',
              top: 100 + Math.random()*100,
              left: 50 + (i * 30) % 300,
              width: 10, height: 10,
              borderRadius: 5,
              backgroundColor: confeteCores[i % confeteCores.length],
              opacity: a.op,
              transform: [{ translateY: a.y }, { translateX: a.x }, { rotate: a.rot.interpolate({ inputRange:[0,10], outputRange:['0deg','360deg'] }) }]
            }} />
          ))}
        </View>
      )}

      {/* Modal foto */}
      <Modal transparent visible={editandoFoto} animationType="slide">
        <View style={s.modalWrap}>
          <View style={s.modalCard}>
            <Text style={s.modalTitulo}>📷 URL da sua foto</Text>
            <Text style={s.modalSub}>Cole um link direto de imagem (Imgur, Google Drive, etc)</Text>
            <TextInput style={s.input} placeholder="https://..." placeholderTextColor="#555"
              value={urlFotoTemp} onChangeText={setUrlFotoTemp} autoCapitalize="none" />
            <TouchableOpacity style={s.btnPrimary} onPress={salvarFoto}>
              <Text style={s.btnPrimaryTxt}>✅ Salvar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.btnSecondary} onPress={() => setEditandoFoto(false)}>
              <Text style={s.btnSecondaryTxt}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal data início */}
      <Modal transparent visible={modalInicio} animationType="slide">
        <View style={s.modalWrap}>
          <View style={s.modalCard}>
            <Text style={s.modalTitulo}>📅 Data de início</Text>
            <Text style={s.modalSub}>Quando a Ana começou a tomar o Yazflex?{'\n'}Formato: AAAA-MM-DD</Text>
            <TextInput style={s.input} placeholder="2025-03-01" placeholderTextColor="#555"
              value={inputInicio} onChangeText={setInputInicio} keyboardType="numeric" />
            <TouchableOpacity style={s.btnPrimary} onPress={() => definirDataInicio(inputInicio)}>
              <Text style={s.btnPrimaryTxt}>✅ Confirmar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.btnSecondary} onPress={() => setModalInicio(false)}>
              <Text style={s.btnSecondaryTxt}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal tema */}
      <Modal transparent visible={modalTema} animationType="slide">
        <View style={s.modalWrap}>
          <View style={s.modalCard}>
            <Text style={s.modalTitulo}>🎨 Escolher tema</Text>
            {Object.keys(TEMAS).filter(t => t !== 'personalizado').map(nome => (
              <TouchableOpacity key={nome} style={[s.temaBtn, temaSelecionado===nome && s.temaBtnAtivo]}
                onPress={() => salvarTema(nome)}>
                <View style={[s.temaCor, { backgroundColor: TEMAS[nome].primary }]} />
                <Text style={s.temaTxt}>{nome.charAt(0).toUpperCase()+nome.slice(1)}</Text>
                {temaSelecionado===nome && <Text style={{ color: TEMAS[nome].primary }}>✓</Text>}
              </TouchableOpacity>
            ))}
            <Text style={[s.modalSub, { marginTop: 12 }]}>Cor personalizada (hex):</Text>
            <TextInput style={s.input} placeholder="#ff2d78" placeholderTextColor="#555"
              value={corPersonalizada} onChangeText={setCorPersonalizada} autoCapitalize="none" />
            <TouchableOpacity style={s.btnPrimary} onPress={() => salvarTema('personalizado', corPersonalizada)}>
              <Text style={s.btnPrimaryTxt}>🎨 Usar cor personalizada</Text>
            </TouchableOpacity>
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
              <Text style={s.adminBtnTxt}>📅 Definir data de início da Ana</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.adminBtn} onPress={() => { setModalAdmin(false); iniciarPausa(); }}>
              <Text style={s.adminBtnTxt}>⏸️ Forçar pausa de 4 dias</Text>
            </TouchableOpacity>
            {pausa?.ativa && (
              <TouchableOpacity style={s.adminBtn} onPress={() => { setModalAdmin(false); despausar(); }}>
                <Text style={s.adminBtnTxt}>▶️ Encerrar pausa agora</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[s.adminBtn, { borderColor: '#ff4444' }]} onPress={() => { setModalAdmin(false); apagarHistorico(); }}>
              <Text style={[s.adminBtnTxt, { color: '#ff4444' }]}>🗑️ Apagar todo o histórico</Text>
            </TouchableOpacity>
            <Text style={[s.modalSub, { marginTop: 12 }]}>Para editar um dia específico, vá ao Calendário e toque no dia (modo admin).</Text>
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
            : <View style={s.avatarVazio}><Text style={{ fontSize: 16 }}>👤</Text></View>
          }
          <View style={{ marginLeft: 10 }}>
            <Text style={s.headerTitle}>Pílula da Ana</Text>
            <Text style={s.headerSub}>{usuario==='ana'?'Olá, Ana! 💕':modoAdmin?'👑 Admin':'Olá, Harlley!'}</Text>
          </View>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={s.iconBtn} onPress={() => setModalTema(true)}>
            <Text style={{ fontSize: 18 }}>🎨</Text>
          </TouchableOpacity>
          {modoAdmin && (
            <TouchableOpacity style={[s.iconBtn, { backgroundColor: tema.primary }]} onPress={() => setModalAdmin(true)}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#fff' }}>ADM</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Abas */}
      <View style={s.abas}>
        {['home','calendario','ranking','sugestoes','perfil'].map(aba => (
          <TouchableOpacity key={aba} style={[s.aba, abaAtiva===aba && { borderBottomWidth: 2, borderBottomColor: tema.primary }]}
            onPress={() => { abaAnim.setValue(0); setAbaAtiva(aba); }}>
            <Text style={[s.abaTxt, abaAtiva===aba && { opacity: 1 }]}>
              {aba==='home'?'🏠':aba==='calendario'?'📅':aba==='ranking'?'🏆':aba==='sugestoes'?'💡':'👤'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={s.body} contentContainerStyle={s.bodyContent}>

        {/* HOME */}
        {abaAtiva === 'home' && <>
          {pD ? (
            <View style={[s.card, { borderColor: '#ffd60a' }]}>
              <Text style={{ fontSize: 40, marginBottom: 8 }}>⏸️</Text>
              <Text style={[s.cardTitulo, { color: '#ffd60a' }]}>Pausa ativa</Text>
              <Text style={s.cardSub}>{pD} dias restantes</Text>
              <Text style={s.cardSub}>Nova cartela em {pausa?.fim}</Text>
            </View>
          ) : <>
            <View style={[s.card, { borderColor: tomouHoje ? '#00ff87' : tema.primary }]}>
              <Text style={{ fontSize: 44, marginBottom: 8 }}>{tomouHoje ? '✅' : '⏰'}</Text>
              <Text style={s.cardTitulo}>{tomouHoje ? 'Tomou hoje!' : 'Ainda não registrou'}</Text>
              <Text style={s.cardSub}>Lembrete às 20:30 • Dia {diaCartela}/28 da cartela</Text>
            </View>
            {!tomouHoje && (
              <Animated.View style={{ transform: [{ scale: pulseBtnAnim }] }}>
                <TouchableOpacity style={s.btnPrimary} onPress={marcarTomou}>
                  <Text style={s.btnPrimaryTxt}>💊 Marcar que tomou agora</Text>
                </TouchableOpacity>
              </Animated.View>
            )}
            {modoAdmin && !tomouHoje && (
              <TouchableOpacity style={s.btnSecondary} onPress={marcarTomou}>
                <Text style={s.btnSecondaryTxt}>🧪 Simular que Ana tomou</Text>
              </TouchableOpacity>
            )}
          </>}

          {dataInicio ? (
            <View style={s.infoCard}>
              <Text style={s.infoTxt}>📅 Início: {dataInicio}</Text>
              <Text style={s.infoTxt}>💊 Total de dias: {totalDias}</Text>
              <Text style={s.infoTxt}>📦 Cartelas completas: {cartelas}</Text>
              <Text style={s.infoTxt}>📍 Dia atual na cartela: {diaCartela}/28</Text>
            </View>
          ) : (
            <TouchableOpacity style={s.btnSecondary} onPress={() => setModalInicio(true)}>
              <Text style={s.btnSecondaryTxt}>📅 Definir data de início</Text>
            </TouchableOpacity>
          )}
        </>}

        {/* CALENDÁRIO */}
        {abaAtiva === 'calendario' && <>
          <View style={s.calHeader}>
            <TouchableOpacity onPress={() => {
              if (mesAtual === 0) { setMesAtual(11); setAnoAtual(a => a-1); }
              else setMesAtual(m => m-1);
            }}>
              <Text style={s.calNav}>‹</Text>
            </TouchableOpacity>
            <Text style={s.calTitulo}>{mesesNomes[mesAtual]} {anoAtual}</Text>
            <TouchableOpacity onPress={() => {
              if (mesAtual === 11) { setMesAtual(0); setAnoAtual(a => a+1); }
              else setMesAtual(m => m+1);
            }}>
              <Text style={s.calNav}>›</Text>
            </TouchableOpacity>
          </View>

          {modoAdmin && <Text style={s.adminDica}>👑 Toque em qualquer dia para marcar/desmarcar</Text>}

          <View style={s.calGrid}>
            {['D','S','T','Q','Q','S','S'].map((d,i) => (
              <View key={i} style={s.calDiaSemana}><Text style={s.calDiaSemanaT}>{d}</Text></View>
            ))}
            {(() => {
              const primeiroDia = new Date(anoAtual, mesAtual, 1).getDay();
              const cells = [];
              for (let i = 0; i < primeiroDia; i++) cells.push(<View key={'e'+i} style={s.calCelVazia} />);
              getDiasDoMes().forEach(({ d, key, tomou, eHoje, futuro, semInicio }) => {
                cells.push(
                  <TouchableOpacity key={key} style={[
                    s.calCel,
                    tomou && { backgroundColor: tema.primary + '33', borderColor: tema.primary },
                    eHoje && { borderColor: tema.accent, borderWidth: 2 },
                    semInicio && { opacity: 0.2 },
                  ]} onPress={() => modoAdmin && !futuro && adminToggleDia(key)}>
                    <Text style={[s.calDiaNum, tomou && { color: tema.primary, fontWeight: '800' }, eHoje && { color: tema.accent }]}>{d}</Text>
                    {tomou && <Text style={{ fontSize: 8 }}>✓</Text>}
                  </TouchableOpacity>
                );
              });
              return cells;
            })()}
          </View>

          <View style={s.calLegenda}>
            <View style={[s.calLegCor, { backgroundColor: tema.primary + '33', borderColor: tema.primary, borderWidth: 1 }]} />
            <Text style={s.calLegTxt}>Tomou</Text>
            <View style={[s.calLegCor, { borderColor: tema.accent, borderWidth: 2, marginLeft: 16 }]} />
            <Text style={s.calLegTxt}>Hoje</Text>
          </View>
        </>}

        {/* RANKING */}
        {abaAtiva === 'ranking' && <>
          <Text style={s.secLabel}>🏆 Ranking de pontos</Text>
          <Text style={s.subLabel}>Ana ganha ponto tomando entre 20:30–20:40{'\n'}Harlley ganha fora desse horário</Text>
          {[{nome:'Ana',foto:fotoAna,pts:pontos.ana||0,emoji:'💃'},{nome:'Harlley',foto:fotoHarlley,pts:pontos.harlley||0,emoji:'🧢'}].map((p,i) => (
            <View key={i} style={[s.rankCard, i>0&&{marginTop:12}]}>
              {p.foto ? <Image source={{uri:p.foto}} style={s.rankFoto}/> : <Text style={{fontSize:32,marginRight:16}}>{p.emoji}</Text>}
              <Text style={s.rankNome}>{p.nome}</Text>
              <Text style={[s.rankPts, { color: tema.primary }]}>{p.pts} pts</Text>
              {p.pts > 0 && p.pts >= (i===0?pontos.harlley||0:pontos.ana||0) && <Text style={{fontSize:22,marginLeft:8}}>👑</Text>}
            </View>
          ))}
        </>}

        {/* SUGESTÕES */}
        {abaAtiva === 'sugestoes' && <>
          <Text style={s.secLabel}>💡 Sugerir melhoria</Text>
          <Text style={s.subLabel}>Sua ideia vai direto pro Harlley avaliar!</Text>
          <TextInput style={[s.input, { minHeight: 120, textAlignVertical: 'top' }]}
            placeholder="Escreva sua sugestão..." placeholderTextColor="#444"
            value={sugestao} onChangeText={setSugestao} multiline />
          <TouchableOpacity style={s.btnPrimary} onPress={async () => {
            if (!sugestao.trim()) return;
            await push(ref(db, 'sugestoes'), { texto: sugestao, data: new Date().toISOString(), usuario });
            setSugestao('');
            Alert.alert('Enviado! 💡', 'Sugestão registrada!');
          }}>
            <Text style={s.btnPrimaryTxt}>📨 Enviar sugestão</Text>
          </TouchableOpacity>
        </>}

        {/* PERFIL */}
        {abaAtiva === 'perfil' && <>
          <Text style={s.secLabel}>👤 Perfil</Text>
          <View style={s.perfilCard}>
            <TouchableOpacity onPress={() => setEditandoFoto(true)}>
              {fotoAtual
                ? <Image source={{uri:fotoAtual}} style={[s.fotoPerfil, { borderColor: tema.primary }]}/>
                : <View style={[s.fotoPerfilVazio, { borderColor: tema.primary }]}><Text style={{fontSize:36}}>📷</Text></View>
              }
              <View style={[s.editBadge, { backgroundColor: tema.primary }]}>
                <Text style={s.editBadgeTxt}>✏️ Alterar</Text>
              </View>
            </TouchableOpacity>
            <Text style={s.perfilNome}>{usuario==='ana'?'Ana 💕':'Harlley 👑'}</Text>
            <Text style={s.perfilInfo}>Versão {VERSAO_ATUAL}</Text>
          </View>

          <View style={s.statsRow}>
            {[{n:totalDias,l:'Dias totais'},{n:diaCartela+'/28',l:'Cartela atual'},{n:cartelas,l:'Cartelas'}].map((st,i) => (
              <View key={i} style={s.statBox}>
                <Text style={[s.statNum, { color: tema.primary }]}>{st.n}</Text>
                <Text style={s.statLabel}>{st.l}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={s.btnSecondary} onPress={() => setAbaAtiva('home') || setModalTema(true)}>
            <Text style={s.btnSecondaryTxt}>🎨 Mudar tema</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[s.btnSecondary, { marginTop: 10 }]} onPress={() => {
            setUsuario(null); setTela('login'); setLoginNome(''); setLoginSenha('');
          }}>
            <Text style={s.btnSecondaryTxt}>🚪 Sair da conta</Text>
          </TouchableOpacity>
        </>}

      </ScrollView>
    </View>
  );
}

function makeStyles(tema) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: tema.bg },
    splash: { flex: 1, backgroundColor: tema.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
    splashEmoji: { fontSize: 64, marginBottom: 16 },
    splashTitle: { fontSize: 28, fontWeight: '800', color: tema.text, marginBottom: 8, textAlign: 'center' },
    splashSub: { fontSize: 14, color: '#666' },
    notaItem: { fontSize: 13, color: '#aaa', marginTop: 6, alignSelf: 'flex-start' },
    loginWrap: { flex: 1, backgroundColor: tema.bg, padding: 28, justifyContent: 'center' },
    loginSub: { fontSize: 14, color: '#555', textAlign: 'center', marginBottom: 32 },
    input: { backgroundColor: tema.card, borderRadius: 12, padding: 16, color: tema.text, fontSize: 15, marginBottom: 12, borderWidth: 1, borderColor: tema.border },
    btnPrimary: { backgroundColor: tema.primary, borderRadius: 16, padding: 18, alignItems: 'center', marginBottom: 10 },
    btnPrimaryTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
    btnSecondary: { backgroundColor: tema.card, borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: tema.border },
    btnSecondaryTxt: { color: tema.sub, fontWeight: '700', fontSize: 14 },
    header: { backgroundColor: tema.card, padding: 16, paddingTop: 48, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: tema.border },
    headerLeft: { flexDirection: 'row', alignItems: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '800', color: tema.text },
    headerSub: { fontSize: 12, color: tema.sub, marginTop: 2 },
    avatarHeader: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: tema.primary },
    avatarVazio: { width: 38, height: 38, borderRadius: 19, backgroundColor: tema.card, borderWidth: 2, borderColor: tema.border, alignItems: 'center', justifyContent: 'center' },
    iconBtn: { backgroundColor: tema.card, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: tema.border },
    abas: { flexDirection: 'row', backgroundColor: tema.card, borderBottomWidth: 1, borderBottomColor: tema.border },
    aba: { flex: 1, padding: 12, alignItems: 'center' },
    abaTxt: { fontSize: 18, opacity: 0.5 },
    body: { flex: 1 },
    bodyContent: { padding: 20, paddingBottom: 50 },
    card: { backgroundColor: tema.card, borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 1, marginBottom: 16 },
    cardTitulo: { fontSize: 20, fontWeight: '800', color: tema.text, marginBottom: 4 },
    cardSub: { fontSize: 13, color: tema.sub, marginTop: 4 },
    infoCard: { backgroundColor: tema.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: tema.border, marginBottom: 12 },
    infoTxt: { color: tema.sub, fontSize: 13, marginBottom: 6 },
    secLabel: { fontSize: 12, fontWeight: '800', color: '#555', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, marginTop: 4 },
    subLabel: { fontSize: 13, color: '#555', marginBottom: 16, lineHeight: 20 },
    calHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    calTitulo: { fontSize: 18, fontWeight: '800', color: tema.text },
    calNav: { fontSize: 28, color: tema.primary, paddingHorizontal: 12 },
    calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    calDiaSemana: { width: '14.28%', alignItems: 'center', paddingBottom: 8 },
    calDiaSemanaT: { fontSize: 12, color: '#555', fontWeight: '700' },
    calCel: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: 'transparent', marginBottom: 4 },
    calCelVazia: { width: '14.28%', aspectRatio: 1 },
    calDiaNum: { fontSize: 13, color: tema.sub },
    calLegenda: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
    calLegCor: { width: 16, height: 16, borderRadius: 4 },
    calLegTxt: { color: '#555', fontSize: 12, marginLeft: 6 },
    adminDica: { fontSize: 12, color: tema.primary, textAlign: 'center', marginBottom: 10, fontWeight: '700' },
    rankCard: { backgroundColor: tema.card, borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: tema.border },
    rankFoto: { width: 44, height: 44, borderRadius: 22, marginRight: 16, borderWidth: 2, borderColor: tema.primary },
    rankNome: { fontSize: 18, fontWeight: '800', color: tema.text, flex: 1 },
    rankPts: { fontSize: 22, fontWeight: '800' },
    modalWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 24 },
    modalCard: { backgroundColor: tema.card, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: tema.border },
    modalTitulo: { fontSize: 20, fontWeight: '800', color: tema.text, marginBottom: 8 },
    modalSub: { fontSize: 13, color: '#555', marginBottom: 16 },
    modalAmor: { flex: 1, backgroundColor: 'rgba(255,45,120,0.95)', alignItems: 'center', justifyContent: 'center' },
    modalAmorTxt: { fontSize: 32, fontWeight: '800', color: '#fff', marginTop: 16 },
    temaBtn: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: tema.border, marginBottom: 8 },
    temaBtnAtivo: { borderColor: tema.primary },
    temaCor: { width: 20, height: 20, borderRadius: 10, marginRight: 12 },
    temaTxt: { fontSize: 15, color: tema.text, flex: 1 },
    adminBtn: { padding: 16, borderRadius: 12, borderWidth: 1, borderColor: tema.border, marginBottom: 10 },
    adminBtnTxt: { color: tema.text, fontWeight: '700', fontSize: 14 },
    perfilCard: { backgroundColor: tema.card, borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: tema.border, marginBottom: 16 },
    fotoPerfil: { width: 90, height: 90, borderRadius: 45, borderWidth: 3 },
    fotoPerfilVazio: { width: 90, height: 90, borderRadius: 45, backgroundColor: tema.bg, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
    editBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8, alignSelf: 'center' },
    editBadgeTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },
    perfilNome: { fontSize: 22, fontWeight: '800', color: tema.text, marginTop: 12 },
    perfilInfo: { fontSize: 13, color: '#555', marginTop: 4 },
    statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    statBox: { flex: 1, backgroundColor: tema.card, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: tema.border },
    statNum: { fontSize: 24, fontWeight: '800' },
    statLabel: { fontSize: 11, color: '#555', marginTop: 4, textAlign: 'center' },
  });
}
