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

## Maestria e acessórios das armas

- **Maestria (Nv 1–10):** cada arma ganha experiência com os abates que você faz com ela. Cada nível dá **+2% de dano, +1% de cadência
  e recarga 1,5% mais rápida**, e **libera um slot** de acessório: Mira (Nv 1) → Cano/Bocal (Nv 2) → Carregador (Nv 3) → Empunhadura (Nv 4) → Munição (Nv 6).
- **Acessórios** (aba Equipamento → clique no slot): cada um mostra na hora quanto muda o Dano, a Cadência, o Pente, a Recarga, a
  Dispersão, o Alcance e o Recuo. As peças aparecem **na arma 3D** (lunetas, silenciador, tambor, empunhadura...).
  - **Miras:** Red Dot, Holográfica, Luneta 4×, **Luneta Térmica** (enxerga Espectros e mostra zumbis no radar).
  - **Canos:** Compensador, Cano Curto, Cano Longo, **Silenciador** (sem clarão e tiro abafado), Choke (escopeta), Freio de Boca, Cano Reforçado.
  - **Carregadores:** Estendido, Recarga Rápida, Duplos, **Tambor**, Câmara Aumentada.
  - **Empunhaduras:** Vertical, Angular, Coronha Pesada, Gatilho Leve, Tática X.
  - **Munição:** Ponta Oca, Perfurante, Incendiária, Vampírica, **Explosiva**, **Elétrica** (o raio salta para até 3 zumbis).
- **Onde conseguir:** os comuns e incomuns são vendidos na **Loja → Oficina**; os raros (Térmica, Reforçado, Câmara Aumentada, Tática X,
  Explosiva, Elétrica) **só aparecem em baús, cofres, elites, chefes e eventos**. Acessórios achados na raid
  são perdidos se você morrer (igual às armas).

## Base (antes da raid)

- **Equipamento:** escolha a arma primária e a secundária, o colete, as granadas, os kits médicos e as
  torretas. A arma aparece em 3D (arraste para girar) com os atributos, e você pode trocar a camuflagem.
- **Arsenal:** todas as suas armas filtradas por tier. Dá para desmontar as que não quer e ganhar grana.
- **Loja:** caixas de armas (com roleta e as chances de cada tier), suprimentos, coletes e camuflagens.
- **Perícias:** cada nível dá 1 ponto para melhorar vida, resistência, regeneração, recarga,
  headshot, facão, esquiva, velocidade e sorte. O XP vem dos abates, das extrações e das missões.
- **Missões:** 3 contratos por vez (matar tipos de zumbi, headshots, facão, derrotar chefes,
  extrair de uma zona, Sobrevivência...) com grana, XP e às vezes uma arma Épica ou melhor.
- **Bestiário:** ficha de cada zumbi e chefe, com dica de como vencer e quantos você já abateu.
- **Raid:** escolha o modo, a zona e os modificadores.

## Modos, zonas e modificadores

- **Raid:** ondas fixas com chefe no final e extração no heliponto.
- **Sobrevivência:** ondas infinitas, com chefe a cada 5 ondas; depois de cada chefe, o helicóptero
  espera 30 segundos para você extrair. O recorde fica salvo.
- **Zonas** (cada uma tem mapa próprio, bem maior que antes: de 120×120 m a 152×152 m):
  | Zona | Cenário | Objetivo opcional → cofre |
  | --- | --- | --- |
  | **Subúrbio Abandonado** | bairro com casas (algumas dá para entrar), escola, igreja, parquinho com balanço e carrossel girando, caixa-d'água, árvores balançando, corvos | religar 2 **geradores** → abre o **Abrigo Antiaéreo** |
  | **Centro em Chamas** | arranha-céus, avenidas engarrafadas, **posto de gasolina que explode em cadeia**, **metrô elevado com trem passando**, semáforos piscando, carro-forte do banco | fechar 3 **válvulas de gás** (apaga os incêndios) → **Cofre do Banco** |
  | **Laboratório X-13** | complexo fechado com teto: corredores, 12 salas, **portas de segurança deslizantes**, tubos de contenção que quebram e soltam gás e zumbis, reator pulsante, luzes de emergência e câmeras giratórias | hackear 3 **terminais** → **Sala de Armas X-13** |
  | **Base Militar Caída** | fortaleza murada com **portão** que precisa ser aberto, quartéis, QG, arsenal, hangar com helicóptero, **torres de vigia para escalar** (degraus + pulo), tanques com torre girando, depósito de combustível, radar, holofotes varrendo o pátio, bandeira ao vento | sintonizar 2 **rádios de comando** → **Paiol de Armas** |
  | **Ninho da Rainha** | caverna viva de carne com cristas e pilares, **piscinas de ácido** (causam dano), **ovos que eclodem quando você chega perto** (ou levam tiro), casulos, tumores pulsando no ritmo do batimento, cogumelos brilhantes | incinerar 4 **casulos** → **Câmara Real** |

  As duas últimas zonas são liberadas extraindo da anterior.
