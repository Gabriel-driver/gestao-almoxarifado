// Configurações do Supabase
const SUPABASE_URL = "https://uqcvxbaxedzhicmueigo.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxY3Z4YmF4ZWR6aGljbXVlaWdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAyNjY3ODcsImV4cCI6MjA2NTg0Mjc4N30.EdDHZ4a2RC9VKKTVAgXPqFPI8_0rbSPUu1soNcBVISc";

// Cliente Supabase
let supabaseClient;

// Configurações do sistema
const CONFIG = {
    SITUACAO_PADRAO: "PENDENTE DE BAIXA",
    NOME_DA_VIEW: "vw_RequisicoesItens",
    TAMANHO_PAGINA: 1000,
};

// Estado global da aplicação
const AppState = {
    allRequisicoesData: [],
    isLoading: false,
    currentPage: '',
    sidebarCollapsed: false,
    pagination: {
        currentPage: 1,
        itemsPerPage: 50,
        totalItems: 0,
        totalPages: 0
    }
};

// Utilitários
const Utils = {
    formatNumber: (num) => {
        return new Intl.NumberFormat('pt-BR').format(num);
    },
    
    formatDate: (date) => {
        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(date));
    },
    
    showNotification: (message, type = 'info') => {
        // Criar sistema de notificações toast
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 2rem;
            right: 2rem;
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: var(--border-radius);
            padding: 1rem 1.5rem;
            box-shadow: var(--shadow-xl);
            z-index: 10000;
            max-width: 400px;
            animation: slideInRight 0.3s ease-out;
        `;
        
        const colors = {
            success: 'var(--success-500)',
            error: 'var(--error-500)',
            warning: 'var(--warning-500)',
            info: 'var(--primary-500)'
        };
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.75rem;">
                <div style="width: 4px; height: 40px; background: ${colors[type]}; border-radius: 2px;"></div>
                <div style="flex: 1;">
                    <div style="color: var(--text-primary); font-weight: 600; margin-bottom: 0.25rem;">
                        ${type.charAt(0).toUpperCase() + type.slice(1)}
                    </div>
                    <div style="color: var(--text-secondary); font-size: 0.875rem;">
                        ${message}
                    </div>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 1.25rem;">×</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto remove após 5 segundos
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.animation = 'slideOutRight 0.3s ease-out';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    },
    
    setLoadingState: (element, isLoading, loadingText = 'Carregando...') => {
        if (isLoading) {
            element.classList.add('loading');
            element.style.pointerEvents = 'none';
            element.style.opacity = '0.7';
        } else {
            element.classList.remove('loading');
            element.style.pointerEvents = '';
            element.style.opacity = '';
        }
    }
};

// Inicialização da aplicação
document.addEventListener('DOMContentLoaded', async () => {
    // Carregar fonte Inter se não estiver disponível
    if (!document.fonts.check('1rem Inter')) {
        const link = document.createElement('link');
        link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
    }
    
    // Adicionar estilos de animação
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
    
    // Carregar Supabase
    try {
        const supabaseScript = document.createElement('script');
        supabaseScript.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
        supabaseScript.onload = () => {
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
            initPage();
        };
        supabaseScript.onerror = () => {
            Utils.showNotification('Erro ao carregar Supabase. Verifique sua conexão.', 'error');
        };
        document.head.appendChild(supabaseScript);
    } catch (error) {
        Utils.showNotification('Erro na inicialização do sistema.', 'error');
        console.error('Erro na inicialização:', error);
    }
    
    // Configurar sidebar toggle
    setupSidebarToggle();
    
    // Detectar página atual
    AppState.currentPage = getCurrentPage();
});

// Configuração da sidebar
function setupSidebarToggle() {
    const toggleBtn = document.getElementById('toggle-sidebar-btn');
    const sidebar = document.querySelector('.sidebar');
    
    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => {
            AppState.sidebarCollapsed = !AppState.sidebarCollapsed;
            sidebar.classList.toggle('collapsed', AppState.sidebarCollapsed);
            
            // Atualizar ícone do botão
            const icon = toggleBtn.querySelector('svg');
            if (icon) {
                icon.style.transform = AppState.sidebarCollapsed ? 'rotate(180deg)' : 'rotate(0deg)';
            }
        });
        
        // Auto-colapsar em telas menores
        const mediaQuery = window.matchMedia('(max-width: 1024px)');
        const handleMediaQuery = (e) => {
            if (e.matches) {
                sidebar.classList.add('collapsed');
                AppState.sidebarCollapsed = true;
            }
        };
        
        mediaQuery.addListener(handleMediaQuery);
        handleMediaQuery(mediaQuery);
    }
}

// Detectar página atual
function getCurrentPage() {
    const path = window.location.pathname.split("/").pop();
    if (path === 'requisicoes.html') return 'requisicoes';
    if (path === 'analytics.html') return 'analytics';
    return 'dashboard';
}

// Inicialização baseada na página
function initPage() {
    switch (AppState.currentPage) {
        case 'dashboard':
            initDashboard();
            break;
        case 'requisicoes':
            initRequisicoes();
            break;
        case 'analytics':
            initAnalytics();
            break;
    }
}

// === DASHBOARD ===
async function initDashboard() {
    const elements = {
        pendentes: document.getElementById('pendentes-count'),
        baixados: document.getElementById('baixados-count'),
        parciais: document.getElementById('parciais-count'),
        erros: document.getElementById('erros-count')
    };
    
    // Verificar se todos os elementos existem
    if (!Object.values(elements).every(el => el)) {
        console.warn('Alguns elementos do dashboard não foram encontrados');
        return;
    }
    
    try {
        // Mostrar loading
        Object.values(elements).forEach(el => {
            Utils.setLoadingState(el, true);
            el.textContent = '...';
        });
        
        const { data, error } = await supabaseClient
            .from(CONFIG.NOME_DA_VIEW)
            .select('status');
        
        if (error) throw error;
        
        // Contar status
        const counts = {
            pendentes: 0,
            baixados: 0,
            parciais: 0,
            erros: 0
        };
        
        data.forEach(item => {
            const status = String(item.status || '').toUpperCase();
            if (status.includes('PENDENTE')) counts.pendentes++;
            else if (status === 'BAIXADO') counts.baixados++;
            else if (status.includes('PARCIAL')) counts.parciais++;
            else if (status.includes('ERRO')) counts.erros++;
        });
        
        // Animar contadores
        Object.entries(counts).forEach(([key, value]) => {
            const element = elements[key];
            animateCounter(element, value);
            Utils.setLoadingState(element, false);
        });
        
        Utils.showNotification('Dashboard atualizado com sucesso!', 'success');
        
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
        Utils.showNotification('Erro ao carregar dados do dashboard.', 'error');
        
        // Resetar elementos
        Object.values(elements).forEach(el => {
            el.textContent = '0';
            Utils.setLoadingState(el, false);
        });
    }
}

// Animação de contador
function animateCounter(element, targetValue) {
    const duration = 1000;
    const startValue = 0;
    const startTime = performance.now();
    
    function updateCounter(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function (ease-out)
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentValue = Math.floor(startValue + (targetValue - startValue) * easeOut);
        
        element.textContent = Utils.formatNumber(currentValue);
        
        if (progress < 1) {
            requestAnimationFrame(updateCounter);
        }
    }
    
    requestAnimationFrame(updateCounter);
}

// === REQUISIÇÕES ===
function initRequisicoes() {
    const elements = {
        tableBody: document.querySelector('#requisicoes-table tbody'),
        syncBtn: document.getElementById('sync-requisicoes-btn'),
        searchBtn: document.getElementById('search-filters-btn'),
        clearBtn: document.getElementById('clear-filters-btn'),
        filters: {
            id: document.getElementById('filter-id'),
            projeto: document.getElementById('filter-projeto'),
            reserva: document.getElementById('filter-reserva'),
            codigo: document.getElementById('filter-codigo'),
            situacao: document.getElementById('filter-situacao')
        }
    };
    
    // Verificar elementos essenciais
    if (!elements.tableBody || !elements.syncBtn) {
        console.error('Elementos essenciais da página de requisições não encontrados');
        return;
    }
    
    // Event listeners
    elements.syncBtn.addEventListener('click', sincronizarDadosSupabase);
    elements.searchBtn?.addEventListener('click', aplicarFiltros);
    elements.clearBtn?.addEventListener('click', limparFiltros);
    
    // Filtros em tempo real
    Object.values(elements.filters).forEach(filter => {
        if (filter) {
            filter.addEventListener('input', debounce(aplicarFiltros, 300));
        }
    });
    
    // Configurar paginação
    configurarPaginacao();
    
    // Carregar dados iniciais
    sincronizarDadosSupabase();
}

// Sincronização com Supabase
async function sincronizarDadosSupabase() {
    const tableBody = document.querySelector('#requisicoes-table tbody');
    const syncBtn = document.getElementById('sync-requisicoes-btn');

    if (!tableBody || !syncBtn) return;

    try {
        AppState.isLoading = true;
        Utils.setLoadingState(syncBtn, true);

        // Mostrar loading na tabela
        tableBody.innerHTML = `
            <tr>
                <td colspan="10" style="text-align: center; padding: 3rem;">
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 1rem;">
                        <div class="loading-spinner" style="width: 40px; height: 40px; border: 3px solid var(--border-color); border-top: 3px solid var(--primary-500); border-radius: 50%; animation: spin 1s linear infinite;"></div>
                        <div style="color: var(--text-primary); font-weight: 600;">Sincronizando dados...</div>
                        <div style="color: var(--text-muted); font-size: 0.875rem;">Buscando dados da view e salvando na tabela espelho</div>
                    </div>
                </td>
            </tr>
        `;

        // Adicionar animação de loading
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);

        // 1. Buscar dados da view
        const { data: viewData, error: viewError } = await supabaseClient
            .from(CONFIG.NOME_DA_VIEW)
            .select('*');

        if (viewError) throw viewError;

        // 2. Salvar na tabela espelho
        if (viewData && viewData.length > 0) {
            const { error: upsertError } = await supabaseClient
                .from('requisicoes_espelho')
                .upsert(viewData, { onConflict: 'itemrequisicaoid' });

            if (upsertError) throw upsertError;
        }

        // 3. Ler da tabela espelho
        const { data: espelhoData, error: espelhoError } = await supabaseClient
            .from('requisicoes_espelho')
            .select('*');

        if (espelhoError) throw espelhoError;

        AppState.allRequisicoesData = espelhoData.map(item => ({
            ...item,
            qtdbaixada: item.qtdbaixada || 0,
            status: item.status || CONFIG.SITUACAO_PADRAO
        }));

        aplicarFiltros();

        Utils.showNotification(
            `Sincronização concluída! ${viewData.length} registros processados.`,
            'success'
        );

    } catch (error) {
        console.error('Erro na sincronização:', error);
        Utils.showNotification('Erro ao sincronizar dados. Tente novamente.', 'error');

        tableBody.innerHTML = `
            <tr>
                <td colspan="10" style="text-align: center; padding: 3rem; color: var(--error-500);">
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 1rem;">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="15" y1="9" x2="9" y2="15"/>
                            <line x1="9" y1="9" x2="15" y2="15"/>
                        </svg>
                        <div style="font-weight: 600;">Erro ao carregar dados</div>
                        <div style="font-size: 0.875rem; color: var(--text-muted);">Clique em "Sincronizar" para tentar novamente</div>
                    </div>
                </td>
            </tr>
        `;
    } finally {
        AppState.isLoading = false;
        Utils.setLoadingState(syncBtn, false);
    }
}

// Aplicar filtros
function aplicarFiltros() {
    const tableBody = document.querySelector('#requisicoes-table tbody');
    if (!tableBody) return;
    
    const filters = {
        id: document.getElementById('filter-id')?.value.toLowerCase() || '',
        projeto: document.getElementById('filter-projeto')?.value.toLowerCase() || '',
        reserva: document.getElementById('filter-reserva')?.value.toLowerCase() || '',
        codigo: document.getElementById('filter-codigo')?.value.toLowerCase() || '',
        situacao: document.getElementById('filter-situacao')?.value.toLowerCase() || ''
    };
    
    let dadosFiltrados = [...AppState.allRequisicoesData];
    
    // Aplicar filtros
    if (filters.id) {
        dadosFiltrados = dadosFiltrados.filter(item => 
            String(item.requisicaoid).toLowerCase().includes(filters.id)
        );
    }
    
    if (filters.projeto) {
        dadosFiltrados = dadosFiltrados.filter(item => 
            String(item.projeto || '').toLowerCase().includes(filters.projeto)
        );
    }
    
    if (filters.reserva) {
        dadosFiltrados = dadosFiltrados.filter(item => 
            String(item.reserva || '').toLowerCase().includes(filters.reserva)
        );
    }
    
    if (filters.codigo) {
        dadosFiltrados = dadosFiltrados.filter(item => 
            String(item.codigo || '').toLowerCase().includes(filters.codigo) ||
            String(item.descricao || '').toLowerCase().includes(filters.codigo)
        );
    }
    
    if (filters.situacao) {
        dadosFiltrados = dadosFiltrados.filter(item => 
            String(item.status || '').toLowerCase().includes(filters.situacao)
        );
    }
    
    // Atualizar paginação com dados filtrados
    AppState.pagination.totalItems = dadosFiltrados.length;
    AppState.pagination.totalPages = Math.ceil(dadosFiltrados.length / AppState.pagination.itemsPerPage);
    AppState.pagination.currentPage = 1; // Reset para primeira página
    
    exibirRequisicoesPaginadas(dadosFiltrados);
    atualizarPaginacao();
}

// Exibir requisições com paginação
function exibirRequisicoesPaginadas(todasRequisicoes) {
    const startIndex = (AppState.pagination.currentPage - 1) * AppState.pagination.itemsPerPage;
    const endIndex = startIndex + AppState.pagination.itemsPerPage;
    const requisicoesParaExibir = todasRequisicoes.slice(startIndex, endIndex);
    
    exibirRequisicoes(requisicoesParaExibir);
    
    // Mostrar/esconder paginação
    const paginationContainer = document.getElementById('pagination-container');
    if (paginationContainer) {
        paginationContainer.style.display = AppState.pagination.totalPages > 1 ? 'flex' : 'none';
    }
}

// Atualizar controles de paginação
function atualizarPaginacao() {
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    const pageInfo = document.getElementById('page-info');
    
    if (prevBtn) prevBtn.disabled = AppState.pagination.currentPage <= 1;
    if (nextBtn) nextBtn.disabled = AppState.pagination.currentPage >= AppState.pagination.totalPages;
    
    if (pageInfo) {
        pageInfo.textContent = `Página ${AppState.pagination.currentPage} de ${AppState.pagination.totalPages} (${AppState.pagination.totalItems} itens)`;
    }
}

// Configurar eventos de paginação
function configurarPaginacao() {
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (AppState.pagination.currentPage > 1) {
                AppState.pagination.currentPage--;
                aplicarFiltros();
            }
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (AppState.pagination.currentPage < AppState.pagination.totalPages) {
                AppState.pagination.currentPage++;
                aplicarFiltros();
            }
        });
    }
}

// Exibir requisições na tabela (função original mantida)
function exibirRequisicoes(requisicoes) {
    const tableBody = document.querySelector('#requisicoes-table tbody');
    if (!tableBody) return;
    
    if (requisicoes.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="10" style="text-align: center; padding: 3rem;">
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 1rem; color: var(--text-muted);">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                            <circle cx="11" cy="11" r="8"/>
                            <path d="M21 21l-4.35-4.35"/>
                        </svg>
                        <div style="font-weight: 600;">Nenhuma requisição encontrada</div>
                        <div style="font-size: 0.875rem;">Tente ajustar os filtros ou sincronizar novamente</div>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = '';
    
    requisicoes.forEach((item, index) => {
        const row = tableBody.insertRow();
        row.style.animation = `fadeIn 0.3s ease-out ${index * 0.05}s both`;
        
        // Determinar cor do status
        const statusColor = getStatusColor(item.status);
        
        row.innerHTML = `
            <td style="font-weight: 600; color: var(--primary-400);">${item.requisicaoid}</td>
            <td>${item.projeto || '-'}</td>
            <td>${item.reserva || '-'}</td>
            <td style="font-family: monospace; font-weight: 600;">${item.codigo}</td>
            <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${item.descricao}">${item.descricao}</td>
            <td style="text-align: center; font-weight: 600;">${Utils.formatNumber(item.qtdsolicitada)}</td>
            <td style="text-align: center; font-weight: 600; color: var(--success-500);">${Utils.formatNumber(item.qtdentregue)}</td>
            <td style="text-align: center;">
                <input type="number" 
                       class="qtd-baixada-input" 
                       value="${item.qtdbaixada}" 
                       min="0" 
                       max="${item.qtdentregue}"
                       step="0.01"
                       ${item.qtdbaixada >= item.qtdentregue ? 'disabled' : ''}>
            </td>
            <td>
                <span style="background: ${statusColor.bg}; color: ${statusColor.text}; padding: 0.25rem 0.75rem; border-radius: var(--border-radius-sm); font-size: 0.8rem; font-weight: 600; white-space: nowrap;">
                    ${item.status}
                </span>
            </td>
            <td class="action-buttons">
                <button class="sharepoint-btn" title="Enviar para SharePoint">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                        <polyline points="7,10 12,15 17,10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                </button>
                <button class="estoque-btn" title="Verificar Estoque">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
                        <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
                        <line x1="12" y1="22.08" x2="12" y2="12"/>
                    </svg>
                </button>
            </td>
        `;
        
        // Event listener para input de quantidade baixada
        const qtdInput = row.querySelector('.qtd-baixada-input');
        qtdInput.addEventListener('change', (e) => {
            const novaQtd = parseFloat(e.target.value) || 0;
            if (novaQtd >= 0 && novaQtd <= item.qtdentregue) {
                baixarRequisicao(item, novaQtd);
            } else {
                e.target.value = item.qtdbaixada;
                Utils.showNotification('Quantidade inválida!', 'warning');
            }
        });
    });
}

// Obter cor do status
function getStatusColor(status) {
    const statusUpper = String(status).toUpperCase();
    
    if (statusUpper === 'BAIXADO') {
        return { bg: 'var(--success-50)', text: 'var(--success-700)' };
    } else if (statusUpper.includes('PARCIAL')) {
        return { bg: 'var(--warning-50)', text: 'var(--warning-700)' };
    } else if (statusUpper.includes('ERRO')) {
        return { bg: 'var(--error-50)', text: 'var(--error-700)' };
    } else {
        return { bg: 'var(--neutral-100)', text: 'var(--neutral-700)' };
    }
}

// Baixar requisição
async function baixarRequisicao(req, novaQtdBaixada) {
    try {
        const qtdEntregue = req.qtdentregue;
        let newStatus = CONFIG.SITUACAO_PADRAO;
        
        if (Math.abs(novaQtdBaixada - qtdEntregue) < 0.001) {
            newStatus = 'BAIXADO';
        } else if (novaQtdBaixada > 0 && novaQtdBaixada < qtdEntregue) {
            newStatus = `BAIXA PARCIAL (${novaQtdBaixada}/${qtdEntregue})`;
        } else if (novaQtdBaixada > qtdEntregue) {
            newStatus = `ERRO: BAIXA (${novaQtdBaixada}) > ENTREGUE (${qtdEntregue})`;
        }
        
        const { error } = await supabaseClient
            .from('requisicoes')
            .update({ 
                qtdbaixada: novaQtdBaixada, 
                status: newStatus 
            })
            .eq('requisicaoid', req.requisicaoid);
        
        if (error) throw error;
        
        // Atualizar dados locais
        const index = AppState.allRequisicoesData.findIndex(
            item => item.requisicaoid === req.requisicaoid && item.codigo === req.codigo
        );
        
        if (index !== -1) {
            AppState.allRequisicoesData[index].qtdbaixada = novaQtdBaixada;
            AppState.allRequisicoesData[index].status = newStatus;
        }
        
        aplicarFiltros();
        Utils.saveToLocalStorage('requisicoesData', AppState.allRequisicoesData); // Salvar no Local Storage
        Utils.showNotification('Requisição atualizada com sucesso!', 'success');
        
    } catch (error) {
        console.error('Erro ao baixar requisição:', error);
        Utils.showNotification('Erro ao atualizar requisição.', 'error');
    }
}

// Limpar filtros
function limparFiltros() {
    const filters = [
        'filter-id', 'filter-projeto', 'filter-reserva', 
        'filter-codigo', 'filter-situacao'
    ];
    
    filters.forEach(filterId => {
        const element = document.getElementById(filterId);
        if (element) element.value = '';
    });
    
    aplicarFiltros();
    Utils.showNotification('Filtros limpos!', 'info');
}

// === ANALYTICS ===
async function initAnalytics() {
    const elements = {
        projetosList: document.getElementById('projetos-pendentes-list'),
        itensList: document.getElementById('itens-pendentes-list'),
        totalProjetos: document.getElementById('total-projetos'),
        projetosPendentes: document.getElementById('projetos-pendentes'),
        taxaEficiencia: document.getElementById('taxa-eficiencia')
    };
    
    try {
        const { data, error } = await supabaseClient
            .from(CONFIG.NOME_DA_VIEW)
            .select('projeto, descricao, status, qtdentregue, qtdbaixada');
        
        if (error) throw error;
        
        // Análise de projetos
        const projetosPendentes = {};
        const itensPendentes = [];
        let totalItens = data.length;
        let itensProcessados = 0;
        
        data.forEach(item => {
            const status = String(item.status || '').toUpperCase();
            const projeto = item.projeto || 'Sem Projeto';
            
            if (status === 'BAIXADO') {
                itensProcessados++;
            } else if (status.includes('PENDENTE') || status.includes('PARCIAL')) {
                if (!projetosPendentes[projeto]) {
                    projetosPendentes[projeto] = { total: 0, sharepoint: 0 };
                }
                projetosPendentes[projeto].total++;
                itensPendentes.push(item);
            }
        });
        
        // Atualizar interface
        if (elements.projetosList) {
            if (Object.keys(projetosPendentes).length === 0) {
                elements.projetosList.innerHTML = `
                    <div style="text-align: center; color: var(--success-500); padding: 2rem;">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="margin-bottom: 1rem;">
                            <path d="M20 6L9 17l-5-5"/>
                        </svg>
                        <div style="font-weight: 600; margin-bottom: 0.5rem;">Excelente!</div>
                        <div style="font-size: 0.875rem;">Nenhum projeto com pendências</div>
                    </div>
                `;
            } else {
                elements.projetosList.innerHTML = Object.entries(projetosPendentes)
                    .sort(([,a], [,b]) => b.total - a.total)
                    .map(([projeto, dados]) => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: var(--bg-primary); border-radius: var(--border-radius-sm); margin-bottom: 0.75rem; border: 1px solid var(--border-color);">
                            <div>
                                <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 0.25rem;">${projeto}</div>
                                <div style="font-size: 0.875rem; color: var(--text-muted);">
                                    ${dados.total} item(s) pendente(s)
                                    ${dados.sharepoint > 0 ? ` • ${dados.sharepoint} SharePoint` : ''}
                                </div>
                            </div>
                            <div style="background: var(--warning-500); color: white; padding: 0.25rem 0.75rem; border-radius: var(--border-radius-sm); font-weight: 600; font-size: 0.875rem;">
                                ${dados.total}
                            </div>
                        </div>
                    `).join('');
            }
        }
        
        if (elements.itensList) {
            if (itensPendentes.length === 0) {
                elements.itensList.innerHTML = `
                    <div style="text-align: center; color: var(--success-500); padding: 2rem;">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="margin-bottom: 1rem;">
                            <path d="M20 6L9 17l-5-5"/>
                        </svg>
                        <div style="font-weight: 600; margin-bottom: 0.5rem;">Tudo em dia!</div>
                        <div style="font-size: 0.875rem;">Nenhum item pendente encontrado</div>
                    </div>
                `;
            } else {
                elements.itensList.innerHTML = itensPendentes
                    .slice(0, 20) // Limitar a 20 itens
                    .map(item => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: var(--bg-primary); border-radius: var(--border-radius-sm); margin-bottom: 0.5rem; border: 1px solid var(--border-color);">
                            <div style="flex: 1; min-width: 0;">
                                <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 0.25rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                    ${item.descricao}
                                </div>
                                <div style="font-size: 0.8rem; color: var(--text-muted);">
                                    Projeto: ${item.projeto} • Status: ${item.status}
                                </div>
                            </div>
                            <div style="margin-left: 1rem;">
                                <span style="background: var(--warning-500); color: white; padding: 0.25rem 0.5rem; border-radius: var(--border-radius-sm); font-size: 0.75rem; font-weight: 600;">
                                    ${item.qtdbaixada || 0}/${item.qtdentregue}
                                </span>
                            </div>
                        </div>
                    `).join('');
                
                if (itensPendentes.length > 20) {
                    elements.itensList.innerHTML += `
                        <div style="text-align: center; padding: 1rem; color: var(--text-muted); font-size: 0.875rem;">
                            ... e mais ${itensPendentes.length - 20} itens
                        </div>
                    `;
                }
            }
        }
        
        // Atualizar métricas
        const totalProjetosCount = new Set(data.map(item => item.projeto)).size;
        const projetosPendentesCount = Object.keys(projetosPendentes).length;
        const taxaEficiencia = totalItens > 0 ? Math.round((itensProcessados / totalItens) * 100) : 0;
        
        if (elements.totalProjetos) {
            animateCounter(elements.totalProjetos, totalProjetosCount);
        }
        if (elements.projetosPendentes) {
            animateCounter(elements.projetosPendentes, projetosPendentesCount);
        }
        if (elements.taxaEficiencia) {
            animateCounter(elements.taxaEficiencia, taxaEficiencia);
            setTimeout(() => {
                elements.taxaEficiencia.textContent = taxaEficiencia + '%';
            }, 1000);
        }
        
        Utils.showNotification('Analytics atualizado com sucesso!', 'success');
        
    } catch (error) {
        console.error('Erro ao carregar analytics:', error);
        Utils.showNotification('Erro ao carregar dados de analytics.', 'error');
    }
}

// Função debounce para otimizar filtros
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Exportar funções globais se necessário
window.AppState = AppState;
window.Utils = Utils;
