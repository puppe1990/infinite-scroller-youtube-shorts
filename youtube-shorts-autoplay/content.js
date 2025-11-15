console.log('🔴 EXTENSION CARREGADA - YouTube Shorts AutoPlay');

const STORAGE_KEY = 'autoplayEnabled';
const END_THRESHOLD_PERCENT = 0.5; // % restante
const END_DEBOUNCE_MS = 2000;
const VIDEO_SCAN_INTERVAL_MS = 800;
const SKIP_KEY = { key: 'j', code: 'KeyJ', keyCode: 74 };

let autoplayEnabled = true;
let currentVideo = null;
let lastVideoSrc = null;
let detachCurrentListeners = null;
let lastSkipTimestamp = 0;
let hasLoggedDisabled = false;

const storageAvailable = typeof chrome !== 'undefined' && chrome.storage?.sync;

const sendKeyFallback = () => {
  const event = new KeyboardEvent('keydown', {
    key: SKIP_KEY.key,
    code: SKIP_KEY.code,
    keyCode: SKIP_KEY.keyCode,
    bubbles: true,
    cancelable: true,
    view: window,
  });
  document.dispatchEvent(event);
  console.log('✅ Fallback: tecla J disparada');
};

const clickSynthetic = (element) => {
  if (!element) return false;
  ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach((type) => {
    element.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
  });
  return true;
};

const tryOverlayButton = () => {
  const selectors = [
    'ytd-reel-player-overlay-renderer #navigation-button-down button',
    'ytd-reel-player-overlay-renderer #navigation-button-down tp-yt-paper-icon-button',
    'button[aria-label*="Next"]',
    'button[aria-label*="Próximo"]',
    'button[aria-label*="Siguiente"]'
  ];

  for (const selector of selectors) {
    const btn = document.querySelector(selector);
    if (btn && !btn.disabled) {
      console.log(`🖱️ Clique no botão overlay (${selector})`);
      clickSynthetic(btn);
      return true;
    }
  }
  return false;
};

const goToNextShort = () => {
  if (tryOverlayButton()) {
    return true;
  }

  const renderer = currentVideo?.closest('ytd-reel-video-renderer');
  if (!renderer) {
    console.log('⚠️ Não encontrei renderer atual, usando fallback');
    return false;
  }

  const parent = renderer.parentElement;
  const nextRenderer = renderer.nextElementSibling || parent?.firstElementChild;
  if (!nextRenderer || nextRenderer === renderer) {
    console.log('⚠️ Sem próximo renderer disponível');
    return false;
  }

  nextRenderer.scrollIntoView({ behavior: 'auto', block: 'center' });
  const link = nextRenderer.querySelector('a[href*="/shorts/"]') || nextRenderer.querySelector('a');
  if (link) {
    if (link.href) {
      console.log(`🌐 Redirecionando para ${link.href}`);
      window.location.assign(link.href);
      return true;
    }
    clickSynthetic(link);
    console.log('🖱️ Clique direto no link do próximo short');
    return true;
  }

  console.log('⚠️ Próximo short sem link navegável');
  return false;
};

const triggerSkip = (reason) => {
  const now = Date.now();
  if (now - lastSkipTimestamp < END_DEBOUNCE_MS) {
    return;
  }
  lastSkipTimestamp = now;
  console.log(`🔥 ${reason} - tentando avançar`);

  if (!goToNextShort()) {
    sendKeyFallback();
  }
};

const detachListeners = () => {
  if (detachCurrentListeners) {
    detachCurrentListeners();
    detachCurrentListeners = null;
  }
  currentVideo = null;
  lastVideoSrc = null;
};

const attachListeners = (video) => {
  detachListeners();
  currentVideo = video;
  lastVideoSrc = video?.src || null;
  console.log('✅ Listeners de término instalados no <video>');

  const handleTimeUpdate = () => {
    if (!autoplayEnabled || !video.duration) {
      return;
    }
    const percentRemaining = ((video.duration - video.currentTime) / video.duration) * 100;
    if (percentRemaining > 0 && percentRemaining <= END_THRESHOLD_PERCENT) {
      triggerSkip('Tempo quase finalizado');
    }
  };

  const handleEnded = () => {
    if (autoplayEnabled) {
      triggerSkip('Evento ended disparado');
    }
  };

  video.addEventListener('timeupdate', handleTimeUpdate);
  video.addEventListener('ended', handleEnded);

  detachCurrentListeners = () => {
    video.removeEventListener('timeupdate', handleTimeUpdate);
    video.removeEventListener('ended', handleEnded);
  };
};

const detectVideo = () =>
  document.querySelector('ytd-reel-video-renderer[is-active] video') ||
  document.querySelector('#shorts-player video') ||
  document.querySelector('video');

const monitorLoop = () => {
  if (!autoplayEnabled) {
    if (!hasLoggedDisabled) {
      console.log('⏸️ AutoPlay está desativado pelo popup');
      hasLoggedDisabled = true;
    }
    detachListeners();
    return;
  }

  hasLoggedDisabled = false;
  const video = detectVideo();
  if (!video || !video.duration || isNaN(video.duration)) {
    return;
  }

  if (video !== currentVideo || video.src !== lastVideoSrc) {
    console.log('🆕 Novo vídeo detectado');
    console.log(`⏱️ Duração: ${video.duration.toFixed(2)}s`);
    attachListeners(video);
  }
};

if (storageAvailable) {
  chrome.storage.sync.get({ [STORAGE_KEY]: true }, (data) => {
    autoplayEnabled = Boolean(data[STORAGE_KEY]);
    console.log(`⚙️ AutoPlay ${autoplayEnabled ? 'ativado' : 'desativado'} (popup)`);
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && STORAGE_KEY in changes) {
      autoplayEnabled = Boolean(changes[STORAGE_KEY].newValue);
      console.log(`⚙️ AutoPlay ${autoplayEnabled ? 'ativado' : 'desativado'} (popup)`);
      if (!autoplayEnabled) detachListeners();
    }
  });
}

monitorLoop();
setInterval(() => {
  try {
    monitorLoop();
  } catch (error) {
    console.error('❌ ERRO no monitoramento:', error);
  }
}, VIDEO_SCAN_INTERVAL_MS);
