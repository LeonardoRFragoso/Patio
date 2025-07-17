/**
 * Sistema de Monitoramento de Performance - VERSÃO CORRIGIDA PARA SUZANO-SP
 * Arquivo: utils/performance-monitor.js
 */

export class PerformanceMonitor {
    constructor() {
      this.performanceStats = null;
      this.isMonitoring = false;
      this.optimizationsApplied = false;
    }
  
    // ===== SISTEMA DE PERFORMANCE =====
    start() {
      try {
        this.performanceStats = {
          fps: 0,
          frameCount: 0,
          lastTime: Date.now(),
          renderTime: 0,
        };
  
        this.isMonitoring = true;
  
        const monitorar = () => {
          if (!this.isMonitoring) return;
  
          const now = Date.now();
          this.performanceStats.frameCount++;
  
          // Calcular FPS a cada segundo
          if (now - this.performanceStats.lastTime >= 1000) {
            this.performanceStats.fps = this.performanceStats.frameCount;
            this.performanceStats.frameCount = 0;
            this.performanceStats.lastTime = now;
  
            // Log performance se estiver abaixo de 30 FPS
            if (this.performanceStats.fps < 30) {
              console.warn(
                `⚠️ Performance baixa: ${this.performanceStats.fps} FPS`
              );
            }
  
            // Atualizar estatísticas na interface se existir
            this.updatePerformanceDisplay();
          }
  
          requestAnimationFrame(monitorar);
        };
  
        monitorar();
        console.log("✅ Sistema de monitoramento de performance ativo");
      } catch (error) {
        console.error(`❌ Erro no monitoramento: ${error.message}`);
      }
    }
  
    stop() {
      this.isMonitoring = false;
      console.log("🛑 Monitoramento de performance parado");
    }
  
    getCurrentStats() {
      return this.performanceStats;
    }
  
    // ===== OTIMIZAÇÕES AUTOMÁTICAS =====
    checkAndOptimize(renderer, scene) {
      try {
        if (!this.performanceStats || this.performanceStats.fps >= 30) return;
  
        if (this.optimizationsApplied) return; // Evitar otimizações múltiplas
  
        console.log("🔧 Aplicando otimizações de performance...");
  
        // Reduzir qualidade das sombras
        if (renderer && renderer.shadowMap && renderer.shadowMap.enabled) {
          renderer.shadowMap.type = THREE.BasicShadowMap;
          console.log("• Qualidade de sombras reduzida");
        }
  
        // Reduzir densidade da névoa
        if (scene && scene.fog) {
          scene.fog.density *= 0.5;
          console.log("• Densidade da névoa reduzida");
        }
  
        // Marcar otimizações como aplicadas
        this.optimizationsApplied = true;
  
        console.log("✅ Otimizações aplicadas");
      } catch (error) {
        console.error(`❌ Erro na otimização: ${error.message}`);
      }
    }
  
    // ===== ATUALIZAÇÃO DE DISPLAY =====
    updatePerformanceDisplay() {
      try {
        // Atualizar FPS na interface se existir
        const fpsElement = document.getElementById("fps-counter");
        if (fpsElement && this.performanceStats) {
          fpsElement.textContent = `${this.performanceStats.fps} FPS`;
          
          // Colorir baseado na performance
          if (this.performanceStats.fps >= 50) {
            fpsElement.style.color = "#4CAF50"; // Verde
          } else if (this.performanceStats.fps >= 30) {
            fpsElement.style.color = "#FF9800"; // Laranja
          } else {
            fpsElement.style.color = "#F44336"; // Vermelho
          }
        }
  
        // Atualizar tempo de render
        const renderTimeElement = document.getElementById("render-time");
        if (renderTimeElement && this.performanceStats) {
          renderTimeElement.textContent = `${this.performanceStats.renderTime.toFixed(2)}ms`;
        }
  
        // Atualizar indicador de status geral
        const statusElement = document.getElementById("performance-status");
        if (statusElement && this.performanceStats) {
          const fps = this.performanceStats.fps;
          if (fps >= 50) {
            statusElement.textContent = "Excelente";
            statusElement.className = "badge bg-success";
          } else if (fps >= 30) {
            statusElement.textContent = "Boa";
            statusElement.className = "badge bg-warning";
          } else {
            statusElement.textContent = "Baixa";
            statusElement.className = "badge bg-danger";
          }
        }
      } catch (error) {
        // Erro silencioso para evitar spam
      }
    }
  
