/**
 * Renderizador de Containers 3D - VERSÃO CORRIGIDA COMPLETA PARA SUZANO-SP
 * Arquivo: components/container-renderer.js
 * 
 * LÓGICA CORRIGIDA:
 * - Container 20ft: Ocupa 100% de UMA posição física ímpar
 * - Container 40ft: Ocupa 100% de DUAS posições físicas ímpares consecutivas
 * 
 * MAPEAMENTO:
 * Bay 1 → Posição física 1 (100%)
 * Bay 2 → Posições físicas 1+3 (100% + 100%)  
 * Bay 3 → Posição física 3 (100%)
 * Bay 4 → Posições físicas 3+5 (100% + 100%)
 * Bay 5 → Posição física 5 (100%)
 * Bay 6 → Posições físicas 5+7 (100% + 100%)
 */

import { CONFIG, CORES, CORES_ARMADORES } from '../utils/constants.js';
import { 
  validarPosicionamentoContainer, 
  isContainer40TEU, 
  podeColocar20ft, 
  podeColocar40ft,
  baiaBloqueadaPor40ft 
} from '../utils/validation.js';

export class ContainerRenderer {
  constructor(helperUtils = null) {
    this.helperUtils = helperUtils;
    this.textureLoader = new THREE.TextureLoader();
    this.materiaisCache = new Map();
    this.containersRenderizados = 0;
  }

  // ===== CRIAR VISUALIZAÇÃO DOS CONTAINERS =====
  criarVisualizacaoContainers(patioData, containerGroup, labelGroup) {
    try {
      if (!patioData) return 0;

      console.log("🎨 Criando visualização melhorada dos containers...");

      const containers = patioData.containers || [];
      let containersValidos = 0;

      containers.forEach((container, index) => {
        try {
          let containerNormalizado = container;
          
          // Normalizar dados se helper disponível
          if (this.helperUtils) {
            containerNormalizado = this.helperUtils.normalizarDadosContainer(container);
          }

          // Criar container melhorado
          if (containerNormalizado) {
            const resultado = this.criarContainerMelhorado(containerNormalizado);
            
            // Verificar se é um array de containers (container 40ft dividido)
            if (Array.isArray(resultado)) {
              // Container 40ft dividido em dois containers de 20ft físicos
              resultado.forEach(containerFisico => {
                if (containerFisico) {
                  containerGroup.add(containerFisico);
                  containersValidos++;
                }
              });
              console.log(`✨ Container 40ft ${containerNormalizado.numero} renderizado como ${resultado.length} containers físicos separados`);
            } else if (resultado) {
              // Container normal (20ft)
              containerGroup.add(resultado);
              containersValidos++;
            }
          }
        } catch (error) {
          console.error(`❌ Erro ao processar container ${container.numero}:`, error.message);
        }
      });

      this.containersRenderizados = containersValidos;
      console.log(`✨ ${containersValidos}/${containers.length} containers renderizados com qualidade premium`);
      
      return containersValidos;
    } catch (error) {
      console.error(`❌ Erro ao criar visualização: ${error.message}`);
      return 0;
    }
  }

  // ===== CRIAR CONTAINER 20FT FÍSICO =====
  criarContainer20ftFisico(container, posicaoFisica, numeroSufixo = '') {
    try {
      // Calcular posição 3D para a posição física específica
      const posicao = this.calcularPosicao3DFisica(posicaoFisica.row, posicaoFisica.bay, posicaoFisica.altura);
      if (!posicao) return null;
      
      // Geometria de container 20ft
      const geometry = new THREE.BoxGeometry(
        CONFIG.CONTAINER_20_COMPRIMENTO,
        CONFIG.ALTURA_CONTAINER,
        CONFIG.CONTAINER_20_LARGURA
      );
      
      // Material com cor do container
      const corArmador = this.obterCorArmador(container.armador);
      const material = new THREE.MeshStandardMaterial({
        color: corArmador,
        metalness: 0.7,
        roughness: 0.3,
        envMapIntensity: 1.0,
      });
      
      // Criar mesh do container
      const containerMesh = new THREE.Mesh(geometry, material);
      
      // Orientação horizontal
      containerMesh.rotation.x = Math.PI / 2;
      
      // Posicionar na posição física específica
      containerMesh.position.copy(posicao);
      
      // Sombras
      containerMesh.castShadow = true;
      containerMesh.receiveShadow = true;
      
      // Adicionar detalhes
      this.adicionarDetalhesContainer20ftFisico(containerMesh, container, numeroSufixo);
      
      // UserData
      containerMesh.userData = {
        container: container,
        numero: container.numero + numeroSufixo,
        row: posicaoFisica.row,
        bay: posicaoFisica.bay,
        altura: posicaoFisica.altura,
        eh40TEU: true, // Parte de um container 40ft
        posicaoFisica: posicaoFisica.bay,
        posicaoOriginal: posicao.clone(),
        materialOriginal: material.clone(),
      };
      
      console.log(`    ✅ Container 20ft físico criado na posição ${posicaoFisica.row}${posicaoFisica.bay.toString().padStart(2, '0')}-${posicaoFisica.altura}`);
      return containerMesh;
      
    } catch (error) {
      console.error(`❌ Erro ao criar container 20ft físico: ${error.message}`);
      return null;
    }
  }
  
