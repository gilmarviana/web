// Script para carregar e exibir séries por categoria (group) a partir de M3U
async function fetchAndParseM3USeries(m3uUrl) {
    const res = await fetch(m3uUrl);
    if (!res.ok) throw new Error('Erro ao carregar M3U');
    const text = await res.text();
    return parseM3USeries(text);
}

function parseM3USeries(m3uText) {
    const lines = m3uText.split(/\r?\n/);
    const categoriasMap = {};
    let currentInfo = null;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('#EXTINF')) {
            const groupMatch = line.match(/group-title="([^"]+)"/);
            const nameMatch = line.match(/tvg-name="([^"]+)"/);
            const logoMatch = line.match(/tvg-logo="([^"]+)"/);
            const name = nameMatch ? nameMatch[1] : line.split(',').pop().trim();
            const group = groupMatch ? groupMatch[1] : 'Outros';
            const logo = logoMatch ? logoMatch[1] : '';
            // Filtrar todos exceto Canais e Filmes, mas incluir "CANAIS | FILMES E SERIES"
            if ((group.toLowerCase().includes('canais') || group.toLowerCase().includes('filmes')) && 
                !group.includes('FILMES E SERIES')) {
                currentInfo = null;
                continue;
            }
            currentInfo = { nome: name, group, logo, categoriaOriginal: group };
        } else if (currentInfo && line && !line.startsWith('#')) {
            // Só aceita se o url contiver '/series/'
            if (line.includes('/series/')) {
                currentInfo.url = line;
                if (!categoriasMap[currentInfo.group]) categoriasMap[currentInfo.group] = [];
                categoriasMap[currentInfo.group].push({ ...currentInfo });
            }
            currentInfo = null;
        }
    }
    // Retorna todas as categorias
    return Object.entries(categoriasMap)
        .map(([nome, series]) => ({ nome, series }));
}

let categoriasSeries = [];
let categoriaSelecionadaSerie = 0;
let serieSelecionada = 0;

function renderCategoriasSeries() {
    const catDiv = document.getElementById('seriesCategorias');
    if (!categoriasSeries.length) {
        catDiv.innerHTML = '<div style="padding:20px;color:#bbb">Nenhuma categoria encontrada.</div>';
        return;
    }
    catDiv.innerHTML = '<ul>' + categoriasSeries.map((cat, idx) =>
        `<li class="${idx === categoriaSelecionadaSerie ? 'active' : ''}" onclick="selectCategoriaSerie(${idx})">${cat.nome}</li>`
    ).join('') + '</ul>';
}

// --- Agrupamento de séries por nome base e temporada ---
function agruparSeriesPorTemporada(series) {
    const agrupadas = {};
    series.forEach(serie => {
        // Exemplo de nome: "Olympo S01E01"
        const match = serie.nome.match(/^(.*?)(?:\s+S(\d{2})E(\d{2}))/i);
        if (match) {
            const nomeBase = match[1].trim();
            const temporada = 'S' + match[2];
            const episodio = 'E' + match[3];
            if (!agrupadas[nomeBase]) agrupadas[nomeBase] = {};
            if (!agrupadas[nomeBase][temporada]) agrupadas[nomeBase][temporada] = [];
            agrupadas[nomeBase][temporada].push({...serie, temporada, episodio});
        } else {
            // Se não bater o padrão, coloca como "Outros"
            if (!agrupadas['Outros']) agrupadas['Outros'] = {};
            if (!agrupadas['Outros']['S00']) agrupadas['Outros']['S00'] = [];
            agrupadas['Outros']['S00'].push(serie);
        }
    });
    return agrupadas;
}

// --- Estados de navegação ---
let agrupamentoSeries = {};
let serieSelecionadaNome = null;
let temporadaSelecionada = null;
let episodioSelecionado = null;

