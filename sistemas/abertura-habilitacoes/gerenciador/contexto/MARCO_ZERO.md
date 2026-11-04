# Marco Zero — Gerenciador de Abertura de Habilitações

- **Sistema:** `abertura-habilitacoes-gerenciador`
- **Protocolo:** `context/v1`
- **Corte:** `2026-11-04` (America/Sao_Paulo).
- **Código:** `caiolunardi/Sistemas_IPUSP_GoogleScript@5b6aba0ccd4ef7036bc294df769f61fd41994553`, `VERSAO_GERENCIADOR = "2.1"`.
- **Produção:** versão 7 da 2.1 **documentada** em 22/10; editor e `/exec` atuais `NAO_VERIFICADO`.
- **Adoção:** `PROPOSTA_DOCUMENTAL_EM_PR`, não revisada, sem teste a frio ou corte específico.
- **Redator:** ChatGPT GPT-6; autoavaliação não é auditoria independente.

## Fontes e conflitos

[documentação](../../../../docs/sistemas/abertura-habilitacoes/README.md), [homologação](../../../../docs/sistemas/abertura-habilitacoes/HOMOLOGACAO.md), [contratos](../../../../docs/sistemas/abertura-habilitacoes/REGRAS_E_CONTRATOS.md), [modelo](../../../../docs/sistemas/abertura-habilitacoes/MODELO_DE_DADOS.md), [auditoria](../../../../docs/sistemas/abertura-habilitacoes/AUDITORIA.md), [segurança](../../../../docs/sistemas/abertura-habilitacoes/DADOS_E_SEGURANCA.md), [testes](../testes/README.md), [governança](../../../../docs/governanca/FLUXO_DE_MUDANCAS.md), PRs #16–#21; registro privado antigo `GRADIP-ROD-20261021-001` **apenas indexado** em [proveniência](HISTORICO_E_PROVENIENCIA.md).

O Forms externo grava sem trava do gerenciador; J/K podem deslocar; 2021–2022 só leitura; contagem do Painel diverge; e-mail incerto exige conferência; auditoria não é atômica; política de retenção pendente. Homologação G1–G4 documentada, G5–G8 não constam como executados. O [README pai](../../README.md), a [arquitetura](../../../../docs/sistemas/abertura-habilitacoes/ARQUITETURA.md) e o [guia de instalação](../../../../docs/sistemas/abertura-habilitacoes/INSTALACAO_E_ATUALIZACAO.md) têm frases de fases anteriores, em conflito com o registro posterior.

Nenhuma visita ao Google, alteração em `src/`, testes, workflows, planilhas, formulários, gatilhos ou implantação. Nenhum material privado foi copiado. Estado histórico, código Git e produção são provas diferentes.

## Atualização sucessora — 04/11/2026

Após a fotografia inicial, o responsável afirmou explicitamente que o gerenciador **já está em produção na versão 2.1**, apresentando uma captura da interface com a indicação visual de `versão 2.1`. Este fato posterior está na [rodada 002](rodadas/AHG-ROD-20261104-002.md); não altera retroativamente a prova disponível no instante original do Marco Zero. A captura permaneceu fora do Git público. Não houve inspeção do editor ou verificação de SHA do deployment.

## Próximo gate

Revisão documental independente, checker estrutural com `context.config.json`, varredura de publicação, CI, teste a frio com outra IA que leia só o Git e decisão humana de corte. O Google Forms não integra este contexto; nenhum gate permite merge ou operação por inferência.
