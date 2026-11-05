# Joguinhos

| Jogo | Pasta | Link (GitHub Pages) |
| --- | --- | --- |
| Fuga do Flávio | raiz | https://ukezeraa.github.io/Joguinho/ |
| Cadê Meu Cigarro? | [`cigarro/`](cigarro/) | https://ukezeraa.github.io/Joguinho/cigarro/ |
| Apocalipse Z (FPS de zumbis) | [`zumbi/`](zumbi/) | https://ukezeraa.github.io/Joguinho/zumbi/ |

Cada jogo fica na sua própria pasta, com seus arquivos, vozes e recorde salvos separados.

---

# Fuga do Flávio ✈️

Jogo de plataforma 2D no estilo 8 bits para celular (e PC). Ajude o Flávio a atravessar
**Rio de Janeiro → Brasília → Aeroporto** pulando em plataformas e embarcar no avião
antes que o Lula pegue ele... e o passaporte!

> Jogo de humor/paródia. Os personagens são caricaturas.

## Como jogar

- **Celular:** botões ◀ ▶ na esquerda, **PULA** na direita (segure para pular mais alto).
- **PC:** ← → (ou A/D) para andar, **Espaço**/↑ para pular, **P** pausa, **M** liga/desliga o som.
- Inimigos (pise em cima deles para tirá-los do caminho):
  - **Intimação**: papel que anda.
  - **Militante**: camiseta vermelha e bandeira, corre rápido e dá pulinhos.
  - **Polícia Federal**: não cai dos buracos, fica patrulhando.
  - **Constituição**: livro voador que vem na altura da cabeça do Flávio.
- Cada inimigo grita a sua fala quando aparece na tela.
- Bata a cabeça nos blocos **?** para ganhar dólares. Um deles esconde o **Passaporte**,
  que te protege de um golpe (inclusive de uma agarrada do Lula!).
- A bandeira no meio da fase é o checkpoint.
- O Lula persegue o tempo todo: se ele te alcançar, você perde uma vida.

## Skins

Os dólares coletados ficam salvos e servem para comprar roupas novas na tela **SKINS**:
Terno Clássico, Camisa da Seleção, Turista em Miami, Disfarce Total, Pijama de Fuga,
Agente Secreto, Uniforme Listrado e Smoking de Ouro.

Para criar uma skin nova, adicione um item na lista `SKINS` em `sprites.js`
(cores do paletó, gravata, calça, sapato + chapéu/óculos/bigode opcionais).

## Vozes

