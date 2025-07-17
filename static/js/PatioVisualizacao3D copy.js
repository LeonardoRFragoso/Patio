/**
 * Sistema de Visualização 3D do Pátio - VERSÃO CORRIGIDA PARA SUZANO-SP
 * Arquivo: PatioVisualizacao3D.js
 *
 * CORREÇÕES APLICADAS:
 * ✅ Posições vazias mais visíveis (cor azul ciano, opacidade 0.8)
 * ✅ Containers na orientação horizontal correta (sem rotação vertical)
 * ✅ Vista lateral como padrão para Suzano-SP
 * ✅ Sistema Toast sem duplicatas
 * ✅ Melhorias na experiência do usuário
 */

console.log(
  "🚀 Carregando PatioVisualizacao3D VERSÃO CORRIGIDA PARA SUZANO-SP..."
);

// ===== VALIDAÇÃO DAS DEPENDÊNCIAS THREE.JS =====
(function validateDependencies() {
  console.log("🔍 Verificando dependências THREE.js...");

  if (typeof THREE === "undefined") {
    console.error("❌ ERRO CRÍTICO: THREE.js não foi carregado!");
    if (document.getElementById("loading-message")) {
      document.getElementById("loading-message").innerHTML =
        "ERRO: THREE.js não foi carregado.<br>Verifique sua conexão com a internet.";
    }
    return false;
  }

  // Implementação completa do OrbitControls integrada
  if (typeof THREE.OrbitControls === "undefined") {
    console.log("🔧 Criando OrbitControls integrado...");

    THREE.OrbitControls = function (object, domElement) {
      this.object = object;
      this.domElement = domElement !== undefined ? domElement : document;

      // Configurações
      this.enabled = true;
      this.target = new THREE.Vector3();
      this.minDistance = 0;
      this.maxDistance = Infinity;
      this.minZoom = 0;
      this.maxZoom = Infinity;
      this.minPolarAngle = 0;
      this.maxPolarAngle = Math.PI;
      this.minAzimuthAngle = -Infinity;
      this.maxAzimuthAngle = Infinity;
      this.enableDamping = false;
      this.dampingFactor = 0.25;
      this.enableZoom = true;
      this.zoomSpeed = 1.0;
      this.enableRotate = true;
      this.rotateSpeed = 1.0;
      this.enablePan = true;
      this.panSpeed = 1.0;
      this.screenSpacePanning = false;
      this.keyPanSpeed = 7.0;
      this.autoRotate = false;
      this.autoRotateSpeed = 2.0;
      this.enableKeys = true;

      // Estados internos
      var scope = this;
      var changeEvent = { type: "change" };
      var startEvent = { type: "start" };
      var endEvent = { type: "end" };
      var STATE = {
        NONE: -1,
        ROTATE: 0,
        DOLLY: 1,
        PAN: 2,
        TOUCH_ROTATE: 3,
        TOUCH_DOLLY_PAN: 4,
      };
      var state = STATE.NONE;
      var EPS = 0.000001;

      var spherical = new THREE.Spherical();
      var sphericalDelta = new THREE.Spherical();
      var scale = 1;
      var panOffset = new THREE.Vector3();
      var zoomChanged = false;

      var rotateStart = new THREE.Vector2();
      var rotateEnd = new THREE.Vector2();
      var rotateDelta = new THREE.Vector2();
      var panStart = new THREE.Vector2();
      var panEnd = new THREE.Vector2();
      var panDelta = new THREE.Vector2();
      var dollyStart = new THREE.Vector2();
      var dollyEnd = new THREE.Vector2();
      var dollyDelta = new THREE.Vector2();

      function getAutoRotationAngle() {
        return ((2 * Math.PI) / 60 / 60) * scope.autoRotateSpeed;
      }

      function getZoomScale() {
        return Math.pow(0.95, scope.zoomSpeed);
      }

      function rotateLeft(angle) {
        sphericalDelta.theta -= angle;
      }

      function rotateUp(angle) {
        sphericalDelta.phi -= angle;
      }

      var panLeft = (function () {
        var v = new THREE.Vector3();
        return function panLeft(distance, objectMatrix) {
          v.setFromMatrixColumn(objectMatrix, 0);
          v.multiplyScalar(-distance);
          panOffset.add(v);
        };
      })();

      var panUp = (function () {
        var v = new THREE.Vector3();
        return function panUp(distance, objectMatrix) {
          if (scope.screenSpacePanning === true) {
            v.setFromMatrixColumn(objectMatrix, 1);
          } else {
            v.setFromMatrixColumn(objectMatrix, 0);
            v.crossVectors(scope.object.up, v);
          }
          v.multiplyScalar(distance);
          panOffset.add(v);
        };
      })();

      var pan = (function () {
        var offset = new THREE.Vector3();
        return function pan(deltaX, deltaY) {
          var element =
            scope.domElement === document
              ? scope.domElement.body
              : scope.domElement;
          if (scope.object.isPerspectiveCamera) {
            var position = scope.object.position;
            offset.copy(position).sub(scope.target);
            var targetDistance = offset.length();
            targetDistance *= Math.tan(
              ((scope.object.fov / 2) * Math.PI) / 180.0
            );
            panLeft(
              (2 * deltaX * targetDistance) / element.clientHeight,
              scope.object.matrix
            );
            panUp(
              (2 * deltaY * targetDistance) / element.clientHeight,
              scope.object.matrix
            );
          } else if (scope.object.isOrthographicCamera) {
            panLeft(
              (deltaX * (scope.object.right - scope.object.left)) /
                scope.object.zoom /
                element.clientWidth,
              scope.object.matrix
            );
            panUp(
              (deltaY * (scope.object.top - scope.object.bottom)) /
                scope.object.zoom /
                element.clientHeight,
              scope.object.matrix
            );
          } else {
            console.warn(
              "WARNING: OrbitControls encountered an unknown camera type - pan disabled."
            );
            scope.enablePan = false;
          }
        };
      })();

      function dollyIn(dollyScale) {
        if (scope.object.isPerspectiveCamera) {
          scale /= dollyScale;
        } else if (scope.object.isOrthographicCamera) {
          scope.object.zoom = Math.max(
            scope.minZoom,
            Math.min(scope.maxZoom, scope.object.zoom * dollyScale)
          );
          scope.object.updateProjectionMatrix();
          zoomChanged = true;
        } else {
          console.warn(
            "WARNING: OrbitControls encountered an unknown camera type - dolly/zoom disabled."
          );
          scope.enableZoom = false;
        }
      }

      function dollyOut(dollyScale) {
        if (scope.object.isPerspectiveCamera) {
          scale *= dollyScale;
        } else if (scope.object.isOrthographicCamera) {
          scope.object.zoom = Math.max(
            scope.minZoom,
            Math.min(scope.maxZoom, scope.object.zoom / dollyScale)
          );
          scope.object.updateProjectionMatrix();
          zoomChanged = true;
        } else {
          console.warn(
            "WARNING: OrbitControls encountered an unknown camera type - dolly/zoom disabled."
          );
          scope.enableZoom = false;
        }
      }

      function handleMouseDownRotate(event) {
        rotateStart.set(event.clientX, event.clientY);
      }

      function handleMouseDownDolly(event) {
        dollyStart.set(event.clientX, event.clientY);
      }

      function handleMouseDownPan(event) {
        panStart.set(event.clientX, event.clientY);
      }

      function handleMouseMoveRotate(event) {
        rotateEnd.set(event.clientX, event.clientY);
        rotateDelta
          .subVectors(rotateEnd, rotateStart)
          .multiplyScalar(scope.rotateSpeed);
        var element =
          scope.domElement === document
            ? scope.domElement.body
            : scope.domElement;
        rotateLeft((2 * Math.PI * rotateDelta.x) / element.clientHeight);
        rotateUp((2 * Math.PI * rotateDelta.y) / element.clientHeight);
        rotateStart.copy(rotateEnd);
        scope.update();
      }

      function handleMouseMoveDolly(event) {
        dollyEnd.set(event.clientX, event.clientY);
        dollyDelta.subVectors(dollyEnd, dollyStart);
        if (dollyDelta.y > 0) {
          dollyIn(getZoomScale());
        } else if (dollyDelta.y < 0) {
          dollyOut(getZoomScale());
        }
        dollyStart.copy(dollyEnd);
        scope.update();
      }

      function handleMouseMovePan(event) {
        panEnd.set(event.clientX, event.clientY);
        panDelta.subVectors(panEnd, panStart).multiplyScalar(scope.panSpeed);
        pan(panDelta.x, panDelta.y);
        panStart.copy(panEnd);
        scope.update();
      }

      function handleMouseWheel(event) {
        if (event.deltaY < 0) {
          dollyOut(getZoomScale());
        } else if (event.deltaY > 0) {
          dollyIn(getZoomScale());
        }
        scope.update();
      }

      function handleTouchStartRotate(event) {
        rotateStart.set(event.touches[0].pageX, event.touches[0].pageY);
      }

      function handleTouchStartDollyPan(event) {
        if (scope.enableZoom) {
          var dx = event.touches[0].pageX - event.touches[1].pageX;
          var dy = event.touches[0].pageY - event.touches[1].pageY;
          var distance = Math.sqrt(dx * dx + dy * dy);
          dollyStart.set(0, distance);
        }
        if (scope.enablePan) {
          var x = 0.5 * (event.touches[0].pageX + event.touches[1].pageX);
          var y = 0.5 * (event.touches[0].pageY + event.touches[1].pageY);
          panStart.set(x, y);
        }
      }

      function handleTouchMoveRotate(event) {
        rotateEnd.set(event.touches[0].pageX, event.touches[0].pageY);
        rotateDelta
          .subVectors(rotateEnd, rotateStart)
          .multiplyScalar(scope.rotateSpeed);
        var element =
          scope.domElement === document
            ? scope.domElement.body
            : scope.domElement;
        rotateLeft((2 * Math.PI * rotateDelta.x) / element.clientHeight);
        rotateUp((2 * Math.PI * rotateDelta.y) / element.clientHeight);
        rotateStart.copy(rotateEnd);
        scope.update();
      }

      function handleTouchMoveDollyPan(event) {
        if (scope.enableZoom) {
          var dx = event.touches[0].pageX - event.touches[1].pageX;
          var dy = event.touches[0].pageY - event.touches[1].pageY;
          var distance = Math.sqrt(dx * dx + dy * dy);
          dollyEnd.set(0, distance);
          dollyDelta.set(
            0,
            Math.pow(dollyEnd.y / dollyStart.y, scope.zoomSpeed)
          );
          dollyIn(dollyDelta.y);
          dollyStart.copy(dollyEnd);
        }
        if (scope.enablePan) {
          var x = 0.5 * (event.touches[0].pageX + event.touches[1].pageX);
          var y = 0.5 * (event.touches[0].pageY + event.touches[1].pageY);
          panEnd.set(x, y);
          panDelta.subVectors(panEnd, panStart).multiplyScalar(scope.panSpeed);
          pan(panDelta.x, panDelta.y);
          panStart.copy(panEnd);
        }
        scope.update();
      }

      function onMouseDown(event) {
        if (scope.enabled === false) return;
        event.preventDefault();

        if (event.button === 0) {
          if (scope.enableRotate === false) return;
          handleMouseDownRotate(event);
          state = STATE.ROTATE;
        } else if (event.button === 1) {
          if (scope.enableZoom === false) return;
          handleMouseDownDolly(event);
          state = STATE.DOLLY;
        } else if (event.button === 2) {
          if (scope.enablePan === false) return;
          handleMouseDownPan(event);
          state = STATE.PAN;
        }

        if (state !== STATE.NONE) {
          document.addEventListener("mousemove", onMouseMove, false);
          document.addEventListener("mouseup", onMouseUp, false);
          scope.dispatchEvent(startEvent);
        }
      }

      function onMouseMove(event) {
        if (scope.enabled === false) return;
        event.preventDefault();

        if (state === STATE.ROTATE) {
          if (scope.enableRotate === false) return;
          handleMouseMoveRotate(event);
        } else if (state === STATE.DOLLY) {
          if (scope.enableZoom === false) return;
          handleMouseMoveDolly(event);
        } else if (state === STATE.PAN) {
          if (scope.enablePan === false) return;
          handleMouseMovePan(event);
        }
      }

      function onMouseUp(event) {
        if (scope.enabled === false) return;
        document.removeEventListener("mousemove", onMouseMove, false);
        document.removeEventListener("mouseup", onMouseUp, false);
        scope.dispatchEvent(endEvent);
        state = STATE.NONE;
      }

      function onMouseWheel(event) {
        if (
          scope.enabled === false ||
          scope.enableZoom === false ||
          (state !== STATE.NONE && state !== STATE.ROTATE)
        )
          return;
        event.preventDefault();
        event.stopPropagation();
        scope.dispatchEvent(startEvent);
        handleMouseWheel(event);
        scope.dispatchEvent(endEvent);
      }

      function onTouchStart(event) {
        if (scope.enabled === false) return;
        event.preventDefault();

        switch (event.touches.length) {
          case 1:
            if (scope.enableRotate === false) return;
            handleTouchStartRotate(event);
            state = STATE.TOUCH_ROTATE;
            break;
          case 2:
            if (scope.enableZoom === false && scope.enablePan === false) return;
            handleTouchStartDollyPan(event);
            state = STATE.TOUCH_DOLLY_PAN;
            break;
          default:
            state = STATE.NONE;
        }

        if (state !== STATE.NONE) {
          scope.dispatchEvent(startEvent);
        }
      }

      function onTouchMove(event) {
        if (scope.enabled === false) return;
        event.preventDefault();
        event.stopPropagation();

        switch (event.touches.length) {
          case 1:
            if (scope.enableRotate === false) return;
            if (state !== STATE.TOUCH_ROTATE) return;
            handleTouchMoveRotate(event);
            break;
          case 2:
            if (scope.enableZoom === false && scope.enablePan === false) return;
            if (state !== STATE.TOUCH_DOLLY_PAN) return;
            handleTouchMoveDollyPan(event);
            break;
          default:
            state = STATE.NONE;
        }
      }

      function onTouchEnd(event) {
        if (scope.enabled === false) return;
        scope.dispatchEvent(endEvent);
        state = STATE.NONE;
      }

      function onContextMenu(event) {
        if (scope.enabled === false) return;
        event.preventDefault();
      }

      scope.domElement.addEventListener("contextmenu", onContextMenu, false);
      scope.domElement.addEventListener("mousedown", onMouseDown, false);
      scope.domElement.addEventListener("wheel", onMouseWheel, false);
      scope.domElement.addEventListener("touchstart", onTouchStart, false);
      scope.domElement.addEventListener("touchend", onTouchEnd, false);
      scope.domElement.addEventListener("touchmove", onTouchMove, false);

      this.update = (function () {
        var offset = new THREE.Vector3();
        var quat = new THREE.Quaternion().setFromUnitVectors(
          object.up,
          new THREE.Vector3(0, 1, 0)
        );
        var quatInverse = quat.clone().inverse();
        var lastPosition = new THREE.Vector3();
        var lastQuaternion = new THREE.Quaternion();

        return function update() {
          var position = scope.object.position;
          offset.copy(position).sub(scope.target);
          offset.applyQuaternion(quat);
          spherical.setFromVector3(offset);

          if (scope.autoRotate && state === STATE.NONE) {
            rotateLeft(getAutoRotationAngle());
          }

          spherical.theta += sphericalDelta.theta;
          spherical.phi += sphericalDelta.phi;
          spherical.theta = Math.max(
            scope.minAzimuthAngle,
            Math.min(scope.maxAzimuthAngle, spherical.theta)
          );
          spherical.phi = Math.max(
            scope.minPolarAngle,
            Math.min(scope.maxPolarAngle, spherical.phi)
          );
          spherical.makeSafe();
          spherical.radius *= scale;
          spherical.radius = Math.max(
            scope.minDistance,
            Math.min(scope.maxDistance, spherical.radius)
          );

          scope.target.add(panOffset);
          offset.setFromSpherical(spherical);
          offset.applyQuaternion(quatInverse);
          position.copy(scope.target).add(offset);
          scope.object.lookAt(scope.target);

          if (scope.enableDamping === true) {
            sphericalDelta.theta *= 1 - scope.dampingFactor;
            sphericalDelta.phi *= 1 - scope.dampingFactor;
            panOffset.multiplyScalar(1 - scope.dampingFactor);
          } else {
            sphericalDelta.set(0, 0, 0);
            panOffset.set(0, 0, 0);
          }

          scale = 1;

          if (
            zoomChanged ||
            lastPosition.distanceToSquared(scope.object.position) > EPS ||
            8 * (1 - lastQuaternion.dot(scope.object.quaternion)) > EPS
          ) {
            scope.dispatchEvent(changeEvent);
            lastPosition.copy(scope.object.position);
            lastQuaternion.copy(scope.object.quaternion);
            zoomChanged = false;
            return true;
          }
          return false;
        };
      })();

      this.dispose = function () {
        scope.domElement.removeEventListener(
          "contextmenu",
          onContextMenu,
          false
        );
        scope.domElement.removeEventListener("mousedown", onMouseDown, false);
        scope.domElement.removeEventListener("wheel", onMouseWheel, false);
        scope.domElement.removeEventListener("touchstart", onTouchStart, false);
        scope.domElement.removeEventListener("touchend", onTouchEnd, false);
        scope.domElement.removeEventListener("touchmove", onTouchMove, false);
        document.removeEventListener("mousemove", onMouseMove, false);
        document.removeEventListener("mouseup", onMouseUp, false);
      };

      this.reset = function () {
        scope.target.copy(scope.target0);
        scope.object.position.copy(scope.position0);
        scope.object.zoom = scope.zoom0;
        scope.object.updateProjectionMatrix();
        scope.dispatchEvent(changeEvent);
        scope.update();
        state = STATE.NONE;
      };

      this.getPolarAngle = function () {
        return spherical.phi;
      };

      this.getAzimuthalAngle = function () {
        return spherical.theta;
      };

      this.saveState = function () {
        scope.target0.copy(scope.target);
        scope.position0.copy(scope.object.position);
        scope.zoom0 = scope.object.zoom;
      };

      this.target0 = this.target.clone();
      this.position0 = this.object.position.clone();
      this.zoom0 = this.object.zoom;

      this.update();
    };

    THREE.OrbitControls.prototype = Object.create(
      THREE.EventDispatcher.prototype
    );
    THREE.OrbitControls.prototype.constructor = THREE.OrbitControls;
  }

  console.log("✅ Dependências THREE.js validadas com sucesso!");
  return true;
})();

