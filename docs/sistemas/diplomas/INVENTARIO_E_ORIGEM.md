# Inventário de código — pacote recebido

**Origem:** `Codigos.zip`, pasta interna `Nova pasta/`, 23/10/2026. São **17 arquivos**; 16 relacionados à operação/análise mais 1 suíte extensa de testes. Fonte não anexada ao Git público nesta rodada. Nenhum arquivo de manifesto, configuração clasp ou planilha foi entregue.

| Arquivo | Responsabilidade constatada |
|---|---|
| `DiplomasBackend.gs` | `doGet`, cabeçalhos, registros, etapas, concorrência, pastas, upload, comunicações, documentos, lote |
| `DiplomasApp.html` | UI principal, seleção de colação, listas/filtros, modal, edição e etapas |
| `DiplomasAjuda.html` | Conteúdo da Central de Ajuda |
| `DiplomasAjudaEstilos.html` | CSS da ajuda |
| `DiplomasAjudaUI.html` | Busca, navegação, ESC/foco e controles de ajuda |
| `HistoricoAnaliseEstilos.html` | CSS do módulo de análise |
| `HistoricoAnaliseUI.html` | UI de análise individual/lote, sessões e relatórios |
| `HistoricoArquivo.gs` | Localização do PDF na pasta validada, MIME/tamanho e SHA-256 |
| `HistoricoAuditoria.gs` | Auditoria append-only e migração manual de coluna de sessão |
| `HistoricoConfig.gs` | Abas, habilitações, versões e dependência PDF.js |
| `HistoricoConsulta.gs` | Leitura de análises antigas, agrupamento por sessão, sem reanalisar |
| `HistoricoEndpoints.gs` | Endpoints, vínculo do PDF, token HMAC, avaliação e auditoria |
| `HistoricoMotor.gs` | Avaliação de créditos, semestres, disciplinas, grupos, reconciliação |
| `HistoricoParser.html` | Leitura client-side PDF.js de texto selecionável |
| `HistoricoRegrasRepository.gs` | Seleção/guarda dos rulesets e leitura das regras por cabeçalhos |
| `HistoricoRelatorio.gs` | PDF individual versionado e consolidado de lote |
| `HistoricoTestes.gs` | `rodarTestesHistorico` e muitos testes com fixtures; execução manual Apps Script |

## Integração técnica

`DiplomasApp` inclui `HistoricoParser`, `HistoricoAnaliseUI` e módulos de ajuda. A UI comunica-se por `google.script.run`. O backend de histórico reutiliza `resolverRegistroPorId_`, `exigirVersaoAtual_` e validação de pasta já existentes em `DiplomasBackend`. O motor e o repositório de regras são separados. A consulta de sessões reconstrói os resultados da auditoria sem recalcular regras.

## Migrações já presentes — não confundir

- `migrarParaRegistroId_`: no `doGet`, cria/normaliza Registro ID e Versão **na mesma planilha** quando necessário; possui checagem idempotente e lock.
- `migrarAnaliseHistoricoRelatoriosV1`: função administrativa manual para garantir coluna `sessao_analise_id` em `ANALISE_HISTORICO`; não preenche linhas antigas.
- **Não foi encontrado** entre os 17 arquivos um script de migração de respostas legadas do Google Forms para a base Diplomas.

## Preflight obrigatório antes de publicar fonte

1. Substituir IDs fixos de pasta, modelos, planilha central de alunos e regras curriculares por chaves de configuração, sem registrar valores.
2. Validar o manifesto real, ambiente Google, modelo de permissão/execução e autorização dos endpoints públicos.
3. Avaliar exposição da migração pública de esquema e escrita iniciada no `doGet`.
4. Criar baseline de testes e fixtures inventadas, inclusive segurança de leitura e gravação.
5. Criar `sistemas/diplomas/src/`, `.claspignore` e documentação de instalação somente após sanitização aprovada.
6. Registrar que código recebido ≠ versão seguramente implantada.

**Nenhum código original, ID, arquivo pessoal ou screenshot do ambiente institucional foi commitado nesta incorporação documental.**
