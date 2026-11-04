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

## Fases

**Agora:** entrada de contexto, continuidade geral e Marco Zero público. Não alterar `src/`, `shared/`, scripts, CI, deployments, dados nem código de aplicativos.

**Depois, por autorização própria:** iniciar um contexto específico na Estrutura Curricular, revalidando código, PR/CI, documentação e o estado Google. Registrar Marco Zero próprio, STATUS único e um teste a frio. Incorporar outros contextos gradualmente.

**Manifesto verificável:** `context.config.json` só será criado quando existir **ao menos um app com contexto local completo**. O verificador requer uma lista não vazia de apps e seus arquivos reais. Criar configurações vazias ou fictícias nesta fase produziria falso sinal de conformidade. Por isso o manifesto **não foi criado**, deliberadamente.

## Atualização sem burocracia

Somente em marcos materiais: mudança de decisão, contrato, risco, PR, homologação ou implantação. Registre evidências e atualize o documento afetado; índices só quando necessário; STATUS do app **por último** e só quando o estado mudar. Uma consulta sem alteração não gera commit. Respeitar [fluxo de PR](../governanca/FLUXO_DE_MUDANCAS.md); sem autorização de escrita, devolver `REGISTRO_PENDENTE`.
