/* ==========================================================================
   CONFIGURAÇÃO
   ========================================================================== */
const FRAME_COUNT = 240;          // total de imagens por material
const IDLE_RESET_MS = 17000;      // tempo sem interação até voltar pro frame 0

/* ==========================================================================
   MATERIAIS DISPONÍVEIS (botões de seleção)
   - Chave = data-material do botão (.material-btn) em index.html.
   - Cada material tem sua própria pasta/prefixo de frames + os dados do
     painel de informações (nome, decomposição máxima e a unidade de tempo
     em que ela é exibida: ANOS ou MESES).
   ========================================================================== */
const MATERIALS = {
  garrafa: {
    nome: 'PET',
    decomposicaoMaxima: 600,
    unidadeTempo: 'ANOS',
    frameFolder: 'Garrafa',
    framePrefix: 'Garrafa_',
    frameExt: '.png',
    framePad: 5,
  },
  tenis: {
    nome: 'TÊNIS',
    decomposicaoMaxima: 60,
    unidadeTempo: 'ANOS',
    frameFolder: 'button 02',
    framePrefix: 'button 02_',
    frameExt: '.png',
    framePad: 5,
  },
  lanche: {
    nome: 'LANCHE',
    decomposicaoMaxima: 8,
    unidadeTempo: 'MESES',
    frameFolder: 'button 03',
    framePrefix: 'button 03_',
    frameExt: '.png',
    framePad: 5,
  },
  urso: {
    nome: 'URSO',
    decomposicaoMaxima: 40,
    unidadeTempo: 'ANOS',
    frameFolder: 'button 04',
    framePrefix: 'button 04_',
    frameExt: '.png',
    framePad: 5,
  },
};

const DEFAULT_MATERIAL_KEY = 'garrafa';

/* ==========================================================================
   MATERIAL ATIVO
   - Única fonte de dados pra todo o painel de informações.
   ========================================================================== */
let activeMaterialKey = DEFAULT_MATERIAL_KEY;
const material = {
  nome: MATERIALS[DEFAULT_MATERIAL_KEY].nome,
  decomposicaoMaxima: MATERIALS[DEFAULT_MATERIAL_KEY].decomposicaoMaxima,
  unidadeTempo: MATERIALS[DEFAULT_MATERIAL_KEY].unidadeTempo,
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
const tempoUnidadeEl = document.getElementById('tempoUnidade');
const integridadeValueEl = document.getElementById('integridadeValue');
const integridadeBarFillEl = document.getElementById('integridadeBarFill');

/* ==========================================================================
   ESTADO
   - frameCache: um array de 240 imagens por material, carregado sob demanda
     (só quando o material é selecionado pela primeira vez).
   ========================================================================== */
const frameCache = {};
let currentFrame = 0;
let isReady = false;

/* ==========================================================================
   UTIL
   ========================================================================== */
function pad(num, length) {
  return String(num).padStart(length, '0');
}

function frameUrl(config, index) {
  // encodeURIComponent na pasta: alguns nomes têm espaço (ex: "buttom 02")
  return `${encodeURIComponent(config.frameFolder)}/${config.framePrefix}${pad(index, config.framePad)}${config.frameExt}`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/* ==========================================================================
   PRÉ-CARREGAMENTO DAS IMAGENS
   - Carrega as 240 imagens do material em paralelo e atualiza a barra de
     progresso. Resultado fica em frameCache[key] pra não recarregar depois.
   ========================================================================== */
function preloadMaterialFrames(key) {
  if (frameCache[key]) return Promise.resolve(frameCache[key]);

  const config = MATERIALS[key];
  const frames = new Array(FRAME_COUNT);
  let loadedCount = 0;

  return new Promise((resolve) => {
    for (let i = 0; i < FRAME_COUNT; i++) {
      const img = new Image();
      img.src = frameUrl(config, i);

      const onDone = () => {
        loadedCount++;
        const percent = Math.round((loadedCount / FRAME_COUNT) * 100);
        loaderFill.style.width = `${percent}%`;
        loaderPercent.textContent = `${percent}%`;

        if (loadedCount === FRAME_COUNT) {
          frameCache[key] = frames;
          resolve(frames);
        }
      };

      img.onload = onDone;
      img.onerror = onDone; // não trava o carregamento se uma imagem falhar

      frames[i] = img;
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
  const frames = frameCache[activeMaterialKey];
  const img = frames && frames[index];
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

  const tempo = Math.round(progress * material.decomposicaoMaxima);
  const integridade = Math.round((1 - progress) * 100);

  materialValueEl.textContent = material.nome;
  tempoNumberEl.textContent = tempo;
  tempoUnidadeEl.textContent = material.unidadeTempo;
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
   BOTÕES DE SELEÇÃO DE MATERIAL
   - Apenas 1 botão ativo por vez (estilo rádio).
   - Se o material clicado tiver dados em MATERIALS (por enquanto "garrafa"
     e "tenis"), troca o objeto `material`, carrega (ou reaproveita do
     cache) os frames daquele material e redesenha tudo no frame atual
     do slider. Materiais sem entrada em MATERIALS continuam só com o
     toggle visual.
   ========================================================================== */
const materialButtons = document.querySelectorAll('.material-btn');

materialButtons.forEach((button) => {
  button.addEventListener('click', async () => {
    materialButtons.forEach((btn) => btn.classList.remove('is-active'));
    button.classList.add('is-active');

    const key = button.dataset.material;
    const selected = MATERIALS[key];
    if (!selected || !isReady) return;

    material.nome = selected.nome;
    material.decomposicaoMaxima = selected.decomposicaoMaxima;
    material.unidadeTempo = selected.unidadeTempo;

    if (key !== activeMaterialKey) {
      activeMaterialKey = key;

      if (!frameCache[key]) {
        loader.classList.remove('is-hidden');
        await preloadMaterialFrames(key);
        loader.classList.add('is-hidden');
      }
    }

    setFrame(0, { force: true }); // volta o slider pro início ao trocar de material
  });
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

  await preloadMaterialFrames(DEFAULT_MATERIAL_KEY);

  isReady = true;
  setFrame(0, { force: true });

  resetIdleTimer();

  loader.classList.add('is-hidden');
}

init();
