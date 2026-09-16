"""
=============================================================
 SIMULADOR DE LANÇAMENTO DE PROJÉTIL (sem resistência do ar)
=============================================================
 Disciplina: Física - Práticas Extensivas (ADO_1)
 
 Requisitos:
     pip install pygame-ce
 
 Como rodar:
     python simulador_projetil.py
 
 Controles:
     - Sliders: velocidade, ângulo, altura inicial, gravidade
     - Teclas L/M/T/J: presets de gravidade (Lua, Marte, Terra, Júpiter)
     - Botão LANÇAR (ou Espaço): anima o projétil
     - Botão RESET (ou R): restaura valores padrão
     - Botão LIMPAR (ou C): limpa o histórico de lançamentos
=============================================================
"""

import pygame
import math

# ==============================
# Configurações gerais da janela
# ==============================
LARGURA = 1200
ALTURA = 750
FPS = 60

# Paleta de cores
FUNDO = (245, 247, 250)
PAINEL = (230, 234, 240)
BRANCO = (255, 255, 255)
PRETO = (30, 30, 30)
CINZA = (100, 105, 115)
CINZA_CLARO = (190, 195, 205)
CINZA_HIST = (180, 185, 195)
AZUL = (50, 100, 220)
AZUL_ESCURO = (35, 70, 160)
VERDE = (40, 160, 90)
VERMELHO = (210, 60, 60)
LARANJA = (230, 140, 40)

# Área do gráfico
GRAFICO_X = 360
GRAFICO_Y = 80
GRAFICO_LARGURA = 800
GRAFICO_ALTURA = 560

# Limites dos parâmetros (sugestões do PDF)
VEL_MIN = 5
VEL_MAX = 150
ANGULO_MIN = 1
ANGULO_MAX = 89
ALTURA_MIN = 0
ALTURA_MAX = 50
GRAVIDADE_MIN = 1.6
GRAVIDADE_MAX = 24.8

# ==============================
# Inicialização do Pygame
# ==============================
pygame.init()
tela = pygame.display.set_mode((LARGURA, ALTURA))
pygame.display.set_caption("Simulador de Lançamento de Projétil")
relogio = pygame.time.Clock()

# Fontes
fonte = pygame.font.SysFont("arial", 18)
fonte_pequena = pygame.font.SysFont("arial", 14)
fonte_titulo = pygame.font.SysFont("arial", 28, bold=True)
fonte_resultado = pygame.font.SysFont("arial", 19, bold=True)
fonte_botao = pygame.font.SysFont("arial", 18, bold=True)

# ==============================
# Estado atual dos parâmetros
# ==============================
velocidade = 50.0
angulo = 45.0
altura_inicial = 10.0
gravidade = 9.81
nome_gravidade = "Terra"

# Estado da animação
animando = False
tempo_animacao = 0.0

# Parâmetros congelados no momento do lançamento
vel_lancamento = velocidade
angulo_lancamento = angulo
altura_lancamento = altura_inicial
grav_lancamento = gravidade

# Histórico de lançamentos anteriores (requisito opcional)
historico_lancamentos = []

# Flag que indica se já houve pelo menos um lançamento
# (evita histórico fantasma no primeiro clique)
ja_lancou_alguma_vez = False

# Slider atualmente sendo arrastado (None se nenhum)
# Valores possíveis: "velocidade", "angulo", "altura", "gravidade"
slider_ativo = None

# Presets de gravidade por planeta
GRAVIDADES = {
    "Lua": 1.62,
    "Marte": 3.71,
    "Terra": 9.81,
    "Jupiter": 24.79,
}

# ==============================
# Física do movimento
# ==============================
def calcular_tempo_voo(v0, theta, y0, g):
    """Tempo até o projétil atingir y = 0 (fórmula 3 do PDF)."""
    theta_rad = math.radians(theta)
    vy = v0 * math.sin(theta_rad)
    discriminante = vy ** 2 + 2 * g * y0
    return (vy + math.sqrt(discriminante)) / g


def calcular_altura_maxima(v0, theta, y0, g):
    """Altura máxima atingida (fórmula 4 do PDF)."""
    theta_rad = math.radians(theta)
    vy = v0 * math.sin(theta_rad)
    return y0 + (vy ** 2) / (2 * g)


