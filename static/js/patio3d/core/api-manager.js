/**
 * API Manager para Integração com Backend - VERSÃO CORRIGIDA PARA SUZANO-SP
 * Arquivo: core/api-manager.js
 */

import { API_ENDPOINTS } from "../utils/constants.js";

export class APIManager {
  constructor() {
    this.baseURL = window.location.origin;
    this.endpoints = API_ENDPOINTS;

    // Inicialização de cache
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutos
    this.retryAttempts = 3;
    this.retryDelay = 1000;
    this.circuitBreakerFailures = 0;
    this.circuitBreakerThreshold = 5;
    this.circuitBreakerTimeout = 30000;
    this.circuitBreakerLastFailure = 0;

    // Estatísticas
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cacheHits: 0,
      averageResponseTime: 0,
      lastRequestTime: null,
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

    const startTime = Date.now();
    this.stats.totalRequests++;
    this.stats.lastRequestTime = new Date().toISOString();

    try {
      const response = await fetch(url, { ...defaultOptions, ...options });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Não autorizado. Faça login novamente.");
        }
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      this.updateStats(true, Date.now() - startTime);
      return result;
    } catch (error) {
      console.error(`Erro na requisição para ${endpoint}:`, error);
      this.updateStats(false, Date.now() - startTime);
      throw error;
    }
  }

  async obterDadosPatio3D() {
    try {
      console.log("📡 Solicitando dados do pátio 3D...");
      const result = await this.request(this.endpoints.containers);

      if (result && result.success) {
        console.log(
          `✅ Dados recebidos: ${result.data?.containers?.length || 0} containers`,
        );
      }

      return result;
    } catch (error) {
      console.error("❌ Erro ao obter dados do pátio:", error);
      throw error;
    }
  }

  async buscarContainer(numero) {
    try {
      console.log(`🔍 Buscando container: ${numero}`);
      const result = await this.request(
        `${this.endpoints.buscarContainer}?numero=${encodeURIComponent(numero)}`,
      );

      if (result && result.success) {
        console.log(`✅ Container encontrado: ${numero}`);
      } else {
        console.log(`❌ Container não encontrado: ${numero}`);
      }

      return result;
    } catch (error) {
      console.error(`❌ Erro ao buscar container ${numero}:`, error);
      throw error;
    }
  }

  async validarPosicao(posicao, status = "CHEIO", operacao = "descarga") {
    try {
      console.log(`🔍 Validando posição: ${posicao}`);
      const result = await this.request(this.endpoints.validarPosicao, {
        method: "POST",
        body: JSON.stringify({ posicao, status, operacao }),
      });

      if (result && result.success) {
        console.log(`✅ Posição ${posicao} validada: ${result.message}`);
      } else {
        console.log(`❌ Posição ${posicao} inválida: ${result.message}`);
      }

      return result;
    } catch (error) {
      console.error(`❌ Erro ao validar posição ${posicao}:`, error);
      throw error;
    }
  }

  async obterSugestoesPosicoes(status = "CHEIO", baia = "", alturaMax = "") {
    try {
      console.log(`💡 Obtendo sugestões de posições...`);
      const params = new URLSearchParams({ status });
      if (baia) params.append("baia", baia);
      if (alturaMax) params.append("altura_max", alturaMax);

      const result = await this.request(
        `${this.endpoints.sugestoesPosicoes}?${params}`,
      );

      if (result && result.success) {
        console.log(
          `✅ ${result.data?.sugestoes?.length || 0} sugestões obtidas`,
        );
      }

      return result;
    } catch (error) {
      console.error("❌ Erro ao obter sugestões:", error);
      throw error;
    }
  }

  // ===== MÉTODOS DE DIAGNÓSTICO =====

  async testarConectividade() {
    try {
      console.log("🔌 Testando conectividade com a API...");

      const startTime = Date.now();
      const result = await this.obterDadosPatio3D();
      const endTime = Date.now();

      const responseTime = endTime - startTime;

      const diagnostico = {
        conectividade: result.success ? "OK" : "FALHA",
        tempoResposta: `${responseTime}ms`,
        status: result.success ? "success" : "error",
        dados: result.success
          ? `${result.data?.containers?.length || 0} containers`
          : "Nenhum",
        timestamp: new Date().toISOString(),
      };

      console.log("📊 Diagnóstico de conectividade:", diagnostico);
      return diagnostico;
    } catch (error) {
      console.error("❌ Falha no teste de conectividade:", error);
      return {
        conectividade: "FALHA",
        tempoResposta: "N/A",
        status: "error",
        erro: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async verificarStatusAPI() {
    try {
      const endpoints = Object.entries(this.endpoints);
      const resultados = {};

      console.log("🔍 Verificando status de todos os endpoints...");

      for (const [nome, endpoint] of endpoints) {
        try {
          const startTime = Date.now();

          // Para endpoints que precisam de parâmetros, usar dados de teste
          let testResult;
          switch (nome) {
            case "containers":
              testResult = await this.obterDadosPatio3D();
              break;
            case "buscarContainer":
              testResult = await this.buscarContainer("TEST-001");
              break;
            case "validarPosicao":
              testResult = await this.validarPosicao("A01-1", "CHEIO", "teste");
              break;
            case "sugestoesPosicoes":
              testResult = await this.obterSugestoesPosicoes("CHEIO");
              break;
            default:
              testResult = await this.request(endpoint);
          }

          const endTime = Date.now();

          resultados[nome] = {
            status: testResult.success ? "OK" : "ERRO",
            tempoResposta: `${endTime - startTime}ms`,
            endpoint: endpoint,
            resultado: testResult.success ? "Sucesso" : testResult.message,
          };
        } catch (error) {
          resultados[nome] = {
            status: "FALHA",
            tempoResposta: "N/A",
            endpoint: endpoint,
            erro: error.message,
          };
        }
      }

      console.log("📊 Status completo da API:", resultados);
      return resultados;
    } catch (error) {
      console.error("❌ Erro na verificação da API:", error);
      return { erro: error.message };
    }
  }

  // ===== CACHE DE DADOS =====

  getCacheKey(endpoint, params = {}) {
    const paramString = Object.keys(params)
      .sort()
      .map((key) => `${key}=${params[key]}`)
      .join("&");
    return `${endpoint}${paramString ? "?" + paramString : ""}`;
  }

  isCacheValid(cacheEntry) {
    return Date.now() - cacheEntry.timestamp < this.cacheTimeout;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  getCache(key) {
    const cacheEntry = this.cache.get(key);
    if (cacheEntry && this.isCacheValid(cacheEntry)) {
      console.log(`📦 Cache hit para: ${key}`);
      this.stats.cacheHits++;
      return cacheEntry.data;
    }

    if (cacheEntry) {
      this.cache.delete(key); // Remove cache expirado
    }

    return null;
  }

  clearCache() {
    this.cache.clear();
    console.log("🧹 Cache da API limpo");
  }

  // ===== MÉTODOS COM CACHE =====

  async obterDadosPatio3DCached() {
    const cacheKey = this.getCacheKey(this.endpoints.containers);
    const cachedData = this.getCache(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    try {
      const result = await this.obterDadosPatio3D();

      if (result && result.success) {
        this.setCache(cacheKey, result);
      }

      return result;
    } catch (error) {
      throw error;
    }
  }

  async buscarContainerCached(numero) {
    const cacheKey = this.getCacheKey(this.endpoints.buscarContainer, {
      numero,
    });
    const cachedData = this.getCache(cacheKey);

    if (cachedData) {
      // Se o cache é a resposta da API, devolva só o objeto container!
      return cachedData.container || cachedData;
    }

    try {
      const result = await this.buscarContainer(numero);
      if (result && result.success) {
        this.setCache(cacheKey, result);
        return result.container; // devolve só o objeto do container
      }
      return null;
    } catch (error) {
      throw error;
    }
  }

  // ===== ESTATÍSTICAS =====

  updateStats(success, responseTime) {
    if (success) {
      this.stats.successfulRequests++;
    } else {
      this.stats.failedRequests++;
    }

    // Calcular média do tempo de resposta
    this.stats.averageResponseTime =
      (this.stats.averageResponseTime * (this.stats.totalRequests - 1) +
        responseTime) /
      this.stats.totalRequests;
  }

  getStats() {
    return {
      ...this.stats,
      successRate:
        this.stats.totalRequests > 0
          ? (
              (this.stats.successfulRequests / this.stats.totalRequests) *
              100
            ).toFixed(2) + "%"
          : "0%",
      cacheHitRate:
        this.stats.totalRequests > 0
          ? ((this.stats.cacheHits / this.stats.totalRequests) * 100).toFixed(
              2,
            ) + "%"
          : "0%",
    };
  }

  resetStats() {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cacheHits: 0,
      averageResponseTime: 0,
      lastRequestTime: null,
    };
    console.log("📊 Estatísticas da API resetadas");
  }

  // ===== CIRCUIT BREAKER =====

  isCircuitBreakerOpen() {
    if (this.circuitBreakerFailures >= this.circuitBreakerThreshold) {
      const timeSinceLastFailure = Date.now() - this.circuitBreakerLastFailure;
      return timeSinceLastFailure < this.circuitBreakerTimeout;
    }
    return false;
  }

  recordFailure() {
    this.circuitBreakerFailures++;
    this.circuitBreakerLastFailure = Date.now();
  }

  recordSuccess() {
    this.circuitBreakerFailures = 0;
  }

  // ===== RETRY LOGIC =====

  async requestWithRetry(endpoint, options = {}, retries = this.retryAttempts) {
    if (this.isCircuitBreakerOpen()) {
      throw new Error(
        "Circuit breaker is open. Service temporarily unavailable.",
      );
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const result = await this.request(endpoint, options);
        this.recordSuccess();
        return result;
      } catch (error) {
        if (attempt === retries) {
          this.recordFailure();
          throw error;
        }

        console.warn(
          `Tentativa ${attempt} falhou, tentando novamente em ${this.retryDelay}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
      }
    }
  }

  // ===== MÉTODO COM RETRY PARA DADOS 3D =====
  async obterDadosPatio3DComRetry(retries = this.retryAttempts) {
    try {
      console.log("📡 (Retry) Solicitando dados do pátio 3D...");
      const result = await this.requestWithRetry(
        this.endpoints.containers,
        {},
        retries,
      );
      if (result && result.success) {
        console.log(
          `✅ Dados recebidos após retry: ${result.data?.containers?.length || 0} containers`,
        );
      }
      return result;
    } catch (error) {
      console.error("❌ Erro ao obter dados do pátio com retry:", error);
      throw error;
    }
  }
}
