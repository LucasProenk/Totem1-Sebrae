/* ==========================================================================
   CONFIGURAÇÃO
   ========================================================================== */
const FRAME_COUNT = 240;          // total de imagens (Garrafa_00000.png -> Garrafa_00239.png)
const FRAME_FOLDER = 'Garrafa/';  // caminho relativo (funciona com ou sem servidor local)
const FRAME_PREFIX = 'Garrafa_';
const FRAME_EXT = '.png';
const IDLE_RESET_MS = 17000;      // tempo sem interação até voltar pro frame 0

/* ==========================================================================
   MATERIAL
   - Única fonte de dados pra todo o painel de informações. Pra adicionar
     ou trocar o material exibido, basta mudar este objeto (nome, imagem,
     decomposição máxima) sem tocar na lógica de atualização abaixo.
   ========================================================================== */
const material = {
  nome: 'PET',
  decomposicaoMaxima: 600, // anos
};

/* ==========================================================================
   ELEMENTOS DO DOM
   ========================================================================== */
const canvas = document.getElementById('frameCanvas');
const ctx = canvas.getContext('2d');
const slider = document.getElementById('frameSlider');
const rotateStage = document.getElementById('rotateStage');
const loader = document.getElementById('loader');
const loaderFill = document.getElementById('loaderFill');
const loaderPercent = document.getElementById('loaderPercent');
const materialValueEl = document.getElementById('materialValue');
const tempoNumberEl = document.getElementById('tempoNumber');
const integridadeValueEl = document.getElementById('integridadeValue');
const integridadeBarFillEl = document.getElementById('integridadeBarFill');

/* ==========================================================================
   ESTADO
   ========================================================================== */
const images = new Array(FRAME_COUNT);
let currentFrame = 0;
let isReady = false;

/* ==========================================================================
   UTIL
   ========================================================================== */
function pad(num) {
  return String(num).padStart(5, '0');
}

function frameUrl(index) {
  return `${FRAME_FOLDER}${FRAME_PREFIX}${pad(index)}${FRAME_EXT}`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/* ==========================================================================
   PRÉ-CARREGAMENTO DAS IMAGENS
   - Carrega as 240 imagens em paralelo e atualiza a barra de progresso
   ========================================================================== */
function preloadFrames() {
  let loadedCount = 0;

  return new Promise((resolve) => {
    for (let i = 0; i < FRAME_COUNT; i++) {
      const img = new Image();
      img.src = frameUrl(i);

      const onDone = () => {
        loadedCount++;
        const percent = Math.round((loadedCount / FRAME_COUNT) * 100);
        loaderFill.style.width = `${percent}%`;
        loaderPercent.textContent = `${percent}%`;

        if (loadedCount === FRAME_COUNT) resolve();
      };

      img.onload = onDone;
      img.onerror = onDone; // não trava o carregamento se uma imagem falhar

      images[i] = img;
    }
  });
}

/* ==========================================================================
   DESENHO NO CANVAS (equivalente a background-size: cover)
   ========================================================================== */
function resizeCanvas() {
  // clientWidth/clientHeight refletem o box do stage ANTES do transform
  // (rotate), ou seja, já nas dimensões "lógicas" retrato corretas,
  // independente da resolução real (paisagem) da TV.
  canvas.width = rotateStage.clientWidth;
  canvas.height = rotateStage.clientHeight;
}

function drawFrame(index) {
  const img = images[index];
  if (!img || !img.complete || img.naturalWidth === 0) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const canvasRatio = canvas.width / canvas.height;
  const imgRatio = img.naturalWidth / img.naturalHeight;

  let drawWidth;
  let drawHeight;

  if (imgRatio > canvasRatio) {
    drawHeight = canvas.height;
    drawWidth = img.naturalWidth * (drawHeight / img.naturalHeight);
  } else {
    drawWidth = canvas.width;
    drawHeight = img.naturalHeight * (drawWidth / img.naturalWidth);
  }

  const offsetX = (canvas.width - drawWidth) / 2;
  const offsetY = (canvas.height - drawHeight) / 2;

  ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
}

/* ==========================================================================
   PAINEL DE INFORMAÇÕES (material / tempo de decomposição / integridade)
   - Tudo derivado de `material` e do progresso do slider (0 a 1).
   ========================================================================== */
function updateInfoPanel(frame) {
  const progress = frame / (FRAME_COUNT - 1);

  const anos = Math.round(progress * material.decomposicaoMaxima);
  const integridade = Math.round((1 - progress) * 100);

  materialValueEl.textContent = material.nome;
  tempoNumberEl.textContent = anos;
  integridadeValueEl.textContent = `${integridade}%`;
  integridadeBarFillEl.style.width = `${integridade}%`;
}

/* ==========================================================================
   CONTROLE DO FRAME (somente pelo slider)
   ========================================================================== */
function setFrame(index, options = {}) {
  const frame = clamp(Math.round(index), 0, FRAME_COUNT - 1);
  if (frame === currentFrame && options.force !== true) return;

  currentFrame = frame;
  drawFrame(currentFrame);
  updateInfoPanel(currentFrame);

  if (Number(slider.value) !== frame) {
    slider.value = frame;
  }
}

/* ==========================================================================
   EVENTOS
   ========================================================================== */
slider.addEventListener('input', () => {
  if (!isReady) return;
  resetIdleTimer();
  // requestAnimationFrame garante que o desenho fique suave mesmo arrastando rápido
  requestAnimationFrame(() => setFrame(Number(slider.value)));
});

window.addEventListener('resize', () => {
  resizeCanvas();
  drawFrame(currentFrame);
});

/* ==========================================================================
   RESET POR INATIVIDADE
   - Se ninguém mexer no slider por IDLE_RESET_MS, volta pro frame 0
   ========================================================================== */
let idleTimer = null;

function resetIdleTimer() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    setFrame(0, { force: true });
  }, IDLE_RESET_MS);
}

/* ==========================================================================
   INICIALIZAÇÃO
   ========================================================================== */
async function init() {
  resizeCanvas();

  await preloadFrames();

  isReady = true;
  setFrame(0, { force: true });

  resetIdleTimer();

  loader.classList.add('is-hidden');
}

init();