    // ===== MÉTODOS DE DIAGNÓSTICO =====
    generatePerformanceReport() {
      if (!this.performanceStats) {
        return "Sistema de monitoramento não iniciado";
      }
  
      const report = {
        fps: this.performanceStats.fps,
        renderTime: this.performanceStats.renderTime,
        status: this.getPerformanceStatus(),
        optimizationsApplied: this.optimizationsApplied,
        timestamp: new Date().toISOString(),
        recommendations: this.getRecommendations()
      };
  
      return report;
    }
  
    getPerformanceStatus() {
      if (!this.performanceStats) return "unknown";
      
      const fps = this.performanceStats.fps;
      if (fps >= 50) return "excellent";
      if (fps >= 30) return "good";
      if (fps >= 15) return "poor";
      return "critical";
    }
  
    getRecommendations() {
      const recommendations = [];
      
      if (!this.performanceStats) return recommendations;
  
      const fps = this.performanceStats.fps;
      
      if (fps < 30) {
        recommendations.push("Considere reduzir a qualidade das sombras");
        recommendations.push("Oculte elementos não essenciais (posições vazias, labels)");
        recommendations.push("Reduza a distância máxima da câmera");
      }
      
      if (fps < 15) {
        recommendations.push("Desative a infraestrutura temporariamente");
        recommendations.push("Reduza o número de containers visíveis com filtros");
        recommendations.push("Considere usar um dispositivo mais potente");
      }
  
      if (this.performanceStats.renderTime > 16) {
        recommendations.push("Tempo de render alto, otimize a geometria");
        recommendations.push("Reduza o número de luzes na cena");
      }
  
      return recommendations;
    }
  
    // ===== BENCHMARK =====
    async runBenchmark(duration = 5000) {
      console.log("🏃‍♂️ Iniciando benchmark de performance...");
      
      const startTime = Date.now();
      const initialStats = { ...this.performanceStats };
      
      const results = {
        duration: duration,
        samples: [],
        averageFPS: 0,
        minFPS: Infinity,
        maxFPS: 0,
        averageRenderTime: 0
      };
  
      return new Promise((resolve) => {
        const sample = () => {
          if (Date.now() - startTime >= duration) {
            // Calcular médias
            results.averageFPS = results.samples.reduce((sum, s) => sum + s.fps, 0) / results.samples.length;
            results.averageRenderTime = results.samples.reduce((sum, s) => sum + s.renderTime, 0) / results.samples.length;
            
            console.log("📊 Benchmark concluído:", results);
            resolve(results);
            return;
          }
  
          if (this.performanceStats) {
            const sample = {
              fps: this.performanceStats.fps,
              renderTime: this.performanceStats.renderTime,
              timestamp: Date.now() - startTime
            };
            
            results.samples.push(sample);
            results.minFPS = Math.min(results.minFPS, sample.fps);
            results.maxFPS = Math.max(results.maxFPS, sample.fps);
          }
  
          setTimeout(sample, 100); // Sample a cada 100ms
        };
  
        sample();
      });
    }
  
    // ===== RESET E LIMPEZA =====
    reset() {
      this.optimizationsApplied = false;
      if (this.performanceStats) {
        this.performanceStats.frameCount = 0;
        this.performanceStats.lastTime = Date.now();
      }
      console.log("🔄 Monitor de performance resetado");
    }
  
    dispose() {
      this.stop();
      this.performanceStats = null;
      console.log("🧹 Monitor de performance limpo");
    }
  }