def calcular_alcance(v0, theta, x0, y0, g):
    """Alcance horizontal total (fórmula 5 do PDF)."""
    theta_rad = math.radians(theta)
    t = calcular_tempo_voo(v0, theta, y0, g)
    return x0 + v0 * math.cos(theta_rad) * t


def calcular_resultados(v0, theta, y0, g):
    """Retorna (alcance, altura_max, tempo_voo)."""
    x0 = 0
    t = calcular_tempo_voo(v0, theta, y0, g)
    h = calcular_altura_maxima(v0, theta, y0, g)
    r = calcular_alcance(v0, theta, x0, y0, g)
    return r, h, t


def calcular_trajetoria(v0, theta, y0, g, quantidade=500):
    """Pontos (x, y) da trajetória usando as fórmulas analíticas."""
    theta_rad = math.radians(theta)
    t_voo = calcular_tempo_voo(v0, theta, y0, g)
    pontos = []
    for i in range(quantidade + 1):
        t = t_voo * i / quantidade
        x = v0 * math.cos(theta_rad) * t
        y = y0 + v0 * math.sin(theta_rad) * t - 0.5 * g * t ** 2
        if y < 0:
            y = 0
        pontos.append((x, y))
    return pontos


def validar_parametros(v0, theta, y0, g):
    """
    Valida os parâmetros e retorna (ok, mensagem).
    Se ok=True, mensagem é None.
    """
    if v0 <= 0:
        return False, "Velocidade deve ser positiva."
    if not (0 < theta < 90):
        return False, "Ângulo deve estar entre 0° e 90°."
    if y0 < 0:
        return False, "Altura inicial não pode ser negativa."
    if g <= 0:
        return False, "Gravidade deve ser positiva."
    return True, None


# ==============================
# Escala do gráfico
# ==============================
def calcular_escala(v0, theta, y0, g):
    """
    Escala única (m -> pixel) usada tanto pelo gráfico quanto pela animação.
    Mantém proporção 1:1 entre os eixos x e y.
    """
    alcance, altura_max, _ = calcular_resultados(v0, theta, y0, g)
    largura_util = GRAFICO_LARGURA - 80
    altura_util = GRAFICO_ALTURA - 80
    escala_x = largura_util / max(alcance, 1)
    escala_y = altura_util / max(altura_max, 1)
    return min(escala_x, escala_y)


def mundo_para_tela(x, y, escala):
    """Converte coordenadas físicas (m) em coordenadas da tela (px)."""
    origem_x = GRAFICO_X + 50
    origem_y = GRAFICO_Y + GRAFICO_ALTURA - 40
    tela_x = origem_x + x * escala
    tela_y = origem_y - y * escala
    return int(tela_x), int(tela_y)


# ==============================
# Funções de desenho (interface)
# ==============================
def desenhar_texto(texto, x, y, cor=PRETO, fonte_usada=fonte):
    imagem = fonte_usada.render(texto, True, cor)
    tela.blit(imagem, (x, y))


def desenhar_titulo():
    desenhar_texto(
        "SIMULADOR DE LANÇAMENTO DE PROJÉTIL",
        30, 25, PRETO, fonte_titulo
    )


def desenhar_painel():
    pygame.draw.rect(tela, PAINEL, (20, 80, 310, 560), border_radius=12)
    desenhar_texto("PARÂMETROS", 45, 105, AZUL_ESCURO, fonte_resultado)


def desenhar_slider(x, y, largura, valor, minimo, maximo, nome, unidade):
    """Desenha um slider horizontal com rótulo e valor atual."""
    desenhar_texto(f"{nome}: {valor:.1f} {unidade}", x, y - 30, PRETO, fonte)

    # Trilha
    pygame.draw.line(tela, CINZA_CLARO, (x, y), (x + largura, y), 8)

    # Preenchimento até o valor
    proporcao = (valor - minimo) / (maximo - minimo)
    proporcao = max(0.0, min(1.0, proporcao))
    posicao = x + proporcao * largura
    pygame.draw.line(tela, AZUL, (x, y), (posicao, y), 8)

    # Círculo (botão) do slider
    pygame.draw.circle(tela, AZUL_ESCURO, (int(posicao), y), 11)


