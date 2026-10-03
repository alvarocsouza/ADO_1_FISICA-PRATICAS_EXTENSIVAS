// =============================================================
//  ADO_2 — Simulador de Sistemas Mecânicos (p5.js)
// =============================================================
//  Sistemas implementados:
//    (1) Plano inclinado com atrito e tração
//        - Desenho animado do sistema + gráfico x(t)/v(t)
//        - Vetores de força sobre o bloco
//    (2) Força centrípeta (MCU + carro em curva)
//
//  Controles:
//    - RadioButtons à esquerda: escolhe o sistema
//    - No sistema 3.2, um segundo menu escolhe entre MCU / carro
//    - Sliders: ajustam os parâmetros físicos
//    - Teclado: clique em um slider e use ← → ↑ ↓ (Shift = 10×)
// =============================================================

// Constante física
const G = 9.81;

// ---------------- Dimensões da janela ----------------
const LARGURA = 1200;
const ALTURA = 750;

// ---------------- Paleta de cores ----------------
const COR_FUNDO        = [245, 247, 250];
const COR_PAINEL       = [230, 234, 240];
const COR_BRANCO       = [255, 255, 255];
const COR_PRETO        = [30, 30, 30];
const COR_CINZA        = [130, 135, 145];
const COR_CINZA_CLARO  = [200, 205, 215];
const COR_AZUL         = [42, 111, 219];
const COR_LARANJA      = [210, 105, 30];
const COR_VERDE        = [30, 130, 76];
const COR_VERMELHO     = [192, 57, 43];
const COR_ROXO         = [142, 68, 173];

// ---------------- Estado global ----------------
let sistemaAtual = "plano";
let submodo32 = "mcu";
let sliderSelecionado = null;

// Parâmetros do sistema 3.1
let m1 = 5.0;
let m2 = 3.0;
let theta = 30.0;
let mu_s = 0.30;
let mu_k = 0.25;

// Parâmetros do sistema 3.2
let R_circ = 5.0;
let v_circ = 4.0;
let m_circ = 2.0;
let mu_carro = 0.60;

// Fase da animação do MCU
let faseAnim = 0.0;

// Tempo da simulação do plano inclinado
let tempoSim = 0.0;
let posicaoBloco = 0.0;   // deslocamento x(t) do bloco, em metros
let blocoParou = false;   // true quando o bloco atinge o fim da rampa

// Controles
let sliders = {};
let sliderAtivo = null;

// Comprimento total da rampa em metros (para limitar o movimento)
const COMPRIMENTO_RAMPA = 15.0;

// =============================================================
// FÍSICA — Sistema 3.1
// =============================================================
function calcularAceleracaoPlano(m1, m2, theta_deg, mu_s, mu_k) {
  const th = radians(theta_deg);
  const N = m1 * G * cos(th);
  const Fmot = m2 * G - m1 * G * sin(th);

  if (abs(Fmot) <= mu_s * N) {
    return { a: 0, regime: "EQUILÍBRIO ESTÁTICO", Fmot: Fmot, N: N };
  }
  const sinal = Math.sign(Fmot);
  const a = (Fmot - mu_k * N * sinal) / (m1 + m2);
  return { a: a, regime: "MOVIMENTO", Fmot: Fmot, N: N };
}

function calcularTracaoPlano(m2, a) {
  return m2 * (G - a);
}

// =============================================================
// FÍSICA — Sistema 3.2
// =============================================================
function calcularMCU(R, v, m) {
  const omega = R > 0 ? v / R : 0;
  const Tc = omega > 0 ? (2 * PI) / omega : 0;
  const Fc = R > 0 ? (m * v * v) / R : 0;
  return { omega: omega, periodo: Tc, Fc: Fc };
}

function calcularCarroCurva(R, m, mu) {
  const vmax = R > 0 ? sqrt(mu * G * R) : 0;
  const Fcmax = R > 0 ? (m * vmax * vmax) / R : 0;
  return { vmax: vmax, Fcmax: Fcmax };
}

// =============================================================
// SETUP
// =============================================================
function setup() {
  createCanvas(LARGURA, ALTURA);
  criarSlidersPlano();
}

// =============================================================
// SLIDERS
// =============================================================
function criarSlidersPlano() {
  sliders = {};
  sliders["m1"] = {
    x: 80, y: 250, largura: 240,
    valor: m1, min: 0.5, max: 20.0,
    nome: "m1", unidade: "kg",
  };
  sliders["m2"] = {
    x: 80, y: 320, largura: 240,
    valor: m2, min: 0.5, max: 20.0,
    nome: "m2", unidade: "kg",
  };
  sliders["theta"] = {
    x: 80, y: 390, largura: 240,
    valor: theta, min: 5.0, max: 80.0,
    nome: "θ", unidade: "°",
  };
  sliders["mu_s"] = {
    x: 80, y: 460, largura: 240,
    valor: mu_s, min: 0.0, max: 1.0,
    nome: "μs", unidade: "(estático)",
  };
  sliders["mu_k"] = {
    x: 80, y: 530, largura: 240,
    valor: mu_k, min: 0.0, max: 1.0,
    nome: "μk", unidade: "(cinético)",
  };
}

