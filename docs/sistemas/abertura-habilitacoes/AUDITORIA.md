# Auditoria — Gerenciador de Abertura de Habilitações

Desde a **2.1**, o gerenciador registra quem fez o quê, quando e onde, no mesmo modelo do [Painel dos servidores](../../auditoria/README.md): o núcleo [`Auditoria.gs`](../../../shared/auditoria/README.md) é copiado sem mudança e a parte própria do sistema fica em `AuditoriaHabilitacoes.gs` e `AuditoriaHabilitacoesUI.html`. Pedido do responsável em 22/10/2026, com a chave `AUDITORIA_ABERTURA_HABILITACOES` criada por ele no `ID_INDEX`.

## 1. Onde fica

| O quê | Onde |
|---|---|
| Planilha | chave `AUDITORIA_ABERTURA_HABILITACOES` do `ID_INDEX`: coluna `ID de Produção` no projeto de produção, coluna `Homologação` no projeto com `AMBIENTE=homologacao` (outra planilha, só com eventos de teste) |
| Abas | `EVENTOS_<ano>`, `ALTERACOES_<ano>`, `SESSOES`, `RESUMO_DIARIO`, `DICIONARIO`, `LEIA-ME` (formato em [MODELO.md](../../auditoria/MODELO.md)) |
| Quem grava | o próprio gerenciador, com a conta que implantou |
| Quem abre | só a conta institucional do Serviço de Graduação (decisão 5 da [auditoria do painel](../../auditoria/README.md#decisões-20102026), adotada aqui) |

## 2. O que é registrado

Cada linha leva e-mail (da sessão do Google), **nome** (coluna B da aba `GERENCIADOR_HABILITACOES`), **perfil**, sessão, área da tela, navegador, largura da tela, aparência e modo de navegação. O e-mail, o nome e o perfil são lidos pelo servidor; a página não consegue informar outra pessoa.

| Tipo | Eventos | De onde vem |
|---|---|---|
| Acesso | `ACESSO.ABRIR` (com o tempo de carga), `ACESSO.NEGAR` (conta fora da lista ou lista indisponível, na página ou numa chamada), `PERMISSAO.RECUSAR` (LEITOR tentando gravar) | página e servidor |
| Navegação | `TELA.ABRIR` (Pendentes, Concluídos, Relatórios), `NAVEGACAO.MODO`, `TEMA.TROCAR`, `PEDIDO.FECHAR` (tempo com a janela aberta) | página |
| Leitura | `PENDENTES.LISTAR`, `CONCLUIDOS.LISTAR`, `PEDIDO.ABRIR` (Registro ID), `HISTORICO.BUSCAR` (termo e quantos resultados), `RELATORIO.GERAR`, `BUSCA.PENDENTES` (termo do filtro da lista) | servidor; o filtro, pela página |
| Ajuda | `AJUDA.ABRIR`, `AJUDA.BUSCAR` (termo), `AJUDA.FAQ` | página |
| Alteração | `PEDIDO.SALVAR` com **antes e depois de cada célula** (Observações, Situação, Data de Conclusão, E-mail Enviado); `ALUNO.AVISAR` (resultado do e-mail, ligado ao salvamento); `PEDIDO.PREPARAR`; `REGISTRO.MIGRAR` e `REGISTRO.RECUPERAR` (Registro ID e Versão por linha) | servidor |
| Erro | `ERRO.NAVEGADOR` (JavaScript, sem dados de alunos) | página |
| Manutenção | `MANUTENCAO.EXECUTAR`: diagnósticos, preparar e conferir a auditoria, consolidação | servidor |

O pedido é identificado pelo **Registro ID**. Nome, Nº USP e e-mail do aluno **não** são copiados para a auditoria; o Registro ID leva à linha da planilha de respostas. Exceções, que são escolha a confirmar (seção 5): o texto das **observações** antes e depois (em `ALTERACOES`) e os **termos de busca**, que podem ser um nome ou um Nº USP.

Não é registrado: IP (o Apps Script não informa), e-mail do aluno, texto do e-mail de aviso, URLs, IDs de planilhas.

## 3. Regras

- **Se a planilha da auditoria não abrir, nada é gravado**: salvar, avisar, preparar pedido, migração e recuperação são recusados com "A auditoria está indisponível no momento…" (código `AUDITORIA_INDISPONIVEL`), e o texto digitado continua na tela. Consultas, navegação e ajuda continuam, sem registro.
- *Limite (o mesmo do painel):* se a planilha abrir, a alteração for feita e o registro final falhar, a alteração **fica feita sem evento** e só o log de execuções guarda o aviso. Não é uma garantia atômica ([MODELO.md, seção 5](../../auditoria/MODELO.md)).
- Consultas são gravadas **depois** de responder e nunca bloqueiam o uso.
- Só acrescenta linhas; selo encadeado (`seq` + `hash`); abas protegidas; uma escrita por aba sob trava; uma aba por ano.
- A página manda os eventos em lotes de até 50, a cada 10 s (a abertura vai na hora). Com falhas seguidas, espera mais entre as tentativas. Uma conta sem acesso para de enviar.
- O servidor só aceita da página os códigos de origem "navegador".
- Gatilho diário às 2h (`consolidarAuditoriaHabilitacoes`) preenche `SESSOES` e `RESUMO_DIARIO`. Chamado pela página sem ser o gatilho, exige ADMINISTRADOR.
- Nada é apagado automaticamente. Prazo de guarda: **A VALIDAR INSTITUCIONALMENTE**.

## 4. Operação

| Função (editor do Apps Script) | Quando | O que faz |
|---|---|---|
| `prepararAuditoriaHabilitacoes` | uma vez em cada projeto, depois de preencher a chave no `ID_INDEX`; de novo quando o dicionário mudar | cria as abas, reescreve `DICIONARIO` e `LEIA-ME`, apaga a aba vazia da planilha nova e cria o gatilho diário (pede autorização para gatilhos na primeira vez) |
| `verificarIntegridadeAuditoria` | quando quiser conferir | refaz a corrente de hashes e aponta a primeira linha editada, apagada ou inserida à mão |
| `consolidarAuditoriaHabilitacoes` | o gatilho roda sozinho; à mão, se precisar | `SESSOES` e `RESUMO_DIARIO` |
| `diagnosticarConfiguracao` | ao configurar | mostra também se a chave `AUDITORIA_ABERTURA_HABILITACOES` abre (nome da planilha, nunca o ID) |

As quatro exigem ADMINISTRADOR. Passo a passo da instalação: [INSTALACAO_E_ATUALIZACAO.md](INSTALACAO_E_ATUALIZACAO.md#7-auditoria-21); problemas: [MANUAL_OPERACAO.md](MANUAL_OPERACAO.md#8-auditoria).

## 5. Escolhas a confirmar pelo responsável

Seguem a decisão "tudo é registrado" do painel. Cada uma pode ser desligada sem mexer no resto.

| # | Escolha da 2.1 | Alternativa |
|---|---|---|
| 1 | Termos de busca (histórico, filtro de pendentes, Central de Ajuda) são gravados | gravar só a quantidade de resultados |
| 2 | Texto das observações antes e depois vai para `ALTERACOES` | gravar só "alterado" e o tamanho |
| 3 | Abrir as listas (pendentes, concluídos) gera um evento por carregamento | gravar só a abertura de pedidos e as buscas |
| 4 | O e-mail do aluno avisado não é gravado (o Registro ID leva a ele) | gravar o e-mail |

## 6. Testes

`testar_backend.js`, seção AUDITORIA (planilha da auditoria em memória): cada alteração gera o evento com antes e depois; com a planilha indisponível, nada é gravado nem enviado; leitura nunca é bloqueada; a página não troca a pessoa nem manda códigos do servidor; conta sem acesso gera `ACESSO.NEGAR`; homologação grava na planilha de homologação. `testar_navegador.js`: eventos da página, cabeçalho com nome e observação (inclusive nome com `<script>`), salvamento recusado pela auditoria mantém o texto digitado.
