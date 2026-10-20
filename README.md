# Sistemas IPUSP — Google Apps Script

Código e documentação dos sistemas web que o **Serviço de Graduação do Instituto de Psicologia da USP** mantém em Google Apps Script: os formulários e o painel usados pelos alunos de graduação, as ferramentas internas da equipe e os padrões visuais, de ajuda e de segurança que todos seguem.

O repositório é público para que a comunidade do IPUSP (alunos, docentes, servidores e comissões) possa consultar como os sistemas funcionam, e para que outros setores possam reaproveitar o que for útil.

## O que você encontra aqui

- **O que cada sistema faz, para quem e em que estado está** ([catálogo](docs/SISTEMAS.md)).
- **Como cada sistema trata os dados pessoais**: cada um tem um `DADOS_E_SEGURANCA.md` com o que é lido, gravado e mostrado.
- **O código-fonte** de cada Web App, com testes locais que usam só dados fictícios.
- **Os padrões comuns**: identidade visual GRADIP (claro, escuro e sistema), Central de Ajuda e regras de segurança e privacidade.

O que **não** está aqui, de propósito: dados de alunos ou servidores, IDs de planilhas e pastas do Drive, endereços internos de implantação e qualquer credencial. Os sistemas leem essas informações de configurações guardadas só no Google (Script Properties e o índice mestre `ID_INDEX`). Detalhes em [Repositório público](docs/seguranca/REPOSITORIO_PUBLICO.md).

## Sistemas

### Para os alunos

| Sistema | O que faz | Documentação |
|---|---|---|
| Painel de Solicitações | Página de entrada dos alunos: reúne os formulários por categoria, mostra se cada um está aberto, a contagem de créditos para formatura, a grade horária e o atendimento online pelo WhatsApp. | [docs](docs/sistemas/painel-solicitacoes/README.md) · [código](sistemas/painel-solicitacoes/README.md) |
| Grade Horária visual | Grade do curso de Psicologia por semestre, com dia, horário, docentes e sala; grades anteriores e exportação em PDF. | [docs](docs/sistemas/grade-horaria-visual/README.md) · [código](sistemas/grade-horaria-visual/README.md) |
| Exclusão de Disciplinas | Pedido de exclusão de matrícula em disciplinas do semestre, com recibo por e-mail. | [docs](docs/sistemas/exclusao-disciplinas/README.md) · [código](sistemas/exclusao-disciplinas/README.md) |
| Trancamento Parcial de Matrícula | Pedido de trancamento em disciplinas específicas, com recibo por e-mail. | [docs](docs/sistemas/trancamento-parcial/README.md) · [código](sistemas/trancamento-parcial/README.md) |
| Trancamento Total de Matrícula | Pedido de trancamento total, com recibo e aviso de pedido pendente. | [docs](docs/sistemas/trancamento-total/README.md) · [código](sistemas/trancamento-total/README.md) |

Os formulários só aceitam quem está logado com uma conta `@usp.br`, e o e-mail gravado no pedido é sempre o do login.

### Para a equipe do Serviço de Graduação

| Sistema | O que faz | Documentação |
|---|---|---|
| Painel de Sistemas (servidores) | Entrada da equipe: abre os sistemas internos, mostra os pedidos pendentes e configura os períodos dos formulários e as Regras Curriculares. | [docs](docs/sistemas/painel-servidores/README.md) · [código](sistemas/painel-servidores/README.md) |
| Estrutura Curricular e Grade Horária | Importa a estrutura curricular do Júpiter, prepara a grade horária, envia a planilha para as secretarias dos departamentos e audita o preenchimento. | [docs](docs/sistemas/estrutura-curricular/README.md) · [código](sistemas/estrutura-curricular/README.md) |
| Planilha das secretarias | Validações da planilha que as secretarias preenchem (conflito de horário, modalidade prática) e proteção para que só e-mails autorizados editem. | [código](sistemas/estrutura-curricular/planilha-grade/README.md) |
| Comunidade IPUSP | Busca de alunos, docentes, servidores e setores por nome, nº USP ou e-mail, com ficha e exportação de listas. | [docs](docs/sistemas/busca-alunos/README.md) · [código](sistemas/busca-alunos/README.md) |
| Gerenciador de Trancamento Total | Tratamento dos pedidos de trancamento total pela equipe. | [código](sistemas/trancamento-total/gerenciador/README.md) |

Ideia em desenvolvimento, ainda sem código: [Gerenciador de Ofícios e Modelos](docs/sistemas/gerenciador-oficios/README.md).

Cada sistema registra no próprio README a versão que está no repositório e se ela já foi implantada. **O código daqui não atualiza os sistemas sozinho**: a equipe copia os arquivos para o projeto no Google e publica uma nova versão.

