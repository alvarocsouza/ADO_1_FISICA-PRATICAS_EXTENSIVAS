// =============================================================
// SIMULADOR DE LANÇAMENTO DE PROJÉTIL - p5.js
// Sem resistência do ar
// =============================================================

// ==============================
// Configurações gerais
// ==============================
const LARGURA = 1200;
const ALTURA = 750;

// Paleta de cores
const FUNDO = [245, 247, 250];
const PAINEL = [230, 234, 240];
const BRANCO = [255, 255, 255];
const PRETO = [30, 30, 30];
const CINZA = [100, 105, 115];
const CINZA_CLARO = [190, 195, 205];
const CINZA_HIST = [180, 185, 195];
const AZUL = [50, 100, 220];
const AZUL_ESCURO = [35, 70, 160];
const VERDE = [40, 160, 90];
const VERMELHO = [210, 60, 60];
const LARANJA = [230, 140, 40];

// Área do gráfico
const GRAFICO_X = 360;
const GRAFICO_Y = 80;
const GRAFICO_LARGURA = 800;
const GRAFICO_ALTURA = 560;

// Limites
const VEL_MIN = 5;
const VEL_MAX = 150;

const ANGULO_MIN = 1;
const ANGULO_MAX = 89;

const ALTURA_MIN = 0;
const ALTURA_MAX = 50;

const GRAVIDADE_MIN = 1.6;
const GRAVIDADE_MAX = 24.8;

// ==============================
// Estado dos parâmetros
// ==============================
let velocidade = 50.0;
let angulo = 45.0;
let alturaInicial = 10.0;
let gravidade = 9.81;
let nomeGravidade = "Terra";

// ==============================
// Estado da animação
// ==============================
let animando = false;
let tempoAnimacao = 0.0;

// Parâmetros congelados no lançamento
let velLancamento = velocidade;
let anguloLancamento = angulo;
let alturaLancamento = alturaInicial;
let gravLancamento = gravidade;

// Histórico
let historicoLancamentos = [];
let jaLancouAlgumaVez = false;

// Slider ativo
let sliderAtivo = null;

// Presets
const GRAVIDADES = {
  Lua: 1.62,
  Marte: 3.71,
  Terra: 9.81,
  Jupiter: 24.79
};

// ==============================
// Elementos dos sliders
// ==============================
let sliderVelocidade;
let sliderAngulo;
let sliderAltura;
let sliderGravidade;

// ==============================
// Setup
// ==============================
function setup() {
  createCanvas(LARGURA, ALTURA);

  // Sliders HTML do p5.js
  sliderVelocidade = createSlider(
    VEL_MIN,
    VEL_MAX,
    velocidade,
    0.1
  );

  sliderAngulo = createSlider(
    ANGULO_MIN,
    ANGULO_MAX,
    angulo,
    0.1
  );

  sliderAltura = createSlider(
    ALTURA_MIN,
    ALTURA_MAX,
    alturaInicial,
    0.1
  );

  sliderGravidade = createSlider(
    GRAVIDADE_MIN,
    GRAVIDADE_MAX,
    gravidade,
    0.01
  );

  configurarSlider(
    sliderVelocidade,
    50,
    180,
    250
  );

  configurarSlider(
    sliderAngulo,
    50,
    270,
    250
  );

  configurarSlider(
    sliderAltura,
    50,
    360,
    250
  );

  configurarSlider(
    sliderGravidade,
    50,
    450,
    250
  );
}

// ==============================
// Configuração visual dos sliders
// ==============================
function configurarSlider(slider, x, y, largura) {
  slider.position(x, y - 8);
  slider.size(largura);
}

// ==============================
// Draw principal
// ==============================
function draw() {
  background(...FUNDO);

  atualizarValoresSliders();

  desenharTitulo();
  desenharPainel();
  desenharControles();
  desenharBotoes();
  desenharGrafico();

  atualizarAnimacao();
  desenharAnimacao();

  desenharResultados();
}

