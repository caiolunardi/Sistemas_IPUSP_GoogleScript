# Central de Ajuda — Painel dos servidores

A Central segue o contrato de [`docs/ajuda/`](../../ajuda/README.md): `PainelAjudaEstilos.html` e `PainelAjudaUI.html` são cópias sem alteração de `shared/ajuda/`; o conteúdo fica em `PainelAjuda.html`. Tudo roda no navegador, sem `google.script.run`.

## Seções

| Id | Título | Conteúdo |
|---|---|---|
| `ajuda-inicio` | Comece aqui | para que serve o painel, atalhos “O que você quer fazer?”, áreas do painel |
| `ajuda-sistemas` | Abrir um sistema | abrir pelo card ou teclado, busca (sensível a acentos), cards “Em breve” |
| `ajuda-pendencias` | Avisos de pendência | o que os selos mostram, quando atualizam, tabela do que cada sistema conta |
| `ajuda-pessoas` | Pessoas do IPUSP | o que é e por que tem esse nome |
| `ajuda-navegacao` | Menu lateral e abas | troca de modo, telas estreitas, teclado |
| `ajuda-aparencia` | Aparência | Sistema, Claro e Escuro, onde a escolha fica guardada |
| `ajuda-configuracoes` | Configurações | o que muda nas planilhas ao salvar, como chegar às telas |
| `ajuda-formularios` | Períodos dos formulários | Sazonal x Contínuo, regras dos semestres, Desativar |
| `ajuda-colacao` | Colação de Grau | período único, semestre da colação |
| `ajuda-exclusao` | Exclusão de Disciplinas | datas de retificação, sem Contínuo |
| `ajuda-regras` | Regras Curriculares | resumo, ordem de trabalho e botões para o manual existente |
| `ajuda-problemas` | Problemas comuns | avisos ausentes, sistema que não abre, busca vazia, erros ao carregar ou salvar, “Você não tem permissão para fazer alterações” (perfil de leitura), aparência não guardada |
| `ajuda-faq` | Perguntas frequentes | 13 perguntas (`painel-faq-*`), entre elas “Somente leitura” e a saudação sem nome |

## Gatilhos contextuais

| Onde | Texto | Abre |
|---|---|---|
| Cabeçalho e menu | Ajuda / Ajuda e perguntas frequentes | `ajuda-inicio` |
| Lista de sistemas | ? Entenda os avisos de pendência | `ajuda-pendencias` |
| Tela de Configurações | ? O que muda quando altero uma configuração | `ajuda-configuracoes` |
| Lista de Formulários | ? Como configurar os períodos dos formulários | `ajuda-formularios` |
| Janela de período (Sazonal/Contínuo) | ? Sazonal ou Contínuo: qual escolher | `ajuda-formularios` |
| Janela da Colação de Grau | ? Como preencher a Colação de Grau | `ajuda-colacao` |
| Janela da Exclusão de Disciplinas | ? Como preencher a Exclusão de Disciplinas | `ajuda-exclusao` |

A Central abre por cima das janelas de período (z-index 10000 sobre 9999). ESC fecha só a Central e devolve o foco ao gatilho. Os botões `data-painel-abrir-manual-regras` fecham a Central e chamam `RegrasCurricularesAjuda.abrir(id)`, sem duplicar o manual.

## Manutenção

Os textos repetem regras do backend (validação de semestres, Contínuo apaga datas, formato do semestre da colação, critérios de contagem). Ao mudar uma dessas regras em `.gs`, atualize a seção correspondente e a tabela de `ajuda-pendencias`. Não acrescente IDs de planilha, URLs de planilha, nomes de funções ou detalhes de implantação ao conteúdo.

Quem não está na lista de acesso não chega à Central: vê só a página `PainelSemAcesso.html`, que diz o motivo e o contato do Serviço de Graduação.
