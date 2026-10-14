# Verificação 1.11.0 — nome de quem aparece na auditoria

**Estado:** verificada localmente em 14/10/2026 (simulador de Apps Script + Chromium, dados fictícios); **implantação e homologação no Google pendentes**.

## Pedido e decisões (responsável funcional, 14/10/2026)

- A auditoria continua gravando o e-mail; o painel mostra **nome e e-mail**, com o nome em destaque e, embaixo, o setor (servidores), "Docente" ou "Aluno(a)" e o e-mail.
- Ordem de busca, pela chave no `ID_INDEX`, primeira aba, títulos na linha 1:
  1. `SERVIDORES`: A e-mail, B nome, C setor;
  2. `PLANILHA_DOCENTES`: D e-mail, B nome;
  3. `PLANILHA_ALUNOS`: D e-mail ou E (e-mail secundário), B nome.
- Fora dos três: **"Pessoa não cadastrada com acesso"**, com o e-mail embaixo e selo "Atenção".
- Comparação de e-mail sem maiúsculas e sem espaços nas pontas; a busca das edições também acha pelo nome.

Decisão técnica, sem mudar o pedido: se um cadastro não abre (chave ausente, sem acesso), quem não foi achado nos outros aparece como **"nome não verificado"** (com o e-mail) e o painel mostra o aviso "Nomes incompletos", em vez de chamar a pessoa de "não cadastrada" sem ter consultado tudo. Eventos do sistema continuam como "Sistema".

## Arquivos

| Arquivo | SHA-256 | Mudança |
|---|---|---|
| `AuditoriaPainel.gs` | `efd18b0fd3230c530fc6ed205f88291064471d859fbb6c46cac8af1e8256ccaa` | `PESSOAS_AUDITORIA`, `identificarPessoas_`, `lerCadastroDePessoas_`, `diagnosticarNomesAuditoria`; `obterAuditoriaGrade` devolve `identificacao` |
| `PainelAuditoria.html` | `859ff8fcec03df293d7627d0234419e6feb7fbfc941584d3b043f5dca247e944` | pessoa (nome, vínculo, e-mail) na última edição, "Marcada por", gráficos, filtro, coluna Quem e busca; aviso "Nomes incompletos" |
| `PainelEstilos.html` | `d017b60fef526521f1513d1ab1705954ac13b0b96d165042d16955aa4c2de4ca` | `.pessoaAud*`, `.seloPessoaNaoCadastrada` (tokens de perigo), `.graficoBarras__quem`; rótulo do gráfico em coluna |
| `EstruturaAjuda.html` | `5147e148a96badf9d454e8461c3ed1f94f7991a2e1afd52518427c15bbdb176f` | item `ajuda-auditoria-pessoas`; busca menciona nome |
| `Codigo.gs` | `a5035ea70fa75154dc75fc794a2e5375a263cb2c8f2eadadd76cbcb473b9084d` | `VERSAO_SISTEMA = '1.11.0'` |

Os outros 29 arquivos do Web App não mudaram. Funções de envio, auditoria (gravação), preparação e importação: byte-idênticas.

## Testes

Ambiente: Node 22, Playwright 1.56.1/Chromium, simulador `mockGoogle.js` (ganhou `getAll`/`putAll` no cache e `criarCadastrosPessoas`, com cadastros fictícios). Os arquivos do Júpiter **não** estão no Git; esta rodada usou um CSV fictício no mesmo formato (36 disciplinas inventadas), também não versionado.

| Suíte | Resultado | Observação |
|---|---|---|
| `testar_painel_auditoria.js` | **25/25** | 19 anteriores + 6 novos (abaixo) |
| `testar_auditoria_grade.js` | 19/19 | regressão da gravação da auditoria |
| `testar_etapa9_auditoria_envio.js` | 8/8 | inclui `obterAuditoriaGrade` para admin e leitor |
| `testar_etapa7_trava_auditoria.js` | 19/19 | |
| `testar_ajuda.js` | 50/50 | Central de Ajuda com o item novo |
| `testar_navegacao_visual.js` | 21/21 | |
| `testar_envio_grade.js` | 1/32 | **não conclusivo**: depende de disciplinas do CSV real (ex.: PST0391); a fonte anterior (1.10.0) dá o mesmo 1/32 com o CSV fictício. O envio não foi alterado. |

Novos casos:

1. Servidor vence docente homônimo; docente com e-mail em maiúsculas e espaços no cadastro; aluno pelo e-mail secundário; e-mail fora dos três → `nao_cadastrado`; pessoas do cadastro que não aparecem na auditoria e IDs não vão ao navegador.
2. `PLANILHA_ALUNOS` sem chave: não é procurada quando todos já foram achados (sem aviso); com alguém faltando, a pessoa fica sem confirmação e `indisponiveis = ['alunos']`; o registro de execução não tem e-mail nem ID; com a chave de volta, a pessoa é confirmada como não cadastrada.
3. Nenhum cadastro configurado: o painel abre, os três cadastros no aviso, o resto da auditoria intacto.
4. Cache de 10 min: a segunda leitura não depende dos cadastros.
5. `diagnosticarNomesAuditoria`: títulos das colunas usadas e número de linhas, sem nomes, e-mails nem IDs; recusa leitor.
6. Chromium: "Pessoa não cadastrada com acesso" + "Atenção" + e-mail, dica com o nome; aviso "Nomes incompletos" e "nome não verificado".

Nos testes existentes, conferido também: nome/vínculo/e-mail nos gráficos, na última edição e em "Marcada por"; filtro de pessoa pelo nome (valor = e-mail); busca pelo nome e pelo setor; coluna Quem com o nome. Visual 360/768/1280 px, claro e escuro: sem rolagem horizontal e contraste ≥ 4,5:1, agora incluindo `.pessoaAud__nome`, `.pessoaAud__detalhe`, `.graficoBarras__quem` e o selo "Atenção" (menor valor da seção: 5,01:1, inalterado).

## Para homologar

1. Atualizar como em [Instalação](INSTALACAO_E_ATUALIZACAO.md#atualizar-um-web-app-1100-para-1110).
2. `diagnosticarNomesAuditoria`: os três cadastros com `aberta: true` e os títulos esperados.
3. No `/dev`, Auditoria da grade: uma secretaria conhecida aparece com nome, setor e e-mail; um docente com "Docente"; um e-mail fora dos cadastros (ex.: uma conta de teste que abra a planilha) como "Pessoa não cadastrada com acesso".
4. Registrar aqui data, versão da implantação e resultado.