// ==============================
// Atualiza valores dos sliders
// ==============================
function atualizarValoresSliders() {
  velocidade = sliderVelocidade.value();
  angulo = sliderAngulo.value();
  alturaInicial = sliderAltura.value();

  const novaGravidade = sliderGravidade.value();

  if (abs(novaGravidade - gravidade) > 0.001) {
    gravidade = novaGravidade;
    nomeGravidade = "Personalizada";
  }
}

// ==============================
// Física
// ==============================
function calcularTempoVoo(v0, theta, y0, g) {
  const thetaRad = radians(theta);
  const vy = v0 * sin(thetaRad);

  const discriminante = vy * vy + 2 * g * y0;

  return (vy + sqrt(discriminante)) / g;
}

function calcularAlturaMaxima(v0, theta, y0, g) {
  const thetaRad = radians(theta);
  const vy = v0 * sin(thetaRad);

  return y0 + (vy * vy) / (2 * g);
}

function calcularAlcance(v0, theta, x0, y0, g) {
  const thetaRad = radians(theta);

  const t = calcularTempoVoo(
    v0,
    theta,
    y0,
    g
  );

  return x0 + v0 * cos(thetaRad) * t;
}

function calcularResultados(v0, theta, y0, g) {
  const x0 = 0;

  const tempo = calcularTempoVoo(
    v0,
    theta,
    y0,
    g
  );

  const altura = calcularAlturaMaxima(
    v0,
    theta,
    y0,
    g
  );

  const alcance = calcularAlcance(
    v0,
    theta,
    x0,
    y0,
    g
  );

  return {
    alcance: alcance,
    alturaMax: altura,
    tempoVoo: tempo
  };
}

function calcularTrajetoria(
  v0,
  theta,
  y0,
  g,
  quantidade = 500
) {
  const thetaRad = radians(theta);

  const tempoVoo = calcularTempoVoo(
    v0,
    theta,
    y0,
    g
  );

  const pontos = [];

  for (let i = 0; i <= quantidade; i++) {
    const t = tempoVoo * i / quantidade;

    const x =
      v0 * cos(thetaRad) * t;

    let y =
      y0 +
      v0 * sin(thetaRad) * t -
      0.5 * g * t * t;

    if (y < 0) {
      y = 0;
    }

    pontos.push({ x, y });
  }

  return pontos;
}

// ==============================
// Validação
// ==============================
function validarParametros(v0, theta, y0, g) {
  if (v0 <= 0) {
    return {
      ok: false,
      mensagem: "Velocidade deve ser positiva."
    };
  }

  if (!(theta > 0 && theta < 90)) {
    return {
      ok: false,
      mensagem: "Ângulo deve estar entre 0° e 90°."
    };
  }

  if (y0 < 0) {
    return {
      ok: false,
      mensagem: "Altura inicial não pode ser negativa."
    };
  }

  if (g <= 0) {
    return {
      ok: false,
      mensagem: "Gravidade deve ser positiva."
    };
  }

  return {
    ok: true,
    mensagem: null
  };
}

// ==============================
// Escala do gráfico
// ==============================
function calcularEscala(v0, theta, y0, g) {
  const resultado = calcularResultados(
    v0,
    theta,
    y0,
    g
  );

  const larguraUtil =
    GRAFICO_LARGURA - 80;

  const alturaUtil =
    GRAFICO_ALTURA - 80;

  const escalaX =
    larguraUtil /
    max(resultado.alcance, 1);

  const escalaY =
    alturaUtil /
    max(resultado.alturaMax, 1);

  return min(escalaX, escalaY);
}

// ==============================
// Mundo -> Tela
// ==============================
function mundoParaTela(x, y, escala) {
  const origemX =
    GRAFICO_X + 50;

  const origemY =
    GRAFICO_Y +
    GRAFICO_ALTURA -
    40;

  return {
    x: origemX + x * escala,
    y: origemY - y * escala
  };
}

// ==============================
// Texto
// ==============================
function desenharTexto(
  texto,
  x,
  y,
  cor = PRETO,
  tamanho = 18,
  negrito = false
) {
  push();

  fill(...cor);
  noStroke();

  textSize(tamanho);
  textStyle(negrito ? BOLD : NORMAL);

  text(texto, x, y);

  pop();
}

