import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const STORE_KEY = 'historico_pilula';

export default function App() {
  const [historico, setHistorico] = useState([]);
  const [tomouHoje, setTomouHoje] = useState(false);

  useEffect(() => {
    const hoje = new Date().toISOString().slice(0,10);
    carregarHistorico(hoje);
    configurarAlarme();
  }, []);

  async function carregarHistorico(hoje) {
    try {
      const raw = await SecureStore.getItemAsync(STORE_KEY);
      const hist = raw ? JSON.parse(raw) : [];
      setHistorico(hist);
      setTomouHoje(hist.some(h => h.data === hoje));
    } catch(e) {}
  }

  async function configurarAlarme() {
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
      trigger: { hour: 20, minute: 0, repeats: true },
    });
  }

  async function marcarTomou() {
    const d = new Date();
    const hoje = d.toISOString().slice(0,10);
    const hora = d.toTimeString().slice(0,5);
    const raw = await SecureStore.getItemAsync(STORE_KEY);
    const hist = raw ? JSON.parse(raw) : [];
    const filtrado = hist.filter(h => h.data !== hoje);
    filtrado.unshift({ data: hoje, hora });
    await SecureStore.setItemAsync(STORE_KEY, JSON.stringify(filtrado));
    setHistorico(filtrado);
    setTomouHoje(true);
    Alert.alert('Otimo!', 'Registrado! Continue assim');
  }

  return (
    <ScrollView style={s.bg} contentContainerStyle={s.c}>
      <Text style={s.title}>Pilula da Ana</Text>
      <Text style={s.sub}>Alarme todo dia as 20:00</Text>
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
  sub:{fontSize:13,color:'#555',textAlign:'center',marginTop:6,marginBottom:28},
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