def desenhar_controles():
    desenhar_slider(50, 180, 250, velocidade, VEL_MIN, VEL_MAX, "Velocidade", "m/s")
    desenhar_slider(50, 270, 250, angulo, ANGULO_MIN, ANGULO_MAX, "Ângulo", "°")
    desenhar_slider(50, 360, 250, altura_inicial, ALTURA_MIN, ALTURA_MAX, "Altura inicial", "m")
    desenhar_slider(50, 450, 250, gravidade, GRAVIDADE_MIN, GRAVIDADE_MAX, "Gravidade", "m/s²")

    desenhar_texto(f"Planeta: {nome_gravidade}", 50, 485, PRETO, fonte)
    desenhar_texto("Presets: [L] Lua  [M] Marte", 50, 510, CINZA, fonte_pequena)
    desenhar_texto("         [T] Terra [J] Jupiter", 50, 530, CINZA, fonte_pequena)


def desenhar_botao(x, y, largura, altura, texto, cor):
    retangulo = pygame.Rect(x, y, largura, altura)
    pygame.draw.rect(tela, cor, retangulo, border_radius=8)
    imagem = fonte_botao.render(texto, True, BRANCO)
    texto_x = x + (largura - imagem.get_width()) / 2
    texto_y = y + (altura - imagem.get_height()) / 2
    tela.blit(imagem, (texto_x, texto_y))
    return retangulo


def desenhar_resultados():
    """Painel inferior com alcance, altura máxima e tempo de voo."""
    valido, _ = validar_parametros(velocidade, angulo, altura_inicial, gravidade)

    pygame.draw.rect(tela, BRANCO, (20, 655, 1160, 70), border_radius=10)

    if valido:
        alcance, altura_max, tempo_voo = calcular_resultados(
            velocidade, angulo, altura_inicial, gravidade
        )
        desenhar_texto(f"Alcance: {alcance:.2f} m", 40, 680, AZUL_ESCURO, fonte_resultado)
        desenhar_texto(f"Altura máxima: {altura_max:.2f} m", 380, 680, VERDE, fonte_resultado)
        desenhar_texto(f"Tempo de voo: {tempo_voo:.2f} s", 780, 680, LARANJA, fonte_resultado)
    else:
        _, msg = validar_parametros(velocidade, angulo, altura_inicial, gravidade)
        desenhar_texto(f"⚠ {msg}", 40, 680, VERMELHO, fonte_resultado)


def desenhar_marcas_eixos(escala, alcance, altura_max):
    """Desenha marcas numéricas nos eixos X e Y do gráfico."""
    origem_x = GRAFICO_X + 50
    origem_y = GRAFICO_Y + GRAFICO_ALTURA - 40

    # Marcas no eixo X (5 divisões)
    for i in range(5):
        valor = alcance * i / 4
        px, _ = mundo_para_tela(valor, 0, escala)
        pygame.draw.line(tela, PRETO, (px, origem_y), (px, origem_y + 5), 2)
        desenhar_texto(f"{valor:.0f}", px - 12, origem_y + 8, PRETO, fonte_pequena)

    # Marcas no eixo Y (5 divisões)
    for i in range(5):
        valor = altura_max * i / 4
        _, py = mundo_para_tela(0, valor, escala)
        pygame.draw.line(tela, PRETO, (origem_x - 5, py), (origem_x, py), 2)
        desenhar_texto(f"{valor:.0f}", origem_x - 42, py - 7, PRETO, fonte_pequena)


