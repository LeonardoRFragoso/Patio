/**
 * Script para validação de força da senha em tempo real
 */
document.addEventListener('DOMContentLoaded', function() {
    // Buscar campo de senha nos formulários
    const passwordFields = document.querySelectorAll('input[type="password"]');
    
    passwordFields.forEach(function(passwordField) {
        // Ignorar campos de senha que não são para validação (ex: confirmação)
        if (passwordField.id && (passwordField.id.includes('confirm') || passwordField.id.includes('atual'))) {
            return;
        }
        
        // Criar indicador de força da senha
        const strengthIndicator = document.createElement('div');
        strengthIndicator.className = 'password-strength mt-2';
        strengthIndicator.innerHTML = `
            <div class="progress">
                <div class="progress-bar" role="progressbar" style="width: 0%;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
            </div>
            <small class="form-text mt-1">Força da senha: <span class="strength-text">Muito fraca</span></small>
            <div class="requirements mt-2">
                <ul class="list-unstyled">
                    <li class="req-length"><i class="fas fa-times-circle text-danger"></i> Mínimo 8 caracteres</li>
                    <li class="req-uppercase"><i class="fas fa-times-circle text-danger"></i> Uma letra maiúscula</li>
                    <li class="req-lowercase"><i class="fas fa-times-circle text-danger"></i> Uma letra minúscula</li>
                    <li class="req-number"><i class="fas fa-times-circle text-danger"></i> Um número</li>
                    <li class="req-special"><i class="fas fa-times-circle text-danger"></i> Um caractere especial</li>
                </ul>
            </div>
        `;
        
        // Adicionar indicador após o campo de senha
        passwordField.parentNode.appendChild(strengthIndicator);
        
        // Função para checar força da senha
        function checkPasswordStrength() {
            const password = passwordField.value;
            const progressBar = strengthIndicator.querySelector('.progress-bar');
            const strengthText = strengthIndicator.querySelector('.strength-text');
            
            // Requisitos
            const hasMinLength = password.length >= 8;
            const hasUpperCase = /[A-Z]/.test(password);
            const hasLowerCase = /[a-z]/.test(password);
            const hasNumber = /[0-9]/.test(password);
            const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
            
            // Atualizar indicadores de requisitos
            updateRequirement(strengthIndicator.querySelector('.req-length'), hasMinLength);
            updateRequirement(strengthIndicator.querySelector('.req-uppercase'), hasUpperCase);
            updateRequirement(strengthIndicator.querySelector('.req-lowercase'), hasLowerCase);
            updateRequirement(strengthIndicator.querySelector('.req-number'), hasNumber);
            updateRequirement(strengthIndicator.querySelector('.req-special'), hasSpecial);
            
            // Calcular pontuação (0-100)
            let score = 0;
            if (hasMinLength) score += 20;
            if (hasUpperCase) score += 20;
            if (hasLowerCase) score += 20;
            if (hasNumber) score += 20;
            if (hasSpecial) score += 20;
            
            // Atualizar barra de progresso e texto
            progressBar.style.width = `${score}%`;
            progressBar.setAttribute('aria-valuenow', score);
            
            // Definir classe de cor baseada na pontuação
            progressBar.className = 'progress-bar';
            if (score < 40) {
                progressBar.classList.add('bg-danger');
                strengthText.textContent = 'Muito fraca';
            } else if (score < 60) {
                progressBar.classList.add('bg-warning');
                strengthText.textContent = 'Fraca';
            } else if (score < 80) {
                progressBar.classList.add('bg-info');
                strengthText.textContent = 'Média';
            } else if (score < 100) {
                progressBar.classList.add('bg-primary');
                strengthText.textContent = 'Forte';
            } else {
                progressBar.classList.add('bg-success');
                strengthText.textContent = 'Muito forte';
            }
        }
        
        // Função para atualizar o ícone de requisito
        function updateRequirement(element, fulfilled) {
            const icon = element.querySelector('i');
            if (fulfilled) {
                icon.className = 'fas fa-check-circle text-success';
            } else {
                icon.className = 'fas fa-times-circle text-danger';
            }
        }
        
        // Adicionar evento para checar força da senha ao digitar
        passwordField.addEventListener('input', checkPasswordStrength);
        passwordField.addEventListener('keyup', checkPasswordStrength);
    });
});
