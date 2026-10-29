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
