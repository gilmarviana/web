// Script para carregar e exibir filmes por categoria (group) a partir de M3U
async function fetchAndParseM3UFilmes(m3uUrl) {
    const res = await fetch(m3uUrl);
    if (!res.ok) throw new Error('Erro ao carregar M3U');
    const text = await res.text();
    return parseM3UFilmes(text);
}

function parseM3UFilmes(m3uText) {
    console.log('Iniciando parse de filmes...');
    const lines = m3uText.split(/\r?\n/);
    console.log('Total de linhas no M3U:', lines.length);
    const categoriasMap = {};
    let currentInfo = null;
    let itemCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('#EXTINF')) {
            const groupMatch = line.match(/group-title="([^"]+)"/);
            const nameMatch = line.match(/tvg-name="([^"]+)"/);
            const logoMatch = line.match(/tvg-logo="([^"]+)"/);
            const name = nameMatch ? nameMatch[1] : line.split(',').pop().trim();
            const group = groupMatch ? groupMatch[1] : 'Outros';
            const logo = logoMatch ? logoMatch[1] : '';
            // Filtrar todos exceto Canais e Séries, mas incluir "CANAIS | FILMES E SERIES"
            if ((group.toLowerCase().includes('canais') || group.toLowerCase().includes('séries')) && 
                !group.includes('FILMES E SERIES')) {
                currentInfo = null;
                continue;
            }
            currentInfo = { nome: name, group, logo };
            console.log('Encontrado item de filmes:', name, 'do grupo:', group);
        } else if (currentInfo && line && !line.startsWith('#')) {
            currentInfo.url = line;
            // Aceitar qualquer URL para séries
            if (!categoriasMap[currentInfo.group]) categoriasMap[currentInfo.group] = [];
            categoriasMap[currentInfo.group].push({ ...currentInfo });
            currentInfo = null;
        }
    }
    
    console.log('Total de itens processados:', itemCount);
    console.log('Categorias encontradas:', Object.keys(categoriasMap));
    
    // Retorna todas as categorias
    return Object.entries(categoriasMap)
        .map(([nome, filmes]) => ({ nome, filmes }));
}

let categoriasFilmes = [];
let categoriaSelecionadaFilme = 0;
let filmeSelecionado = 0;

function renderCategorias() {
    const catDiv = document.getElementById('filmesCategorias');
    if (!categoriasFilmes.length) {
        catDiv.innerHTML = '<div style="padding:20px;color:#bbb">Nenhuma categoria encontrada.</div>';
        return;
    }
    catDiv.innerHTML = '<ul>' + categoriasFilmes.map((cat, idx) =>
        `<li class="${idx === categoriaSelecionadaFilme ? 'active' : ''}" onclick="selectCategoria(${idx})">${cat.nome}</li>`
    ).join('') + '</ul>';
}

function renderFilmesGrid() {
    const filmes = categoriasFilmes[categoriaSelecionadaFilme]?.filmes || [];
    const grid = document.getElementById('filmesGrid');
    if (!filmes.length) {
        grid.innerHTML = '<div style="padding:20px;color:#bbb">Nenhum filme nesta categoria.</div>';
        return;
    }
    grid.innerHTML = '<div class="cards-container">' + filmes.map((filme, idx) =>
        `<div class="card-filme${(filmeSelecionado === idx ? ' active' : '')}" onclick="selectFilme(${idx})">
            <img src="${filme.logo || 'https://placehold.co/160x220/222/fff?text=' + encodeURIComponent(filme.nome.charAt(0))}" alt="${filme.nome}" class="card-capa">
            <div class="card-titulo">${filme.nome}</div>
        </div>`
    ).join('') + '</div>';
}

function renderInfoFilme() {
    const filme = categoriasFilmes[categoriaSelecionadaFilme]?.filmes[filmeSelecionado];
    const infoDiv = document.getElementById('filmeInfo');
    if (infoDiv) infoDiv.textContent = filme ? filme.nome : '';
}

function abrirModalPlayerFilme(url, titulo) {
    // Removido alerta de debug
    const modal = document.getElementById('modalPlayer');
    const container = document.getElementById('modalPlayerContainer');
    const titleDiv = document.getElementById('modalPlayerTitle');
    
    if (!modal) {
        console.error('Modal não encontrado!');
        return;
    }
    
    if (!container) {
        console.error('Container do player não encontrado!');
        return;
    }
    
    if (typeof Clappr === 'undefined') {
        console.error('Biblioteca Clappr não carregada!');
        return;
    }
    
    modal.style.display = 'flex';
    container.innerHTML = '';
    if (titleDiv) titleDiv.textContent = titulo || '';
    
    if (window.clapprPlayer) {
        console.log('Destruindo player anterior...');
        window.clapprPlayer.destroy();
    }
    
    console.log('Criando novo player...');
    try {
        window.clapprPlayer = new Clappr.Player({
            source: url,
            parentId: "#modalPlayerContainer",
            autoPlay: true,
            width: "100%",
            height: "100%",
            mute: false,
            hideControls: true
        });
        console.log('Modal aberto com sucesso!');
    } catch (error) {
        console.error('Erro ao criar player:', error);
    }
}

function fecharModalPlayer() {
    console.log('fecharModalPlayer chamado');
    var modal = document.getElementById('modalPlayer');
    if (modal) modal.style.display = 'none';
    if (window.clapprPlayer) window.clapprPlayer.destroy();
}
window.fecharModalPlayer = fecharModalPlayer;

// Garante que o modal está oculto ao inicializar os filmes
window.addEventListener('DOMContentLoaded', function() {
    var modal = document.getElementById('modalPlayer');
    if (modal) modal.style.display = 'none';
    if (window.clapprPlayer) window.clapprPlayer.destroy();
});

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

