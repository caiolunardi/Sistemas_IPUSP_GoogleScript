# Estrutura Curricular — reconciliação do histórico anterior

**Natureza:** índice de proveniência para converter continuidade histórica em documentos locais **sem transcrever conteúdo reservado no repositório público**. Identificadores históricos são preservados como referências, **não** renumerados como rodadas locais `EC-ROD-`. A origem completa dos apontamentos anteriores permanece em acervo com acesso restrito; este contexto opera usando somente os **documentos públicos e os commits indicados**.

## Matriz de proveniência e reconciliação

| Registro histórico | Tema/alcance original | Fonte pública para revalidar | Tratamento na instância local |
| --- | --- | --- | --- |
| `GRADIP-ROD-20261022-002` | Etapa 1: leitura PDF sintética na CI | [PR #22](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/pull/22), [CI 39770152566](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/actions/runs/39770152566) | Evidência histórica, não rodada nova |
| `GRADIP-ROD-20261022-004` | Dependabot e transição à PoC | [PR #23](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/pull/23) | História de dependências, sem alterar CI atual |
| `GRADIP-ROD-20261022-005` | PoC PDF.js e PR24 | [PR #24](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/pull/24) | Técnica já incorporada; consultar documentação |
| `GRADIP-ROD-20261022-006` | Mandato para merge da PoC e Etapa 4 | [PR #24](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/pull/24) | Autorização histórica, **não** ordem atual |
| `GRADIP-ROD-20261022-007` | Auditoria da Etapa 4 PDF.js | [PR #25](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/pull/25) | Parecer e restrições da época |
| `GRADIP-ROD-20261022-008` | Mandato de teste misto e OCR | [PR #25](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/pull/25), [testes mistos](../../../docs/sistemas/estrutura-curricular/ETAPA4_TESTES_MISTOS.md) | Evidência de planejamento e continuidade, não cobertura real |
| `GRADIP-ROD-20261022-009` | Fontes/hinting e teste misto | [PR #26](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/pull/26) | Preservar divergências acadêmicas observadas |
| `GRADIP-ROD-20261022-010` | Proposta de diagnóstico OCR | [relatório de testes mistos](../../../docs/sistemas/estrutura-curricular/ETAPA4_TESTES_MISTOS.md) | Apenas proposta histórica, sem afirmar execução |
| `GRADIP-ROD-20261022-011` | Auditoria PR26 e proposta conservadora B2 | [PR #26](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/pull/26) | Parecer histórico e riscos, não nova aprovação |
| `GRADIP-ROD-20261022-012` | Mandato para PR26 e proteção B2 | [PR #26](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/pull/26) | Mandato de época, não autorizado novamente |
| `GRADIP-ROD-20261023-013` | Auditoria PR28 e separação de CI | [PR #28](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/pull/28) | Decisão de governança preservada |
| `GRADIP-ROD-20261023-014` | Versão 1.13.0 e plano de saída | [PR #28](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/pull/28) | Planejamento histórico, revalidado por código |
| `GRADIP-ROD-20261026-016` | Pós PRs #28/#30, homologação pendente | [PR #28](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/pull/28), [PR #30](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/pull/30), [CI 40317915824](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/actions/runs/40317915824) | Último relato histórico consultado; comparado ao `main` atual |

**Fora do recorte desta aplicação:** registros `GRADIP-ROD-20261021-001` (Habilitações), `GRADIP-ROD-20261022-003` (instalação da memória do conjunto) e `GRADIP-ROD-20261023-015` (Diplomas). Eles não são apagados nem atribuídos à Estrutura, e sua futura destinação exige classificação por aplicativo.

## Decisões gerais e específicas

Não copiar retrospectivamente decisões globais como se tivessem sido tomadas **só** pela Estrutura. As razões de plataforma, PR/CI/clasp, minimização de dados, separação de Apps Scripts, desempenho sem refatoração ornamental e continuidade por marcos já possuem expressão **pública** nos seguintes documentos:

- [ADR-001 — plataforma](../../../docs/arquitetura/ADR-001_ESCOLHA_DA_PLATAFORMA_INSTITUCIONAL.md).
- [Fluxo de mudanças e autorizações](../../../docs/governanca/FLUXO_DE_MUDANCAS.md).
- [Política de repositório público](../../../docs/seguranca/REPOSITORIO_PUBLICO.md).
- [Arquitetura/contratos de dados](../../../docs/ARQUITETURA_GERAL.md).
- [Regras próprias da Estrutura](../../../docs/sistemas/estrutura-curricular/VERSOES_E_DECISOES.md), [contratos](../../../docs/sistemas/estrutura-curricular/CONTRATOS_E_FLUXOS.md) e [proteção B2](../../../docs/sistemas/estrutura-curricular/PROTECAO_B2_OCR.md).

**Não foi criada uma decisão humana nova nesta conversão.** Uma decisão no acervo antigo não é comprovada publicamente apenas pelo identificador. O texto integral do acervo anterior, seus prompts, capturas e relatórios foram **inventariados seletivamente, não copiados integralmente**; não afirmar migração histórica completa. Para eventual importação de originais, exigir triagem de conteúdo, procedência, revisão de dados e autorização explícita de publicização.

## Regras para as próximas IAs

- Conferir o PR/commit público correspondente, não aceitar este índice como fonte de fatos atuais.
- Registro anterior `APROVADO` significa parecer/decisão **no objeto da época**, não no SHA atual.
- Quando houver correção factual, criar documento sucessor com prova, sem reescrever originais.
- Quando a informação só puder ser confirmada pelo Google, marcar `NAO_VERIFICADO` e pedir a verificação autorizada.
