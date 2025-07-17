/**
 * Sistema de Notificações Toast
 * Gerencia notificações temporárias na interface
 */

export class ToastManager {
    constructor() {
      this.container = document.getElementById("toast-container");
      if (!this.container) {
        this.container = document.createElement("div");
        this.container.id = "toast-container";
        this.container.className = "toast-container";
        document.body.appendChild(this.container);
      }
  
      // Controle para evitar duplicatas
      this.activeToasts = new Set();
      this.toastHistory = new Map();
  
      // Limpar histórico antigo periodicamente
      setInterval(() => this.clearOldHistory(), 5000);
    }
  
    show(message, type = "info", duration = 4000) {
      // Verificar se já existe um toast com a mesma mensagem
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