// ==============================
// Título
// ==============================
function desenharTitulo() {
  desenharTexto(
    "SIMULADOR DE LANÇAMENTO DE PROJÉTIL",
    30,
    50,
    PRETO,
    28,
    true
  );
}

// ==============================
// Painel
// ==============================
function desenharPainel() {
  push();

  fill(...PAINEL);
  noStroke();

  rect(
    20,
    80,
    310,
    560,
    12
  );

  pop();

  desenharTexto(
    "PARÂMETROS",
    45,
    125,
    AZUL_ESCURO,
    19,
    true
  );
}

// ==============================
// Controles
// ==============================
function desenharControles() {
  desenharTexto(
    `Velocidade: ${velocidade.toFixed(1)} m/s`,
    50,
    150,
    PRETO,
    18
  );

  desenharTexto(
    `Ângulo: ${angulo.toFixed(1)}°`,
    50,
    240,
    PRETO,
    18
  );

  desenharTexto(
    `Altura inicial: ${alturaInicial.toFixed(1)} m`,
    50,
    330,
    PRETO,
    18
  );

  desenharTexto(
    `Gravidade: ${gravidade.toFixed(2)} m/s²`,
    50,
    420,
    PRETO,
    18
  );

  desenharTexto(
    `Planeta: ${nomeGravidade}`,
    50,
    490,
    PRETO,
    18
  );

  desenharTexto(
    "Presets: [L] Lua  [M] Marte",
    50,
    515,
    CINZA,
    14
  );

  desenharTexto(
    "         [T] Terra  [J] Jupiter",
    50,
    535,
    CINZA,
    14
  );
}

// ==============================
// Botões
// ==============================
function desenharBotoes() {
  desenharBotao(
    50,
    570,
    80,
    45,
    "LANÇAR",
    AZUL
  );

  desenharBotao(
    140,
    570,
    80,
    45,
    "RESET",
    CINZA
  );

  desenharBotao(
    230,
    570,
    80,
    45,
    "LIMPAR",
    CINZA
  );
}

function desenharBotao(
  x,
  y,
  largura,
  altura,
  texto,
  cor
) {
  push();

  fill(...cor);
  noStroke();

  rect(
    x,
    y,
    largura,
    altura,
    8
  );

  fill(...BRANCO);

  textSize(16);
  textStyle(BOLD);
  textAlign(CENTER, CENTER);

  text(
    texto,
    x + largura / 2,
    y + altura / 2
  );

  pop();
}

// ==============================
// Verifica clique nos botões
// ==============================
function mousePressed() {
  if (
    mouseX >= 50 &&
    mouseX <= 130 &&
    mouseY >= 570 &&
    mouseY <= 615
  ) {
    lancar();
    return;
  }

  if (
    mouseX >= 140 &&
    mouseX <= 220 &&
    mouseY >= 570 &&
    mouseY <= 615
  ) {
    resetar();
    return;
  }

  if (
    mouseX >= 230 &&
    mouseX <= 310 &&
    mouseY >= 570 &&
    mouseY <= 615
  ) {
    limparHistorico();
    return;
  }
}

// ==============================
// Teclado
// ==============================
function keyPressed() {
  if (key === "l" || key === "L") {
    selecionarGravidade("Lua");
  }

  else if (key === "m" || key === "M") {
    selecionarGravidade("Marte");
  }

  else if (key === "t" || key === "T") {
    selecionarGravidade("Terra");
  }

  else if (key === "j" || key === "J") {
    selecionarGravidade("Jupiter");
  }

  else if (key === " ") {
    lancar();
    return false;
  }

  else if (key === "r" || key === "R") {
    resetar();
  }

  else if (key === "c" || key === "C") {
    limparHistorico();
  }

  else if (keyCode === ESCAPE) {
    // No navegador não precisamos fechar a janela.
    // Apenas interrompemos a animação.
    animando = false;
  }
}

