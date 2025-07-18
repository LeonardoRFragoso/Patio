/**
 * Sistema de Infraestrutura Realística - MUROS COM ABERTURAS PARA ACESSO
 * Arquivo: components/infrastructure.js
 * 
 * ✅ ABERTURAS NOS MUROS PARA ENTRADA/SAÍDA
 * ✅ SEPARAÇÃO MÁXIMA: 60 UNIDADES entre muros e vias
 * ✅ VIAS DE TRANSPORTE EXTERNAS À EMPRESA  
 * ✅ MUROS CERCAM APENAS O PÁTIO DA EMPRESA
 * ✅ ESTRUTURAS DOS PORTÕES NAS ABERTURAS
 * ✅ RODOVIA EXTERNA (FORA DO MURO NORTE)
 * ✅ FERROVIA EXTERNA (FORA DO MURO SUL)
 * ✅ LAYOUT REALISTA SUZANO-SP
 * ✅ PLACAS CORRIGIDAS - SEM ULTRAPASSAR LIMITES
 * ✅ GUARITA DENTRO DOS MUROS - COLADA AO MURO OESTE
 */

// THREE é carregado globalmente via <script> na página
const THREE = window.THREE;
import { CONFIG } from '../utils/constants.js';

export class Infrastructure {
  constructor() {
    this.infraestruturaGroup = null;
    this.infraestruturaVisivel = true;
    this.textureLoader = new THREE.TextureLoader();
    this.materialsCache = new Map();
    this.isCreating = false;
  }

  // ===== CRIAR INFRAESTRUTURA REALÍSTICA COMPLETA =====
  async criarInfraestruturaRealistica() {
    console.log("🏗️ CRIANDO INFRAESTRUTURA COM ABERTURAS NOS MUROS...");
    
    if (this.isCreating) return this.infraestruturaGroup;
    this.isCreating = true;

    try {
      // Criar grupo principal
      this.infraestruturaGroup = new THREE.Group();
      this.infraestruturaGroup.name = "Infraestrutura";

      const patioWidth = CONFIG.BAIAS_MAX * CONFIG.ESPACAMENTO_BAIA;
      const patioDepth = CONFIG.ROWS.length * CONFIG.ESPACAMENTO_ROW;

      // ===== CRIAR TODOS OS ELEMENTOS =====
      
      // 1. Base do pátio
      await this.criarBasePatio(patioWidth, patioDepth);
      
      // 2. Rua asfaltada (EXTERNA - fora do muro norte)
      await this.criarRuaRealistica(patioWidth, patioDepth);
      
      // 2.1 Faixas na rua
      await this.criarFaixasRua(patioWidth, patioDepth);
      
      // 3. Ferrovia (EXTERNA - fora do muro sul)
      await this.criarFerroviaRealistica(patioWidth, patioDepth);
      
      // 4. Muros da empresa (com aberturas para entrada/saída)
      await this.criarMurosCorrigidos(patioWidth, patioDepth);
      
      // 5. Estruturas dos portões (nas aberturas)
      await this.criarPortoesCorrigidos(patioWidth, patioDepth);
      
      // 6. Composição ferroviária (na via externa)
      await this.criarComposicaoFerrovia(patioWidth, patioDepth);
      
      // 7. Elementos decorativos
      await this.criarElementosDecorativos(patioWidth, patioDepth);

      this.infraestruturaGroup.visible = true;
      this.isCreating = false;

      console.log("🎉 INFRAESTRUTURA COM ABERTURAS NOS MUROS CRIADA!");
      return this.infraestruturaGroup;

    } catch (error) {
      console.error(`❌ Erro ao criar infraestrutura: ${error.message}`);
      this.isCreating = false;
      return null;
    }
  }

