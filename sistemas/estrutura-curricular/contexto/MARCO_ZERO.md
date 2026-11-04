# Marco Zero — adoção de contexto da Estrutura Curricular

- **Sistema:** `estrutura-curricular`
- **Protocolo:** `context/v1`
- **Corte:** `2026-11-04` (America/Sao_Paulo).
- **Fonte de código/contratos:** `caiolunardi/Sistemas_IPUSP_GoogleScript@a8af8e4b49519640d23ded7f99cbe87749162fbf` (`main`).
- **Evidência do Git:** `sistemas/estrutura-curricular/src/Codigo.gs` exporta `VERSAO_SISTEMA = '1.13.0'` e documentação correspondente; [CI main 40395963163](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/actions/runs/40395963163) `success`.
- **Evidência da operação Google:** `NAO_VERIFICADO`. Esta etapa não consultou o editor, os deploys, as planilhas ou o `/exec`.
- **Estado desta adoção:** `PROPOSTA_DOCUMENTAL_EM_PR`, sem integração, verificador estrutural ou teste a frio aprovado.
- **Agente proponente:** ChatGPT GPT-6, não revisor independente; nenhuma aceitação técnica/operacional atribuída ao responsável.

## Material consultado e cruzado

Fontes públicas: [README](../../../docs/sistemas/estrutura-curricular/README.md), [VERSOES_E_DECISOES](../../../docs/sistemas/estrutura-curricular/VERSOES_E_DECISOES.md), [B2 OCR](../../../docs/sistemas/estrutura-curricular/PROTECAO_B2_OCR.md), [CONTRATOS](../../../docs/sistemas/estrutura-curricular/CONTRATOS_E_FLUXOS.md), [modelo](../../../docs/sistemas/estrutura-curricular/MODELO_DE_DADOS.md), [segurança](../../../docs/sistemas/estrutura-curricular/DADOS_E_SEGURANCA.md), [homologação histórica](../../../docs/sistemas/estrutura-curricular/HOMOLOGACAO.md), [CI](../../../docs/CI.md) e [governança](../../../docs/governanca/FLUXO_DE_MUDANCAS.md). Fontes Git: PRs #22–#30 relevantes, [PR #32](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/pull/32) pendente e árvore de arquivos da aplicação.

Existe um acervo prévio de decisões, rodadas e prompts de continuidade do conjunto GRADIP; foram consultadas entradas relativas à Estrutura, com mapeamento público em [HISTORICO_E_PROVENIENCIA](HISTORICO_E_PROVENIENCIA.md). **Os originais e as informações não verificáveis por fontes públicas não foram transferidos para o repositório público.** Acesso ao arquivo histórico não é pré-requisito para retomada deste aplicativo.

## Incertezas e riscos de promoção

1. O Git conter código e testes da 1.13.0 não demonstra homologação, `clasp push` ou implantação; os documentos atuais ainda assinalam essa pendência.
2. O leitor OCR B2 tem limites F3/F4/F7 e falta prova operacional em PDFs reais/HtmlService; a CI sintética é delimitada.
3. PR #32 não está integrado; as versões/títulos antigos em manuais permanecem como documentos históricos.
4. O [contexto geral em PR #33](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/pull/33) não integra ainda a `main`. Este PR específico, baseado na `main` sem PR #33, não pode alegar uma entrada raiz ativa.
5. `context.config.json` e verificador local de aplicativos **não são parte desta proposta**, para evitar configurar caminhos inexistentes na `main` antes do merge dos PRs.
6. A migração do acervo histórico é **parcial e indexada**; cópia integral de arquivos antigos exige decisão separada de publicidade e uma matriz de proveniência arquivo→destino.

## Critério para encerrar a adoção em próxima rodada

- Revisão documental independente e autorização humana específicas do PR #33 e deste PR, com CI e ausência de vazamento.
- Integração sequencial em `main`, sem forçar merges, respeitando classes e gates.
- Adicionar a configuração real de aplicativo e verificador portátil local em PR próprio ou ampliação autorizada, sem link obrigatório a biblioteca externa.
- Rodar verificador estrutural, confrontar manualmente STATUS/PR/CI e executar **teste a frio** com outra IA que só veja o repositório publicado. Registre conclusão limitada e decisão de corte; só então considerar `ADOTADO`.