function renderSeriesAgrupadas() {
    const grid = document.getElementById('seriesGrid');
    if (!agrupamentoSeries || Object.keys(agrupamentoSeries).length === 0) {
        grid.innerHTML = '<div style="padding:20px;color:#bbb">Nenhuma série encontrada.</div>';
        return;
    }
    // Nível 1: Lista de séries
    if (!serieSelecionadaNome) {
        grid.innerHTML = '<div class="cards-container">' + Object.keys(agrupamentoSeries).map(nomeBase => {
            // Pega a categoria original do primeiro episódio da série
            const primeiroEp = Object.values(agrupamentoSeries[nomeBase])[0][0];
            return `<div class="card-filme" onclick="selectSerieNome('${nomeBase.replace(/'/g, "\\'")}')">
                <div class="card-titulo">${nomeBase}</div>
            </div>`;
        }).join('') + '</div>';
        return;
    }
    // Nível 2: Lista de temporadas
    if (!temporadaSelecionada) {
        const temporadas = Object.keys(agrupamentoSeries[serieSelecionadaNome]);
        grid.innerHTML = '<div class="cards-container">' + temporadas.map(temp =>
            `<div class="card-filme" onclick="selectTemporada('${temp}')">
                <div class="card-titulo">${serieSelecionadaNome} ${temp}</div>
            </div>`
        ).join('') + '</div>';
        return;
    }
    // Nível 3: Lista de episódios
    const episodios = agrupamentoSeries[serieSelecionadaNome][temporadaSelecionada];
    grid.innerHTML = '<div class="cards-container">' + episodios.map((ep, idx) =>
        `<div class="card-filme" onclick="selectEpisodio(${idx})">
            <img src="${ep.logo || 'https://placehold.co/160x220/222/fff?text=' + encodeURIComponent(ep.nome.charAt(0))}" alt="${ep.nome}" class="card-capa">
            <div class="card-titulo">${ep.nome}</div>
        </div>`
    ).join('') + '</div>';
}

function renderSerieInfo() {
    const infoDiv = document.getElementById('serieInfo');
    // Sempre ocultar o título
    infoDiv.style.display = 'none';
    infoDiv.textContent = '';
}

function renderSeriePlayer() {
    const container = document.getElementById('player_container_serie');
    // Sempre ocultar o player
    container.style.display = 'none';
    if (window.clapprPlayerSerie) {
        window.clapprPlayerSerie.destroy();
    }
}

function abrirModalPlayerSerie(url, titulo) {
    const modal = document.getElementById('modalPlayer');
    const container = document.getElementById('modalPlayerContainer');
    const titleDiv = document.getElementById('modalPlayerTitle');
    modal.style.display = 'flex';
    container.innerHTML = '';
    if (titleDiv) titleDiv.textContent = titulo || '';
    if (window.clapprPlayer) window.clapprPlayer.destroy();
    window.clapprPlayer = new Clappr.Player({
        source: url,
        parentId: "#modalPlayerContainer",
        autoPlay: true,
        width: "100%",
        height: "100%",
        mute: false,
        hideControls: true
    });
}
function fecharModalPlayer() {
    document.getElementById('modalPlayer').style.display = 'none';
    if (window.clapprPlayer) window.clapprPlayer.destroy();
}

// Novo estado para navegação
// Removido duplicatas: categoriaSelecionadaSerie, serieSelecionadaNome, temporadaSelecionada, episodioSelecionado
// Novo agrupamento: categoria -> nomes-base -> temporadas -> episódios
let agrupamentoPorCategoria = {};

function agruparSeriesPorCategoria(categoriasSeries) {
    const agrupado = {};
    categoriasSeries.forEach(cat => {
        const categoria = cat.nome;
        if (!agrupado[categoria]) agrupado[categoria] = {};
        cat.series.forEach(serie => {
            // Agrupa por nome base e temporada
            const match = serie.nome.match(/^(.*?)(?:\s+S(\d{2})E(\d{2}))/i);
            let nomeBase = serie.nome;
            let temporada = 'S00';
            let episodio = '';
            if (match) {
                nomeBase = match[1].trim();
                temporada = 'S' + match[2];
                episodio = 'E' + match[3];
            }
            if (!agrupado[categoria][nomeBase]) agrupado[categoria][nomeBase] = {};
            if (!agrupado[categoria][nomeBase][temporada]) agrupado[categoria][nomeBase][temporada] = [];
            agrupado[categoria][nomeBase][temporada].push({ ...serie, temporada, episodio });
        });
    });
    return agrupado;
}

function sanitizeId(str) {
    return str.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function extrairNomeBase(nome) {
    // Remove 'Temporada X' ou 'Season X' do final do nome
    return nome.replace(/\s*[Tt]emporada\s*\d+$/, '').replace(/\s*[Ss]eason\s*\d+$/, '').trim();
}

// Chave da OMDb API - insira a sua aqui
const OMDB_API_KEY = '2ef23ead'; // Chave fornecida pelo usuário

async function buscarPosterIMDB(nomeSerie, fallbackNome) {
    const cacheKey = 'poster_' + nomeSerie;
    const cached = localStorage.getItem(cacheKey);
    if (cached) return cached;
    const url = `https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&t=${encodeURIComponent(nomeSerie)}`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.Poster && data.Poster !== 'N/A') {
            localStorage.setItem(cacheKey, data.Poster);
            return data.Poster;
        }
        // Tenta buscar pelo nome completo se não achou pelo nome-base
        if (fallbackNome && fallbackNome !== nomeSerie) {
            const url2 = `https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&t=${encodeURIComponent(fallbackNome)}`;
            const res2 = await fetch(url2);
            const data2 = await res2.json();
            if (data2.Poster && data2.Poster !== 'N/A') {
                localStorage.setItem(cacheKey, data2.Poster);
                return data2.Poster;
            }
        }
    } catch (e) {}
    return null;
}

