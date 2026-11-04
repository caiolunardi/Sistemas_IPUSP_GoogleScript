# Estrutura Curricular — sistema de continuidade de contexto

- **Sistema:** `estrutura-curricular`
- **Protocolo:** `context/v1`
- **Estado da adoção:** `PILOTO`
- **Corte:** `2026-11-04`

## Por que este sistema tem memória de IA

O aplicativo possui regras curriculares, importadores, rotinas de escrita/recuperação, perfis e scripts de planilha relacionados. Sem memória local, uma IA nova pode confundir código versionado com versão implantada, reabrir problemas resolvidos ou ignorar decisões e testes de integridade acadêmica. A finalidade é permitir **retomada verificável por qualquer agente, sem depender de uma conversa anterior**.

## Marco Zero

O [MARCO_ZERO.md](MARCO_ZERO.md) fixa o HEAD inspecionado, a proveniência, as lacunas e a transição entre acervo histórico e continuidade prospectiva. **O histórico anterior não é reconstituído integralmente nem reclassificado como prova.** A [matriz histórica](HISTORICO_E_PROVENIENCIA.md) relaciona registros anteriores às fontes públicas disponíveis, sem copiar originais privados. O primeiro registro prospectivo é [EC-ROD-20261104-001](rodadas/EC-ROD-20261104-001.md).

## Como foi concebida

A documentação técnica e as auditorias públicas já cobrem código, segurança, homologação, contratos e histórico de versões. Em vez de criar um segundo manual ou duplicar os últimos estados de outros aplicativos, adotou-se:
- `STATUS.md` exclusivamente para a fotografia vigente da Estrutura;
- `CONTINUIDADE.md` para entrada e saída de um agente;
- `RODADAS.md` para a trilha prospectiva;
- `PENDENCIAS.md` para itens concretos ainda abertos;
- `HISTORICO_E_PROVENIENCIA.md` para reconciliação controlada do acervo preexistente e suas referências públicas.

A aprovação do responsável cobre **preparar o contexto em branch**; não cobre incorporar, operar o Google, converter originais privados em publicações ou certificar continuidade entre agentes.

## Onde ficam as fontes de verdade

| Assunto | Fonte canônica | Como revalidar |
| --- | --- | --- |
| Código e testes reais | [src/](../src/), [testes/](../testes/README.md) | SHA, diff, branch e CI |
| Contratos e algoritmos | [ARQUITETURA](../../../docs/sistemas/estrutura-curricular/ARQUITETURA.md), [CONTRATOS](../../../docs/sistemas/estrutura-curricular/CONTRATOS_E_FLUXOS.md), [MODELO](../../../docs/sistemas/estrutura-curricular/MODELO_DE_DADOS.md) | Código, testes negativos, consumidores |
| Política de segurança e governaça | [CLAUDE](../../../CLAUDE.md), [segurança](../../../docs/seguranca/README.md), [PR](../../../docs/governanca/FLUXO_DE_MUDANCAS.md) | Normas vigentes da raiz |
| Estado editorial da Estrutura | [STATUS.md](../STATUS.md) | Checar corte, HEAD e evidências por SHA |
| Histórico do projeto | [VERSOES_E_DECISOES](../../../docs/sistemas/estrutura-curricular/VERSOES_E_DECISOES.md), [HISTORICO_E_PROVENIENCIA](HISTORICO_E_PROVENIENCIA.md) | Preservar fatos originais e seu alcance |
| Decisões prospectivas e rodadas | [RODADAS](RODADAS.md) e rodadas indexadas | Identificador, atos, fontes, revisão/aceite |
| Pendências | [PENDENCIAS](PENDENCIAS.md) | PRs, documentos, CI e decisões humanas |
| Produção e implantação | [HOMOLOGACAO](../../../docs/sistemas/estrutura-curricular/HOMOLOGACAO.md), [IMPLANTACAO](../../../docs/IMPLANTACAO.md), editor Google quando autorizado | O Git é insuficiente para comprovar versão no `/exec` |

## Como é alimentada

**Quando:** depois de decisão técnica/funcional humana, implementação relevante, auditoria, merge, homologação, implantação, mudança de risco/contrato ou handoff material. Não registrar por cada conversa, leitura ou teste repetido.

**Por quem:** agentes atuam apenas sob mandato explícito da tarefa, em branch/PR, respeitando revisores independentes quando exigidos e autorização humana para merge e Google.

**Ordem:** (1) verificar fontes e provas; (2) documentar rodada; (3) decisões/erratas e pendências **somente se afetadas**; (4) atualizar contrato ou documento técnico dono do fato; (5) indexar rodada; (6) atualizar `STATUS.md` **por último quando o estado tiver mudado**, reconciliando textos superados; (7) conferir links, arquivos, CI, independência e próximo passo.

Históricos são imutáveis como fotografias. Se uma prova posterior alterar a interpretação, registre **evento sucessor ou errata fundamentada**, nunca simule revisão independente retroativa. Quem valida o próprio PR não é revisor externo; teste verde não significa homologação Google nem publicação.

## Como entrar a frio

Começar por [AGENTS](../AGENTS.md) e [STATUS](../STATUS.md), então [CONTINUIDADE](CONTINUIDADE.md). Conferir o Git e o catálogo geral antes de agir. Documentos antigos de 1.10.0/1.11.3 ajudam com evolução mas não anulam fontes de 1.13.0; conflitos são achados com datas/versões, não atalhos para refatorar. Consultar somente histórico relevante.

## Privacidade, autorização e manutenção

Tudo aqui será público depois de eventual merge. Nenhum arquivo secreto, credencial, dado real de estudante/servidor, ID interno, URL interna da equipe, exportação ou conteúdo bruto de arquivo privado pode ser copiado. O acesso a material histórico externo não altera a autoridade do pedido atual. `clasp`, dados, trigger, Script Properties, tag, Release e deploy são gates separados.

## Como verificar a própria memória

A revisão documental confere links, escopo, autoria e consistência do STATUS com o SHA real. Um verificador estrutural futuro conferirá campos e índices **somente após a entrada geral estar disponível e o manifesto ser configurado**. Nem um checker verde nem a indexação histórica provam que todas as decisões anteriores foram recuperadas, que a IA manterá contexto espontaneamente ou que o Apps Script está implantado. Teste a frio por outra IA e revisão humana ainda são necessários.
