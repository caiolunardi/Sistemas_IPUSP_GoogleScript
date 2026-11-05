# Homologação — formulário 2.0

**Estado: NÃO HOMOLOGADO.** Só os testes locais com dados fictícios foram feitos.

## 1. Antes de começar

- [ ] Conferir, na planilha **real**, só a linha 1 da aba `Respostas ao formulário 2`: C tem o texto da declaração e K se chama `Situação` ([DECISOES.md](DECISOES.md), item 2). Não alterar nada.
- [ ] Conferir se o Google Forms original ainda está ligado à planilha (na planilha: menu Formulários; no Forms: Respostas). Só anotar o estado: ligado, aceitando respostas ou não. Não desligar sem autorização específica.
- [ ] Criar o projeto de homologação e as três cópias de planilha com os CSVs fictícios ([INSTALACAO.md](INSTALACAO.md)).

## 2. Testes locais (05/11/2026)

| Suíte | Resultado | O que cobre |
|---|---|---|
| `node testar_backend.js` | 38 ok, 0 falha | login, período, alunos, histórico, validação, gravação A–O, esquema, compatibilidade com Gerenciador e Painel, pedido repetido, recibo, trava, logs, homologação, CSV fictício |
| `node testar_navegador.js` | 166 ok, 0 falha | carga, bloqueios, validação, pendente por programa, envio, recibo, temas, contraste AA, alvos de 44 px, 360–1280 px, Central de Ajuda, faixa de homologação |

Limites: os serviços do Google são simulados; o login real, a autorização do e-mail, o `appendRow` concorrente e a planilha real só a homologação mostra.

## 3. Roteiro no Google

| # | Passo | Esperado |
|---|---|---|
| H1 | `diagnosticarConfiguracao` | todas as linhas `OK`; "pedidos novos recebem Registro ID e Versão 1" |
| H2 | Abrir o `/exec` de homologação com a conta de teste cadastrada na cópia de alunos | faixa de homologação; dados pré-preenchidos |
| H3 | Enviar Bacharelado | linha nova com A–K, Registro ID e Versão 1; recibo `[HOMOLOGAÇÃO]` |
| H4 | Enviar Bacharelado de novo | confirmação de pedido pendente; com a caixa marcada, grava |
| H5 | Enviar Licenciatura | grava sem confirmação |
| H6 | Abrir o pedido no Gerenciador de homologação | abre sem "Preparar pedido"; concluir funciona |
| H7 | Renomear a K da **cópia** para `Status` e enviar | recusa; diagnóstico aponta a coluna K; nada gravado. Voltar o título |
| H8 | Período da cópia como Sazonal fora das datas | tela de fora do período com as janelas |
| H9 | Temas, celular e Central de Ajuda | como nas [capturas](../evidencias/formulario-2.0/README.md) |

Resultados: registrar aqui, com data, commit homologado e quem testou.
