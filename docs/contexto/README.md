# Contexto geral do GRADIP

**Objetivo:** permitir que qualquer IA, recebendo apenas este repositório, encontre o sistema, seus contratos, evidências e regras de trabalho, mesmo sem a conversa anterior. A camada geral **roteia**, não concentra STATUS dos aplicativos.

## Fontes canônicas

| Tema | Onde consultar |
| --- | --- |
| Instruções obrigatórias e segurança de agentes | [AGENTS](../../AGENTS.md) → [CLAUDE](../../CLAUDE.md) |
| Catálogo único e descoberta | [START_HERE](../../START_HERE.md) → [SISTEMAS](../SISTEMAS.md) |
| Arquitetura, vínculos entre sistemas e chaves lógicas | [ARQUITETURA_GERAL](../ARQUITETURA_GERAL.md), [continuidade e legado](../arquitetura/GUIA_DE_CONTINUIDADE_E_LEGADO.md) |
| Código, regras e estado de cada aplicação | [sistemas/](../../sistemas/), [docs/sistemas](../sistemas/README.md); fonte e estado Google são coisas diferentes |
| PRs, CI, homologação, release, clasp e deploy | [governança](../governanca/FLUXO_DE_MUDANCAS.md), [CI](../CI.md), [implantação](../IMPLANTACAO.md) |
| Classificação e sigilo | [segurança pública](../seguranca/REPOSITORIO_PUBLICO.md), [classificação](../seguranca/CLASSIFICACAO_DE_DADOS.md) |
| Roteiro de retomada entre IAs | [CONTINUIDADE](CONTINUIDADE.md) |
| Fotografia da preparação | [MARCO_ZERO](MARCO_ZERO.md) — **não** é STATUS vigente |

## Como não perder a continuidade

- Uma entrada geral identifica o sistema; **cada app deve possuir seu próprio** STATUS, CONTINUIDADE, decisões, rodadas, evidências e pendências **depois de adotado individualmente**.
- O catálogo oficial continua em `docs/SISTEMAS.md` e os contratos em `docs/ARQUITETURA_GERAL.md`; não criar cópias concorrentes nesta pasta.
- "Sistema" pode agrupar mais de um **projeto Apps Script**, com códigos e implantações diferentes. A fronteira dos futuros contextos deve ser definida por responsabilidades e ciclo de manutenção **verificados**, não apenas pela quantidade de pastas.
- Os sistemas são independentes, mas compartilham dados e componentes. Mudanças de contrato requerem verificar produtores e consumidores; um STATUS local não autoriza alterações nos demais.
- Históricos externos ou privados não são dependência operacional nem autorização. A fonte pública precisa ser autossuficiente para a retomada e nunca receber dados institucionais reais.
- **Transição e corte de autoridade.** Até haver decisão humana expressa de corte de autoridade, os registros externos de continuidade anteriores a esta estrutura são **fontes históricas**, não um segundo STATUS operacional concorrente. Divergência entre eles e o contexto deste repositório é registrada como achado e reconciliada com evidência, sem presumir qual lado está certo. O responsável decidiu o corte em 04/11/2026, condicionado ao teste a frio da Estrutura, que passou ([EC-ROD-20261104-006](../../sistemas/estrutura-curricular/contexto/rodadas/EC-ROD-20261104-006.md)): o acervo anterior deixa de ser referência e fica congelado como histórico, sem novas entradas. Isso não quer dizer que ele foi migrado por inteiro: o que foi usado está mapeado neste repositório, e os originais não vieram para cá.

## Fases

