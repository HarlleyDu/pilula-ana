import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Linking } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, push } from 'firebase/database';

const firebaseConfig = {
  databaseURL: "https://pilula-ana-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const VERSAO_ATUAL = "1.0.4";
const APK_URL = "https://expo.dev/artifacts/eas/i12FU9mKmSrhQefekHxeko.apk";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const [historico, setHistorico] = useState([]);
  const [tomouHoje, setTomouHoje] = useState(false);
  const [temAtualizacao, setTemAtualizacao] = useState(false);

  const hoje = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    configurarAlarmes();
    carregarHistorico();
    checarAtualizacao();
  }, []);

  function carregarHistorico() {
    const dbRef = ref(db, 'historico');
    onValue(dbRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const lista = Object.values(data).sort((a, b) => b.data.localeCompare(a.data));
        setHistorico(lista);
        setTomouHoje(lista.some(h => h.data === hoje));
      } else {
        setHistorico([]);
        setTomouHoje(false);
      }
    });
  }

  async function checarAtualizacao() {
    try {
      const res = await fetch('https://raw.githubusercontent.com/HarlleyDu/pilula-ana/master/versao.json');
      const json = await res.json();
      if (json.versao !== VERSAO_ATUAL) {
        setTemAtualizacao(true);
      }
    } catch(e) {}
  }

  async function configurarAlarmes() {
    if (!Device.isDevice) return;
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;
    await Notifications.cancelAllScheduledNotificationsAsync();

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Hora da pilula!',
        body: 'Ana, nao esqueca de tomar a pilula hoje',
        sound: true,
      },
      trigger: { hour: 20, minute: 30, repeats: true },
    });

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Ana ainda nao tomou!',
        body: 'Ela ainda nao registrou a pilula de hoje. Lembra ela!',
        sound: true,
      },
      trigger: { hour: 20, minute: 40, repeats: true },
    });
  }

  async function marcarTomou() {
    const d = new Date();
    const hora = d.toTimeString().slice(0, 5);
    const dbRef = ref(db, 'historico/' + hoje);
    await set(dbRef, { data: hoje, hora, tomou: true });
    Alert.alert('Otimo!', 'Registrado! Continue assim');
  }

  return (
    <ScrollView style={s.bg} contentContainerStyle={s.c}>
      <Text style={s.title}>Pilula da Ana</Text>
      <Text style={s.sub}>Alarme todo dia as 20:30</Text>

      {temAtualizacao && (
        <TouchableOpacity style={s.update} onPress={() => Linking.openURL(APK_URL)}>
          <Text style={s.updateTxt}>Nova versao disponivel! Toque para baixar</Text>
        </TouchableOpacity>
      )}

      <View style={tomouHoje ? s.cardOk : s.cardNo}>
        <Text style={s.emoji}>{tomouHoje ? 'OK' : '!'}</Text>
        <Text style={s.cardTxt}>{tomouHoje ? 'Tomou hoje!' : 'Nao registrou ainda'}</Text>
      </View>

      {!tomouHoje && (
        <TouchableOpacity style={s.btn} onPress={marcarTomou}>
          <Text style={s.btnTxt}>Marcar que tomou agora</Text>
        </TouchableOpacity>
      )}

      <Text style={s.secLbl}>Historico</Text>
      {historico.length === 0 && <Text style={s.empty}>Nenhum registro ainda</Text>}
      {historico.map((h, i) => (
        <View key={i} style={s.row}>
          <Text style={s.rowData}>{h.data}</Text>
          <Text style={s.rowHora}>{h.hora}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  bg:{flex:1,backgroundColor:'#0c0c0f'},
  c:{padding:24,paddingTop:60},
  title:{fontSize:26,fontWeight:'800',color:'#fff',textAlign:'center'},
  sub:{fontSize:13,color:'#555',textAlign:'center',marginTop:6,marginBottom:16},
  update:{backgroundColor:'#ff2d78',borderRadius:12,padding:14,alignItems:'center',marginBottom:16},
  updateTxt:{color:'#fff',fontWeight:'800',fontSize:13},
  cardOk:{backgroundColor:'#0d2e1a',borderRadius:16,padding:24,alignItems:'center',borderWidth:1,borderColor:'#00ff87'},
  cardNo:{backgroundColor:'#1a1a0d',borderRadius:16,padding:24,alignItems:'center',borderWidth:1,borderColor:'#ffd60a'},
  emoji:{fontSize:36,marginBottom:10,color:'#fff'},
  cardTxt:{fontSize:16,fontWeight:'700',color:'#fff',textAlign:'center'},
  btn:{backgroundColor:'#00ff87',borderRadius:14,padding:18,alignItems:'center',marginTop:20},
  btnTxt:{fontSize:16,fontWeight:'800',color:'#000'},
  secLbl:{fontSize:13,fontWeight:'700',color:'#555',marginTop:32,marginBottom:12},
  empty:{color:'#333',fontSize:13,textAlign:'center'},
  row:{flexDirection:'row',justifyContent:'space-between',backgroundColor:'#13131a',borderRadius:10,padding:14,marginBottom:8},
  rowData:{color:'#aaa',fontSize:13},
  rowHora:{color:'#00ff87',fontSize:13,fontWeight:'700'},
});
