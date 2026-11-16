# Áudio do Apocalipse Z (Fish Audio)

Esta pasta guarda as vozes e os ruídos gerados com o **Fish Audio**. O jogo lê `manifest.json`
e usa os arquivos que existirem; o que faltar continua com o som sintetizado (nada quebra).

## Como gerar

1. Crie uma chave em https://fish.audio (Developers → API Keys). **Não coloque a chave no código nem no GitHub.**
2. (Opcional) Escolha vozes da biblioteca do Fish e copie `../tools/fish-vozes.exemplo.json`
   para `../tools/fish-vozes.json`, colando os `reference_id`.
3. Na raiz do repositório:

```bash
export FISH_API_KEY="sua-chave"
node zumbi/tools/gerar-audio-fish.mjs --lista     # mostra o que será gerado (não gasta créditos)
node zumbi/tools/gerar-audio-fish.mjs             # gera tudo que ainda não existe
node zumbi/tools/gerar-audio-fish.mjs --so=zumbi_gemido,chefe_rainha --refazer   # refaz só alguns
```

4. Faça commit da pasta `zumbi/audio/` (os .mp3 e o `manifest.json`) e publique.

## O que é gerado

- **Ruídos de criaturas** (com marcas de emoção do Fish, ex. `(groaning)`, `(screaming)`): gemidos, ataques, mortes,
  gritos de corredores e gritadores, rugidos dos 4 chefes.
- **Soldado (você):** dor, respiração ofegante, morte, "Granada!", "Recarregando!", "Sem munição!".
- **Rádio:** início de cada zona, ondas, eventos, objetivo concluído, extração.
- **Ambiente por zona:** vozes distantes (choro no subúrbio, comunicado de quarentena no laboratório, rádio da base,
  sussurros no ninho) que tocam de tempos em tempos por cima da ambientação procedural.

Os textos ficam em `zumbi/js/audio.js` (`CATEGORIAS` e `FALAS`). Edite à vontade e rode o gerador de novo.