// ==============================
// Presets de gravidade
// ==============================
function selecionarGravidade(nome) {
  gravidade = GRAVIDADES[nome];

  nomeGravidade = nome;

  sliderGravidade.value(gravidade);
}

// ==============================
// Reset
// ==============================
function resetar() {
  velocidade = 50.0;
  angulo = 45.0;
  alturaInicial = 10.0;
  gravidade = 9.81;

  nomeGravidade = "Terra";

  sliderVelocidade.value(velocidade);
  sliderAngulo.value(angulo);
  sliderAltura.value(alturaInicial);
  sliderGravidade.value(gravidade);

  tempoAnimacao = 0;
  animando = false;

  sliderAtivo = null;

  jaLancouAlgumaVez = false;
}

// ==============================
// Limpar histórico
// ==============================
function limparHistorico() {
  historicoLancamentos = [];

  jaLancouAlgumaVez = false;
}

// ==============================
// Lançar
// ==============================
function lancar() {
  const validacao = validarParametros(
    velocidade,
    angulo,
    alturaInicial,
    gravidade
  );

  if (!validacao.ok) {
    return;
  }

  // Guarda lançamento anterior
  if (jaLancouAlgumaVez) {
    historicoLancamentos.push({
      v0: velLancamento,
      theta: anguloLancamento,
      y0: alturaLancamento,
      g: gravLancamento
    });

    // Máximo de 8 curvas
    if (historicoLancamentos.length > 8) {
      historicoLancamentos.shift();
    }
  }

  // Congela parâmetros
  velLancamento = velocidade;
  anguloLancamento = angulo;
  alturaLancamento = alturaInicial;
  gravLancamento = gravidade;

  tempoAnimacao = 0;
  animando = true;

  jaLancouAlgumaVez = true;
}

// ==============================
// Atualizar animação
// ==============================
function atualizarAnimacao() {
  if (!animando) {
    return;
  }

  // Aproximadamente 60 FPS
  tempoAnimacao += deltaTime / 1000;

  const tempoVoo = calcularTempoVoo(
    velLancamento,
    anguloLancamento,
    alturaLancamento,
    gravLancamento
  );

  if (tempoAnimacao >= tempoVoo) {
    tempoAnimacao = tempoVoo;
    animando = false;
  }
}

