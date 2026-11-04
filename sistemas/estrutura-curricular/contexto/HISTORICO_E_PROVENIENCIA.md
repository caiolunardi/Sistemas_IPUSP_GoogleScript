# Estrutura Curricular — reconciliação do histórico anterior

**Natureza:** índice de proveniência para converter continuidade histórica em documentos locais **sem transcrever conteúdo reservado no repositório público**. Identificadores históricos são preservados como referências, **não** renumerados como rodadas locais `EC-ROD-`. A origem completa dos apontamentos anteriores permanece em acervo com acesso restrito; este contexto opera usando somente os **documentos públicos e os commits indicados**. O acervo termina em **26/10/2026 (manhã)**; o que veio depois está na última linha da matriz.

## Matriz de proveniência e reconciliação

Situação hoje: **V** = continua válida; **P** = planejamento ou autorização já executados (histórico); **S** = superada em parte por evento posterior.

| Registro histórico | Tema/alcance original | Fonte pública para revalidar | Situação hoje | Tratamento na instância local |
| --- | --- | --- | --- | --- |
| `GRADIP-ROD-20261022-002` | Etapa 1: leitura de PDF sintético na CI | [PR #22](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/pull/22), [CI 39770152566](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/actions/runs/39770152566) | V | Evidência histórica, não rodada nova |
| `GRADIP-ROD-20261022-004` | Etapa 2: dependência `tar` via `canvas` (Dependabot) | [PR #23](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/pull/23) | P | História de dependências, sem alterar a CI atual |
| `GRADIP-ROD-20261022-005` | Merge do PR #23 e auditoria da PoC do PDF.js (PR #24) | [PR #23](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/pull/23), [PR #24](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/pull/24) | P | Técnica já incorporada; consultar a documentação |
| `GRADIP-ROD-20261022-006` | Mandato para merge da PoC e Etapa 4 | [PR #24](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/pull/24) | P | Autorização histórica, **não** ordem atual |
| `GRADIP-ROD-20261022-007` | Auditoria da Etapa 4 (PDF.js 6.4.299) | [PR #25](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/pull/25), [Etapa 4](../../../docs/sistemas/estrutura-curricular/ETAPA4_PDFJS_MIGRACAO.md) §7–8 | V (gate) | Parecer e restrições da época; o gate "divergência acadêmica bloqueia a homologação" segue no corpo do PR #32 |
| `GRADIP-ROD-20261022-008` | Mandato do teste misto e OCR | [PR #25](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/pull/25), [testes mistos](../../../docs/sistemas/estrutura-curricular/ETAPA4_TESTES_MISTOS.md) | S | Evidência de planejamento, não cobertura real; a falta de PDF real foi superada em parte pela A4 (registro mínimo no [STATUS](../STATUS.md)) |
| `GRADIP-ROD-20261022-009` | Fontes/hinting e teste misto | [PR #26](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/pull/26), [integração contínua](../../../docs/CI.md) | V | Preservar as divergências acadêmicas observadas (diagnóstico não bloqueante) |
| `GRADIP-ROD-20261022-010` | Proposta de diagnóstico do OCR | [testes mistos](../../../docs/sistemas/estrutura-curricular/ETAPA4_TESTES_MISTOS.md) | P | Proposta histórica, executada depois no PR #26 |
| `GRADIP-ROD-20261022-011` | Auditoria do PR #26 e proposta conservadora B2 | [PR #26](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/pull/26) | V (B3 pendente) | Parecer histórico e riscos, não nova aprovação |
| `GRADIP-ROD-20261022-012` | Mandato para merge do PR #26 e proteção B2 | [PR #26](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/pull/26), [PR #28](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/pull/28) | P | Mandato de época, não autorizado novamente |
| `GRADIP-ROD-20261023-013` | Auditoria do PR #28 e separação da CI | [PR #28](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/pull/28), [PR #30](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/pull/30) | V | Decisão de governança preservada |
| `GRADIP-ROD-20261023-014` | Versão 1.13.0 e cronograma de saída | [PR #28](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/pull/28) | P (passos 1–3 feitos; homologação em andamento) | Planejamento histórico, revalidado por código e pelo PR #32 |
| `GRADIP-ROD-20261026-016` | Pós PRs #28/#30, homologação pendente | [PR #28](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/pull/28), [PR #30](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/pull/30), [CI 40317915824](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/actions/runs/40317915824) | V; o manifesto não versionado foi superado pelo PR #32 aberto | Último registro do acervo. Levados ao contexto: isolamento por `ID_INDEX` fictício (a Estrutura ignora `AMBIENTE`), riscos residuais da B2 e documentação desatualizada (nota da 1.13.0 e PROTECAO_B2_OCR). O item do Painel dos Servidores é de outro aplicativo |
| *(sem registro no acervo)* | 26/10 (tarde) a 27/10/2026: A1, A2, A3a, A3b e A4 da homologação | Corpo e comentários do [PR #32](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/pull/32) (A1–A3b); registro mínimo da A4 autorizado pelo responsável em 04/11/2026 | V | Incorporado ao [STATUS](../STATUS.md) e às [pendências](PENDENCIAS.md) por [EC-ROD-20261104-002](rodadas/EC-ROD-20261104-002.md); relatórios fora do Git |

**Fora do recorte desta aplicação:** registros `GRADIP-ROD-20261021-001` (Habilitações), `GRADIP-ROD-20261022-003` (instalação da memória do conjunto, transversal) e `GRADIP-ROD-20261023-015` (Diplomas). Eles não são apagados nem atribuídos à Estrutura. Os prompts do acervo (`GRADIP-PROMPT-20261022-001` a `GRADIP-PROMPT-20261026-009`) acompanham as rodadas acima e não são transcritos.

## Decisões gerais e específicas

Não copiar retrospectivamente decisões globais como se tivessem sido tomadas **só** pela Estrutura. O mapa dos registros transversais (`GRADIP-DEC-001` a `GRADIP-DEC-006` e `GRADIP-ROD-20261022-003`) fica na camada geral, no [contexto geral](../../../docs/contexto/README.md), seção "Proveniência das decisões transversais". As normas públicas que a Estrutura aplica estão em:

- [ADR-001 — plataforma](../../../docs/arquitetura/ADR-001_ESCOLHA_DA_PLATAFORMA_INSTITUCIONAL.md).
- [Fluxo de mudanças e autorizações](../../../docs/governanca/FLUXO_DE_MUDANCAS.md).
- [Política de repositório público](../../../docs/seguranca/REPOSITORIO_PUBLICO.md).
- [Arquitetura/contratos de dados](../../../docs/ARQUITETURA_GERAL.md).
- [Regras próprias da Estrutura](../../../docs/sistemas/estrutura-curricular/VERSOES_E_DECISOES.md), [contratos](../../../docs/sistemas/estrutura-curricular/CONTRATOS_E_FLUXOS.md) e [proteção B2](../../../docs/sistemas/estrutura-curricular/PROTECAO_B2_OCR.md).

**Não foi criada uma decisão humana nova nesta conversão.** As decisões do responsável de 27/10/2026 e de 04/11/2026 registradas no STATUS foram tomadas por ele, não pela conversão. Uma decisão no acervo antigo não é comprovada publicamente apenas pelo identificador. O texto integral do acervo anterior, seus prompts, capturas e relatórios foram **inventariados seletivamente, não copiados integralmente**; não afirmar migração histórica completa. Para eventual importação de originais, exigir triagem de conteúdo, procedência, revisão de dados e autorização explícita de publicização.

## Regras para as próximas IAs

- Conferir o PR/commit público correspondente, não aceitar este índice como fonte de fatos atuais.
- Registro anterior `APROVADO` significa parecer/decisão **no objeto da época**, não no SHA atual.
- Quando houver correção factual, criar documento sucessor com prova, sem reescrever originais.
- Quando a informação só puder ser confirmada pelo Google, marcar `NAO_VERIFICADO` e pedir a verificação autorizada.
