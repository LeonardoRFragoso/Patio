/**
 * Sistema de Grid Industrial - VERSÃO CORRIGIDA PARA SUZANO-SP
 * Arquivo: components/grid-system.js
 */

import { CONFIG } from '../utils/constants.js';

export class GridSystem {
  constructor() {
    this.gridGroup = null;
    this.gridVisisvel = true;
    this.gridSecundarioVisivel = false;
    this.gridDetalhado = null;
    this.marcadores = [];
    this.isAnimating = false;
  }

  // ===== CRIAR GRID APRIMORADO =====
  criarGridAprimorado() {
    console.log("📐 Criando grid industrial aprimorado...");

    this.gridGroup = new THREE.Group();
    this.gridGroup.name = "GridSystem";

    const larguraPatio = CONFIG.ROWS.length * CONFIG.ESPACAMENTO_ROW;
    const comprimentoPatio = CONFIG.BAIAS_MAX * CONFIG.ESPACAMENTO_BAIA;
    const tamanhoGrid = Math.max(larguraPatio, comprimentoPatio) + 50;

    // Grid principal mais sutil
    const gridPrincipal = this.criarGridPrincipal(tamanhoGrid);
    this.gridGroup.add(gridPrincipal);

    // Grid secundário para detalhes finos
    const gridSecundario = this.criarGridSecundario(tamanhoGrid);
    this.gridGroup.add(gridSecundario);

    // Grid detalhado específico do pátio
    this.gridDetalhado = this.criarGridDetalhado();
    this.gridGroup.add(this.gridDetalhado);

    // Marcadores de referência
    this.criarMarcadoresReferencia();

    // Eixos principais
    this.criarEixosPrincipais();

    // Grid polar (opcional)
    this.criarGridPolar();

    console.log(`✅ Grid industrial criado com tamanho: ${tamanhoGrid}`);
    return this.gridGroup;
  }

  // ===== GRID PRINCIPAL =====
  criarGridPrincipal(tamanhoGrid) {
    const gridHelper = new THREE.GridHelper(
      tamanhoGrid,
      Math.floor(tamanhoGrid / 5),
      new THREE.Color(0.3, 0.3, 0.3), // Cor das linhas principais
      new THREE.Color(0.2, 0.2, 0.2)  // Cor das linhas secundárias
    );
    
    gridHelper.position.y = -0.1;
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.3;
    gridHelper.name = "GridPrincipal";
    
    return gridHelper;
  }

  // ===== GRID SECUNDÁRIO =====
  criarGridSecundario(tamanhoGrid) {
    const gridSecundario = new THREE.GridHelper(
      tamanhoGrid / 2,
      Math.floor(tamanhoGrid / 1),
      new THREE.Color(0.15, 0.15, 0.15), // Mais escuro
      new THREE.Color(0.1, 0.1, 0.1)     // Ainda mais escuro
    );
    
    gridSecundario.position.y = -0.05;
    gridSecundario.material.transparent = true;
    gridSecundario.material.opacity = 0.15;
    gridSecundario.visible = false; // Inicialmente oculto
    gridSecundario.name = "GridSecundario";
    
    return gridSecundario;
  }

