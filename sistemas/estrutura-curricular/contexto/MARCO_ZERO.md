# Marco Zero — adoção de contexto da Estrutura Curricular

- **Sistema:** `estrutura-curricular`
- **Protocolo:** `context/v1`
- **Corte:** `2026-11-04` (America/Sao_Paulo).
- **Fonte de código/contratos:** `caiolunardi/Sistemas_IPUSP_GoogleScript@a8af8e4b49519640d23ded7f99cbe87749162fbf` (`main`).
- **Evidência do Git:** `sistemas/estrutura-curricular/src/Codigo.gs` exporta `VERSAO_SISTEMA = '1.13.0'` e documentação correspondente; [CI do main 40395963163](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/actions/runs/40395963163) `success`.
- **Evidência da operação Google:** nenhuma inspeção direta nesta etapa (editor, implantações, planilhas e `/exec` não foram consultados). Há evidência **relatada** e pública no [PR #32](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/pull/32): leitura A1 do editor de produção (código da 1.12.0 com rótulo `1.11.3`), criação do projeto de homologação (A3a) e envio do HEAD `a84c370` (A3b). A homologação funcional A4 tem só o registro mínimo autorizado pelo responsável ([STATUS](../STATUS.md)). Versão do `/exec`: `NAO_VERIFICADO`.
- **Estado desta adoção:** `PROPOSTA`, em PR, sem integração, verificador estrutural ou teste a frio aprovado.
- **Agentes:** proposta redigida por ChatGPT GPT-6 (rodada 001); correção pós-auditoria por Claude (rodada 002). Nenhum dos dois é revisor independente do próprio trabalho; nenhuma aceitação técnica ou operacional atribuída ao responsável além das decisões registradas no STATUS.

## Material consultado e cruzado

Fontes públicas: [README técnico](../../../docs/sistemas/estrutura-curricular/README.md), [versões e decisões](../../../docs/sistemas/estrutura-curricular/VERSOES_E_DECISOES.md), [proteção B2](../../../docs/sistemas/estrutura-curricular/PROTECAO_B2_OCR.md), [contratos](../../../docs/sistemas/estrutura-curricular/CONTRATOS_E_FLUXOS.md), [modelo](../../../docs/sistemas/estrutura-curricular/MODELO_DE_DADOS.md), [arquitetura](../../../docs/sistemas/estrutura-curricular/ARQUITETURA.md), [segurança](../../../docs/sistemas/estrutura-curricular/DADOS_E_SEGURANCA.md), [homologação histórica](../../../docs/sistemas/estrutura-curricular/HOMOLOGACAO.md), [integração contínua](../../../docs/CI.md), [governança](../../../docs/governanca/FLUXO_DE_MUDANCAS.md) e `src/Configuracao.gs`. Fontes Git: PRs #22–#30, o [PR #32](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/pull/32) pendente (corpo e comentários até 27/10/2026) e a árvore de arquivos da aplicação.

Existe um acervo prévio de decisões, rodadas e prompts de continuidade do conjunto GRADIP; foram consultadas as entradas relativas à Estrutura, com mapeamento público em [histórico e proveniência](HISTORICO_E_PROVENIENCIA.md). **Esse acervo termina em 26/10/2026 (manhã)**; os fatos de 26/10 (tarde) a 27/10 vêm do PR #32 e do registro mínimo autorizado da A4. **Os originais e as informações não verificáveis por fontes públicas não foram transferidos para o repositório público.** Acesso ao acervo não é pré-requisito para retomar este aplicativo.

## Incertezas e riscos de promoção

1. O Git conter código e testes da 1.13.0 não demonstra homologação concluída, `clasp push` para produção ou implantação. A homologação está PARCIAL/BLOQUEADA.
2. O editor de produção e o envio à homologação são conhecidos por relato do executor no PR #32, não por inspeção independente.
3. O leitor OCR B2 tem limites (F3/F4/F7, detecção só no navegador, 100 avisos no servidor, D5, H1–H3 e o limite residual aceito com PDF real); a CI sintética é delimitada.
4. O PR #32 não está integrado e tem HEAD congelado para a homologação; as versões e títulos antigos em manuais permanecem como documentos históricos.
5. O [contexto geral no PR #33](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/pull/33) ainda não está no `main`. Este PR, baseado no `main` sem o #33, não pode alegar uma entrada raiz ativa.
6. `context.config.json` e o verificador local **não fazem parte desta proposta**, para não configurar caminhos inexistentes no `main` antes dos merges.
7. A migração do acervo histórico é **parcial e indexada**; cópia integral de arquivos antigos exige decisão separada de publicidade e uma matriz de proveniência arquivo→destino.

## Critério para encerrar a adoção em próxima rodada

- Revisão documental independente e autorização humana específicas do PR #33 e deste PR, com CI e ausência de vazamento.
- Integração sequencial no `main`, sem forçar merges, respeitando classes e gates, com a reconciliação da entrada geral ([pendências](PENDENCIAS.md), GE-01).
- Configuração real do aplicativo e verificador portátil local em PR próprio ou ampliação autorizada, sem link obrigatório a biblioteca externa.
- Rodar o verificador estrutural, confrontar manualmente STATUS/PR/CI e executar **teste a frio** com outra IA que só veja o repositório publicado. Registrar conclusão limitada e decisão de corte; só então considerar `ADOTADO`.

## Revisão pós-auditoria (sucessora, 04/11/2026)

Uma auditoria independente do texto original desta página (HEAD `e74ffed`) apontou omissões de fatos públicos do PR #32 e de restrições já conhecidas. As correções estão registradas em [EC-ROD-20261104-002](rodadas/EC-ROD-20261104-002.md). O texto original continua recuperável no Git pelo commit `e74ffed`.

A sincronização com o `main` depois do merge do PR #33 está em [EC-ROD-20261104-003](rodadas/EC-ROD-20261104-003.md), os ajustes da revisão independente do PR estão em [EC-ROD-20261104-004](rodadas/EC-ROD-20261104-004.md), e o manifesto `context.config.json` entrou em [EC-ROD-20261104-005](rodadas/EC-ROD-20261104-005.md). As linhas acima que dizem "sem integração" e que o PR #33 não está no `main` registram o estado no corte. O estado atual está no [STATUS](../STATUS.md).
