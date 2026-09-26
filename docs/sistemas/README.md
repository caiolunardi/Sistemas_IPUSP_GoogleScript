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
6. executar `docs/seguranca/SECURITY_CHECKLIST.md`.

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

- [Painel de Solicitações dos alunos v1.2](painel-solicitacoes/README.md) — interface aceita em 25/09/2026; [evidências e limites](painel-solicitacoes/HOMOLOGACAO.md); [preflight do código pendente](painel-solicitacoes/DADOS_E_SEGURANCA.md).

## Ordem prevista

1. painel/dashboard do aluno — documentação da v1.2 incorporada; código aguardando preflight;
2. painéis internos da equipe;
3. formulários vinculados, um de cada vez.