// Chave da TMDb API - insira a sua aqui
const TMDB_API_KEY = 'e764afcdb53bf0c30f6c688621da1703'; // Chave fornecida pelo usuário

async function buscarPosterTMDB(nomeSerie) {
    const cacheKey = 'poster_tmdb_' + nomeSerie;
    const cached = localStorage.getItem(cacheKey);
    if (cached) return cached;
    const url = `https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(nomeSerie)}&language=pt-BR`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.results && data.results.length > 0 && data.results[0].poster_path) {
            const posterUrl = 'https://image.tmdb.org/t/p/w500' + data.results[0].poster_path;
            localStorage.setItem(cacheKey, posterUrl);
            return posterUrl;
        }
    } catch (e) {
        console.error('Erro TMDb:', e);
    }
    return null;
}

async function buscarBannerTemporadaTMDB(nomeSerie, numeroTemporada, nomeAlternativo) {
    const apiKey = TMDB_API_KEY;
    const cacheKey = `banner_tmdb_${nomeSerie}_S${numeroTemporada}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached !== null) return cached !== 'null' ? cached : null;
    // 1. Buscar o ID da série (primeiro em português, depois nomeAlternativo se fornecido)
    let searchUrl = `https://api.themoviedb.org/3/search/tv?api_key=${apiKey}&query=${encodeURIComponent(nomeSerie)}`;
    let searchRes = await fetch(searchUrl);
    let searchData = await searchRes.json();
    if ((!searchData.results || !searchData.results.length) && nomeAlternativo) {
        searchUrl = `https://api.themoviedb.org/3/search/tv?api_key=${apiKey}&query=${encodeURIComponent(nomeAlternativo)}`;
        searchRes = await fetch(searchUrl);
        searchData = await searchRes.json();
    }
    if (!searchData.results || !searchData.results.length) {
        console.warn('TMDb: Série não encontrada:', nomeSerie, nomeAlternativo);
        localStorage.setItem(cacheKey, 'null');
        return null;
    }
    const serieId = searchData.results[0].id;
    // 2. Buscar detalhes da temporada
    const seasonUrl = `https://api.themoviedb.org/3/tv/${serieId}/season/${numeroTemporada}?api_key=${apiKey}&language=pt-BR`;
    const seasonRes = await fetch(seasonUrl);
    const seasonData = await seasonRes.json();
    if (!seasonData.poster_path) {
        console.warn('TMDb: Banner da temporada não encontrado:', nomeSerie, 'Temporada', numeroTemporada);
        localStorage.setItem(cacheKey, 'null');
        return null;
    }
    // 3. Montar a URL do banner
    const bannerUrl = `https://image.tmdb.org/t/p/w780${seasonData.poster_path}`;
    localStorage.setItem(cacheKey, bannerUrl);
    return bannerUrl;
}