def desenhar_grafico():
    """Desenha o gráfico, o histórico e a trajetória atual."""
    # Fundo do gráfico
    pygame.draw.rect(
        tela, BRANCO,
        (GRAFICO_X, GRAFICO_Y, GRAFICO_LARGURA, GRAFICO_ALTURA),
        border_radius=10
    )

    valido, _ = validar_parametros(velocidade, angulo, altura_inicial, gravidade)

    # Se inválido, mostra mensagem no lugar do gráfico
    if not valido:
        desenhar_texto(
            "Parâmetros inválidos — ajuste os controles.",
            GRAFICO_X + 40, GRAFICO_Y + GRAFICO_ALTURA // 2,
            VERMELHO, fonte_resultado
        )
        return

    # Trajetória atual
    pontos = calcular_trajetoria(velocidade, angulo, altura_inicial, gravidade)
    escala = calcular_escala(velocidade, angulo, altura_inicial, gravidade)
    alcance, altura_max, _ = calcular_resultados(
        velocidade, angulo, altura_inicial, gravidade
    )

    # Eixos (linhas)
    origem_x = GRAFICO_X + 50
    origem_y = GRAFICO_Y + GRAFICO_ALTURA - 40

    pygame.draw.line(
        tela, PRETO, (origem_x, origem_y),
        (GRAFICO_X + GRAFICO_LARGURA - 20, origem_y), 2
    )
    pygame.draw.line(
        tela, PRETO, (origem_x, origem_y),
        (origem_x, GRAFICO_Y + 20), 2
    )

    # Histórico de lançamentos anteriores (requisito opcional)
    # Usa a escala ATUAL para que tudo fique visível na mesma área.
    for params in historico_lancamentos:
        h_v0, h_theta, h_y0, h_g = params
        pontos_h = calcular_trajetoria(h_v0, h_theta, h_y0, h_g)
        pts_tela_h = [mundo_para_tela(x, y, escala) for x, y in pontos_h]
        if len(pts_tela_h) > 1:
            pygame.draw.lines(tela, CINZA_HIST, False, pts_tela_h, 2)

    # Trajetória atual
    pts_tela = [mundo_para_tela(x, y, escala) for x, y in pontos]
    if len(pts_tela) > 1:
        pygame.draw.aalines(tela, AZUL, False, pts_tela)

    # Chão destacado
    pygame.draw.line(
        tela, VERDE, (origem_x, origem_y),
        (GRAFICO_X + GRAFICO_LARGURA - 20, origem_y), 5
    )

    # Marcas numéricas dos eixos
    desenhar_marcas_eixos(escala, alcance, altura_max)

    # Marca do ponto de altura máxima
    if altura_max > 0:
        theta_rad = math.radians(angulo)
        t_subida = (velocidade * math.sin(theta_rad)) / gravidade
        x_max = velocidade * math.cos(theta_rad) * t_subida
        px_max, py_max = mundo_para_tela(x_max, altura_max, escala)
        pygame.draw.circle(tela, VERDE, (px_max, py_max), 6, 2)
        desenhar_texto(
            f"ymax = {altura_max:.1f} m",
            px_max + 10, py_max - 20, VERDE, fonte_pequena
        )

    # Marca do ponto de impacto (alcance)
    px_imp, py_imp = mundo_para_tela(alcance, 0, escala)
    pygame.draw.line(tela, VERMELHO, (px_imp - 6, py_imp - 6), (px_imp + 6, py_imp + 6), 3)
    pygame.draw.line(tela, VERMELHO, (px_imp - 6, py_imp + 6), (px_imp + 6, py_imp - 6), 3)
    desenhar_texto(
        f"R = {alcance:.1f} m",
        px_imp - 30, py_imp + 8, VERMELHO, fonte_pequena
    )

    # Legendas dos eixos
    desenhar_texto(
        "x (m)", GRAFICO_X + GRAFICO_LARGURA - 70, origem_y + 10,
        PRETO, fonte_pequena
    )
    desenhar_texto(
        "y (m)", origem_x - 35, GRAFICO_Y + 10,
        PRETO, fonte_pequena
    )
    desenhar_texto(
        "Trajetória atual", GRAFICO_X + 20, GRAFICO_Y + 15,
        AZUL_ESCURO, fonte_resultado
    )

    # Info do histórico (só aparece se houver curvas guardadas)
    if historico_lancamentos:
        desenhar_texto(
            f"Histórico: {len(historico_lancamentos)} curva(s) em cinza",
            GRAFICO_X + 20, GRAFICO_Y + 40,
            CINZA, fonte_pequena
        )


# ==============================
# Animação do projétil
# ==============================
def atualizar_animacao(dt):
    """Avança o tempo da animação."""
    global tempo_animacao, animando

    if not animando:
        return

    tempo_animacao += dt
    t_voo = calcular_tempo_voo(
        vel_lancamento, angulo_lancamento,
        altura_lancamento, grav_lancamento
    )

    if tempo_animacao >= t_voo:
        tempo_animacao = t_voo
        animando = False


