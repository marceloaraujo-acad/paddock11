/* ============================================================================
 * config.js — Configuração central da aplicação
 * ----------------------------------------------------------------------------
 * Tudo que pode mudar entre ambientes/recursos fica AQUI, em um único lugar.
 * Se a API publicada expuser outro recurso (ex.: "contatos" em vez de "aluno"),
 * basta alterar RESOURCE abaixo — ou deixar que a autodetecção resolva sozinha
 * (a própria API devolve a lista de recursos disponíveis em respostas 404).
 * ========================================================================== */

const APP_CONFIG = {
  // Endereço base do backend publicado no Render.
  API_BASE: 'https://base-back-dwpz.onrender.com',

  // Recurso padrão consumido pela aplicação.
  RESOURCE: 'aluno',

  // Recursos candidatos usados na autodetecção, caso o padrão não exista.
  // A ordem define a prioridade de tentativa.
  CANDIDATE_RESOURCES: ['aluno', 'contatos', 'professor'],

  // ----------------------------------------------------------------------
  // Fonte de dados do CRUD:
  //   'auto'   → tenta a API real; se estiver indisponível OU recusar a
  //              gravação, alterna automaticamente para o armazenamento
  //              local (localStorage) sem perder o que já estava na tela.
  //   'remote' → usa exclusivamente a API publicada no Render.
  //   'local'  → descarta o backend e roda 100% no navegador (CRUD sempre
  //              funcional; ideal para demonstração/gravação do pitch).
  // ----------------------------------------------------------------------
  DATA_SOURCE: 'auto',

  // Chave usada para persistir os dados no modo local.
  STORAGE_KEY: 'paddock11.membros',

  // Dados de exemplo (modo local): a equipe começa preenchida, nunca vazia.
  SEED: [
    { nome: 'Marcelo Augusto de Araújo', email: 'marcelo@paddock11.com', celular: '11999990001', logradouro: 'Rua das Boxes, 11', bairro: 'Centro',    cidade: 'São Roque', estado: 'SP', cep: '18135300' },
    { nome: 'Helena Costa',              email: 'helena.eng@paddock11.com', celular: '11988887777', logradouro: 'Av. Telemetria, 200', bairro: 'Vila Grid', cidade: 'Barueri',   estado: 'SP', cep: '06401200' },
    { nome: 'Bruno Tavares',             email: 'bruno.box@paddock11.com',  celular: '11977776666', logradouro: 'Rua do Pit, 7',     bairro: 'Largada',   cidade: 'Sorocaba',  estado: 'SP', cep: '18045000' },
    { nome: 'Larissa Pneu',              email: 'larissa@paddock11.com',    celular: '11966665555', logradouro: 'Travessa do Grid, 3', bairro: 'Setor Box', cidade: 'Campinas',  estado: 'SP', cep: '13010000' }
  ],

  // Tempo máximo de espera por requisição (ms). O free tier do Render pode
  // hibernar e demorar a "acordar"; por isso o limite é generoso.
  TIMEOUT_MS: 45000,

  // Tentativas automáticas em caso de falha de rede (servidor acordando).
  RETRIES: 2,

  // Campos do recurso, conforme o contrato da API. A ordem é usada na renderização.
  // 'label' é o rótulo temático exibido ao usuário; 'key' é o nome real do campo.
  FIELDS: [
    { key: 'nome',        label: 'Nome',       group: 'id',   required: true  },
    { key: 'email',       label: 'E-mail',     group: 'id',   required: true  },
    { key: 'celular',     label: 'Celular',    group: 'id',   required: false },
    { key: 'logradouro',  label: 'Logradouro', group: 'base', required: false },
    { key: 'bairro',      label: 'Bairro',     group: 'base', required: false },
    { key: 'cidade',      label: 'Cidade',     group: 'base', required: false },
    { key: 'estado',      label: 'UF',         group: 'base', required: false },
    { key: 'cep',         label: 'CEP',        group: 'base', required: false }
  ]
};