function renderSeriesAgrupadas() {
    const grid = document.getElementById('seriesGrid');
    if (!categoriasSeries.length) {
        grid.innerHTML = '<div style="padding:20px;color:#bbb">Nenhuma série encontrada.</div>';
        return;
    }
    const categoriaAtual = categoriasSeries[categoriaSelecionadaSerie]?.nome;
    if (!categoriaAtual) {
        grid.innerHTML = '<div style="padding:20px;color:#bbb">Nenhuma categoria selecionada.</div>';
        return;
    }
    const agrupamento = agrupamentoPorCategoria[categoriaAtual] || {};
    // Nível 1: Lista de nomes-base de séries da categoria
    if (!serieSelecionadaNome) {
        grid.innerHTML = '<div class="cards-container" id="seriesCardsContainer">' + Object.keys(agrupamento).map((nomeBase) => {
            const primeiroEp = Object.values(agrupamento[nomeBase])[0][0];
            const posterId = 'poster_' + sanitizeId(nomeBase);
            return `<div class=\"card-filme\" id=\"serieCard_${posterId}\" onclick=\"selectSerieNome('${nomeBase.replace(/'/g, "\\'")}')\">
                <img src=\"https://placehold.co/160x220/222/fff?text=${encodeURIComponent(nomeBase.charAt(0))}\" alt=\"${nomeBase}\" class=\"card-capa\" id=\"${posterId}\">
                <div class=\"card-titulo\">${nomeBase}</div>
            </div>`;
        }).join('') + '</div>';
        // Após renderizar, buscar posters na TMDb
        Object.keys(agrupamento).forEach((nomeBase) => {
            const posterId = 'poster_' + sanitizeId(nomeBase);
            buscarPosterTMDB(nomeBase).then(url => {
                if (url) {
                    const img = document.getElementById(posterId);
                    if (img) img.src = url;
                }
            });
        });
        return;
    }
    // Nível 2: Lista de temporadas da série selecionada
    if (!temporadaSelecionada) {
        const temporadas = Object.keys(agrupamento[serieSelecionadaNome]);
        grid.innerHTML = '<div style="margin-bottom: 20px;"><button onclick="voltarParaSeries()" style="background: #6c63ff; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-size: 14px;">← Voltar para Séries</button></div><div class="cards-container">' + temporadas.map(temp => {
            // Extrai o número da temporada
            let num = temp.match(/S(\d{2})/i);
            let label = num ? `Temporada ${parseInt(num[1], 10)}` : temp;
            let numeroTemporada = num ? parseInt(num[1], 10) : 1;
            let nomeBase = extrairNomeBase(serieSelecionadaNome);
            let nomeAlternativo = null;
            if (nomeBase === 'Coração de Ferro') nomeAlternativo = 'Ironheart';
            // ID único para o banner do card
            let bannerId = `bannerTemporada_CARD_${temp}`;
            // Inicia busca do banner (assíncrona)
            setTimeout(() => {
                buscarBannerTemporadaTMDB(nomeBase, numeroTemporada, nomeAlternativo).then(url => {
                    const bannerDiv = document.getElementById(bannerId);
                    if (bannerDiv) {
                        if (url) {
                            bannerDiv.innerHTML = `<img src='${url}' alt='Banner Temporada' style='width:100%;height:120px;object-fit:cover;display:block;border-radius:10px 10px 0 0;'>`;
                        } else {
                            bannerDiv.innerHTML = `<div style='width:100%;height:120px;display:flex;align-items:center;justify-content:center;background:#222;border-radius:10px 10px 0 0;color:#888;font-size:13px;'>Sem banner</div>`;
                        }
                    }
                });
            }, 0);
            return `<div class=\"card-filme\" onclick=\"selectTemporada('${temp}')\">\n<div id='${bannerId}'></div>\n<div class=\"card-titulo\">${serieSelecionadaNome} ${label}</div>\n</div>`;
        }).join('') + '</div>';
        return;
    }
    // Nível 3: Lista de episódios
    const episodios = agrupamento[serieSelecionadaNome][temporadaSelecionada];
    // Adicionar banner da temporada acima do grid
    let bannerHtml = '';
    let nomeBase = extrairNomeBase(serieSelecionadaNome);
    let nomeAlternativo = null;
    if (nomeBase === 'Coração de Ferro') nomeAlternativo = 'Ironheart';
    let numTemp = temporadaSelecionada.match(/S(\d{2})/i);
    let numeroTemporada = numTemp ? parseInt(numTemp[1], 10) : 1;
    console.log('Buscando banner para:', nomeBase, 'Temporada:', numeroTemporada, 'Alternativo:', nomeAlternativo);
    buscarBannerTemporadaTMDB(nomeBase, numeroTemporada, nomeAlternativo).then(url => {
        const bannerDiv = document.getElementById('bannerTemporada');
        if (bannerDiv) {
            if (url) {
                bannerDiv.innerHTML = `<img src='${url}' alt='Banner Temporada' style='width:100%;max-width:600px;display:block;margin:0 auto 24px;border-radius:12px;'>`;
            } else {
                bannerDiv.innerHTML = `<div style='width:100%;max-width:600px;height:180px;display:flex;align-items:center;justify-content:center;background:#222;border-radius:12px;color:#888;margin:0 auto 24px;'>Banner não encontrado</div>`;
            }
        }
    });
    bannerHtml = `<div id='bannerTemporada'></div>`;
    grid.innerHTML = '<div style="margin-bottom: 20px;"><button onclick="voltarParaTemporadas()" style="background: #6c63ff; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-size: 14px;">← Voltar para Temporadas</button></div>' + bannerHtml + '<div class="cards-container">' + episodios.map((ep, idx) =>
        `<div class="card-filme" onclick="selectEpisodio(${idx})">
            <img src="${ep.logo || 'https://placehold.co/160x220/222/fff?text=' + encodeURIComponent(ep.nome.charAt(0))}" alt="${ep.nome}" class="card-capa">
            <div class="card-titulo">${ep.nome}</div>
        </div>`
    ).join('') + '</div>';
}