- **Interagir com o cenário** (**E** no PC · botão ✋ no celular): abrir **baús, armários e malas** (loot de grana, munição,
  kits, granadas, armas e acessórios; os baús brilham e aparecem no mapa), abrir **portas** (giram ou deslizam; zumbis só passam
  pelas abertas), **disparar alarmes de carro** (a horda corre até o som por 16 s), **ativar objetivos** (3–4 s parado, a horda vem junto!) e atirar em
  **barris, bombas de combustível, tubos de contenção e ovos**. O facão continua em **V** (e no **E** quando não há nada por perto).
- **Eventos de onda** (chance de acontecer a partir da onda 2, dão bônus e loot): **Horda** (enxame de corredores), **Apagão**
  (luzes apagam e vêm espectros), **Chuva de esporos** (nuvens tóxicas pelo mapa) e **Bombardeio** (círculos vermelhos no chão: corra!).
  Cada zona tem os seus.
- **Modificadores** (somam recompensa): Lua de Sangue (+60% de vida nos zumbis), Frenesi (mais rápidos),
  Blindagem Total (todos de colete), Caçada de Elite (zumbis dourados com 3× vida que sempre soltam arma)
  e Escuridão.
- Durante as ondas cai **suprimento aéreo** (sinal vermelho) com uma arma de tier melhor.

## Inimigos

| Zumbi | Como funciona |
| --- | --- |
| Errante, Corredor, Cuspidor, Inchado, Brutamontes | Os básicos |
| **Rastejante** | Anda pelo chão, difícil de acertar |
| **Blindado** | Colete e capacete: as balas quase não passam. Explosões e armas Perfurantes quebram a armadura; fogo ignora |
| **Escudeiro** | Escudo antimotim que bloqueia tiros de frente. Mire na cabeça, pegue pelos lados, use granada ou facão |
| **Gritador** | Fica longe e grita: deixa a horda mais rápida e forte e chama reforços |
| **Espectro** | Quase invisível até chegar perto (só os olhos brilham) |
| **Tóxico** | Solta nuvens de gás venenoso |
| **Elite** | Qualquer zumbi dourado: 3× vida, mais forte, sempre solta arma |

**Chefes:** Açougueiro (investida com cutelo; fica tonto se bater numa parede), Abominação (fica furiosa
com metade da vida, chama corredores e cospe ácido), Colosso Blindado (ondas de choque que você precisa
**pular**; o núcleo nas costas leva dano crítico) e Rainha Infectada (rajadas de ácido e invoca a ninhada).

## Na raid

- Além das armas: **facão** (corpo a corpo, empurra os zumbis), **esquiva** (avanço rápido em que
  você não leva dano) e **torreta** (atira sozinha por 30 s).
- **PC:** WASD andar · mouse mirar · clique atirar · botão direito mirar (ADS) · Shift correr ·
  Espaço pular · V facão · C esquiva · T torreta · R recarregar · Q/1/2/rodinha trocar arma ·
  G granada · F kit médico · **E interagir** · **Y** inspecionar a arma · Esc pausa.
  Se o mouse não ficar preso na tela (ex.: dentro de outra página), segure o botão e arraste para olhar.
- **Celular:** o lado esquerdo da tela é o joystick, arraste o lado direito para olhar, segure 🔥 para
  atirar (ele também gira a câmera enquanto você arrasta), ⤒ pula, 🔪 facão, » esquiva e ⚙ torreta; o botão ✋ aparece quando há algo para interagir.
- **Opções** (na aba Raid e na pausa): sensibilidade da câmera, **mira assistida** (a mira gruda nos
  zumbis) e **tiro automático** (atira sozinho quando a mira fica vermelha em cima de um zumbi).
  As duas vêm ligadas no celular.