function criarSlidersMCU() {
  sliders = {};
  sliders["R_circ"] = {
    x: 80, y: 320, largura: 240,
    valor: R_circ, min: 0.5, max: 20.0,
    nome: "Raio R", unidade: "m",
  };
  sliders["v_circ"] = {
    x: 80, y: 390, largura: 240,
    valor: v_circ, min: 0.1, max: 20.0,
    nome: "Velocidade v", unidade: "m/s",
  };
  sliders["m_circ"] = {
    x: 80, y: 460, largura: 240,
    valor: m_circ, min: 0.1, max: 20.0,
    nome: "Massa m", unidade: "kg",
  };
}

function criarSlidersCarro() {
  sliders = {};
  sliders["R_circ"] = {
    x: 80, y: 320, largura: 240,
    valor: R_circ, min: 0.5, max: 50.0,
    nome: "Raio R", unidade: "m",
  };
  sliders["m_circ"] = {
    x: 80, y: 390, largura: 240,
    valor: m_circ, min: 0.1, max: 20.0,
    nome: "Massa m", unidade: "kg",
  };
  sliders["mu_carro"] = {
    x: 80, y: 460, largura: 240,
    valor: mu_carro, min: 0.05, max: 1.5,
    nome: "Atrito µ", unidade: "",
  };
}

// =============================================================
// DRAW
// =============================================================
function draw() {
  background(COR_FUNDO[0], COR_FUNDO[1], COR_FUNDO[2]);

  // Animação do MCU
  if (sistemaAtual === "centripeta") {
    let omega_atual;
    if (submodo32 === "mcu") {
      omega_atual = R_circ > 0 ? v_circ / R_circ : 0;
    } else {
      const vmax = R_circ > 0 ? sqrt(mu_carro * G * R_circ) : 0;
      omega_atual = R_circ > 0 ? vmax / R_circ : 0;
    }
    faseAnim += omega_atual * (deltaTime / 1000.0);
  }

  // Avanço do tempo no sistema do plano inclinado
  if (sistemaAtual === "plano") {
    const res = calcularAceleracaoPlano(m1, m2, theta, mu_s, mu_k);
    if (res.regime === "MOVIMENTO" && !blocoParou) {
      const dt = deltaTime / 1000.0;
      tempoSim += dt;
      // x(t) = ½·a·t² (partindo do repouso)
      posicaoBloco = 0.5 * res.a * tempoSim * tempoSim;
      if (abs(posicaoBloco) >= COMPRIMENTO_RAMPA) {
        posicaoBloco = Math.sign(posicaoBloco) * COMPRIMENTO_RAMPA;
        blocoParou = true;
      }
    }
  }

  desenharTitulo();
  desenharRadioButtons();
  desenharSubRadioButtons();
  desenharSliders();

  if (sistemaAtual === "plano") {
    desenharSistemaPlano();
  } else {
    if (submodo32 === "mcu") desenharMCU();
    else desenharCarroCurva();
  }
}

// =============================================================
// DESENHO — Cabeçalho
// =============================================================
function desenharTitulo() {
  fill(COR_PRETO[0], COR_PRETO[1], COR_PRETO[2]);
  textAlign(LEFT, TOP);
  textSize(22);
  textStyle(BOLD);
  text("SIMULADOR DE SISTEMAS MECÂNICOS", 30, 25);
  textStyle(NORMAL);
  textSize(13);
  fill(COR_CINZA[0], COR_CINZA[1], COR_CINZA[2]);
  text("ADO_2 — Mecânica e Física Moderna", 30, 55);
}

function desenharRadioButtons() {
  noStroke();
  fill(COR_PAINEL[0], COR_PAINEL[1], COR_PAINEL[2]);
  rect(30, 90, 300, 120, 10);

  fill(COR_PRETO[0], COR_PRETO[1], COR_PRETO[2]);
  textSize(14);
  textStyle(BOLD);
  text("Sistema:", 50, 105);
  textStyle(NORMAL);

  desenharOpcaoRadio(50, 140, "Plano inclinado", sistemaAtual === "plano");
  desenharOpcaoRadio(50, 175, "Força centrípeta", sistemaAtual === "centripeta");
}

function desenharSubRadioButtons() {
  if (sistemaAtual !== "centripeta") return;
  noStroke();
  fill(COR_PAINEL[0], COR_PAINEL[1], COR_PAINEL[2]);
  rect(30, 225, 300, 70, 10);

  fill(COR_PRETO[0], COR_PRETO[1], COR_PRETO[2]);
  textSize(12);
  textStyle(BOLD);
  text("Modo (3.2):", 50, 235);
  textStyle(NORMAL);

  desenharOpcaoRadio(50, 260, "MCU simples", submodo32 === "mcu");
  desenharOpcaoRadio(180, 260, "Carro em curva", submodo32 === "carro");
}