window.selectCategoria = function(idx) {
    categoriaSelecionadaFilme = idx;
    filmeSelecionado = -1; // Nenhum selecionado
    renderCategorias();
    renderFilmesGrid();
    renderInfoFilme();
};

window.selectFilme = function(idx) {
    console.log('Filme selecionado:', idx);
    filmeSelecionado = idx;
    renderFilmesGrid();
    renderInfoFilme();
    
    // Abrir novo modal do player quando um filme é selecionado
    const filme = categoriasFilmes[categoriaSelecionadaFilme]?.filmes[idx];
    console.log('Filme encontrado:', filme);
    if (filme && filme.url) {
        console.log('Abrindo novo modal para filme:', filme.nome);
        exibirNovoModalPlayer(filme.url, filme.nome);
    } else {
        console.error('Filme não encontrado ou sem URL:', filme);
    }
};

async function inicializarFilmes() {
    console.log('Inicializando Filmes...');
    const m3uUrl = localStorage.getItem('m3uUrl');
    console.log('M3U URL para filmes:', m3uUrl);
    if (!m3uUrl) {
        document.getElementById('filmesCategorias').innerHTML = '<div style="padding:20px;color:#f66">Configure a URL do arquivo M3U no localStorage (chave m3uUrl).</div>';
        document.getElementById('filmesGrid').innerHTML = '';
        if (document.getElementById('filmeInfo')) document.getElementById('filmeInfo').textContent = '';
        document.getElementById('player_container_filme').style.display = 'none';
        return;
    }
    try {
        console.log('Carregando filmes do M3U...');
        categoriasFilmes = await fetchAndParseM3UFilmes(m3uUrl);
        window.categoriasFilmes = categoriasFilmes;
        console.log('Categorias de filmes encontradas:', categoriasFilmes.length);
        console.log('Categorias:', categoriasFilmes);
        categoriaSelecionadaFilme = 0;
        filmeSelecionado = -1; // Nenhum filme selecionado ao iniciar
        renderCategorias();
        renderFilmesGrid();
        renderInfoFilme();
        // renderPlayer(); // Removido
    } catch (e) {
        console.error('Erro ao carregar filmes:', e);
        document.getElementById('filmesCategorias').innerHTML = `
          <div style="padding:20px;color:#f66">
            Erro ao carregar M3U: ${e.message}<br>
            Faça o login novamente e insira as configurações correta<br>
            <button id="btnAdicionarM3U" style="margin-top:16px;padding:10px 24px;background:#6c63ff;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;">Adicionar Lista</button>
          </div>
        `;
        document.getElementById('filmesGrid').innerHTML = '';
        if (document.getElementById('filmeInfo')) document.getElementById('filmeInfo').textContent = '';
        document.getElementById('player_container_filme').style.display = 'none';
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
                <div style="background:#23232a;padding:32px 24px;border-radius:12px;min-width:320px;max-width:95vw;display:flex;flex-direction:column;align-items:center;position:relative;">
                  <span id="closeModalAddM3U" style="position:absolute;top:8px;right:16px;font-size:2rem;color:#fff;cursor:pointer;">&times;</span>
                  <div style="display:flex;gap:12px;margin-bottom:18px;">
                    <button id="abaUsuario" style="padding:8px 18px;border:none;border-radius:6px 6px 0 0;font-weight:600;cursor:pointer;background:#6c63ff;color:#fff;">Usuário</button>
                    <button id="abaLink" style="padding:8px 18px;border:none;border-radius:6px 6px 0 0;font-weight:600;cursor:pointer;background:#23232a;color:#fff;">Link M3U</button>
                  </div>
                  <div id="conteudoAbaUsuario">
                    <input id="inputM3UUser" type="text" placeholder="Usuário" style="margin-bottom:10px;padding:8px;width:220px;border-radius:6px;border:none;">
                    <input id="inputM3UPass" type="password" placeholder="Senha" style="margin-bottom:10px;padding:8px;width:220px;border-radius:6px;border:none;">
                    <select id="inputM3UServer" style="margin-bottom:10px;padding:8px;width:220px;border-radius:6px;border:none;">
                      <option value="">Selecione um servidor</option>
                      <option value="premium (Concluído)" selected>Premium (Concluído)</option>
                      <option value="super-premium (manutenção)">Super Premium (manutenção)</option>
                      <option value="padrao-1 (manutenção)">Padrão 1 (manutenção)</option>
                      <option value="padrao-2 (manutenção)">Padrão 2 (manutenção)</option>
                      <option value="outro">Outro</option>
                    </select>
                    <input id="inputM3UCustom" type="text" placeholder="Servidor customizado" style="margin-bottom:10px;padding:8px;width:220px;border-radius:6px;border:none;display:none;">
                  </div>
                  <div id="conteudoAbaLink" style="display:none;flex-direction:column;align-items:center;width:100%;">
                    <input id="inputM3ULink" type="text" placeholder="Cole o link M3U completo aqui" style="margin-bottom:10px;padding:8px;width:320px;max-width:90vw;border-radius:6px;border:none;">
                  </div>
                  <button id="salvarM3U" style="margin-top:10px;padding:10px 24px;background:#6c63ff;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;">Salvar</button>
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

// Carregar filmes automaticamente quando a página carrega
window.addEventListener('DOMContentLoaded', inicializarFilmes);

// Função de teste para verificar se o modal funciona
window.testarModal = function() {
    console.log('Testando modal...');
    abrirModalPlayerFilme('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', 'Teste de Modal');
};

window.inicializarFilmes = inicializarFilmes; 

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