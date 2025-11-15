# YouTube Shorts AutoPlay

Extensão Chrome (Manifest V3) que detecta o fim dos vídeos no feed de Shorts e aciona automaticamente o próximo item – seja clicando no botão nativo do overlay, navegando para o próximo card ou, em último caso, disparando a tecla `J`.

## Instalação

1. Abra `chrome://extensions/`.
2. Ative **Modo desenvolvedor**.
3. Clique em **Carregar sem compactação** e escolha a pasta `youtube-shorts-autoplay`.

## Funcionamento

- Um content script (`content.js`) monitora o `<video>` ativo usando listeners de `timeupdate` e `ended`.
- Quando restam ~0,5 % ou o evento `ended` dispara, ele:
  1. Tenta clicar no botão nativo “Próximo” do overlay.
  2. Caso falhe, encontra o próximo `ytd-reel-video-renderer` e navega via link.
  3. Como fallback final, envia o atalho `J`.
- O popup (`popup.html`) oferece um toggle persistido em `chrome.storage.sync` para ativar/desativar o autoplay em tempo real.

## Personalização

- Ajuste `END_THRESHOLD_PERCENT` em `content.js` para mudar o ponto de disparo (0,5 % por padrão).
- Troque o comportamento do botão/atalho dentro de `goToNextShort()` caso prefira outro método para avançar os Shorts.

## Logs e Debug

Abra DevTools no `youtube.com/shorts/...` para ver mensagens como:

- `🆕 Novo vídeo detectado` (quando o script detecta o player atual)
- `🔥 Tempo quase finalizado - tentando avançar` (gatilho do autoplay)
- `🖱️ Clique no botão overlay ...` ou `✅ Fallback: tecla J disparada` (método usado para avançar)

Esses logs ajudam a verificar rapidamente qual caminho foi seguido e se há bloqueios do player.