  // ===== GRID DETALHADO ESPECÍFICO DO PÁTIO =====
  criarGridDetalhado() {
    const gridDetalhado = new THREE.Group();
    gridDetalhado.name = "GridDetalhado";

    // Material para linhas de grid detalhado
    const linhaMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color(0.4, 0.6, 0.8),
      transparent: true,
      opacity: 0.4
    });

    // Linhas verticais (baias)
    // Exibir APENAS as baias físicas (ímpares: 1, 3, 5, 7, 9, 11, 13, 15, 17, 19)
    const baiasFisicas = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
    for (const bay of baiasFisicas) {
      const x = (bay - 10.5) * CONFIG.ESPACAMENTO_BAIA;
      
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, 0, -CONFIG.ROWS.length * CONFIG.ESPACAMENTO_ROW / 2),
        new THREE.Vector3(x, 0, CONFIG.ROWS.length * CONFIG.ESPACAMENTO_ROW / 2)
      ]);
      
      const linha = new THREE.Line(geometry, linhaMaterial.clone());
      linha.name = `LinhaBaia_${bay}`;
      gridDetalhado.add(linha);
    }

    // Linhas horizontais (rows)
    CONFIG.ROWS.forEach((row, index) => {
      const z = (index - 2) * CONFIG.ESPACAMENTO_ROW;
      
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-CONFIG.BAIAS_MAX * CONFIG.ESPACAMENTO_BAIA / 2, 0, z),
        new THREE.Vector3(CONFIG.BAIAS_MAX * CONFIG.ESPACAMENTO_BAIA / 2, 0, z)
      ]);
      
      const linha = new THREE.Line(geometry, linhaMaterial.clone());
      linha.name = `LinhaRow_${row}`;
      gridDetalhado.add(linha);
    });

    return gridDetalhado;
  }

  // ===== MARCADORES DE REFERÊNCIA =====
  criarMarcadoresReferencia() {
    console.log("🎯 Criando marcadores de referência...");

    // Marcadores para cada row
    CONFIG.ROWS.forEach((row, index) => {
      const marcador = this.criarMarcadorRow(row, index);
      this.marcadores.push(marcador);
      this.gridGroup.add(marcador);
    });

    // Marcadores para baias físicas a cada 5 posições (5 e 15)
    const baiasFisicas = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
    baiasFisicas.filter(b => b % 5 === 0).forEach(bay => {
      const marcador = this.criarMarcadorBaia(bay);
      this.marcadores.push(marcador);
      this.gridGroup.add(marcador);
    });

    // Marcador de origem (0,0)
    const marcadorOrigem = this.criarMarcadorOrigem();
    this.marcadores.push(marcadorOrigem);
    this.gridGroup.add(marcadorOrigem);

    console.log(`✅ ${this.marcadores.length} marcadores de referência criados`);
  }

  // ===== MARCADOR DE ROW =====
  criarMarcadorRow(row, index) {
    const grupo = new THREE.Group();
    grupo.name = `MarcadorRow_${row}`;

    const z = (index - 2) * CONFIG.ESPACAMENTO_ROW;
    const x = -CONFIG.BAIAS_MAX * CONFIG.ESPACAMENTO_BAIA / 2 - 5;

    // Círculo base
    const geometryCirculo = new THREE.CircleGeometry(1, 16);
    const materialCirculo = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0.2, 0.6, 0.8),
      transparent: true,
      opacity: 0.7
    });
    
    const circulo = new THREE.Mesh(geometryCirculo, materialCirculo);
    circulo.rotation.x = -Math.PI / 2;
    circulo.position.set(x, 0.01, z);
    grupo.add(circulo);

    // Label do row
    const label = this.criarLabelMarcador(row, "row");
    label.position.set(x, 2, z);
    grupo.add(label);

    return grupo;
  }

  // ===== MARCADOR DE BAIA =====
  criarMarcadorBaia(bay) {
    const grupo = new THREE.Group();
    grupo.name = `MarcadorBaia_${bay}`;

    const x = (bay - 10.5) * CONFIG.ESPACAMENTO_BAIA;
    const z = CONFIG.ROWS.length * CONFIG.ESPACAMENTO_ROW / 2 + 5;

    // Círculo base
    const geometryCirculo = new THREE.CircleGeometry(0.8, 12);
    const materialCirculo = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0.6, 0.8, 0.2),
      transparent: true,
      opacity: 0.7
    });
    
    const circulo = new THREE.Mesh(geometryCirculo, materialCirculo);
    circulo.rotation.x = -Math.PI / 2;
    circulo.position.set(x, 0.01, z);
    grupo.add(circulo);

    // Label da baia
    const label = this.criarLabelMarcador(bay.toString(), "baia");
    label.position.set(x, 2, z);
    grupo.add(label);

    return grupo;
  }

  // ===== MARCADOR DE ORIGEM =====
  criarMarcadorOrigem() {
    const grupo = new THREE.Group();
    grupo.name = "MarcadorOrigem";

    // Círculo especial para origem
    const geometryCirculo = new THREE.CircleGeometry(1.5, 20);
    const materialCirculo = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0.8, 0.2, 0.2),
      transparent: true,
      opacity: 0.8
    });
    
    const circulo = new THREE.Mesh(geometryCirculo, materialCirculo);
    circulo.rotation.x = -Math.PI / 2;
    circulo.position.set(0, 0.02, 0);
    grupo.add(circulo);

    // Cruz no centro
    const cruzMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color(1, 1, 1),
      linewidth: 3
    });

    // Linha horizontal
    const geomH = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-1, 0.03, 0),
      new THREE.Vector3(1, 0.03, 0)
    ]);
    const linhaH = new THREE.Line(geomH, cruzMaterial);
    grupo.add(linhaH);

    // Linha vertical
    const geomV = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.03, -1),
      new THREE.Vector3(0, 0.03, 1)
    ]);
    const linhaV = new THREE.Line(geomV, cruzMaterial.clone());
    grupo.add(linhaV);

    // Label de origem
    const label = this.criarLabelMarcador("ORIGEM", "origem");
    label.position.set(0, 3, 0);
    grupo.add(label);

    return grupo;
  }

  // ===== LABEL PARA MARCADOR =====
  criarLabelMarcador(texto, tipo) {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");

    // Fundo baseado no tipo
    const cores = {
      row: "rgba(32, 96, 128, 0.9)",
      baia: "rgba(96, 128, 32, 0.9)",
      origem: "rgba(128, 32, 32, 0.9)"
    };

    ctx.fillStyle = cores[tipo] || "rgba(64, 64, 64, 0.9)";
    ctx.fillRect(0, 0, 128, 64);

    // Borda
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, 124, 60);

    // Texto
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(texto, 64, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true
    });
    
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(4, 2, 1);
    
    return sprite;
  }

  // ===== EIXOS PRINCIPAIS =====
  criarEixosPrincipais() {
    console.log("📐 Criando eixos principais...");

    const eixosGroup = new THREE.Group();
    eixosGroup.name = "EixosPrincipais";

    // Eixo X (vermelho)
    const materialX = new THREE.LineBasicMaterial({
      color: new THREE.Color(0.8, 0.2, 0.2),
      linewidth: 2
    });
    
    const geometryX = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-50, 0.05, 0),
      new THREE.Vector3(50, 0.05, 0)
    ]);
    
    const eixoX = new THREE.Line(geometryX, materialX);
    eixoX.name = "EixoX";
    eixosGroup.add(eixoX);

    // Eixo Z (azul)
    const materialZ = new THREE.LineBasicMaterial({
      color: new THREE.Color(0.2, 0.2, 0.8),
      linewidth: 2
    });
    
    const geometryZ = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.05, -50),
      new THREE.Vector3(0, 0.05, 50)
    ]);
    
    const eixoZ = new THREE.Line(geometryZ, materialZ);
    eixoZ.name = "EixoZ";
    eixosGroup.add(eixoZ);

    // Setas dos eixos
    this.criarSetasEixos(eixosGroup);

    this.gridGroup.add(eixosGroup);
    console.log("✅ Eixos principais criados");
  }

  // ===== SETAS DOS EIXOS =====
  criarSetasEixos(eixosGroup) {
    // Seta X (vermelha)
    const setaX = new THREE.Mesh(
      new THREE.ConeGeometry(0.5, 2, 8),
      new THREE.MeshBasicMaterial({ color: 0xFF4444 })
    );
    setaX.position.set(50, 0.05, 0);
    setaX.rotation.z = -Math.PI / 2;
    eixosGroup.add(setaX);

    // Seta Z (azul)
    const setaZ = new THREE.Mesh(
      new THREE.ConeGeometry(0.5, 2, 8),
      new THREE.MeshBasicMaterial({ color: 0x4444FF })
    );
    setaZ.position.set(0, 0.05, 50);
    setaZ.rotation.x = Math.PI / 2;
    eixosGroup.add(setaZ);

    // Labels dos eixos
    const labelX = this.criarLabelEixo("X", 0xFF4444);
    labelX.position.set(52, 2, 0);
    eixosGroup.add(labelX);

    const labelZ = this.criarLabelEixo("Z", 0x4444FF);
    labelZ.position.set(0, 2, 52);
    eixosGroup.add(labelZ);
  }

  // ===== LABEL DE EIXO =====
  criarLabelEixo(texto, cor) {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");

    // Fundo circular
    ctx.fillStyle = `#${cor.toString(16).padStart(6, '0')}`;
    ctx.beginPath();
    ctx.arc(32, 32, 30, 0, 2 * Math.PI);
    ctx.fill();

    // Borda
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Texto
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 32px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(texto, 32, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true
    });
    
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(3, 3, 1);
    
    return sprite;
  }

  // ===== GRID POLAR (OPCIONAL) =====
  criarGridPolar() {
    const gridPolar = new THREE.Group();
    gridPolar.name = "GridPolar";
    gridPolar.visible = false; // Inicialmente oculto

    const materialPolar = new THREE.LineBasicMaterial({
      color: new THREE.Color(0.4, 0.4, 0.6),
      transparent: true,
      opacity: 0.2
    });

    // Círculos concêntricos
    for (let raio = 10; raio <= 100; raio += 10) {
      const geometry = new THREE.RingGeometry(raio - 0.1, raio + 0.1, 32);
      const anel = new THREE.Mesh(
        geometry,
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(0.4, 0.4, 0.6),
          transparent: true,
          opacity: 0.1,
          side: THREE.DoubleSide
        })
      );
      anel.rotation.x = -Math.PI / 2;
      anel.position.y = 0.01;
      gridPolar.add(anel);
    }

    // Linhas radiais
    for (let angulo = 0; angulo < 360; angulo += 30) {
      const rad = (angulo * Math.PI) / 180;
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0.01, 0),
        new THREE.Vector3(Math.sin(rad) * 100, 0.01, Math.cos(rad) * 100)
      ]);
      
      const linha = new THREE.Line(geometry, materialPolar.clone());
      gridPolar.add(linha);
    }

    this.gridGroup.add(gridPolar);
    console.log("✅ Grid polar criado (oculto)");
  }

  // ===== TOGGLE GRID SECUNDÁRIO =====
  toggleGridSecundario() {
    if (!this.gridGroup) return;

    const gridSecundario = this.gridGroup.getObjectByName("GridSecundario");
    if (gridSecundario) {
      this.gridSecundarioVisivel = !this.gridSecundarioVisivel;
      gridSecundario.visible = this.gridSecundarioVisivel;
      
      console.log(`📐 Grid secundário ${this.gridSecundarioVisivel ? 'visível' : 'oculto'}`);
    }
  }

  // ===== TOGGLE GRID POLAR =====
  toggleGridPolar() {
    if (!this.gridGroup) return;

    const gridPolar = this.gridGroup.getObjectByName("GridPolar");
    if (gridPolar) {
      gridPolar.visible = !gridPolar.visible;
      console.log(`📐 Grid polar ${gridPolar.visible ? 'visível' : 'oculto'}`);
    }
  }

  // ===== TOGGLE MARCADORES =====
  toggleMarcadores() {
    if (!this.gridGroup) return;

    this.marcadores.forEach(marcador => {
      marcador.visible = !marcador.visible;
    });

    const visivel = this.marcadores.length > 0 ? this.marcadores[0].visible : false;
    console.log(`🎯 Marcadores ${visivel ? 'visíveis' : 'ocultos'}`);
  }

  // ===== ANIMAÇÃO DE DESTAQUE =====
  destacarPosicao(row, bay, altura = null) {
    if (!this.gridGroup || this.isAnimating) return;

    console.log(`🎯 Destacando posição: ${row}${bay}${altura ? `-${altura}` : ''}`);

    this.isAnimating = true;

    // Criar marcador de destaque
    const marcadorDestaque = this.criarMarcadorDestaque(row, bay, altura);
    this.gridGroup.add(marcadorDestaque);

    // Animação pulsante
    let escala = 1;
    let crescendo = true;
    let frame = 0;

    const animar = () => {
      if (frame < 180) { // 3 segundos a 60fps
        if (crescendo) {
          escala += 0.02;
          if (escala >= 1.5) crescendo = false;
        } else {
          escala -= 0.02;
          if (escala <= 1) crescendo = true;
        }

        marcadorDestaque.scale.set(escala, 1, escala);
        frame++;
        requestAnimationFrame(animar);
      } else {
        // Remover marcador após animação
        this.gridGroup.remove(marcadorDestaque);
        this.isAnimating = false;
      }
    };

    animar();
  }

  // ===== MARCADOR DE DESTAQUE =====
  criarMarcadorDestaque(row, bay, altura) {
    const grupo = new THREE.Group();
    grupo.name = "MarcadorDestaque";

    // Calcular posição
    const rowIndex = CONFIG.ROWS.indexOf(String(row).toUpperCase());
    const x = (bay - 10.5) * CONFIG.ESPACAMENTO_BAIA;
    const z = (rowIndex - 2) * CONFIG.ESPACAMENTO_ROW;
    const y = altura ? (altura - 1) * CONFIG.ALTURA_CONTAINER + CONFIG.ALTURA_CONTAINER / 2 : 0;

    // Círculo de destaque
    const geometryCirculo = new THREE.CircleGeometry(
      CONFIG.ESPACAMENTO_BAIA / 2,
      32
    );
    const materialCirculo = new THREE.MeshBasicMaterial({
      color: new THREE.Color(1, 0.8, 0.2),
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    });
    
    const circulo = new THREE.Mesh(geometryCirculo, materialCirculo);
    circulo.rotation.x = -Math.PI / 2;
    circulo.position.set(x, y + 0.1, z);
    grupo.add(circulo);

    // Borda do círculo
    const geometryBorda = new THREE.RingGeometry(
      CONFIG.ESPACAMENTO_BAIA / 2 - 0.2,
      CONFIG.ESPACAMENTO_BAIA / 2 + 0.2,
      32
    );
    const materialBorda = new THREE.MeshBasicMaterial({
      color: new THREE.Color(1, 0.6, 0),
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    
    const borda = new THREE.Mesh(geometryBorda, materialBorda);
    borda.rotation.x = -Math.PI / 2;
    borda.position.set(x, y + 0.15, z);
    grupo.add(borda);

    // Label de destaque
    const label = this.criarLabelDestaque(row, bay, altura);
    label.position.set(x, y + 5, z);
    grupo.add(label);

    return grupo;
  }

  // ===== LABEL DE DESTAQUE =====
  criarLabelDestaque(row, bay, altura) {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");

    // Fundo com gradiente dourado
    const gradient = ctx.createLinearGradient(0, 0, 256, 128);
    gradient.addColorStop(0, "rgba(255, 215, 0, 0.9)");
    gradient.addColorStop(1, "rgba(255, 140, 0, 0.9)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 128);

    // Borda
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 3;
    ctx.strokeRect(3, 3, 250, 122);

    // Texto
    ctx.fillStyle = "#000000";
    ctx.font = "bold 24px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    const texto = altura ? 
      `${row}${String(bay).padStart(2, '0')}-${altura}` : 
      `${row}${String(bay).padStart(2, '0')}`;
    
    ctx.fillText(texto, 128, 50);
    
    // Subtexto
    ctx.font = "16px Arial";
    ctx.fillText("POSIÇÃO DESTACADA", 128, 85);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true
    });
    
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(8, 4, 1);
    
    return sprite;
  }

  // ===== AJUSTAR OPACIDADE DO GRID =====
  ajustarOpacidade(novaOpacidade) {
    if (!this.gridGroup) return;

    this.gridGroup.traverse((child) => {
      if (child.material && child.material.transparent !== undefined) {
        child.material.opacity = novaOpacidade;
      }
    });

    console.log(`📐 Opacidade do grid ajustada para: ${novaOpacidade}`);
  }

  // ===== ALTERNAR COR DO GRID =====
  alternarCorGrid(novaCor) {
    if (!this.gridGroup) return;

    const cor = new THREE.Color(novaCor);

    this.gridGroup.traverse((child) => {
      if (child.material && child.material.color) {
        child.material.color = cor.clone();
      }
    });

    console.log(`📐 Cor do grid alterada para: #${cor.getHexString()}`);
  }

  // ===== RESET DO GRID =====
  resetGrid() {
    if (!this.gridGroup) return;

    console.log("🔄 Resetando grid...");

    // Restaurar opacidades padrão
    const gridPrincipal = this.gridGroup.getObjectByName("GridPrincipal");
    if (gridPrincipal) {
      gridPrincipal.material.opacity = 0.3;
    }

    const gridSecundario = this.gridGroup.getObjectByName("GridSecundario");
    if (gridSecundario) {
      gridSecundario.material.opacity = 0.15;
      gridSecundario.visible = false;
    }

    // Ocultar grid polar
    const gridPolar = this.gridGroup.getObjectByName("GridPolar");
    if (gridPolar) {
      gridPolar.visible = false;
    }

    // Mostrar marcadores
    this.marcadores.forEach(marcador => {
      marcador.visible = true;
    });

    this.gridSecundarioVisivel = false;
    console.log("✅ Grid resetado");
  }

  // ===== INFORMAÇÕES DO GRID =====
  getInfo() {
    return {
      gridAtivo: !!this.gridGroup,
      gridVisivel: this.gridVisisvel,
      gridSecundarioVisivel: this.gridSecundarioVisivel,
      marcadores: this.marcadores.length,
      isAnimating: this.isAnimating,
      elementos: this.gridGroup ? this.gridGroup.children.length : 0
    };
  }

  // ===== LIMPEZA =====
  dispose() {
    console.log("🧹 Limpando sistema de grid...");

    if (this.gridGroup) {
      // Limpar marcadores
      this.marcadores.forEach(marcador => {
        marcador.traverse((child) => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (child.material.map) child.material.map.dispose();
            child.material.dispose();
          }
        });
      });
      this.marcadores = [];

      // Limpar grupo principal
      this.gridGroup.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (child.material.map) child.material.map.dispose();
          child.material.dispose();
        }
      });

      while (this.gridGroup.children.length > 0) {
        this.gridGroup.remove(this.gridGroup.children[0]);
      }

      this.gridGroup = null;
    }

    this.gridDetalhado = null;
    this.isAnimating = false;

    console.log("✅ Sistema de grid limpo");
  }
}