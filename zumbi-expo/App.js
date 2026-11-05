import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { StatusBar } from 'expo-status-bar';
import * as ScreenOrientation from 'expo-screen-orientation';

// Endereço do jogo. Por padrão usa o GitHub Pages do repositório.
// Para testar sem publicar: na raiz do repositório rode `python3 -m http.server 8000`
// e troque pela URL do seu computador na mesma rede Wi-Fi, ex.: 'http://192.168.0.10:8000/zumbi/'
const GAME_URL = 'https://ukezeraa.github.io/Joguinho/zumbi/';

export default function App() {
  const webRef = useRef(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
  }, []);

  return (
    <View style={styles.tela}>
      <StatusBar hidden />
      {erro ? (
        <View style={styles.centro}>
          <Text style={styles.titulo}>Não consegui abrir o jogo</Text>
          <Text style={styles.texto}>{erro}</Text>
          <Text style={styles.texto}>Endereço: {GAME_URL}</Text>
          <Pressable style={styles.botao} onPress={() => { setErro(null); setCarregando(true); webRef.current?.reload(); }}>
            <Text style={styles.botaoTexto}>TENTAR DE NOVO</Text>
          </Pressable>
        </View>
      ) : (
        <WebView
          ref={webRef}
          source={{ uri: GAME_URL }}
          style={styles.web}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          allowsFullscreenVideo
          bounces={false}
          scrollEnabled={false}
          overScrollMode="never"
          setSupportMultipleWindows={false}
          onLoadEnd={() => setCarregando(false)}
          onError={e => setErro(e.nativeEvent.description || 'Erro de rede')}
          onHttpError={e => setErro(`HTTP ${e.nativeEvent.statusCode} — o jogo já foi publicado no GitHub Pages?`)}
        />
      )}
      {carregando && !erro && (
        <View style={[StyleSheet.absoluteFill, styles.centro]}>
          <ActivityIndicator size="large" color="#e0402a" />
          <Text style={styles.texto}>Carregando o apocalipse...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: '#000' },
  web: { flex: 1, backgroundColor: '#000' },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000', padding: 24, gap: 10 },
  titulo: { color: '#fff', fontSize: 20, fontWeight: '800' },
  texto: { color: '#bbb', fontSize: 13, textAlign: 'center' },
  botao: { marginTop: 12, backgroundColor: '#c0301c', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 4 },
  botaoTexto: { color: '#fff', fontWeight: '800' },
});