function desenharOpcaoRadio(x, y, rotulo, selecionado) {
  noFill();
  stroke(COR_PRETO[0], COR_PRETO[1], COR_PRETO[2]);
  strokeWeight(1.5);
  circle(x + 8, y + 8, 14);
  if (selecionado) {
    noStroke();
    fill(COR_AZUL[0], COR_AZUL[1], COR_AZUL[2]);
    circle(x + 8, y + 8, 8);
  }
  noStroke();
  fill(COR_PRETO[0], COR_PRETO[1], COR_PRETO[2]);
  textAlign(LEFT, CENTER);
  textSize(14);
  text(rotulo, x + 25, y + 8);
  textAlign(LEFT, TOP);
}

// =============================================================
// DESENHO — Sliders
// =============================================================
function desenharSliders() {
  for (let chave in sliders) {
    desenharSlider(sliders[chave]);
  }
}

function desenharSlider(s) {
  const chave = Object.keys(sliders).find(k => sliders[k] === s);
  const selecionado = (chave === sliderSelecionado);

  noStroke();
  fill(COR_PRETO[0], COR_PRETO[1], COR_PRETO[2]);
  textAlign(LEFT, TOP);
  textSize(14);
  text(s.nome + " = " + s.valor.toFixed(2) + " " + s.unidade, s.x, s.y - 22);

  if (selecionado) {
    noFill();
    stroke(COR_AZUL[0], COR_AZUL[1], COR_AZUL[2]);
    strokeWeight(1.5);
    rect(s.x - 15, s.y - 35, s.largura + 30, 50, 6);
  }

  stroke(COR_CINZA_CLARO[0], COR_CINZA_CLARO[1], COR_CINZA_CLARO[2]);
  strokeWeight(8);
  strokeCap(ROUND);
  line(s.x, s.y, s.x + s.largura, s.y);

  const prop = constrain((s.valor - s.min) / (s.max - s.min), 0, 1);
  const px = s.x + prop * s.largura;
  stroke(COR_AZUL[0], COR_AZUL[1], COR_AZUL[2]);
  line(s.x, s.y, px, s.y);

  noStroke();
  fill(COR_AZUL[0], COR_AZUL[1], COR_AZUL[2]);
  circle(px, s.y, 20);

  strokeCap(SQUARE);
}