## Como usar este repositório

**Para entender um sistema:** comece pelo README da pasta `docs/sistemas/<sistema>/`. O `MANUAL_OPERACAO.md` explica o uso no dia a dia, o `AJUDA.md` traz o mesmo conteúdo da Central de Ajuda da tela e o `DADOS_E_SEGURANCA.md` diz quais dados o sistema usa.

**Para reaproveitar em outro setor:** veja [Como reaproveitar](docs/COMO_REAPROVEITAR.md). Em resumo, cada sistema é um projeto Apps Script independente: você cria o projeto, copia os arquivos de `src/`, aponta as configurações (Script Properties e `ID_INDEX`) para as suas planilhas e testa com dados fictícios no ambiente de homologação antes de publicar.

**Para rodar os testes locais:** cada sistema tem uma pasta `testes/` com instruções. Os testes usam Node.js e, os de tela, Playwright com Chromium. Nenhum teste acessa planilhas reais ou a internet.

## Padrões comuns

Antes de alterar a interface de qualquer sistema, leia:

- [`docs/UX_DESIGN_SYSTEM.md`](docs/UX_DESIGN_SYSTEM.md): identidade visual, claro/escuro, componentes, acessibilidade e responsividade;
- [`docs/UX_COMPONENT_RECIPES.md`](docs/UX_COMPONENT_RECIPES.md): receitas de componentes;
- [`docs/THEME_IMPLEMENTATION.md`](docs/THEME_IMPLEMENTATION.md): contrato técnico do tema;
- [`docs/UX_CHECKLIST.md`](docs/UX_CHECKLIST.md): checklist de homologação visual;
- [`docs/ajuda/README.md`](docs/ajuda/README.md): Central de Ajuda, busca, FAQ e ajuda contextual;
- [`docs/seguranca/README.md`](docs/seguranca/README.md): segurança, privacidade, LGPD e configuração segura;
- [`CLAUDE.md`](CLAUDE.md): instruções para agentes de código.

Base reutilizável:

- `shared/GradipTema.html` e `shared/GradipTemaControle.html`: tema Claro/Escuro/Sistema;
- `shared/ajuda/`: Central de Ajuda de referência;
- `shared/seguranca/`: exemplo de configuração segura sem valores de produção;
- `assets/ipusp/` e `assets/usp/`: marcas IPUSP e USP para fundo claro e escuro, com procedência.

## Princípios

1. **Regra de negócio e UX são camadas separadas.** Mudança visual não altera backend, planilha, e-mails, validações nem fluxo de dados.
2. **Tema padrão = Sistema.** O navegador segue `prefers-color-scheme`, salvo escolha explícita do usuário.
3. **Claro e Escuro são equivalentes.** Nenhuma ação, informação ou estado existe em apenas um tema.
4. **Identidade IPUSP preservada.** Sem redesenhar, deformar ou aplicar filtros à marca.
5. **Acessibilidade é requisito.** Contraste, foco, teclado, alvo de toque e semântica.
6. **Mobile primeiro.** Validar ao menos 360, 390, 480, 768 px e desktop.
7. **Sem dependências desnecessárias.** HTML, CSS e JS nativos do Apps Script.
8. **Tokens antes de exceções.** Componentes novos usam os tokens compartilhados.
9. **Ajuda é parte do produto.** O conteúdo reflete só as regras reais de cada sistema.
10. **Documentação a partir do código real**, um sistema de cada vez.
11. **Privacidade por padrão.** Dados pessoais, credenciais e identificadores de produção não entram no repositório.
12. **Git não é cofre, e este repositório é público.** Tudo o que entra aqui pode ser lido por qualquer pessoa, inclusive o histórico. A proteção dos sistemas vem do login USP, da autorização no servidor e do compartilhamento das planilhas, nunca de um endereço "escondido".

## Segurança e contato

Achou um dado pessoal, uma credencial ou uma falha de segurança? **Não abra issue pública.** Siga [`SECURITY.md`](SECURITY.md).

Dúvidas sobre os pedidos e formulários: Serviço de Graduação do IPUSP, pelo e-mail `gradip@usp.br` ou pelo atendimento online do Painel de Solicitações.

## Licença

**A DEFINIR INSTITUCIONALMENTE.** Enquanto não houver uma licença neste repositório, o código pode ser lido e estudado, mas o reaproveitamento por outros setores deve ser combinado com o Serviço de Graduação do IPUSP. Os ícones Lucide seguem a licença indicada em cada `LICENCA_ICONES.txt`, e as marcas IPUSP e USP seguem as regras de [`assets/ipusp/README.md`](assets/ipusp/README.md) e [`assets/usp/README.md`](assets/usp/README.md).
