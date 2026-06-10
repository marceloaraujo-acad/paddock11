/* ============================================================================
 * store.js — Camada de dados com fallback automático
 * ----------------------------------------------------------------------------
 * Por que existe: um problema que impeça o CRUD (CORS, banco expirado no free
 * tier do Render, gravação bloqueada) é SEMPRE do lado do servidor e não pode
 * ser corrigido editando o frontend. Para garantir um CRUD funcional com o
 * mesmo tema, esta camada usa a API real quando disponível e, se ela falhar,
 * alterna de forma transparente para um armazenamento local (localStorage),
 * sem perder os registros que já estavam na tela.
 *
 * LocalStore  → CRUD completo em localStorage (interface igual à do Api).
 * Store       → fachada que escolhe entre Api (remoto) e LocalStore conforme
 *               APP_CONFIG.DATA_SOURCE e o resultado das requisições.
 * ========================================================================== */

/* ----------------------------- Armazenamento local ----------------------- */
const LocalStore = (() => {
  const KEY = APP_CONFIG.STORAGE_KEY;
  let mem = null; // espelho em memória (caso o localStorage esteja bloqueado)

  // Alguns navegadores bloqueiam localStorage (modo privado): detecta uma vez.
  const persist = (() => {
    try { localStorage.setItem('__p11__', '1'); localStorage.removeItem('__p11__'); return true; }
    catch { return false; }
  })();

  function readRaw() {
    if (!persist) return mem ? [...mem] : null;
    try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : null; }
    catch { return null; }
  }
  function writeRaw(arr) {
    mem = [...arr];
    if (persist) { try { localStorage.setItem(KEY, JSON.stringify(arr)); } catch { /* cota cheia */ } }
  }
  function ensure() {
    let data = readRaw();
    if (data === null) {
      data = APP_CONFIG.SEED.map((r, i) => ({ ...r, id: String(i + 1) }));
      writeRaw(data);
    }
    return data;
  }
  function nextId(arr) {
    const ids = arr.map((r) => Number(r.id) || 0);
    return String((ids.length ? Math.max(...ids) : 0) + 1);
  }

  return {
    isPersistent: persist,

    /** Substitui o conteúdo local por uma lista de registros (migração). */
    seedFrom(records) {
      if (!records || !records.length) return ensure();
      const arr = records.map((r, i) => ({ ...r, id: String(r.id ?? r.ID ?? (i + 1)) }));
      writeRaw(arr);
      return arr;
    },

    async list() { return ensure(); },

    async create(data) {
      const arr = ensure();
      const rec = { ...data, id: nextId(arr) };
      arr.push(rec);
      writeRaw(arr);
      return rec;
    },

    async update(id, data) {
      const arr = ensure();
      const i = arr.findIndex((r) => String(r.id) === String(id));
      if (i < 0) throw new Error('Registro não encontrado no armazenamento local.');
      arr[i] = { ...arr[i], ...data, id: String(id) };
      writeRaw(arr);
      return arr[i];
    },

    async remove(id) {
      const arr = ensure();
      const next = arr.filter((r) => String(r.id) !== String(id));
      if (next.length === arr.length) throw new Error('Registro não encontrado no armazenamento local.');
      writeRaw(next);
      return true;
    },

    /** Apaga os dados locais e recoloca os exemplos. */
    reset() {
      if (persist) { try { localStorage.removeItem(KEY); } catch { /* ignore */ } }
      mem = null;
      return ensure();
    }
  };
})();

/* ------------------------------- Fachada Store --------------------------- */
const Store = (() => {
  let mode = null;     // 'remote' | 'local'
  let cache = [];      // último conjunto de registros carregado (para migração)
  let notice = null;   // aviso pendente para a interface

  const isAuto = () => APP_CONFIG.DATA_SOURCE === 'auto';

  /** Migra os dados atuais para o local e passa a operar offline. */
  function fallback(reason) {
    mode = 'local';
    LocalStore.seedFrom(cache);
    notice = reason;
  }

  return {
    ApiError: Api.ApiError,

    getMode: () => mode,
    isLocal: () => mode === 'local',

    /** Rótulo exibido na faixa de cronometragem. */
    getSourceLabel: () => (mode === 'local' ? 'local' : Api.getResource()),

    /** Retorna (e limpa) um aviso pendente, se houver. */
    takeNotice() { const n = notice; notice = null; return n; },

    /** Carrega a lista decidindo a fonte de dados conforme a configuração. */
    async load() {
      const src = APP_CONFIG.DATA_SOURCE;

      if (src === 'local') {
        mode = 'local';
        cache = await LocalStore.list();
        return { records: cache, mode };
      }

      if (src === 'remote') {
        mode = 'remote';
        const { records, switchedTo } = await Api.detectAndList();
        cache = records;
        return { records, mode, switchedTo };
      }

      // --- modo 'auto' ---
      if (mode === 'local') {              // já em fallback: permanece local
        cache = await LocalStore.list();
        return { records: cache, mode };
      }
      try {
        const { records, switchedTo } = await Api.detectAndList();
        mode = 'remote';
        cache = records;
        return { records, mode, switchedTo };
      } catch (err) {
        fallback('API indisponível — modo local ativado. Os dados ficam salvos neste navegador.');
        cache = await LocalStore.list();
        return { records: cache, mode };
      }
    },

    /** Operação de escrita com fallback automático no modo 'auto'. */
    async _write(op, args) {
      if (mode === 'local') return LocalStore[op](...args);
      try {
        return await Api[op](...args);
      } catch (err) {
        if (isAuto()) {
          fallback('A API recusou a operação — alternado para o modo local. Os dados ficam salvos neste navegador.');
          return LocalStore[op](...args);
        }
        throw err;
      }
    },

    create(data)      { return this._write('create', [data]); },
    update(id, data)  { return this._write('update', [id, data]); },
    remove(id)        { return this._write('remove', [id]); },

    /** Repõe os dados de exemplo (apenas no modo local). */
    async resetLocal() {
      LocalStore.reset();
      cache = await LocalStore.list();
      return cache;
    }
  };
})();
