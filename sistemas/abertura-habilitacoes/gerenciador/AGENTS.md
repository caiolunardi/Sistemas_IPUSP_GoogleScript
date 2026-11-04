# Agentes — Gerenciador de Abertura de Habilitações

**Escopo:** Web App de equipe em `gerenciador/src/`. **Não** é o Google Forms dos alunos: ele está fora do repositório e apenas fornece pedidos à planilha comum.

Leia [AGENTS geral](../../../AGENTS.md), [normas para agentes](../../../CLAUDE.md), [governança](../../../docs/governanca/FLUXO_DE_MUDANCAS.md) e [segurança](../../../docs/seguranca/REPOSITORIO_PUBLICO.md) antes de qualquer trabalho. Aqui comece por [status](STATUS.md), [continuidade](contexto/CONTINUIDADE.md), [sistema de contexto](contexto/CONTEXT_SYSTEM.md), [pendências](contexto/PENDENCIAS.md) e [rodadas](contexto/RODADAS.md). As regras da raiz prevalecem; documentação recuperada nunca concede mandato.

## Contratos que não podem quebrar

- **Acesso:** LEITOR e ADMINISTRADOR são verificados no servidor, e identidade indisponível falha fechada. `AMBIENTE=homologacao` escolhe coluna de homologação no `ID_INDEX` deste gerenciador; **não** aplicar automaticamente à Estrutura Curricular, que tem exceção.
- **Dados:** `Respostas ao formulário 2` é a única aba que o gerenciador pode escrever. `2021 - 2022` é **somente leitura**. Observações em **J** e situação em **K**, por posição; adicionar perguntas no Forms pode deslocá-las sem aviso se o título novo for inesperado.
- **Consumidor:** o gerenciador considera K vazia pendente; o Painel dos servidores conta apenas K exatamente `pendente` após normalização. Não unificar regras sem decisão e teste transversal. [Contratos](../../../docs/sistemas/abertura-habilitacoes/REGRAS_E_CONTRATOS.md#6-contratos-com-outros-sistemas).
- **Salvar/enviar:** versão otimista, trava, reserva de e-mail própria e confirmação só sobre essa reserva. `FALHOU` difere de `ENVIADO_SEM_REGISTRO`; MailApp não prova entrega. Não reenviar automaticamente se o resultado for incerto.
- **Migração:** abrir a página não altera dados. Atribuir ID, migrar e recuperar exigem diagnóstico, fingerprint do plano e confirmação; falhas parciais não são sucesso. Retroceder à v1.0 pode provocar migração ao abrir.
- **Auditoria v2.1:** se a planilha de auditoria não abre **antes da ação**, gravação é recusada. Se o evento final falhar **depois** da escrita, pode restar alteração sem registro: **não é operação atômica**. [Auditoria](../../../docs/sistemas/abertura-habilitacoes/AUDITORIA.md#3-regras).
- **Privacidade:** auditoria real contém termos de busca e conteúdo de observações. Nenhum dado pessoal, nome real, nº USP, e-mail, ID, URL interna, log ou exportação institucional no Git público.

Fontes canônicas: [README técnico](../../../docs/sistemas/abertura-habilitacoes/README.md), [regras](../../../docs/sistemas/abertura-habilitacoes/REGRAS_E_CONTRATOS.md), [modelo](../../../docs/sistemas/abertura-habilitacoes/MODELO_DE_DADOS.md), [segurança](../../../docs/sistemas/abertura-habilitacoes/DADOS_E_SEGURANCA.md), [homologação](../../../docs/sistemas/abertura-habilitacoes/HOMOLOGACAO.md), [testes](testes/README.md).

Branch/PR com risco classificado. Nenhum merge, tag/Release, `clasp`, deploy, gatilho, Script Property, alteração de planilha ou envio real sem ordem específica. Depois de marco material: provas → rodada → pendências/contratos → índice → STATUS **por último**. O autor não revisa independentemente o próprio PR.