  // ===== BASE DO PÁTIO COM TEXTURA DE CONCRETO =====
  async criarBasePatio(patioWidth, patioDepth) {
    console.log("🏗️ Criando base de concreto do pátio...");

    const concretoMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.6, 0.6, 0.65),
      roughness: 0.8,
      metalness: 0.0,
      map: this.criarTexturaConcreto()
    });

    const base = new THREE.Mesh(
      new THREE.PlaneGeometry(patioWidth + 10, patioDepth + 10),
      concretoMaterial
    );
    base.rotation.x = -Math.PI / 2;
    base.position.y = -0.1;
    base.receiveShadow = true;
    base.name = "BasePatio";
    
    this.infraestruturaGroup.add(base);
    console.log("✅ Base de concreto criada");
  }

  // ===== RUA ASFALTADA (EXTERNA - FORA DO MURO NORTE) =====
  async criarRuaRealistica(patioWidth, patioDepth) {
    console.log("🛣️ Criando rua asfaltada EXTERNA (fora do muro norte)...");

    const ruaWidth = patioWidth + 100; // Largura um pouco menor para melhor visualização
    const ruaLength = 45; // Espessura da rua
    const espacamentoMuro = 25; // Espaço do pátio até o muro
    const espacoExterno = 60; // MUITO MAIS ESPAÇO FORA do muro até a rodovia
    const ruaDistance = espacamentoMuro + espacoExterno; // Distância total EXTERNA

    // Material de asfalto
    const asfaltoMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.15, 0.15, 0.15),
      roughness: 0.9,
      metalness: 0.0,
      map: this.criarTexturaAsfalto(),
    });

    // Base da rua - EXTERNA ao muro norte
    const rua = new THREE.Mesh(
      new THREE.PlaneGeometry(ruaWidth, ruaLength),
      asfaltoMaterial
    );
    rua.rotation.x = -Math.PI / 2;
    rua.position.set(0, 0.01, -patioDepth / 2 - ruaDistance); // MUITO MAIS EXTERNA
    rua.receiveShadow = true;
    rua.name = "RuaPrincipal";
    this.infraestruturaGroup.add(rua);

    // Nota: As faixas da rua são criadas separadamente no método principal

    // Calçada
    await this.criarCalcada(patioWidth, patioDepth, ruaDistance, ruaWidth, ruaLength);

    // Postes de iluminação
    await this.criarPostesIluminacao(-patioDepth / 2 - ruaDistance, ruaWidth, ruaLength);

    console.log("✅ Rua asfaltada criada BEM EXTERNA (fora do muro norte)");
  }

  // ===== FERROVIA (EXTERNA - FORA DO MURO SUL) =====
  async criarFerroviaRealistica(patioWidth, patioDepth) {
    console.log(" Criando ferrovia EXTERNA (fora do muro sul)...");

    const ferroviaWidth = patioWidth + 100; // Largura um pouco menor para melhor visualização
    const ferroviaLength = 40; // Espessura da ferrovia
    const espacamentoMuro = 25; // Espaço do pátio até o muro
    const espacoExterno = 15; // CORREÇÃO: Reduzido de 60 para 15 - ferrovia mais próxima do muro
    const ferroviaDistance = espacamentoMuro + espacoExterno; // Distância total EXTERNA

    // Material de brita
    const britaMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.5, 0.5, 0.55),
      roughness: 0.9,
      metalness: 0.0,
      map: this.criarTexturaBrita()
    });

    const ferrovia = new THREE.Mesh(
      new THREE.PlaneGeometry(ferroviaWidth, ferroviaLength),
      britaMaterial
    );
    ferrovia.rotation.x = -Math.PI / 2;
    ferrovia.position.set(0, 0.01, patioDepth / 2 + ferroviaDistance); // MUITO MAIS EXTERNA
    ferrovia.receiveShadow = true;
    ferrovia.name = "FerroviaPrincipal";
    this.infraestruturaGroup.add(ferrovia);

    // Trilhos de aço
    await this.criarTrilhos(patioWidth, patioDepth, ferroviaDistance, ferroviaWidth, ferroviaLength);

    // Dormentes
    await this.criarDormentes(patioWidth, patioDepth, ferroviaDistance, ferroviaWidth, ferroviaLength);

    console.log("✅ Ferrovia criada BEM EXTERNA (fora do muro sul)");
  }

  // ===== MUROS DA EMPRESA - CERCANDO APENAS O PÁTIO (COM ABERTURAS) =====
  async criarMurosCorrigidos(patioWidth, patioDepth) {
    console.log(" Criando muros da empresa COM ABERTURAS para entrada/saída...");

    const muroHeight = 6; // 🔧 CORREÇÃO: Reduzido de 12 para 6 para melhor visibilidade dos containers
    const muroThickness = 2.0;
    const espacamentoMuro = 25; // Espaçamento do pátio até os muros
    const aberturaPortao = 25; // Largura da abertura para os portões

    // Material de tijolo avançado
    const muroMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.6, 0.35, 0.25),
      roughness: 0.8,
      metalness: 0.1,
      map: this.criarTexturaTijolo(),
      normalMap: this.criarNormalMapTijolo(),
      normalScale: new THREE.Vector2(1.5, 1.5),
    });

    // Muros laterais (sem aberturas)
    const murosLaterais = [
      // Muro Oeste - LATERAL MENOR ESQUERDA (apenas cerca o pátio)
      {
        geometry: new THREE.BoxGeometry(muroThickness, muroHeight, patioDepth + espacamentoMuro * 2),
        position: [-patioWidth / 2 - espacamentoMuro, muroHeight / 2, 0],
        name: "Muro_Oeste"
      },
      // Muro Leste - LATERAL MENOR DIREITA (apenas cerca o pátio)
      {
        geometry: new THREE.BoxGeometry(muroThickness, muroHeight, patioDepth + espacamentoMuro * 2),
        position: [patioWidth / 2 + espacamentoMuro, muroHeight / 2, 0],
        name: "Muro_Leste"
      }
    ];

    // Adicionar muros laterais (sem aberturas)
    murosLaterais.forEach((muroConfig) => {
      const muro = new THREE.Mesh(muroConfig.geometry, muroMaterial.clone());
      muro.position.set(...muroConfig.position);
      muro.castShadow = true;
      muro.receiveShadow = true;
      muro.name = muroConfig.name;
      this.infraestruturaGroup.add(muro);
    });

    // Calcular largura total dos muros norte/sul
    const larguraTotalMuro = patioWidth + espacamentoMuro * 2;
    
    // Calcular largura de cada segmento (metade da largura total menos metade da abertura)
    const segmentoLargura = (larguraTotalMuro - aberturaPortao) / 2;

    // Muro Norte - LATERAL MAIOR SUPERIOR (COM ABERTURA)
    const segmentosNorte = [
      // Segmento esquerdo
      {
        geometry: new THREE.BoxGeometry(segmentoLargura, muroHeight, muroThickness),
        position: [-aberturaPortao/2 - segmentoLargura/2, muroHeight / 2, -patioDepth / 2 - espacamentoMuro],
        name: "Muro_Norte_Esquerdo"
      },
      // Segmento direito
      {
        geometry: new THREE.BoxGeometry(segmentoLargura, muroHeight, muroThickness),
        position: [aberturaPortao/2 + segmentoLargura/2, muroHeight / 2, -patioDepth / 2 - espacamentoMuro],
        name: "Muro_Norte_Direito"
      }
    ];

    // Muro Sul - LATERAL MAIOR INFERIOR (COM ABERTURA)
    const segmentosSul = [
      // Segmento esquerdo
      {
        geometry: new THREE.BoxGeometry(segmentoLargura, muroHeight, muroThickness),
        position: [-aberturaPortao/2 - segmentoLargura/2, muroHeight / 2, patioDepth / 2 + espacamentoMuro],
        name: "Muro_Sul_Esquerdo"
      },
      // Segmento direito
      {
        geometry: new THREE.BoxGeometry(segmentoLargura, muroHeight, muroThickness),
        position: [aberturaPortao/2 + segmentoLargura/2, muroHeight / 2, patioDepth / 2 + espacamentoMuro],
        name: "Muro_Sul_Direito"
      }
    ];

    // Adicionar segmentos do muro norte
    segmentosNorte.forEach((segmento) => {
      const muro = new THREE.Mesh(segmento.geometry, muroMaterial.clone());
      muro.position.set(...segmento.position);
      muro.castShadow = true;
      muro.receiveShadow = true;
      muro.name = segmento.name;
      this.infraestruturaGroup.add(muro);
    });

    // Adicionar segmentos do muro sul
    segmentosSul.forEach((segmento) => {
      const muro = new THREE.Mesh(segmento.geometry, muroMaterial.clone());
      muro.position.set(...segmento.position);
      muro.castShadow = true;
      muro.receiveShadow = true;
      muro.name = segmento.name;
      this.infraestruturaGroup.add(muro);
    });

    console.log("✅ Muros da empresa criados COM ABERTURAS para entrada/saída");
  }

  // ===== ESTRUTURAS DOS PORTÕES NAS ABERTURAS =====
  async criarPortoesCorrigidos(patioWidth, patioDepth) {
    console.log("🚪 Criando estruturas dos portões nas aberturas...");

    const portaoHeight = 15; // Aumentado para acomodar as placas maiores
    const espacamentoMuro = 25; // Distância do pátio até os muros da empresa
    const aberturaPortao = 25; // Largura da abertura

    // Posições dos muros da empresa
    const posicaoMuroNorte = -patioDepth / 2 - espacamentoMuro;
    const posicaoMuroSul = patioDepth / 2 + espacamentoMuro;

    // ESTRUTURA DE ENTRADA (azul) - LATERAIS DA ABERTURA NORTE
    // Placa na estrutura da esquerda
    const estruturaEntrada1 = this.criarEstruturaPortao(
      -aberturaPortao / 2 - 2, // Lado esquerdo da abertura
      portaoHeight / 2,
      posicaoMuroNorte - 1, // Ligeiramente deslocado para fora do muro
      new THREE.Color(0.2, 0.4, 0.8), // Azul
      "ENTRADA"
    );
    this.infraestruturaGroup.add(estruturaEntrada1);

    // Estrutura da direita sem placa para evitar duplicação
    const estruturaEntrada2 = this.criarEstruturaPortaoSemPlaca(
      aberturaPortao / 2 + 2, // Lado direito da abertura
      portaoHeight / 2,
      posicaoMuroNorte - 1, // Ligeiramente deslocado para fora do muro
      new THREE.Color(0.2, 0.4, 0.8) // Azul
    );
    this.infraestruturaGroup.add(estruturaEntrada2);

    // ESTRUTURA DE SAÍDA (vermelho) - LATERAIS DA ABERTURA SUL
    // Placa na estrutura da esquerda
    const estruturaSaida1 = this.criarEstruturaPortao(
      -aberturaPortao / 2 - 2, // Lado esquerdo da abertura
      portaoHeight / 2,
      posicaoMuroSul + 1, // Ligeiramente deslocado para fora do muro
      new THREE.Color(0.8, 0.3, 0.2), // Vermelho
      "SAÍDA"
    );
    this.infraestruturaGroup.add(estruturaSaida1);

    // Estrutura da direita sem placa para evitar duplicação
    const estruturaSaida2 = this.criarEstruturaPortaoSemPlaca(
      aberturaPortao / 2 + 2, // Lado direito da abertura
      portaoHeight / 2,
      posicaoMuroSul + 1, // Ligeiramente deslocado para fora do muro
      new THREE.Color(0.8, 0.3, 0.2) // Vermelho
    );
    this.infraestruturaGroup.add(estruturaSaida2);

    console.log("✅ Estruturas dos portões criadas nas aberturas");
  }

  // ===== CRIAR ESTRUTURA DO PORTÃO (PILARES LATERAIS) =====
  criarEstruturaPortao(x, y, z, cor, tipo) {
    const estruturaGroup = new THREE.Group();
    estruturaGroup.name = `Estrutura_${tipo}`;

    // Pilar lateral
    const pilar = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 12, 2), // Pilar estreito e alto
      new THREE.MeshStandardMaterial({
        color: cor,
        metalness: 0.7,
        roughness: 0.3,
      })
    );
    pilar.position.set(x, y, z);
    pilar.castShadow = true;
    pilar.receiveShadow = true;
    estruturaGroup.add(pilar);

    // Placa identificadora - CORRIGIDA para não ultrapassar limites
    const placa = this.criarPlacaPortao(tipo, cor);
    
    // ✅ CORREÇÃO: Placa alinhada com o muro (sem offset Z)
    placa.position.set(x, y + 4, z); // Placa centralizada no pilar
    
    estruturaGroup.add(placa);

    // Luz do portão - mais alta para iluminar a placa
    const luzPortao = new THREE.PointLight(cor, 1.5, 15);
    luzPortao.position.set(x, y + 6, z);
    luzPortao.castShadow = false;
    estruturaGroup.add(luzPortao);

    return estruturaGroup;
  }
  
  // ===== CRIAR ESTRUTURA DO PORTÃO SEM PLACA =====
  criarEstruturaPortaoSemPlaca(x, y, z, cor) {
    const estruturaGroup = new THREE.Group();
    estruturaGroup.name = "Estrutura_Pilar";

    // Pilar lateral
    const pilar = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 12, 2), // Pilar estreito e alto
      new THREE.MeshStandardMaterial({
        color: cor,
        metalness: 0.7,
        roughness: 0.3,
      })
    );
    pilar.position.set(x, y, z);
    pilar.castShadow = true;
    pilar.receiveShadow = true;
    estruturaGroup.add(pilar);

    // Luz do portão - mais alta para manter consistência
    const luzPortao = new THREE.PointLight(cor, 1.5, 15);
    luzPortao.position.set(x, y + 6, z);
    luzPortao.castShadow = false;
    estruturaGroup.add(luzPortao);

    return estruturaGroup;
  }

  // ===== CRIAR PLACA DO PORTÃO (TAMANHO REDUZIDO) =====
  criarPlacaPortao(tipo, cor) {
    const canvas = document.createElement("canvas");
    canvas.width = 256; // Reduzir resolução para menor tamanho
    canvas.height = 128;
    const ctx = canvas.getContext("2d");

    // Fundo com maior opacidade
    ctx.fillStyle = "rgba(0, 0, 0, 1.0)";
    ctx.fillRect(0, 0, 256, 128);

    // Borda mais grossa
    ctx.strokeStyle = `rgb(${cor.r * 255}, ${cor.g * 255}, ${cor.b * 255})`;
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, 248, 120);

    // Texto maior e mais brilhante
    ctx.fillStyle = "#FFFFFF"; // Texto branco para maior contraste
    ctx.font = "bold 36px Arial"; // Fonte menor
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(tipo, 128, 64);
    
    // Contorno colorido no texto para destacar
    ctx.strokeStyle = `rgb(${cor.r * 255}, ${cor.g * 255}, ${cor.b * 255})`;
    ctx.lineWidth = 2;
    ctx.strokeText(tipo, 128, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 16; // Melhorar nitidez em ângulos
    
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      sizeAttenuation: true // Manter tamanho consistente
    });
    
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(3, 1.5, 1); // ✅ REDUZIDO: de (4, 2, 1) para (3, 1.5, 1)
    
    return sprite;
  }

  // ===== CRIAR FAIXAS NA RUA =====
  async criarFaixasRua(patioWidth, patioDepth) {
    console.log("🛣️ Criando faixas na rua...");
    
    // Calcular os mesmos parâmetros usados em criarRuaRealistica
    const ruaWidth = patioWidth + 100;
    const ruaLength = 45;
    const espacamentoMuro = 25;
    const espacoExterno = 60;
    const ruaDistance = espacamentoMuro + espacoExterno;
    
    // Material para as faixas brancas
    const faixaMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.9, 0.9, 0.9),
      roughness: 0.1,
      metalness: 0.0,
      emissive: new THREE.Color(0.05, 0.05, 0.05),
    });

    // Faixa central dupla
    for (let offset of [-1.5, 1.5]) {
      const faixaCentral = new THREE.Mesh(
        new THREE.PlaneGeometry(ruaWidth, 0.4),
        faixaMaterial.clone()
      );
      faixaCentral.rotation.x = -Math.PI / 2;
      faixaCentral.position.set(
        0,
        0.02,
        -patioDepth / 2 - ruaDistance + offset
      );
      faixaCentral.name = `FaixaCentral_${offset}`;
      this.infraestruturaGroup.add(faixaCentral);
    }

    // Faixas laterais
    for (let lado of [-1, 1]) {
      const faixaLateral = new THREE.Mesh(
        new THREE.PlaneGeometry(ruaWidth, 0.3),
        faixaMaterial.clone()
      );
      faixaLateral.rotation.x = -Math.PI / 2;
      faixaLateral.position.set(
        0,
        0.02,
        -patioDepth / 2 - ruaDistance + lado * (ruaLength / 2 - 2)
      );
      faixaLateral.name = `FaixaLateral_${lado}`;
      this.infraestruturaGroup.add(faixaLateral);
    }
  }

  // ===== CRIAR CALÇADA =====
  async criarCalcada(patioWidth, patioDepth, ruaDistance, ruaWidth, ruaLength) {
    const calcadaMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.7, 0.7, 0.7),
      roughness: 0.6,
      metalness: 0.0,
    });

    const calcada = new THREE.Mesh(
      new THREE.PlaneGeometry(ruaWidth, 8),
      calcadaMaterial
    );
    calcada.rotation.x = -Math.PI / 2;
    calcada.position.set(0, 0.005, -patioDepth / 2 - ruaDistance - ruaLength / 2 - 4);
    calcada.receiveShadow = true;
    calcada.name = "Calcada";
    this.infraestruturaGroup.add(calcada);
  }

  // ===== CRIAR TRILHOS =====
  async criarTrilhos(patioWidth, patioDepth, ferroviaDistance, ferroviaWidth, ferroviaLength) {
    const trilhoMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.8, 0.8, 0.9),
      metalness: 0.9,
      roughness: 0.1,
      envMapIntensity: 1.0,
    });

    // Dois trilhos paralelos - CORRIGIDO: posicionamento sobre a base da ferrovia
    const trilhoSeparacao = 1.435; // Distância padrão entre trilhos (bitola padrão em metros)
    
    for (let lado of [-trilhoSeparacao/2, trilhoSeparacao/2]) {
      const trilho = new THREE.Mesh(
        new THREE.BoxGeometry(ferroviaWidth * 0.95, 0.15, 0.2), // Trilho ao longo do eixo X, sobre a base
        trilhoMaterial.clone()
      );
      // POSICIONAMENTO CORRIGIDO: trilhos centralizados sobre a base da ferrovia
      trilho.position.set(
        lado, // Separação lateral dos trilhos
        0.25, // Altura sobre a base da ferrovia (0.01 da base + 0.15 dos dormentes + 0.09 de elevação)
        patioDepth / 2 + ferroviaDistance // Mesma posição Z da base da ferrovia
      );
      trilho.castShadow = true;
      trilho.receiveShadow = true;
      trilho.name = `Trilho_${lado > 0 ? 'Direito' : 'Esquerdo'}`;
      this.infraestruturaGroup.add(trilho);
    }
    
    console.log("✅ Trilhos posicionados corretamente sobre a base da ferrovia");
  }

  // ===== CRIAR DORMENTES =====
  async criarDormentes(patioWidth, patioDepth, ferroviaDistance, ferroviaWidth, ferroviaLength) {
    const dormenteMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.4, 0.25, 0.15),
      roughness: 0.8,
      metalness: 0.0,
      map: this.criarTexturaMadeira()
    });

    // CORRIGIDO: Dormentes perpendiculares aos trilhos, com espaçamento adequado
    const espacamentoDormentes = 0.6; // Espaçamento padrão entre dormentes (60cm)
    const numDormentes = Math.floor(ferroviaWidth * 0.9 / espacamentoDormentes);
    const inicioX = -(ferroviaWidth * 0.9) / 2;
    
    for (let i = 0; i < numDormentes; i++) {
      const dormente = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.15, 2.5), // CORRIGIDO: dormentes perpendiculares aos trilhos (Z maior que X)
        dormenteMaterial.clone()
      );
      
      // POSICIONAMENTO CORRIGIDO: dormentes centralizados e perpendiculares aos trilhos
      const posX = inicioX + (i * espacamentoDormentes);
      dormente.position.set(
        posX, // Posição ao longo da ferrovia
        0.15, // Altura sobre a base da ferrovia (0.01 da base + 0.14 de elevação)
        patioDepth / 2 + ferroviaDistance // Mesma posição Z da base da ferrovia
      );
      
      dormente.castShadow = true;
      dormente.receiveShadow = true;
      dormente.name = `Dormente_${i}`;
      this.infraestruturaGroup.add(dormente);
    }
    
    console.log(`✅ ${numDormentes} dormentes posicionados corretamente sob os trilhos`);
  }

  // ===== COMPOSIÇÃO FERROVIÁRIA =====
  async criarComposicaoFerrovia(patioWidth, patioDepth) {
    console.log("🚂 Criando composição ferroviária...");

    const espacamentoMuro = 25; // Espaço do pátio até o muro
    const espacoExterno = 15; // CORRIGIDO: Reduzido de 60 para 15 - ferrovia mais próxima do muro (mesmo valor usado em criarFerroviaRealistica)
    const ferroviaDistance = espacamentoMuro + espacoExterno; // Distância total EXTERNA
    const posicaoTrem = patioDepth / 2 + ferroviaDistance; // Posição Z da ferrovia

    // Locomotiva
    const locomotiva = await this.criarLocomotiva(posicaoTrem, patioWidth);
    this.infraestruturaGroup.add(locomotiva);

    // Vagões de container (3 vagões)
    for (let vagao = 0; vagao < 3; vagao++) {
      const vagaoGroup = await this.criarVagaoContainer(posicaoTrem, patioWidth, vagao);
      this.infraestruturaGroup.add(vagaoGroup);
    }

    console.log("✅ Composição ferroviária posicionada sobre os trilhos");
  }

  // ===== CRIAR LOCOMOTIVA =====
  async criarLocomotiva(posicaoTrem, patioWidth) {
    const locomotiva = new THREE.Group();
    locomotiva.name = "Locomotiva";

    // Posicionar a locomotiva exatamente sobre os trilhos
    // Alinhando com o centro da ferrovia
    const deslocamentoLateral = 0; // Centro da ferrovia

    // Corpo principal da locomotiva
    const corpoLocomotiva = new THREE.Mesh(
      new THREE.BoxGeometry(20, 3.5, 4),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(0.8, 0.3, 0.1),
        metalness: 0.7,
        roughness: 0.3,
      })
    );
    corpoLocomotiva.position.set(0, 1.5, posicaoTrem + deslocamentoLateral); // Alinhado com os trilhos no X=0
    corpoLocomotiva.castShadow = true;
    locomotiva.add(corpoLocomotiva);

    // Cabine da locomotiva
    const cabine = new THREE.Mesh(
      new THREE.BoxGeometry(8, 2.5, 3.5),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(0.9, 0.4, 0.1),
        metalness: 0.8,
        roughness: 0.2,
      })
    );
    cabine.position.set(6, 3.2, posicaoTrem + deslocamentoLateral); // Alinhado com os trilhos no X=0
    cabine.castShadow = true;
    locomotiva.add(cabine);

    // Rodas da locomotiva - alinhadas com os trilhos
    const rodaMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.2, 0.2, 0.2),
      metalness: 0.8,
      roughness: 0.4,
    });

    // Posicionar as rodas alinhadas com os trilhos
    for (let i = 0; i < 6; i++) {
      for (let lado of [-1.5, 1.5]) { // Ajustado para alinhar com os trilhos
        const roda = new THREE.Mesh(
          new THREE.CylinderGeometry(0.6, 0.6, 0.3),
          rodaMaterial.clone()
        );
        roda.rotation.x = Math.PI / 2;
        roda.position.set(-patioWidth / 3 - 8 + i * 3, 0.6, posicaoTrem + lado);
        roda.castShadow = true;
        locomotiva.add(roda);
      }
    }

    // Chaminé
    const chamine = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.4, 3),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(0.3, 0.3, 0.3),
        metalness: 0.7,
        roughness: 0.3,
      })
    );
    chamine.position.set(-patioWidth / 3 - 2, 5.5, posicaoTrem + deslocamentoLateral);
    chamine.castShadow = true;
    locomotiva.add(chamine);

    return locomotiva;
  }

  // ===== CRIAR VAGÃO DE CONTAINER =====
  async criarVagaoContainer(posicaoTrem, patioWidth, vagaoIndex) {
    const vagaoGroup = new THREE.Group();
    vagaoGroup.name = `Vagao_${vagaoIndex}`;
    
    // Posicionar o vagão exatamente sobre os trilhos
    // Alinhando com o centro da ferrovia
    const deslocamentoLateral = 0; // Centro da ferrovia
    
    // Calcular posição X base para todos os vagões
    // Alinhado com os trilhos no X=0
    const posicaoXBase = 25 + vagaoIndex * 25;

    // Plataforma do vagão
    const plataforma = new THREE.Mesh(
      new THREE.BoxGeometry(18, 0.4, 3.5),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(0.3, 0.3, 0.3),
        metalness: 0.6,
        roughness: 0.5,
      })
    );
    plataforma.position.set(posicaoXBase, 0.8, posicaoTrem + deslocamentoLateral);
    plataforma.castShadow = true;
    vagaoGroup.add(plataforma);

    // Container no vagão
    const cores = [
      new THREE.Color(0.1, 0.6, 0.95), // MAERSK
      new THREE.Color(1.0, 0.6, 0.0),  // MSC
      new THREE.Color(0.2, 0.8, 0.3)   // EVERGREEN
    ];

    const containerVagao = new THREE.Mesh(
      new THREE.BoxGeometry(16, 2.5, 3.2),
      new THREE.MeshStandardMaterial({
        color: cores[vagaoIndex % cores.length],
        metalness: 0.4,
        roughness: 0.6,
      })
    );
    containerVagao.position.set(
      posicaoXBase,
      2.5,
      posicaoTrem + deslocamentoLateral
    );
    containerVagao.castShadow = true;
    vagaoGroup.add(containerVagao);

    // Rodas do vagão - alinhadas com os trilhos
    const rodaMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.2, 0.2, 0.2),
      metalness: 0.8,
      roughness: 0.4,
    });

    // Usar exatamente os mesmos valores de deslocamento lateral que os trilhos
    for (let i = 0; i < 4; i++) {
      for (let lado of [-2.0, 2.0]) { // Mesmo valor usado nos trilhos
        const rodaVagao = new THREE.Mesh(
          new THREE.CylinderGeometry(0.5, 0.5, 0.25),
          rodaMaterial.clone()
        );
        rodaVagao.rotation.x = Math.PI / 2;
        rodaVagao.position.set(
          posicaoXBase - 6 + i * 4,
          0.5,
          posicaoTrem + lado
        );
        rodaVagao.castShadow = true;
        vagaoGroup.add(rodaVagao);
      }
    }

    return vagaoGroup;
  }

  // ===== ELEMENTOS DECORATIVOS PREMIUM =====
  async criarElementosDecorativos(patioWidth, patioDepth) {
    console.log("💡 Criando elementos decorativos premium...");

    // Torres de iluminação nos cantos
    const posicoes = [
      [-patioWidth / 2 - 10, -patioDepth / 2 - 5],
      [patioWidth / 2 + 10, -patioDepth / 2 - 5],
      [-patioWidth / 2 - 10, patioDepth / 2 + 5],
      [patioWidth / 2 + 10, patioDepth / 2 + 5]
    ];

    posicoes.forEach((pos, index) => {
      const torre = this.criarTorreIluminacao(pos[0], pos[1]);
      torre.name = `TorreIluminacao_${index}`;
      this.infraestruturaGroup.add(torre);
    });

    // Guarita de segurança
    const guarita = await this.criarGuarita(patioWidth, patioDepth);
    this.infraestruturaGroup.add(guarita);

    console.log("✅ Elementos decorativos premium criados");
  }

  // ===== CRIAR TORRE DE ILUMINAÇÃO =====
  criarTorreIluminacao(x, z) {
    const torre = new THREE.Group();

    // Poste principal
    const poste = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.4, 25),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(0.4, 0.4, 0.4),
        metalness: 0.7,
        roughness: 0.3,
      })
    );
    poste.position.set(x, 12.5, z);
    poste.castShadow = true;
    torre.add(poste);

    // Holofote principal
    const holofote = new THREE.Mesh(
      new THREE.SphereGeometry(1.5),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(0.9, 0.9, 0.8),
        metalness: 0.8,
        roughness: 0.1,
        emissive: new THREE.Color(0.1, 0.1, 0.05),
      })
    );
    holofote.position.set(x, 22, z);
    holofote.castShadow = true;
    torre.add(holofote);

    // Luz spot do holofote
    const spotLight = new THREE.SpotLight(
      0xffffe0,
      2.0,
      150,
      Math.PI / 6,
      0.5
    );
    spotLight.position.set(x, 24, z);
    spotLight.target.position.set(x, 0, z);
    spotLight.castShadow = false;
    spotLight.shadow.mapSize.width = 512;
    spotLight.shadow.mapSize.height = 512;
    torre.add(spotLight);
    torre.add(spotLight.target);

    return torre;
  }

  // ===== CRIAR GUARITA (DENTRO DOS MUROS - COLADA AO MURO OESTE) =====
  async criarGuarita(patioWidth, patioDepth) {
    const guarita = new THREE.Group();
    guarita.name = "Guarita";

    // ✅ POSICIONAMENTO DENTRO DOS MUROS - COLADA AO MURO OESTE
    const espacamentoMuro = 25; // Mesmo valor usado nos muros
    const guaritaPosX = -patioWidth / 2 - espacamentoMuro + 8; // DENTRO dos muros, colada ao muro oeste
    const guaritaPosZ = -patioDepth / 2 + 10; // Próxima à entrada norte, mas dentro

    // ✅ ESTRUTURA PRINCIPAL - TAMANHO MUITO MAIOR
    const estrutura = new THREE.Mesh(
      new THREE.BoxGeometry(15, 8, 12), // Muito maior: 15x8x12
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(0.9, 0.9, 0.9),
        metalness: 0.3,
        roughness: 0.7,
        map: this.criarTexturaConcreto()
      })
    );
    estrutura.position.set(guaritaPosX, 4, guaritaPosZ);
    estrutura.castShadow = true;
    estrutura.receiveShadow = true;
    guarita.add(estrutura);

    // ✅ TELHADO - MUITO MAIOR
    const telhado = new THREE.Mesh(
      new THREE.ConeGeometry(10, 4, 4), // Muito maior: 10 de raio, 4 de altura
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(0.7, 0.4, 0.2),
        roughness: 0.8,
      })
    );
    telhado.position.set(guaritaPosX, 10, guaritaPosZ);
    telhado.rotation.y = Math.PI / 4;
    telhado.castShadow = true;
    guarita.add(telhado);

    // ✅ JANELAS GRANDES - MUITO MAIS VISÍVEIS
    const janelaMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.2, 0.4, 0.6),
      metalness: 0.1,
      roughness: 0.1,
      transparent: true,
      opacity: 0.7,
    });

    // Janelas nas 4 faces - muito maiores
    for (let i = 0; i < 4; i++) {
      const janela = new THREE.Mesh(
        new THREE.PlaneGeometry(4, 4), // Janelas 4x4 (muito grandes)
        janelaMaterial.clone()
      );
      const angle = (i * Math.PI) / 2;
      janela.position.set(
        guaritaPosX + Math.sin(angle) * 7.6, // Ajustado para estrutura maior
        4.5, // Altura média da estrutura
        guaritaPosZ + Math.cos(angle) * 6.1 // Ajustado para estrutura maior
      );
      janela.rotation.y = angle + Math.PI;
      guarita.add(janela);
    }

    // ✅ PORTA DE ENTRADA GRANDE - VOLTADA PARA A ENTRADA
    const porta = new THREE.Mesh(
      new THREE.PlaneGeometry(3, 6), // Porta muito maior
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(0.4, 0.2, 0.1),
        metalness: 0.2,
        roughness: 0.8,
      })
    );
    porta.position.set(guaritaPosX, 3, guaritaPosZ + 6.1); // Porta frontal voltada para entrada
    porta.rotation.y = Math.PI;
    guarita.add(porta);

    // ✅ PLACA DE IDENTIFICAÇÃO "GUARITA"
    const placaGuarita = this.criarPlacaGuarita();
    placaGuarita.position.set(guaritaPosX, 6.5, guaritaPosZ + 6.2);
    guarita.add(placaGuarita);

    // ✅ ILUMINAÇÃO EXTERNA DA GUARITA
    const luzGuarita = new THREE.PointLight(0xffffe0, 2.0, 40);
    luzGuarita.position.set(guaritaPosX, 12, guaritaPosZ);
    luzGuarita.castShadow = false;
    guarita.add(luzGuarita);

    // ✅ HOLOFOTE ADICIONAL NO TETO
    const holofote = new THREE.Mesh(
      new THREE.SphereGeometry(0.8),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(0.9, 0.9, 0.8),
        emissive: new THREE.Color(0.1, 0.1, 0.05),
        metalness: 0.8,
        roughness: 0.1,
      })
    );
    holofote.position.set(guaritaPosX, 8.5, guaritaPosZ);
    holofote.castShadow = true;
    guarita.add(holofote);

    return guarita;
  }

  // ===== CRIAR PLACA DA GUARITA =====
  criarPlacaGuarita() {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");

    // Fundo azul escuro
    ctx.fillStyle = "rgba(0, 30, 60, 1.0)";
    ctx.fillRect(0, 0, 256, 128);

    // Borda branca
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 3;
    ctx.strokeRect(3, 3, 250, 122);

    // Texto "GUARITA"
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 32px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("GUARITA", 128, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 16;
    
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      sizeAttenuation: true
    });
    
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(6, 3, 1); // Placa grande e visível
    
    return sprite;
  }

  // ===== POSTES DE ILUMINAÇÃO DA RUA =====
  async criarPostesIluminacao(posZ, comprimento, larguraRua) {
    console.log("🚦 Criando postes de iluminação da rua...");

    const numPostes = 8;
    const spacing = comprimento / (numPostes + 1);

    for (let i = 0; i < numPostes; i++) {
      const poste = new THREE.Group();
      poste.name = `PosteLuz_${i}`;

      const mastro = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.18, 10),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color(0.3, 0.3, 0.3),
          metalness: 0.8,
          roughness: 0.3,
        })
      );
      mastro.position.set(-comprimento / 2 + (i + 1) * spacing, 5, posZ - larguraRua / 2 - 5);
      mastro.castShadow = true;
      poste.add(mastro);

      const luminaria = new THREE.Mesh(
        new THREE.SphereGeometry(0.4),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color(0.9, 0.9, 0.8),
          emissive: new THREE.Color(0.1, 0.1, 0.05),
          metalness: 0.2,
          roughness: 0.1,
        })
      );
      luminaria.position.set(
        -comprimento / 2 + (i + 1) * spacing,
        9.5,
        posZ - larguraRua / 2 - 5
      );
      poste.add(luminaria);

      // Luz point
      const luzPoste = new THREE.PointLight(0xffffe0, 1.0, 30);
      luzPoste.position.copy(luminaria.position);
      luzPoste.castShadow = false;
      poste.add(luzPoste);

      this.infraestruturaGroup.add(poste);
    }

    console.log("✅ Postes de iluminação criados");
  }

  // ===== TEXTURAS PROCEDURAIS =====
  criarTexturaTijolo() {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    // Fundo de argamassa
    ctx.fillStyle = "#8B7355";
    ctx.fillRect(0, 0, 512, 512);

    // Desenhar tijolos
    const brickW = 64;
    const brickH = 32;
    ctx.fillStyle = "#A0522D";

    for (let y = 0; y < 512; y += brickH) {
      for (let x = 0; x < 512; x += brickW) {
        const offsetX = (Math.floor(y / brickH) % 2) * (brickW / 2);
        ctx.fillRect((x + offsetX) % 512, y, brickW - 4, brickH - 4);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(8, 4);

    return texture;
  }

  criarNormalMapTijolo() {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#8080FF";
    ctx.fillRect(0, 0, 512, 512);

    // Simular normal map dos tijolos
    const brickW = 64;
    const brickH = 32;
    
    for (let y = 0; y < 512; y += brickH) {
      for (let x = 0; x < 512; x += brickW) {
        const offsetX = (Math.floor(y / brickH) % 2) * (brickW / 2);
        ctx.fillStyle = "#9090FF";
        ctx.fillRect((x + offsetX) % 512, y, brickW - 4, brickH - 4);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(8, 4);

    return texture;
  }

  criarTexturaConcreto() {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#CCCCCC";
    ctx.fillRect(0, 0, 256, 256);
    
    // Adicionar ruído
    for (let i = 0; i < 500; i++) {
      const gray = Math.random() * 50 + 150;
      ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);

    return texture;
  }

  criarTexturaAsfalto() {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#2A2A2A";
    ctx.fillRect(0, 0, 256, 256);
    
    // Adicionar agregados
    for (let i = 0; i < 300; i++) {
      const gray = Math.random() * 30 + 20;
      ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
      ctx.beginPath();
      ctx.arc(Math.random() * 256, Math.random() * 256, Math.random() * 2, 0, 2 * Math.PI);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(8, 8);

    return texture;
  }

  criarTexturaBrita() {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#666666";
    ctx.fillRect(0, 0, 256, 256);
    
    // Adicionar pedrinhas
    for (let i = 0; i < 200; i++) {
      const gray = Math.random() * 80 + 60;
      ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
      ctx.beginPath();
      ctx.arc(Math.random() * 256, Math.random() * 256, Math.random() * 3 + 1, 0, 2 * Math.PI);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(6, 6);

    return texture;
  }

  criarTexturaMadeira() {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");

    // Base marrom
    ctx.fillStyle = "#8B4513";
    ctx.fillRect(0, 0, 256, 256);
    
    // Veias da madeira
    for (let i = 0; i < 10; i++) {
      ctx.strokeStyle = `rgba(${Math.random() * 50 + 50}, ${Math.random() * 30 + 20}, 10, 0.6)`;
      ctx.lineWidth = Math.random() * 3 + 1;
      ctx.beginPath();
      ctx.moveTo(0, Math.random() * 256);
      ctx.quadraticCurveTo(128, Math.random() * 256, 256, Math.random() * 256);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 1);

    return texture;
  }

  // ===== TOGGLE INFRAESTRUTURA =====
  toggle() {
    if (!this.infraestruturaGroup) return;

    this.infraestruturaVisivel = !this.infraestruturaVisivel;
    this.infraestruturaGroup.visible = this.infraestruturaVisivel;

    console.log(`🏗️ Infraestrutura ${this.infraestruturaVisivel ? 'visível' : 'oculta'}`);
    return this.infraestruturaVisivel;
  }

  // ===== INFORMAÇÕES =====
  getInfo() {
    return {
      grupoInfraestrutura: !!this.infraestruturaGroup,
      visivel: this.infraestruturaVisivel,
      elementos: this.infraestruturaGroup ? this.infraestruturaGroup.children.length : 0,
      materiaisCacheados: this.materialsCache.size
    };
  }

  // ===== LIMPEZA =====
  dispose() {
    console.log("🧹 Limpando infraestrutura...");
    
    // Limpar cache de materiais
    this.materialsCache.forEach(material => {
      if (material.map) material.map.dispose();
      if (material.normalMap) material.normalMap.dispose();
      material.dispose();
    });
    this.materialsCache.clear();

    if (this.infraestruturaGroup) {
      // Percorrer todos os objetos e limpar
      this.infraestruturaGroup.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (child.material.map) child.material.map.dispose();
          if (child.material.normalMap) child.material.normalMap.dispose();
          child.material.dispose();
        }
      });

      while (this.infraestruturaGroup.children.length > 0) {
        this.infraestruturaGroup.remove(this.infraestruturaGroup.children[0]);
      }
      
      this.infraestruturaGroup = null;
    }

    this.isCreating = false;
    
    console.log("✅ Infraestrutura limpa");
  }
}