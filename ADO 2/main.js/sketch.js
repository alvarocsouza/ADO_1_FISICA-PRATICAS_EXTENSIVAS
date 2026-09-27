// =============================================================
//  ADO_2 — Simulador de Sistemas Mecânicos (p5.js)
// =============================================================
//  Sistemas implementados:
//    (1) Plano inclinado com atrito e tração
//    (2) Força centrípeta (MCU + carro em curva)
//
//  Controles:
//    - RadioButtons à esquerda: escolhe o sistema
//    - No sistema 3.2, um segundo menu escolhe entre MCU / carro
//    - Sliders: ajustam os parâmetros físicos
//    - O gráfico e os valores numéricos atualizam em tempo real
// =============================================================

// Constante física
const G = 9.81; // m/s²

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

// ---------------- Estado global ----------------
let sistemaAtual = "plano"; // "plano" ou "centripeta"
let submodo32 = "mcu";      // "mcu" ou "carro"

// Parâmetros do sistema 3.1
let m1 = 5.0;
let m2 = 3.0;
let theta = 30.0;
let mu_s = 0.30;
let mu_k = 0.25;

// Parâmetros do sistema 3.2
let R_circ = 5.0;     // raio (m)
let v_circ = 4.0;     // velocidade tangencial (m/s) — só no MCU
let m_circ = 2.0;     // massa (kg)
let mu_carro = 0.60;  // atrito do carro (modo carro)

// Fase da animação (ângulo atual do ponto no círculo)
let faseAnim = 0.0;

// Controles de slider (custom)
let sliders = {};
let sliderAtivo = null;

