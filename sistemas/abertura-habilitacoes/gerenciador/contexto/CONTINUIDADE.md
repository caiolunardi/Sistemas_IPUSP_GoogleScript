# Continuidade — Gerenciador de Abertura de Habilitações

## Entrada a frio

1. Ler [AGENTS local](../AGENTS.md), [AGENTS da raiz](../../../../AGENTS.md), [normas](../../../../CLAUDE.md), [status](../STATUS.md) e [sistema de contexto](CONTEXT_SYSTEM.md).
2. Identificar o gerenciador da equipe, não o Google Forms. Consultar [pendências](PENDENCIAS.md), [rodadas](RODADAS.md) e [proveniência](HISTORICO_E_PROVENIENCIA.md) conforme a demanda.
3. Conferir `main`/HEAD, PRs, CI, versão do [código](../src/Configuracao.gs), [homologação](../../../../docs/sistemas/abertura-habilitacoes/HOMOLOGACAO.md) e documento técnico. V2.1 publicada em 22/10 é **registro documental**; em 04/11 o responsável confirmou **v2.1 em produção**, com captura da interface ([rodada 002](rodadas/AHG-ROD-20261104-002.md)). O SHA do código implantado e as configurações atuais continuam `NAO_VERIFICADO` sem inspeção técnica.
4. Para mudanças, ler [contratos](../../../../docs/sistemas/abertura-habilitacoes/REGRAS_E_CONTRATOS.md), [modelo](../../../../docs/sistemas/abertura-habilitacoes/MODELO_DE_DADOS.md), [auditoria](../../../../docs/sistemas/abertura-habilitacoes/AUDITORIA.md), [segurança](../../../../docs/sistemas/abertura-habilitacoes/DADOS_E_SEGURANCA.md) e documentação de consumidores.

## Não regressar

Autorizar no servidor, falhar fechado sem identidade, usar coluna de ambiente correta; J/K fixos e Forms fora da trava, histórico 2021–2022 só consulta; contagem do Painel diferente; reserva de e-mail com resultado incerto (não reenviar); migração explícita e fingerprint. Auditoria indisponível antes de escrita bloqueia; erro de evento após escrita **não desfaz**. Não incluir observações reais, termos de busca, dados pessoais, IDs ou URLs internas em repositório público.

## Saída

Registrar evidência e limites → rodada e decisões/pendências afetadas → índice → STATUS por último se mudou → CI, links, privacidade e próximo ato possível versus autorizado. Sem mudança, nenhum commit; sem autorização, `REGISTRO_PENDENTE`. Merge, `clasp`, publicação, gatilho, planilha e e-mail real exigem mandato próprio.

**Adoção nesta fase:** `PROPOSTA`; [marco zero](MARCO_ZERO.md).