**Etapa de instalação (só documentação, PRs #33 e #34):** entrada de contexto, continuidade geral e Marco Zero público. **Nesta etapa** não se alteram `src/`, `shared/`, scripts, CI, deployments, dados nem código de aplicativos. A restrição vale só para estes PRs de contexto: o desenvolvimento dos aplicativos continua pelo [fluxo de mudanças](../governanca/FLUXO_DE_MUDANCAS.md), com as autorizações próprias de cada mudança.

**Contexto local da Estrutura Curricular:** primeiro contexto local, `ADOTADO` desde a rodada `EC-ROD-20261104-006`, a partir das [instruções da Estrutura](../../sistemas/estrutura-curricular/AGENTS.md), com Marco Zero, STATUS e teste a frio independentes.

**Gerenciador de Abertura de Habilitações:** segundo contexto local, em `PROPOSTA`, a partir das [instruções do gerenciador](../../sistemas/abertura-habilitacoes/gerenciador/AGENTS.md). O formulário Google Forms dos alunos é externo e não está sendo adotado. A entrada no manifesto indica apenas que a estrutura proposta **existe**, não que recebeu revisão independente, teste a frio ou corte de autoridade. Os demais aplicativos são incorporados gradualmente.

**Manifesto verificável:** o `context.config.json`, na raiz, lista os aplicativos com contexto local (hoje só a Estrutura Curricular) e os caminhos dos arquivos de cada um. Ele foi criado quando a Estrutura Curricular entrou no `main`. O Gerenciador de Abertura de Habilitações entra na mesma alteração que cria seus documentos locais, **ainda como `PROPOSTA`**. Novos aplicativos entram somente com seus arquivos reais, sem entradas fictícias. O verificador estrutural não fica no repositório: quem tem acesso a ele o roda e anexa a saída ao PR. Um verificador verde não prova veracidade, autoridade nem implantação.

## Proveniência das decisões transversais

Antes desta estrutura, decisões que valem para todo o GRADIP foram registradas num acervo externo de acesso restrito. O mapa abaixo diz onde cada uma tem expressão pública canônica. Os identificadores são só referência de proveniência: o texto original não é transcrito e não é fonte obrigatória para trabalhar aqui. Contextos locais (como o da Estrutura Curricular) apontam para esta tabela em vez de copiá-la.

| Identificador histórico | Assunto | Expressão pública canônica |
| --- | --- | --- |
| `GRADIP-DEC-001` | Plataforma institucional | [ADR-001](../arquitetura/ADR-001_ESCOLHA_DA_PLATAFORMA_INSTITUCIONAL.md) e a seção "Por que Google Sheets e Google Apps Script?" do [README](../../README.md) |
| `GRADIP-DEC-002` | Governança, PR, CI e implantação | [Fluxo de mudanças](../governanca/FLUXO_DE_MUDANCAS.md), [proteção do main](../governanca/PROTECAO_DO_MAIN.md), [implantação](../IMPLANTACAO.md) e [CLAUDE.md](../../CLAUDE.md) |
| `GRADIP-DEC-003` | Desempenho e refatorações | Parcial: [ADR-001](../arquitetura/ADR-001_ESCOLHA_DA_PLATAFORMA_INSTITUCIONAL.md) §4 (limitações e desempenho), [guia de continuidade](../arquitetura/GUIA_DE_CONTINUIDADE_E_LEGADO.md) §3 (projetos independentes) e §6 (medir antes de concluir) e a fronteira do [START_HERE](../../START_HERE.md) (sem autorização para unificar backends). Orientação do responsável, sem benchmark: não fundir projetos só para reduzir implantações; refatoração ampla só com motivo concreto (defeito, modernização de legado ou gargalo medido) |
| `GRADIP-DEC-004` | Confidencialidade, publicidade e dados | [Repositório público](../seguranca/REPOSITORIO_PUBLICO.md), [classificação de dados](../seguranca/CLASSIFICACAO_DE_DADOS.md) e as regras de segurança do [CLAUDE.md](../../CLAUDE.md). Uma parte é de escopo restrito e não é reproduzida |
| `GRADIP-DEC-005` | Backup de continuidade no acervo externo | Escopo histórico restrito. Aqui vale a regra de transição acima: fonte histórica, congelada desde o corte de autoridade de 04/11/2026 |
| `GRADIP-DEC-006` | Atualização do acervo externo por marcos | Escopo histórico restrito. Neste repositório vale a "Atualização sem burocracia" abaixo, sempre por PR; a iniciativa de commit dada naquele acervo **não** se estende a este repositório |
| `GRADIP-ROD-20261022-003` | Instalação do acervo de continuidade | Escopo histórico restrito; origem da `GRADIP-DEC-005` |

## Atualização sem burocracia

Somente em marcos materiais: mudança de decisão, contrato, risco, PR, homologação ou implantação. Registre evidências e atualize o documento afetado; índices só quando necessário; STATUS do app **por último** e só quando o estado mudar. Uma consulta sem alteração não gera commit. Respeitar [fluxo de PR](../governanca/FLUXO_DE_MUDANCAS.md); sem autorização de escrita, devolver `REGISTRO_PENDENTE`.
