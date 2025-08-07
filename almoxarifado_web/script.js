// Configurações do Supabase (substitua com suas credenciais reais)
const SUPABASE_URL = "https://uqcvxbaxedzhicmueigo.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxY3Z4YmF4ZWR6aGljbXVlaWdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAyNjY3ODcsImV4cCI6MjA2NTg0Mjc4N30.EdDHZ4a2RC9VKKTVAgXPqFPI8_0rbSPUu1soNcBVISc";

// Inicializa o cliente Supabase
let supabaseClient;

// --- CONFIGURAÇÃO ---
const CONFIG = {
    SITUACAO_PADRAO: "PENDENTE DE BAIXA",
    NOME_DA_VIEW: "vw_RequisicoesItens",
    TAMANHO_PAGINA: 1000,
};

// --- LÓGICA DE ROTEAMENTO SIMPLES ---
document.addEventListener('DOMContentLoaded', () => {
    const supabaseScript = document.createElement('script');
    supabaseScript.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    supabaseScript.onload = () => {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        initPage(); // Inicializa a lógica da página atual
    };
    document.head.appendChild(supabaseScript);

    // Lógica do sidebar é global
    const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
    const sidebar = document.querySelector('.sidebar');
    if (toggleSidebarBtn && sidebar) {
        toggleSidebarBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });
    }
});

function initPage() {
    const path = window.location.pathname.split("/").pop();

    if (path === 'index.html' || path === '') {
        initDashboard();
    } else if (path === 'requisicoes.html') {
        initRequisicoes();
    } else if (path === 'analytics.html') {
        initAnalytics();
    }
}

// --- LÓGICA DA PÁGINA DE REQUISIÇÕES ---
function initRequisicoes() {
    const requisicoesTableBody = document.querySelector('#requisicoes-table tbody');
    const syncRequisicoesBtn = document.getElementById('sync-requisicoes-btn');
    const filterIdInput = document.getElementById('filter-id');
    const filterProjetoInput = document.getElementById('filter-projeto');
    const filterReservaInput = document.getElementById('filter-reserva');
    const filterCodigoInput = document.getElementById('filter-codigo');
    const filterSituacaoSelect = document.getElementById('filter-situacao');
    const searchFiltersBtn = document.getElementById('search-filters-btn');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');

    let allRequisicoesData = [];

    async function sincronizarDadosSupabaseFrontend() {
        console.log("Iniciando sincronização com Supabase...");
        requisicoesTableBody.innerHTML = '<tr><td colspan="10">Sincronizando dados...</td></tr>';

        try {
            let todosOsDadosSupabase = [], pagina = 0, continuarBuscando = true;
            while (continuarBuscando) {
                const offset = pagina * CONFIG.TAMANHO_PAGINA;
                const { data: dadosDaPagina, error } = await supabaseClient
                    .from(CONFIG.NOME_DA_VIEW)
                    .select('*')
                    .gt('qtdentregue', 0)
                    .range(offset, offset + CONFIG.TAMANHO_PAGINA - 1);

                if (error) throw error;

                if (dadosDaPagina.length > 0) {
                    todosOsDadosSupabase = todosOsDadosSupabase.concat(dadosDaPagina);
                }
                if (dadosDaPagina.length < CONFIG.TAMANHO_PAGINA) {
                    continuarBuscando = false;
                } else {
                    pagina++;
                }
            }
            
            allRequisicoesData = todosOsDadosSupabase.map(item => ({
                ...item,
                qtdbaixada: item.qtdbaixada || 0,
                status: item.status || CONFIG.SITUACAO_PADRAO
            }));

            aplicarFiltros();
            alert(`Sincronização Concluída! Total de itens: ${allRequisicoesData.length}.`);
        } catch (error) {
            console.error('Erro na sincronização:', error.message);
            alert('Ocorreu um erro na sincronização: ' + error.message);
            requisicoesTableBody.innerHTML = '<tr><td colspan="10">Erro ao carregar dados.</td></tr>';
        }
    }

    function exibirRequisicoes(requisicoes) {
        requisicoesTableBody.innerHTML = '';
        if (requisicoes.length === 0) {
            requisicoesTableBody.innerHTML = '<tr><td colspan="10">Nenhuma requisição encontrada.</td></tr>';
            return;
        }
        requisicoes.forEach(item => {
            const row = requisicoesTableBody.insertRow();
            row.innerHTML = `
                <td>${item.requisicaoid}</td>
                <td>${item.projeto}</td>
                <td>${item.reserva}</td>
                <td>${item.codigo}</td>
                <td>${item.descricao}</td>
                <td>${item.qtdsolicitada}</td>
                <td>${item.qtdentregue}</td>
                <td><input type="number" class="qtd-baixada-input" value="${item.qtdbaixada}"></td>
                <td>${item.status}</td>
                <td class="action-buttons">
                    <button class="sharepoint-btn">SharePoint</button>
                    <button class="estoque-btn">Estoque</button>
                </td>
            `;
            const qtdBaixadaInput = row.querySelector('.qtd-baixada-input');
            qtdBaixadaInput.addEventListener('change', (e) => {
                const novaQtdBaixada = parseFloat(e.target.value);
                if (!isNaN(novaQtdBaixada) && novaQtdBaixada >= 0) {
                    baixarRequisicao(item, novaQtdBaixada);
                }
            });

            if (item.qtdbaixada >= item.qtdentregue) {
                qtdBaixadaInput.disabled = true;
            }
        });
    }

    function aplicarFiltros() {
        let filteredData = [...allRequisicoesData];
        const filterId = filterIdInput.value.toLowerCase();
        const filterProjeto = filterProjetoInput.value.toLowerCase();
        const filterReserva = filterReservaInput.value.toLowerCase();
        const filterCodigo = filterCodigoInput.value.toLowerCase();
        const filterSituacao = filterSituacaoSelect.value.toLowerCase();

        if (filterId) filteredData = filteredData.filter(item => String(item.requisicaoid).toLowerCase().includes(filterId));
        if (filterProjeto) filteredData = filteredData.filter(item => String(item.projeto).toLowerCase().includes(filterProjeto));
        if (filterReserva) filteredData = filteredData.filter(item => String(item.reserva).toLowerCase().includes(filterReserva));
        if (filterCodigo) filteredData = filteredData.filter(item => String(item.codigo).toLowerCase().includes(filterCodigo) || String(item.descricao).toLowerCase().includes(filterCodigo));
        if (filterSituacao) filteredData = filteredData.filter(item => String(item.status).toLowerCase().includes(filterSituacao));

        exibirRequisicoes(filteredData);
    }

    function limparFiltros() {
        filterIdInput.value = '';
        filterProjetoInput.value = '';
        filterReservaInput.value = '';
        filterCodigoInput.value = '';
        filterSituacaoSelect.value = '';
        aplicarFiltros();
    }

    async function baixarRequisicao(req, novaQtdBaixada) {
        const qtdEntregue = req.qtdentregue;
        let newStatus = CONFIG.SITUACAO_PADRAO;
        if (Math.abs(novaQtdBaixada - qtdEntregue) < 0.001) newStatus = 'BAIXADO';
        else if (novaQtdBaixada > 0 && novaQtdBaixada < qtdEntregue) newStatus = `BAIXA PARCIAL (${novaQtdBaixada}/${qtdEntregue})`;
        else if (novaQtdBaixada > qtdEntregue) newStatus = `ERRO: BAIXA (${novaQtdBaixada}) > ENTREGUE (${qtdEntregue})`;

        const { error } = await supabaseClient
            .from('requisicoes')
            .update({ qtdbaixada: novaQtdBaixada, status: newStatus })
            .eq('requisicaoid', req.requisicaoid);

        if (error) {
            alert('Erro ao baixar requisição: ' + error.message);
        } else {
            alert('Requisição atualizada com sucesso!');
            const index = allRequisicoesData.findIndex(item => item.requisicaoid === req.requisicaoid && item.codigo === req.codigo);
            if (index !== -1) {
                allRequisicoesData[index].qtdbaixada = novaQtdBaixada;
                allRequisicoesData[index].status = newStatus;
            }
            aplicarFiltros();
        }
    }

    syncRequisicoesBtn.addEventListener('click', sincronizarDadosSupabaseFrontend);
    searchFiltersBtn.addEventListener('click', aplicarFiltros);
    clearFiltersBtn.addEventListener('click', limparFiltros);

    sincronizarDadosSupabaseFrontend();
}