## Gráficos

- **Armas detalhadas:** trilhos, miras de ferro, red dot, holográfica e lunetas, quebra-chamas, cartuchos na lateral
  da escopeta, cinta de munição na metralhadora, metal com reflexo e camuflagens com padrão (deserto, floresta,
  digital, sangue, gelo, ouro gravado, obsidiana com veias brilhando). Cada tier acrescenta peças: Raro ganha red
  dot, Épico holográfica e lanterna com laser, Lendário trilhos de energia e runa flutuante, Mítico núcleo de
  cristal e anéis girando no cano.
- **Primeira pessoa:** mãos com luva e mangas camufladas, ferrolho que recua a cada tiro, pump da escopeta,
  carregador que cai na recarga, cápsulas ejetadas, clarão e fumaça.
- **Zumbis:** corpo com joelhos, cotovelos, mãos com dedos e mandíbula que mexe; roupas rasgadas, costelas
  expostas, feridas, cabelos e calçados variados; olhos brilhando. Cada tipo tem visual próprio (soldado com
  capacete e óculos, policial com escudo "POLÍCIA", máscara de gás, avental hospitalar, açougueiro com capuz e
  cutelo, colosso blindado, rainha com asas e garras). Headshot fatal estoura a cabeça; os corpos caem de jeitos
  diferentes e deixam poça de sangue.
- **Cenário:** ruas com faixas, calçadas, bueiros e poças que refletem a luz; prédios com janelas acesas, lojas
  saqueadas, toldos e letreiros de neon piscando; viatura com sirene, sacos de areia, caçambas, barris com fogo;
  céu com lua, nuvens e estrelas; clima por zona (cinzas, brasas, esporos, chuva com relâmpagos) e névoa rasteira.
- **Efeitos:** brilho (bloom), correção de cor, vinheta, granulação, tela dessaturada com pouca vida e sombras na
  qualidade Alta. A qualidade (Baixa, Média ou Alta) fica nas opções da aba Raid; use **Baixa** em celulares fracos.
- **Interface:** tema militar com fontes condensadas, fundo animado na base, painéis com cantoneiras, brilho nas
  cartas raras, minimapa redondo, vida segmentada e indicador de direção do dano.

## Áudio (Fish Audio) e ambientação

- Cada zona tem **ambientação própria** gerada no navegador: vento e grilos com latidos no subúrbio, rumor de cidade, sirenes e
  explosões distantes no centro, zumbido elétrico e alarmes no laboratório, chuva, rádio e artilharia na base, batimento cardíaco e
  sussurros no ninho. Os passos mudam conforme o piso.
- As **vozes e ruídos de criaturas** (gemidos, gritos, rugidos dos chefes, dor e respiração do soldado, rádio, vozes distantes)
  são gerados com o **Fish Audio**: rode `node zumbi/tools/gerar-audio-fish.mjs` com a sua chave (veja
  [`zumbi/audio/LEIA-ME.md`](zumbi/audio/LEIA-ME.md)). Enquanto os arquivos não existem, o jogo usa sons sintetizados e mostra as
  falas do rádio como texto no canto da tela.

## Animações

Zumbis **brotam do chão** (ovos, tubos e ativações), pistas de pouso e holofotes giram, árvores e bandeira balançam, balanço e
carrossel se mexem, corvos voam em círculos, o trem do metrô passa, tanques giram a torre, luzes do laboratório piscam, os ovos tremem
antes de eclodir. Na primeira pessoa: **balanço da arma ao virar a câmera**, respiração, inclinação ao andar de lado, tranco da
câmera ao levar dano, bob mais forte na corrida e **animação de inspeção da arma (Y)**.

O progresso fica salvo no navegador (localStorage). O Three.js (com os efeitos de pós-processamento) está em
`zumbi/lib/` (licença MIT), então o jogo não depende de CDN.

## Instalar nos celulares (PWA, APK, Play Store, App Store)

O jogo é um **PWA** (abra a URL no celular → *Instalar app* / *Adicionar à tela inicial*; funciona offline depois da primeira vez).
Para gerar o **APK / AAB / IPA** (fora do Expo Go) com o EAS Build, siga o passo a passo em
[`zumbi-expo/PUBLICAR.md`](zumbi-expo/PUBLICAR.md).

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
