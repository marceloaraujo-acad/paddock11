PADDOCK 11 

Registro de Equipe de Fórmula 1 

Projeto Frontend · Consumo de API REST · JavaScript puro (Vanilla JS) 

1. Descrição do projeto 

PADDOCK 11 é uma aplicação web de página única que gerencia o registro da equipe de um time de Fórmula 1 - pilotos, engenheiros e integrantes do box. Cada membro é um registro com nome, contato e a base (endereço) de onde opera. 

A interface consome em tempo real a API REST publicada no Render e permite as operações completas de um CRUD (criar, listar, editar e remover), com busca, ordenação e tratamento de erros. O backend é genérico e didático, criado pelo prof. Fernando Leonid; a temática de Fórmula 1 é a camada de apresentação dada ao recurso. 

2. Objetivo 

Desenvolver uma interface web funcional, responsiva e com boa experiência de uso, consumindo de forma real os endpoints do backend e permitindo ao usuário executar todas as operações previstas no contrato da API, utilizando exclusivamente HTML, CSS e JavaScript puro, sem frameworks de frontend. 

3. Tecnologias utilizadas 

Tecnologia 

Aplicação no projeto 

HTML5 semântico 

Estrutura da página, formulários e diálogos (modais) acessíveis. 

CSS3 

Identidade visual "Carbono & Brasa", layout responsivo (Grid/Flexbox), animações e foco visível. 

JavaScript (ES6+) 

Lógica de interface, consumo da API via Fetch e manipulação do DOM, sem bibliotecas. 

Fetch API 

Requisições HTTP assíncronas (GET, POST, PUT, DELETE) com async/await. 

localStorage 

Persistência local no modo offline/fallback, garantindo um CRUD sempre funcional. 

Google Fonts 

Saira Condensed (títulos), Inter (corpo) e Space Mono (dados/cronometragem). 

 

4. Funcionalidades implementadas 

Listagem dos membros consumindo a API real (método GET), exibidos em cards. 

Cadastro de novo membro (POST) por meio de formulário com validação. 

Edição de membro existente (PUT), reaproveitando o mesmo formulário. 

Remoção de membro (DELETE) com diálogo de confirmação. 

Busca instantânea por nome, e-mail ou cidade (filtragem em memória, com debounce). 

Ordenação por nome (A–Z / Z–A), cidade ou número de inscrição. 

Validação local dos campos (nome e e-mail obrigatórios, formato de e-mail, celular e CEP). 

Tratamento de erros de requisição: falha de rede, timeout, recurso inexistente e erros HTTP, com mensagens claras, banner e toasts. 

Autodetecção de recurso: se a API publicada expuser outro recurso, o app se ajusta automaticamente lendo a lista de recursos disponíveis devolvida pela própria API. 

Fonte de dados resiliente (auto / remote / local): usa a API real quando disponível e, se ela falhar ou recusar a gravação, alterna sozinha para um armazenamento local — garantindo um CRUD sempre funcional, com o mesmo tema. 

Reposição de dados de exemplo com um clique quando em modo local. 

Estados de tela dedicados: carregando, grid vazio e erro (com botão de nova tentativa). 

Responsividade total (desktop ao mobile) e respeito a prefers-reduced-motion. 

5. Contrato da API consumida 

Base: https://base-back-dwpz.onrender.com 

Todas as respostas seguem o envelope { "status": "...", "data": ... }. Endpoints do recurso (ex.: aluno): 

Método 

Rota 

Operação 

Resposta de sucesso 

GET 

/{recurso} 

Listar registros 

200 — { status, data: [ ... ] } 

POST 

/{recurso} 

Criar registro 

201 — { status: "success", data: "Cadastro realizado" } 

PUT 

/{recurso}/{id} 

Atualizar registro 

200 — { status: "success" } 

DELETE 

/{recurso}/{id} 

Remover registro 

200 — { status: "success" } 

 

Erros padronizados: 

400 — faltam dados para cadastrar. 

404 — recurso não encontrado (a resposta inclui os recursos disponíveis). 

405 — método não permitido. 

Campos do recurso: id, nome, email, celular, logradouro, bairro, cidade, estado, cep. 