// =============================================================
// DESENHO — Sistema 3.1
// =============================================================
function desenharSistemaPlano() {
  const res = calcularAceleracaoPlano(m1, m2, theta, mu_s, mu_k);
  const a = res.a;
  const regime = res.regime;
  const Fmot = res.Fmot;
  const N = res.N;
  const T = calcularTracaoPlano(m2, a);

  // ===============================
  // Área 1 — desenho animado (esquerda)
  // ===============================
  const dx = 380, dy = 90, dw = 380, dh = 480;

  noStroke();
  fill(COR_BRANCO[0], COR_BRANCO[1], COR_BRANCO[2]);
  rect(dx, dy, dw, dh, 10);

  // Título da área
  fill(COR_PRETO[0], COR_PRETO[1], COR_PRETO[2]);
  textAlign(LEFT, TOP);
  textSize(14);
  textStyle(BOLD);
  text("Sistema físico", dx + 15, dy + 15);
  textStyle(NORMAL);

  // ----- Pontos-chave do desenho -----
  // Base da rampa: canto inferior esquerdo
  const rampaBaseX = dx + 75;
  const rampaBaseY = dy + dh - 190;

  // Topo da rampa: desloca em x e y conforme θ
  // Em vez de usar o θ do usuário (que pode chegar a 80°), usamos um
  // ângulo visual fixo (max 45°) para o desenho caber.
  const thetaVisual = Math.min(theta, 45);
  const rampaComp = 260;  // comprimento fixo em pixels

  const rampaTopoX = rampaBaseX + rampaComp * cos(radians(thetaVisual));
  const rampaTopoY = rampaBaseY - rampaComp * sin(radians(thetaVisual));

  // ----- Desenha a rampa -----
  stroke(COR_PRETO[0], COR_PRETO[1], COR_PRETO[2]);
  strokeWeight(3);
  line(rampaBaseX, rampaBaseY, rampaTopoX, rampaTopoY);

  // Chão horizontal embaixo da rampa
  stroke(COR_CINZA[0], COR_CINZA[1], COR_CINZA[2]);
  strokeWeight(1);
  line(rampaBaseX - 20, rampaBaseY, rampaBaseX + 30, rampaBaseY);

  // Arco do ângulo θ
  noFill();
  stroke(COR_CINZA[0], COR_CINZA[1], COR_CINZA[2]);
  arc(rampaBaseX, rampaBaseY, 50, 50, -radians(thetaVisual), 0);
  noStroke();
  fill(COR_PRETO[0], COR_PRETO[1], COR_PRETO[2]);
  textSize(12);
  text("θ", rampaBaseX + 22, rampaBaseY - 15);

  // ----- Posição do bloco ao longo da rampa -----
  // posicaoBloco vai de 0 a COMPRIMENTO_RAMPA (metros).
  // Mapeia para fração de [0, 1] e depois para pixels ao longo da rampa.
  const fracao = constrain(posicaoBloco / COMPRIMENTO_RAMPA, 0, 1);

  // O bloco sobe OU desce dependendo do sinal de a
  const direcao = Math.sign(a) || 0;

  // Fio inextensível: o bloco m1 move para um lado e m2 move para o outro
  // Se a > 0 (m2 desce), o bloco m1 SOBE a rampa em direção à polia
  // Se a < 0 (m1 desce), o bloco m1 DESCE em direção à base
  let posFrac;
  if (direcao > 0) {
    posFrac = fracao;                 // m1 sobe
  } else if (direcao < 0) {
    posFrac = -fracao;                // m1 desce
  } else {
    posFrac = 0;                      // equilíbrio
  }

  // Ponto do bloco na rampa (em coordenadas de pixel)
  const blocoX = rampaBaseX + (rampaTopoX - rampaBaseX) * constrain(0.5 + posFrac * 0.5, 0.05, 0.95);
  const blocoY = rampaBaseY + (rampaTopoY - rampaBaseY) * constrain(0.5 + posFrac * 0.5, 0.05, 0.95);

  // ----- Polia no topo -----
  const poliaX = rampaTopoX;
  const poliaY = rampaTopoY;
  fill(COR_CINZA[0], COR_CINZA[1], COR_CINZA[2]);
  stroke(COR_PRETO[0], COR_PRETO[1], COR_PRETO[2]);
  strokeWeight(1.5);
  circle(poliaX, poliaY, 20);

  // ----- Massa m2 suspensa -----
  // O fio vai da polia para baixo (vertical).
  // Deslocamento de m2 é IGUAL em módulo ao de m1 (fio inextensível).
  const m2BaseY = poliaY + 150;   // posição "de referência" em equilíbrio
  let m2Y;
  if (direcao > 0) {
    // m1 sobe → m2 desce
    m2Y = m2BaseY + fracao * 100;
  } else if (direcao < 0) {
    // m1 desce → m2 sobe
    m2Y = m2BaseY - fracao * 100;
  } else {
    m2Y = m2BaseY;
  }
  m2Y = constrain(m2Y, poliaY + 40, poliaY + 250);

  // ----- Desenha o fio -----
  stroke(COR_PRETO[0], COR_PRETO[1], COR_PRETO[2]);
  strokeWeight(1.5);
  // Trecho 1: do bloco até a polia
  line(blocoX, blocoY, poliaX, poliaY);
  // Trecho 2: da polia para baixo até m2
  line(poliaX, poliaY, poliaX, m2Y);

  // ----- Bloco m1 -----
  noStroke();
  fill(COR_AZUL[0], COR_AZUL[1], COR_AZUL[2]);
  const tamBloco = 26 + m1 * 1.5;   // tamanho proporcional à massa (visual)
  rectMode(CENTER);
  push();
  translate(blocoX, blocoY);
  rotate(radians(thetaVisual));
  rect(0, 0, tamBloco, tamBloco * 0.7, 3);
  pop();
  rectMode(CORNER);

  // Rótulo m1
  fill(COR_BRANCO[0], COR_BRANCO[1], COR_BRANCO[2]);
  textAlign(CENTER, CENTER);
  textSize(11);
  textStyle(BOLD);
  text("m1", blocoX, blocoY);
  textStyle(NORMAL);
  textAlign(LEFT, TOP);

  // ----- Massa m2 -----
  noStroke();
  fill(COR_VERDE[0], COR_VERDE[1], COR_VERDE[2]);
  const tamM2 = 20 + m2 * 1.5;
  rectMode(CENTER);
  rect(poliaX, m2Y, tamM2, tamM2, 3);
  rectMode(CORNER);

  fill(COR_BRANCO[0], COR_BRANCO[1], COR_BRANCO[2]);
  textAlign(CENTER, CENTER);
  textSize(11);
  textStyle(BOLD);
  text("m2", poliaX, m2Y);
  textStyle(NORMAL);
  textAlign(LEFT, TOP);

  // ----- Vetores de força sobre m1 -----
  const fatorSeta = 0.6;   // pixels por Newton (ajustável)

  // Peso (m1·g) — sempre para baixo
  const pesoMag = m1 * G;
  const pesoPx = pesoMag * fatorSeta;
  desenharSeta(
    blocoX, blocoY,
    blocoX, blocoY + pesoPx,
    COR_VERMELHO
  );

  // Normal — perpendicular à rampa, apontando para fora
  const normalMag = N;
  const normalPx = normalMag * fatorSeta;
  const normalAng = radians(thetaVisual) - PI / 2;
  desenharSeta(
    blocoX, blocoY,
    blocoX + normalPx * cos(normalAng),
    blocoY + normalPx * sin(normalAng),
    COR_AZUL
  );

  // Tração — ao longo do fio, apontando para a polia
  const tracaoPx = T * fatorSeta;
  const angFio = atan2(poliaY - blocoY, poliaX - blocoX);
  desenharSeta(
    blocoX, blocoY,
    blocoX + tracaoPx * cos(angFio),
    blocoY + tracaoPx * sin(angFio),
    COR_VERDE
  );

  // Atrito — oposto ao movimento (ou tentativa de movimento)
  if (abs(a) > 1e-6 || abs(Fmot) > mu_s * N) {
    const atritoMag = (abs(a) > 1e-6) ? mu_k * N : mu_s * N;
    const atritoPx = atritoMag * fatorSeta;
    // Direção: oposta ao movimento (mesma direção do fio, mas sentido oposto)
    const sentido = (a > 0) ? -1 : 1;
    desenharSeta(
      blocoX, blocoY,
      blocoX + sentido * atritoPx * cos(angFio),
      blocoY + sentido * atritoPx * sin(angFio),
      COR_LARANJA
    );
  }

  // ----- Legenda dos vetores -----
  const legX = dx + 15;
  const legY = dy + dh - 110;
  desenharTextoLegenda(legX - 10, legY + 20, COR_VERMELHO, "Peso (m1·g)");
  desenharTextoLegenda(legX - 10, legY + 40, COR_AZUL, "Normal (N)");
  desenharTextoLegenda(legX - 10, legY + 60, COR_VERDE, "Tração (T)");
  desenharTextoLegenda(legX - 10, legY + 80, COR_LARANJA, "Atrito (f)");

  // ----- Cronômetro -----
  fill(COR_PRETO[0], COR_PRETO[1], COR_PRETO[2]);
  textAlign(RIGHT, TOP);
  textSize(13);
  text("t = " + tempoSim.toFixed(2) + " s", dx + dw - 15, dy + 15);
  text("x = " + posicaoBloco.toFixed(2) + " m", dx + dw - 15, dy + 35);
  textAlign(LEFT, TOP);

  // ===============================
  // Área 2 — gráfico x(t)/v(t) (direita)
  // ===============================
  const gx = 780, gy = 90, gw = 380, gh = 480;

  noStroke();
  fill(COR_BRANCO[0], COR_BRANCO[1], COR_BRANCO[2]);
  rect(gx, gy, gw, gh, 10);

  fill(COR_PRETO[0], COR_PRETO[1], COR_PRETO[2]);
  textAlign(LEFT, TOP);
  textSize(14);
  textStyle(BOLD);
  text("Gráfico x(t) e v(t)", gx + 15, gy + 15);
  textStyle(NORMAL);

  // Eixos
  const origemX = gx + 70;
  const origemY = gy + gh / 2 + 60;

  stroke(COR_PRETO[0], COR_PRETO[1], COR_PRETO[2]);
  strokeWeight(1.5);
  line(origemX, origemY, gx + gw - 20, origemY);
  line(origemX, origemY, origemX, gy + 55);

  noStroke();
  fill(COR_PRETO[0], COR_PRETO[1], COR_PRETO[2]);
  textSize(11);
  text("t (s)", gx + gw - 45, origemY + 6);
  text("x (m), v (m/s)", origemX + 6, gy + 55);

  // Cálculo da curva — até onde o tempo já chegou (se em movimento) ou 5s fixos
  const tMax = (regime === "MOVIMENTO" && !blocoParou)
    ? Math.max(tempoSim + 1, 3)
    : 5.0;

  const nPts = 200;
  const tArr = [];
  for (let i = 0; i <= nPts; i++) tArr.push(tMax * i / nPts);

  const xArr = tArr.map(t => 0.5 * a * t * t);
  const vArr = tArr.map(t => a * t);

  let maxAbs = 2;
  for (let i = 0; i < tArr.length; i++) {
    maxAbs = Math.max(maxAbs, abs(xArr[i]), abs(vArr[i]));
  }
  // Limitar para o gráfico não "comprimir" muito com o tempo
  maxAbs = Math.min(maxAbs, COMPRIMENTO_RAMPA * 2);

  const escalaY = (gh - 130) / (2 * maxAbs);
  const escalaX = (gw - 90) / tMax;

  // Linha zero
  stroke(COR_CINZA_CLARO[0], COR_CINZA_CLARO[1], COR_CINZA_CLARO[2]);
  strokeWeight(0.8);
  line(origemX, origemY, gx + gw - 20, origemY);

  // Curva x(t)
  noFill();
  stroke(COR_AZUL[0], COR_AZUL[1], COR_AZUL[2]);
  strokeWeight(2);
  beginShape();
  for (let i = 0; i < tArr.length; i++) {
    const py = origemY - xArr[i] * escalaY;
    if (py > gy + 55 && py < gy + gh - 20) {
      vertex(origemX + tArr[i] * escalaX, py);
    }
  }
  endShape();

  // Curva v(t)
  stroke(COR_LARANJA[0], COR_LARANJA[1], COR_LARANJA[2]);
  strokeWeight(2);
  beginShape();
  for (let i = 0; i < tArr.length; i++) {
    const py = origemY - vArr[i] * escalaY;
    if (py > gy + 55 && py < gy + gh - 20) {
      vertex(origemX + tArr[i] * escalaX, py);
    }
  }
  endShape();

  // Marcador do instante atual
  if (regime === "MOVIMENTO" && tempoSim <= tMax) {
    const pxAtual = origemX + tempoSim * escalaX;
    stroke(COR_PRETO[0], COR_PRETO[1], COR_PRETO[2]);
    strokeWeight(1);
    drawingContext.setLineDash([3, 3]);
    line(pxAtual, gy + 55, pxAtual, origemY);
    drawingContext.setLineDash([]);
  }

  // Legenda
  const lx = gx + 20;
  const ly = gy + 55;
  noStroke();
  fill(COR_AZUL[0], COR_AZUL[1], COR_AZUL[2]);
  rect(lx, ly, 15, 3);
  fill(COR_PRETO[0], COR_PRETO[1], COR_PRETO[2]);
  textSize(11);
  textAlign(LEFT, CENTER);
  text("x(t)", lx + 22, ly + 1);
  fill(COR_LARANJA[0], COR_LARANJA[1], COR_LARANJA[2]);
  rect(lx, ly + 18, 15, 3);
  fill(COR_PRETO[0], COR_PRETO[1], COR_PRETO[2]);
  text("v(t)", lx + 22, ly + 19);
  textAlign(LEFT, TOP);

  // ===============================
  // Painel numérico inferior (largura total das duas áreas)
  // ===============================
  const px = 380, py = 590, pw = 780, ph = 130;
  fill(COR_BRANCO[0], COR_BRANCO[1], COR_BRANCO[2]);
  rect(px, py, pw, ph, 10);

  const corRegime = regime === "EQUILÍBRIO ESTÁTICO" ? COR_VERMELHO : COR_VERDE;
  noStroke();
  fill(corRegime[0], corRegime[1], corRegime[2]);
  textSize(16);
  textStyle(BOLD);
  textAlign(LEFT, TOP);
  text("Regime: " + regime, px + 25, py + 15);
  textStyle(NORMAL);

  fill(COR_PRETO[0], COR_PRETO[1], COR_PRETO[2]);
  textSize(14);
  text("Aceleração a = " + a.toFixed(3) + " m/s²", px + 25, py + 50);
  text("Tração no fio T = " + T.toFixed(3) + " N", px + 25, py + 75);
  text("Força motriz = " + Fmot.toFixed(3) + " N", px + 25, py + 100);

  text("Normal N = " + N.toFixed(3) + " N", px + 400, py + 50);
  text("Tempo t = " + tempoSim.toFixed(2) + " s", px + 400, py + 75);
  text("Deslocamento x = " + posicaoBloco.toFixed(2) + " m", px + 400, py + 100);
}

