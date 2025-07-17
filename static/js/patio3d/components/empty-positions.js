/**
 * Gerenciador de Posições Vazias - VERSÃO CORRIGIDA PARA SUZANO-SP
 * Arquivo: components/empty-positions.js
 */

const THREE = window.THREE;
import { CONFIG } from '../utils/constants.js';

export class EmptyPositions {
  constructor(helperUtils = null) {
    this.helperUtils = helperUtils;
    this.posicoesVaziasGroup = null;
    this.posicoesVaziasVisiveis = true; // 🔧 VISÍVEL POR PADRÃO para Suzano-SP
    this.animationFrameId = null;
    this.totalPosicoesVazias = 0;
    this.isAnimating = false;
  }

  // ===== CRIAR POSIÇÕES VAZIAS =====
  criarPosicoesVazias(containers) {
    try {
      console.log("📦 Criando posições vazias VISÍVEIS por padrão...");

      this.posicoesVaziasGroup = new THREE.Group();
      this.posicoesVaziasGroup.name = "PosicoesVazias";

      const posicoesOcupadas = new Set();

      // Mapear posições ocupadas
      if (containers && containers.length > 0) {
        containers.forEach((container) => {
          const row = container.row || container.linha;
          const bay = container.bay || container.baia;
          const posKey = `${row}${bay}-${container.altura}`;
          posicoesOcupadas.add(posKey);

          // Para containers 40 TEU, marcar posição adjacente também
          if (this.isContainer40TEU(container)) {
            const rowIndex = CONFIG.ROWS.indexOf(row);
            if (rowIndex < CONFIG.ROWS.length - 1) {
              const rowAdjacente = CONFIG.ROWS[rowIndex + 1];
              const posAdjKey = `${rowAdjacente}${bay}-${container.altura}`;
              posicoesOcupadas.add(posAdjKey);
            }
          }
        });
      }

      // Material mais visível para posições vazias - 🔧 CORREÇÃO SUZANO-SP
      const wireframeMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0.5, 0.7, 0.9), // Azul ciano mais visível
        wireframe: true,
        transparent: true,
        opacity: 0.8, // 🔧 MAIS OPACO para ser bem visível
      });

      let posicoesVaziasCriadas = 0;

      // Criar posições vazias para cada row/baia/altura
      CONFIG.ROWS.forEach((row) => {
        const alturaMaximaRow = CONFIG.ALTURAS_MAX_POR_ROW[row] || CONFIG.ALTURAS_MAX;

        for (let bay = 1; bay <= CONFIG.BAIAS_MAX; bay++) {
          for (let altura = 1; altura <= alturaMaximaRow; altura++) {
            const posKey = `${row}${bay}-${altura}`;

            if (!posicoesOcupadas.has(posKey)) {
              const posicaoVazia = this.criarPosicaoVazia(row, bay, altura, wireframeMaterial);
              
              if (posicaoVazia) {
                this.posicoesVaziasGroup.add(posicaoVazia);
                posicoesVaziasCriadas++;
              }
            }
          }
        }
      });

      this.totalPosicoesVazias = posicoesVaziasCriadas;

      // 🔧 VISÍVEL POR PADRÃO
      this.posicoesVaziasGroup.visible = true;
      this.posicoesVaziasVisiveis = true;

      console.log(`✅ ${posicoesVaziasCriadas} posições vazias criadas e VISÍVEIS por padrão`);
      
      return this.posicoesVaziasGroup;

    } catch (error) {
      console.error(`❌ Erro ao criar posições vazias: ${error.message}`);
      return null;
    }
  }

  // ===== CRIAR POSIÇÃO VAZIA INDIVIDUAL =====
  criarPosicaoVazia(row, bay, altura, material) {
    try {
      const posicao = this.calcularPosicao3D(row, bay, altura);
      if (!posicao) return null;

      const geometry = new THREE.BoxGeometry(
        CONFIG.CONTAINER_20_COMPRIMENTO,
        CONFIG.ALTURA_CONTAINER,
        CONFIG.CONTAINER_20_LARGURA
      );

      const mesh = new THREE.Mesh(geometry, material.clone());
      mesh.position.copy(posicao);
      
      // 🔧 ORIENTAÇÃO HORIZONTAL: Consistente com containers deitados
      mesh.rotation.x = Math.PI / 2;
      
      mesh.userData = {
        isPosicaoVazia: true,
        row: row,
        bay: bay,
        altura: altura,
        posicao: `${row}${String(bay).padStart(2, "0")}-${altura}`,
        tipo: "posicao_vazia"
      };

      // Hover effect para posições vazias
      this.adicionarHoverEffect(mesh);

      return mesh;

    } catch (error) {
      console.error(`❌ Erro ao criar posição vazia ${row}${bay}-${altura}:`, error.message);
      return null;
    }
  }

  // ===== ADICIONAR EFEITO HOVER =====
  adicionarHoverEffect(mesh) {
    mesh.userData.originalMaterial = mesh.material.clone();
    
    // Material para hover
    mesh.userData.hoverMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0.2, 0.9, 0.2), // Verde brilhante
      wireframe: true,
      transparent: true,
      opacity: 0.9,
    });
  }

  // ===== TOGGLE POSIÇÕES VAZIAS COM ANIMAÇÃO =====
  togglePosicoesVazias(btn = null) {
    if (!this.posicoesVaziasGroup || this.isAnimating) return;

    this.posicoesVaziasVisiveis = !this.posicoesVaziasVisiveis;
    this.isAnimating = true;

    console.log(`🔄 Alternando posições vazias: ${this.posicoesVaziasVisiveis ? 'VISÍVEL' : 'OCULTA'}`);

    if (this.posicoesVaziasVisiveis) {
      // Mostrar com fade in
      this.fadeInPosicoesVazias(() => {
        this.isAnimating = false;
      });
    } else {
      // Esconder com fade out
      this.fadeOutPosicoesVazias(() => {
        this.isAnimating = false;
      });
    }

    // Atualizar botão se fornecido
    if (btn) {
      btn.classList.toggle("active");
      btn.innerHTML = `<i class="fas fa-eye me-2"></i>${
        this.posicoesVaziasVisiveis ? "Ocultar" : "Mostrar"
      } Posições Vazias`;
    }
  }

  // ===== FADE IN ANIMADO =====
  fadeInPosicoesVazias(callback = null) {
    this.posicoesVaziasGroup.visible = true;
    
    let completedAnimations = 0;
    const totalAnimations = this.posicoesVaziasGroup.children.length;

    if (totalAnimations === 0) {
      if (callback) callback();
      return;
    }

    this.posicoesVaziasGroup.children.forEach((child, index) => {
      child.material.opacity = 0;
      
      setTimeout(() => {
        const fadeIn = () => {
          if (child.material.opacity < 0.8) { // 🔧 Opacidade final alta
            child.material.opacity += 0.04;
            requestAnimationFrame(fadeIn);
          } else {
            child.material.opacity = 0.8;
            completedAnimations++;
            
            if (completedAnimations === totalAnimations && callback) {
              callback();
            }
          }
        };
        fadeIn();
      }, index * 5); // Delay escalonado
    });
  }

  // ===== FADE OUT ANIMADO =====
  fadeOutPosicoesVazias(callback = null) {
    let completedAnimations = 0;
    const totalAnimations = this.posicoesVaziasGroup.children.length;

    if (totalAnimations === 0) {
      this.posicoesVaziasGroup.visible = false;
      if (callback) callback();
      return;
    }

    this.posicoesVaziasGroup.children.forEach((child, index) => {
      setTimeout(() => {
        const fadeOut = () => {
          if (child.material.opacity > 0) {
            child.material.opacity -= 0.04;
            requestAnimationFrame(fadeOut);
          } else {
            child.material.opacity = 0;
            completedAnimations++;
            
            if (completedAnimations === totalAnimations) {
              this.posicoesVaziasGroup.visible = false;
              if (callback) callback();
            }
          }
        };
        fadeOut();
      }, index * 3); // Delay escalonado menor
    });
  }

  // ===== DESTACAR POSIÇÕES DISPONÍVEIS =====
  destacarPosicoesDisponiveis(filtros = {}) {
    if (!this.posicoesVaziasGroup) return;

    let posicoesDestacadas = 0;

    this.posicoesVaziasGroup.children.forEach(child => {
      if (child.userData.isPosicaoVazia) {
        let destacar = true;

        // Aplicar filtros
        if (filtros.row && child.userData.row !== filtros.row) {
          destacar = false;
        }

        if (filtros.alturaMax && child.userData.altura > parseInt(filtros.alturaMax)) {
          destacar = false;
        }

        if (filtros.baia && child.userData.bay !== parseInt(filtros.baia)) {
          destacar = false;
        }

        if (destacar) {
          // Material de destaque
          child.material = new THREE.MeshBasicMaterial({
            color: new THREE.Color(0.1, 0.9, 0.1), // Verde brilhante
            wireframe: true,
            transparent: true,
            opacity: 1.0,
          });
          
          // Efeito pulsante
          this.adicionarEfeitoPulsante(child);
          posicoesDestacadas++;
        } else {
          // Restaurar material original
          if (child.userData.originalMaterial) {
            child.material = child.userData.originalMaterial.clone();
          }
        }
      }
    });

    console.log(`✨ ${posicoesDestacadas} posições destacadas`);
    return posicoesDestacadas;
  }

  // ===== EFEITO PULSANTE =====
  adicionarEfeitoPulsante(objeto) {
    const pulsar = () => {
      if (objeto && objeto.material && this.posicoesVaziasVisiveis) {
        const escala = 1 + Math.sin(Date.now() * 0.005) * 0.1;
        objeto.scale.set(escala, escala, escala);
        requestAnimationFrame(pulsar);
      } else if (objeto) {
        objeto.scale.set(1, 1, 1);
      }
    };
    pulsar();
  }

  // ===== FILTRAR POR CRITÉRIOS =====
  filtrarPorRow(row) {
    if (!this.posicoesVaziasGroup) return;

    this.posicoesVaziasGroup.children.forEach(child => {
      if (child.userData.isPosicaoVazia) {
        if (!row || child.userData.row === row) {
          child.visible = true;
          child.material.opacity = 0.8;
        } else {
          child.material.opacity = 0.2;
        }
      }
    });
  }

  filtrarPorAltura(alturaMax) {
    if (!this.posicoesVaziasGroup) return;

    const alturaMaxima = alturaMax ? parseInt(alturaMax) : null;

    this.posicoesVaziasGroup.children.forEach(child => {
      if (child.userData.isPosicaoVazia) {
        if (!alturaMaxima || child.userData.altura <= alturaMaxima) {
          child.visible = true;
          child.material.opacity = 0.8;
        } else {
          child.material.opacity = 0.2;
        }
      }
    });
  }

  // ===== ENCONTRAR POSIÇÃO VAZIA MAIS PRÓXIMA =====
  encontrarPosicaoMaisProxima(posicaoReferencia, filtros = {}) {
    if (!this.posicoesVaziasGroup || !posicaoReferencia) return null;

    let posicaoMaisProxima = null;
    let menorDistancia = Infinity;

    this.posicoesVaziasGroup.children.forEach(child => {
      if (child.userData.isPosicaoVazia) {
        // Verificar filtros
        let valida = true;
        
        if (filtros.row && child.userData.row !== filtros.row) valida = false;
        if (filtros.alturaMax && child.userData.altura > parseInt(filtros.alturaMax)) valida = false;
        if (filtros.baia && child.userData.bay !== parseInt(filtros.baia)) valida = false;

        if (valida) {
          const distancia = child.position.distanceTo(posicaoReferencia);
          if (distancia < menorDistancia) {
            menorDistancia = distancia;
            posicaoMaisProxima = child;
          }
        }
      }
    });

    if (posicaoMaisProxima) {
      console.log(`🎯 Posição mais próxima encontrada: ${posicaoMaisProxima.userData.posicao}`);
    }

    return posicaoMaisProxima;
  }

  // ===== SUGERIR POSIÇÕES OTIMIZADAS =====
  sugerirPosicoesOtimizadas(criterios = {}) {
    if (!this.posicoesVaziasGroup) return [];

    const sugestoes = [];

    this.posicoesVaziasGroup.children.forEach(child => {
      if (child.userData.isPosicaoVazia) {
        let pontuacao = 0;

        // Pontuação baseada em critérios
        if (criterios.preferirAlturasBaixas) {
          pontuacao += (CONFIG.ALTURAS_MAX - child.userData.altura) * 10;
        }

        if (criterios.preferirRowEspecifica && child.userData.row === criterios.preferirRowEspecifica) {
          pontuacao += 50;
        }

        if (criterios.evitarBaiasExternas) {
          const bay = child.userData.bay;
          if (bay > 5 && bay < CONFIG.BAIAS_MAX - 5) {
            pontuacao += 20;
          }
        }

        // Verificar altura máxima
        const alturaMaxRow = CONFIG.ALTURAS_MAX_POR_ROW[child.userData.row];
        if (child.userData.altura <= alturaMaxRow) {
          pontuacao += 30;
        }

        sugestoes.push({
          posicao: child.userData.posicao,
          mesh: child,
          pontuacao: pontuacao,
          row: child.userData.row,
          bay: child.userData.bay,
          altura: child.userData.altura
        });
      }
    });

    // Ordenar por pontuação
    sugestoes.sort((a, b) => b.pontuacao - a.pontuacao);

    console.log(`💡 ${sugestoes.length} sugestões geradas`);
    return sugestoes.slice(0, 10); // Top 10 sugestões
  }

  // ===== FUNÇÕES AUXILIARES =====
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
      return null;
    }
  }

  isContainer40TEU(container) {
    try {
      const tamanhoTeu = container?.tamanho_teu || container?.tamanho;
      return tamanhoTeu && parseInt(tamanhoTeu) === 40;
    } catch (error) {
      return false;
    }
  }

  // ===== ATUALIZAR POSIÇÕES VAZIAS =====
  atualizarPosicoesVazias(novosContainers) {
    console.log("🔄 Atualizando posições vazias...");
    
    if (this.posicoesVaziasGroup) {
      // Limpar grupo atual
      while (this.posicoesVaziasGroup.children.length > 0) {
        this.posicoesVaziasGroup.remove(this.posicoesVaziasGroup.children[0]);
      }
    }

    // Recriar posições vazias
    return this.criarPosicoesVazias(novosContainers);
  }

  // ===== INFORMAÇÕES =====
  getInfo() {
    return {
      totalPosicoesVazias: this.totalPosicoesVazias,
      visiveis: this.posicoesVaziasVisiveis,
      animando: this.isAnimating,
      grupo: !!this.posicoesVaziasGroup
    };
  }

  // ===== LIMPEZA =====
  dispose() {
    console.log("🧹 Limpando posições vazias...");
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.posicoesVaziasGroup) {
      while (this.posicoesVaziasGroup.children.length > 0) {
        const child = this.posicoesVaziasGroup.children[0];
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
        this.posicoesVaziasGroup.remove(child);
      }
      this.posicoesVaziasGroup = null;
    }

    this.totalPosicoesVazias = 0;
    this.isAnimating = false;
    
    console.log("✅ Posições vazias limpas");
  }
}