// --- LÓGICA DA PÁGINA DE DASHBOARD ---
async function initDashboard() {
    const pendentesCountEl = document.getElementById('pendentes-count');
    const baixadosCountEl = document.getElementById('baixados-count');
    const parciaisCountEl = document.getElementById('parciais-count');
    const errosCountEl = document.getElementById('erros-count');

    try {
        const { data, error } = await supabaseClient
            .from(CONFIG.NOME_DA_VIEW)
            .select('status');
        
        if (error) throw error;

        let pendentes = 0, baixados = 0, parciais = 0, erros = 0;
        data.forEach(item => {
            if (item.status === 'PENDENTE DE BAIXA') pendentes++;
            else if (item.status === 'BAIXADO') baixados++;
            else if (String(item.status).startsWith('BAIXA PARCIAL')) parciais++;
            else if (String(item.status).startsWith('ERRO')) erros++;
        });

        pendentesCountEl.textContent = pendentes;
        baixadosCountEl.textContent = baixados;
        parciaisCountEl.textContent = parciais;
        errosCountEl.textContent = erros;

    } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error.message);
    }
}

// --- LÓGICA DA PÁGINA DE ANALYTICS ---
async function initAnalytics() {
    const projetosPendentesListEl = document.getElementById('projetos-pendentes-list');
    const itensPendentesListEl = document.getElementById('itens-pendentes-list');

    try {
        const { data, error } = await supabaseClient
            .from(CONFIG.NOME_DA_VIEW)
            .select('projeto, descricao, status')
            .like('status', '%PENDENTE%');

        if (error) throw error;

        const projetosPendentes = {};
        const itensPendentes = [];

        data.forEach(item => {
            if (!projetosPendentes[item.projeto]) {
                projetosPendentes[item.projeto] = 0;
            }
            projetosPendentes[item.projeto]++;
            itensPendentes.push(item);
        });

        projetosPendentesListEl.innerHTML = Object.entries(projetosPendentes)
            .map(([projeto, count]) => `<p>${projeto}: ${count} item(s) pendente(s)</p>`)
            .join('');

        itensPendentesListEl.innerHTML = itensPendentes
            .map(item => `<p>${item.descricao} (Projeto: ${item.projeto})</p>`)
            .join('');

    } catch (error) {
        console.error('Erro ao carregar dados de analytics:', error.message);
    }
}
