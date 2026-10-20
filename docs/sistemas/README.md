# Sistemas específicos — roteiro de documentação

Esta pasta é reservada à documentação individual dos Web Apps e módulos do Serviço de Graduação do IPUSP.

## Regra de origem

Nenhum sistema deve ser documentado por memória aproximada ou inferência. Antes de criar uma pasta: obter baseline atual, identificar produção/homologação, separar implementação/regras/UX, registrar dependências e validar contra o código/fluxo real.

## Preflight obrigatório de segurança

Antes de copiar qualquer código para este repositório:
1. remover/abstrair segredos e credenciais;
2. substituir IDs operacionais reais por chaves de configuração quando não forem deliberadamente públicos;
3. remover dados pessoais reais, logs, fixtures e screenshots de produção;
4. identificar o modelo de acesso/execução do Web App;
5. criar `DADOS_E_SEGURANCA.md` a partir de `docs/seguranca/SYSTEM_SECURITY_TEMPLATE.md`;
6. executar `docs/seguranca/SECURITY_CHECKLIST.md`;
7. pôr na pasta `src/` o `.claspignore` padrão e deixar o `.clasp.json` fora do Git ([desenvolvimento local](../../DEVELOPMENT_LOCAL.md)).

## Estrutura sugerida

```text
sistemas/
  nome-do-sistema/
    README.md
    ARQUITETURA.md
    FLUXOS.md
    REGRAS.md
    UX.md
    AJUDA.md
    DADOS_E_SEGURANCA.md
    HOMOLOGACAO.md
```

Sistemas pequenos podem concentrar tudo no `README.md`, mas a seção de dados/segurança continua obrigatória quando houver tratamento de dados ou configuração de produção. Diretrizes universais de visual, ajuda e segurança permanecem em `docs/` e não devem ser duplicadas.

## Sistemas documentados

- [Painel de Solicitações dos alunos](painel-solicitacoes/README.md) — interface v1.2 aceita em 25/09/2026; v1.3/v1.4 implantadas em 15/10/2026 (menu lateral, [contagem de créditos](painel-solicitacoes/CONTAGEM_DE_CREDITOS.md), grade horária); fonte v1.5 com Atendimento online pelo WhatsApp, ainda não implantada; [código sanitizado](../../sistemas/painel-solicitacoes/README.md); [evidências e limites](painel-solicitacoes/HOMOLOGACAO.md); [segurança e configuração](painel-solicitacoes/DADOS_E_SEGURANCA.md).
- [Ambiente de homologação](AMBIENTE_DE_HOMOLOGACAO.md) — como testar os formulários de Exclusão e Trancamento no `/exec` com planilhas de teste, pela coluna `Homologação` do `ID_INDEX`.
- [Estrutura Curricular e Grade Horária 1.12.0](estrutura-curricular/README.md) — fonte sobre a baseline 1.9.3 auditada (versões desde a 1.10.0 no README); [manual](estrutura-curricular/MANUAL_OPERACAO.md), [instalação](estrutura-curricular/INSTALACAO_E_ATUALIZACAO.md), [arquitetura](estrutura-curricular/ARQUITETURA.md), [segurança](estrutura-curricular/DADOS_E_SEGURANCA.md) e [verificação local](estrutura-curricular/VERIFICACAO_1_10_0.md). Sidebar e abas usam os mesmos controles. A nova versão ainda precisa de homologação no Google.

- [Planilha das secretarias (Grade Horária) 1.1](planilha-grade-secretarias/README.md) — planilha que os departamentos preenchem, com o `Validacoes.gs` (Prática, conflito de horário com nota e, desde a 1.1, caixa de aviso) e o `Protecao.gs` (só e-mails autorizados preenchem); estrutura das abas e colunas, lugar no ciclo da grade, [manual](planilha-grade-secretarias/MANUAL_OPERACAO.md), [segurança](planilha-grade-secretarias/DADOS_E_SEGURANCA.md) e [homologação](planilha-grade-secretarias/HOMOLOGACAO.md). Verificada localmente; teste no Google pendente.