// Helper de legenda
function desenharTextoLegenda(x, y, cor, texto) {
  noStroke();
  fill(cor[0], cor[1], cor[2]);
  rect(x, y + 6, 14, 3);
  fill(COR_PRETO[0], COR_PRETO[1], COR_PRETO[2]);
  textAlign(LEFT, CENTER);
  textSize(11);
  text(texto, x + 20, y + 7);
  textAlign(LEFT, TOP);
}

// =============================================================
// DESENHO — Sistema 3.2 — MCU
// =============================================================
function desenharMCU() {
  const fisica = calcularMCU(R_circ, v_circ, m_circ);

  const gx = 380, gy = 90, gw = 780, gh = 480;

  noStroke();
  fill(COR_BRANCO[0], COR_BRANCO[1], COR_BRANCO[2]);
  rect(gx, gy, gw, gh, 10);

  const cx = gx + gw / 2;
  const cy = gy + gh / 2;
  const margem = 60;
  const escala = (min(gw, gh) / 2 - margem) / max(R_circ, 1);
  const Rp = R_circ * escala;

  noFill();
  stroke(COR_CINZA_CLARO[0], COR_CINZA_CLARO[1], COR_CINZA_CLARO[2]);
  strokeWeight(2);
  circle(cx, cy, 2 * Rp);

  const px = cx + Rp * cos(faseAnim);
  const py = cy + Rp * sin(faseAnim);
  stroke(COR_CINZA[0], COR_CINZA[1], COR_CINZA[2]);
  strokeWeight(1);
  drawingContext.setLineDash([5, 5]);
  line(cx, cy, px, py);
  drawingContext.setLineDash([]);

  noStroke();
  fill(COR_PRETO[0], COR_PRETO[1], COR_PRETO[2]);
  circle(cx, cy, 8);

  desenharSeta(px, py, cx, cy, COR_VERDE);

  noStroke();
  fill(COR_VERMELHO[0], COR_VERMELHO[1], COR_VERMELHO[2]);
  circle(px, py, 22);
  fill(COR_PRETO[0], COR_PRETO[1], COR_PRETO[2]);
  circle(px, py, 22);
  noStroke();
  fill(COR_VERMELHO[0], COR_VERMELHO[1], COR_VERMELHO[2]);
  circle(px, py, 18);

  fill(COR_PRETO[0], COR_PRETO[1], COR_PRETO[2]);
  textAlign(LEFT, TOP);
  textSize(12);
  text("x (m)", gx + gw - 55, cy + 10);
  text("y (m)", cx + 10, gy + 15);

  const pxPanel = 380, pyPanel = 590, pwPanel = 780, phPanel = 130;
  fill(COR_BRANCO[0], COR_BRANCO[1], COR_BRANCO[2]);
  rect(pxPanel, pyPanel, pwPanel, phPanel, 10);

  noStroke();
  fill(COR_VERDE[0], COR_VERDE[1], COR_VERDE[2]);
  textSize(16);
  textStyle(BOLD);
  textAlign(LEFT, TOP);
  text("Movimento Circular Uniforme (MCU)", pxPanel + 25, pyPanel + 20);
  textStyle(NORMAL);

  fill(COR_PRETO[0], COR_PRETO[1], COR_PRETO[2]);
  textSize(14);
  text("Raio R = " + R_circ.toFixed(2) + " m", pxPanel + 25, pyPanel + 55);
  text("Velocidade v = " + v_circ.toFixed(2) + " m/s", pxPanel + 25, pyPanel + 80);
  text("Massa m = " + m_circ.toFixed(2) + " kg", pxPanel + 25, pyPanel + 105);

  text("Vel. angular ω = " + fisica.omega.toFixed(3) + " rad/s", pxPanel + 420, pyPanel + 55);
  text("Força centrípeta F_c = " + fisica.Fc.toFixed(3) + " N", pxPanel + 420, pyPanel + 80);
  text("Período T = " + fisica.periodo.toFixed(3) + " s", pxPanel + 420, pyPanel + 105);
}