function exibirNovoModalPlayer(url, titulo) {
    // Remove qualquer modal anterior
    const modalExistente = document.getElementById('novoModalPlayer');
    if (modalExistente) modalExistente.remove();

    // Cria o modal
    const modal = document.createElement('div');
    modal.id = 'novoModalPlayer';
    modal.style.position = 'fixed';
    modal.style.top = 0;
    modal.style.left = 0;
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(0,0,0,0.85)';
    modal.style.zIndex = 100000;
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';

    // Conteúdo do modal
    modal.innerHTML = `
        <div style="background:#23232a; border-radius:12px; padding:24px 18px 18px 18px; min-width:320px; max-width:95vw; min-height:200px; max-height:90vh; display:flex; flex-direction:column; align-items:center; position:relative;">
            <span id="novoModalClose" style="position:absolute;top:8px;right:16px;font-size:2rem;color:#fff;cursor:pointer;z-index:2;">&times;</span>
            <div style="color:#fff;font-size:1.2rem;font-weight:600;margin-bottom:12px;text-align:center;">${titulo || ''}</div>
            <div id="novoModalPlayerContainer" style="width:60vw;max-width:900px;height:340px;max-height:70vh;background:#000;border-radius:8px;"></div>
        </div>
    `;

    document.body.appendChild(modal);

    // Fechar modal
    document.getElementById('novoModalClose').onclick = function() {
        if (window.novoClapprPlayer) window.novoClapprPlayer.destroy();
        modal.remove();
    };

    // Criar player
    if (window.novoClapprPlayer) window.novoClapprPlayer.destroy();
    window.novoClapprPlayer = new Clappr.Player({
        source: url,
        parentId: "#novoModalPlayerContainer",
        autoPlay: true,
        width: "100%",
        height: "100%",
        mute: false,
        hideControls: true
    });
}

window.selectCategoriaSerie = function(idx) {
    categoriaSelecionadaSerie = idx;
    serieSelecionadaNome = null;
    temporadaSelecionada = null;
    episodioSelecionado = null;
    // Atualiza agrupamentoSeries com as séries da categoria selecionada
    agrupamentoSeries = agruparSeriesPorTemporada(categoriasSeries[idx].series);
    renderCategoriasSeries();
    renderSeriesAgrupadas();
    renderSerieInfo();
    renderSeriePlayer();
};

window.selectSerieNome = function(nomeBase) {
    serieSelecionadaNome = nomeBase;
    temporadaSelecionada = null;
    episodioSelecionado = null;
    renderSeriesAgrupadas();
    renderSerieInfo();
    renderSeriePlayer(); // Chama renderSeriePlayer para ocultar o player
};
window.selectTemporada = function(temp) {
    temporadaSelecionada = temp;
    episodioSelecionado = null;
    renderSeriesAgrupadas();
    renderSerieInfo();
    renderSeriePlayer(); // Chama renderSeriePlayer para ocultar o player
};
window.selectEpisodio = function(idx) {
    console.log('selectEpisodio chamado', idx, agrupamentoSeries, serieSelecionadaNome, temporadaSelecionada);
    episodioSelecionado = idx;
    renderSeriesAgrupadas();
    renderSerieInfo();
    renderSeriePlayer();

    if (
        agrupamentoSeries &&
        serieSelecionadaNome &&
        temporadaSelecionada &&
        agrupamentoSeries[serieSelecionadaNome] &&
        agrupamentoSeries[serieSelecionadaNome][temporadaSelecionada]
    ) {
        const ep = agrupamentoSeries[serieSelecionadaNome][temporadaSelecionada][idx];
        console.log('Abrindo modal para episódio:', ep);
        if (ep && ep.url) {
            exibirNovoModalPlayer(ep.url, ep.nome);
        }
    } else {
        console.error('Dados insuficientes para abrir episódio:', {
            agrupamentoSeries, serieSelecionadaNome, temporadaSelecionada
        });
    }
};

window.voltarParaSeries = function() {
    serieSelecionadaNome = null;
    temporadaSelecionada = null;
    episodioSelecionado = null;
    renderSeriesAgrupadas();
    renderSerieInfo();
    renderSeriePlayer();
};

window.voltarParaTemporadas = function() {
    temporadaSelecionada = null;
    episodioSelecionado = null;
    renderSeriesAgrupadas();
    renderSerieInfo();
    renderSeriePlayer();
};