Durante o jogo aparecem balões com as falas ("Vou te pegar, Flávio!", "Não vai pegar meu
passaporte!", etc.). Por padrão elas são faladas pela voz sintetizada do celular.

As falas entram numa fila: um personagem espera o outro terminar antes de falar.

Para trocar as vozes:
- **Para todo mundo:** coloque arquivos `.mp3` na pasta [`vozes/`](vozes/LEIA-ME.md) com os
  nomes listados lá (ex.: `lula_pegar.mp3`). Quem abrir o link já ouve esses áudios.
- **Só no seu aparelho:** na tela **VOZES**, grave a sua voz ou escolha um arquivo para cada fala.

## Rodar / publicar

Não precisa instalar nada — é HTML + JavaScript puro.

- **Testar no PC:** dentro da pasta rode `python3 -m http.server` e abra `http://localhost:8000`.
- **Jogar no celular:** publique com o **GitHub Pages** (Settings → Pages → Branch).
  Abra o link no celular e use "Adicionar à tela inicial" para virar um app em tela cheia.
  (A gravação de voz precisa de `https`, que o GitHub Pages já fornece.)

## Arquivos

| Arquivo | O que tem |
| --- | --- |
| `index.html` / `style.css` | Telas, menus e controles de toque |
| `game.js` | Física, fases, inimigos, Lula, câmera e desenho |
| `sprites.js` | Pixel art dos personagens e lista de skins |
| `audio.js` | Música 8 bits, efeitos sonoros e falas |
| `sw.js` / `manifest.webmanifest` | Funcionar offline e instalar como app |

---

# Cadê Meu Cigarro? 🚬☕

O Seu Tonhão está em abstinência e o cigarro dele criou perninhas e fugiu!

1. **Corrida:** toque na tela (ou Espaço) para pular cones, lixeiras, cachorros e cascas de banana.
   Cada batida atrasa o Tonhão e aumenta a **abstinência**. Se a barra encher, ele surta.
2. **Fumada:** ao alcançar o cigarro, toque rápido 5 vezes para dar as tragadas e acalmar.
3. **Cafezinho:** na padaria, toque quando a agulha estiver na faixa verde. Errou, queima a língua!
4. Outro cigarro foge do maço, cada vez mais rápido.

Pontos: 100 por cigarro, 50 por cafezinho no ponto. As falas ficam em `cigarro/vozes/`
e podem ser trocadas por gravações com o mesmo nome de arquivo.

---

# Apocalipse Z 🧟🔫

Jogo de tiro em **primeira pessoa** (3D, Three.js) num apocalipse zumbi. Você monta o
equipamento na base e entra em **raids**: sobreviva às ondas, pegue o loot e chegue ao
heliponto para a **extração**. Se morrer, perde as armas achadas e fica com só 30% da grana.

## Tiers das armas

| Tier | Dano | Vantagens |
| --- | --- | --- |
| **Comum** | ×1,00 | — |
| **Incomum** | ×1,18 | Recarga rápida |
| **Raro** | ×1,40 | + Perfurante (atravessa 1 zumbi) |
| **Épico** | ×1,70 | + Balas incendiárias |
| **Lendário** | ×2,10 | + Perfura 2 zumbis |
| **Mítico** | ×2,70 | + Balas explosivas e roubo de vida |

Cada tier também melhora o pente, a cadência, a precisão e a recarga. Tipos de arma:
Pistola e Submetralhadora (secundárias); Fuzil, Escopeta, Sniper e Metralhadora (primárias).

## Base (antes da raid)

- **Equipamento:** escolha a arma primária e a secundária, o colete, as granadas e os kits médicos.
  A arma aparece em 3D (arraste para girar) com os atributos, e você pode trocar a camuflagem.
- **Arsenal:** todas as suas armas filtradas por tier. Dá para desmontar as que não quer e ganhar grana.
- **Loja:** caixas de armas (com roleta e as chances de cada tier), suprimentos, coletes e camuflagens.
- **Raid:** três zonas: Subúrbio (fácil), Centro em Chamas e Laboratório X-13 (com mais chance de Mítico).

## Na raid

- Zumbis: Errante, Corredor, Cuspidor (ataca de longe), Inchado (explode), Brutamontes e,
  na última onda, a **Abominação** (chefe que solta arma Épica ou melhor).
- Barris vermelhos explodem com tiros. Os zumbis soltam grana, munição, vida e armas (com um feixe da cor do tier).
- **PC:** WASD andar · mouse mirar · clique atirar · botão direito mirar (ADS) · Shift correr ·
  Espaço pular · R recarregar · Q/1/2/rodinha trocar arma · G granada · F kit médico · Esc pausa.
  Se o mouse não ficar preso na tela (ex.: dentro de outra página), segure o botão e arraste para olhar.
- **Celular:** o lado esquerdo da tela é o joystick, arraste o lado direito para olhar, segure 🔥 para
  atirar (ele também gira a câmera enquanto você arrasta) e ⤒ para pular.
- **Pulo:** dá para subir em barreiras e caixas baixas.
- **Opções** (na aba Raid e na pausa): sensibilidade da câmera, **mira assistida** (a mira gruda nos
  zumbis) e **tiro automático** (atira sozinho quando a mira fica vermelha em cima de um zumbi).
  As duas vêm ligadas no celular.

O progresso fica salvo no navegador (localStorage). O Three.js está em `zumbi/lib/` (licença MIT),
então o jogo não depende de CDN.

## Testar no Expo Go 📱

A pasta [`zumbi-expo/`](zumbi-expo/) é um app Expo (SDK 58) que abre o jogo numa WebView
em tela cheia e deitada. O Expo Go já traz a WebView, então não precisa de build nativo.

1. Publique o jogo (GitHub Pages com o branch onde está a pasta `zumbi/`), ou rode um servidor local
   e troque `GAME_URL` em `zumbi-expo/App.js` pelo IP do seu PC (ex.: `http://192.168.0.10:8000/zumbi/`).
2. No PC:
   ```bash
   cd zumbi-expo
   npm install
   npx expo start
   ```
3. Abra o **Expo Go** no celular e escaneie o QR code (o celular precisa estar na mesma rede;
   se não estiver, use `npx expo start --tunnel`).