6. Como executar localmente 

O projeto é estático — não há build nem dependências a instalar. 

Opção A — abrir diretamente: 

Clone ou baixe este repositório. 

Abra o arquivo index.html no navegador (clique duplo). 

Opção B — servidor local (recomendado, evita restrições de CORS/arquivos): 

Abra a pasta do projeto no VS Code e use a extensão Live Server ("Open with Live Server"). 

Ou, pelo terminal, execute: python -m http.server 5500 

Acesse http://localhost:5500 no navegador. 

Observação: na primeira requisição a API pode demorar a responder, pois o serviço gratuito do Render hiberna quando ocioso. A aplicação aguarda e tenta novamente automaticamente. 

Fonte de dados (config.js): 

Há um ajuste `DATA_SOURCE` em `js/config.js` que controla de onde vêm os dados: 

auto (padrão) — tenta a API real; se ela estiver indisponível ou recusar a gravação, alterna automaticamente para o armazenamento local sem perder o que está na tela. 

remote — usa exclusivamente a API publicada no Render. 

local — descarta o backend e roda o CRUD inteiramente no navegador (ideal para demonstrar/gravar o pitch com garantia de funcionamento). 

7. Deploy e vídeo pitch 

Deploy (GitHub Pages): [adicionar link após a publicação] 

Vídeo pitch: [adicionar link do vídeo] 

Sugestão de formato Markdown para o README final: 

## Deploy 

🔗 [Acessar no GitHub Pages](URL_DO_DEPLOY) 

  

## Vídeo pitch 

🎬 [Assistir ao pitch](URL_DO_VIDEO) 

8. Estrutura básica do projeto 

paddock-11/ 

├── index.html          # Estrutura da página e diálogos 

├── css/ 

│   └── style.css       # Identidade visual e responsividade 

├── js/ 

│   ├── config.js       # Configuração (API, recurso, fonte de dados, seed) 

│   ├── api.js          # Camada de comunicação com a API + erros 

│   ├── store.js        # Fonte de dados (remoto/local) com fallback 

│   └── app.js          # Lógica de interface e orquestração do CRUD 

└── README.md           # Documentação do projeto 

 

9. Decisões técnicas relevantes 

Separação de responsabilidades em três arquivos JS: config.js (o que muda entre ambientes), api.js (rede e tratamento de erros, sem DOM) e app.js (interface). Facilita leitura e manutenção. 

JavaScript puro sem módulos ES (scripts clássicos carregados em ordem): garante que o projeto funcione tanto abrindo o arquivo localmente quanto via servidor/GitHub Pages. 

Camada de API tolerante a formatos: normaliza tanto respostas em array quanto no envelope { status, data }, e converte qualquer falha em um erro previsível para a interface. 

Autodetecção de recurso: como a API é genérica, o recurso é configurável em um único ponto e o app se autocorrige usando a lista de recursos que a própria API retorna em respostas de erro 404 — transformando o tratamento de erro em um recurso de robustez. 

Resiliência ao Render free tier: timeout generoso e retentativas automáticas, já que o servidor hiberna quando ocioso. 

Camada de dados desacoplada (store.js): um problema que impeça a gravação (CORS, banco expirado no free tier, escrita bloqueada) é sempre do lado do servidor e não pode ser corrigido pelo frontend. Por isso a fonte de dados é abstraída: a API real é usada quando funciona e um armazenamento local assume de forma transparente quando ela falha, mantendo o CRUD e o tema sempre funcionais. 

Segurança na renderização: todo dado vindo da API é escapado antes de ir ao HTML, evitando injeção (XSS). 

Acessibilidade e UX: foco visível, navegação por teclado (ESC fecha modais), aria-live para status, estados de carregamento/vazio/erro e respeito a movimento reduzido. 

Identidade visual própria ("Carbono & Brasa") com tipografia condensada e uma faixa de cronometragem (pit-wall) que mostra o status da conexão e o total de registros — elemento de assinatura coerente com a temática. 

10. Autor 

Marcelo Augusto de Araújo 

Projeto acadêmico de Frontend - consumo de API REST. 
