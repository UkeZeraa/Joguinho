# Como publicar o Apocalipse Z nos celulares (fora do Expo Go)

O app em `zumbi-expo/` é uma "casca" Expo com uma WebView em tela cheia. Ele tem **dois modos** (`OFFLINE` no topo do `App.js`):

- **`OFFLINE = true` (padrão): o jogo vem embutido no APK.** Não precisa de hospedagem nem de internet. O arquivo
  `assets/jogo.js` é o jogo inteiro (HTML + JS + CSS) gerado por `npm run empacotar`; os scripts `build:*` já rodam isso antes de gerar o app.
  Toda vez que o jogo mudar, gere um APK novo.
- **`OFFLINE = false`:** o app abre o jogo pela URL do GitHub Pages (`GAME_URL`). Precisa de hospedagem, mas atualizar o jogo não exige APK novo.

No modo embutido, pule a seção 0 (hospedar). Limite do modo embutido: as fontes do Google não carregam sem internet (cai para fonte do sistema)
e os clipes de voz do Fish (`zumbi/audio/`) não vão no pacote ainda: o jogo usa os sons sintetizados.

## 0. (Só no modo `OFFLINE = false`) publicar o jogo no GitHub Pages

1. Faça o merge do Pull Request deste branch na `main`.
2. No GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch → `main` / `(root)`**.
3. Depois de ~1 min o jogo abre em `https://ukezeraa.github.io/Joguinho/zumbi/` (é o endereço que está em `GAME_URL`, no `App.js`).

> Teste primeiro no navegador do celular. Se abrir lá, abre no app.

## 1. O caminho mais rápido, sem loja: instalar como app (PWA)

O jogo já é um PWA (manifest + service worker + ícones). No celular:

- **Android (Chrome):** abra a URL → menu ⋮ → **Instalar app** / *Adicionar à tela inicial*.
- **iPhone (Safari):** abra a URL → botão compartilhar → **Adicionar à Tela de Início**.

Fica com ícone, em tela cheia e **funciona offline depois da primeira abertura**. É grátis e não precisa de conta de loja.

## 2. APK para instalar direto no Android (grátis)

Você só precisa de uma conta gratuita em https://expo.dev e do Node.js.

```bash
npm install -g eas-cli
cd zumbi-expo
npm install
eas login                      # sua conta do expo.dev
eas init                       # cria o projeto na Expo e grava o projectId no app.json
npm run build:apk              # = eas build -p android --profile preview
```

Quando o build terminar (uns 10–20 min, na nuvem), o EAS mostra um **link/QR code do .apk**. Abra no celular,
baixe e instale (o Android pede para permitir "instalar apps desconhecidos"). Pode mandar o link para os amigos.

## 3. Google Play (Android)

1. Crie uma conta de desenvolvedor no Google Play Console (taxa única de ~US$ 25).
2. Gere o pacote da loja (formato `.aab`):
   ```bash
   npm run build:android          # = eas build -p android --profile production
   ```
3. Envie para a loja:
   ```bash
   npm run submit:android         # = eas submit -p android --latest
   ```
   (na primeira vez o EAS pede a chave de serviço do Google Play — o assistente do `eas submit` explica como criar;
   se preferir, baixe o `.aab` e envie manualmente no Play Console).
4. No Play Console preencha a ficha: descrição, capturas de tela (tire com o celular deitado), classificação
   indicativa (violência fantasiosa/zumbis) e a **política de privacidade**. O jogo não coleta dados: o progresso fica só
   no aparelho (localStorage). Uma página simples dizendo isso já resolve.

O pacote do app é `com.ukezeraa.apocalipsez` (troque em `app.json` → `android.package` / `ios.bundleIdentifier`
**antes do primeiro envio** se quiser outro nome — depois que publica, não dá mais para mudar).

## 4. iPhone (App Store / TestFlight)

Precisa do **Apple Developer Program** (US$ 99/ano) — a Apple não permite instalar apps de fora sem isso.

```bash
npm run build:ios              # = eas build -p ios --profile production  (o EAS cuida dos certificados)
npm run submit:ios             # envia para o App Store Connect / TestFlight
```

No TestFlight você convida testadores por e-mail antes de mandar para a loja. Para testar em poucos aparelhos sem a loja:
`eas device:create` (registra o iPhone) e depois `eas build -p ios --profile preview`.

## 5. Mudar o endereço do jogo / testar antes de publicar

- O endereço fica em `GAME_URL`, no topo de `App.js`.
- Para testar o app apontando para o seu computador (mesma rede Wi-Fi):
  ```bash
  python3 -m http.server 8000                  # na raiz do repositório
  # troque GAME_URL por 'http://192.168.0.10:8000/zumbi/' (IP do seu PC)
  cd zumbi-expo && npx expo start
  ```
- Para gerar uma versão de testes que aceita `http://` no Android, use o perfil `preview` e uma URL `https://` (recomendado).

## 6. Versões e atualizações

| O que mudou | O que fazer |
| --- | --- |
| Código do jogo (`zumbi/`) | Só fazer merge na `main` → GitHub Pages atualiza. Quem abrir o app recebe a versão nova. |
| Ícone, nome, `App.js`, `app.json` | Aumentar `version` em `app.json` e rodar o build de novo (`build:android` / `build:ios`). |
| Só `versionCode`/`buildNumber` | O perfil `production` já usa `autoIncrement`, então o EAS aumenta sozinho. |

## 7. Dicas e problemas comuns

- **Tela branca/erro ao abrir:** o app mostra "Não consegui abrir o jogo" e o endereço. Confira se o GitHub Pages está ativo
  e se o celular tem internet na primeira abertura. (Depois da primeira vez o service worker deixa o jogo offline no Android.)
- **iPhone offline:** o WebView do iOS não usa service worker. Se quiser offline total no iOS, o caminho é embutir os arquivos
  no app (bundle local) — me peça que eu preparo essa variante.
- **Desempenho:** em celulares fracos use *Qualidade gráfica: Baixa* (aba Raid → Opções). O mapa das zonas é grande;
  a qualidade Média já é o padrão no celular.
- **Som:** o navegador só libera o áudio depois do primeiro toque — o jogo já inicia o som no primeiro toque na base.
- **Chaves e senhas:** nunca coloque a chave do Fish Audio ou do Google Play no repositório. O EAS guarda as credenciais
  de assinatura na nuvem (`eas credentials`).

## 8. Atualizações automáticas (EAS Update)

O app tem o `expo-updates`: o jogo novo chega aos celulares sem gerar APK.

**Uma vez só:**
1. Token do Expo salvo no GitHub como segredo `EXPO_TOKEN` (Settings → Secrets and variables → Actions).
2. Gere e instale **um APK novo** (`npm run build:apk`). Os APKs antigos não sabem buscar atualização.

**Depois disso:** cada merge que mexe em `zumbi/` ou `zumbi-expo/` roda a ação **Atualizar jogo no Expo** (aba Actions do GitHub),
que publica no canal `preview`. O app baixa ao abrir com internet e aplica na abertura seguinte
(feche e abra de novo para ver na hora).

Também dá para publicar na mão, do seu computador: `npm run atualizar`.

Quando ainda precisa de APK novo: mudar ícone, nome, `app.json`, `version` ou instalar um pacote nativo.
Ao mudar `version`, as atualizações antigas param de chegar para quem não instalar o APK novo (é de propósito).