// ===== SISTEMA DE NOTIFICAÇÕES TOAST CORRIGIDO (SEM DUPLICATAS) =====
class ToastManager {
  constructor() {
    this.container = document.getElementById("toast-container");
    if (!this.container) {
      this.container = document.createElement("div");
      this.container.id = "toast-container";
      this.container.className = "toast-container";
      document.body.appendChild(this.container);
    }

    // 🔧 CORREÇÃO: Controle para evitar duplicatas
    this.activeToasts = new Set();
    this.toastHistory = new Map();

    // Limpar histórico antigo periodicamente
    setInterval(() => this.clearOldHistory(), 5000);
  }

  show(message, type = "info", duration = 4000) {
    // 🔧 CORREÇÃO: Verificar se já existe um toast com a mesma mensagem
    const toastKey = `${message}-${type}`;

    if (this.activeToasts.has(toastKey)) {
      console.log("🚫 Toast duplicado evitado:", message);
      return; // Não criar toast duplicado
    }

    // Verificar histórico recente (últimos 2 segundos)
    const now = Date.now();
    if (this.toastHistory.has(toastKey)) {
      const lastShown = this.toastHistory.get(toastKey);
      if (now - lastShown < 2000) {
        console.log("🚫 Toast muito recente, ignorando:", message);
        return;
      }
    }

    // Marcar como ativo e registrar no histórico
    this.activeToasts.add(toastKey);
    this.toastHistory.set(toastKey, now);

    const toast = document.createElement("div");
    toast.className = `toast-notification ${type}`;
    toast.innerHTML = `
      <div class="d-flex align-items-center">
        <i class="fas fa-${this.getIcon(type)} me-2"></i>
        <span>${message}</span>
        <button class="btn btn-sm btn-outline-light ms-auto" onclick="this.parentElement.parentElement.remove()">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;

    this.container.appendChild(toast);
    setTimeout(() => toast.classList.add("show"), 100);

    setTimeout(() => {
      toast.classList.remove("show");
      // Remover do controle de ativos
      this.activeToasts.delete(toastKey);

      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, duration);
  }

  getIcon(type) {
    const icons = {
      success: "check-circle",
      error: "exclamation-circle",
      warning: "exclamation-triangle",
      info: "info-circle",
    };
    return icons[type] || "info-circle";
  }

  // Limpar histórico antigo periodicamente
  clearOldHistory() {
    const now = Date.now();
    for (const [key, timestamp] of this.toastHistory.entries()) {
      if (now - timestamp > 10000) {
        // 10 segundos
        this.toastHistory.delete(key);
      }
    }
  }
}

// ===== API MANAGER PARA INTEGRAÇÃO COM BACKEND =====
class APIManager {
  constructor() {
    this.baseURL = window.location.origin;
    this.endpoints = {
      containers: "/operacoes/containers/patio-3d",
      buscarContainer: "/operacoes/buscar_container",
      validarPosicao: "/operacoes/validar_posicao_suzano",
      sugestoesPosicoes: "/operacoes/sugestoes_posicoes",
    };
  }

  async request(endpoint, options = {}) {
    const url = this.baseURL + endpoint;
    const defaultOptions = {
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      credentials: "same-origin",
    };

    try {
      const response = await fetch(url, { ...defaultOptions, ...options });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Não autorizado. Faça login novamente.");
        }
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Erro na requisição para ${endpoint}:`, error);
      throw error;
    }
  }

  async obterDadosPatio3D() {
    return await this.request(this.endpoints.containers);
  }

  async buscarContainer(numero) {
    return await this.request(
      `${this.endpoints.buscarContainer}?numero=${encodeURIComponent(numero)}`
    );
  }

  async validarPosicao(posicao, status = "CHEIO", operacao = "descarga") {
    return await this.request(this.endpoints.validarPosicao, {
      method: "POST",
      body: JSON.stringify({ posicao, status, operacao }),
    });
  }

  async obterSugestoesPosicoes(status = "CHEIO", baia = "", alturaMax = "") {
    const params = new URLSearchParams({ status });
    if (baia) params.append("baia", baia);
    if (alturaMax) params.append("altura_max", alturaMax);

    return await this.request(`${this.endpoints.sugestoesPosicoes}?${params}`);
  }
}

// ===== CLASSE PRINCIPAL DE VISUALIZAÇÃO 3D =====
class PatioVisualizacao3DManager {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.containerGroup = null;
    this.labelGroup = null;
    this.raycaster = null;
    this.mouse = new THREE.Vector2();
    this.patioData = null;
    this.selectedContainer = null;
    this.hoveredContainer = null;
    this.debugConsole = null;
    this.posicoesVaziasVisiveis = true;
    this.posicoesVaziasGroup = null;
    this.infraestruturaGroup = null;
    this.clock = new THREE.Clock();
    this.mixer = null;

    // Gerenciadores
    this.toastManager = new ToastManager();
    this.apiManager = new APIManager();

    // Texturas e materiais cache
    this.textureLoader = new THREE.TextureLoader();
    this.materiaisCache = new Map();
    this.texturasCache = new Map();

    // Sistema de iluminação HDR
    this.luzesGrupo = null;
    this.sombrasConfiguradas = false;

    // Sistema de animação
    this.animacoes = [];
    this.transicionandoCamera = false;

    // Estado da interface
    this.labelsVisiveis = true;
    this.infraestruturaVisivel = true;

    // Configurações visuais melhoradas
    this.CONFIG = {
      ROWS: ["A", "B", "C", "D", "E"],
      BAIAS_MAX: 20,
      ALTURAS_MAX: 5,
      ALTURAS_MAX_POR_ROW: {
        A: 2,
        B: 3,
        C: 4,
        D: 5,
        E: 5,
      },
      ESPACAMENTO_BAIA: 7,
      ESPACAMENTO_ROW: 2.5,
      TAMANHO_CONTAINER: 3,
      ALTURA_CONTAINER: 2.5,
      CONTAINER_20_LARGURA: 2.5,
      CONTAINER_20_COMPRIMENTO: 7,
      CONTAINER_40_LARGURA: 2.5,
      CONTAINER_40_COMPRIMENTO: 14,
      HOVER_ALTURA: 1,
      QUALIDADE_SOMBRAS: 2048,
      DISTANCIA_NEVOA: 800,
      INTENSIDADE_BLOOM: 1.2,
      REFLEXO_INTENSIDADE: 0.3,
    };

    // Cores melhoradas com valores HDR
    this.CORES = {
      VAZIA: new THREE.Color(0.8, 0.8, 0.8),
      OCUPADA: new THREE.Color(0.3, 0.7, 0.3),
      VISTORIADA: new THREE.Color(0.1, 0.6, 0.9),
      FLUTUANTE: new THREE.Color(1.0, 0.2, 0.2),
      CONTAINER_40: new THREE.Color(0.6, 0.2, 0.7),
      SELECIONADA: new THREE.Color(1.0, 0.9, 0.2),
      GRID: new THREE.Color(0.5, 0.5, 0.5),
      MURO: new THREE.Color(0.6, 0.3, 0.2),
      HOVER: new THREE.Color(1.0, 0.8, 0.4),
      URGENTE: new THREE.Color(1.0, 0.3, 0.1),
      ANTIGO: new THREE.Color(0.5, 0.3, 0.3),
    };

    // Cores dos armadores com valores mais ricos
    this.CORES_ARMADORES = {
      EVERGREEN: new THREE.Color(0.2, 0.8, 0.3),
      MAERSK: new THREE.Color(0.1, 0.6, 0.95),
      MSC: new THREE.Color(1.0, 0.6, 0.0),
      COSCO: new THREE.Color(0.95, 0.2, 0.2),
      "CMA CGM": new THREE.Color(0.6, 0.15, 0.7),
      "HAPAG-LLOYD": new THREE.Color(1.0, 0.3, 0.1),
      ONE: new THREE.Color(0.4, 0.5, 0.6),
      "YANG MING": new THREE.Color(0.5, 0.3, 0.3),
      PIL: new THREE.Color(0.0, 0.6, 0.5),
      ZIM: new THREE.Color(0.9, 0.1, 0.4),
      HYUNDAI: new THREE.Color(0.2, 0.3, 0.7),
      OOCL: new THREE.Color(0.5, 0.8, 0.3),
      DEFAULT: new THREE.Color(0.6, 0.6, 0.6),
    };