// =============================================================
// DESENHO — Sistema 3.2 — Carro em curva
// =============================================================
function desenharCarroCurva() {
  const fisica = calcularCarroCurva(R_circ, m_circ, mu_carro);

  const gx = 380, gy = 90, gw = 780, gh = 480;

  noStroke();
  fill(COR_BRANCO[0], COR_BRANCO[1], COR_BRANCO[2]);
  rect(gx, gy, gw, gh, 10);

  const cx = gx + gw / 2;
  const cy = gy + gh / 2;
  const margem = 60;
  const escala = (min(gw, gh) / 2 - margem) / max(R_circ, 1);
  const Rp = R_circ * escala;

  noFill();
  stroke(COR_CINZA[0], COR_CINZA[1], COR_CINZA[2]);
  strokeWeight(14);
  circle(cx, cy, 2 * Rp);
  stroke(COR_BRANCO[0], COR_BRANCO[1], COR_BRANCO[2]);
  strokeWeight(2);
  circle(cx, cy, 2 * Rp);

  const px = cx + Rp * cos(faseAnim);
  const py = cy + Rp * sin(faseAnim);
  stroke(COR_CINZA[0], COR_CINZA[1], COR_CINZA[2]);
  strokeWeight(1);
  drawingContext.setLineDash([5, 5]);
  line(cx, cy, px, py);
  drawingContext.setLineDash([]);

  noStroke();
  fill(COR_PRETO[0], COR_PRETO[1], COR_PRETO[2]);
  circle(cx, cy, 8);

  desenharSeta(px, py, cx, cy, COR_VERDE);

  noStroke();
  fill(COR_VERMELHO[0], COR_VERMELHO[1], COR_VERMELHO[2]);
  rectMode(CENTER);
  rect(px, py, 22, 22, 4);
  rectMode(CORNER);

  fill(COR_PRETO[0], COR_PRETO[1], COR_PRETO[2]);
  textAlign(LEFT, TOP);
  textSize(12);
  text("x (m)", gx + gw - 55, cy + 10);
  text("y (m)", cx + 10, gy + 15);

  const pxPanel = 380, pyPanel = 590, pwPanel = 780, phPanel = 130;
  fill(COR_BRANCO[0], COR_BRANCO[1], COR_BRANCO[2]);
  rect(pxPanel, pyPanel, pwPanel, phPanel, 10);

  noStroke();
  fill(COR_VERDE[0], COR_VERDE[1], COR_VERDE[2]);
  textSize(16);
  textStyle(BOLD);
  textAlign(LEFT, TOP);
  text("Carro em curva plana (atrito estático)", pxPanel + 25, pyPanel + 20);
  textStyle(NORMAL);

  fill(COR_PRETO[0], COR_PRETO[1], COR_PRETO[2]);
  textSize(14);
  text("Raio R = " + R_circ.toFixed(2) + " m", pxPanel + 25, pyPanel + 55);
  text("Massa m = " + m_circ.toFixed(2) + " kg", pxPanel + 25, pyPanel + 80);
  text("Atrito µ = " + mu_carro.toFixed(2), pxPanel + 25, pyPanel + 105);

  text("v_max (sem derrapar) = " + fisica.vmax.toFixed(3) + " m/s", pxPanel + 420, pyPanel + 55);
  text("F_c máx = " + fisica.Fcmax.toFixed(3) + " N", pxPanel + 420, pyPanel + 80);
  text("v_max = √(µ · g · R)", pxPanel + 420, pyPanel + 105);
}

