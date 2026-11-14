// =============================================================
//  ADO_3 — Colisões Unidimensionais (Opção A - Elástica)
//  Mecânica e Física Moderna
// =============================================================

const LARGURA = 1200;
const ALTURA = 800;

// Cores
const COR_FUNDO   = [245, 247, 250];
const COR_PRETO   = [30, 30, 30];
const COR_CINZA   = [130, 135, 145];
const COR_AZUL    = [42, 111, 219];
const COR_VERDE   = [30, 130, 76];
const COR_VERMELHO= [192, 57, 43];
const COR_LARANJA = [230, 126, 34];
const COR_BRANCO  = [255, 255, 255];

// Física e Estado Global
let m1 = 1.0, m2 = 1.0, v1 = 4.0, v2 = 0.0, dt_ms = 10.0;
let u1 = 0.0, u2 = 0.0; // velocidades depois
let t = 0.0;            // tempo atual
let pausado = false;
let colidiu = false;

// Constantes do cenário (pixels e metros)
const ESCALA = 40;       // 1 metro = 40 pixels
const RAIO_PISTA = 200;  // distância inicial dos centros ao meio
const LARGURA_BLOCO_BASE = 40;

// Variáveis para calcular o momento exato do choque
let tc = 0.0;
let x1_0 = 0.0, x2_0 = 0.0;

// UI
let sliders = {};
let botoes = {};
let sliderAtivo = null;

// =============================================================
// FÍSICA — Fórmulas Fechadas
// =============================================================
function calcularColisao() {
  // Se v1 <= v2, nunca haverá colisão
  if (v1 <= v2) {
    colidiu = false;
    tc = Infinity;
    u1 = v1; u2 = v2;
    return;
  }

  // Fórmulas da colisão elástica
  u1 = ((m1 - m2) * v1 + 2 * m2 * v2) / (m1 + m2);
  u2 = ((m2 - m1) * v2 + 2 * m1 * v1) / (m1 + m2);

  // Posições iniciais (m1 à esquerda, m2 à direita)
  x1_0 = -RAIO_PISTA / ESCALA;
  x2_0 =  RAIO_PISTA / ESCALA;

  // Tempo de colisão: x1(t) + meia_largura1 == x2(t) - meia_largura2
  // Considerando os tamanhos visuais dos blocos
  let L1 = (LARGURA_BLOCO_BASE + m1 * 15) / ESCALA;
  let L2 = (LARGURA_BLOCO_BASE + m2 * 15) / ESCALA;
  
  let x_alvo = (L1 + L2) / 2; // distância que precisam percorrer
  // x1(t) = x1_0 + v1*t; x2(t) = x2_0 + v2*t
  // x2(t) - x1(t) = x_alvo
  tc = (x2_0 - x1_0 - x_alvo) / (v1 - v2);
}

function getPosicoes() {
  let x1, x2;
  if (t < tc) {
    // Antes da colisão (MRU)
    x1 = x1_0 + v1 * t;
    x2 = x2_0 + v2 * t;
  } else {
    // Depois da colisão (MRU)
    // Precisamos ancorar as posições no momento tc para não "pular"
    let x1c = x1_0 + v1 * tc;
    let x2c = x2_0 + v2 * tc;
    x1 = x1c + u1 * (t - tc);
    x2 = x2c + u2 * (t - tc);
  }
  return { x1, x2 };
}

// =============================================================
// SETUP
// =============================================================
function setup() {
  createCanvas(LARGURA, ALTURA);
  textFont("Arial");
  
  criarSliders();
  criarBotoes();
  aplicarCaso(1); // Inicia no Caso 1
}

function criarSliders() {
  // Sliders no rodapé
  sliders.m1 = { x: 50, y: 680, w: 150, val: m1, min: 0.5, max: 10, step: 0.1, label: "m1 (kg)" };
  sliders.m2 = { x: 50, y: 730, w: 150, val: m2, min: 0.5, max: 10, step: 0.1, label: "m2 (kg)" };
  
  sliders.v1 = { x: 280, y: 680, w: 150, val: v1, min: -10, max: 10, step: 0.1, label: "v1 (m/s)" };
  sliders.v2 = { x: 280, y: 730, w: 150, val: v2, min: -10, max: 10, step: 0.1, label: "v2 (m/s)" };
  
  sliders.dt = { x: 510, y: 680, w: 150, val: dt_ms, min: 1, max: 100, step: 1, label: "Δt (ms)" };
}