def desenhar_animacao():
    """Desenha o projétil (e um rastro) na posição atual."""
    if not animando and tempo_animacao <= 0:
        return

    theta = math.radians(angulo_lancamento)
    x = vel_lancamento * math.cos(theta) * tempo_animacao
    y = (
        altura_lancamento
        + vel_lancamento * math.sin(theta) * tempo_animacao
        - 0.5 * grav_lancamento * tempo_animacao ** 2
    )
    if y < 0:
        y = 0

    # Escala baseada nos parâmetros CONGELADOS do lançamento
    escala = calcular_escala(
        vel_lancamento, angulo_lancamento,
        altura_lancamento, grav_lancamento
    )

    px, py = mundo_para_tela(x, y, escala)

    # Ponto inicial
    inicio_x, inicio_y = mundo_para_tela(0, altura_lancamento, escala)
    pygame.draw.circle(tela, VERDE, (inicio_x, inicio_y), 6)

    # Rastro (linha até o ponto atual)
    pontos_ate_agora = []
    n = 60
    for i in range(n + 1):
        t = tempo_animacao * i / n
        xr = vel_lancamento * math.cos(theta) * t
        yr = (
            altura_lancamento
            + vel_lancamento * math.sin(theta) * t
            - 0.5 * grav_lancamento * t ** 2
        )
        if yr < 0:
            yr = 0
        pontos_ate_agora.append(mundo_para_tela(xr, yr, escala))

    if len(pontos_ate_agora) > 1:
        pygame.draw.lines(tela, LARANJA, False, pontos_ate_agora, 3)

    # Projétil
    pygame.draw.circle(tela, VERMELHO, (px, py), 9)
    pygame.draw.circle(tela, PRETO, (px, py), 9, 2)

    # Tempo decorrido no canto do gráfico
    desenhar_texto(
        f"t = {tempo_animacao:.2f} s",
        GRAFICO_X + GRAFICO_LARGURA - 100,
        GRAFICO_Y + 15,
        LARANJA, fonte_pequena
    )


# ==============================
# Interação com sliders
# ==============================
def mouse_no_slider(mouse_x, mouse_y, slider_y):
    """Verifica se o clique foi na área horizontal do slider."""
    return 45 <= mouse_x <= 305 and slider_y - 15 <= mouse_y <= slider_y + 15


def valor_do_slider(mouse_x, minimo, maximo):
    """Converte a posição X do mouse em valor do slider."""
    inicio = 50
    largura = 250
    proporcao = (mouse_x - inicio) / largura
    proporcao = max(0.0, min(1.0, proporcao))
    return minimo + proporcao * (maximo - minimo)


def aplicar_valor_slider(nome_slider, mouse_x):
    """Aplica o valor do slider correspondente com base na posição do mouse."""
    global velocidade, angulo, altura_inicial, gravidade, nome_gravidade

    if nome_slider == "velocidade":
        velocidade = valor_do_slider(mouse_x, VEL_MIN, VEL_MAX)
    elif nome_slider == "angulo":
        angulo = valor_do_slider(mouse_x, ANGULO_MIN, ANGULO_MAX)
    elif nome_slider == "altura":
        altura_inicial = valor_do_slider(mouse_x, ALTURA_MIN, ALTURA_MAX)
    elif nome_slider == "gravidade":
        gravidade = valor_do_slider(mouse_x, GRAVIDADE_MIN, GRAVIDADE_MAX)
        nome_gravidade = "Personalizada"


def selecionar_gravidade(nome):
    global gravidade, nome_gravidade
    gravidade = GRAVIDADES[nome]
    nome_gravidade = nome


def resetar():
    """Restaura todos os parâmetros para os valores padrão."""
    global velocidade, angulo, altura_inicial, gravidade, nome_gravidade
    global tempo_animacao, animando, slider_ativo, ja_lancou_alguma_vez

    velocidade = 50.0
    angulo = 45.0
    altura_inicial = 10.0
    gravidade = 9.81
    nome_gravidade = "Terra"
    tempo_animacao = 0.0
    animando = False
    slider_ativo = None
    ja_lancou_alguma_vez = False


def limpar_historico():
    """Limpa o histórico de lançamentos e reseta a flag de lançamento."""
    global historico_lancamentos, ja_lancou_alguma_vez
    historico_lancamentos = []
    ja_lancou_alguma_vez = False


