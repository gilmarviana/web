

function renderPlayer() {
    const canal = categoriasCanais[categoriaSelecionadaCanal]?.canais[canalSelecionado];
    console.log('Tentando abrir canal:', canal);
    if (!canal) return;
    const container = document.getElementById('player_container');
    if (!container) {
        console.error('Container #player_container não encontrado no DOM!');
        return;
    }
    if (window.clapprPlayer) {
        window.clapprPlayer.destroy();
    }
    window.clapprPlayer = new Clappr.Player({
        source: canal.url,
        parentId: "#player_container",
        autoPlay: true,
        width: "100%",
        height: 340,
        mute: false
    });
}

// Script para carregar e exibir canais por categoria (group) a partir de M3U
async function fetchAndParseM3UCanais(m3uUrl) {
    const res = await fetch(m3uUrl);
    if (!res.ok) throw new Error('Erro ao carregar M3U');
    const text = await res.text();
    return parseM3UCanais(text);
}

function parseM3UCanais(m3uText) {
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
            // Filtro: excluir apenas grupos de filmes/séries, exceto 'CANAIS | FILMES E SERIES'
            const groupNorm = group.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
            if (
              (groupNorm.includes('filme') || groupNorm.includes('serie')) &&
              !groupNorm.includes('canais | filmes e series')
            ) {
              currentInfo = null;
              continue;
            }
            currentInfo = { nome: name, group, logo };
        } else if (currentInfo && line && !line.startsWith('#')) {
            currentInfo.url = line;
            if (!categoriasMap[currentInfo.group]) categoriasMap[currentInfo.group] = [];
            categoriasMap[currentInfo.group].push({ ...currentInfo });
            currentInfo = null;
        }
    }
    return Object.entries(categoriasMap).map(([nome, canais]) => ({ nome, canais }));
}

let categoriasCanais = [];
let categoriaSelecionadaCanal = 0;
let canalSelecionado = 0;

function renderCategoriasCanais() {
    const catDiv = document.getElementById('canaisCategorias');
    if (!categoriasCanais.length) {
        catDiv.innerHTML = '<div style="padding:20px;color:#bbb">Nenhuma categoria encontrada.</div>';
        return;
    }
    catDiv.innerHTML = '<ul>' + categoriasCanais.map((cat, idx) =>
        `<li class="${idx === categoriaSelecionadaCanal ? 'active' : ''}" onclick="selectCategoriaCanal(${idx})">${cat.nome}</li>`
    ).join('') + '</ul>';
}

function renderCanaisLista() {
    const canais = categoriasCanais[categoriaSelecionadaCanal]?.canais || [];
    const canaisDiv = document.getElementById('canaisLista');
    if (!canais.length) {
        canaisDiv.innerHTML = '<div style="padding:20px;color:#bbb">Nenhum canal nesta categoria.</div>';
        return;
    }
    canaisDiv.innerHTML = '<ul>' + canais.map((canal, idx) =>
        `<li class="${idx === canalSelecionado ? 'active' : ''}" onclick="selectCanal(${idx})">` +
        `<img src='${canal.logo || 'https://placehold.co/32x32/222/fff?text=' + encodeURIComponent(canal.nome.charAt(0))}' alt='logo' style='width:32px;height:32px;object-fit:contain;border-radius:4px;background:#fff1;margin-right:8px;'>` +
        `${canal.nome}</li>`
    ).join('') + '</ul>';
}

function renderInfoCanal() {
    const canal = categoriasCanais[categoriaSelecionadaCanal]?.canais[canalSelecionado];
    document.getElementById('channelInfo').textContent = canal ? canal.nome : '';
    document.getElementById('epgList').innerHTML = '';
}

window.selectCategoriaCanal = function(idx) {
    categoriaSelecionadaCanal = idx;
    canalSelecionado = 0;
    renderCategoriasCanais();
    renderCanaisLista();
    renderInfoCanal();
};

window.selectCanal = function(idx) {
    canalSelecionado = idx;
    renderCanaisLista();
    renderInfoCanal();
    renderPlayer();
};

async function inicializarCanais() {
    console.log('Inicializando Canais...');
    const m3uUrl = localStorage.getItem('m3uUrl');
    console.log('M3U URL:', m3uUrl);
    if (!m3uUrl) {
        document.getElementById('canaisCategorias').innerHTML = '<div style="padding:20px;color:#f66">Configure a URL do arquivo M3U no localStorage (chave m3uUrl).</div>';
        document.getElementById('canaisLista').innerHTML = '';
        document.getElementById('channelInfo').textContent = '';
        document.getElementById('epgList').innerHTML = '';
        return;
    }
    try {
        categoriasCanais = await fetchAndParseM3UCanais(m3uUrl);
        window.categoriasCanais = categoriasCanais;
        console.log('Categorias de canais carregadas:', categoriasCanais);
        categoriaSelecionadaCanal = 0;
        canalSelecionado = 0;
        renderCategoriasCanais();
        renderCanaisLista();
        renderInfoCanal();
    } catch (e) {
        console.error('Erro ao carregar canais:', e);
        document.getElementById('canaisCategorias').innerHTML = `
          <div style=\"padding:20px;color:#f66\">
            Erro ao carregar M3U: ${e.message}<br>
            Faça o login novamente e insira as configurações correta<br>
            <button id=\"btnAdicionarM3U\" style=\"margin-top:16px;padding:10px 24px;background:#6c63ff;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;\">Adicionar Lista</button>
          </div>
        `;
        document.getElementById('canaisLista').innerHTML = '';
        document.getElementById('channelInfo').textContent = '';
        document.getElementById('epgList').innerHTML = '';
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

window.addEventListener('DOMContentLoaded', inicializarCanais);