// --- Inicialização adaptada ---
async function inicializarSeries() {
    console.log('Inicializando Séries...');
    const m3uUrl = localStorage.getItem('m3uUrl');
    console.log('M3U URL para séries:', m3uUrl);
    if (!m3uUrl) {
        document.getElementById('seriesCategorias').innerHTML = '<div style="padding:20px;color:#f66">Configure a URL do arquivo M3U no localStorage (chave m3uUrl).</div>';
        document.getElementById('seriesGrid').innerHTML = '';
        document.getElementById('serieInfo').textContent = '';
        document.getElementById('player_container_serie').style.display = 'none';
        return;
    }
    try {
        console.log('Carregando séries do M3U...');
        categoriasSeries = await fetchAndParseM3USeries(m3uUrl);
        window.categoriasSeries = categoriasSeries;
        agrupamentoPorCategoria = agruparSeriesPorCategoria(categoriasSeries);
        categoriaSelecionadaSerie = 0;
        serieSelecionadaNome = null;
        temporadaSelecionada = null;
        episodioSelecionado = null;
        renderSeriesAgrupadas();
        renderCategoriasSeries(); // Se quiser manter a sidebar de categorias
        renderSerieInfo();
        renderSeriePlayer(); // Chama renderSeriePlayer para ocultar o player
        if (categoriasSeries.length > 0) {
            agrupamentoSeries = agruparSeriesPorTemporada(categoriasSeries[0].series);
        }
    } catch (e) {
        console.error('Erro ao carregar séries:', e);
        document.getElementById('seriesCategorias').innerHTML = `
          <div style=\"padding:20px;color:#f66\">
            Erro ao carregar M3U: ${e.message}<br>
            Faça o login novamente e insira as configurações correta<br>
            <button id=\"btnAdicionarM3U\" style=\"margin-top:16px;padding:10px 24px;background:#6c63ff;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;\">Adicionar Lista</button>
          </div>
        `;
        document.getElementById('seriesGrid').innerHTML = '';
        document.getElementById('serieInfo').textContent = '';
        document.getElementById('player_container_serie').style.display = 'none';
        setTimeout(() => {
          const btn = document.getElementById('btnAdicionarM3U');
          if (btn) {
            btn.onclick = function() {
              const modalExistente = document.getElementById('modalAddM3U');
              if (modalExistente) modalExistente.remove();
              const modal = document.createElement('div');
              modal.id = 'modalAddM3U';
              modal.style.position = 'fixed';
              modal.style.top = 0;
              modal.style.left = 0;
              modal.style.width = '100vw';
              modal.style.height = '100vh';
              modal.style.background = 'rgba(0,0,0,0.7)';
              modal.style.zIndex = 100001;
              modal.style.display = 'flex';
              modal.style.alignItems = 'center';
              modal.style.justifyContent = 'center';
              modal.innerHTML = `
                <div style=\"background:#23232a;padding:32px 24px;border-radius:12px;min-width:320px;max-width:95vw;display:flex;flex-direction:column;align-items:center;position:relative;\">
                  <span id=\"closeModalAddM3U\" style=\"position:absolute;top:8px;right:16px;font-size:2rem;color:#fff;cursor:pointer;\">&times;</span>
                  <div style=\"display:flex;gap:12px;margin-bottom:18px;\">
                    <button id=\"abaUsuario\" style=\"padding:8px 18px;border:none;border-radius:6px 6px 0 0;font-weight:600;cursor:pointer;background:#6c63ff;color:#fff;\">Usuário</button>
                    <button id=\"abaLink\" style=\"padding:8px 18px;border:none;border-radius:6px 6px 0 0;font-weight:600;cursor:pointer;background:#23232a;color:#fff;\">Link M3U</button>
                  </div>
                  <div id=\"conteudoAbaUsuario\">
                    <input id=\"inputM3UUser\" type=\"text\" placeholder=\"Usuário\" style=\"margin-bottom:10px;padding:8px;width:220px;border-radius:6px;border:none;\">
                    <input id=\"inputM3UPass\" type=\"password\" placeholder=\"Senha\" style=\"margin-bottom:10px;padding:8px;width:220px;border-radius:6px;border:none;\">
                    <select id=\"inputM3UServer\" style=\"margin-bottom:10px;padding:8px;width:220px;border-radius:6px;border:none;\">
                      <option value=\"\">Selecione um servidor</option>
                      <option value=\"premium (Concluído)\" selected>Premium (Concluído)</option>
                      <option value=\"super-premium (manutenção)\">Super Premium (manutenção)</option>
                      <option value=\"padrao-1 (manutenção)\">Padrão 1 (manutenção)</option>
                      <option value=\"padrao-2 (manutenção)\">Padrão 2 (manutenção)</option>
                      <option value=\"outro\">Outro</option>
                    </select>
                    <input id=\"inputM3UCustom\" type=\"text\" placeholder=\"Servidor customizado\" style=\"margin-bottom:10px;padding:8px;width:220px;border-radius:6px;border:none;display:none;\">
                  </div>
                  <div id=\"conteudoAbaLink\" style=\"display:none;flex-direction:column;align-items:center;width:100%;\">
                    <input id=\"inputM3ULink\" type=\"text\" placeholder=\"Cole o link M3U completo aqui\" style=\"margin-bottom:10px;padding:8px;width:320px;max-width:90vw;border-radius:6px;border:none;\">
                  </div>
                  <button id=\"salvarM3U\" style=\"margin-top:10px;padding:10px 24px;background:#6c63ff;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;\">Salvar</button>
                </div>
              `;
              document.body.appendChild(modal);
              // Abas
              const abaUsuario = document.getElementById('abaUsuario');
              const abaLink = document.getElementById('abaLink');
              const conteudoAbaUsuario = document.getElementById('conteudoAbaUsuario');
              const conteudoAbaLink = document.getElementById('conteudoAbaLink');
              abaUsuario.onclick = function() {
                abaUsuario.style.background = '#6c63ff';
                abaUsuario.style.color = '#fff';
                abaLink.style.background = '#23232a';
                abaLink.style.color = '#fff';
                conteudoAbaUsuario.style.display = '';
                conteudoAbaLink.style.display = 'none';
              };
              abaLink.onclick = function() {
                abaUsuario.style.background = '#23232a';
                abaUsuario.style.color = '#fff';
                abaLink.style.background = '#6c63ff';
                abaLink.style.color = '#fff';
                conteudoAbaUsuario.style.display = 'none';
                conteudoAbaLink.style.display = 'flex';
              };
              // Mostrar campo customizado se selecionar "outro"
              const serverSelect = document.getElementById('inputM3UServer');
              const customInput = document.getElementById('inputM3UCustom');
              serverSelect.onchange = function() {
                if (serverSelect.value === 'outro') {
                  customInput.style.display = '';
                } else {
                  customInput.style.display = 'none';
                }
              };
              document.getElementById('closeModalAddM3U').onclick = function() {
                modal.remove();
              };
              document.getElementById('salvarM3U').onclick = function() {
                // Verifica qual aba está ativa
                if (conteudoAbaUsuario.style.display !== 'none') {
                  const username = document.getElementById('inputM3UUser').value.trim();
                  const password = document.getElementById('inputM3UPass').value.trim();
                  const serverValue = serverSelect.value;
                  let servidor = '';
                  if (serverValue === 'premium (Concluído)') servidor = 'zed5.top';
                  else if (serverValue === 'super-premium (manutenção)') servidor = 'voando66483.click';
                  else if (serverValue === 'padrao-1 (manutenção)') servidor = 'http://cdn.v766.site';
                  else if (serverValue === 'padrao-2 (manutenção)') servidor = 'http://nplaylunar.shop';
                  else if (serverValue === 'outro') servidor = customInput.value.trim();
                  if (!username || !password || !servidor) {
                    alert('Preencha todos os campos!');
                    return;
                  }
                  const m3uUrl = `http://${servidor}/get.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&type=m3u_plus&output=m3u8`;
                  localStorage.setItem('m3uUrl', m3uUrl);
                  localStorage.setItem('username', username);
                  localStorage.setItem('servidor', servidor);
                  localStorage.setItem('server', serverValue);
                } else {
                  // Aba Link M3U
                  const m3uUrl = document.getElementById('inputM3ULink').value.trim();
                  if (!m3uUrl) {
                    alert('Cole o link M3U completo!');
                    return;
                  }
                  localStorage.setItem('m3uUrl', m3uUrl);
                }
                modal.remove();
                location.reload();
              };
            };
          }
        }, 100);
    }
}

