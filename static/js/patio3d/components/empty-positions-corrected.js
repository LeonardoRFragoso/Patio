/**
 * Componente de Posições Vazias - VERSÃO CORRIGIDA COM LÓGICA FÍSICA REAL
 * Arquivo: components/empty-positions-corrected.js
 * 
 * 🔴 IMPLEMENTA A LÓGICA FÍSICA REAL DO PÁTIO SUZANO-SP:
 * - Baseado na explicação correta do usuário
 * - APENAS 10 posições físicas ímpares existem: A01, A03, A05, A07, A09, A11, A13, A15, A17, A19
 * - Container 20ft: ocupa 1 posição física ímpar (A01, A03, A05, etc.)
 * - Container 40ft: ocupa 2 posições físicas ímpares consecutivas (A01+A03, A03+A05, etc.)
 * - Posições pares são apenas lógicas e NÃO devem ser exibidas como marcações
 */

import { CONFIG, CORES } from '../utils/constants.js';
import { 
  obterPosicoesDisponiveis, 
  podeColocar20ft, 
  podeColocar40ft 
} from '../utils/validation.js';

export class EmptyPositionsCorrected {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = "Posições Vazias Corrigidas";
    
    // Materiais para diferentes tipos de containers
    this.materiais = {
      container20ft: new THREE.MeshLambertMaterial({
        color: CORES.POSICAO_VAZIA_20FT,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
      }),
      container40ft: new THREE.MeshLambertMaterial({
        color: CORES.POSICAO_VAZIA_40FT,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
      })
    };
    
    // Geometrias reutilizáveis
    this.geometrias = {
      container20ft: new THREE.BoxGeometry(
        CONFIG.CONTAINER_WIDTH_20FT,
        CONFIG.ALTURA_CONTAINER,
        CONFIG.CONTAINER_DEPTH
      ),
      container40ft: new THREE.BoxGeometry(
        CONFIG.CONTAINER_WIDTH_40FT,
        CONFIG.ALTURA_CONTAINER,
        CONFIG.CONTAINER_DEPTH
      )
    };
    
    // Estado de visibilidade
    this.visibilidade = {
      container20ft: true,
      container40ft: true
    };
    
    // Cache de posições
    this.cachePosicoesVazias = {
      container20ft: [],
      container40ft: []
    };
    