- [Painel de Sistemas dos servidores](painel-servidores/README.md) — fonte recebida em 13/10/2026 com tema GRADIP, menu lateral/abas, card Pessoas do IPUSP e Central de Ajuda; [manual e instalação](painel-servidores/MANUAL_OPERACAO.md), [ajuda](painel-servidores/AJUDA.md), [segurança](painel-servidores/DADOS_E_SEGURANCA.md) e [homologação](painel-servidores/HOMOLOGACAO.md). Verificado localmente; implantação no Google pendente. Acesso anônimo sem autorização no backend registrado para decisão.
- [Trancamento Total de Matrícula](trancamento-total/README.md) — formulário dos alunos v1.2 (15/10/2026) com recibo por e-mail, aviso de pedido pendente, tema GRADIP e Central de Ajuda; [manual](trancamento-total/MANUAL_OPERACAO.md), [ajuda](trancamento-total/AJUDA.md), [segurança](trancamento-total/DADOS_E_SEGURANCA.md) e [homologação](trancamento-total/HOMOLOGACAO.md). Verificado localmente; implantação pendente. O gerenciador da equipe tem uma v1.1 no repositório, ainda não implantada.
- [Trancamento Parcial de Matrícula](trancamento-parcial/README.md) — formulário dos alunos v1.1 (16/10/2026) com disciplinas pelo código (cadastro DISCIPLINAS), recibo por e-mail, tema GRADIP e Central de Ajuda; [manual](trancamento-parcial/MANUAL_OPERACAO.md), [ajuda](trancamento-parcial/AJUDA.md), [segurança](trancamento-parcial/DADOS_E_SEGURANCA.md) e [homologação](trancamento-parcial/HOMOLOGACAO.md). Verificado localmente; implantação pendente. O gerenciador da equipe não está no repositório.
- [Exclusão de Disciplinas](exclusao-disciplinas/README.md) — formulário dos alunos v1.1 (16/10/2026) com identidade só pelo login, disciplinas pelo código (cadastro DISCIPLINAS) e turma, pedidos anteriores, recibo por e-mail, tema GRADIP e Central de Ajuda; [manual](exclusao-disciplinas/MANUAL_OPERACAO.md), [ajuda](exclusao-disciplinas/AJUDA.md), [segurança](exclusao-disciplinas/DADOS_E_SEGURANCA.md) e [homologação](exclusao-disciplinas/HOMOLOGACAO.md). Verificado localmente; implantação pendente. O gerenciador da equipe não está no repositório.

- [Comunidade IPUSP (antiga Busca de Alunos)](busca-alunos/README.md) — ferramenta da equipe v1.3 para buscar alunos, docentes, servidores e setores, com ficha e exportação; [segurança](busca-alunos/DADOS_E_SEGURANCA.md) e [homologação](busca-alunos/HOMOLOGACAO.md). Verificada localmente; modelo de acesso à leitura registrado para decisão.
- [Grade Horária visual](grade-horaria-visual/README.md) — página pública v2.0 da grade do curso, com grades anteriores e PDF; [manual](grade-horaria-visual/MANUAL_OPERACAO.md), [segurança](grade-horaria-visual/DADOS_E_SEGURANCA.md) e [homologação](grade-horaria-visual/HOMOLOGACAO.md).

## Ideias em desenvolvimento

- [Gerenciador de Ofícios e Modelos](gerenciador-oficios/README.md) — ideia em desenvolvimento (16/10/2026), sem código: numeração travada por órgão e ano, modelos de ofício (inclusive a partir de ofício antigo), Drive organizado (chave `OFICIOS`) e rascunho de e-mail no Gmail para revisão.

## Ordem prevista

1. painéis e dashboards;
2. sistemas internos da equipe;
3. formulários vinculados, um de cada vez.