function criarBotoes() {
  botoes.pausar = { x: 900, y: 670, w: 100, h: 35, label: "Pausar" };
  botoes.reiniciar = { x: 1020, y: 670, w: 100, h: 35, label: "Reiniciar" };
  
  botoes.c1 = { x: 510, y: 730, w: 80, h: 30, label: "Caso 1" };
  botoes.c2 = { x: 600, y: 730, w: 80, h: 30, label: "Caso 2" };
  botoes.c3 = { x: 690, y: 730, w: 80, h: 30, label: "Caso 3" };
}

// =============================================================
// LÓGICA DE ESTADO
// =============================================================
function aplicarCaso(caso) {
  pausado = false;
  if (caso === 1) {
    m1 = 1; m2 = 1; v1 = 4; v2 = 0;
  } else if (caso === 2) {
    m1 = 1; m2 = 4; v1 = 5; v2 = 0;
  } else if (caso === 3) {
    m1 = 4; m2 = 1; v1 = 5; v2 = 0;
  }
  // Atualiza os sliders
  sliders.m1.val = m1; sliders.m2.val = m2; sliders.v1.val = v1; sliders.v2.val = v2;
  reiniciarSimulacao();
}

function reiniciarSimulacao() {
  t = 0;
  colidiu = false;
  pausado = false;
  calcularColisao();
}

// =============================================================
// DRAW — Loop Principal
// =============================================================
function draw() {
  background(COR_FUNDO);
  
  if (!pausado) {
    t += (deltaTime / 1000.0);
  }

  // Física: os dados do painel dependem se já colidiu
  let p_antes = m1 * v1 + m2 * v2;
  let p_depois = m1 * u1 + m2 * u2;
  
  let K_antes = 0.5 * m1 * v1 * v1 + 0.5 * m2 * v2 * v2;
  let K_depois = 0.5 * m1 * u1 * u1 + 0.5 * m2 * u2 * u2;
  let dK = K_depois - K_antes;
  
  let J1 = m1 * (u1 - v1);
  let J2 = m2 * (u2 - v2);
  let F_med = abs(J1) / (dt_ms / 1000.0);

  desenharCenario();
  desenharPainel(p_antes, p_depois, K_antes, K_depois, dK, J1, J2, F_med);
  desenharGraficosBarras(p_antes, p_depois, K_antes, K_depois);
  desenharUI();
}

// =============================================================
// DESENHOS — Cenário e Animação
// =============================================================
function desenharCenario() {
  // Fundo do cenário
  fill(COR_BRANCO);
  rect(30, 30, 780, 580, 10);
  
  // Linha do chão
  stroke(COR_CINZA);
  strokeWeight(2);
  let yChao = 350;
  line(50, yChao + 40, 790, yChao + 40);
  noStroke();

  // Mensagem de sem colisão
  if (v1 <= v2) {
    fill(COR_VERMELHO);
    textSize(18);
    textAlign(CENTER, CENTER);
    text("Sem colisão (v1 ≤ v2)", 420, yChao - 100);
    textAlign(LEFT, TOP);
  }

  // Posição atual
  let pos = getPosicoes();
  
  // Converte metros para pixels e centraliza
  let cx = 410; 
  let px1 = cx + pos.x1 * ESCALA;
  let px2 = cx + pos.x2 * ESCALA;

  // Tamanhos visuais
  let L1 = LARGURA_BLOCO_BASE + m1 * 15;
  let L2 = LARGURA_BLOCO_BASE + m2 * 15;
  let H1 = 40 + m1 * 5;
  let H2 = 40 + m2 * 5;

  // Bloco 1 (Azul)
  fill(COR_AZUL);
  rectMode(CENTER);
  rect(px1, yChao + 40 - H1/2, L1, H1, 5);
  
  // Bloco 2 (Verde)
  fill(COR_VERDE);
  rect(px2, yChao + 40 - H2/2, L2, H2, 5);
  
  // Rótulos
  fill(COR_BRANCO);
  textSize(14);
  textAlign(CENTER, CENTER);
  text("m1", px1, yChao + 40 - H1/2);
  text("m2", px2, yChao + 40 - H2/2);
  
  rectMode(CORNER);
  textAlign(LEFT, TOP);
  fill(COR_PRETO);
  textSize(12);
  text("Tempo: " + t.toFixed(2) + " s", 50, 50);
}