    console.log("🟢 EmptyPositionsCorrected inicializado com lógica baseada em dados reais do pátio");
  }

  /**
   * 🔴 FUNÇÃO PRINCIPAL: Criar posições vazias com lógica corrigida
   * @param {Object} patioData - Dados do pátio com containers
   * @returns {THREE.Group} Grupo com posições vazias
   */
  criarPosicoesVazias(patioData) {
    try {
      console.log("🔄 Criando posições vazias com NOVA LÓGICA CORRIGIDA...");
      
      // Limpar posições existentes
      this.limparPosicoes();
      
      if (!patioData || !patioData.containers) {
        console.warn("⚠️ Dados do pátio não disponíveis");
        return this.group;
      }

      const containers = patioData.containers;
      let posicoesCreated = 0;

      // 🔴 NOVA LÓGICA: Usar função de obter posições disponíveis corrigida
      
      // POSIÇÕES PARA CONTAINERS 20ft (POSIÇÕES FÍSICAS ÍMPARES)
      if (this.visibilidade.container20ft) {
        const posicoes20ft = obterPosicoesDisponiveis(containers, '20ft');
        console.log(`📍 Posições 20ft disponíveis:`, posicoes20ft.length);
        
        for (const posicaoInfo of posicoes20ft) {
          if (posicaoInfo.baia % 2 === 1) { // Apenas ímpares
            const posicaoMesh = this.criarPosicaoVazia20ft(posicaoInfo.row, posicaoInfo.baia, posicaoInfo.altura);
            if (posicaoMesh) {
              this.group.add(posicaoMesh);
              posicoesCreated++;
            }
          }
        }
      }
      
      // POSIÇÕES PARA CONTAINERS 40ft (POSIÇÕES LÓGICAS PARES)
      if (this.visibilidade.container40ft) {
        const posicoes40ft = obterPosicoesDisponiveis(containers, '40ft');
        console.log(`📍 Posições 40ft disponíveis:`, posicoes40ft.length);
        
        for (const posicaoInfo of posicoes40ft) {
          const posicoesOcupadas = posicaoInfo.posicoesOcupadas || CONFIG.MAPEAMENTO_40FT[posicaoInfo.baia];
          if (posicoesOcupadas && posicoesOcupadas.length === 2) {
            const [baiaFisica1, baiaFisica2] = posicoesOcupadas;
            if (baiaFisica1 % 2 === 1 && baiaFisica2 % 2 === 1) { // Apenas ímpares
              const posicaoMesh = this.criarPosicaoVazia40ft(posicaoInfo.row, posicaoInfo.baia, posicaoInfo.altura, posicoesOcupadas);
              if (posicaoMesh) {
                this.group.add(posicaoMesh);
                posicoesCreated++;
              }
            }
          }
        }
      }

      console.log(`✅ ${posicoesCreated} posições vazias criadas com NOVA LÓGICA`);
      this.group.visible = true;
      
      console.log(`✅ ${posicoesCreated} posições vazias criadas com lógica corrigida`);
      console.log(`   - Posições 20ft: ${this.mostrarPosicoes20ft ? 'ATIVADAS' : 'DESATIVADAS'}`);
      console.log(`   - Posições 40ft: ${this.mostrarPosicoes40ft ? 'ATIVADAS' : 'DESATIVADAS'}`);
      
      return this.posicoesVaziasGroup;
      
    } catch (error) {
      console.error(`❌ Erro ao criar posições vazias: ${error.message}`);
      return this.posicoesVaziasGroup;
    }
  }

  /**
   * 🔴 CRIAR POSIÇÃO VAZIA PARA CONTAINER 20ft (BAIA ÍMPAR)
   * @param {string} row - Fileira (A-E)
   * @param {number} baia - Baia ímpar (1,3,5,7,9,11,13,15,17,19)
   * @param {number} altura - Altura (1-5)
   * @returns {THREE.Mesh} Mesh da posição vazia
   */
  criarPosicaoVazia20ft(row, baia, altura) {
    try {
      const posicao = this.calcularPosicao3D(row, baia, altura);
      if (!posicao) return null;

      // Geometria para container 20ft
      const geometry = new THREE.BoxGeometry(
        CONFIG.CONTAINER_20_COMPRIMENTO,
        CONFIG.ALTURA_CONTAINER,
        CONFIG.CONTAINER_20_LARGURA
      );

      // Material verde translúcido para 20ft
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0.2, 0.8, 0.3), // Verde para 20ft
        transparent: true,
        opacity: 0.3,
        wireframe: true,
        roughness: 0.8,
        metalness: 0.1
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(posicao);
      mesh.rotation.x = Math.PI / 2; // Orientação horizontal

      // Metadados
      mesh.userData = {
        tipo: 'posicao_vazia_20ft',
        row: row,
        baia: baia,
        altura: altura,
        posicao: `${row}${String(baia).padStart(2, '0')}-${altura}`,
        containerType: '20ft'
      };

      mesh.name = `PosicaoVazia20ft_${row}${String(baia).padStart(2, '0')}_${altura}`;

      return mesh;
    } catch (error) {
      console.error(`Erro ao criar posição 20ft: ${error.message}`);
      return null;
    }
  }

  /**
   * 🔴 CRIAR POSIÇÃO VAZIA PARA CONTAINER 40ft - NOVA LÓGICA
   * @param {string} row - Fileira (A-E)
   * @param {number} baia - Baia lógica par (2,4,6,8,10,12,14,16,18)
   * @param {number} altura - Altura (1-5)
   * @param {Array} posicoesOcupadas - Array com as duas posições físicas ímpares que serão ocupadas
   * @returns {THREE.Mesh} Mesh da posição vazia
   */
  criarPosicaoVazia40ft(row, baia, altura, posicoesOcupadas) {
    try {
      if (!posicoesOcupadas || posicoesOcupadas.length !== 2) {
        console.warn(`⚠️ Posições ocupadas inválidas para container 40ft na baia ${baia}`);
        return null;
      }
      
      const [baiaFisica1, baiaFisica2] = posicoesOcupadas;
      
      // 🔴 NOVA LÓGICA: Calcular posição 3D baseada nas duas posições físicas ocupadas
      const posicao1 = this.calcularPosicao3D(row, baiaFisica1, altura);
      const posicao2 = this.calcularPosicao3D(row, baiaFisica2, altura);
      
      if (!posicao1 || !posicao2) {
        console.error(`Erro ao calcular posições 3D para baias físicas ${baiaFisica1} e ${baiaFisica2}`);
        return null;
      }
      
      // Posição central entre as duas posições físicas
      const posicaoCentral = new THREE.Vector3(
        (posicao1.x + posicao2.x) / 2,
        posicao1.y, // Mesma altura
        posicao1.z   // Mesma fileira
      );

      // Geometria para container 40ft (ocupa espaço de 2 posições físicas)
      const geometry = new THREE.BoxGeometry(
        CONFIG.ESPACAMENTO_BAIA * 2, // Largura de 2 posições físicas
        CONFIG.ALTURA_CONTAINER * 0.8,
        CONFIG.CONTAINER_40_LARGURA
      );

      // Material azul para 40ft
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0.2, 0.4, 0.8), // Azul para 40ft
        transparent: true,
        opacity: 0.4,
        wireframe: true,
        roughness: 0.8,
        metalness: 0.1
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(posicaoCentral);
      mesh.rotation.x = Math.PI / 2; // Orientação horizontal

      // Metadados
      mesh.userData = {
        tipo: 'posicao_vazia_40ft',
        row: row,
        baia: baia, // Baia lógica par
        altura: altura,
        posicao: `${row}${String(baia).padStart(2, '0')}-${altura}`,
        containerType: '40ft',
        posicoesOcupadas: posicoesOcupadas,
        descricao: `Posição lógica ${baia} (ocupará físicas ${baiaFisica1} + ${baiaFisica2})`
      };

      mesh.name = `PosicaoVazia40ft_${row}${String(baia).padStart(2, '0')}_${altura}_Fisicas${baiaFisica1}${baiaFisica2}`;

      console.log(`✅ Posição vazia 40ft criada: ${mesh.userData.descricao}`);
      return mesh;
    } catch (error) {
      console.error(`Erro ao criar posição 40ft: ${error.message}`);
      return null;
    }
  }

  /**
   * Calcular posição 3D (mesmo algoritmo do container-renderer)
   */
  calcularPosicao3D(row, bay, altura) {
    try {
      const rowIndex = CONFIG.ROWS.indexOf(String(row).toUpperCase());
      if (rowIndex === -1) return null;

      const bayNumber = parseInt(bay);
      if (isNaN(bayNumber) || bayNumber < 1 || bayNumber > CONFIG.BAIAS_MAX)
        return null;

      const alturaNumber = parseInt(altura);
      if (isNaN(alturaNumber) || alturaNumber < 1 || alturaNumber > CONFIG.ALTURAS_MAX)
        return null;

      const x = (bayNumber - 10.5) * CONFIG.ESPACAMENTO_BAIA;
      const z = (rowIndex - 2) * CONFIG.ESPACAMENTO_ROW;
      const y = (alturaNumber - 1) * CONFIG.ALTURA_CONTAINER + CONFIG.ALTURA_CONTAINER / 2;

      return new THREE.Vector3(x, y, z);
    } catch (error) {
      console.error(`Erro ao calcular posição 3D: ${error.message}`);
      return null;
    }
  }

  /**
   * 🔴 ALTERNAR VISIBILIDADE DE POSIÇÕES 20ft
   */
  togglePosicoes20ft() {
    this.mostrarPosicoes20ft = !this.mostrarPosicoes20ft;
    
    this.posicoesVaziasGroup.children.forEach(child => {
      if (child.userData?.containerType === '20ft') {
        child.visible = this.mostrarPosicoes20ft;
      }
    });
    
    console.log(`🔄 Posições 20ft: ${this.mostrarPosicoes20ft ? 'ATIVADAS' : 'DESATIVADAS'}`);
  }

  /**
   * 🔴 ALTERNAR VISIBILIDADE DE POSIÇÕES 40ft
   */
  togglePosicoes40ft() {
    this.mostrarPosicoes40ft = !this.mostrarPosicoes40ft;
    
    this.posicoesVaziasGroup.children.forEach(child => {
      if (child.userData?.containerType === '40ft') {
        child.visible = this.mostrarPosicoes40ft;
      }
    });
    
    console.log(`🔄 Posições 40ft: ${this.mostrarPosicoes40ft ? 'ATIVADAS' : 'DESATIVADAS'}`);
  }

  /**
   * Alternar visibilidade geral
   */
  toggleVisibilidade() {
    this.posicoesVaziasGroup.visible = !this.posicoesVaziasGroup.visible;
    console.log(`🔄 Posições vazias: ${this.posicoesVaziasGroup.visible ? 'VISÍVEIS' : 'OCULTAS'}`);
  }

  /**
   * Limpar todas as posições
   */
  limparPosicoes() {
    while (this.posicoesVaziasGroup.children.length > 0) {
      const child = this.posicoesVaziasGroup.children[0];
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
      this.posicoesVaziasGroup.remove(child);
    }
    this.posicoesRenderizadas = 0;
  }

  /**
   * Obter informações de debug
   */
  getInfo() {
    return {
      posicoesRenderizadas: this.posicoesRenderizadas,
      visivel: this.posicoesVaziasGroup.visible,
      posicoes20ftAtivas: this.mostrarPosicoes20ft,
      posicoes40ftAtivas: this.mostrarPosicoes40ft,
      totalChildren: this.posicoesVaziasGroup.children.length
    };
  }

  /**
   * Limpeza de recursos
   */
  dispose() {
    console.log("🧹 Limpando posições vazias...");
    this.limparPosicoes();
    console.log("✅ Posições vazias limpas");
  }
}

console.log("✅ EmptyPositionsCorrected com lógica de baias ímpares/pares carregado!");
