# Manual de operação — Painel dos servidores

Referência de uso, instalação e manutenção do Painel de Sistemas dos servidores. O conteúdo para quem usa o painel está na Central de Ajuda incorporada ([AJUDA.md](AJUDA.md)); este manual é para quem mantém o projeto Apps Script.

## Uso no dia a dia

1. Abra o endereço `/exec` do painel.
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
| Todos os cards aparecem como "Em breve" | Propriedade `URLS_SISTEMAS_EQUIPE` ausente ou com JSON inválido. | Rodar `diagnosticarUrlsSistemas` e corrigir a propriedade. |
| Página em branco com erro `urlsSistemasParaPagina_` | Falta o arquivo `UrlsSistemas.gs` no projeto. | Criar o arquivo (passo 2a de "Instalar ou atualizar"). |
| Página em branco ou sem estilo | Arquivo HTML faltando ou com nome diferente. | Conferir os nomes exatos (abaixo). `include_` falha se o arquivo não existir. |

## Instalar ou atualizar

O commit no Git não altera o Apps Script. Para levar esta versão ao Google:

1. **Cópia de segurança.** No editor do projeto, faça uma cópia (**Visão geral → Fazer uma cópia**) ou guarde o conteúdo dos arquivos atuais.
2. **Não toque nos `.gs` que já existem nem no `appsscript.json`.** Os arquivos do Git têm marcadores no lugar dos IDs reais; os do projeto já estão corretos e não mudaram em comportamento. A exceção é o arquivo novo `UrlsSistemas.gs` (passo 2a).
2a. **Endereços dos sistemas (desde 20/10/2026).** Crie o arquivo de script `UrlsSistemas` (**+ → Script**) e cole o conteúdo de [`src/UrlsSistemas.gs`](../../../sistemas/painel-servidores/src/UrlsSistemas.gs). Em **Configurações do projeto → Propriedades do script**, crie `URLS_SISTEMAS_EQUIPE` com um JSON de uma linha, uma chave por card (`PESSOAS_IPUSP`, `EMISSAO_DIPLOMAS`, `GERENCIADOR_HABILITACOES`, `GERENCIADOR_TRANCAMENTO_TOTAL`, `GERENCIADOR_TRANCAMENTO_PARCIAL`, `GERENCIADOR_BUSP`, `GERENCIADOR_INTERCAMBISTAS`, `GERENCIADOR_EXCLUSAO_DISCIPLINAS`, `CONFIGURACOES_GRADE_HORARIA`), cada uma com a URL `/exec` do sistema. Rode `diagnosticarUrlsSistemas` no editor: ele diz quais chaves faltam, sem mostrar as URLs. Card cuja URL falta aparece como **Em breve**. Não registre as URLs no Git.
3. **Substitua o conteúdo** destes seis arquivos HTML pelos de [`sistemas/painel-servidores/src`](../../../sistemas/painel-servidores/src):
   `Painel`, `ConfigHomeUI`, `ConfigFormulariosUI`, `ConfigRegrasCurricularesUI`, `ConfigRegrasCurricularesEstilos`, `ConfigRegrasCurricularesAjudaEstilos`.
   O pacote recebido tinha `ConfirHomeUI.html`, mas `Painel` inclui `ConfigHomeUI`. Use no projeto o nome que `Painel` inclui: `ConfigHomeUI`.
4. **Crie os dez arquivos novos** (**+ → HTML**), com os nomes exatos e sem extensão, e cole o conteúdo de cada um:
   `GradipTema`, `GradipTemaControle`, `GradipMarcaIPUSP`, `GradipMarcaUSP`, `PainelAjuda`, `PainelAjudaEstilos`, `PainelAjudaUI`, `PainelNavegacaoEstilos`, `PainelNavegacaoUI`, `PainelIcones`.
5. `ConfigRegrasCurricularesAjuda` não muda.
6. **Teste pela URL `/dev`** (**Implantar → Testar implantações**) e confira:
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
- **Testes:** `node sistemas/painel-servidores/testes/testar_navegador.js` antes de publicar uma mudança de interface.
