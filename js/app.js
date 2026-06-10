/* ============================================================================
 * app.js — Lógica de interface e orquestração do CRUD
 * ----------------------------------------------------------------------------
 * Liga os eventos da tela à camada Api: carrega o grid, busca/ordena, abre o
 * formulário de criação/edição, valida os dados e remove registros, sempre
 * comunicando o resultado ao usuário (toasts, banner e estados de tela).
 * ========================================================================== */

(() => {
  'use strict';

  /* ----------------------------- Atalhos de DOM ---------------------------- */
  const $ = (sel) => document.querySelector(sel);
  const el = {
    grid: $('#grid'),
    search: $('#search'),
    sort: $('#sort'),
    banner: $('#banner'),
    stateLoading: $('#stateLoading'),
    stateEmpty: $('#stateEmpty'),
    stateError: $('#stateError'),
    errorTitle: $('#errorTitle'),
    errorDetail: $('#errorDetail'),
    // timing
    timingDot: $('#timingDot'),
    timingState: $('#timingState'),
    timingResource: $('#timingResource'),
    timingCount: $('#timingCount'),
    // form
    formOverlay: $('#formOverlay'),
    form: $('#memberForm'),
    formTitle: $('#formTitle'),
    btnSubmit: $('#btnSubmit'),
    // confirm
    confirmOverlay: $('#confirmOverlay'),
    confirmText: $('#confirmText'),
    // toasts
    toasts: $('#toasts'),
    // rodapé
    btnReset: $('#btnReset')
  };

  /* ------------------------------- Estado ---------------------------------- */
  const state = {
    records: [],      // dados crus vindos da API
    query: '',        // termo de busca
    sort: 'nome',     // critério de ordenação
    pendingDelete: null
  };

  /* ------------------------------ Utilidades ------------------------------- */
  // Escapa HTML para evitar injeção ao renderizar dados da API.
  const esc = (v) =>
    String(v ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const idOf = (r) => r.id ?? r.ID ?? r.codigo ?? r._id ?? '';

  const show = (node, on = true) => { node.hidden = !on; };

  // Pega o valor de um campo do registro tolerando variações de capitalização.
  const fieldVal = (r, key) =>
    r[key] ?? r[key.toUpperCase()] ?? r[key.charAt(0).toUpperCase() + key.slice(1)] ?? '';

  /* ------------------------------- Toasts ---------------------------------- */
  function toast(message, kind = 'info') {
    const t = document.createElement('div');
    t.className = `toast toast--${kind}`;
    t.setAttribute('role', 'status');
    t.textContent = message;
    el.toasts.appendChild(t);
    requestAnimationFrame(() => t.classList.add('toast--in'));
    setTimeout(() => {
      t.classList.remove('toast--in');
      t.addEventListener('transitionend', () => t.remove(), { once: true });
    }, 3600);
  }

  /* ------------------------------- Banner ---------------------------------- */
  function banner(message, kind = 'info') {
    if (!message) { show(el.banner, false); return; }
    el.banner.className = `banner banner--${kind}`;
    el.banner.textContent = message;
    show(el.banner, true);
  }

  /* --------------------------- Faixa de cronometragem ---------------------- */
  function setTiming(stateName, kind) {
    el.timingState.textContent = stateName;
    el.timingResource.textContent = Store.getSourceLabel();
    el.timingCount.textContent = String(state.records.length);
    el.timingDot.dataset.kind = kind; // live | offline | wait | local
  }

  // Define o estado da faixa conforme a fonte de dados ativa.
  function updateTiming() {
    if (Store.getMode() === 'local') return setTiming('LOCAL', 'local');
    if (!navigator.onLine) return setTiming('OFFLINE', 'offline');
    return setTiming('LIVE', 'live');
  }

  // Mostra o botão de reposição apenas no modo local.
  function updateModeUI() {
    el.btnReset.hidden = Store.getMode() !== 'local';
  }

  /* --------------------------- Estados de tela ----------------------------- */
  function clearStates() {
    show(el.stateLoading, false);
    show(el.stateEmpty, false);
    show(el.stateError, false);
    show(el.grid, false);
  }

  /* --------------------- Busca + ordenação (em memória) -------------------- */
  function viewRecords() {
    const q = state.query.trim().toLowerCase();
    let list = state.records;

    if (q) {
      list = list.filter((r) => {
        const hay = [fieldVal(r, 'nome'), fieldVal(r, 'email'), fieldVal(r, 'cidade')]
          .join(' ').toLowerCase();
        return hay.includes(q);
      });
    }

    const byText = (a, b, key) =>
      String(fieldVal(a, key)).localeCompare(String(fieldVal(b, key)), 'pt-BR', { sensitivity: 'base' });

    const sorted = [...list];
    switch (state.sort) {
      case 'nome-desc': sorted.sort((a, b) => byText(b, a, 'nome')); break;
      case 'cidade':    sorted.sort((a, b) => byText(a, b, 'cidade')); break;
      case 'id':        sorted.sort((a, b) => Number(idOf(a)) - Number(idOf(b))); break;
      default:          sorted.sort((a, b) => byText(a, b, 'nome'));
    }
    return sorted;
  }

  /* ------------------------------ Render grid ------------------------------ */
  function cardHTML(r) {
    const id = idOf(r);
    const nome = fieldVal(r, 'nome') || 'Sem nome';
    const email = fieldVal(r, 'email');
    const celular = fieldVal(r, 'celular');
    const cidade = fieldVal(r, 'cidade');
    const uf = fieldVal(r, 'estado');
    const bairro = fieldVal(r, 'bairro');

    const local = [cidade, uf].filter(Boolean).join(' / ') || (bairro ? esc(bairro) : '—');

    return `
      <article class="card" data-id="${esc(id)}">
        <div class="card__top">
          <span class="card__num">${id !== '' ? esc(id) : '—'}</span>
          <div class="card__actions">
            <button class="icon-btn" data-act="edit" data-id="${esc(id)}" title="Editar" aria-label="Editar ${esc(nome)}">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l10-10-4-4L4 16v4Zm12.5-13.5 1-1a1.5 1.5 0 0 1 2 2l-1 1-2-2Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>
            </button>
            <button class="icon-btn icon-btn--danger" data-act="del" data-id="${esc(id)}" title="Remover" aria-label="Remover ${esc(nome)}">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M9 7V5h6v2m-9 0 1 13h10l1-13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
          </div>
        </div>
        <h3 class="card__name">${esc(nome)}</h3>
        <dl class="card__data">
          <div><dt>E-mail</dt><dd>${email ? esc(email) : '—'}</dd></div>
          <div><dt>Celular</dt><dd class="mono">${celular ? esc(celular) : '—'}</dd></div>
          <div><dt>Base</dt><dd>${local}</dd></div>
        </dl>
      </article>`;
  }

  function render() {
    clearStates();
    updateTiming();

    if (state.records.length === 0) { show(el.stateEmpty, true); return; }

    const view = viewRecords();
    if (view.length === 0) {
      show(el.grid, true);
      el.grid.innerHTML =
        `<p class="grid__none">Nenhum membro corresponde a “${esc(state.query)}”.</p>`;
      return;
    }
    show(el.grid, true);
    el.grid.innerHTML = view.map(cardHTML).join('');
  }

  /* ------------------------------ Carregar grid ---------------------------- */
  async function load() {
    clearStates();
    show(el.stateLoading, true);
    setTiming('CONECTANDO', 'wait');
    banner('');

    try {
      const result = await Store.load();
      state.records = result.records;
      render();

      if (result.switchedTo) {
        banner(`A API publicada usa o recurso “${result.switchedTo}”. O app se ajustou automaticamente.`, 'info');
      }
      const notice = Store.takeNotice();
      if (notice) banner(notice, 'info');

      updateModeUI();
    } catch (err) {
      handleLoadError(err);
      updateModeUI();
    }
  }

  function handleLoadError(err) {
    clearStates();
    setTiming('OFFLINE', 'offline');

    if (err instanceof Api.ApiError && err.type === 'resource') {
      el.errorTitle.textContent = 'Recurso não encontrado';
      el.errorDetail.textContent =
        `A API não reconhece este recurso. Disponíveis: ${err.available.join(', ')}. ` +
        `Ajuste RESOURCE em js/config.js.`;
    } else if (err instanceof Api.ApiError && (err.type === 'network' || err.type === 'timeout')) {
      el.errorTitle.textContent = 'API indisponível no momento';
      el.errorDetail.textContent = err.message;
    } else {
      el.errorTitle.textContent = 'Falha ao carregar o grid';
      el.errorDetail.textContent = (err && err.message) || 'Erro inesperado.';
    }
    show(el.stateError, true);
  }

  /* ------------------------------ Formulário ------------------------------- */
  function openForm(record = null) {
    el.form.reset();
    clearFieldErrors();
    el.form.f_id.value = record ? idOf(record) : '';
    el.formTitle.textContent = record ? 'Editar membro' : 'Novo membro';
    el.btnSubmit.textContent = record ? 'Salvar alterações' : 'Salvar membro';

    if (record) {
      APP_CONFIG.FIELDS.forEach(({ key }) => {
        const input = el.form[`f_${key}`];
        if (input) input.value = fieldVal(record, key);
      });
    }
    show(el.formOverlay, true);
    document.body.classList.add('no-scroll');
    setTimeout(() => el.form.f_nome.focus(), 50);
  }

  function closeForm() {
    show(el.formOverlay, false);
    document.body.classList.remove('no-scroll');
  }

  function clearFieldErrors() {
    el.form.querySelectorAll('.form-error').forEach((s) => (s.textContent = ''));
    el.form.querySelectorAll('.is-invalid').forEach((i) => i.classList.remove('is-invalid'));
  }

  function setFieldError(name, message) {
    const input = el.form[`f_${name}`];
    const small = el.form.querySelector(`.form-error[data-for="f_${name}"]`);
    if (input) input.classList.add('is-invalid');
    if (small) small.textContent = message;
  }

  // Validação local antes de enviar à API (regra-espelho do contrato).
  function validate(data) {
    clearFieldErrors();
    let ok = true;

    if (!data.nome || !data.nome.trim()) {
      setFieldError('nome', 'Informe o nome do membro.'); ok = false;
    }
    if (!data.email || !data.email.trim()) {
      setFieldError('email', 'Informe um e-mail.'); ok = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
      setFieldError('email', 'E-mail em formato inválido.'); ok = false;
    }
    if (data.celular && !/^\+?[\d\s()-]{8,15}$/.test(data.celular.trim())) {
      setFieldError('celular', 'Use apenas números (8 a 15 dígitos).'); ok = false;
    }
    if (data.cep && !/^\d{5}-?\d{3}$/.test(data.cep.trim())) {
      setFieldError('cep', 'CEP deve ter 8 dígitos (ex.: 18135300).'); ok = false;
    }
    return ok;
  }

  async function submitForm(event) {
    event.preventDefault();

    const data = {};
    APP_CONFIG.FIELDS.forEach(({ key }) => {
      const input = el.form[`f_${key}`];
      data[key] = input ? input.value.trim() : '';
    });
    if (data.estado) data.estado = data.estado.toUpperCase();

    if (!validate(data)) {
      toast('Confira os campos destacados.', 'error');
      return;
    }

    const id = el.form.f_id.value;
    const editing = id !== '';
    el.btnSubmit.disabled = true;
    el.btnSubmit.textContent = 'Salvando…';

    try {
      if (editing) await Store.update(id, data);
      else await Store.create(data);

      closeForm();
      toast(editing ? 'Membro atualizado.' : 'Membro adicionado ao grid.', 'success');
      await load();
    } catch (err) {
      toast(err.message || 'Não foi possível salvar.', 'error');
    } finally {
      el.btnSubmit.disabled = false;
      el.btnSubmit.textContent = editing ? 'Salvar alterações' : 'Salvar membro';
    }
  }

  /* -------------------------------- Excluir -------------------------------- */
  function askDelete(id) {
    const record = state.records.find((r) => String(idOf(r)) === String(id));
    const nome = record ? fieldVal(record, 'nome') : 'este membro';
    state.pendingDelete = id;
    el.confirmText.textContent = `Remover ${nome} do grid? Esta ação não pode ser desfeita.`;
    show(el.confirmOverlay, true);
    document.body.classList.add('no-scroll');
  }

  function closeConfirm() {
    show(el.confirmOverlay, false);
    document.body.classList.remove('no-scroll');
    state.pendingDelete = null;
  }

  async function confirmDelete() {
    const id = state.pendingDelete;
    closeConfirm();
    if (id == null) return;
    try {
      await Store.remove(id);
      toast('Membro removido.', 'success');
      await load();
    } catch (err) {
      toast(err.message || 'Não foi possível remover.', 'error');
    }
  }

  /* ------------------------------- Eventos --------------------------------- */
  function bindEvents() {
    $('#btnRefresh').addEventListener('click', load);
    $('#btnRetry').addEventListener('click', load);
    $('#btnNew').addEventListener('click', () => openForm());
    $('#btnEmptyNew').addEventListener('click', () => openForm());
    $('#btnCloseForm').addEventListener('click', closeForm);
    $('#btnCancel').addEventListener('click', closeForm);
    el.form.addEventListener('submit', submitForm);

    $('#btnConfirmNo').addEventListener('click', closeConfirm);
    $('#btnConfirmYes').addEventListener('click', confirmDelete);

    el.btnReset.addEventListener('click', async () => {
      await Store.resetLocal();
      await load();
      toast('Dados de exemplo repostos.', 'success');
    });

    // Delegação para ações dos cards.
    el.grid.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const id = btn.dataset.id;
      if (btn.dataset.act === 'edit') {
        const record = state.records.find((r) => String(idOf(r)) === String(id));
        openForm(record);
      } else if (btn.dataset.act === 'del') {
        askDelete(id);
      }
    });

    // Busca com pequeno debounce.
    let t;
    el.search.addEventListener('input', (e) => {
      clearTimeout(t);
      t = setTimeout(() => { state.query = e.target.value; render(); }, 160);
    });
    el.sort.addEventListener('change', (e) => { state.sort = e.target.value; render(); });

    // Fechar overlays com ESC ou clique no fundo.
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (!el.formOverlay.hidden) closeForm();
      if (!el.confirmOverlay.hidden) closeConfirm();
    });
    el.formOverlay.addEventListener('click', (e) => { if (e.target === el.formOverlay) closeForm(); });
    el.confirmOverlay.addEventListener('click', (e) => { if (e.target === el.confirmOverlay) closeConfirm(); });

    // Reage a mudanças de conectividade.
    window.addEventListener('online', () => setTiming('LIVE', 'live'));
    window.addEventListener('offline', () => setTiming('OFFLINE', 'offline'));
  }

  /* --------------------------------- Init ---------------------------------- */
  document.addEventListener('DOMContentLoaded', () => {
    bindEvents();
    load();
  });
})();