// ==============================
// Gráfico
// ==============================
function desenharGrafico() {
  // Fundo
  push();

  fill(...BRANCO);
  noStroke();

  rect(
    GRAFICO_X,
    GRAFICO_Y,
    GRAFICO_LARGURA,
    GRAFICO_ALTURA,
    10
  );

  pop();

  const validacao = validarParametros(
    velocidade,
    angulo,
    alturaInicial,
    gravidade
  );

  if (!validacao.ok) {
    desenharTexto(
      "Parâmetros inválidos — ajuste os controles.",
      GRAFICO_X + 40,
      GRAFICO_Y + GRAFICO_ALTURA / 2,
      VERMELHO,
      19,
      true
    );

    return;
  }

  const resultado = calcularResultados(
    velocidade,
    angulo,
    alturaInicial,
    gravidade
  );

  const alcance = resultado.alcance;
  const alturaMax = resultado.alturaMax;

  const escala = calcularEscala(
    velocidade,
    angulo,
    alturaInicial,
    gravidade
  );

  const origemX = GRAFICO_X + 50;
  const origemY =
    GRAFICO_Y +
    GRAFICO_ALTURA -
    40;

  // Eixo X
  push();

  stroke(...PRETO);
  strokeWeight(2);

  line(
    origemX,
    origemY,
    GRAFICO_X + GRAFICO_LARGURA - 20,
    origemY
  );

  // Eixo Y
  line(
    origemX,
    origemY,
    origemX,
    GRAFICO_Y + 20
  );

  pop();

  // Histórico
  for (const params of historicoLancamentos) {
    const pontos = calcularTrajetoria(
      params.v0,
      params.theta,
      params.y0,
      params.g
    );

    push();

    noFill();
    stroke(...CINZA_HIST);
    strokeWeight(2);

    beginShape();

    for (const ponto of pontos) {
      const tela = mundoParaTela(
        ponto.x,
        ponto.y,
        escala
      );

      vertex(tela.x, tela.y);
    }

    endShape();

    pop();
  }

  // Trajetória atual
  const pontos = calcularTrajetoria(
    velocidade,
    angulo,
    alturaInicial,
    gravidade
  );

  push();

  noFill();
  stroke(...AZUL);
  strokeWeight(2);

  beginShape();

  for (const ponto of pontos) {
    const tela = mundoParaTela(
      ponto.x,
      ponto.y,
      escala
    );

    vertex(tela.x, tela.y);
  }

  endShape();

  pop();

  // Chão
  push();

  stroke(...VERDE);
  strokeWeight(5);

  line(
    origemX,
    origemY,
    GRAFICO_X + GRAFICO_LARGURA - 20,
    origemY
  );

  pop();

  // Marcas dos eixos
  desenharMarcasEixos(
    escala,
    alcance,
    alturaMax
  );

  // Ponto de altura máxima
  if (alturaMax > 0) {
    const thetaRad = radians(angulo);

    const tSubida =
      velocidade *
      sin(thetaRad) /
      gravidade;

    const xMax =
      velocidade *
      cos(thetaRad) *
      tSubida;

    const pontoMax = mundoParaTela(
      xMax,
      alturaMax,
      escala
    );

    push();

    noFill();
    stroke(...VERDE);
    strokeWeight(2);

    circle(
      pontoMax.x,
      pontoMax.y,
      12
    );

    pop();

    desenharTexto(
      `ymax = ${alturaMax.toFixed(1)} m`,
      pontoMax.x + 10,
      pontoMax.y - 20,
      VERDE,
      14
    );
  }

  // Ponto de impacto
  const pontoImpacto = mundoParaTela(
    alcance,
    0,
    escala
  );

  push();

  stroke(...VERMELHO);
  strokeWeight(3);

  line(
    pontoImpacto.x - 6,
    pontoImpacto.y - 6,
    pontoImpacto.x + 6,
    pontoImpacto.y + 6
  );

  line(
    pontoImpacto.x - 6,
    pontoImpacto.y + 6,
    pontoImpacto.x + 6,
    pontoImpacto.y - 6
  );

  pop();

  desenharTexto(
    `R = ${alcance.toFixed(1)} m`,
    pontoImpacto.x - 30,
    pontoImpacto.y + 25,
    VERMELHO,
    14
  );

  // Legendas
  desenharTexto(
    "x (m)",
    GRAFICO_X + GRAFICO_LARGURA - 70,
    origemY + 30,
    PRETO,
    14
  );

  desenharTexto(
    "y (m)",
    origemX - 35,
    GRAFICO_Y + 20,
    PRETO,
    14
  );

  desenharTexto(
    "Trajetória atual",
    GRAFICO_X + 20,
    GRAFICO_Y + 35,
    AZUL_ESCURO,
    19,
    true
  );

  // Informação do histórico
  if (historicoLancamentos.length > 0) {
    desenharTexto(
      `Histórico: ${historicoLancamentos.length} curva(s) em cinza`,
      GRAFICO_X + 20,
      GRAFICO_Y + 60,
      CINZA,
      14
    );
  }
}

// ==============================
// Marcas dos eixos
// ==============================
function desenharMarcasEixos(
  escala,
  alcance,
  alturaMax
) {
  const origemX = GRAFICO_X + 50;

  const origemY =
    GRAFICO_Y +
    GRAFICO_ALTURA -
    40;

  // Eixo X
  for (let i = 0; i < 5; i++) {
    const valor =
      alcance * i / 4;

    const ponto = mundoParaTela(
      valor,
      0,
      escala
    );

    push();

    stroke(...PRETO);
    strokeWeight(2);

    line(
      ponto.x,
      origemY,
      ponto.x,
      origemY + 5
    );

    pop();

    desenharTexto(
      valor.toFixed(0),
      ponto.x - 12,
      origemY + 22,
      PRETO,
      12
    );
  }

  // Eixo Y
  for (let i = 0; i < 5; i++) {
    const valor =
      alturaMax * i / 4;

    const ponto = mundoParaTela(
      0,
      valor,
      escala
    );

    push();

    stroke(...PRETO);
    strokeWeight(2);

    line(
      origemX - 5,
      ponto.y,
      origemX,
      ponto.y
    );

    pop();

    desenharTexto(
      valor.toFixed(0),
      origemX - 42,
      ponto.y + 4,
      PRETO,
      12
    );
  }
}