// =============================================================
// Helper: seta
// =============================================================
function desenharSeta(x1, y1, x2, y2, cor) {
  // Se o vetor for muito curto, ignora
  if (dist(x1, y1, x2, y2) < 3) return;

  push();
  stroke(cor[0], cor[1], cor[2]);
  strokeWeight(2);
  fill(cor[0], cor[1], cor[2]);
  line(x1, y1, x2, y2);

  const ang = atan2(y2 - y1, x2 - x1);
  const tamCabeca = 10;

  push();
  translate(x2, y2);
  rotate(ang);
  noStroke();
  triangle(0, 0, -tamCabeca, -tamCabeca * 0.5, -tamCabeca, tamCabeca * 0.5);
  pop();

  pop();
}

// =============================================================
// EVENTOS DE MOUSE
// =============================================================
function mousePressed() {
  // RadioButtons do sistema
  if (mouseX >= 50 && mouseX <= 250 && mouseY >= 130 && mouseY <= 155) {
    sistemaAtual = "plano";
    criarSlidersPlano();
    sliderSelecionado = null;
    resetarAnimacaoPlano();
    return;
  }
  if (mouseX >= 50 && mouseX <= 250 && mouseY >= 165 && mouseY <= 195) {
    sistemaAtual = "centripeta";
    if (submodo32 === "mcu") criarSlidersMCU();
    else criarSlidersCarro();
    sliderSelecionado = null;
    return;
  }

  // SubRadioButtons
  if (sistemaAtual === "centripeta") {
    if (mouseX >= 50 && mouseX <= 170 && mouseY >= 250 && mouseY <= 280) {
      submodo32 = "mcu";
      criarSlidersMCU();
      sliderSelecionado = null;
      return;
    }
    if (mouseX >= 180 && mouseX <= 320 && mouseY >= 250 && mouseY <= 280) {
      submodo32 = "carro";
      criarSlidersCarro();
      sliderSelecionado = null;
      return;
    }
  }

  // Sliders
  for (let chave in sliders) {
    const s = sliders[chave];
    if (mouseX >= s.x - 10 && mouseX <= s.x + s.largura + 10
        && abs(mouseY - s.y) <= 20) {
      sliderAtivo = chave;
      sliderSelecionado = chave;
      atualizarValorSlider(s, mouseX);
      return;
    }
  }
}

