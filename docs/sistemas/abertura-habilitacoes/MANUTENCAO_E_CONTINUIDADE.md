# Manutenção e continuidade — Gerenciador de Abertura de Habilitações 2.0

Para quem vier a manter o gerenciador sem ter participado da 2.0. Regras gerais do repositório: [`docs/arquitetura/GUIA_DE_CONTINUIDADE_E_LEGADO.md`](../../arquitetura/GUIA_DE_CONTINUIDADE_E_LEGADO.md) e [fluxo de mudanças](../../governanca/FLUXO_DE_MUDANCAS.md).

## Estado

- Fonte: `sistemas/abertura-habilitacoes/gerenciador/src/` (v2.0). **Não homologada, não implantada.**
- Em uso: 1.0, fora do repositório. O GitHub não sabe o que está no Apps Script; confira antes de qualquer mudança ([`docs/IMPLANTACAO.md`](../../IMPLANTACAO.md#4-conferir-o-código-do-editor)).
- Documentos: [índice](README.md).

## Leitura por objetivo

| Quero… | Comece por |
|---|---|
| entender o sistema | [ARQUITETURA.md](ARQUITETURA.md), [FLUXOS.md](FLUXOS.md) |
| saber por que algo é assim | [INVENTARIO_LEGADO.md](INVENTARIO_LEGADO.md), [VERSOES_E_DECISOES.md](VERSOES_E_DECISOES.md) |
| mudar uma regra (situação, e-mail, relatório) | [REGRAS_E_CONTRATOS.md](REGRAS_E_CONTRATOS.md) e o teste de equivalência |
| mudar a planilha ou o Forms | [MODELO_DE_DADOS.md](MODELO_DE_DADOS.md), [MANUAL_OPERACAO.md](MANUAL_OPERACAO.md#7-problemas-comuns) |
| dar acesso a alguém | [MANUAL_OPERACAO.md](MANUAL_OPERACAO.md#2-lista-de-acesso-responsável) |

## Invariantes (não quebrar sem decisão expressa)

1. **Nenhum ID no código.** Planilhas só por `abrirPlanilhaPorChave_`. O teste "nenhum ID literal…" e `ferramentas/verificar_publicacao.js` barram.
2. **Toda função pública confere o acesso primeiro.** Função nova sem `_` no fim precisa de `exigirLeitor_()` ou `exigirAdministrador_()` na primeira linha **e** de entrar na lista do teste "funções públicas são exatamente…".
3. **A aba `2021 - 2022` nunca é escrita.** Toda escrita passa por `gravarCelula_` ou `obterOuCriarColuna_`, que recusam outra aba; a migração confere de novo. Não use `getRange(...).setValue` direto numa tabela lida.
4. **J e K pela posição; `pendente` em minúsculas.** O Painel dos servidores depende disso.
5. **Nada é gravado antes das conferências** em `salvarPedido`; a Versão sobe antes das outras gravações; `flush` antes de soltar a trava; e-mail fora da trava; `E-mail Enviado` só com data depois do envio aceito **e só se a célula ainda tiver a reserva daquele salvamento**.
6. **Consultar não grava.** `doGet` e as funções de `Pedidos.gs` são só leitura.
7. **Respostas só com JSON** (`paraPagina_`): nenhum `Date` sai do servidor.
8. **Dados na página só por `textContent`.**
9. **Logs sem dados pessoais** (`textoParaLog_`; nada de nome, e-mail ou Nº USP em `console.log`).
10. **Um só critério de Versão** (`versaoValida_`/`estadoDaVersao_` em `Planilha.gs`). Não leia a coluna Versão de outro jeito, e não "corrija" versão malformada fora da recuperação.
11. **Alteração em lote ou de identificador só com código que identifica o plano.** Ao mudar `planejarMigracao_` ou `planejarRecuperacao_`, tudo o que a execução usa para decidir precisa entrar na impressão digital; os testes "linhas trocadas…", "registros alterados…" e "linha ou grupo mudou…" conferem isso.
12. **Comportamento da 1.0 preservado** onde o inventário diz "CI": mudar exige decisão humana e atualizar o teste de equivalência (que vai falhar, de propósito).

## Como evoluir

- Mudança de regra: altere o código, o teste de equivalência (transforme o caso em `DIFERENÇA: …`), [REGRAS_E_CONTRATOS.md](REGRAS_E_CONTRATOS.md), a [ajuda](AJUDA.md) se a equipe perceber, e registre a decisão em [VERSOES_E_DECISOES.md](VERSOES_E_DECISOES.md).
- Novo campo do Forms: acrescente em `CABECALHOS` (`Planilha.gs`) só se o gerenciador for usá-lo; atualize [MODELO_DE_DADOS.md](MODELO_DE_DADOS.md) e os dados sintéticos.
- Nova função para a página: guarda de acesso, validação da entrada, `paraPagina_` na saída, validador da resposta em `GerenciadorAppUI.html`, teste de servidor e de navegador.
- Arquivos de `shared/`: nunca edite as cópias em `src/`; edite `shared/` e copie (a CI confere).
- Versão: `VERSAO_GERENCIADOR` em `Configuracao.gs`, tabela do [README do código](../../../sistemas/abertura-habilitacoes/gerenciador/README.md), [VERSOES_E_DECISOES.md](VERSOES_E_DECISOES.md), [`docs/VERSOES.md`](../../VERSOES.md) e nota em `notas-de-versao/`.

## Riscos

| Risco | Efeito | Mitigação atual | Próximo passo possível |
|---|---|---|---|
| Forms empurra J/K com uma pergunta nova de título desconhecido | Observações e situação gravadas na coluna errada | Detecção só quando J/K têm título conhecido; manual | Conferir também os títulos esperados de J/K (exige saber os títulos reais) |
| Edição manual da planilha durante um salvamento | Uma das alterações se perde | Versão, reserva com data; ajuda pede para evitar | Proteção de intervalo nas colunas do gerenciador (decisão do responsável) |
| Linhas novas sem Registro ID | Pedido não abre até ser preparado | **Preparar pedido**; migração | Gatilho `onFormSubmit` que atribui ID (exige criar gatilho; decisão) |
| Cota de e-mail da conta | Avisos falham | Resultado "salvo, e-mail falhou" | Monitorar no registro |
| `Session.getActiveUser()` vazio para contas da equipe | Ninguém entra | Falha fechada; teste A5 da homologação | Ajustar acesso/implantação conforme o resultado |
| Lista de acesso desatualizada | Pessoa que saiu continua entrando | Cache de 60 s; manual | Revisão periódica (A VALIDAR) |
| Divergência de contagem com o Painel dos servidores | Números diferentes para a equipe | Documentado | Unificar critério (decisão) |
| Sem registro de quem alterou | Não dá para saber quem concluiu ou avisou | Histórico de versões da planilha (mostra a conta que implantou, não quem usou) | Auditoria em planilha própria (decisão) |
| Exposição da 1.0 em uso (sem autorização no servidor) | Quem tem o link lê e grava | Nenhuma na 1.0 | Homologar e implantar a 2.0, ou restringir a implantação da 1.0 |
| Volta à 1.0 depois da implantação | A primeira visita reescreve Registro ID e Versão se houver algo a "corrigir" | Condições e procedimento em [INSTALACAO_E_ATUALIZACAO.md §5](INSTALACAO_E_ATUALIZACAO.md#5-voltar-atrás); teste "volta à 1.0…" | Preferir "Somente eu" a voltar, quando as condições não puderem ser cumpridas |
| Pedidos com versão malformada ou ID fora do formato | Não abrem até a recuperação | Marcados na lista; recuperação um a um ([manual](MANUAL_OPERACAO.md#42-recuperação-de-um-pedido-um-por-vez)) | Proteção das colunas Registro ID e Versão (decisão 12) |
| Alteração da célula `E-mail Enviado` durante um envio | A data do aviso não fica registrada | Resultado "e-mail enviado, data não registrada"; equipe anota nas observações | — |

## Contatos e responsabilidades

Responsável funcional e técnico: A VALIDAR INSTITUCIONALMENTE (Serviço de Graduação). Quem decide a lista de acesso, o texto do e-mail e os critérios de situação e relatório é o responsável pelo Serviço de Graduação, não o código.