  // ===== CRIAR CONTAINER MELHORADO =====
  criarContainerMelhorado(container) {
    try {
      const row = container.row || container.linha;
      const bay = container.bay || container.baia;
      const altura = container.altura;

      const eh40TEU = this.isContainer40TEU(container);
      
      console.log(`🔍 DEBUG Container ${container.numero}: eh40TEU=${eh40TEU}, bay=${bay}, tamanho=${container.tamanho}, tamanho_teu=${container.tamanho_teu}`);
      
      // 🔴 LÓGICA CORRIGIDA: Container 40ft SEMPRE ocupa DUAS posições físicas ímpares
      if (eh40TEU) {
        console.log(`🚛 Container 40ft ${container.numero} em ${row}${bay.toString().padStart(2, '0')}-${altura}`);
        
        let posicaoFisica1, posicaoFisica2;
        
        if (bay % 2 === 0) {
          // Posição lógica PAR → Converter para duas posições físicas ímpares
          console.log(`  📍 Posição LÓGICA par detectada - convertendo para posições FÍSICAS ímpares`);
          posicaoFisica1 = bay - 1; // Primeira posição física ímpar
          posicaoFisica2 = bay + 1; // Segunda posição física ímpar
          console.log(`  🎯 A${bay.toString().padStart(2, '0')} (lógica) → A${posicaoFisica1.toString().padStart(2, '0')} + A${posicaoFisica2.toString().padStart(2, '0')} (físicas)`);
        } else {
          // Posição ímpar → Container 40ft deveria estar em posição par lógica
          console.error(`❌ ERRO: Container 40ft ${container.numero} em posição ÍMPAR ${bay} - deveria estar em posição PAR lógica!`);
          console.log(`  🔧 CORREÇÃO AUTOMÁTICA: Assumindo que bay ${bay} é a primeira posição física`);
          posicaoFisica1 = bay;     // Posição atual como primeira física
          posicaoFisica2 = bay + 2; // Próxima posição ímpar como segunda física
          
          // Verificar se a segunda posição existe
          if (posicaoFisica2 > 19) {
            console.error(`❌ Segunda posição física ${posicaoFisica2} excede limite máximo (19)`);
            return null;
          }
          console.log(`  🎯 Correção: A${posicaoFisica1.toString().padStart(2, '0')} + A${posicaoFisica2.toString().padStart(2, '0')} (físicas)`);
        }
        
        console.log(`  🎯 Renderizando como DOIS containers 20ft físicos SEPARADOS:`);
        console.log(`     - Parte 1: ${row}${posicaoFisica1.toString().padStart(2, '0')}-${altura} (100% da posição física)`);
        console.log(`     - Parte 2: ${row}${posicaoFisica2.toString().padStart(2, '0')}-${altura} (100% da posição física)`);
        
        // Criar DOIS containers 20ft físicos separados
        const containers = [];
        
        // Primeira parte (posição física ímpar menor)
        const container1 = this.criarContainer20ftFisico(
          container, 
          { row, bay: posicaoFisica1, altura }, 
          '_P1'
        );
        if (container1) {
          container1.userData.parte = '1/2';
          container1.userData.containerOriginal = container.numero;
          container1.userData.posicaoLogica = `${row}${bay.toString().padStart(2, '0')}-${altura}`;
          containers.push(container1);
        }
        
        // Segunda parte (posição física ímpar maior)
        const container2 = this.criarContainer20ftFisico(
          container, 
          { row, bay: posicaoFisica2, altura }, 
          '_P2'
        );
        if (container2) {
          container2.userData.parte = '2/2';
          container2.userData.containerOriginal = container.numero;
          container2.userData.posicaoLogica = `${row}${bay.toString().padStart(2, '0')}-${altura}`;
          containers.push(container2);
        }
        
        console.log(`  ✅ Container 40ft ${container.numero} dividido em ${containers.length} containers físicos`);
        return containers; // Retornar array com os dois containers físicos
      }

      // 🔵 Container 20ft normal - DEVE estar em posição ímpar física
      if (!eh40TEU) {
        if (bay % 2 === 0) {
          console.error(`❌ ERRO: Container 20ft ${container.numero} em posição PAR ${bay} - posições pares NÃO EXISTEM FISICAMENTE!`);
          return null;
        }
        
        console.log(`📦 Container 20ft ${container.numero} em posição física ímpar ${row}${bay.toString().padStart(2, '0')}-${altura}`);
      }

      // Container 20ft normal em posição ímpar
      const posicao = this.calcularPosicao3DFisica(row, bay, altura);
      if (!posicao) return null;

      // Geometria baseada no tipo
      const geometry = eh40TEU
        ? new THREE.BoxGeometry(
            CONFIG.CONTAINER_40_COMPRIMENTO,
            CONFIG.ALTURA_CONTAINER,
            CONFIG.CONTAINER_40_LARGURA
          )
        : new THREE.BoxGeometry(
            CONFIG.CONTAINER_20_COMPRIMENTO,
            CONFIG.ALTURA_CONTAINER,
            CONFIG.CONTAINER_20_LARGURA
          );

      // Material metálico avançado
      const corArmador = this.obterCorArmador(container.armador);

      const material = new THREE.MeshStandardMaterial({
        color: corArmador,
        metalness: 0.6,
        roughness: 0.4,
        envMapIntensity: 1.0,
      });

      // Verificar problemas de segurança
      if (eh40TEU && !this.validarEmpilhamento40TEU(container)) {
        material.color = CORES.FLUTUANTE;
        material.emissive = new THREE.Color(0.2, 0.0, 0.0);
      }

      if (!this.validarAlturaMaximaPorRow(container)) {
        material.color = CORES.FLUTUANTE;
        material.emissive = new THREE.Color(0.2, 0.0, 0.0);
      }

      // Criar container 3D
      const containerMesh = new THREE.Mesh(geometry, material);
      
      // Orientação horizontal
      containerMesh.rotation.x = Math.PI / 2;
      
      // Posicionamento físico
      containerMesh.position.copy(posicao);
      
      console.log(`  ✅ Container ${eh40TEU ? '40ft' : '20ft'} criado na posição: x=${posicao.x.toFixed(2)}, y=${posicao.y.toFixed(2)}, z=${posicao.z.toFixed(2)}`);

      // Sombras
      containerMesh.castShadow = true;
      containerMesh.receiveShadow = true;

      // Detalhes do container
      this.adicionarDetalhesContainer(containerMesh, container, eh40TEU);

      // UserData
      containerMesh.userData = {
        container: container,
        row: row,
        bay: bay,
        altura: altura,
        eh40TEU: eh40TEU,
        posicao: `${row}${String(bay).padStart(2, "0")}-${altura}`,
        posicaoOriginal: posicao.clone(),
        materialOriginal: material.clone(),
      };  

      return containerMesh;
      
    } catch (error) {
      console.error(`❌ Erro ao criar container: ${error.message}`);
      return null;
    }
  }