def lancar():
    """Congela os parâmetros atuais e inicia a animação."""
    global vel_lancamento, angulo_lancamento, altura_lancamento, grav_lancamento
    global tempo_animacao, animando, ja_lancou_alguma_vez

    valido, _ = validar_parametros(velocidade, angulo, altura_inicial, gravidade)
    if not valido:
        return

    # Só guarda no histórico se já houve um lançamento antes.
    # Isso evita que a curva cinza coincida com a azul no primeiro clique.
    if ja_lancou_alguma_vez:
        historico_lancamentos.append(
            (vel_lancamento, angulo_lancamento, altura_lancamento, grav_lancamento)
        )
        if len(historico_lancamentos) > 8:
            historico_lancamentos.pop(0)

    # Congela os parâmetros atuais para a animação
    vel_lancamento = velocidade
    angulo_lancamento = angulo
    altura_lancamento = altura_inicial
    grav_lancamento = gravidade

    tempo_animacao = 0.0
    animando = True
    ja_lancou_alguma_vez = True


# ==============================
# Retângulos dos botões
# ==============================
botao_lancar = pygame.Rect(50, 570, 80, 45)
botao_reset = pygame.Rect(140, 570, 80, 45)
botao_limpar = pygame.Rect(230, 570, 80, 45)


# ==============================
# Loop principal
# ==============================
rodando = True

while rodando:
    dt = relogio.tick(FPS) / 1000.0

    # -------- Tratamento de eventos --------
    for evento in pygame.event.get():

        if evento.type == pygame.QUIT:
            rodando = False

        # ----- Mouse pressionado -----
        elif evento.type == pygame.MOUSEBUTTONDOWN and evento.button == 1:
            mx, my = evento.pos

            if mouse_no_slider(mx, my, 180):
                slider_ativo = "velocidade"
                aplicar_valor_slider(slider_ativo, mx)
            elif mouse_no_slider(mx, my, 270):
                slider_ativo = "angulo"
                aplicar_valor_slider(slider_ativo, mx)
            elif mouse_no_slider(mx, my, 360):
                slider_ativo = "altura"
                aplicar_valor_slider(slider_ativo, mx)
            elif mouse_no_slider(mx, my, 450):
                slider_ativo = "gravidade"
                aplicar_valor_slider(slider_ativo, mx)

            elif botao_lancar.collidepoint(mx, my):
                lancar()
            elif botao_reset.collidepoint(mx, my):
                resetar()
            elif botao_limpar.collidepoint(mx, my):
                limpar_historico()

        # ----- Mouse solto: encerra o arrasto -----
        elif evento.type == pygame.MOUSEBUTTONUP and evento.button == 1:
            slider_ativo = None

        # ----- Mouse arrastando -----
        elif evento.type == pygame.MOUSEMOTION:
            if slider_ativo is not None:
                aplicar_valor_slider(slider_ativo, evento.pos[0])

        # ----- Teclado -----
        elif evento.type == pygame.KEYDOWN:
            if evento.key == pygame.K_l:
                selecionar_gravidade("Lua")
            elif evento.key == pygame.K_m:
                selecionar_gravidade("Marte")
            elif evento.key == pygame.K_t:
                selecionar_gravidade("Terra")
            elif evento.key == pygame.K_j:
                selecionar_gravidade("Jupiter")
            elif evento.key == pygame.K_SPACE:
                lancar()
            elif evento.key == pygame.K_r:
                resetar()
            elif evento.key == pygame.K_c:
                limpar_historico()
            elif evento.key == pygame.K_ESCAPE:
                rodando = False

    # ----- Atualização da física -----
    atualizar_animacao(dt)

    # ----- Desenho -----
    tela.fill(FUNDO)
    desenhar_titulo()
    desenhar_painel()
    desenhar_controles()

    # Botões
    desenhar_botao(50, 570, 80, 45, "LANÇAR", AZUL)
    desenhar_botao(140, 570, 80, 45, "RESET", CINZA)
    desenhar_botao(230, 570, 80, 45, "LIMPAR", CINZA)

    desenhar_grafico()
    desenhar_animacao()
    desenhar_resultados()

    pygame.display.flip()


pygame.quit()