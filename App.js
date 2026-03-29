import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Alert, TextInput, Linking, Modal, Animated, Image, FlatList
} from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, onValue, push } from 'firebase/database';

const firebaseConfig = { databaseURL: "https://pilula-ana-default-rtdb.firebaseio.com" };
const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);

const VERSAO_ATUAL = "2.1.0";
const APK_URL = "https://expo.dev/artifacts/eas/tQvdjjarmdPHbrxsZMq821.apk";

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false }),
});

export default function App() {
  const [tela, setTela] = useState('splash');
  const [usuario, setUsuario] = useState(null);
  const [modoAdmin, setModoAdmin] = useState(false);
  const [historico, setHistorico] = useState([]);
  const [tomouHoje, setTomouHoje] = useState(false);
  const [cartela, setCartela] = useState([]);
  const [pausa, setPausa] = useState(null);
  const [pontos, setPontos] = useState({ ana: 0, harlley: 0 });
  const [atualizacao, setAtualizacao] = useState(null);
  const [sugestao, setSugestao] = useState('');
  const [abaAtiva, setAbaAtiva] = useState('home');
  const [loginNome, setLoginNome] = useState('');
  const [loginSenha, setLoginSenha] = useState('');
  const [modalAmor, setModalAmor] = useState(false);
  const [fotoPerfil, setFotoPerfil] = useState(null);
  const [fotoHarlley, setFotoHarlley] = useState(null);
  const [pagHistorico, setPagHistorico] = useState(1);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const hoje = new Date().toISOString().slice(0, 10);
  const ITENS_POR_PAG = 10;

  useEffect(() => { checarAtualizacao(); }, []);

  useEffect(() => {
    if (usuario) {
      carregarFoto();
      checarPausaExpirada();
    }
  }, [usuario, pausa]);

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
    const fim = new Date(pausa.fim);
    const agora = new Date();
    if (agora >= fim) {
      await set(ref(db, 'pausa'), { ...pausa, ativa: false });
      Alert.alert('Pausa encerrada!', 'Os 4 dias acabaram. Hora de começar nova cartela! 💊');
    }
  }

  async function carregarFoto() {
    try {
      const fAna = await AsyncStorage.getItem('foto_ana');
      const fHarl = await AsyncStorage.getItem('foto_harlley');
      if (fAna) setFotoPerfil(fAna);
      if (fHarl) setFotoHarlley(fHarl);
    } catch(e) {}
  }

  async function escolherFoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permissão negada', 'Precisa permitir acesso à galeria.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      if (usuario === 'ana') {
        setFotoPerfil(uri);
        await AsyncStorage.setItem('foto_ana', uri);
      } else {
        setFotoHarlley(uri);
        await AsyncStorage.setItem('foto_harlley', uri);
      }
    }
  }

  function fazerLogin() {
    const nome = loginNome.trim().toLowerCase();
    const senha = loginSenha.trim();
    if (nome === 'ana' && senha === 'ana123') {
      setUsuario('ana'); setModoAdmin(false); iniciarApp(); setTela('app');
    } else if (nome === 'harlley' && senha === 'harl123') {
      setUsuario('harlley'); setModoAdmin(true); iniciarApp(); setTela('app');
    } else {
      Alert.alert('Erro', 'Nome ou senha incorretos!');
    }
  }

  function iniciarApp() {
    carregarHistorico(); carregarCartela(); carregarPausa(); carregarPontos(); configurarAlarmes();
  }

  function carregarHistorico() {
    onValue(ref(db, 'historico'), (snap) => {
      const data = snap.val();
      if (data) {
        const lista = Object.values(data).sort((a, b) => b.data.localeCompare(a.data));
        setHistorico(lista);
        setTomouHoje(lista.some(h => h.data === hoje));
      }
    });
  }

  function carregarCartela() {
    onValue(ref(db, 'cartela'), (snap) => {
      const data = snap.val();
      setCartela(data || Array(28).fill(false));
    });
  }

  function carregarPausa() {
    onValue(ref(db, 'pausa'), (snap) => { setPausa(snap.val()); });
  }

  function carregarPontos() {
    onValue(ref(db, 'pontos'), (snap) => {
      const data = snap.val();
      if (data) setPontos(data);
    });
  }

  async function configurarAlarmes() {
    if (!Device.isDevice) return;
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Hora da pilula! 💊', body: 'Ana, não esqueça de tomar o Yazflex hoje', sound: true },
      trigger: { hour: 20, minute: 30, repeats: true },
    });
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Ana ainda não tomou! ⏰', body: 'Ela ainda não registrou a pilula de hoje. Lembra ela!', sound: true },
      trigger: { hour: 20, minute: 40, repeats: true },
    });
  }

  async function marcarTomou(simular) {
    const d = new Date();
    const hora = d.toTimeString().slice(0, 5);
    const minutos = d.getHours() * 60 + d.getMinutes();
    const dentroDaJanela = minutos >= 20 * 60 + 30 && minutos <= 20 * 60 + 40;

    await set(ref(db, 'historico/' + hoje), { data: hoje, hora, tomou: true });

    const novosPontos = { ...pontos };
    if (dentroDaJanela) novosPontos.ana = (novosPontos.ana || 0) + 1;
    else novosPontos.harlley = (novosPontos.harlley || 0) + 1;
    await set(ref(db, 'pontos'), novosPontos);

    const novaCartela = [...cartela];
    const diaAtual = historico.length % 28;
    novaCartela[diaAtual] = true;
    await set(ref(db, 'cartela'), novaCartela);

    // Notificação no dia 28
    if (diaAtual === 27) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🎉 Cartela completa!',
          body: 'Ana completou os 28 dias! Parabéns! Hora de fazer a pausa de 4 dias 💕',
          sound: true,
        },
        trigger: null,
      });
      Alert.alert('🎉 Parabéns!', 'Ana completou os 28 dias da cartela! Inicie a pausa de 4 dias agora.');
    }

    if (!simular) {
      setModalAmor(true);
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.delay(2500),
        Animated.timing(fadeAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start(() => setModalAmor(false));
    }
  }

  async function iniciarPausa() {
    const inicio = new Date().toISOString().slice(0, 10);
    const fim = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await set(ref(db, 'pausa'), { inicio, fim, ativa: true });
    await set(ref(db, 'cartela'), Array(28).fill(false));
    await Notifications.scheduleNotificationAsync({
      content: { title: '⏸️ Pausa iniciada', body: 'Pausa de 4 dias começou. Nova cartela em ' + fim, sound: true },
      trigger: null,
    });
    Alert.alert('Pausa iniciada!', 'Nova cartela começa em ' + fim);
  }

  async function enviarSugestao() {
    if (!sugestao.trim()) return;
    await push(ref(db, 'sugestoes'), { texto: sugestao, data: new Date().toISOString(), usuario });
    setSugestao('');
    Alert.alert('Enviado!', 'Sua sugestão foi registrada!');
  }

  const diasPausa = () => {
    if (!pausa || !pausa.ativa) return null;
    const diff = Math.ceil((new Date(pausa.fim) - new Date()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : null;
  };

  const fotoAtual = usuario === 'ana' ? fotoPerfil : fotoHarlley;
  const pausaDias = diasPausa();
  const totalPags = Math.ceil(historico.length / ITENS_POR_PAG);
  const histPaginado = historico.slice((pagHistorico - 1) * ITENS_POR_PAG, pagHistorico * ITENS_POR_PAG);

  if (tela === 'splash') return (
    <View style={s.splash}>
      <Text style={s.splashEmoji}>💊</Text>
      <Text style={s.splashTitle}>Pilula da Ana</Text>
      <Text style={s.splashSub}>Carregando...</Text>
    </View>
  );

  if (tela === 'atualizar') return (
    <View style={s.splash}>
      <Text style={s.splashEmoji}>🔄</Text>
      <Text style={s.splashTitle}>Nova versão disponível!</Text>
      {atualizacao?.notas?.map((n, i) => <Text key={i} style={s.notaItem}>• {n}</Text>)}
      <TouchableOpacity style={s.btnUpdate} onPress={() => Linking.openURL(APK_URL)}>
        <Text style={s.btnUpdateTxt}>Baixar atualização agora</Text>
      </TouchableOpacity>
    </View>
  );

  if (tela === 'login') return (
    <View style={s.loginWrap}>
      <Text style={s.loginEmoji}>💊</Text>
      <Text style={s.loginTitle}>Pilula da Ana</Text>
      <Text style={s.loginSub}>Entre na sua conta</Text>
      <TextInput style={s.input} placeholder="Seu nome (Ana ou Harlley)" placeholderTextColor="#555"
        value={loginNome} onChangeText={setLoginNome} autoCapitalize="none" />
      <TextInput style={s.input} placeholder="Senha" placeholderTextColor="#555"
        value={loginSenha} onChangeText={setLoginSenha} secureTextEntry />
      <TouchableOpacity style={s.btnLogin} onPress={fazerLogin}>
        <Text style={s.btnLoginTxt}>Entrar</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={s.root}>
      <Modal transparent visible={modalAmor} animationType="none">
        <Animated.View style={[s.modalAmor, { opacity: fadeAnim }]}>
          <Text style={s.modalAmorEmoji}>💕</Text>
          <Text style={s.modalAmorTxt}>Eu te amo amor</Text>
        </Animated.View>
      </Modal>

      <View style={s.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => setAbaAtiva('perfil')}>
            {fotoAtual
              ? <Image source={{ uri: fotoAtual }} style={s.avatarHeader} />
              : <View style={s.avatarHeaderVazio}><Text style={{ fontSize: 20 }}>👤</Text></View>
            }
          </TouchableOpacity>
          <View style={{ marginLeft: 12 }}>
            <Text style={s.headerTitle}>Pilula da Ana</Text>
            <Text style={s.headerSub}>{usuario === 'ana' ? 'Olá, Ana! 💕' : modoAdmin ? '👑 Modo Admin' : 'Olá, Harlley!'}</Text>
          </View>
        </View>
        {usuario === 'harlley' && (
          <TouchableOpacity style={modoAdmin ? s.badgeAdmin : s.badgeUser} onPress={() => setModoAdmin(!modoAdmin)}>
            <Text style={s.badgeTxt}>{modoAdmin ? '👑 ADM' : '👤 User'}</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={s.abas}>
        {['home','cartela','ranking','sugestoes','perfil'].map(aba => (
          <TouchableOpacity key={aba} style={[s.aba, abaAtiva === aba && s.abaAtiva]} onPress={() => setAbaAtiva(aba)}>
            <Text style={s.abaTxt}>
              {aba==='home'?'🏠':aba==='cartela'?'💊':aba==='ranking'?'🏆':aba==='sugestoes'?'💡':'👤'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={s.body} contentContainerStyle={s.bodyContent}>

        {abaAtiva === 'home' && (
          <>
            {pausaDias ? (
              <View style={s.pausaCard}>
                <Text style={s.pausaEmoji}>⏸️</Text>
                <Text style={s.pausaTxt}>Pausa ativa — {pausaDias} dias restantes</Text>
                <Text style={s.pausaSub}>Nova cartela começa em {pausa?.fim}</Text>
              </View>
            ) : (
              <>
                <View style={tomouHoje ? s.cardOk : s.cardNo}>
                  <Text style={s.cardEmoji}>{tomouHoje ? '✅' : '⏰'}</Text>
                  <Text style={s.cardTxt}>{tomouHoje ? 'Tomou hoje!' : 'Ainda não registrou hoje'}</Text>
                  <Text style={s.cardHora}>Lembrete às 20:30</Text>
                </View>
                {!tomouHoje && (
                  <TouchableOpacity style={s.btnTomar} onPress={() => marcarTomou(false)}>
                    <Text style={s.btnTomarTxt}>💊 Marcar que tomou agora</Text>
                  </TouchableOpacity>
                )}
                {modoAdmin && !tomouHoje && (
                  <TouchableOpacity style={s.btnSimular} onPress={() => marcarTomou(true)}>
                    <Text style={s.btnSimularTxt}>🧪 Simular que Ana tomou (teste)</Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            {(usuario === 'ana' && !pausaDias && historico.length > 0 && historico.length % 28 === 0) && (
              <TouchableOpacity style={s.btnPausa} onPress={iniciarPausa}>
                <Text style={s.btnPausaTxt}>⏸️ Iniciar pausa de 4 dias</Text>
              </TouchableOpacity>
            )}
            {modoAdmin && (
              <TouchableOpacity style={s.btnPausa} onPress={iniciarPausa}>
                <Text style={s.btnPausaTxt}>⏸️ Forçar pausa (admin)</Text>
              </TouchableOpacity>
            )}

            <Text style={s.secLabel}>📋 Histórico</Text>
            {histPaginado.length === 0 && <Text style={s.empty}>Nenhum registro ainda</Text>}
            {histPaginado.map((h, i) => (
              <View key={i} style={s.histRow}>
                <Text style={s.histData}>{h.data}</Text>
                <Text style={s.histHora}>✅ {h.hora}</Text>
              </View>
            ))}

            {totalPags > 1 && (
              <View style={s.paginacao}>
                <TouchableOpacity
                  style={[s.btnPag, pagHistorico === 1 && s.btnPagDis]}
                  onPress={() => pagHistorico > 1 && setPagHistorico(p => p - 1)}
                >
                  <Text style={s.btnPagTxt}>← Anterior</Text>
                </TouchableOpacity>
                <Text style={s.pagInfo}>{pagHistorico} / {totalPags}</Text>
                <TouchableOpacity
                  style={[s.btnPag, pagHistorico === totalPags && s.btnPagDis]}
                  onPress={() => pagHistorico < totalPags && setPagHistorico(p => p + 1)}
                >
                  <Text style={s.btnPagTxt}>Próxima →</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {abaAtiva === 'cartela' && (
          <>
            <Text style={s.secLabel}>💊 Cartela Yazflex — 28 dias</Text>
            <Text style={s.cartelaSub}>Tome 1 comprimido por dia, sempre no mesmo horário</Text>
            <View style={s.cartelaGrid}>
              {Array(28).fill(null).map((_, i) => (
                <View key={i} style={[s.pilula, cartela[i] && s.pilulaOk]}>
                  <Text style={s.pilulaTxt}>{i + 1}</Text>
                  {i === 27 && <Text style={{ fontSize: 8 }}>🎉</Text>}
                </View>
              ))}
            </View>
            <View style={s.infoCard}>
              <Text style={s.infoTxt}>📌 Após 28 comprimidos, faça 4 dias de pausa</Text>
              <Text style={s.infoTxt}>📌 Na pausa pode ocorrer sangramento</Text>
              <Text style={s.infoTxt}>📌 Após a pausa, inicie nova cartela</Text>
            </View>
          </>
        )}

        {abaAtiva === 'ranking' && (
          <>
            <Text style={s.secLabel}>🏆 Ranking de pontos</Text>
            <Text style={s.rankSub}>Ana ganha ponto tomando entre 20:30 e 20:40{'\n'}Harlley ganha ponto fora desse horário</Text>
            <View style={s.rankCard}>
              {fotoPerfil
                ? <Image source={{ uri: fotoPerfil }} style={s.rankFoto} />
                : <Text style={s.rankEmoji}>💃</Text>
              }
              <Text style={s.rankNome}>Ana</Text>
              <Text style={s.rankPontos}>{pontos.ana || 0} pts</Text>
              {(pontos.ana || 0) >= (pontos.harlley || 0) && <Text style={s.rankCoroa}>👑</Text>}
            </View>
            <View style={[s.rankCard, { marginTop: 12 }]}>
              {fotoHarlley
                ? <Image source={{ uri: fotoHarlley }} style={s.rankFoto} />
                : <Text style={s.rankEmoji}>🧢</Text>
              }
              <Text style={s.rankNome}>Harlley</Text>
              <Text style={s.rankPontos}>{pontos.harlley || 0} pts</Text>
              {(pontos.harlley || 0) > (pontos.ana || 0) && <Text style={s.rankCoroa}>👑</Text>}
            </View>
          </>
        )}

        {abaAtiva === 'sugestoes' && (
          <>
            <Text style={s.secLabel}>💡 Sugerir melhoria</Text>
            <Text style={s.sugestaoSub}>Sua ideia vai direto pro Harlley avaliar!</Text>
            <TextInput style={s.textArea} placeholder="Escreva sua sugestão aqui..."
              placeholderTextColor="#444" value={sugestao} onChangeText={setSugestao}
              multiline numberOfLines={5} />
            <TouchableOpacity style={s.btnEnviar} onPress={enviarSugestao}>
              <Text style={s.btnEnviarTxt}>📨 Enviar sugestão</Text>
            </TouchableOpacity>
            {modoAdmin && (
              <>
                <Text style={[s.secLabel, { marginTop: 24 }]}>📬 Sugestões recebidas</Text>
                <Text style={s.sugestaoSub}>Veja no Firebase: pilula-ana/sugestoes</Text>
              </>
            )}
          </>
        )}

        {abaAtiva === 'perfil' && (
          <>
            <Text style={s.secLabel}>👤 Meu Perfil</Text>
            <View style={s.perfilCard}>
              <TouchableOpacity onPress={escolherFoto}>
                {fotoAtual
                  ? <Image source={{ uri: fotoAtual }} style={s.fotoPerfil} />
                  : <View style={s.fotoPerfilVazio}><Text style={{ fontSize: 48 }}>📷</Text></View>
                }
                <View style={s.editBadge}><Text style={s.editBadgeTxt}>✏️ Alterar foto</Text></View>
              </TouchableOpacity>
              <Text style={s.perfilNome}>{usuario === 'ana' ? 'Ana 💕' : 'Harlley 👑'}</Text>
              <Text style={s.perfilInfo}>Total de dias registrados: {historico.length}</Text>
              <Text style={s.perfilInfo}>Pontos: {usuario === 'ana' ? pontos.ana || 0 : pontos.harlley || 0} pts</Text>
              <Text style={s.perfilInfo}>Versão do app: {VERSAO_ATUAL}</Text>
            </View>

            <Text style={[s.secLabel, { marginTop: 20 }]}>📊 Estatísticas</Text>
            <View style={s.statsRow}>
              <View style={s.statBox}>
                <Text style={s.statNum}>{historico.length}</Text>
                <Text style={s.statLabel}>Dias totais</Text>
              </View>
              <View style={s.statBox}>
                <Text style={s.statNum}>{cartela.filter(Boolean).length}</Text>
                <Text style={s.statLabel}>Cartela atual</Text>
              </View>
              <View style={s.statBox}>
                <Text style={s.statNum}>{Math.floor(historico.length / 28)}</Text>
                <Text style={s.statLabel}>Cartelas completas</Text>
              </View>
            </View>

            <TouchableOpacity style={s.btnSair} onPress={() => { setUsuario(null); setTela('login'); setLoginNome(''); setLoginSenha(''); }}>
              <Text style={s.btnSairTxt}>🚪 Sair da conta</Text>
            </TouchableOpacity>
          </>
        )}

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0010' },
  splash: { flex: 1, backgroundColor: '#0a0010', alignItems: 'center', justifyContent: 'center', padding: 24 },
  splashEmoji: { fontSize: 64, marginBottom: 16 },
  splashTitle: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 8 },
  splashSub: { fontSize: 14, color: '#666' },
  notaItem: { fontSize: 13, color: '#aaa', marginTop: 6, alignSelf: 'flex-start' },
  btnUpdate: { backgroundColor: '#ff2d78', borderRadius: 14, padding: 18, marginTop: 32, width: '100%', alignItems: 'center' },
  btnUpdateTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
  loginWrap: { flex: 1, backgroundColor: '#0a0010', padding: 28, justifyContent: 'center' },
  loginEmoji: { fontSize: 56, textAlign: 'center', marginBottom: 12 },
  loginTitle: { fontSize: 28, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 4 },
  loginSub: { fontSize: 14, color: '#555', textAlign: 'center', marginBottom: 32 },
  input: { backgroundColor: '#1a1a2e', borderRadius: 12, padding: 16, color: '#fff', fontSize: 15, marginBottom: 12, borderWidth: 1, borderColor: '#2a2a4a' },
  btnLogin: { backgroundColor: '#ff2d78', borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 8 },
  btnLoginTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
  header: { backgroundColor: '#130020', padding: 20, paddingTop: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#2a1040' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: '#aa88cc', marginTop: 2 },
  avatarHeader: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: '#ff2d78' },
  avatarHeaderVazio: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1a1a2e', borderWidth: 2, borderColor: '#2a2a4a', alignItems: 'center', justifyContent: 'center' },
  badgeAdmin: { backgroundColor: '#ff2d78', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  badgeUser: { backgroundColor: '#2a2a4a', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  badgeTxt: { color: '#fff', fontWeight: '800', fontSize: 12 },
  abas: { flexDirection: 'row', backgroundColor: '#130020', borderBottomWidth: 1, borderBottomColor: '#2a1040' },
  aba: { flex: 1, padding: 12, alignItems: 'center' },
  abaAtiva: { borderBottomWidth: 2, borderBottomColor: '#ff2d78' },
  abaTxt: { fontSize: 18 },
  body: { flex: 1 },
  bodyContent: { padding: 20, paddingBottom: 40 },
  cardOk: { backgroundColor: '#0d2e1a', borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#00ff87', marginBottom: 16 },
  cardNo: { backgroundColor: '#1a0d20', borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#ff2d78', marginBottom: 16 },
  cardEmoji: { fontSize: 40, marginBottom: 8 },
  cardTxt: { fontSize: 18, fontWeight: '800', color: '#fff' },
  cardHora: { fontSize: 12, color: '#666', marginTop: 4 },
  btnTomar: { backgroundColor: '#ff2d78', borderRadius: 14, padding: 18, alignItems: 'center', marginBottom: 12 },
  btnTomarTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
  btnSimular: { backgroundColor: '#2a2a4a', borderRadius: 14, padding: 14, alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#4a4a8a' },
  btnSimularTxt: { color: '#aaa', fontWeight: '700', fontSize: 14 },
  btnPausa: { backgroundColor: '#1a1a3a', borderRadius: 14, padding: 14, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#4a4a8a' },
  btnPausaTxt: { color: '#aaa', fontWeight: '700', fontSize: 14 },
  pausaCard: { backgroundColor: '#1a1a0d', borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#ffd60a', marginBottom: 16 },
  pausaEmoji: { fontSize: 40, marginBottom: 8 },
  pausaTxt: { fontSize: 16, fontWeight: '800', color: '#ffd60a' },
  pausaSub: { fontSize: 12, color: '#888', marginTop: 4 },
  secLabel: { fontSize: 12, fontWeight: '800', color: '#666', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12, marginTop: 8 },
  empty: { color: '#333', fontSize: 13, textAlign: 'center', marginTop: 16 },
  histRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#13131a', borderRadius: 10, padding: 14, marginBottom: 8 },
  histData: { color: '#aaa', fontSize: 13 },
  histHora: { color: '#00ff87', fontSize: 13, fontWeight: '700' },
  paginacao: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 8 },
  btnPag: { backgroundColor: '#1a1a2e', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#2a2a4a' },
  btnPagDis: { opacity: 0.3 },
  btnPagTxt: { color: '#aaa', fontSize: 13, fontWeight: '700' },
  pagInfo: { color: '#666', fontSize: 13 },
  cartelaSub: { fontSize: 13, color: '#666', marginBottom: 16 },
  cartelaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  pilula: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#1a1a2e', borderWidth: 1, borderColor: '#2a2a4a', alignItems: 'center', justifyContent: 'center' },
  pilulaOk: { backgroundColor: '#0d2e1a', borderColor: '#00ff87' },
  pilulaTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
  infoCard: { backgroundColor: '#1a0d20', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#2a1040' },
  infoTxt: { color: '#aa88cc', fontSize: 13, marginBottom: 6 },
  rankSub: { fontSize: 13, color: '#666', marginBottom: 16, lineHeight: 20 },
  rankCard: { backgroundColor: '#1a0d20', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#2a1040' },
  rankFoto: { width: 44, height: 44, borderRadius: 22, marginRight: 16, borderWidth: 2, borderColor: '#ff2d78' },
  rankEmoji: { fontSize: 32, marginRight: 16 },
  rankNome: { fontSize: 18, fontWeight: '800', color: '#fff', flex: 1 },
  rankPontos: { fontSize: 22, fontWeight: '800', color: '#ff2d78' },
  rankCoroa: { fontSize: 24, marginLeft: 8 },
  sugestaoSub: { fontSize: 13, color: '#666', marginBottom: 16 },
  textArea: { backgroundColor: '#1a1a2e', borderRadius: 12, padding: 16, color: '#fff', fontSize: 14, borderWidth: 1, borderColor: '#2a2a4a', minHeight: 120, textAlignVertical: 'top', marginBottom: 12 },
  btnEnviar: { backgroundColor: '#7b2fff', borderRadius: 14, padding: 16, alignItems: 'center' },
  btnEnviarTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
  modalAmor: { flex: 1, backgroundColor: 'rgba(255,45,120,0.95)', alignItems: 'center', justifyContent: 'center' },
  modalAmorEmoji: { fontSize: 80, marginBottom: 20 },
  modalAmorTxt: { fontSize: 32, fontWeight: '800', color: '#fff' },
  perfilCard: { backgroundColor: '#130020', borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#2a1040' },
  fotoPerfil: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#ff2d78' },
  fotoPerfilVazio: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#1a1a2e', borderWidth: 3, borderColor: '#2a2a4a', alignItems: 'center', justifyContent: 'center' },
  editBadge: { backgroundColor: '#ff2d78', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8, alignSelf: 'center' },
  editBadgeTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },
  perfilNome: { fontSize: 24, fontWeight: '800', color: '#fff', marginTop: 12 },
  perfilInfo: { fontSize: 13, color: '#888', marginTop: 6 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statBox: { flex: 1, backgroundColor: '#13131a', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#2a2a4a' },
  statNum: { fontSize: 28, fontWeight: '800', color: '#ff2d78' },
  statLabel: { fontSize: 11, color: '#666', marginTop: 4, textAlign: 'center' },
  btnSair: { backgroundColor: '#1a1a2e', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 20, borderWidth: 1, borderColor: '#2a2a4a' },
  btnSairTxt: { color: '#888', fontWeight: '700', fontSize: 14 },
});
