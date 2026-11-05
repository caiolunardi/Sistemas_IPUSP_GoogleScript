# Pedido de Abertura de Habilitação (formulário dos alunos) — v2.0

**Estado:** no repositório, não homologada nem implantada. Sem tag nem Release até a homologação.

- Planilhas pelo `ID_INDEX` (`PLANILHA_ALUNOS`, `ABERTURA_HABILITACOES`, `PERIODOS`); nenhum ID no código.
- Ambiente de homologação por `AMBIENTE=homologacao`.
- Esquema A–K da aba `Respostas ao formulário 2` conferido antes de cada gravação; qualquer diferença recusa o envio. A 1.0 criava a coluna `Situação` no fim se faltasse; a 2.0 não cria nada.
- Linha nova com `appendRow`; `Registro ID` e `Versão 1` quando as colunas do Gerenciador existem.
- Planilha de alunos pelo título; falha não impede o preenchimento manual.
- Recibo por e-mail "não responder" (nova autorização do script).
- Confirmação quando já há pedido pendente para o mesmo programa.
- Observações acima de 2.000 caracteres recusadas (antes cortadas).
- Manifesto declara a execução que a 1.0 já usa ("Executar como: eu", acesso de qualquer pessoa da USP).
- Saudação no topo com o primeiro nome da planilha de alunos.
- Tema GRADIP, Central de Ajuda e acessibilidade.

Decisões: [DECISOES.md](../docs/sistemas/abertura-habilitacoes/formulario/DECISOES.md).