// =============================================================
// DESENHOS — Painel de Resultados
// =============================================================
function desenharPainel(p_antes, p_depois, K_antes, K_depois, dK, J1, J2, F_med) {
  let px = 830, py = 30, pw = 340, ph = 400;
  fill(COR_BRANCO);
  rect(px, py, pw, ph, 10);
  
  fill(COR_PRETO);
  textSize(16);
  textStyle(BOLD);
  text("Painel de Resultados", px + 20, py + 20);
  textStyle(NORMAL);
  textSize(13);
  
  let y = py + 60;
  let dy = 20;

  text("Antes:", px + 20, y); y += dy;
  text("v1 = " + v1.toFixed(1) + " m/s  |  v2 = " + v2.toFixed(1) + " m/s", px + 30, y); y += dy;
  text("K antes = " + K_antes.toFixed(2) + " J", px + 30, y); y += dy;
  
  y += 10;
  text("Depois:", px + 20, y); y += dy;
  text("u1 = " + u1.toFixed(1) + " m/s  |  u2 = " + u2.toFixed(1) + " m/s", px + 30, y); y += dy;
  text("K depois = " + K_depois.toFixed(2) + " J", px + 30, y); y += dy;
  
  y += 10;
  text("Conservação:", px + 20, y); y += dy;
  text("p antes = " + p_antes.toFixed(2) + " kg·m/s", px + 30, y); y += dy;
  text("p depois = " + p_depois.toFixed(2) + " kg·m/s", px + 30, y); y += dy;
  
  y += 10;
  fill(COR_VERDE);
  if (abs(dK) < 0.01) {
    text("ΔK = " + dK.toFixed(2) + " J  (Conservada!)", px + 20, y); y += dy;
  } else {
    fill(COR_VERMELHO);
    text("ΔK = " + dK.toFixed(2) + " J", px + 20, y); y += dy;
  }

  fill(COR_PRETO);
  y += 10;
  text("Impulso e Força:", px + 20, y); y += dy;
  text("J1 = " + J1.toFixed(2) + " N·s  |  J2 = " + J2.toFixed(2) + " N·s", px + 30, y); y += dy;
  text("Fmed = " + F_med.toFixed(0) + " N", px + 30, y);
}

// =============================================================
// DESENHOS — Gráficos de Barras (R4) — CORRIGIDO E AMPLIADO
// =============================================================
function desenharGraficosBarras(p_antes, p_depois, K_antes, K_depois) {
  // Aumentei a altura da caixa para 190 e abaixei um pouco (py = 450)
  let px = 830, py = 450, pw = 340, ph = 190; 
  fill(COR_BRANCO);
  rect(px, py, pw, ph, 10);
  
  fill(COR_PRETO);
  textSize(14);
  textStyle(BOLD);
  text("Gráficos de p e K", px + 20, py + 15);
  textStyle(NORMAL);
  
  // Linha de base das barras
  let baseY = py + 140; 
  
  // --- Barras de Momento (p) ---
  let bx1 = px + 50;
  let maxP = max(abs(p_antes), abs(p_depois), 1);
  
  let hP_antes = map(abs(p_antes), 0, maxP, 0, 80); 
  fill(COR_AZUL);
  rect(bx1, baseY - hP_antes, 30, hP_antes, 2, 2, 0, 0);
  
  let hP_depois = map(abs(p_depois), 0, maxP, 0, 80);
  fill(COR_VERDE);
  rect(bx1 + 40, baseY - hP_depois, 30, hP_depois, 2, 2, 0, 0);
  
  // Valores numéricos em cima das barras de p
  fill(COR_PRETO);
  textSize(10);
  textAlign(CENTER, BOTTOM);
  text(p_antes.toFixed(1), bx1 + 15, baseY - hP_antes - 5);
  text(p_depois.toFixed(1), bx1 + 55, baseY - hP_depois - 5);
  
  // Labels de Momento
  textSize(12);
  textAlign(CENTER, TOP);
  text("Momento (p)", bx1 + 35, baseY + 10);
  textSize(10);
  text("Antes", bx1 + 15, baseY + 30);
  text("Depois", bx1 + 55, baseY + 30);
  
  // --- Barras de Energia (K) ---
  let bx2 = px + 210;
  let maxK = max(K_antes, K_depois, 1);
  
  let hK_antes = map(K_antes, 0, maxK, 0, 80);
  fill(COR_LARANJA);
  rect(bx2, baseY - hK_antes, 30, hK_antes, 2, 2, 0, 0);
  
  let hK_depois = map(K_depois, 0, maxK, 0, 80);
  fill(COR_VERMELHO);
  rect(bx2 + 40, baseY - hK_depois, 30, hK_depois, 2, 2, 0, 0);
  
  // Valores numéricos em cima das barras de K
  fill(COR_PRETO);
  textAlign(CENTER, BOTTOM);
  text(K_antes.toFixed(1), bx2 + 15, baseY - hK_antes - 5);
  text(K_depois.toFixed(1), bx2 + 55, baseY - hK_depois - 5);
  
  // Labels de Energia
  textAlign(CENTER, TOP);
  textSize(12);
  text("Energia (K)", bx2 + 35, baseY + 10);
  textSize(10);
  text("Antes", bx2 + 15, baseY + 30);
  text("Depois", bx2 + 55, baseY + 30);
  
  textAlign(LEFT, TOP);
}