function mouseDragged() {
  if (sliderAtivo !== null) {
    const s = sliders[sliderAtivo];
    atualizarValorSlider(s, mouseX);
    resetarAnimacaoPlano();
  }
}

function mouseReleased() {
  sliderAtivo = null;
}

// =============================================================
// TECLADO
// =============================================================
function keyPressed() {
  if (sliderSelecionado === null || !(sliderSelecionado in sliders)) {
    const chaves = Object.keys(sliders);
    if (chaves.length > 0) sliderSelecionado = chaves[0];
    else return;
  }

  const s = sliders[sliderSelecionado];
  if (!s) return;

  let passo = 0.01;
  if (keyIsDown(SHIFT)) passo *= 10;
  const passoGrande = passo * 10;

  if (keyCode === LEFT_ARROW) {
    s.valor = constrain(s.valor - passo, s.min, s.max);
  } else if (keyCode === RIGHT_ARROW) {
    s.valor = constrain(s.valor + passo, s.min, s.max);
  } else if (keyCode === DOWN_ARROW) {
    s.valor = constrain(s.valor - passoGrande, s.min, s.max);
  } else if (keyCode === UP_ARROW) {
    s.valor = constrain(s.valor + passoGrande, s.min, s.max);
  } else if (keyCode === TAB) {
    const chaves = Object.keys(sliders);
    const idx = chaves.indexOf(sliderSelecionado);
    sliderSelecionado = chaves[(idx + 1) % chaves.length];
    return false;
  } else {
    return;
  }

  aplicarValorGlobal(s);
  resetarAnimacaoPlano();
}

function aplicarValorGlobal(s) {
  if (s === sliders["m1"])        m1 = s.valor;
  if (s === sliders["m2"])        m2 = s.valor;
  if (s === sliders["theta"])     theta = s.valor;
  if (s === sliders["mu_s"])      mu_s = s.valor;
  if (s === sliders["mu_k"])      mu_k = s.valor;
  if (s === sliders["R_circ"])    R_circ = s.valor;
  if (s === sliders["v_circ"])    v_circ = s.valor;
  if (s === sliders["m_circ"])    m_circ = s.valor;
  if (s === sliders["mu_carro"])  mu_carro = s.valor;
}

function atualizarValorSlider(s, mx) {
  const prop = constrain((mx - s.x) / s.largura, 0, 1);
  s.valor = s.min + prop * (s.max - s.min);
  aplicarValorGlobal(s);
}

// =============================================================
// RESET da animação do plano inclinado
// =============================================================
function resetarAnimacaoPlano() {
  tempoSim = 0.0;
  posicaoBloco = 0.0;
  blocoParou = false;
}