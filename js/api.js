/* ============================================================================
 * api.js — Camada de comunicação com a API REST
 * ----------------------------------------------------------------------------
 * Responsável por todas as requisições HTTP (GET/POST/PUT/DELETE), pela
 * normalização das respostas (a API usa o envelope { status, data }) e pelo
 * tratamento padronizado de erros. Nenhuma manipulação de DOM acontece aqui.
 * ========================================================================== */

const Api = (() => {
  // Recurso "ativo" pode ser ajustado pela autodetecção (ver detectResource).
  let activeResource = APP_CONFIG.RESOURCE;

  const getResource = () => activeResource;
  const setResource = (name) => { activeResource = name; };

  /**
   * Erro estruturado para que a interface saiba exatamente o que aconteceu.
   * type: 'network' | 'http' | 'business' | 'resource' | 'timeout'
   */
  class ApiError extends Error {
    constructor(message, { type = 'http', status = null, available = null } = {}) {
      super(message);
      this.name = 'ApiError';
      this.type = type;
      this.status = status;
      this.available = available; // recursos disponíveis (quando type === 'resource')
    }
  }

  /** Monta a URL do recurso, com id opcional. */
  function buildUrl(id) {
    const base = APP_CONFIG.API_BASE.replace(/\/+$/, '');
    const path = `/${getResource()}`;
    return id != null && id !== '' ? `${base}${path}/${encodeURIComponent(id)}` : `${base}${path}`;
  }

  /** Faz o parse seguro do corpo: tenta JSON, cai para texto puro. */
  async function parseBody(response) {
    const raw = await response.text();
    if (!raw) return null;
    try { return JSON.parse(raw); }
    catch { return { __text: raw }; }
  }

  /** Extrai a lista de recursos disponíveis de uma resposta 404 da API. */
  function readAvailable(body, response) {
    let str = '';
    if (body && typeof body === 'object') {
      str = body['recursos disponiveis'] || body['recursos_disponiveis'] || '';
    }
    // A API também envia um cabeçalho "Resouces" (sic) com a lista.
    if (!str && response) str = response.headers.get('Resouces') || '';
    if (!str) return null;
    return String(str).split(/[,|]/).map((s) => s.trim()).filter(Boolean);
  }

  /**
   * Requisição central. Aplica timeout, retentativas em falha de rede e
   * converte qualquer problema em um ApiError previsível.
   */
  async function request(method, { id, body } = {}, attempt = 0) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), APP_CONFIG.TIMEOUT_MS);

    let response;
    try {
      response = await fetch(buildUrl(id), {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal
      });
    } catch (err) {
      clearTimeout(timer);
      const isTimeout = err.name === 'AbortError';
      // Falha de rede costuma significar servidor hibernando (Render free tier).
      if (!isTimeout && attempt < APP_CONFIG.RETRIES) {
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
        return request(method, { id, body }, attempt + 1);
      }
      throw new ApiError(
        isTimeout
          ? 'A API demorou demais para responder. O serviço gratuito do Render pode estar hibernando — tente novamente em alguns segundos.'
          : 'Não foi possível conectar à API. Verifique sua conexão; o servidor gratuito pode estar acordando.',
        { type: isTimeout ? 'timeout' : 'network' }
      );
    }
    clearTimeout(timer);

    const payload = await parseBody(response);

    // Recurso inexistente: a API responde com a lista de recursos válidos.
    const looksLikeResourceError =
      response.status === 404 ||
      (payload && typeof payload === 'object' &&
        typeof payload.data === 'string' && /recurso/i.test(payload.data));
    if (looksLikeResourceError) {
      const available = readAvailable(payload, response);
      if (available && available.length) {
        throw new ApiError('Recurso não encontrado na API.', {
          type: 'resource', status: response.status, available
        });
      }
    }

    // Erros HTTP gerais (400, 405, 5xx…).
    if (!response.ok) {
      const msg = (payload && payload.data) || `Erro HTTP ${response.status}.`;
      throw new ApiError(String(msg), { type: 'http', status: response.status });
    }

    // Erro "de negócio": status 200 mas envelope sinaliza erro.
    if (payload && typeof payload === 'object' && payload.status === 'error') {
      throw new ApiError(String(payload.data || 'A API retornou um erro.'), {
        type: 'business', status: response.status
      });
    }

    return payload;
  }

  /** Normaliza qualquer formato de resposta em um array de registros. */
  function toList(payload) {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.data)) return payload.data;
    if (payload && payload.data && typeof payload.data === 'object') return [payload.data];
    return [];
  }

  return {
    ApiError,
    getResource,
    setResource,

    /** Lista todos os registros do recurso. */
    async list() {
      const payload = await request('GET');
      return toList(payload);
    },

    /** Cria um novo registro. */
    create(data) {
      return request('POST', { body: data });
    },

    /** Atualiza um registro existente pelo id. */
    update(id, data) {
      return request('PUT', { id, body: { ...data, id } });
    },

    /** Remove um registro pelo id. */
    remove(id) {
      return request('DELETE', { id });
    },

    /**
     * Autodetecção de recurso: tenta o recurso atual e, se a API responder que
     * ele não existe, adota automaticamente o primeiro recurso disponível.
     * Retorna { records, switchedTo } onde switchedTo é o recurso adotado (ou null).
     */
    async detectAndList() {
      try {
        const records = await this.list();
        return { records, switchedTo: null };
      } catch (err) {
        if (err.type === 'resource' && err.available && err.available.length) {
          // Prioriza um candidato conhecido; senão, usa o primeiro disponível.
          const preferred =
            APP_CONFIG.CANDIDATE_RESOURCES.find((c) => err.available.includes(c)) ||
            err.available[0];
          setResource(preferred);
          const records = await this.list();
          return { records, switchedTo: preferred };
        }
        throw err;
      }
    }
  };
})();