  // ===== ADICIONAR DETALHES AOS CONTAINERS 20FT FÍSICOS (partes de 40ft) =====
  adicionarDetalhesContainer20ftFisico(containerMesh, containerOriginal, numeroSufixo) {
    const grupo = new THREE.Group();
    
    // Largura padrão de container 20ft
    const largura = CONFIG.CONTAINER_20_COMPRIMENTO;
    
    // Número do container com indicação da parte
    const numeroComParte = `${containerOriginal.numero}${numeroSufixo}`;
    this.criarNumeroContainer(grupo, numeroComParte, largura);
    
    // Logo do armador (apenas na primeira parte para evitar duplicação)
    if (numeroSufixo === '_P1' && containerOriginal.armador) {
      this.criarLogoArmador(grupo, containerOriginal.armador, largura);
    }
    
    // Indicadores de status
    this.criarIndicadoresStatus(grupo, containerOriginal, largura);
    
    // Adicionar grupo de detalhes ao container
    containerMesh.add(grupo);
  }
  
  // ===== ADICIONAR DETALHES AOS CONTAINERS =====
  adicionarDetalhesContainer(containerMesh, container, eh40TEU) {
    const grupo = new THREE.Group();

    // Portas do container
    const portaMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.3, 0.3, 0.3),
      metalness: 0.8,
      roughness: 0.3,
    });

    const largura = eh40TEU
      ? CONFIG.CONTAINER_40_COMPRIMENTO
      : CONFIG.CONTAINER_20_COMPRIMENTO;

    // Duas portas
    for (let i = 0; i < 2; i++) {
      const porta = new THREE.Mesh(
        new THREE.BoxGeometry(
          largura / 2 - 0.1,
          CONFIG.ALTURA_CONTAINER - 0.2,
          0.05
        ),
        portaMaterial.clone()
      );
      porta.position.set(
        ((i - 0.5) * largura) / 2,
        0,
        CONFIG.CONTAINER_20_LARGURA / 2 + 0.03
      );
      grupo.add(porta);

      // Maçanetas
      const macaneta = new THREE.Mesh(
        new THREE.SphereGeometry(0.05),
        new THREE.MeshStandardMaterial({
          color: 0x444444,
          metalness: 0.9,
          roughness: 0.1,
        })
      );
      macaneta.position.set(
        ((i - 0.5) * largura) / 2 +
          (i === 0 ? largura / 4 - 0.2 : -largura / 4 + 0.2),
        0,
        CONFIG.CONTAINER_20_LARGURA / 2 + 0.08
      );
      grupo.add(macaneta);
    }

    // Logo do armador na lateral
    if (container.armador) {
      this.criarLogoArmador(grupo, container.armador, largura);
    }

    // Número do container no topo
    this.criarNumeroContainer(grupo, container.numero, largura);

    // Indicadores de status
    this.criarIndicadoresStatus(grupo, container, largura);

    // Adicionar grupo de detalhes ao container
    containerMesh.add(grupo);
  }

  // ===== CRIAR LOGO DO ARMADOR =====
  criarLogoArmador(grupo, armador, largura) {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");

    // Fundo
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.fillRect(0, 0, 256, 128);

    // Borda
    ctx.strokeStyle = "#333333";
    ctx.lineWidth = 3;
    ctx.strokeRect(3, 3, 250, 122);

    // Texto do armador
    ctx.fillStyle = "#000000";
    ctx.font = "bold 20px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(armador, 128, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const logoMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
    });

    const logo = new THREE.Mesh(
      new THREE.PlaneGeometry(largura * 0.6, 1.0),
      logoMaterial
    );
    logo.position.set(0, 0.5, -CONFIG.CONTAINER_20_LARGURA / 2 - 0.01);
    grupo.add(logo);
  }

  // ===== CRIAR NÚMERO DO CONTAINER =====
  criarNumeroContainer(grupo, numero, largura) {
    if (!numero) return;

    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");

    // Fundo preto
    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.fillRect(0, 0, 512, 128);

    // Texto do número
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 32px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(numero, 256, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const numeroMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
    });

    const numeroPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(largura * 0.8, 0.8),
      numeroMaterial
    );
    numeroPlane.position.set(0, CONFIG.ALTURA_CONTAINER / 2 + 0.01, 0);
    numeroPlane.rotation.x = -Math.PI / 2;
    grupo.add(numeroPlane);
  }

  // ===== CRIAR INDICADORES DE STATUS =====
  criarIndicadoresStatus(grupo, container, largura) {
    const status = container.status;
    if (!status) return;

    // Cor baseada no status
    let corStatus = 0x00FF00; // Verde padrão
    switch (status.toUpperCase()) {
      case 'VISTORIADO':
        corStatus = 0x0099FF;
        break;
      case 'URGENTE':
        corStatus = 0xFF3300;
        break;
      case 'ANTIGO':
        corStatus = 0xFF9900;
        break;
    }

    // Indicador luminoso
    const indicadorGeometry = new THREE.SphereGeometry(0.1);
    const indicadorMaterial = new THREE.MeshStandardMaterial({
      color: corStatus,
      emissive: new THREE.Color(corStatus),
      emissiveIntensity: 0.3,
    });

    const indicador = new THREE.Mesh(indicadorGeometry, indicadorMaterial);
    indicador.position.set(
      largura / 2 - 0.3,
      CONFIG.ALTURA_CONTAINER / 2 - 0.3,
      CONFIG.CONTAINER_20_LARGURA / 2 + 0.05
    );
    grupo.add(indicador);

    // Efeito pulsante para status urgente
    if (status.toUpperCase() === 'URGENTE') {
      this.adicionarEfeitoPulsante(indicador);
    }
  }

  // ===== EFEITO PULSANTE =====
  adicionarEfeitoPulsante(objeto) {
    const pulsar = () => {
      if (objeto && objeto.material) {
        const intensidade = 0.3 + Math.sin(Date.now() * 0.01) * 0.2;
        objeto.material.emissiveIntensity = intensidade;
        requestAnimationFrame(pulsar);
      }
    };
    pulsar();
  }

  // ===== FUNÇÕES AUXILIARES =====
  
  // 🔴 FUNÇÃO CORRIGIDA: Calcular posição 3D com layout físico realista
  calcularPosicao3DFisica(row, bayFisica, altura) {
    try {
      const rowIndex = CONFIG.ROWS.indexOf(String(row).toUpperCase());
      if (rowIndex === -1) return null;

      const bayNumber = parseInt(bayFisica);
      if (isNaN(bayNumber) || bayNumber < 1) return null;

      const alturaNumber = parseInt(altura);
      if (isNaN(alturaNumber) || alturaNumber < 1 || alturaNumber > CONFIG.ALTURAS_MAX) return null;

      // 🔴 CORREÇÃO FUNDAMENTAL: APENAS posições físicas ímpares existem!
      if (bayNumber % 2 === 0) {
        console.error(`❌ ERRO CRÍTICO: Bay física ${bayNumber} é par - POSIÇÕES PARES NÃO EXISTEM FISICAMENTE!`);
        return null;
      }
      
      // 🔴 CORREÇÃO DO LAYOUT: Posições físicas devem estar NO INÍCIO do pátio
      // LAYOUT REAL: A01, A03, A05, A07, A09, A11, A13, A15, A17, A19
      // PROXIMIDADE: A01 e A03 devem estar NO INÍCIO do pátio (junto ao muro de entrada)
      
      const indiceFisico = Math.floor((bayNumber - 1) / 2);
      const POSICOES_FISICAS_MAX = 10; // Apenas 10 posições físicas reais
      
      if (indiceFisico >= POSICOES_FISICAS_MAX) {
        console.error(`❌ Bay física ${bayNumber} excede limite físico (máximo: ${POSICOES_FISICAS_MAX} posições)`);
        return null;
      }
      
      console.log(`🔵 Bay física ${bayNumber} (ímpar) → Índice físico ${indiceFisico} (de 0 a 9)`);

      // 🎯 COORDENADAS 3D CORRIGIDAS: A01 e A03 NO INÍCIO DO PÁTIO
      // CORREÇÃO CRÍTICA: A01 (índice 0) deve estar no início, não centralizada
      // Assumindo que o muro de entrada está no lado esquerdo (X negativo)
      
      const INICIO_PATIO_X = -35; // Coordenada X do início do pátio (junto ao muro)
      const x = INICIO_PATIO_X + (indiceFisico * CONFIG.ESPACAMENTO_BAIA);
      
      const z = (rowIndex - 2) * CONFIG.ESPACAMENTO_ROW;
      const y = (alturaNumber - 1) * CONFIG.ALTURA_CONTAINER + CONFIG.ALTURA_CONTAINER / 2;

      // 🏗️ LOG DETALHADO para debug do layout
      console.log(`  🎯 Layout físico CORRIGIDO: Bay ${bayNumber} → Índice ${indiceFisico} → X=${x.toFixed(2)} (início do pátio)`);
      console.log(`  ✅ Coordenadas: x=${x.toFixed(2)} (início), y=${y.toFixed(2)}, z=${z.toFixed(2)}`);
      
      return new THREE.Vector3(x, y, z);
      
    } catch (error) {
      console.error(`❌ Erro ao calcular posição 3D física: ${error.message}`);
      return null;
    }
  }

  // ===== FUNÇÃO PARA VERIFICAR PROXIMIDADE COM ENTRADA =====
  verificarProximidadeEntrada(bay) {
    // Posições A01, A03 (que formam A02) devem estar mais próximas da entrada
    // Posições A17, A19 (que formam A18) devem estar mais distantes da entrada
    
    const indiceFisico = Math.floor((bay - 1) / 2);
    const distanciaEntrada = indiceFisico; // Quanto menor, mais próximo da entrada
    
    if (distanciaEntrada <= 1) {
      console.log(`🚪 Bay ${bay} está PRÓXIMA da entrada (distância: ${distanciaEntrada})`);
    } else if (distanciaEntrada >= 8) {
      console.log(`🚪 Bay ${bay} está DISTANTE da entrada (distância: ${distanciaEntrada})`);
    }
    
    return distanciaEntrada;
  }

  // 🔴 FUNÇÃO LEGACY: Manter para compatibilidade (usar calcularPosicao3DFisica)
  calcularPosicao3D(row, bay, altura) {
    return this.calcularPosicao3DFisica(row, bay, altura);
  }

  isContainer40TEU(container) {
    try {
      const tamanhoTeu = container?.tamanho_teu || container?.tamanho;
      return tamanhoTeu && parseInt(tamanhoTeu) === 40;
    } catch (error) {
      return false;
    }
  }

  obterCorArmador(armador) {
    if (!armador) return CORES_ARMADORES.DEFAULT;
    
    const armadorUpper = armador.toUpperCase();
    return CORES_ARMADORES[armadorUpper] || CORES_ARMADORES.DEFAULT;
  }

  // 🔴 FUNÇÃO CORRIGIDA: Validar empilhamento 40ft com lógica real
  validarEmpilhamento40TEU(container) {
    try {
      if (!this.patioData || !this.patioData.containers) return true;
      
      const containers = this.patioData.containers;
      const row = container.row || container.linha;
      const bay = parseInt(container.bay || container.baia);
      const altura = parseInt(container.altura);
      
      const validacao = podeColocar40ft(containers, row, bay, altura);
      
      if (!validacao.valido) {
        console.warn(`⚠️ Empilhamento 40ft inválido: ${validacao.erro}`);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error(`Erro na validação 40ft: ${error.message}`);
      return false;
    }
  }

  // 🔴 FUNÇÃO CORRIGIDA: Validar altura máxima com lógica completa
  validarAlturaMaximaPorRow(container) {
    try {
      const row = container.row || container.linha;
      const altura = parseInt(container.altura);
      const alturaMaxima = CONFIG.ALTURAS_MAX_POR_ROW[row] || CONFIG.ALTURAS_MAX;
      
      const valido = altura <= alturaMaxima;
      
      if (!valido) {
        console.warn(`⚠️ Altura ${altura} excede limite da fileira ${row} (máximo: ${alturaMaxima})`);
      }
      
      return valido;
    } catch (error) {
      console.error(`Erro na validação de altura: ${error.message}`);
      return true;
    }
  }

  // ===== ANIMAÇÕES DE CONTAINER =====
  animarEntradaContainer(containerMesh, delay = 0) {
    if (!containerMesh) return;

    // Iniciar invisível
    containerMesh.scale.set(0, 0, 0);
    containerMesh.material.transparent = true;
    containerMesh.material.opacity = 0;

    setTimeout(() => {
      // Animar escala
      const animarEscala = () => {
        if (containerMesh.scale.x < 1) {
          containerMesh.scale.addScalar(0.05);
          containerMesh.material.opacity += 0.05;
          requestAnimationFrame(animarEscala);
        } else {
          containerMesh.scale.set(1, 1, 1);
          containerMesh.material.opacity = 1;
          containerMesh.material.transparent = false;
        }
      };
      animarEscala();
    }, delay);
  }

  // ===== FILTROS DE CONTAINER =====
  filtrarContainersPorArmador(containerGroup, armador) {
    containerGroup.children.forEach(child => {
      if (child.userData?.container) {
        const containerArmador = child.userData.container.armador;
        
        if (!armador || containerArmador === armador) {
          child.visible = true;
          child.material.transparent = false;
          child.material.opacity = 1.0;
        } else {
          child.material.transparent = true;
          child.material.opacity = 0.2;
        }
      }
    });
  }

  filtrarContainersPorStatus(containerGroup, status) {
    containerGroup.children.forEach(child => {
      if (child.userData?.container) {
        const containerStatus = child.userData.container.status;
        
        if (!status || containerStatus === status) {
          child.visible = true;
          child.material.transparent = false;
          child.material.opacity = 1.0;
        } else {
          child.material.transparent = true;
          child.material.opacity = 0.2;
        }
      }
    });
  }

  filtrarContainersPorTEU(containerGroup, teu) {
    containerGroup.children.forEach(child => {
      if (child.userData?.container) {
        const eh40TEU = this.isContainer40TEU(child.userData.container);
        const containerTEU = eh40TEU ? 40 : 20;
        
        if (!teu || containerTEU === parseInt(teu)) {
          child.visible = true;
          child.material.transparent = false;
          child.material.opacity = 1.0;
        } else {
          child.material.transparent = true;
          child.material.opacity = 0.2;
        }
      }
    });
  }

  // ===== DESTACAR CONTAINERS =====
  destacarContainerPorNumero(containerGroup, numeroContainer) {
    containerGroup.children.forEach(child => {
      if (child.userData?.container?.numero === numeroContainer) {
        // Destacar visualmente
        child.material.emissive = CORES.SELECIONADA;
        child.material.emissiveIntensity = 0.3;
        
        // Animar para cima
        const posOriginal = child.userData.posicaoOriginal.clone();
        child.position.y = posOriginal.y + CONFIG.HOVER_ALTURA;
        
        return child;
      }
    });
  }

  removerDestaquesContainers(containerGroup) {
    containerGroup.children.forEach(child => {
      if (child.userData?.container) {
        // Restaurar material original
        child.material.emissive = new THREE.Color(0, 0, 0);
        child.material.emissiveIntensity = 0;
        
        // Restaurar posição original
        if (child.userData.posicaoOriginal) {
          child.position.copy(child.userData.posicaoOriginal);
        }
      }
    });
  }

  // ===== INFORMAÇÕES DE DEBUG =====
  getContainerInfo() {
    return {
      containersRenderizados: this.containersRenderizados,
      materiaisCacheados: this.materiaisCache.size,
      memoriaUsada: this.materiaisCache.size * 1024 // Estimativa em bytes
    };
  }

  // ===== OTIMIZAÇÃO DE PERFORMANCE =====
  otimizarContainers(containerGroup, cameraPosicao, distanciaMaxima = 200) {
    let visiveisCount = 0;
    let ocultosCount = 0;

    containerGroup.children.forEach(child => {
      if (child.userData?.container) {
        const distancia = child.position.distanceTo(cameraPosicao);
        
        if (distancia > distanciaMaxima) {
          child.visible = false;
          ocultosCount++;
        } else {
          child.visible = true;
          visiveisCount++;
        }
      }
    });

    console.log(`🎯 Otimização: ${visiveisCount} visíveis, ${ocultosCount} ocultos`);
  }

  // ===== FUNCIONALIDADES ESPECÍFICAS PARA CONTAINERS 40FT =====
  
  // Encontrar todas as partes de um container 40ft
  encontrarPartesContainer40ft(containerGroup, numeroContainer) {
    const partes = [];
    
    containerGroup.children.forEach(child => {
      if (child.userData?.containerOriginal === numeroContainer) {
        partes.push(child);
      }
    });
    
    return partes.sort((a, b) => a.userData.parte?.localeCompare(b.userData.parte));
  }

  // Destacar container 40ft completo (ambas as partes)
  destacarContainer40ftCompleto(containerGroup, numeroContainer) {
    const partes = this.encontrarPartesContainer40ft(containerGroup, numeroContainer);
    
    partes.forEach(parte => {
      // Destacar visualmente
      parte.material.emissive = CORES.SELECIONADA;
      parte.material.emissiveIntensity = 0.3;
      
      // Animar para cima
      const posOriginal = parte.userData.posicaoOriginal.clone();
      parte.position.y = posOriginal.y + CONFIG.HOVER_ALTURA;
    });
    
    console.log(`✨ Container 40ft ${numeroContainer} destacado com ${partes.length} partes`);
    return partes;
  }

  // Validar integridade de container 40ft (verificar se ambas as partes existem)
  validarIntegridadeContainer40ft(containerGroup, numeroContainer) {
    const partes = this.encontrarPartesContainer40ft(containerGroup, numeroContainer);
    
    if (partes.length !== 2) {
      console.warn(`⚠️ Container 40ft ${numeroContainer} tem ${partes.length} partes (esperado: 2)`);
      return false;
    }
    
    // Verificar se as partes estão nas posições corretas
    const parte1 = partes.find(p => p.userData.parte === '1/2');
    const parte2 = partes.find(p => p.userData.parte === '2/2');
    
    if (!parte1 || !parte2) {
      console.warn(`⚠️ Container 40ft ${numeroContainer} não tem partes 1/2 e 2/2 corretamente definidas`);
      return false;
    }
    
    // Verificar se as posições são consecutivas ímpares
    const bay1 = parte1.userData.bay;
    const bay2 = parte2.userData.bay;
    
    if (Math.abs(bay2 - bay1) !== 2) {
      console.warn(`⚠️ Container 40ft ${numeroContainer} não está em posições consecutivas ímpares (${bay1}, ${bay2})`);
      return false;
    }
    
    console.log(`✅ Container 40ft ${numeroContainer} tem integridade válida`);
    return true;
  }

  // ===== RELATÓRIOS E ESTATÍSTICAS =====
  
  gerarRelatorioContainers(containerGroup) {
    const relatorio = {
      total: 0,
      containers20ft: 0,
      containers40ft: 0,
      containers40ftCompletos: 0,
      containers40ftIncompletos: 0,
      porArmador: {},
      porStatus: {},
      porRow: {},
      problemasEncontrados: []
    };

    const containers40ftVerificados = new Set();

    containerGroup.children.forEach(child => {
      if (child.userData?.container) {
        relatorio.total++;
        
        const container = child.userData.container;
        const eh40TEU = child.userData.eh40TEU;
        const armador = container.armador || 'SEM_ARMADOR';
        const status = container.status || 'SEM_STATUS';
        const row = child.userData.row;

        // Contagem por tipo
        if (eh40TEU) {
          // Para containers 40ft, verificar apenas uma vez
          if (!containers40ftVerificados.has(container.numero)) {
            containers40ftVerificados.add(container.numero);
            relatorio.containers40ft++;
            
            // Verificar integridade
            if (this.validarIntegridadeContainer40ft(containerGroup, container.numero)) {
              relatorio.containers40ftCompletos++;
            } else {
              relatorio.containers40ftIncompletos++;
              relatorio.problemasEncontrados.push(`Container 40ft ${container.numero} incompleto`);
            }
          }
        } else {
          relatorio.containers20ft++;
        }

        // Contagem por armador
        relatorio.porArmador[armador] = (relatorio.porArmador[armador] || 0) + 1;

        // Contagem por status
        relatorio.porStatus[status] = (relatorio.porStatus[status] || 0) + 1;

        // Contagem por row
        relatorio.porRow[row] = (relatorio.porRow[row] || 0) + 1;
      }
    });

    return relatorio;
  }

  // Imprimir relatório formatado
  imprimirRelatorio(containerGroup) {
    const relatorio = this.gerarRelatorioContainers(containerGroup);
    
    console.log('\n📊 RELATÓRIO DE CONTAINERS');
    console.log('='.repeat(50));
    console.log(`📦 Total de objetos renderizados: ${relatorio.total}`);
    console.log(`📦 Containers 20ft: ${relatorio.containers20ft}`);
    console.log(`📦 Containers 40ft: ${relatorio.containers40ft}`);
    console.log(`✅ Containers 40ft completos: ${relatorio.containers40ftCompletos}`);
    console.log(`❌ Containers 40ft incompletos: ${relatorio.containers40ftIncompletos}`);
    
    console.log('\n🏢 Por Armador:');
    Object.entries(relatorio.porArmador).forEach(([armador, count]) => {
      console.log(`   ${armador}: ${count}`);
    });
    
    console.log('\n📊 Por Status:');
    Object.entries(relatorio.porStatus).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });
    
    console.log('\n📍 Por Row:');
    Object.entries(relatorio.porRow).forEach(([row, count]) => {
      console.log(`   Row ${row}: ${count}`);
    });
    
    if (relatorio.problemasEncontrados.length > 0) {
      console.log('\n⚠️ Problemas Encontrados:');
      relatorio.problemasEncontrados.forEach(problema => {
        console.log(`   - ${problema}`);
      });
    }
    
    console.log('='.repeat(50));
    
    return relatorio;
  }

  // ===== EXPORTAÇÃO DE DADOS =====
  
  exportarDadosContainers(containerGroup) {
    const dados = {
      timestamp: new Date().toISOString(),
      containers: [],
      estatisticas: this.gerarRelatorioContainers(containerGroup)
    };

    containerGroup.children.forEach(child => {
      if (child.userData?.container) {
        dados.containers.push({
          numero: child.userData.container.numero,
          armador: child.userData.container.armador,
          status: child.userData.container.status,
          row: child.userData.row,
          bay: child.userData.bay,
          altura: child.userData.altura,
          eh40TEU: child.userData.eh40TEU,
          parte: child.userData.parte,
          containerOriginal: child.userData.containerOriginal,
          posicao3D: {
            x: child.position.x,
            y: child.position.y,
            z: child.position.z
          }
        });
      }
    });

    return dados;
  }

  // ===== LIMPEZA E RECURSOS =====
  
  dispose() {
    console.log("🧹 Limpando renderer de containers...");
    
    // Limpar cache de materiais
    this.materiaisCache.forEach(material => {
      if (material.map) material.map.dispose();
      material.dispose();
    });
    this.materiaisCache.clear();
    
    this.containersRenderizados = 0;
    
    console.log("✅ Renderer de containers limpo");
  }

  // ===== MÉTODOS DE BUSCA E FILTROS AVANÇADOS =====
  
  buscarContainerPorNumero(containerGroup, numero) {
    const encontrados = [];
    
    containerGroup.children.forEach(child => {
      if (child.userData?.container?.numero === numero || 
          child.userData?.containerOriginal === numero) {
        encontrados.push(child);
      }
    });
    
    return encontrados;
  }

  buscarContainersNaRegiao(containerGroup, rowInicio, rowFim, bayInicio, bayFim) {
    const encontrados = [];
    
    containerGroup.children.forEach(child => {
      if (child.userData?.container) {
        const row = child.userData.row;
        const bay = child.userData.bay;
        
        if (row >= rowInicio && row <= rowFim && 
            bay >= bayInicio && bay <= bayFim) {
          encontrados.push(child);
        }
      }
    });
    
    return encontrados;
  }

  // ===== CRIAR INDICADORES VISUAIS DA ENTRADA =====
  criarIndicadoresEntrada(patioGroup) {
    console.log("🚪 Criando indicadores visuais da entrada do pátio...");
    
    // 🚪 PORTÕES DE ENTRADA (lado das posições A01/A03)
    const portaoMaterial = new THREE.MeshStandardMaterial({
      color: 0xFF6600,
      emissive: new THREE.Color(0xFF6600),
      emissiveIntensity: 0.2
    });
    
    // Portão principal (lado esquerdo do pátio)
    const portaoGeometry = new THREE.BoxGeometry(2, 6, 0.5);
    const portao1 = new THREE.Mesh(portaoGeometry, portaoMaterial);
    const portao2 = new THREE.Mesh(portaoGeometry, portaoMaterial);
    
    // Posicionar portões na entrada (próximo às posições A01/A03)
    const entradaX = -5 * CONFIG.ESPACAMENTO_BAIA; // Lado esquerdo (próximo A01/A03)
    portao1.position.set(entradaX - 3, 3, -15);
    portao2.position.set(entradaX - 3, 3, 15);
    
    patioGroup.add(portao1);
    patioGroup.add(portao2);
    
    // 🚛 PLACA DE ENTRADA
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    
    ctx.fillStyle = "rgba(255, 102, 0, 0.9)";
    ctx.fillRect(0, 0, 256, 128);
    
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 24px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("ENTRADA", 128, 40);
    ctx.font = "16px Arial";
    ctx.fillText("Posições A01/A03", 128, 70);
    ctx.fillText("(Lógica A02)", 128, 90);
    
    const placaTexture = new THREE.CanvasTexture(canvas);
    const placaMaterial = new THREE.MeshBasicMaterial({
      map: placaTexture,
      transparent: true
    });
    
    const placa = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 4),
      placaMaterial
    );
    placa.position.set(entradaX - 1, 8, 0);
    patioGroup.add(placa);
    
    // 🏗️ SETAS INDICATIVAS
    const setaMaterial = new THREE.MeshStandardMaterial({
      color: 0x00FF00,
      emissive: new THREE.Color(0x00FF00),
      emissiveIntensity: 0.3
    });
    
    // Setas apontando para as primeiras posições
    for (let i = 0; i < 3; i++) {
      const seta = new THREE.Mesh(
        new THREE.ConeGeometry(0.5, 2, 8),
        setaMaterial
      );
      seta.rotation.z = Math.PI / 2; // Apontar para a direita
      seta.position.set(entradaX + i * 2, 1, 0);
      patioGroup.add(seta);
    }
    
    console.log("✅ Indicadores de entrada criados");
  }

  // ===== ATUALIZAR GRID FÍSICO COM INDICAÇÃO DE PROXIMIDADE =====
  criarGridFisicoCorreto(patioGroup) {
    console.log("🏗️ Criando grid físico correto - APENAS 10 posições ímpares...");
    
    const POSICOES_FISICAS = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19]; // Apenas posições ímpares reais
    
    CONFIG.ROWS.forEach((row, rowIndex) => {
      POSICOES_FISICAS.forEach((bayFisica, indiceFisico) => {
        // Criar marcador de posição física
        const posicao = this.calcularPosicao3DFisica(row, bayFisica, 1);
        if (!posicao) return;
        
        // 🎯 COR BASEADA NA PROXIMIDADE DA ENTRADA
        const distanciaEntrada = this.verificarProximidadeEntrada(bayFisica);
        let corBase;
        
        if (distanciaEntrada <= 1) {
          corBase = 0x00FF00; // Verde - Próximo da entrada
        } else if (distanciaEntrada <= 4) {
          corBase = 0xFFFF00; // Amarelo - Médio
        } else {
          corBase = 0xFF6600; // Laranja - Distante da entrada
        }
        
        // Base da posição (quadrado no chão)
        const baseGeometry = new THREE.PlaneGeometry(
          CONFIG.CONTAINER_20_COMPRIMENTO * 0.9, 
          CONFIG.CONTAINER_20_LARGURA * 0.9
        );
        
        const baseMaterial = new THREE.MeshBasicMaterial({
          color: corBase,
          transparent: true,
          opacity: 0.2,
          side: THREE.DoubleSide
        });
        
        const basePlane = new THREE.Mesh(baseGeometry, baseMaterial);
        basePlane.rotation.x = -Math.PI / 2;
        basePlane.position.set(posicao.x, 0.01, posicao.z);
        patioGroup.add(basePlane);
        
        // Label da posição física com indicação de proximidade
        const canvas = document.createElement("canvas");
        canvas.width = 128;
        canvas.height = 64;
        const ctx = canvas.getContext("2d");
        
        ctx.fillStyle = distanciaEntrada <= 1 ? "rgba(0, 255, 0, 0.8)" : "rgba(255, 255, 255, 0.8)";
        ctx.fillRect(0, 0, 128, 64);
        
        ctx.fillStyle = "#000000";
        ctx.font = "bold 16px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${row}${bayFisica.toString().padStart(2, '0')}`, 64, 32);
        
        // Indicador de proximidade
        if (distanciaEntrada <= 1) {
          ctx.fillStyle = "#00AA00";
          ctx.font = "10px Arial";
          ctx.fillText("ENTRADA", 64, 50);
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        const labelMaterial = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true
        });
        
        const label = new THREE.Mesh(
          new THREE.PlaneGeometry(2, 1),
          labelMaterial
        );
        label.rotation.x = -Math.PI / 2;
        label.position.set(posicao.x, 0.02, posicao.z);
        patioGroup.add(label);
        
        console.log(`  ✅ Posição física ${row}${bayFisica.toString().padStart(2, '0')} criada (distância entrada: ${distanciaEntrada})`);
      });
    });
    
    console.log(`✨ Grid físico criado com ${CONFIG.ROWS.length * POSICOES_FISICAS.length} posições reais`);
  }

  // ===== CRIAR LEGENDA EXPLICATIVA =====
  criarLegendaPatioFisico(patioGroup) {
    console.log("📋 Criando legenda do pátio físico...");
    
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    
    // Fundo
    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.fillRect(0, 0, 512, 256);
    
    // Título
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 20px Arial";
    ctx.textAlign = "left";
    ctx.fillText("PÁTIO FÍSICO - SUZANO-SP", 10, 30);
    
    // Explicação
    ctx.font = "14px Arial";
    ctx.fillText("✅ Posições ÍMPARES (1,3,5...): EXISTEM fisicamente", 10, 60);
    ctx.fillText("❌ Posições PARES (2,4,6...): Endereços LÓGICOS", 10, 85);
    ctx.fillText("🚛 Container 20ft: Ocupa 1 posição ímpar (100%)", 10, 110);
    ctx.fillText("🚚 Container 40ft: Ocupa 2 posições ímpares (100%+100%)", 10, 135);
    
    ctx.fillText("Exemplo:", 10, 170);
    ctx.fillStyle = "#00FF00";
    ctx.fillText("A02-1 → Posições físicas A01 + A03", 10, 195);
    ctx.fillStyle = "#FFFF00";
    ctx.fillText("A04-1 → Posições físicas A03 + A05", 10, 220);
    
    const texture = new THREE.CanvasTexture(canvas);
    const legendaMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true
    });
    
    const legenda = new THREE.Mesh(
      new THREE.PlaneGeometry(15, 7.5),
      legendaMaterial
    );
    
    // Posicionar a legenda no canto do pátio
    legenda.rotation.x = -Math.PI / 2;
    legenda.position.set(-30, 0.1, -15);
    patioGroup.add(legenda);
    
    console.log("✅ Legenda criada");
  }
  
  executarValidacaoCompleta(containerGroup) {
    console.log('🔍 Executando validação completa...');
    
    const problemas = [];
    const containers40ftVerificados = new Set();
    
    containerGroup.children.forEach(child => {
      if (child.userData?.container) {
        const container = child.userData.container;
        
        // Validar container 40ft apenas uma vez
        if (child.userData.eh40TEU && !containers40ftVerificados.has(container.numero)) {
          containers40ftVerificados.add(container.numero);
          
          if (!this.validarIntegridadeContainer40ft(containerGroup, container.numero)) {
            problemas.push(`Container 40ft ${container.numero} com problemas de integridade`);
          }
        }
        
        // Validar altura máxima
        if (!this.validarAlturaMaximaPorRow(container)) {
          problemas.push(`Container ${container.numero} excede altura máxima`);
        }
        
        // Validar posição física
        const bay = child.userData.bay;
        if (child.userData.eh40TEU && bay % 2 === 1) {
          problemas.push(`Container 40ft ${container.numero} em posição ímpar ${bay}`);
        }
      }
    });
    
    if (problemas.length > 0) {
      console.warn('⚠️ Problemas encontrados na validação:');
      problemas.forEach(problema => console.warn(`   - ${problema}`));
    } else {
      console.log('✅ Validação completa passou sem problemas');
    }
    
    return problemas;
  }
}