// =============================================================
// FÍSICA — Sistema 3.1: Plano inclinado com atrito e tração
// =============================================================
function calcularAceleracaoPlano(m1, m2, theta_deg, mu_s, mu_k) {
  // 2ª Lei de Newton aplicada a m1 (plano) e m2 (vertical):
  //   N        = m1 * g * cos(theta)
  //   F_motriz = m2*g - m1*g*sin(theta)
  // Se |F_motriz| <= mu_s * N: equilíbrio (a = 0)
  // Senão: a = (F_motriz - mu_k*N*sign(F_motriz)) / (m1 + m2)
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
// FÍSICA — Sistema 3.2: Força centrípeta
// =============================================================
function calcularMCU(R, v, m) {
  // Movimento Circular Uniforme:
  //   ω = v / R
  //   T = 2π / ω
  //   F_c = m*v²/R
  const omega = R > 0 ? v / R : 0;
  const Tc = omega > 0 ? (2 * PI) / omega : 0;
  const Fc = R > 0 ? (m * v * v) / R : 0;
  return { omega: omega, periodo: Tc, Fc: Fc };
}

function calcularCarroCurva(R, m, mu) {
  // Carro em curva plana (atrito estático):
  //   v_max = √(µ · g · R)
  //   F_c,max = m · v_max² / R
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
// CRIAÇÃO DINÂMICA DE SLIDERS
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
    valor: theta, min: 0.0, max: 80.0,
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
// DRAW — executa 60 vezes por segundo
// =============================================================
function draw() {
  background(COR_FUNDO[0], COR_FUNDO[1], COR_FUNDO[2]);

  // Avança a fase da animação com velocidade angular REAL
  // (ω = v/R no MCU, ou ω = v_max/R no modo carro).
  // Isso garante que aumentar v ou diminuir R faça o ponto girar mais rápido.
  if (sistemaAtual === "centripeta") {
    let omega_atual;
    if (submodo32 === "mcu") {
      omega_atual = R_circ > 0 ? v_circ / R_circ : 0;
    } else {
      const vmax = R_circ > 0 ? sqrt(mu_carro * G * R_circ) : 0;
      omega_atual = R_circ > 0 ? vmax / R_circ : 0;
    }
    // deltaTime retorna ms desde o último frame — converte para segundos
    faseAnim += omega_atual * (deltaTime / 1000.0);
  }

  desenharTitulo();
  desenharRadioButtons();
  desenharSubRadioButtons();
  desenharSliders();

  if (sistemaAtual === "plano") {
    desenharSistemaPlano();
  } else {
    if (submodo32 === "mcu") {
      desenharMCU();
    } else {
      desenharCarroCurva();
    }
  }
}

// =============================================================
// DESENHO — Cabeçalho e controles gerais
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
// DESENHO — Sliders customizados
// =============================================================
function desenharSliders() {
  for (let chave in sliders) {
    desenharSlider(sliders[chave]);
  }
}

function desenharSlider(s) {
  noStroke();
  fill(COR_PRETO[0], COR_PRETO[1], COR_PRETO[2]);
  textAlign(LEFT, TOP);
  textSize(14);
  text(s.nome + " = " + s.valor.toFixed(2) + " " + s.unidade, s.x, s.y - 22);

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

  const gx = 380, gy = 90, gw = 780, gh = 480;

  noStroke();
  fill(COR_BRANCO[0], COR_BRANCO[1], COR_BRANCO[2]);
  rect(gx, gy, gw, gh, 10);

  const origemX = gx + 70;
  const origemY = gy + gh / 2 + 10;

  stroke(COR_PRETO[0], COR_PRETO[1], COR_PRETO[2]);
  strokeWeight(1.5);
  line(origemX, origemY, gx + gw - 30, origemY);
  line(origemX, origemY, origemX, gy + 40);

  noStroke();
  fill(COR_PRETO[0], COR_PRETO[1], COR_PRETO[2]);
  textAlign(LEFT, TOP);
  textSize(12);
  text("t (s)", gx + gw - 55, origemY + 10);
  text("x (m) | v (m/s)", origemX + 10, gy + 40);

  const tMax = 5.0;
  const nPts = 200;
  const tArr = [];
  for (let i = 0; i <= nPts; i++) tArr.push(tMax * i / nPts);

  const xArr = tArr.map(t => 0.5 * a * t * t);
  const vArr = tArr.map(t => a * t);

  let maxAbs = 2;
  for (let i = 0; i < tArr.length; i++) {
    maxAbs = Math.max(maxAbs, abs(xArr[i]), abs(vArr[i]));
  }

  const escalaY = (gh - 100) / (2 * maxAbs);
  const escalaX = (gw - 110) / tMax;

  stroke(COR_CINZA_CLARO[0], COR_CINZA_CLARO[1], COR_CINZA_CLARO[2]);
  strokeWeight(0.8);
  line(origemX, origemY, gx + gw - 30, origemY);

  noFill();
  stroke(COR_AZUL[0], COR_AZUL[1], COR_AZUL[2]);
  strokeWeight(2);
  beginShape();
  for (let i = 0; i < tArr.length; i++) {
    vertex(origemX + tArr[i] * escalaX, origemY - xArr[i] * escalaY);
  }
  endShape();

  stroke(COR_LARANJA[0], COR_LARANJA[1], COR_LARANJA[2]);
  strokeWeight(2);
  beginShape();
  for (let i = 0; i < tArr.length; i++) {
    vertex(origemX + tArr[i] * escalaX, origemY - vArr[i] * escalaY);
  }
  endShape();

  const lx = gx + gw - 200;
  const ly = gy + 20;
  noStroke();
  fill(COR_AZUL[0], COR_AZUL[1], COR_AZUL[2]);
  rect(lx, ly, 20, 3);
  fill(COR_PRETO[0], COR_PRETO[1], COR_PRETO[2]);
  textSize(12);
  textAlign(LEFT, CENTER);
  text("x(t) — posição", lx + 28, ly + 1);
  fill(COR_LARANJA[0], COR_LARANJA[1], COR_LARANJA[2]);
  rect(lx, ly + 20, 20, 3);
  fill(COR_PRETO[0], COR_PRETO[1], COR_PRETO[2]);
  text("v(t) — velocidade", lx + 28, ly + 21);
  textAlign(LEFT, TOP);

  const px = 380, py = 590, pw = 780, ph = 130;
  fill(COR_BRANCO[0], COR_BRANCO[1], COR_BRANCO[2]);
  rect(px, py, pw, ph, 10);

  const corRegime = regime === "EQUILÍBRIO ESTÁTICO" ? COR_VERMELHO : COR_VERDE;
  noStroke();
  fill(corRegime[0], corRegime[1], corRegime[2]);
  textSize(16);
  textStyle(BOLD);
  textAlign(LEFT, TOP);
  text("Regime: " + regime, px + 25, py + 20);
  textStyle(NORMAL);

  fill(COR_PRETO[0], COR_PRETO[1], COR_PRETO[2]);
  textSize(14);
  text("Aceleração a = " + a.toFixed(3) + " m/s²", px + 25, py + 55);
  text("Tração no fio T = " + T.toFixed(3) + " N", px + 25, py + 80);
  text("Força motriz = " + Fmot.toFixed(3) + " N", px + 420, py + 55);
  text("Normal N = " + N.toFixed(3) + " N", px + 420, py + 80);
}

// =============================================================
// DESENHO — Sistema 3.2 — MCU simples
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
// DESENHO — Sistema 3.2 — Carro em curva plana
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
// Helper: desenha uma seta de (x1,y1) para (x2,y2)
// =============================================================
function desenharSeta(x1, y1, x2, y2, cor) {
  push();
  stroke(cor[0], cor[1], cor[2]);
  strokeWeight(2.5);
  fill(cor[0], cor[1], cor[2]);
  line(x1, y1, x2, y2);

  const ang = atan2(y2 - y1, x2 - x1);
  const tamCabeca = 12;

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
    return;
  }
  if (mouseX >= 50 && mouseX <= 250 && mouseY >= 165 && mouseY <= 195) {
    sistemaAtual = "centripeta";
    if (submodo32 === "mcu") criarSlidersMCU();
    else criarSlidersCarro();
    return;
  }

  // SubRadioButtons (só no 3.2)
  if (sistemaAtual === "centripeta") {
    if (mouseX >= 50 && mouseX <= 170 && mouseY >= 250 && mouseY <= 280) {
      submodo32 = "mcu";
      criarSlidersMCU();
      return;
    }
    if (mouseX >= 180 && mouseX <= 320 && mouseY >= 250 && mouseY <= 280) {
      submodo32 = "carro";
      criarSlidersCarro();
      return;
    }
  }

  // Sliders
  for (let chave in sliders) {
    const s = sliders[chave];
    if (mouseX >= s.x - 10 && mouseX <= s.x + s.largura + 10
        && abs(mouseY - s.y) <= 20) {
      sliderAtivo = chave;
      atualizarValorSlider(s, mouseX);
      return;
    }
  }
}

function mouseDragged() {
  if (sliderAtivo !== null) {
    const s = sliders[sliderAtivo];
    atualizarValorSlider(s, mouseX);
  }
}

function mouseReleased() {
  sliderAtivo = null;
}

function atualizarValorSlider(s, mx) {
  const prop = constrain((mx - s.x) / s.largura, 0, 1);
  s.valor = s.min + prop * (s.max - s.min);

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