// ==============================
// Animação do projétil
// ==============================
function desenharAnimacao() {
  if (!animando && tempoAnimacao <= 0) {
    return;
  }

  const theta = radians(
    anguloLancamento
  );

  const x =
    velLancamento *
    cos(theta) *
    tempoAnimacao;

  let y =
    alturaLancamento +
    velLancamento *
    sin(theta) *
    tempoAnimacao -
    0.5 *
    gravLancamento *
    tempoAnimacao *
    tempoAnimacao;

  if (y < 0) {
    y = 0;
  }

  const escala = calcularEscala(
    velLancamento,
    anguloLancamento,
    alturaLancamento,
    gravLancamento
  );

  const posicao = mundoParaTela(
    x,
    y,
    escala
  );

  const inicio = mundoParaTela(
    0,
    alturaLancamento,
    escala
  );

  // Ponto inicial
  push();

  noStroke();
  fill(...VERDE);

  circle(
    inicio.x,
    inicio.y,
    12
  );

  pop();

  // Rastro
  const pontosRastro = [];

  const quantidade = 60;

  for (let i = 0; i <= quantidade; i++) {
    const t =
      tempoAnimacao *
      i /
      quantidade;

    const xr =
      velLancamento *
      cos(theta) *
      t;

    let yr =
      alturaLancamento +
      velLancamento *
      sin(theta) *
      t -
      0.5 *
      gravLancamento *
      t *
      t;

    if (yr < 0) {
      yr = 0;
    }

    pontosRastro.push(
      mundoParaTela(
        xr,
        yr,
        escala
      )
    );
  }

  push();

  noFill();
  stroke(...LARANJA);
  strokeWeight(3);

  beginShape();

  for (const ponto of pontosRastro) {
    vertex(
      ponto.x,
      ponto.y
    );
  }

  endShape();

  pop();

  // Projétil
  push();

  fill(...VERMELHO);
  stroke(...PRETO);
  strokeWeight(2);

  circle(
    posicao.x,
    posicao.y,
    18
  );

  pop();

  // Tempo
  desenharTexto(
    `t = ${tempoAnimacao.toFixed(2)} s`,
    GRAFICO_X + GRAFICO_LARGURA - 110,
    GRAFICO_Y + 35,
    LARANJA,
    14
  );
}

// ==============================
// Resultados
// ==============================
function desenharResultados() {
  const validacao = validarParametros(
    velocidade,
    angulo,
    alturaInicial,
    gravidade
  );

  push();

  fill(...BRANCO);
  noStroke();

  rect(
    20,
    655,
    1160,
    70,
    10
  );

  pop();

  if (validacao.ok) {
    const resultado = calcularResultados(
      velocidade,
      angulo,
      alturaInicial,
      gravidade
    );

    desenharTexto(
      `Alcance: ${resultado.alcance.toFixed(2)} m`,
      40,
      695,
      AZUL_ESCURO,
      19,
      true
    );

    desenharTexto(
      `Altura máxima: ${resultado.alturaMax.toFixed(2)} m`,
      380,
      695,
      VERDE,
      19,
      true
    );

    desenharTexto(
      `Tempo de voo: ${resultado.tempoVoo.toFixed(2)} s`,
      780,
      695,
      LARANJA,
      19,
      true
    );
  }
  else {
    desenharTexto(
      `⚠ ${validacao.mensagem}`,
      40,
      695,
      VERMELHO,
      19,
      true
    );
  }
}