// =============================================================
// DESENHOS — UI (Sliders e Botões)
// =============================================================
function desenharUI() {
  // Fundo do rodapé
  fill(220, 225, 235);
  rect(0, 640, LARGURA, ALTURA - 640);
  
  // Sliders
  for (let k in sliders) {
    let s = sliders[k];
    fill(COR_PRETO);
    textSize(12);
    text(s.label + ": " + s.val.toFixed(1), s.x, s.y - 18);
    
    // Trilha
    stroke(180, 185, 195);
    strokeWeight(6);
    strokeCap(ROUND);
    line(s.x, s.y, s.x + s.w, s.y);
    
    // Preenchimento
    let prop = constrain((s.val - s.min) / (s.max - s.min), 0, 1);
    stroke(COR_AZUL);
    line(s.x, s.y, s.x + prop * s.w, s.y);
    
    // Bolinha
    noStroke();
    fill(COR_AZUL);
    circle(s.x + prop * s.w, s.y, 16);
  }
  
  // Botões
  for (let k in botoes) {
    let b = botoes[k];
    let cor = (k === "pausar") ? COR_LARANJA : (k === "reiniciar") ? COR_VERMELHO : COR_CINZA;
    
    // Cor diferente para o caso ativo (simplificado: só verifica se o texto é igual)
    if (k.startsWith("c")) {
      cor = COR_AZUL;
      // Lógica para destacar o caso atual
      if ((k==="c1" && m1===1 && m2===1 && v1===4) || 
          (k==="c2" && m1===1 && m2===4 && v1===5) || 
          (k==="c3" && m1===4 && m2===1 && v1===5)) {
         cor = COR_VERDE;
      }
    }
    
    fill(cor);
    noStroke();
    rect(b.x, b.y, b.w, b.h, 6);
    
    fill(COR_BRANCO);
    textSize(13);
    textAlign(CENTER, CENTER);
    text(b.label, b.x + b.w/2, b.y + b.h/2);
  }
  textAlign(LEFT, TOP);
}

// =============================================================
// EVENTOS DE MOUSE
// =============================================================
function mousePressed() {
  // Verifica Sliders
  for (let k in sliders) {
    let s = sliders[k];
    if (mouseX >= s.x - 10 && mouseX <= s.x + s.w + 10 && abs(mouseY - s.y) <= 15) {
      sliderAtivo = k;
      atualizarSlider(k, mouseX);
      return;
    }
  }

  // Verifica Botões
  for (let k in botoes) {
    let b = botoes[k];
    if (mouseX >= b.x && mouseX <= b.x + b.w && mouseY >= b.y && mouseY <= b.y + b.h) {
      if (k === "pausar") {
        pausado = !pausado;
        botoes.pausar.label = pausado ? "Continuar" : "Pausar";
      } else if (k === "reiniciar") {
        reiniciarSimulacao();
      } else if (k === "c1") {
        aplicarCaso(1);
      } else if (k === "c2") {
        aplicarCaso(2);
      } else if (k === "c3") {
        aplicarCaso(3);
      }
      return;
    }
  }
}

function mouseDragged() {
  if (sliderAtivo) {
    atualizarSlider(sliderAtivo, mouseX);
  }
}

function mouseReleased() {
  sliderAtivo = null;
}

function atualizarSlider(chave, mx) {
  let s = sliders[chave];
  let prop = constrain((mx - s.x) / s.w, 0, 1);
  let novoValor = s.min + prop * (s.max - s.min);
  
  // Arredonda
  s.val = round(novoValor / s.step) * s.step;

  // Atualiza variável global
  if (chave === "m1") m1 = s.val;
  if (chave === "m2") m2 = s.val;
  if (chave === "v1") v1 = s.val;
  if (chave === "v2") v2 = s.val;
  if (chave === "dt") dt_ms = s.val;

  // Sempre que mexe em um slider, reinicia
  reiniciarSimulacao();
}