// Carregar séries automaticamente quando a página carrega
window.addEventListener('DOMContentLoaded', inicializarSeries);

window.inicializarSeries = inicializarSeries; 

// Adiciona event listener global para todos os botões 'Adicionar M3U'
document.addEventListener('click', function(e) {
  if (e.target && e.target.id === 'btnAdicionarM3U') {
    const modalExistente = document.getElementById('modalAddM3U');
    if (modalExistente) modalExistente.remove();
    const modal = document.createElement('div');
    modal.id = 'modalAddM3U';
    modal.style.position = 'fixed';
    modal.style.top = 0;
    modal.style.left = 0;
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(0,0,0,0.7)';
    modal.style.zIndex = 100001;
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.innerHTML = `
      <div style=\"background:#23232a;padding:32px 24px;border-radius:12px;min-width:320px;max-width:95vw;display:flex;flex-direction:column;align-items:center;position:relative;\">
        <span id=\"closeModalAddM3U\" style=\"position:absolute;top:8px;right:16px;font-size:2rem;color:#fff;cursor:pointer;\">&times;</span>
        <div style=\"display:flex;gap:12px;margin-bottom:18px;\">
          <button id=\"abaUsuario\" style=\"padding:8px 18px;border:none;border-radius:6px 6px 0 0;font-weight:600;cursor:pointer;background:#6c63ff;color:#fff;\">Usuário</button>
          <button id=\"abaLink\" style=\"padding:8px 18px;border:none;border-radius:6px 6px 0 0;font-weight:600;cursor:pointer;background:#23232a;color:#fff;\">Link M3U</button>
        </div>
        <div id=\"conteudoAbaUsuario\"> <input id=\"inputM3UUser\" type=\"text\" placeholder=\"Usuário\" style=\"margin-bottom:10px;padding:8px;width:220px;border-radius:6px;border:none;\"> <input id=\"inputM3UPass\" type=\"password\" placeholder=\"Senha\" style=\"margin-bottom:10px;padding:8px;width:220px;border-radius:6px;border:none;\"> <select id=\"inputM3UServer\" style=\"margin-bottom:10px;padding:8px;width:220px;border-radius:6px;border:none;\"> <option value=\"\">Selecione um servidor</option> <option value=\"premium (Concluído)\" selected>Premium (Concluído)</option> <option value=\"super-premium (manutenção)\">Super Premium (manutenção)</option> <option value=\"padrao-1 (manutenção)\">Padrão 1 (manutenção)</option> <option value=\"padrao-2 (manutenção)\">Padrão 2 (manutenção)</option> <option value=\"outro\">Outro</option> </select> <input id=\"inputM3UCustom\" type=\"text\" placeholder=\"Servidor customizado\" style=\"margin-bottom:10px;padding:8px;width:220px;border-radius:6px;border:none;display:none;\"> </div>
        <div id=\"conteudoAbaLink\" style=\"display:none;flex-direction:column;align-items:center;width:100%;\"> <input id=\"inputM3ULink\" type=\"text\" placeholder=\"Cole o link M3U completo aqui\" style=\"margin-bottom:10px;padding:8px;width:320px;max-width:90vw;border-radius:6px;border:none;\"> </div>
        <button id=\"salvarM3U\" style=\"margin-top:10px;padding:10px 24px;background:#6c63ff;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;\">Salvar</button>
      </div>
    `;
    document.body.appendChild(modal);
    // Abas
    const abaUsuario = document.getElementById('abaUsuario');
    const abaLink = document.getElementById('abaLink');
    const conteudoAbaUsuario = document.getElementById('conteudoAbaUsuario');
    const conteudoAbaLink = document.getElementById('conteudoAbaLink');
    abaUsuario.onclick = function() {
      abaUsuario.style.background = '#6c63ff';
      abaUsuario.style.color = '#fff';
      abaLink.style.background = '#23232a';
      abaLink.style.color = '#fff';
      conteudoAbaUsuario.style.display = '';
      conteudoAbaLink.style.display = 'none';
    };
    abaLink.onclick = function() {
      abaUsuario.style.background = '#23232a';
      abaUsuario.style.color = '#fff';
      abaLink.style.background = '#6c63ff';
      abaLink.style.color = '#fff';
      conteudoAbaUsuario.style.display = 'none';
      conteudoAbaLink.style.display = 'flex';
    };
    // Mostrar campo customizado se selecionar "outro"
    const serverSelect = document.getElementById('inputM3UServer');
    const customInput = document.getElementById('inputM3UCustom');
    serverSelect.onchange = function() {
      if (serverSelect.value === 'outro') {
        customInput.style.display = '';
      } else {
        customInput.style.display = 'none';
      }
    };
    document.getElementById('closeModalAddM3U').onclick = function() {
      modal.remove();
    };
    document.getElementById('salvarM3U').onclick = function() {
      // Verifica qual aba está ativa
      if (conteudoAbaUsuario.style.display !== 'none') {
        const username = document.getElementById('inputM3UUser').value.trim();
        const password = document.getElementById('inputM3UPass').value.trim();
        const serverValue = serverSelect.value;
        let servidor = '';
        if (serverValue === 'premium (Concluído)') servidor = 'zed5.top';
        else if (serverValue === 'super-premium (manutenção)') servidor = 'voando66483.click';
        else if (serverValue === 'padrao-1 (manutenção)') servidor = 'http://cdn.v766.site';
        else if (serverValue === 'padrao-2 (manutenção)') servidor = 'http://nplaylunar.shop';
        else if (serverValue === 'outro') servidor = customInput.value.trim();
        if (!username || !password || !servidor) {
          alert('Preencha todos os campos!');
          return;
        }
        const m3uUrl = `http://${servidor}/get.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&type=m3u_plus&output=m3u8`;
        localStorage.setItem('m3uUrl', m3uUrl);
        localStorage.setItem('username', username);
        localStorage.setItem('servidor', servidor);
        localStorage.setItem('server', serverValue);
      } else {
        // Aba Link M3U
        const m3uUrl = document.getElementById('inputM3ULink').value.trim();
        if (!m3uUrl) {
          alert('Cole o link M3U completo!');
          return;
        }
        localStorage.setItem('m3uUrl', m3uUrl);
      }
      modal.remove();
      location.reload();
    };
  }
}); 