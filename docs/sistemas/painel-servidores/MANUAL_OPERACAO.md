# Manual de operação — Painel dos servidores

Referência de uso, instalação e manutenção do Painel de Sistemas dos servidores. O conteúdo para quem usa o painel está na Central de Ajuda incorporada ([AJUDA.md](AJUDA.md)); este manual é para quem mantém o projeto Apps Script.

## Uso no dia a dia

1. Abra o endereço `/exec` do painel com a conta `@usp.br`. Só abre para quem está na aba `PAINEL_SERVIDORES` ([quem pode usar](README.md#quem-pode-usar-11)).
2. Em **Sistemas**, encontre o card pela categoria ou pela busca e clique nele (ou Tab até ele e Enter). O sistema abre em nova aba.
3. Os selos vermelhos e amarelos mostram pedidos pendentes, contados na abertura da página. Para atualizar, recarregue.
4. Para mudar períodos de formulários ou Regras Curriculares, use **⚙️ Configurações** ou o menu.

### Navegação

| Situação | Comportamento |
|---|---|
| Abertura | Sempre no **Menu lateral**, com **Sistemas** destacado. |
| Abas | O botão **Abas**, em Navegação, leva os mesmos itens para uma faixa acima do conteúdo. Trocar de modo não recarrega listas nem fecha janelas abertas. |
| Tela até 900 px | O menu fica acima do conteúdo, recolhido; **Mostrar menu** abre, e escolher uma área recolhe de novo. |
| Teclado | Tab e Enter em todos os itens e cards; nas abas, setas, Home e End. |
| Regras Curriculares com ruleset aberto | Voltar a Regras pelo menu mantém o editor aberto, com o que já foi digitado. |

### Formulários

| Tipo | Regra ao salvar |
|---|---|
| Contínuo | Datas e horários dos dois semestres são apagados. |
| Sazonal | Cada semestre completo (abertura e encerramento, data e hora) ou totalmente vazio; pelo menos um completo. Semestre vazio é apagado. |
| Colação de Grau | Período único, todos os campos obrigatórios; semestre `AAAAS` ou `AAAA/S`, terminando em 1 ou 2, gravado como `AAAA/S`. |
| Exclusão de Disciplinas | Como Sazonal, mais início e fim da retificação de matrícula em cada semestre usado. Sem Contínuo. |
| Desativar | Apaga todos os campos de período do formulário; ele fica fechado e continua na lista. |

As Regras Curriculares têm manual próprio, aberto pelo botão **❓ Manual e FAQ** da tela ou pela Central de Ajuda.

### Mensagens e o que fazer

| Mensagem ou sintoma | Causa provável | O que fazer |
|---|---|---|
| Card sem selo, mas há pedidos | A contagem daquele sistema falhou e devolveu 0 (planilha, aba ou título de coluna mudou; conta que executa sem acesso). | Conferir os `ID_PLANILHA_*`, nomes de aba e títulos em `Code.gs`, e os registros de execução de `obterContadoresPendencias`. |
| “Não consegui carregar os formulários: ...” | Planilha de períodos indisponível ou `ID_PLANILHA_PERIODOS` errado. | Conferir o ID em `ConfigFormulariosCore.gs` e o acesso da conta que executa. |
| “Esse formulário mudou de posição na planilha de Períodos...” | A ordem das linhas mudou depois que a lista foi aberta. | Reabrir Formulários e repetir. |
| “Não consegui carregar os rulesets: ...” | Planilha de Regras indisponível ou aba ausente. | Conferir `ConfigRegrasCurricularesRepository.gs`. |
| "Sem acesso a este painel" | O e-mail não está na aba `PAINEL_SERVIDORES`, ou está com erro de digitação. | Incluir ou corrigir na aba; vale em até 1 minuto. |
| "Conta não identificada" | A pessoa não está com a conta `@usp.br` ativa no navegador. | Entrar com a conta `@usp.br` (ou abrir numa janela só com ela). |
| "Não foi possível abrir o painel" para todos | A lista de acesso não pôde ser lida: falta a propriedade `ID_INDEX_SPREADSHEET_ID`, a chave `PERMISSOES_DE_ACESSO` no `ID_INDEX`, a aba `PAINEL_SERVIDORES`, ou os títulos de C/E mudaram. O painel fica fechado de propósito. | Ver o motivo em **Execuções** (`doGet`) e rodar `diagnosticarAcessoPainel` como administrador. |
| Saudação sem nome ("Bom dia", só) | O e-mail da conta não está em `SERVIDORES` nem em `PLANILHA_DOCENTES` (nem como e-mail secundário), ou um desses cadastros não abriu. A página funciona normalmente. | Incluir ou corrigir o e-mail no cadastro (Comunidade IPUSP); vale em até 10 minutos. Falha de leitura aparece em **Execuções** como "Saudação: cadastro ... não lido". |
| Nome errado na saudação | O cadastro tem NOME, TIPO ou M / F diferentes do esperado. | Corrigir no cadastro: TIPO = SETOR mostra o nome inteiro; M / F define Prof./Profª. |
| "Você não tem permissão para fazer alterações" | Perfil `LEITOR`, vazio ou desconhecido. | Se a pessoa deve alterar, mudar o Perfil para `ADMINISTRADOR`. |
| "A auditoria está indisponível no momento, então nada foi alterado" | A planilha da auditoria não abriu: chave `AUDITORIA_PAINEL_SERVIDORES` ausente ou vazia no `ID_INDEX`, planilha apagada ou sem acesso da conta que executa. Nenhuma alteração passa até resolver. | Ver o motivo em **Execuções** ("Auditoria indisponível: ..."), corrigir a chave ou o acesso e rodar `prepararAuditoriaPainel`. |
| `verificarIntegridadeAuditoria` devolve `ok: false` | Alguém editou, apagou, ordenou ou inseriu linhas à mão na planilha da auditoria. | Não corrija a linha: anote a aba, a linha e o `seq` apontados, veja o **Histórico de versões** da planilha para saber quem e quando, e siga [incidentes](../../seguranca/INCIDENTES.md). A corrente continua valendo daí para a frente. |
| Abas `SESSOES`/`RESUMO_DIARIO` paradas | O gatilho diário não existe ou falhou. | Em **Acionadores**, conferir `consolidarAuditoriaPainel`; se faltar, rodar `prepararAuditoriaPainel`. Rodar `consolidarAuditoriaPainel` à mão completa os dias atrasados sem duplicar. |
| Todos os cards aparecem como "Em breve" | Propriedade `URLS_SISTEMAS_EQUIPE` ausente ou com JSON inválido. | Rodar `diagnosticarUrlsSistemas` e corrigir a propriedade. |
| Página em branco com erro `urlsSistemasParaPagina_` | Falta o arquivo `UrlsSistemas.gs` no projeto. | Criar o arquivo (passo 2a de "Instalar ou atualizar"). |
| Página em branco ou sem estilo | Arquivo HTML faltando ou com nome diferente. | Conferir os nomes exatos (abaixo). `include_` falha se o arquivo não existir. |

## Instalar ou atualizar

O commit no Git não altera o Apps Script. Para levar esta versão ao Google:

1. **Cópia de segurança.** No editor do projeto, faça uma cópia (**Visão geral → Fazer uma cópia**) ou guarde o conteúdo dos arquivos atuais.
2. **Desde a 1.4, o projeto recebe todos os arquivos de `src/` como estão**, de preferência pelo clasp a partir da pasta do repositório ([desenvolvimento local](../../../DEVELOPMENT_LOCAL.md)). Nenhum arquivo tem ID para recolocar. Até a 1.3, os `.gs` do Git tinham marcadores no lugar dos IDs e os do projeto precisavam ser mantidos.
2e. **Planilhas pelo `ID_INDEX` (1.4).** Antes de enviar o código, confira na primeira aba do `ID_INDEX` (colunas "Chave" e "ID de Produção") as nove chaves de dados: `EMISSAO_DIPLOMAS`, `ABERTURA_HABILITACOES`, `SEGUNDA_VIA_BUSP`, `MATRICULA_INTERCAMBISTAS` (criadas para o painel em 20/10/2026) e `TRANCAMENTO_TOTAL_MATRICULA`, `TRANCAMENTO_PARCIAL_MATRICULA`, `EXCLUSAO_DISCIPLINAS`, `PERIODOS`, `REGRAS_CURRICULARES` (as mesmas dos formulários e do Painel dos alunos). Depois do envio, rode `diagnosticarPlanilhasPainel` no editor: cada uma das 13 chaves deve aparecer como `ok: <nome da planilha>`. Uma `FALHA` diz qual chave falta; o card dela mostra o aviso de erro de contagem, e as Configurações de Formulários ou Regras não abrem se faltar `PERIODOS` ou `REGRAS_CURRICULARES`. Chave criada ou corrigida vale em até 10 minutos (ou na hora, rodando o diagnóstico de novo).
2b. **Controle de acesso (1.1).** Antes de tudo, inclua na aba `PAINEL_SERVIDORES` todas as pessoas da equipe que usam o painel, com `ADMINISTRADOR` para quem altera períodos ou Regras; quem não estiver na aba deixa de abrir o painel. Crie os arquivos `AcessoPainel` (script) e `PainelSemAcesso` (HTML) com o conteúdo de `src/`, e acrescente a linha `exigirAcessoPainel_();` ou `exigirAdminPainel_();` no início de cada função pública, como nos `.gs` do Git (o teste `testar_acesso.js` lista quais). Confirme a propriedade `ID_INDEX_SPREADSHEET_ID`. Em **Implantar → Gerenciar implantações**, o acesso deve ser **Qualquer pessoa da USP**. Rode `diagnosticarAcessoPainel` e autorize: ele mostra quantas pessoas há por perfil, sem e-mails. 
2c. **Saudação (1.2).** Crie o arquivo de script `SaudacaoPainel` com o conteúdo de `src/SaudacaoPainel.gs`, e atualize `AcessoPainel` e `Painel`. Usa as chaves `SERVIDORES` e `PLANILHA_DOCENTES` do `ID_INDEX`, que já existem; não há propriedade nova.
2d. **Auditoria (1.3).** Antes de enviar o código:
   - crie uma planilha nova na conta do Serviço de Graduação, **sem compartilhar**, e registre o ID na chave `AUDITORIA_PAINEL_SERVIDORES` do `ID_INDEX` (coluna "ID de Produção");
   - crie os arquivos `Auditoria` e `AuditoriaPainel` (script) e `AuditoriaPainelUI` (HTML), e atualize os demais pelo clasp (as funções que gravam passaram para `AuditoriaPainel.gs`; as originais ganharam `SemAuditoria_` no nome);
   - no editor, rode `prepararAuditoriaPainel` e autorize (ele pede permissão para gatilhos): cria as abas, o `DICIONARIO` e o `LEIA-ME`, apaga a `Página1` vazia e instala o gatilho diário `consolidarAuditoriaPainel` (2h). Pode rodar de novo; só reescreve `DICIONARIO` e `LEIA-ME`;
   - no `/dev`, abra o painel, clique num card, salve um formulário de teste e confira as linhas em `EVENTOS_<ano>` e `ALTERACOES_<ano>`; depois rode `verificarIntegridadeAuditoria` (deve dar `ok: true`).
   Sem a chave ou com a planilha inacessível, **as alterações são recusadas** (ver e navegar continuam).
2a. **Endereços dos sistemas (desde 20/10/2026).** Crie o arquivo de script `UrlsSistemas` (**+ → Script**) e cole o conteúdo de [`src/UrlsSistemas.gs`](../../../sistemas/painel-servidores/src/UrlsSistemas.gs). Em **Configurações do projeto → Propriedades do script**, crie `URLS_SISTEMAS_EQUIPE` com um JSON de uma linha, uma chave por card (`PESSOAS_IPUSP`, `EMISSAO_DIPLOMAS`, `GERENCIADOR_HABILITACOES`, `GERENCIADOR_TRANCAMENTO_TOTAL`, `GERENCIADOR_TRANCAMENTO_PARCIAL`, `GERENCIADOR_BUSP`, `GERENCIADOR_INTERCAMBISTAS`, `GERENCIADOR_EXCLUSAO_DISCIPLINAS`, `CONFIGURACOES_GRADE_HORARIA`), cada uma com a URL `/exec` do sistema. Rode `diagnosticarUrlsSistemas` no editor: ele diz quais chaves faltam, sem mostrar as URLs. Card cuja URL falta aparece como **Em breve**. Não registre as URLs no Git.
3. **Substitua o conteúdo** destes seis arquivos HTML pelos de [`sistemas/painel-servidores/src`](../../../sistemas/painel-servidores/src):
   `Painel`, `ConfigHomeUI`, `ConfigFormulariosUI`, `ConfigRegrasCurricularesUI`, `ConfigRegrasCurricularesEstilos`, `ConfigRegrasCurricularesAjudaEstilos`.
   O pacote recebido tinha `ConfirHomeUI.html`, mas `Painel` inclui `ConfigHomeUI`. Use no projeto o nome que `Painel` inclui: `ConfigHomeUI`.
4. **Crie os dez arquivos novos** (**+ → HTML**), com os nomes exatos e sem extensão, e cole o conteúdo de cada um:
   `GradipTema`, `GradipTemaControle`, `GradipMarcaIPUSP`, `GradipMarcaUSP`, `PainelAjuda`, `PainelAjudaEstilos`, `PainelAjudaUI`, `PainelNavegacaoEstilos`, `PainelNavegacaoUI`, `PainelIcones`.
5. `ConfigRegrasCurricularesAjuda` não muda.
6. **Teste pela URL `/dev`** (**Implantar → Testar implantações**) e confira:
   - com uma conta ADMINISTRADOR, salvar um formulário de teste funciona; com uma conta LEITOR, o aviso "Somente leitura" aparece e Salvar devolve "Você não tem permissão…"; com uma conta fora da aba, aparece "Sem acesso a este painel";
   - a saudação mostra o período certo e o seu nome (ou o do setor);
   - abre no menu lateral; **Abas** e **Menu lateral** alternam;
   - **Aparência** em Sistema, Claro e Escuro; a marca IPUSP e a USP trocam de versão;
   - os selos de pendência aparecem como antes;
   - **Pessoas do IPUSP** abre a busca de alunos;
   - Formulários: abrir, salvar e cancelar um formulário de teste; Colação e Exclusão abrem;
   - Regras Curriculares: lista, abrir um ruleset, **❓ Manual e FAQ**;
   - **Ajuda** e os `?` abrem a seção certa; ESC fecha;
   - no celular, o menu recolhido e a página sem rolagem lateral.
7. **Publique**: **Implantar → Gerenciar implantações → editar a implantação existente → Versão: Nova versão → Implantar**. A URL `/exec` continua a mesma.
8. Registre a data e o resultado em [HOMOLOGACAO.md](HOMOLOGACAO.md).

Para voltar atrás, edite a implantação e escolha a versão anterior.

## Manutenção

- **Novo card:** acrescente um objeto ao array `SISTEMAS` em `Painel.html` (`categoria`, `nome`, `descricao`, `icone`, `url`, `ativo`, e opcionalmente `chaveContador`/`chavesContador`). Se tiver contagem, a função correspondente fica em `Code.gs`. Atualize a tabela de `ajuda-pendencias` em `PainelAjuda.html`.
- **Pessoas do IPUSP:** quando a consulta de docentes e servidores existir no mesmo sistema, ajuste só a `descricao` do card e a seção `ajuda-pessoas`. O nome do card não muda.
- **Tema e ajuda comuns:** `GradipTema*`, `GradipMarca*` e `PainelAjudaEstilos`/`PainelAjudaUI` são cópias de arquivos comuns. Atualize-os a partir de `shared/` e da Busca de Alunos, sem editar só aqui.
- **Cores:** use os tokens `--gradip-*`. Não acrescente cores fixas.
- **IDs de planilha:** nunca envie os valores reais para o Git. Ver [DADOS_E_SEGURANCA.md](DADOS_E_SEGURANCA.md).
- **Nova função chamada pela página:** a primeira linha deve ser `exigirAcessoPainel_();` (só lê) ou `exigirAdminPainel_();` (grava). `testar_acesso.js` falha se faltar.
- **Nova função que grava:** além da guarda, ela fica em `AuditoriaPainel.gs` e chama `alteracaoPainel_` com um código novo em `AUDITORIA_EVENTOS_PAINEL` e um `estado` (o que ler antes e depois); o corpo vai para `<nome>SemAuditoria_`. `testar_acesso.js` confere as que estão na lista `ESCRITA`. Novo evento da página: código com origem `navegador` no dicionário e chamada em `AuditoriaPainelUI.html`. Depois, rode `prepararAuditoriaPainel` para atualizar o `DICIONARIO`. Passo a passo em [docs/auditoria/MODELO.md](../../auditoria/MODELO.md).
- **Conferir a auditoria:** `verificarIntegridadeAuditoria` no editor, de tempos em tempos e sempre antes de usar a auditoria como prova de algo.
- **Testes:** `node sistemas/painel-servidores/testes/testar_acesso.js`, `node sistemas/painel-servidores/testes/testar_saudacao.js`, `node sistemas/painel-servidores/testes/testar_auditoria.js` e `node sistemas/painel-servidores/testes/testar_navegador.js` antes de publicar.