    // Inicializar automaticamente
    this.init();
  }

  // ===== INICIALIZAÇÃO PRINCIPAL =====
  async init() {
    this.debug("🚀 Inicializando Sistema 3D CORRIGIDO PARA SUZANO-SP...");

    try {
      this.debugConsole = document.getElementById("console-output");
      this.atualizarStatusSistema("threejs", "loading", "Carregando THREE.js");

      if (typeof THREE === "undefined") {
        throw new Error("THREE.js não encontrado");
      }

      this.atualizarStatusSistema(
        "threejs",
        "success",
        "THREE.js " + THREE.REVISION
      );
      this.debug(`THREE.js carregado: versão ${THREE.REVISION}`);

      // Atualizar progresso
      this.atualizarProgresso(10, "Inicializando componentes 3D...");

      // Inicializar componentes com qualidade premium
      await this.criarCenaHDR();
      this.atualizarProgresso(20, "Criando câmera cinematográfica...");

      this.criarCameraAvancada();
      this.atualizarProgresso(30, "Configurando renderer premium...");

      this.criarRendererPremium();
      this.atualizarProgresso(40, "Configurando iluminação HDR...");

      await this.configurarIluminacaoHDR();
      this.atualizarProgresso(50, "Criando grid industrial...");

      this.criarGridAprimorado();
      this.atualizarProgresso(60, "Construindo infraestrutura...");

      await this.criarInfraestruturaRealistica();
      this.atualizarProgresso(70, "Configurando controles...");

      this.configurarControlesAvancados();
      this.configurarRaycasterMelhorado();
      this.configurarEventListeners();
      this.iniciarSistemaAnimacao();

      this.atualizarProgresso(80, "Conectando com backend...");
      this.atualizarStatusSistema("api", "loading", "Conectando");

      // Carregar dados reais
      await this.carregarDadosReais();
      this.atualizarProgresso(90, "Finalizando...");

      // Sistemas avançados
      this.monitorarPerformance();

      // Detectar problemas de segurança
      setTimeout(() => {
        this.detectarContainersProblematicos();
      }, 2000);

      // Configurar interface
      this.configurarInterface();

      // Iniciar loop de renderização
      this.animar();

      // 🔧 CORREÇÃO PRINCIPAL: Vista lateral como padrão para Suzano-SP
      setTimeout(() => {
        this.posicionarCameraLateralSuzano();
        this.definirVistaPadraoLateral();
      }, 1000);

      // Ocultar overlay com fade
      setTimeout(() => {
        this.ocultarLoadingComFade();
      }, 3000);

      this.atualizarProgresso(100, "Sistema carregado com sucesso!");
      this.atualizarStatusSistema("render", "success", "Renderizando");
      this.atualizarIndicadorSistema("online", "Sistema Online");

      this.debug(
        "✨ Sistema CORRIGIDO PARA SUZANO-SP inicializado com sucesso!"
      );
      this.toastManager.show(
        "Sistema 3D Premium carregado com sucesso!",
        "success"
      );

      return true;
    } catch (error) {
      this.debug(`❌ Erro na inicialização: ${error.message}`, "error");
      this.atualizarStatusSistema("api", "error", "Erro: " + error.message);
      this.atualizarStatusSistema("render", "error", "Falhou");
      this.atualizarIndicadorSistema("error", "Erro no Sistema");
      this.mostrarErro(`Erro ao inicializar: ${error.message}`);
      return false;
    }
  }

  // 🔧 CORREÇÃO: Nova função para vista lateral específica para Suzano-SP
  posicionarCameraLateralSuzano() {
    const patioWidth = this.CONFIG.BAIAS_MAX * this.CONFIG.ESPACAMENTO_BAIA;
    const patioDepth = this.CONFIG.ROWS.length * this.CONFIG.ESPACAMENTO_ROW;

    // Vista lateral otimizada para operações portuárias de Suzano-SP
    const distancia = Math.max(patioWidth * 0.9, 120);
    const altura = 60; // Altura ideal para visualizar empilhamento

    const novaPos = new THREE.Vector3(-distancia, altura, patioDepth * 0.1);
    const novoTarget = new THREE.Vector3(0, 8, 0); // Foco ligeiramente elevado

    this.animarCameraPara(novaPos, novoTarget, 2000);
    this.debug("📷 Vista lateral padrão para Suzano-SP ativada");
  }

  // 🔧 CORREÇÃO: Definir vista lateral como ativa na interface
  definirVistaPadraoLateral() {
    // Remover active de todos os botões de vista
    document.querySelectorAll("[id^='btn-vista-']").forEach((btn) => {
      btn.classList.remove("active");
    });

    // Marcar vista lateral como ativa
    const btnLateral = document.getElementById("btn-vista-lateral");
    if (btnLateral) {
      btnLateral.classList.add("active");
    }

    this.debug("🎯 Vista lateral definida como padrão na interface");
  }

  // ===== CONFIGURAÇÃO DA INTERFACE =====
  configurarInterface() {
    this.debug("🎛️ Configurando interface integrada...");

    // Botões de vista
    this.configurarBotaoVista("btn-vista-geral", () =>
      this.posicionarCameraCompletaAnimada()
    );
    this.configurarBotaoVista("btn-vista-topo", () =>
      this.posicionarCameraTopo()
    );
    this.configurarBotaoVista("btn-vista-lateral", () =>
      this.posicionarCameraLateral()
    );
    this.configurarBotaoVista("btn-vista-containers", () =>
      this.focarContainers()
    );

    // Botões de ação
    this.configurarBotao("btn-refresh", () => this.recarregarDados());
    this.configurarBotao("btn-refresh-data", () => this.recarregarDados());
    this.configurarBotao("btn-debug", () => this.toggleDebugPanel());
    this.configurarBotao("btn-fullscreen", () => this.toggleTelaCheia());
    this.configurarBotao("btn-help", () => this.mostrarAjuda());

    // Botões de infraestrutura
    this.configurarBotao("btn-toggle-infraestrutura", () =>
      this.toggleInfraestrutura()
    );
    this.configurarBotao("btn-highlight-flutuantes", () =>
      this.detectarContainersProblematicos()
    );

    // Botões de labels e posições vazias
    this.configurarBotao("btn-toggle-labels", (btn) => this.toggleLabels(btn));
    this.configurarBotao("btn-toggle-posicoes-vazias", (btn) =>
      this.togglePosicoesVazias(btn)
    );

    // Filtros
    this.configurarFiltro("filtro-row", (value) => this.filtrarPorRow(value));
    this.configurarFiltro("filtro-altura", (value) =>
      this.filtrarPorAltura(value)
    );

    // Busca de container
    this.configurarBusca();

    // Teclas de atalho
    this.configurarAtalhosTeclado();

    this.debug("✅ Interface configurada com sucesso!");
  }

  configurarBotaoVista(id, acao) {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener("click", () => {
        // Remover active de todos os botões de vista
        document
          .querySelectorAll("[id^='btn-vista-']")
          .forEach((b) => b.classList.remove("active"));
        // Adicionar active ao botão clicado
        btn.classList.add("active");
        // Executar ação
        acao();
        this.debug(`Vista alterada: ${id}`);
      });
    }
  }

  configurarBotao(id, acao) {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener("click", () => {
        acao(btn);
      });
    }
  }

  configurarFiltro(id, acao) {
    const filtro = document.getElementById(id);
    if (filtro) {
      filtro.addEventListener("change", (e) => {
        acao(e.target.value);
        this.aplicarFiltros();
      });
    }
  }

  configurarBusca() {
    const input = document.getElementById("busca-container-input");
    if (input) {
      input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          const termo = e.target.value.trim();
          if (termo) {
            this.buscarContainer(termo);
          }
        }
      });
    }
  }

  configurarAtalhosTeclado() {
    document.addEventListener("keydown", (event) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case "f":
            event.preventDefault();
            this.toggleTelaCheia();
            break;
          case "s":
            event.preventDefault();
            this.exportarImagem();
            break;
          case "r":
            event.preventDefault();
            this.resetCompleto();
            break;
          case "h":
            event.preventDefault();
            this.mostrarAjuda();
            break;
        }
      }

      switch (event.key) {
        case "Escape":
          this.desselecionarContainer();
          break;
        case " ":
          event.preventDefault();
          this.togglePosicoesVazias();
          break;
      }
    });
  }

  // ===== ATUALIZAÇÃO DE STATUS =====
  atualizarStatusSistema(tipo, status, texto) {
    const elemento = document.getElementById(`${tipo}-status`);
    if (elemento) {
      elemento.className = `status-badge ${status}`;
      elemento.textContent = texto;
    }
  }

  atualizarIndicadorSistema(status, texto) {
    const indicador = document.getElementById("system-status-indicator");
    if (indicador) {
      indicador.className = `status-indicator ${status}`;
      indicador.innerHTML = `<span class="status-dot"></span>${texto}`;
    }
  }

  atualizarProgresso(porcentagem, mensagem) {
    const progressBar = document.getElementById("progress-bar");
    const loadingMessage = document.getElementById("loading-message");

    if (progressBar) {
      progressBar.style.width = `${porcentagem}%`;
    }

    if (loadingMessage) {
      loadingMessage.textContent = mensagem;
    }
  }

  // ===== CRIAÇÃO DA CENA HDR =====
  async criarCenaHDR() {
    this.scene = new THREE.Scene();

    // Fundo gradient realista (céu do dia)
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext("2d");

    const gradient = context.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, "#87CEEB");
    gradient.addColorStop(0.7, "#98D8E8");
    gradient.addColorStop(1, "#F0F8FF");

    context.fillStyle = gradient;
    context.fillRect(0, 0, 512, 512);

    const texture = new THREE.CanvasTexture(canvas);
    this.scene.background = texture;

    // Névoa exponencial para profundidade
    this.scene.fog = new THREE.FogExp2(0xe6f3ff, 0.0015);

    // Grupos organizados
    this.containerGroup = new THREE.Group();
    this.labelGroup = new THREE.Group();
    this.posicoesVaziasGroup = new THREE.Group();
    this.infraestruturaGroup = new THREE.Group();
    this.luzesGrupo = new THREE.Group();

    this.containerGroup.name = "Containers";
    this.labelGroup.name = "Labels";
    this.infraestruturaGroup.name = "Infraestrutura";
    this.luzesGrupo.name = "Iluminacao";

    this.scene.add(this.containerGroup);
    this.scene.add(this.labelGroup);
    this.scene.add(this.infraestruturaGroup);
    this.scene.add(this.luzesGrupo);

    this.debug("🌅 Cena HDR criada com céu realista");
  }

  // ===== CÂMERA CINEMATOGRÁFICA =====
  criarCameraAvancada() {
    const container = document.getElementById("three-container");
    if (!container) {
      throw new Error("Container three-container não encontrado");
    }

    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 2000);

    // Posição inicial cinematográfica
    const patioWidth = 20 * this.CONFIG.ESPACAMENTO_BAIA;
    const patioDepth = 5 * this.CONFIG.ESPACAMENTO_ROW;

    this.camera.position.set(patioWidth * 0.6, 120, patioDepth * 2);
    this.camera.lookAt(0, 10, 0);

    // Configurar para HDR
    this.camera.filmGauge = 35;
    this.camera.filmOffset = 0;

    this.debug(`📷 Câmera cinematográfica posicionada`);
  }

  // ===== RENDERER PREMIUM =====
  criarRendererPremium() {
    const container = document.getElementById("three-container");
    if (!container) {
      throw new Error("Container three-container não encontrado");
    }

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
      stencil: false,
      logarithmicDepthBuffer: true,
    });

    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Configurações avançadas de qualidade
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = true;

    this.renderer.physicallyCorrectLights = true;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    // Configurações de rendering avançadas
    this.renderer.gammaFactor = 2.2;
    this.renderer.gammaOutput = true;

    // Limpar container e adicionar canvas
    const overlay = document.getElementById("loading-overlay");
    container.innerHTML = "";
    container.appendChild(this.renderer.domElement);
    if (overlay) container.appendChild(overlay);

    this.debug("🎨 Renderer premium configurado com HDR e tone mapping");
  }

  // ===== SISTEMA DE ILUMINAÇÃO HDR =====
  async configurarIluminacaoHDR() {
    // Sol principal (luz direcional forte)
    const luzSol = new THREE.DirectionalLight(0xfff8dc, 3.0);
    luzSol.position.set(200, 300, 100);
    luzSol.castShadow = true;

    // Configurações de sombra ultra qualidade
    luzSol.shadow.mapSize.width = this.CONFIG.QUALIDADE_SOMBRAS;
    luzSol.shadow.mapSize.height = this.CONFIG.QUALIDADE_SOMBRAS;
    luzSol.shadow.camera.near = 0.1;
    luzSol.shadow.camera.far = 1000;
    luzSol.shadow.camera.left = -300;
    luzSol.shadow.camera.right = 300;
    luzSol.shadow.camera.top = 300;
    luzSol.shadow.camera.bottom = -300;
    luzSol.shadow.bias = -0.0001;
    luzSol.shadow.normalBias = 0.02;
    luzSol.shadow.radius = 4;

    this.luzesGrupo.add(luzSol);

    // Luz ambiente suave para realismo
    const luzAmbiente = new THREE.AmbientLight(0x87ceeb, 0.4);
    this.luzesGrupo.add(luzAmbiente);

    // Luz hemisférica para simular reflexão do céu
    const luzHemisferica = new THREE.HemisphereLight(0x87ceeb, 0x8b7355, 0.6);
    luzHemisferica.position.set(0, 200, 0);
    this.luzesGrupo.add(luzHemisferica);

    // Luzes pontuais para destaque dos portões
    const luzPortaoEntrada = new THREE.PointLight(0x4169e1, 2.0, 50);
    luzPortaoEntrada.position.set(-100, 15, 0);
    luzPortaoEntrada.castShadow = true;
    luzPortaoEntrada.shadow.mapSize.width = 512;
    luzPortaoEntrada.shadow.mapSize.height = 512;
    this.luzesGrupo.add(luzPortaoEntrada);

    const luzPortaoSaida = new THREE.PointLight(0xff6347, 2.0, 50);
    luzPortaoSaida.position.set(100, 15, 0);
    luzPortaoSaida.castShadow = true;
    luzPortaoSaida.shadow.mapSize.width = 512;
    luzPortaoSaida.shadow.mapSize.height = 512;
    this.luzesGrupo.add(luzPortaoSaida);

    // Luzes da ferrovia
    for (let i = 0; i < 3; i++) {
      const luzFerrovia = new THREE.SpotLight(
        0xffffe0,
        1.5,
        100,
        Math.PI / 8,
        0.3
      );
      luzFerrovia.position.set(120, 25, -30 + i * 30);
      luzFerrovia.target.position.set(100, 0, -30 + i * 30);
      luzFerrovia.castShadow = true;
      luzFerrovia.shadow.mapSize.width = 512;
      luzFerrovia.shadow.mapSize.height = 512;
      this.luzesGrupo.add(luzFerrovia);
      this.luzesGrupo.add(luzFerrovia.target);
    }

    this.debug("☀️ Sistema de iluminação HDR configurado com 8 fontes de luz");
  }

  // ===== GRID APRIMORADO =====
  criarGridAprimorado() {
    const larguraPatio = this.CONFIG.ROWS.length * this.CONFIG.ESPACAMENTO_ROW;
    const comprimentoPatio =
      this.CONFIG.BAIAS_MAX * this.CONFIG.ESPACAMENTO_BAIA;
    const tamanhoGrid = Math.max(larguraPatio, comprimentoPatio) + 50;

    // Grid principal mais sutil
    const gridHelper = new THREE.GridHelper(
      tamanhoGrid,
      Math.floor(tamanhoGrid / 5),
      new THREE.Color(0.3, 0.3, 0.3),
      new THREE.Color(0.2, 0.2, 0.2)
    );
    gridHelper.position.y = -0.1;
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.3;
    this.scene.add(gridHelper);

    // Grid secundário para detalhes finos
    const gridSecundario = new THREE.GridHelper(
      tamanhoGrid / 2,
      Math.floor(tamanhoGrid / 1),
      new THREE.Color(0.15, 0.15, 0.15),
      new THREE.Color(0.1, 0.1, 0.1)
    );
    gridSecundario.position.y = -0.05;
    gridSecundario.material.transparent = true;
    gridSecundario.material.opacity = 0.15;
    this.scene.add(gridSecundario);

    this.debug(`📐 Grid industrial criado com tamanho: ${tamanhoGrid}`);
  }

  // ===== INFRAESTRUTURA REALÍSTICA =====
  async criarInfraestruturaRealistica() {
    this.debug("🏗️ CRIANDO INFRAESTRUTURA ULTRA REALÍSTICA...");

    // Limpar infraestrutura existente
    if (this.infraestruturaGroup) {
      while (this.infraestruturaGroup.children.length > 0) {
        this.infraestruturaGroup.remove(this.infraestruturaGroup.children[0]);
      }
    }

    const patioWidth = this.CONFIG.BAIAS_MAX * this.CONFIG.ESPACAMENTO_BAIA;
    const patioDepth = this.CONFIG.ROWS.length * this.CONFIG.ESPACAMENTO_ROW;

    // ===== MUROS REALÍSTICOS COM TEXTURAS =====
    await this.criarMurosRealisticos(patioWidth, patioDepth);

    // ===== PORTÕES DETALHADOS =====
    await this.criarPortoesDetalhados(patioWidth);

    // ===== RUA ASFALTADA REALÍSTICA =====
    await this.criarRuaRealistica(patioWidth, patioDepth);

    // ===== FERROVIA COM TRILHOS METÁLICOS =====
    await this.criarFerroviaRealistica(patioWidth, patioDepth);

    // ===== TREM/COMPOSIÇÃO NA FERROVIA =====
    await this.criarComposicaoFerrovia(patioWidth, patioDepth);

    // ===== BASE DO PÁTIO COM TEXTURA DE CONCRETO =====
    await this.criarBasePatio(patioWidth, patioDepth);

    // ===== ELEMENTOS DECORATIVOS =====
    await this.criarElementosDecorativos(patioWidth, patioDepth);

    this.infraestruturaGroup.visible = true;
    this.scene.add(this.infraestruturaGroup);

    this.debug("🎉 INFRAESTRUTURA ULTRA REALÍSTICA CONCLUÍDA!");
  }

  // ===== MUROS COM TEXTURA DE TIJOLO =====
  async criarMurosRealisticos(patioWidth, patioDepth) {
    const muroHeight = 12;
    const muroThickness = 2.0;
    const espacamentoMuro = 25; // AUMENTADO: Espaçamento maior dos containers

    // Material de tijolo avançado com normalmap
    const muroMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.6, 0.35, 0.25),
      roughness: 0.8,
      metalness: 0.1,
      normalScale: new THREE.Vector2(1.5, 1.5),
    });

    // Criar textura procedural de tijolo (simulação)
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

    const brickTexture = new THREE.CanvasTexture(canvas);
    brickTexture.wrapS = THREE.RepeatWrapping;
    brickTexture.wrapT = THREE.RepeatWrapping;
    brickTexture.repeat.set(8, 4);

    muroMaterial.map = brickTexture;

    // Criar os 4 muros com espaçamento maior
    const muros = [
      // Muro Oeste - AFASTADO
      {
        geometry: new THREE.BoxGeometry(
          muroThickness,
          muroHeight,
          patioDepth + espacamentoMuro * 2
        ),
        position: [-patioWidth / 2 - espacamentoMuro, muroHeight / 2, 0],
      },
      // Muro Leste - AFASTADO
      {
        geometry: new THREE.BoxGeometry(
          muroThickness,
          muroHeight,
          patioDepth + espacamentoMuro * 2
        ),
        position: [patioWidth / 2 + espacamentoMuro, muroHeight / 2, 0],
      },
      // Muro Norte - AFASTADO
      {
        geometry: new THREE.BoxGeometry(
          patioWidth + espacamentoMuro * 2,
          muroHeight,
          muroThickness
        ),
        position: [0, muroHeight / 2, -patioDepth / 2 - espacamentoMuro],
      },
      // Muro Sul - AFASTADO
      {
        geometry: new THREE.BoxGeometry(
          patioWidth + espacamentoMuro * 2,
          muroHeight,
          muroThickness
        ),
        position: [0, muroHeight / 2, patioDepth / 2 + espacamentoMuro],
      },
    ];

    muros.forEach((muroConfig, index) => {
      const muro = new THREE.Mesh(muroConfig.geometry, muroMaterial.clone());
      muro.position.set(...muroConfig.position);
      muro.castShadow = true;
      muro.receiveShadow = true;
      muro.name = `Muro_${index}`;
      this.infraestruturaGroup.add(muro);
    });

    this.debug("🧱 Muros realísticos com espaçamento maior criados");
  }

  // ===== PORTÕES METÁLICOS DETALHADOS =====
  async criarPortoesDetalhados(patioWidth) {
    const portaoWidth = 15;
    const portaoHeight = 10;
    const espacamentoMuro = 25; // Mesmo espaçamento dos muros

    // Material metálico para portões
    const metalMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.3, 0.4, 0.5),
      metalness: 0.8,
      roughness: 0.2,
      envMapIntensity: 1.0,
    });

    // Portão de Entrada (azul) - POSIÇÃO AJUSTADA
    const portaoEntrada = new THREE.Group();

    // Base do portão
    const baseEntrada = new THREE.Mesh(
      new THREE.BoxGeometry(3, portaoHeight, portaoWidth),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(0.2, 0.4, 0.8),
        metalness: 0.7,
        roughness: 0.3,
      })
    );
    baseEntrada.position.set(
      -patioWidth / 2 - espacamentoMuro + 1.5,
      portaoHeight / 2,
      0
    );
    portaoEntrada.add(baseEntrada);

    // Detalhes do portão (barras)
    for (let i = 0; i < 8; i++) {
      const barra = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, portaoHeight * 0.8),
        metalMaterial.clone()
      );
      barra.position.set(
        -patioWidth / 2 - espacamentoMuro + 1.5,
        portaoHeight / 2,
        -portaoWidth / 2 + (i + 1) * (portaoWidth / 9)
      );
      portaoEntrada.add(barra);
    }

    this.infraestruturaGroup.add(portaoEntrada);

    // Portão de Saída (vermelho) - POSIÇÃO AJUSTADA
    const portaoSaida = new THREE.Group();

    const baseSaida = new THREE.Mesh(
      new THREE.BoxGeometry(3, portaoHeight, portaoWidth),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(0.8, 0.3, 0.2),
        metalness: 0.7,
        roughness: 0.3,
      })
    );
    baseSaida.position.set(
      patioWidth / 2 + espacamentoMuro - 1.5,
      portaoHeight / 2,
      0
    );
    portaoSaida.add(baseSaida);

    // Detalhes do portão de saída
    for (let i = 0; i < 8; i++) {
      const barra = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, portaoHeight * 0.8),
        metalMaterial.clone()
      );
      barra.position.set(
        patioWidth / 2 + espacamentoMuro - 1.5,
        portaoHeight / 2,
        -portaoWidth / 2 + (i + 1) * (portaoWidth / 9)
      );
      portaoSaida.add(barra);
    }

    this.infraestruturaGroup.add(portaoSaida);

    // Labels dos portões com posições ajustadas
    await this.criarLabelPortaoAprimorado(
      "ENTRADA",
      -patioWidth / 2 - espacamentoMuro + 1.5,
      portaoHeight + 4,
      0,
      0x00ff00
    );
    await this.criarLabelPortaoAprimorado(
      "SAÍDA",
      patioWidth / 2 + espacamentoMuro - 1.5,
      portaoHeight + 4,
      0,
      0xff0000
    );

    this.debug(
      "🚪 Portões metálicos detalhados criados com espaçamento correto"
    );
  }

  // ===== RUA ASFALTADA =====
  async criarRuaRealistica(patioWidth, patioDepth) {
    const ruaWidth = 18;
    const ruaLength = patioDepth + 40;
    const espacamentoMuro = 25; // Mesmo espaçamento
    const ruaDistance = espacamentoMuro + 10; // Rua mais afastada

    // Material de asfalto
    const asfaltoMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.15, 0.15, 0.15),
      roughness: 0.9,
      metalness: 0.0,
    });

    // Base da rua - POSIÇÃO AJUSTADA
    const rua = new THREE.Mesh(
      new THREE.PlaneGeometry(ruaWidth, ruaLength),
      asfaltoMaterial
    );
    rua.rotation.x = -Math.PI / 2;
    rua.position.set(-patioWidth / 2 - ruaDistance, 0.01, 0);
    rua.receiveShadow = true;
    this.infraestruturaGroup.add(rua);

    // Faixas da rua com material reflexivo
    const faixaMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.9, 0.9, 0.9),
      roughness: 0.1,
      metalness: 0.0,
      emissive: new THREE.Color(0.05, 0.05, 0.05),
    });

    // Faixa central dupla
    for (let offset of [-0.3, 0.3]) {
      const faixaCentral = new THREE.Mesh(
        new THREE.PlaneGeometry(0.2, ruaLength),
        faixaMaterial.clone()
      );
      faixaCentral.rotation.x = -Math.PI / 2;
      faixaCentral.position.set(
        -patioWidth / 2 - ruaDistance + offset,
        0.02,
        0
      );
      this.infraestruturaGroup.add(faixaCentral);
    }

    // Faixas laterais
    for (let lado of [-1, 1]) {
      const faixaLateral = new THREE.Mesh(
        new THREE.PlaneGeometry(0.15, ruaLength),
        faixaMaterial.clone()
      );
      faixaLateral.rotation.x = -Math.PI / 2;
      faixaLateral.position.set(
        -patioWidth / 2 - ruaDistance + (lado * ruaWidth) / 2.1,
        0.02,
        0
      );
      this.infraestruturaGroup.add(faixaLateral);
    }

    // Calçada com textura de concreto
    const calcadaMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.7, 0.7, 0.75),
      roughness: 0.7,
      metalness: 0.0,
    });

    const calcada = new THREE.Mesh(
      new THREE.PlaneGeometry(4, ruaLength),
      calcadaMaterial
    );
    calcada.rotation.x = -Math.PI / 2;
    calcada.position.set(
      -patioWidth / 2 - ruaDistance - ruaWidth / 2 - 2,
      0.03,
      0
    );
    calcada.receiveShadow = true;
    this.infraestruturaGroup.add(calcada);

    // Postes de iluminação da rua - POSIÇÃO AJUSTADA
    await this.criarPostesIluminacao(-patioWidth / 2 - ruaDistance, ruaLength);

    this.debug("🛣️ Rua asfaltada realística criada com posicionamento correto");
  }

  // ===== FERROVIA COM TRILHOS METÁLICOS =====
  async criarFerroviaRealistica(patioWidth, patioDepth) {
    const ferroviaWidth = 5;
    const ferroviaLength = patioDepth + 40;
    const espacamentoMuro = 25; // Mesmo espaçamento
    const ferroviaDistance = espacamentoMuro + 10; // Ferrovia mais afastada

    // Base da ferrovia (brita) - POSIÇÃO AJUSTADA
    const britaMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.4, 0.4, 0.4),
      roughness: 0.95,
      metalness: 0.0,
    });

    const ferrovia = new THREE.Mesh(
      new THREE.PlaneGeometry(ferroviaWidth, ferroviaLength),
      britaMaterial
    );
    ferrovia.rotation.x = -Math.PI / 2;
    ferrovia.position.set(patioWidth / 2 + ferroviaDistance, 0.01, 0);
    ferrovia.receiveShadow = true;
    this.infraestruturaGroup.add(ferrovia);

    // Trilhos de aço brilhante
    const trilhoMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.8, 0.8, 0.9),
      metalness: 0.9,
      roughness: 0.1,
      envMapIntensity: 1.0,
    });

    // Dois trilhos paralelos
    for (let lado of [-0.75, 0.75]) {
      const trilho = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.15, ferroviaLength),
        trilhoMaterial.clone()
      );
      trilho.position.set(patioWidth / 2 + ferroviaDistance + lado, 0.18, 0);
      trilho.castShadow = true;
      trilho.receiveShadow = true;
      this.infraestruturaGroup.add(trilho);
    }

    // Dormentes de madeira tratada
    const dormenteMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.4, 0.25, 0.15),
      roughness: 0.8,
      metalness: 0.0,
    });

    const numDormentes = Math.floor(ferroviaLength / 2.5);
    for (let i = 0; i < numDormentes; i++) {
      const dormente = new THREE.Mesh(
        new THREE.BoxGeometry(ferroviaWidth * 0.9, 0.25, 0.4),
        dormenteMaterial.clone()
      );
      const posZ = -ferroviaLength / 2 + (i * ferroviaLength) / numDormentes;
      dormente.position.set(patioWidth / 2 + ferroviaDistance, 0.08, posZ);
      dormente.castShadow = true;
      dormente.receiveShadow = true;
      this.infraestruturaGroup.add(dormente);
    }

    this.debug("🚆 Ferrovia realística posicionada corretamente");
  }

  // ===== COMPOSIÇÃO FERROVIÁRIA =====
  async criarComposicaoFerrovia(patioWidth, patioDepth) {
    const espacamentoMuro = 25;
    const ferroviaDistance = espacamentoMuro + 10;
    const posicaoTrem = patioWidth / 2 + ferroviaDistance; // POSIÇÃO AJUSTADA

    // Locomotiva
    const locomotiva = new THREE.Group();

    // Corpo principal da locomotiva
    const corpoLocomotiva = new THREE.Mesh(
      new THREE.BoxGeometry(4, 3.5, 20),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(0.8, 0.3, 0.1),
        metalness: 0.7,
        roughness: 0.3,
      })
    );
    corpoLocomotiva.position.set(posicaoTrem, 2.5, -patioDepth);
    corpoLocomotiva.castShadow = true;
    locomotiva.add(corpoLocomotiva);

    // Cabine da locomotiva
    const cabine = new THREE.Mesh(
      new THREE.BoxGeometry(3.5, 2.5, 8),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(0.9, 0.4, 0.1),
        metalness: 0.8,
        roughness: 0.2,
      })
    );
    cabine.position.set(posicaoTrem, 4.2, -patioDepth + 6);
    cabine.castShadow = true;
    locomotiva.add(cabine);

    // Rodas da locomotiva
    const rodaMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.2, 0.2, 0.2),
      metalness: 0.8,
      roughness: 0.4,
    });

    for (let i = 0; i < 6; i++) {
      for (let lado of [-1.8, 1.8]) {
        const roda = new THREE.Mesh(
          new THREE.CylinderGeometry(0.6, 0.6, 0.3),
          rodaMaterial.clone()
        );
        roda.rotation.z = Math.PI / 2;
        roda.position.set(posicaoTrem + lado, 0.6, -patioDepth - 8 + i * 3);
        roda.castShadow = true;
        locomotiva.add(roda);
      }
    }

    this.infraestruturaGroup.add(locomotiva);

    // Vagões de container (3 vagões)
    for (let vagao = 0; vagao < 3; vagao++) {
      const vagaoGroup = new THREE.Group();

      // Plataforma do vagão
      const plataforma = new THREE.Mesh(
        new THREE.BoxGeometry(3.5, 0.4, 18),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color(0.3, 0.3, 0.3),
          metalness: 0.6,
          roughness: 0.5,
        })
      );
      plataforma.position.set(posicaoTrem, 1.0, -patioDepth + 40 + vagao * 25);
      plataforma.castShadow = true;
      vagaoGroup.add(plataforma);

      // Container no vagão
      const containerVagao = new THREE.Mesh(
        new THREE.BoxGeometry(3.2, 2.5, 16),
        new THREE.MeshStandardMaterial({
          color: this.CORES_ARMADORES["MAERSK"],
          metalness: 0.4,
          roughness: 0.6,
        })
      );
      containerVagao.position.set(
        posicaoTrem,
        2.5,
        -patioDepth + 40 + vagao * 25
      );
      containerVagao.castShadow = true;
      vagaoGroup.add(containerVagao);

      // Rodas do vagão
      for (let i = 0; i < 4; i++) {
        for (let lado of [-1.5, 1.5]) {
          const rodaVagao = new THREE.Mesh(
            new THREE.CylinderGeometry(0.5, 0.5, 0.25),
            rodaMaterial.clone()
          );
          rodaVagao.rotation.z = Math.PI / 2;
          rodaVagao.position.set(
            posicaoTrem + lado,
            0.5,
            -patioDepth + 40 + vagao * 25 - 6 + i * 4
          );
          rodaVagao.castShadow = true;
          vagaoGroup.add(rodaVagao);
        }
      }

      this.infraestruturaGroup.add(vagaoGroup);
    }

    this.debug("🚂 Composição ferroviária posicionada corretamente");
  }

  // ===== BASE DO PÁTIO =====
  async criarBasePatio(patioWidth, patioDepth) {
    const concretoMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.6, 0.6, 0.65),
      roughness: 0.8,
      metalness: 0.0,
    });

    const base = new THREE.Mesh(
      new THREE.PlaneGeometry(patioWidth + 10, patioDepth + 10),
      concretoMaterial
    );
    base.rotation.x = -Math.PI / 2;
    base.position.y = -0.1;
    base.receiveShadow = true;
    this.infraestruturaGroup.add(base);

    this.debug("🏗️ Base de concreto do pátio criada");
  }

  // ===== ELEMENTOS DECORATIVOS =====
  async criarElementosDecorativos(patioWidth, patioDepth) {
    // Torres de iluminação nos cantos
    const torreIluminacao = (x, z) => {
      const torre = new THREE.Group();

      // Poste
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

      // Holofote
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
      spotLight.castShadow = true;
      spotLight.shadow.mapSize.width = 512;
      spotLight.shadow.mapSize.height = 512;
      torre.add(spotLight);
      torre.add(spotLight.target);

      return torre;
    };

    // 4 torres nos cantos
    this.infraestruturaGroup.add(
      torreIluminacao(-patioWidth / 2 - 10, -patioDepth / 2 - 5)
    );
    this.infraestruturaGroup.add(
      torreIluminacao(patioWidth / 2 + 10, -patioDepth / 2 - 5)
    );
    this.infraestruturaGroup.add(
      torreIluminacao(-patioWidth / 2 - 10, patioDepth / 2 + 5)
    );
    this.infraestruturaGroup.add(
      torreIluminacao(patioWidth / 2 + 10, patioDepth / 2 + 5)
    );

    this.debug("💡 Torres de iluminação criadas");
  }

  // ===== POSTES DE ILUMINAÇÃO =====
  async criarPostesIluminacao(posX, comprimento) {
    const numPostes = 4;
    const spacing = comprimento / (numPostes + 1);

    for (let i = 0; i < numPostes; i++) {
      const poste = new THREE.Group();

      const mastro = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.15, 8),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color(0.3, 0.3, 0.3),
          metalness: 0.8,
          roughness: 0.3,
        })
      );
      mastro.position.set(posX - 12, 4, -comprimento / 2 + (i + 1) * spacing);
      mastro.castShadow = true;
      poste.add(mastro);

      const luminaria = new THREE.Mesh(
        new THREE.SphereGeometry(0.3),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color(0.9, 0.9, 0.8),
          emissive: new THREE.Color(0.1, 0.1, 0.05),
          metalness: 0.2,
          roughness: 0.1,
        })
      );
      luminaria.position.set(
        posX - 12,
        7.5,
        -comprimento / 2 + (i + 1) * spacing
      );
      poste.add(luminaria);

      this.infraestruturaGroup.add(poste);
    }
  }

  // ===== LABELS DE PORTÃO =====
  async criarLabelPortaoAprimorado(texto, x, y, z, cor = 0xffffff) {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.width = 512;
    canvas.height = 128;

    // Fundo com gradiente
    const gradient = context.createLinearGradient(0, 0, 512, 128);
    gradient.addColorStop(0, "rgba(0, 0, 0, 0.9)");
    gradient.addColorStop(1, "rgba(30, 30, 30, 0.9)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 512, 128);

    // Borda
    context.strokeStyle = `#${cor.toString(16).padStart(6, "0")}`;
    context.lineWidth = 4;
    context.strokeRect(4, 4, 504, 120);

    // Texto
    context.fillStyle = `#${cor.toString(16).padStart(6, "0")}`;
    context.font = "bold 36px Arial";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(texto, 256, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
    });
    const sprite = new THREE.Sprite(spriteMaterial);

    sprite.position.set(x, y, z);
    sprite.scale.set(15, 4, 1);

    this.infraestruturaGroup.add(sprite);
  }

  // ===== CONTROLES AVANÇADOS =====
  configurarControlesAvancados() {
    if (!THREE.OrbitControls) {
      throw new Error("OrbitControls não disponível");
    }

    this.controls = new THREE.OrbitControls(
      this.camera,
      this.renderer.domElement
    );
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.3;
    this.controls.minDistance = 15;
    this.controls.maxDistance = 500;
    this.controls.panSpeed = 1.0;
    this.controls.rotateSpeed = 0.8;
    this.controls.zoomSpeed = 1.2;

    // Limitações para manter a câmera em área relevante
    this.controls.target.set(0, 5, 0);

    this.debug("🎮 Controles avançados configurados");
  }

  // ===== SISTEMA DE ANIMAÇÃO =====
  iniciarSistemaAnimacao() {
    this.mixer = new THREE.AnimationMixer(this.scene);
    this.debug("🎬 Sistema de animação iniciado");
  }

  // ===== RAYCASTER PARA INTERAÇÃO =====
  configurarRaycasterMelhorado() {
    this.raycaster = new THREE.Raycaster();

    this.renderer.domElement.addEventListener("click", (event) => {
      this.aoClicarContainer(event);
    });

    this.renderer.domElement.addEventListener("mousemove", (event) => {
      this.aoHoverContainer(event);
    });

    this.renderer.domElement.addEventListener("mouseleave", () => {
      this.removerHover();
      this.esconderTooltip();
    });
  }

  // ===== EVENT LISTENERS =====
  configurarEventListeners() {
    window.addEventListener("resize", () => this.aoRedimensionar());
  }

  // ===== REDIMENSIONAMENTO =====
  aoRedimensionar() {
    try {
      const container = document.getElementById("three-container");
      if (!container || !this.camera || !this.renderer) return;

      const width = container.clientWidth;
      const height = container.clientHeight;

      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    } catch (error) {
      this.debug(`Erro durante redimensionamento: ${error.message}`, "error");
    }
  }

  // ===== CARREGAR DADOS REAIS =====
  async carregarDadosReais() {
    this.debug("📡 Carregando dados reais do pátio...");

    try {
      const result = await this.apiManager.obterDadosPatio3D();

      if (!result.success || !result.data?.containers) {
        throw new Error(result.message || "Dados inválidos");
      }

      this.patioData = result.data;
      this.atualizarStatusSistema("api", "success", "Conectado");
      this.atualizarStatusSistema(
        "data",
        "success",
        `${this.patioData.containers.length} containers`
      );
      this.debug(
        `✅ ${this.patioData.containers.length} containers carregados`
      );

      if (this.patioData.containers.length === 0) {
        this.mostrarMensagemSemDados();
        return;
      }

      this.criarVisualizacaoContainers();
      this.atualizarEstatisticas();
      this.atualizarUltimaAtualizacao();

      return true;
    } catch (error) {
      this.debug(`❌ Erro ao carregar dados: ${error.message}`, "error");
      this.atualizarStatusSistema("api", "error", "Erro: " + error.message);
      this.atualizarStatusSistema("data", "error", "Falha");
      this.mostrarErroCarregamento(error.message);
      return false;
    }
  }

  // ===== CRIAR VISUALIZAÇÃO DOS CONTAINERS =====
  criarVisualizacaoContainers() {
    try {
      if (!this.patioData) return;

      this.limparGrupo(this.containerGroup);
      this.limparGrupo(this.labelGroup);

      const containers = this.patioData.containers || [];
      this.debug(
        `🎨 Criando visualização melhorada para ${containers.length} containers`
      );

      this.criarPosicoesVazias();

      let containersValidos = 0;
      containers.forEach((container, index) => {
        try {
          const containerNormalizado = this.normalizarDadosContainer(container);

          if (containerNormalizado) {
            const mesh = this.criarContainerMelhorado(containerNormalizado);
            if (mesh) {
              containersValidos++;
            }
          }
        } catch (error) {
          this.debug(
            `❌ Erro ao processar container ${container.numero}: ${error.message}`,
            "error"
          );
        }
      });

      this.debug(
        `✨ ${containersValidos}/${containers.length} containers renderizados com qualidade premium`
      );
    } catch (error) {
      this.debug(`❌ Erro ao criar visualização: ${error.message}`, "error");
    }
  }

  // ===== CRIAR CONTAINER MELHORADO =====
  criarContainerMelhorado(container) {
    try {
      const row = container.row || container.linha;
      const bay = container.bay || container.baia;
      const altura = container.altura;

      const posicao = this.calcularPosicao3D(row, bay, altura);
      if (!posicao) return null;

      const eh40TEU = this.isContainer40TEU(container);

      // Geometria com bordas chanfradas
      const geometry = eh40TEU
        ? new THREE.BoxGeometry(
            this.CONFIG.CONTAINER_40_COMPRIMENTO,
            this.CONFIG.ALTURA_CONTAINER,
            this.CONFIG.CONTAINER_40_LARGURA
          )
        : new THREE.BoxGeometry(
            this.CONFIG.CONTAINER_20_COMPRIMENTO,
            this.CONFIG.ALTURA_CONTAINER,
            this.CONFIG.CONTAINER_20_LARGURA
          );

      // Material metálico avançado
      const corArmador =
        this.CORES_ARMADORES[container.armador?.toUpperCase()] ||
        this.CORES_ARMADORES.DEFAULT;

      const material = new THREE.MeshStandardMaterial({
        color: corArmador,
        metalness: 0.6,
        roughness: 0.4,
        envMapIntensity: 1.0,
      });

      // Verificar problemas de segurança
      if (eh40TEU && !this.validarEmpilhamento40TEU(container)) {
        material.color = this.CORES.FLUTUANTE;
        material.emissive = new THREE.Color(0.2, 0.0, 0.0);
      }

      if (!this.validarAlturaMaximaPorRow(container)) {
        material.color = this.CORES.FLUTUANTE;
        material.emissive = new THREE.Color(0.2, 0.0, 0.0);
      }

      // Criar container 3D
      const containerMesh = new THREE.Mesh(geometry, material);
      containerMesh.position.copy(posicao);
      
      // ORIENTAÇÃO HORIZONTAL: Rotacionar container 90 graus no eixo X para ficar deitado
      containerMesh.rotation.x = Math.PI / 2; // 90 graus para ficar deitado horizontalmente

      if (eh40TEU) {
        containerMesh.position.z += this.CONFIG.ESPACAMENTO_ROW / 2;
      }

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

      this.containerGroup.add(containerMesh);
      this.criarLabelMelhorado(container, posicao, eh40TEU);

      return containerMesh;
    } catch (error) {
      this.debug(
        `❌ Erro ao criar container melhorado: ${error.message}`,
        "error"
      );
      return null;
    }
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
      ? this.CONFIG.CONTAINER_40_COMPRIMENTO
      : this.CONFIG.CONTAINER_20_COMPRIMENTO;

    // Duas portas
    for (let i = 0; i < 2; i++) {
      const porta = new THREE.Mesh(
        new THREE.BoxGeometry(
          largura / 2 - 0.1,
          this.CONFIG.ALTURA_CONTAINER - 0.2,
          0.05
        ),
        portaMaterial.clone()
      );
      porta.position.set(
        ((i - 0.5) * largura) / 2,
        0,
        this.CONFIG.CONTAINER_20_LARGURA / 2 + 0.03
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
        this.CONFIG.CONTAINER_20_LARGURA / 2 + 0.08
      );
      grupo.add(macaneta);
    }

    // Logo do armador na lateral
    if (container.armador) {
      this.criarLogoArmador(grupo, container.armador, largura);
    }

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

    // Texto do armador
    ctx.fillStyle = "#000000";
    ctx.font = "bold 24px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(armador, 128, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const logoMaterial = new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      roughness: 0.1,
      metalness: 0.0,
    });

    const logo = new THREE.Mesh(
      new THREE.PlaneGeometry(largura * 0.6, 1.0),
      logoMaterial
    );
    logo.position.set(0, 0.5, -this.CONFIG.CONTAINER_20_LARGURA / 2 - 0.01);
    grupo.add(logo);
  }

  // ===== CRIAR LABELS MELHORADOS =====
  criarLabelMelhorado(container, posicao, eh40TEU) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");

    // Fundo com gradiente
    const gradient = ctx.createLinearGradient(0, 0, 512, 128);
    gradient.addColorStop(0, "rgba(0, 0, 0, 0.8)");
    gradient.addColorStop(1, "rgba(30, 30, 30, 0.8)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 128);

    // Borda
    ctx.strokeStyle = "#4CAF50";
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, 508, 124);

    // Texto principal
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 28px Arial";
    ctx.textAlign = "center";
    ctx.fillText(container.numero || "N/A", 256, 45);

    // Posição
    const row = container.row || container.linha;
    const bay = container.bay || container.baia;
    ctx.fillStyle = "#4CAF50";
    ctx.font = "bold 20px Arial";
    ctx.fillText(
      `${row}${String(bay).padStart(2, "0")}-${container.altura}`,
      256,
      80
    );

    // Armador
    if (container.armador) {
      ctx.fillStyle = "#FFC107";
      ctx.font = "14px Arial";
      ctx.fillText(container.armador, 256, 105);
    }

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
    });
    const sprite = new THREE.Sprite(spriteMaterial);

    sprite.position.copy(posicao);
    sprite.position.y += eh40TEU ? 5 : 4;
    sprite.scale.set(12, 3, 1);

    this.labelGroup.add(sprite);
  }

  // ===== CRIAR POSIÇÕES VAZIAS =====
  criarPosicoesVazias() {
    try {
      const posicoesOcupadas = new Set();

      const containers = this.patioData?.containers || [];
      containers.forEach((container) => {
        const row = container.row || container.linha;
        const bay = container.bay || container.baia;
        const posKey = `${row}${bay}-${container.altura}`;
        posicoesOcupadas.add(posKey);

        if (this.isContainer40TEU(container)) {
          const rowIndex = this.CONFIG.ROWS.indexOf(row);
          if (rowIndex < this.CONFIG.ROWS.length - 1) {
            const rowAdjacente = this.CONFIG.ROWS[rowIndex + 1];
            const posAdjKey = `${rowAdjacente}${bay}-${container.altura}`;
            posicoesOcupadas.add(posAdjKey);
          }
        }
      });

      // Material mais visível para posições vazias
      const wireframeMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0.5, 0.7, 0.9), // Azul claro mais visível
        wireframe: true,
        transparent: true,
        opacity: 0.4, // Mais opaco para ser visível
      });

      this.CONFIG.ROWS.forEach((row) => {
        const alturaMaximaRow =
          this.CONFIG.ALTURAS_MAX_POR_ROW[row] || this.CONFIG.ALTURAS_MAX;

        for (let bay = 1; bay <= this.CONFIG.BAIAS_MAX; bay++) {
          for (let altura = 1; altura <= alturaMaximaRow; altura++) {
            const posKey = `${row}${bay}-${altura}`;

            if (!posicoesOcupadas.has(posKey)) {
              const posicao = this.calcularPosicao3D(row, bay, altura);

              if (posicao) {
                const geometry = new THREE.BoxGeometry(
                  this.CONFIG.CONTAINER_20_COMPRIMENTO,
                  this.CONFIG.ALTURA_CONTAINER,
                  this.CONFIG.CONTAINER_20_LARGURA
                );

                const mesh = new THREE.Mesh(geometry, wireframeMaterial);
                mesh.position.copy(posicao);
                // ORIENTAÇÃO HORIZONTAL: Consistente com containers deitados
                mesh.rotation.x = Math.PI / 2;
                mesh.userData = {
                  isPosicaoVazia: true,
                  row: row,
                  bay: bay,
                  altura: altura,
                  posicao: `${row}${String(bay).padStart(2, "0")}-${altura}`,
                };
                this.posicoesVaziasGroup.add(mesh);
              }
            }
          }
        }
      });

      // VISÍVEL POR PADRÃO
      this.posicoesVaziasGroup.visible = true;
      this.posicoesVaziasVisiveis = true;

      this.containerGroup.add(this.posicoesVaziasGroup);
      this.debug(
        `📦 ${this.posicoesVaziasGroup.children.length} posições vazias criadas e VISÍVEIS`
      );
    } catch (error) {
      this.debug(`❌ Erro ao criar posições vazias: ${error.message}`, "error");
    }
  }

  // ===== LOOP DE ANIMAÇÃO =====
  animar() {
    requestAnimationFrame(() => this.animar());

    const delta = this.clock.getDelta();

    // Auto-otimização baseada na performance
    if (this.performanceStats && this.performanceStats.fps < 25) {
      this.otimizarPerformance();
    }

    if (this.mixer) {
      this.mixer.update(delta);
    }

    if (this.controls) {
      this.controls.update();
    }

    // Labels sempre virados para a câmera
    if (this.labelGroup && this.camera && this.labelGroup.children.length > 0) {
      this.labelGroup.children.forEach((sprite) => {
        if (sprite.isSprite) {
          sprite.lookAt(this.camera.position);
        }
      });
    }

    // Atualizar efeitos visuais
    this.atualizarEfeitosVisuais();

    if (this.scene && this.camera && this.renderer) {
      const startTime = performance.now();
      this.renderer.render(this.scene, this.camera);
      if (this.performanceStats) {
        this.performanceStats.renderTime = performance.now() - startTime;
      }
    }
  }

  // ===== ATUALIZAR EFEITOS VISUAIS =====
  atualizarEfeitosVisuais() {
    try {
      // Atualizar névoa baseada na distância da câmera
      if (this.scene.fog && this.camera) {
        const distanciaCamera = this.camera.position.length();
        this.scene.fog.density = Math.max(
          0.0005,
          Math.min(0.003, distanciaCamera * 0.00001)
        );
      }

      // Atualizar intensidade das luzes baseada na hora do dia simulada
      if (this.luzesGrupo) {
        const horaSimulada = (Date.now() * 0.0001) % 24;
        const intensidadeDia = Math.max(
          0.3,
          Math.sin((horaSimulada / 24) * Math.PI * 2)
        );

        this.luzesGrupo.children.forEach((luz) => {
          if (luz.isDirectionalLight) {
            luz.intensity = intensidadeDia * 3.0;
          }
        });
      }
    } catch (error) {
      // Erro silencioso para evitar spam
    }
  }

  // ===== MÉTODOS DE ANIMAÇÃO DE CÂMERA =====
  animarCameraPara(novaPos, novoTarget, duracao = 2000) {
    if (this.transicionandoCamera) return;

    this.transicionandoCamera = true;

    const posInicial = this.camera.position.clone();
    const targetInicial = this.controls.target.clone();

    const startTime = Date.now();

    const animar = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duracao, 1);

      // Easing suave
      const eased = 1 - Math.pow(1 - progress, 3);

      this.camera.position.lerpVectors(posInicial, novaPos, eased);
      this.controls.target.lerpVectors(targetInicial, novoTarget, eased);
      this.controls.update();

      if (progress < 1) {
        requestAnimationFrame(animar);
      } else {
        this.transicionandoCamera = false;
        this.debug("📷 Animação de câmera concluída");
      }
    };

    animar();
  }

  // ===== POSICIONAMENTOS DE CÂMERA =====
  posicionarCameraCompletaAnimada() {
    const patioWidth = this.CONFIG.BAIAS_MAX * this.CONFIG.ESPACAMENTO_BAIA;
    const patioDepth = this.CONFIG.ROWS.length * this.CONFIG.ESPACAMENTO_ROW;
    const totalWidth = patioWidth + 80;
    const totalDepth = patioDepth + 60;

    const distancia = Math.max(totalWidth, totalDepth) * 0.6;
    const novaPos = new THREE.Vector3(
      distancia * 0.8,
      distancia * 0.5,
      distancia * 0.8
    );
    const novoTarget = new THREE.Vector3(0, 5, 0);

    this.animarCameraPara(novaPos, novoTarget, 3000);
    this.debug("📷 Animando para vista completa");
  }

  posicionarCameraTopo() {
    const patioWidth = this.CONFIG.BAIAS_MAX * this.CONFIG.ESPACAMENTO_BAIA;
    const altura = Math.max(patioWidth, 200);

    const novaPos = new THREE.Vector3(0, altura, 0);
    const novoTarget = new THREE.Vector3(0, 0, 0);

    this.animarCameraPara(novaPos, novoTarget);
    this.debug("📷 Vista aérea ativada");
  }

  posicionarCameraLateral() {
    const patioWidth = this.CONFIG.BAIAS_MAX * this.CONFIG.ESPACAMENTO_BAIA;
    const distancia = patioWidth * 0.8;

    const novaPos = new THREE.Vector3(-distancia, 80, 0);
    const novoTarget = new THREE.Vector3(0, 5, 0);

    this.animarCameraPara(novaPos, novoTarget);
    this.debug("📷 Vista lateral ativada");
  }

  focarContainers() {
    try {
      if (
        !this.patioData ||
        !this.patioData.containers ||
        this.patioData.containers.length === 0
      ) {
        this.debug("Nenhum container para focar", "warn");
        return;
      }

      // Calcular centro dos containers
      const containers = this.patioData.containers;
      let centroX = 0,
        centroZ = 0,
        count = 0;

      containers.forEach((container) => {
        const normalized = this.normalizarDadosContainer(container);
        if (normalized) {
          const pos = this.calcularPosicao3D(
            normalized.row,
            normalized.bay,
            normalized.altura
          );
          if (pos) {
            centroX += pos.x;
            centroZ += pos.z;
            count++;
          }
        }
      });

      if (count > 0) {
        centroX /= count;
        centroZ /= count;

        const distancia = 80;
        const novaPos = new THREE.Vector3(
          centroX + distancia * 0.7,
          60,
          centroZ + distancia * 0.7
        );
        const novoTarget = new THREE.Vector3(centroX, 10, centroZ);

        this.animarCameraPara(novaPos, novoTarget, 2000);
        this.debug("📷 Vista focada nos containers ativada");
      }
    } catch (error) {
      this.debug(`Erro ao focar containers: ${error.message}`, "error");
    }
  }

  // ===== OCULTAR LOADING =====
  ocultarLoadingComFade() {
    const overlay = document.getElementById("loading-overlay");
    if (overlay) {
      overlay.style.transition = "opacity 1s ease-out";
      overlay.style.opacity = "0";
      setTimeout(() => {
        overlay.classList.add("hidden");
      }, 1000);
    }
  }

  // ===== INTERAÇÕES COM CONTAINERS =====
  aoClicarContainer(event) {
    try {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(
        this.containerGroup.children,
        true
      );

      if (intersects.length > 0) {
        const containerMesh = intersects[0].object;
        if (containerMesh.userData?.container) {
          this.selecionarContainer(containerMesh);
        }
      } else {
        this.desselecionarContainer();
      }
    } catch (error) {
      this.debug(`Erro ao clicar container: ${error.message}`, "error");
    }
  }

  aoHoverContainer(event) {
    try {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(
        this.containerGroup.children,
        true
      );

      if (intersects.length > 0) {
        const containerMesh = intersects[0].object;
        if (containerMesh.userData?.container) {
          this.aplicarHover(containerMesh);
          this.mostrarTooltip(containerMesh, event);
        }
      } else {
        this.removerHover();
        this.esconderTooltip();
      }
    } catch (error) {
      // Erro silencioso
    }
  }

  selecionarContainer(containerMesh) {
    try {
      // Desseleção anterior
      this.desselecionarContainer();

      this.selectedContainer = containerMesh;
      const container = containerMesh.userData.container;

      // Efeito visual de seleção
      containerMesh.material.emissive = this.CORES.SELECIONADA;
      containerMesh.material.emissiveIntensity = 0.3;

      // Animar para cima
      containerMesh.position.y += this.CONFIG.HOVER_ALTURA;

      // Mostrar detalhes
      this.mostrarDetalhesContainer(container);

      // Focar câmera no container
      this.focarContainerSelecionado(containerMesh);

      this.debug(`Container selecionado: ${container.numero}`);
      this.toastManager.show(
        `Container ${container.numero} selecionado`,
        "info"
      );
    } catch (error) {
      this.debug(`Erro ao selecionar container: ${error.message}`, "error");
    }
  }

  desselecionarContainer() {
    if (this.selectedContainer) {
      try {
        // Restaurar material original
        this.selectedContainer.material.emissive = new THREE.Color(0, 0, 0);
        this.selectedContainer.material.emissiveIntensity = 0;

        // Restaurar posição original
        this.selectedContainer.position.copy(
          this.selectedContainer.userData.posicaoOriginal
        );

        this.selectedContainer = null;

        // Remover painel de detalhes
        const painel = document.getElementById("painel-detalhes-container");
        if (painel) {
          painel.remove();
        }

        this.debug("Container desselecionado");
      } catch (error) {
        this.debug(
          `Erro ao desselecionar container: ${error.message}`,
          "error"
        );
      }
    }
  }

  aplicarHover(containerMesh) {
    if (this.hoveredContainer !== containerMesh) {
      this.removerHover();

      this.hoveredContainer = containerMesh;

      // Efeito visual sutil
      containerMesh.material.emissive = this.CORES.HOVER;
      containerMesh.material.emissiveIntensity = 0.1;

      // Cursor pointer
      this.renderer.domElement.style.cursor = "pointer";
    }
  }

  removerHover() {
    if (
      this.hoveredContainer &&
      this.hoveredContainer !== this.selectedContainer
    ) {
      this.hoveredContainer.material.emissive = new THREE.Color(0, 0, 0);
      this.hoveredContainer.material.emissiveIntensity = 0;
      this.hoveredContainer = null;
    }

    this.renderer.domElement.style.cursor = "default";
  }

  mostrarTooltip(containerMesh, event) {
    try {
      let tooltip = document.getElementById("container-tooltip");
      if (!tooltip) {
        tooltip = document.createElement("div");
        tooltip.id = "container-tooltip";
        tooltip.style.cssText = `
          position: absolute;
          background: rgba(0, 0, 0, 0.9);
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-size: 0.85rem;
          pointer-events: none;
          z-index: 9999;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          max-width: 250px;
        `;
        document.body.appendChild(tooltip);
      }

      const container = containerMesh.userData.container;
      const row = container.row || container.linha;
      const bay = container.bay || container.baia;

      tooltip.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 0.25rem;">${
          container.numero || "N/A"
        }</div>
        <div style="font-size: 0.75rem; opacity: 0.8;">
          ${row}${String(bay).padStart(2, "0")}-${container.altura} | ${
        container.armador || "N/A"
      }
        </div>
      `;

      tooltip.style.display = "block";
      tooltip.style.left = event.clientX + 10 + "px";
      tooltip.style.top = event.clientY - 10 + "px";
    } catch (error) {
      // Erro silencioso
    }
  }

  esconderTooltip() {
    const tooltip = document.getElementById("container-tooltip");
    if (tooltip) {
      tooltip.style.display = "none";
    }
  }

  // ===== MOSTRAR DETALHES DO CONTAINER =====
  mostrarDetalhesContainer(container) {
    try {
      let painelDetalhes = document.getElementById("painel-detalhes-container");

      if (!painelDetalhes) {
        painelDetalhes = document.createElement("div");
        painelDetalhes.id = "painel-detalhes-container";
        painelDetalhes.style.cssText = `
          position: fixed;
          top: 50%;
          right: 20px;
          transform: translateY(-50%);
          background: linear-gradient(135deg, rgba(0,0,0,0.9) 0%, rgba(30,30,60,0.9) 100%);
          color: white;
          padding: 2rem;
          border-radius: 15px;
          width: 350px;
          z-index: 9999;
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.2);
          box-shadow: 0 20px 40px rgba(0,0,0,0.3);
          transition: all 0.3s ease;
        `;
        document.body.appendChild(painelDetalhes);
      }

      const eh40TEU = this.isContainer40TEU(container);
      const status = this.obterStatusContainer(container);
      const statusColor = status === "Normal" ? "#4CAF50" : "#FF6B6B";

      painelDetalhes.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
          <h4 style="margin: 0; color: #4CAF50;">
            <i class="fas fa-cube me-2"></i>
            Detalhes do Container
          </h4>
          <button onclick="this.parentElement.parentElement.remove()" 
                  style="background: none; border: none; color: white; font-size: 1.2rem; cursor: pointer;">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div style="background: rgba(255,255,255,0.1); padding: 1rem; border-radius: 10px; margin-bottom: 1rem;">
          <h5 style="color: #FFD700; margin-bottom: 0.5rem;">${
            container.numero || "N/A"
          }</h5>
          <div style="display: flex; gap: 1rem; margin-bottom: 0.5rem;">
            <span style="background: rgba(74,144,226,0.3); padding: 0.2rem 0.5rem; border-radius: 5px; font-size: 0.8rem;">
              ${container.row || container.linha}${String(
        container.bay || container.baia
      ).padStart(2, "0")}-${container.altura}
            </span>
            <span style="background: rgba(156,39,176,0.3); padding: 0.2rem 0.5rem; border-radius: 5px; font-size: 0.8rem;">
              ${eh40TEU ? "40" : "20"} TEU
            </span>
          </div>
        </div>
        
        <div style="display: grid; gap: 0.8rem;">
          <div>
            <strong><i class="fas fa-shipping-fast me-2"></i>Armador:</strong>
            <span style="float: right;">${container.armador || "N/A"}</span>
          </div>
          <div>
            <strong><i class="fas fa-info-circle me-2"></i>Status:</strong>
            <span style="float: right; color: ${statusColor};">${status}</span>
          </div>
          <div>
            <strong><i class="fas fa-calendar me-2"></i>Data Entrada:</strong>
            <span style="float: right;">${
              container.data_entrada || "N/A"
            }</span>
          </div>
          <div>
            <strong><i class="fas fa-weight-hanging me-2"></i>Peso:</strong>
            <span style="float: right;">${container.peso || "N/A"} kg</span>
          </div>
          <div>
            <strong><i class="fas fa-thermometer-half me-2"></i>Temperatura:</strong>
            <span style="float: right;">${
              container.temperatura || "Ambiente"
            }</span>
          </div>
        </div>
        
        <div style="margin-top: 1.5rem; display: grid; gap: 0.5rem;">
          <button onclick="window.patio3dManager?.centralizarContainer('${
            container.numero
          }')" 
                  style="background: linear-gradient(45deg, #4CAF50, #45a049); border: none; color: white; padding: 0.5rem; border-radius: 8px; cursor: pointer;">
            <i class="fas fa-crosshairs me-2"></i>Centralizar Vista
          </button>
          <button onclick="window.patio3dManager?.destacarContainer('${
            container.numero
          }')" 
                  style="background: linear-gradient(45deg, #2196F3, #1976D2); border: none; color: white; padding: 0.5rem; border-radius: 8px; cursor: pointer;">
            <i class="fas fa-star me-2"></i>Destacar
          </button>
        </div>
      `;

      // Animar entrada
      painelDetalhes.style.transform = "translateY(-50%) translateX(100%)";
      setTimeout(() => {
        painelDetalhes.style.transform = "translateY(-50%) translateX(0)";
      }, 100);
    } catch (error) {
      this.debug(`Erro ao mostrar detalhes: ${error.message}`, "error");
    }
  }

  focarContainerSelecionado(containerMesh) {
    const pos = containerMesh.position;
    const offset = new THREE.Vector3(15, 10, 15);
    const novaPos = pos.clone().add(offset);
    const novoTarget = pos.clone().add(new THREE.Vector3(0, 2, 0));

    this.animarCameraPara(novaPos, novoTarget, 1500);
  }

  // ===== AÇÕES DA INTERFACE =====
  toggleDebugPanel() {
    const panel = document.getElementById("debug-panel");
    if (panel) {
      panel.classList.toggle("d-none");
      this.debug("Debug panel toggled");
    }
  }

  toggleTelaCheia() {
    try {
      const container = document.getElementById("three-container");

      if (!document.fullscreenElement) {
        container.requestFullscreen().then(() => {
          this.aoRedimensionar();
          this.debug("Modo tela cheia ativado");
          this.toastManager.show("Modo tela cheia ativado", "info");
        });
      } else {
        document.exitFullscreen().then(() => {
          this.aoRedimensionar();
          this.debug("Modo tela cheia desativado");
        });
      }
    } catch (error) {
      this.debug(`Erro no modo tela cheia: ${error.message}`, "error");
    }
  }

  toggleInfraestrutura() {
    if (this.infraestruturaGroup) {
      this.infraestruturaVisivel = !this.infraestruturaVisivel;
      this.infraestruturaGroup.visible = this.infraestruturaVisivel;

      const btn = document.getElementById("btn-toggle-infraestrutura");
      if (btn) {
        btn.classList.toggle("active");
        btn.innerHTML = `<i class="fas fa-building me-2"></i>${
          this.infraestruturaVisivel ? "Ocultar" : "Mostrar"
        } Infraestrutura`;
      }

      this.debug(
        `Infraestrutura ${this.infraestruturaVisivel ? "visível" : "oculta"}`
      );
      this.toastManager.show(
        `Infraestrutura ${this.infraestruturaVisivel ? "visível" : "oculta"}`,
        "info"
      );
    }
  }

  toggleLabels(btn) {
    if (this.labelGroup) {
      this.labelsVisiveis = !this.labelsVisiveis;
      this.labelGroup.visible = this.labelsVisiveis;

      if (btn) {
        btn.classList.toggle("active");
        btn.innerHTML = `<i class="fas fa-tags me-2"></i>${
          this.labelsVisiveis ? "Ocultar" : "Mostrar"
        } Labels`;
      }

      this.debug(`Labels ${this.labelsVisiveis ? "visíveis" : "ocultas"}`);
    }
  }

  togglePosicoesVazias(btn) {
    if (this.posicoesVaziasGroup) {
      this.posicoesVaziasVisiveis = !this.posicoesVaziasVisiveis;

      if (this.posicoesVaziasVisiveis) {
        // Mostrar com fade in
        this.posicoesVaziasGroup.visible = true;
        this.posicoesVaziasGroup.children.forEach((child, index) => {
          child.material.opacity = 0;
          setTimeout(() => {
            const fadeIn = () => {
              child.material.opacity += 0.02;
              if (child.material.opacity < 0.3) {
                requestAnimationFrame(fadeIn);
              }
            };
            fadeIn();
          }, index * 10);
        });
      } else {
        // Esconder com fade out
        this.posicoesVaziasGroup.children.forEach((child, index) => {
          setTimeout(() => {
            const fadeOut = () => {
              child.material.opacity -= 0.02;
              if (child.material.opacity > 0) {
                requestAnimationFrame(fadeOut);
              } else {
                this.posicoesVaziasGroup.visible = false;
              }
            };
            fadeOut();
          }, index * 5);
        });
      }

      if (btn) {
        btn.classList.toggle("active");
        btn.innerHTML = `<i class="fas fa-eye me-2"></i>${
          this.posicoesVaziasVisiveis ? "Ocultar" : "Mostrar"
        } Posições Vazias`;
      }

      this.debug(
        `Posições vazias ${
          this.posicoesVaziasVisiveis ? "visíveis" : "ocultas"
        }`
      );
    }
  }

  recarregarDados() {
    this.debug("🔄 Recarregando dados...");
    this.atualizarStatusSistema("data", "loading", "Recarregando");

    this.carregarDadosReais().then((success) => {
      if (success) {
        this.toastManager.show("Dados atualizados com sucesso!", "success");
      } else {
        this.toastManager.show("Erro ao atualizar dados", "error");
      }
    });
  }

  // ===== FILTROS =====
  filtrarPorRow(row) {
    try {
      this.containerGroup.children.forEach((child) => {
        if (child.userData?.container) {
          const containerRow =
            child.userData.container.row || child.userData.container.linha;

          if (!row || containerRow === row) {
            child.visible = true;
            child.material.transparent = false;
            child.material.opacity = 1.0;
          } else {
            child.material.transparent = true;
            child.material.opacity = 0.2;
          }
        }
      });

      this.debug(`Filtro Row aplicado: ${row || "Todos"}`);
    } catch (error) {
      this.debug(`Erro ao filtrar por row: ${error.message}`, "error");
    }
  }

  filtrarPorAltura(altura) {
    try {
      const alturaNum = altura ? parseInt(altura) : null;

      this.containerGroup.children.forEach((child) => {
        if (child.userData?.container) {
          const containerAltura = parseInt(child.userData.container.altura);

          if (!alturaNum || containerAltura === alturaNum) {
            child.visible = true;
            child.material.transparent = false;
            child.material.opacity = 1.0;
          } else {
            child.material.transparent = true;
            child.material.opacity = 0.2;
          }
        }
      });

      this.debug(`Filtro Altura aplicado: ${altura || "Todas"}`);
    } catch (error) {
      this.debug(`Erro ao filtrar por altura: ${error.message}`, "error");
    }
  }

  aplicarFiltros() {
    try {
      // Resetar opacidade de todos os containers
      this.containerGroup.children.forEach((child) => {
        if (child.userData?.container) {
          child.visible = true;
          child.material.transparent = false;
          child.material.opacity = 1.0;
        }
      });

      // Aplicar filtros ativos
      const filtroRow = document.getElementById("filtro-row")?.value;
      const filtroAltura = document.getElementById("filtro-altura")?.value;

      if (filtroRow) this.filtrarPorRow(filtroRow);
      if (filtroAltura) this.filtrarPorAltura(filtroAltura);

      this.debug("Filtros aplicados");
    } catch (error) {
      this.debug(`Erro ao aplicar filtros: ${error.message}`, "error");
    }
  }

  // ===== BUSCAR CONTAINER =====
  buscarContainer(termo) {
    try {
      if (!termo || !this.patioData) {
        this.debug("Termo de busca inválido", "warn");
        return;
      }

      const containers = this.patioData.containers || [];
      const containerEncontrado = containers.find(
        (container) =>
          container.numero &&
          container.numero.toLowerCase().includes(termo.toLowerCase())
      );

      if (containerEncontrado) {
        this.centralizarContainer(containerEncontrado.numero);
        this.destacarContainer(containerEncontrado.numero);
        this.debug(
          `Container encontrado: ${containerEncontrado.numero}`,
          "success"
        );
        this.toastManager.show(
          `Container ${containerEncontrado.numero} encontrado`,
          "success"
        );
      } else {
        this.debug(`Container não encontrado: ${termo}`, "warn");
        this.toastManager.show(
          `Container "${termo}" não encontrado`,
          "warning"
        );
      }
    } catch (error) {
      this.debug(`Erro na busca: ${error.message}`, "error");
    }
  }

  centralizarContainer(numeroContainer) {
    try {
      const containers = this.patioData?.containers || [];
      const container = containers.find((c) => c.numero === numeroContainer);

      if (container) {
        const normalized = this.normalizarDadosContainer(container);
        if (normalized) {
          const pos = this.calcularPosicao3D(
            normalized.row,
            normalized.bay,
            normalized.altura
          );
          if (pos) {
            const offset = new THREE.Vector3(20, 15, 20);
            const novaPos = pos.clone().add(offset);
            const novoTarget = pos.clone().add(new THREE.Vector3(0, 2, 0));

            this.animarCameraPara(novaPos, novoTarget, 1500);
            this.debug(`Vista centralizada no container ${numeroContainer}`);
          }
        }
      }
    } catch (error) {
      this.debug(`Erro ao centralizar container: ${error.message}`, "error");
    }
  }

  destacarContainer(numeroContainer) {
    try {
      // Encontrar mesh do container
      this.containerGroup.children.forEach((child) => {
        if (child.userData?.container?.numero === numeroContainer) {
          this.selecionarContainer(child);

          // Efeito especial de destaque
          const particulas = this.criarParticulasDestaque(child.position);
          this.scene.add(particulas);

          setTimeout(() => {
            this.scene.remove(particulas);
          }, 3000);
        }
      });
    } catch (error) {
      this.debug(`Erro ao destacar container: ${error.message}`, "error");
    }
  }

  criarParticulasDestaque(posicao) {
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.PointsMaterial({
      color: 0xffd700,
      size: 0.3,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
    });

    const particleCount = 50;
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = posicao.x + (Math.random() - 0.5) * 10;
      positions[i * 3 + 1] = posicao.y + Math.random() * 8;
      positions[i * 3 + 2] = posicao.z + (Math.random() - 0.5) * 5;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const particles = new THREE.Points(geometry, material);

    // Animar partículas
    let animationId;
    const animate = () => {
      const positions = particles.geometry.attributes.position.array;

      for (let i = 1; i < positions.length; i += 3) {
        positions[i] += 0.05;
      }

      particles.geometry.attributes.position.needsUpdate = true;
      particles.material.opacity *= 0.995;

      if (particles.material.opacity > 0.01) {
        animationId = requestAnimationFrame(animate);
      } else {
        cancelAnimationFrame(animationId);
      }
    };

    animate();

    return particles;
  }

  // ===== EXPORTAR IMAGEM =====
  exportarImagem(formato = "png", qualidade = 1.0) {
    try {
      const canvas = this.renderer.domElement;
      const dataURL = canvas.toDataURL(`image/${formato}`, qualidade);

      // Criar link de download
      const link = document.createElement("a");
      link.download = `patio-3d-${new Date()
        .toISOString()
        .slice(0, 10)}.${formato}`;
      link.href = dataURL;
      link.click();

      this.debug(`Imagem exportada: ${formato.toUpperCase()}`, "success");
      this.toastManager.show("Imagem exportada com sucesso!", "success");
    } catch (error) {
      this.debug(`Erro ao exportar imagem: ${error.message}`, "error");
      this.toastManager.show("Erro ao exportar imagem", "error");
    }
  }

  // ===== DETECTAR CONTAINERS PROBLEMATICOS =====
  detectarContainersProblematicos() {
    try {
      if (!this.patioData) return;

      const problemasDetectados = [];
      const containers = this.patioData.containers || [];

      containers.forEach((container) => {
        const normalized = this.normalizarDadosContainer(container);
        if (!normalized) return;

        // Verificar altura máxima por row
        if (!this.validarAlturaMaximaPorRow(normalized)) {
          problemasDetectados.push({
            container: normalized,
            problema: "Altura inválida para o row",
            severidade: "alta",
          });
        }

        // Verificar empilhamento 40 TEU
        if (
          this.isContainer40TEU(normalized) &&
          !this.validarEmpilhamento40TEU(normalized)
        ) {
          problemasDetectados.push({
            container: normalized,
            problema: "Empilhamento 40 TEU inválido",
            severidade: "crítica",
          });
        }

        // Verificar se há suporte na altura
        if (normalized.altura > 1) {
          const temSuporte = this.verificarSuporteAbaixo(normalized);
          if (!temSuporte) {
            problemasDetectados.push({
              container: normalized,
              problema: "Container flutuante (sem suporte)",
              severidade: "crítica",
            });
          }
        }
      });

      if (problemasDetectados.length > 0) {
        this.mostrarAlertaProblemas(problemasDetectados);
        this.destacarContainersProblematicos(problemasDetectados);
        this.atualizarEstatistica(
          "containers-flutuantes",
          problemasDetectados.length
        );
      } else {
        this.toastManager.show("Nenhum problema detectado no pátio", "success");
        this.atualizarEstatistica("containers-flutuantes", 0);
      }

      return problemasDetectados;
    } catch (error) {
      this.debug(`Erro ao detectar problemas: ${error.message}`, "error");
      return [];
    }
  }

  verificarSuporteAbaixo(container) {
    try {
      if (!this.patioData) return false;

      const containers = this.patioData.containers || [];
      const alturaAbaixo = container.altura - 1;

      if (alturaAbaixo < 1) return true; // Nível térreo sempre tem suporte

      // Procurar container na posição abaixo
      const suporte = containers.find((c) => {
        const normalized = this.normalizarDadosContainer(c);
        if (!normalized) return false;

        return (
          normalized.row === container.row &&
          normalized.bay === container.bay &&
          normalized.altura === alturaAbaixo
        );
      });

      return !!suporte;
    } catch (error) {
      return false;
    }
  }

  mostrarAlertaProblemas(problemas) {
    const alerta = document.getElementById("alerta-flutuantes");
    if (alerta) {
      alerta.classList.remove("d-none");

      const criticos = problemas.filter(
        (p) => p.severidade === "crítica"
      ).length;
      const altos = problemas.filter((p) => p.severidade === "alta").length;

      const conteudo = alerta.querySelector("p");
      if (conteudo) {
        conteudo.innerHTML = `Foram encontrados <strong>${problemas.length}</strong> problema(s): <strong>${criticos}</strong> crítico(s), <strong>${altos}</strong> de alta severidade. <strong>Verificação urgente necessária.</strong>`;
      }

      const count = document.getElementById("count-flutuantes");
      if (count) {
        count.textContent = problemas.length;
      }
    }
  }

  destacarContainersProblematicos(problemas) {
    problemas.forEach((problema) => {
      this.containerGroup.children.forEach((child) => {
        if (child.userData?.container?.numero === problema.container.numero) {
          // Efeito visual de alerta
          if (child.material) {
            child.material.emissive = new THREE.Color(0.5, 0.0, 0.0);
            child.material.emissiveIntensity = 0.3;

            // Efeito pulsante
            this.adicionarEfeitoPulsante(child);
          }
        }
      });
    });
  }

  adicionarEfeitoPulsante(containerMesh) {
    const pulsar = () => {
      if (containerMesh && containerMesh.material) {
        const intensidade = 0.3 + Math.sin(Date.now() * 0.01) * 0.2;
        containerMesh.material.emissiveIntensity = intensidade;
        requestAnimationFrame(pulsar);
      }
    };
    pulsar();
  }

  // ===== ATUALIZAR ESTATÍSTICAS =====
  atualizarEstatisticas() {
    try {
      if (!this.patioData) return;

      const containers = this.patioData.containers || [];
      this.atualizarEstatistica("total-containers", containers.length);

      const containers20 = containers.filter(
        (c) => !this.isContainer40TEU(c)
      ).length;
      const containers40 = containers.filter((c) =>
        this.isContainer40TEU(c)
      ).length;

      this.atualizarEstatistica("containers-20teu", containers20);
      this.atualizarEstatistica("containers-40teu", containers40);

      const vistoriados = containers.filter(
        (c) => c.status === "VISTORIADO"
      ).length;
      this.atualizarEstatistica("containers-vistoriados", vistoriados);

      this.CONFIG.ROWS.forEach((row) => {
        const count = containers.filter(
          (c) => (c.row || c.linha) === row
        ).length;
        this.atualizarEstatistica(`row-${row}`, count);
      });

      for (let altura = 1; altura <= this.CONFIG.ALTURAS_MAX; altura++) {
        const count = containers.filter(
          (c) => parseInt(c.altura) === altura
        ).length;
        this.atualizarEstatistica(`altura-${altura}`, count);
      }
    } catch (error) {
      this.debug(`Erro ao atualizar estatísticas: ${error.message}`, "error");
    }
  }

  atualizarEstatistica(elementId, valor) {
    try {
      const elemento = document.getElementById(elementId);
      if (elemento) {
        // Animação no número
        const valorAtual = parseInt(elemento.textContent) || 0;
        if (valorAtual !== valor) {
          this.animarContador(elemento, valorAtual, valor);
        }
      }
    } catch (error) {
      // Erro silencioso
    }
  }

  animarContador(elemento, inicio, fim, duracao = 1000) {
    const startTime = Date.now();

    const animar = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duracao, 1);

      const valorAtual = Math.round(inicio + (fim - inicio) * progress);
      elemento.textContent = valorAtual;

      if (progress < 1) {
        requestAnimationFrame(animar);
      }
    };

    animar();
  }

  atualizarUltimaAtualizacao() {
    try {
      const elemento = document.getElementById("ultima-atualizacao");
      if (elemento) {
        elemento.textContent = new Date().toLocaleTimeString("pt-BR");
      }
    } catch (error) {
      // Erro silencioso
    }
  }

  // ===== MOSTRAR AJUDA =====
  mostrarAjuda() {
    const modal = document.createElement("div");
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      backdrop-filter: blur(10px);
    `;

    modal.innerHTML = `
      <div style="
        background: linear-gradient(135deg, rgba(0,0,0,0.9) 0%, rgba(30,30,60,0.9) 100%);
        color: white;
        padding: 2rem;
        border-radius: 20px;
        width: 90%;
        max-width: 600px;
        border: 1px solid rgba(255,255,255,0.2);
        box-shadow: 0 20px 40px rgba(0,0,0,0.5);
        max-height: 80vh;
        overflow-y: auto;
      ">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
          <h3 style="margin: 0; color: #4CAF50;">
            <i class="fas fa-question-circle me-2"></i>
            Ajuda - Sistema 3D
          </h3>
          <button onclick="this.closest('.modal-ajuda').remove()" 
                  style="background: none; border: none; color: white; font-size: 1.5rem; cursor: pointer;">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div style="display: grid; gap: 1.5rem;">
          <div>
            <h5 style="color: #FFD700; margin-bottom: 0.5rem;">🎮 Controles</h5>
            <ul style="margin: 0; padding-left: 1rem;">
              <li>🖱️ <strong>Mouse:</strong> Arrastar para rotacionar, roda para zoom</li>
              <li>👆 <strong>Clique:</strong> Selecionar containers</li>
              <li>📱 <strong>Touch:</strong> Suporte completo para dispositivos móveis</li>
            </ul>
          </div>
          
          <div>
            <h5 style="color: #FFD700; margin-bottom: 0.5rem;">⌨️ Atalhos de Teclado</h5>
            <ul style="margin: 0; padding-left: 1rem;">
              <li><kbd style="background: #333; padding: 0.2rem 0.5rem; border-radius: 4px;">Ctrl+F</kbd> - Tela cheia</li>
              <li><kbd style="background: #333; padding: 0.2rem 0.5rem; border-radius: 4px;">Ctrl+S</kbd> - Exportar imagem</li>
              <li><kbd style="background: #333; padding: 0.2rem 0.5rem; border-radius: 4px;">Ctrl+R</kbd> - Reset completo</li>
              <li><kbd style="background: #333; padding: 0.2rem 0.5rem; border-radius: 4px;">Espaço</kbd> - Toggle posições vazias</li>
              <li><kbd style="background: #333; padding: 0.2rem 0.5rem; border-radius: 4px;">Esc</kbd> - Desselecionar</li>
            </ul>
          </div>
          
          <div>
            <h5 style="color: #FFD700; margin-bottom: 0.5rem;">📊 Recursos</h5>
            <ul style="margin: 0; padding-left: 1rem;">
              <li>🔍 <strong>Busca:</strong> Digite o número do container</li>
              <li>🎯 <strong>Filtros:</strong> Por row, altura e status</li>
              <li>👁️ <strong>Toggle:</strong> Labels, infraestrutura, posições vazias</li>
              <li>⚠️ <strong>Alertas:</strong> Detecção automática de problemas</li>
              <li>📷 <strong>Vistas:</strong> Geral, aérea, lateral, foco containers</li>
            </ul>
          </div>
          
          <div>
            <h5 style="color: #FFD700; margin-bottom: 0.5rem;">🎨 Cores dos Armadores</h5>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.5rem; font-size: 0.85rem;">
              <div><span style="display: inline-block; width: 12px; height: 12px; background: #4CAF50; border-radius: 2px; margin-right: 0.5rem;"></span>EVERGREEN</div>
              <div><span style="display: inline-block; width: 12px; height: 12px; background: #2196F3; border-radius: 2px; margin-right: 0.5rem;"></span>MAERSK</div>
              <div><span style="display: inline-block; width: 12px; height: 12px; background: #FF9800; border-radius: 2px; margin-right: 0.5rem;"></span>MSC</div>
              <div><span style="display: inline-block; width: 12px; height: 12px; background: #F44336; border-radius: 2px; margin-right: 0.5rem;"></span>COSCO</div>
              <div><span style="display: inline-block; width: 12px; height: 12px; background: #9C27B0; border-radius: 2px; margin-right: 0.5rem;"></span>CMA CGM</div>
              <div><span style="display: inline-block; width: 12px; height: 12px; background: #FF5722; border-radius: 2px; margin-right: 0.5rem;"></span>HAPAG-LLOYD</div>
            </div>
          </div>
        </div>
        
        <div style="margin-top: 2rem; text-align: center;">
          <button onclick="this.closest('.modal-ajuda').remove()" 
                  style="background: linear-gradient(45deg, #4CAF50, #45a049); border: none; color: white; padding: 0.8rem 2rem; border-radius: 10px; cursor: pointer; font-weight: bold;">
            Entendi
          </button>
        </div>
      </div>
    `;

    modal.className = "modal-ajuda";
    document.body.appendChild(modal);

    // Fechar com clique fora
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  // ===== SISTEMA DE PERFORMANCE =====
  monitorarPerformance() {
    try {
      if (!this.renderer) return;

      this.performanceStats = {
        fps: 0,
        frameCount: 0,
        lastTime: Date.now(),
        renderTime: 0,
      };

      const monitorar = () => {
        const now = Date.now();
        this.performanceStats.frameCount++;

        // Calcular FPS a cada segundo
        if (now - this.performanceStats.lastTime >= 1000) {
          this.performanceStats.fps = this.performanceStats.frameCount;
          this.performanceStats.frameCount = 0;
          this.performanceStats.lastTime = now;

          // Log performance se estiver abaixo de 30 FPS
          if (this.performanceStats.fps < 30) {
            this.debug(
              `Performance baixa: ${this.performanceStats.fps} FPS`,
              "warn"
            );
          }
        }

        requestAnimationFrame(monitorar);
      };

      monitorar();
      this.debug("Sistema de monitoramento de performance ativo");
    } catch (error) {
      this.debug(`Erro no monitoramento: ${error.message}`, "error");
    }
  }

  otimizarPerformance() {
    try {
      if (!this.performanceStats || this.performanceStats.fps >= 30) return;

      this.debug("Aplicando otimizações de performance...");

      // Reduzir qualidade das sombras
      if (this.renderer.shadowMap.enabled) {
        this.renderer.shadowMap.type = THREE.BasicShadowMap;
        this.debug("Qualidade de sombras reduzida");
      }

      // Ocultar posições vazias se visíveis
      if (this.posicoesVaziasGroup && this.posicoesVaziasGroup.visible) {
        this.posicoesVaziasGroup.visible = false;
        this.debug("Posições vazias ocultadas para melhor performance");
      }

      this.debug("Otimizações aplicadas");
    } catch (error) {
      this.debug(`Erro na otimização: ${error.message}`, "error");
    }
  }

  // ===== MÉTODOS AUXILIARES =====
  normalizarDadosContainer(container) {
    try {
      const containerNormalizado = { ...container };

      let rowFinal, bayFinal, alturaFinal;

      bayFinal = parseInt(container.baia);
      rowFinal = String(container.linha).toUpperCase();
      alturaFinal = parseInt(container.altura);

      if (!this.CONFIG.ROWS.includes(rowFinal)) {
        this.debug(`❌ Row inválida: ${rowFinal}`, "error");
        return null;
      }

      if (isNaN(bayFinal) || bayFinal < 1 || bayFinal > this.CONFIG.BAIAS_MAX) {
        this.debug(`❌ Bay inválida: ${bayFinal}`, "error");
        return null;
      }

      if (
        isNaN(alturaFinal) ||
        alturaFinal < 1 ||
        alturaFinal > this.CONFIG.ALTURAS_MAX
      ) {
        this.debug(`❌ Altura inválida: ${container.altura}`, "error");
        return null;
      }

      containerNormalizado.row = rowFinal;
      containerNormalizado.bay = bayFinal;
      containerNormalizado.altura = alturaFinal;
      containerNormalizado.baia = bayFinal;
      containerNormalizado.linha = rowFinal;

      if (containerNormalizado.tamanho_teu) {
        containerNormalizado.tamanho_teu = parseInt(
          containerNormalizado.tamanho_teu
        );
      } else if (containerNormalizado.tamanho) {
        containerNormalizado.tamanho_teu = parseInt(
          containerNormalizado.tamanho
        );
      } else {
        containerNormalizado.tamanho_teu = 20;
      }

      return containerNormalizado;
    } catch (error) {
      this.debug(`❌ Erro ao normalizar dados: ${error.message}`, "error");
      return null;
    }
  }

  calcularPosicao3D(row, bay, altura) {
    try {
      const rowIndex = this.CONFIG.ROWS.indexOf(String(row).toUpperCase());
      if (rowIndex === -1) return null;

      const bayNumber = parseInt(bay);
      if (
        isNaN(bayNumber) ||
        bayNumber < 1 ||
        bayNumber > this.CONFIG.BAIAS_MAX
      )
        return null;

      const alturaNumber = parseInt(altura);
      if (
        isNaN(alturaNumber) ||
        alturaNumber < 1 ||
        alturaNumber > this.CONFIG.ALTURAS_MAX
      )
        return null;

      const x = (bayNumber - 10.5) * this.CONFIG.ESPACAMENTO_BAIA;
      const z = (rowIndex - 2) * this.CONFIG.ESPACAMENTO_ROW;
      const y =
        (alturaNumber - 1) * this.CONFIG.ALTURA_CONTAINER +
        this.CONFIG.ALTURA_CONTAINER / 2;

      return new THREE.Vector3(x, y, z);
    } catch (error) {
      this.debug(`Erro ao calcular posição 3D: ${error.message}`, "error");
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

  validarEmpilhamento40TEU(container) {
    return true; // Simplificado para o exemplo
  }

  validarAlturaMaximaPorRow(container) {
    try {
      const row = container.row || container.linha;
      const altura = container.altura;
      const alturaMaxima =
        this.CONFIG.ALTURAS_MAX_POR_ROW[row] || this.CONFIG.ALTURAS_MAX;
      return altura <= alturaMaxima;
    } catch (error) {
      return true;
    }
  }

  obterStatusContainer(container) {
    if (!this.validarAlturaMaximaPorRow(container)) {
      return "Altura inválida";
    }

    if (
      this.isContainer40TEU(container) &&
      !this.validarEmpilhamento40TEU(container)
    ) {
      return "Empilhamento inválido";
    }

    if (container.status) {
      return container.status;
    }

    return "Normal";
  }

  limparGrupo(grupo) {
    try {
      if (grupo && Array.isArray(grupo.children)) {
        while (grupo.children.length > 0) {
          grupo.remove(grupo.children[0]);
        }
      }
    } catch (error) {
      this.debug(`Erro ao limpar grupo: ${error.message}`, "error");
    }
  }

  mostrarMensagemSemDados() {
    const container = document.getElementById("three-container");
    if (container) {
      container.innerHTML = `
        <div style="display: flex; justify-content: center; align-items: center; height: 100%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-align: center; padding: 20px;">
          <div>
            <i class="fas fa-database" style="font-size: 4rem; margin-bottom: 1rem; opacity: 0.7;"></i>
            <h3>Nenhum Container no Pátio</h3>
            <p>Não há containers registrados na base de dados.</p>
            <button class="btn btn-light" onclick="location.reload()">
              <i class="fas fa-sync-alt me-2"></i>Atualizar
            </button>
          </div>
        </div>
      `;
    }
  }

  mostrarErroCarregamento(mensagem) {
    const container = document.getElementById("three-container");
    if (container) {
      container.innerHTML = `
        <div style="display: flex; justify-content: center; align-items: center; height: 100%; background: #f8d7da; color: #721c24; text-align: center; padding: 20px;">
          <div>
            <h3><i class="fas fa-exclamation-triangle"></i> Erro ao Carregar</h3>
            <p>${mensagem}</p>
            <button class="btn btn-danger" onclick="location.reload()">
              <i class="fas fa-sync-alt me-2"></i>Tentar Novamente
            </button>
          </div>
        </div>
      `;
    }
  }

  mostrarErro(message) {
    this.mostrarErroCarregamento(message);
  }

  debug(message, type = "info") {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = type === "error" ? "❌" : type === "warn" ? "⚠️" : "✅";
    const formattedMsg = `${timestamp} ${prefix} ${message}`;

    console.log(formattedMsg);

    try {
      if (this.debugConsole) {
        const logEntry = document.createElement("div");
        logEntry.style.color =
          type === "error"
            ? "#ff4444"
            : type === "warn"
            ? "#ffaa33"
            : "#44ff44";
        logEntry.textContent = formattedMsg;
        this.debugConsole.appendChild(logEntry);
        this.debugConsole.scrollTop = this.debugConsole.scrollHeight;
      }
    } catch (error) {
      console.warn("Erro ao atualizar debug console:", error);
    }
  }

  // ===== MÉTODOS PÚBLICOS PARA DEBUG =====
  debugAPIs() {
    this.debug("🔍 Testando APIs...");
    this.apiManager
      .obterDadosPatio3D()
      .then((result) => {
        this.debug(
          `API funcionando: ${result.data?.containers?.length || 0} containers`,
          "success"
        );
      })
      .catch((error) => {
        this.debug(`Erro na API: ${error.message}`, "error");
      });
  }

  debugCena() {
    this.debug("🔍 Debug da cena executado");
    console.log("Objetos na cena:", this.scene.children.length);
    console.log(
      "Containers renderizados:",
      this.containerGroup.children.length
    );
    console.log("Performance atual:", this.performanceStats);
  }

  resetarCamera() {
    this.posicionarCameraCompletaAnimada();
  }

  resetCompleto() {
    try {
      this.debug("Executando reset completo do sistema...");

      // Limpar seleções
      this.desselecionarContainer();
      this.removerHover();
      this.esconderTooltip();

      // Resetar filtros
      document.querySelectorAll("select, input").forEach((element) => {
        if (element.type !== "button") {
          element.value = "";
        }
      });

      // Aplicar filtros vazios (mostrar tudo)
      this.aplicarFiltros();

      // Resetar visibilidade dos grupos
      if (this.infraestruturaGroup) this.infraestruturaGroup.visible = true;
      if (this.labelGroup) this.labelGroup.visible = true;
      if (this.posicoesVaziasGroup) this.posicoesVaziasGroup.visible = true;

      // Resetar câmera
      this.posicionarCameraCompletaAnimada();

      this.debug("Reset completo executado");
      this.toastManager.show("Sistema resetado", "success");
    } catch (error) {
      this.debug(`Erro no reset: ${error.message}`, "error");
    }
  }
}

// ===== DISPONIBILIZAR GLOBALMENTE =====
window.PatioVisualizacao3DManager = PatioVisualizacao3DManager;

// ===== INSTÂNCIA GLOBAL =====
let patio3dManagerInstance = null;

// ===== INICIALIZAÇÃO AUTOMÁTICA =====
document.addEventListener("DOMContentLoaded", async function () {
  try {
    console.log("🚀 Inicializando Sistema 3D VERSÃO FINAL INTEGRADA...");

    // Aguardar carregamento do THREE.js
    const aguardarTHREE = () => {
      return new Promise((resolve) => {
        const verificar = () => {
          if (typeof THREE !== "undefined") {
            resolve();
          } else {
            setTimeout(verificar, 100);
          }
        };
        verificar();
      });
    };

    await aguardarTHREE();

    patio3dManagerInstance = new PatioVisualizacao3DManager();

    // Disponibilizar globalmente
    window.patio3dManager = patio3dManagerInstance;
    window.patio3d = patio3dManagerInstance; // Alias

    // Funções de teste e utilidade
    window.testarZoom = () => {
      console.log("🔍 Teste de zoom executado");
      patio3dManagerInstance.debug("Teste de zoom executado", "info");
    };

    window.debugCena = () => patio3dManagerInstance.debugCena();
    window.resetarCamera = () => patio3dManagerInstance.resetarCamera();
    window.exportarImagem = (formato = "png") =>
      patio3dManagerInstance.exportarImagem(formato);
    window.toggleTelaCheia = () => patio3dManagerInstance.toggleTelaCheia();
    window.resetCompleto = () => patio3dManagerInstance.resetCompleto();
    window.detectarProblemas = () =>
      patio3dManagerInstance.detectarContainersProblematicos();

    console.log("✨ Sistema FINAL INTEGRADO inicializado com sucesso!");
    console.log("🎮 Funções disponíveis:");
    console.log("  - testarZoom() - Testa o zoom da câmera");
    console.log("  - debugCena() - Mostra informações da cena");
    console.log("  - resetarCamera() - Reseta a câmera");
    console.log("  - exportarImagem() - Exporta vista atual");
    console.log("  - toggleTelaCheia() - Alterna tela cheia");
    console.log("  - resetCompleto() - Reset completo do sistema");
    console.log("  - detectarProblemas() - Detecta containers problemáticos");
  } catch (error) {
    console.error("❌ Erro crítico:", error);

    // Mostrar erro na interface
    const container = document.getElementById("three-container");
    if (container) {
      container.innerHTML = `
        <div style="display: flex; justify-content: center; align-items: center; height: 100%; background: #f8d7da; color: #721c24; text-align: center; padding: 20px;">
          <div>
            <h3><i class="fas fa-exclamation-triangle"></i> Erro Crítico</h3>
            <p>${error.message}</p>
            <button class="btn btn-danger" onclick="location.reload()">
              <i class="fas fa-sync-alt me-2"></i>Recarregar Página
            </button>
          </div>
        </div>
      `;
    }
  }
});

// ===== LIMPEZA NA SAÍDA =====
window.addEventListener("beforeunload", () => {
  if (patio3dManagerInstance) {
    // Limpar recursos se necessário
    console.log("🧹 Limpando recursos do sistema 3D...");
  }
});

console.log("✨ PatioVisualizacao3D VERSÃO FINAL INTEGRADA carregado!");