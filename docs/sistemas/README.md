# Sistemas específicos — roteiro de documentação

Esta pasta é reservada à documentação individual dos Web Apps e módulos do Serviço de Graduação do IPUSP.

## Regra de origem

Nenhum sistema deve ser documentado por memória aproximada ou inferência. Antes de criar uma pasta: obter baseline atual, identificar produção/homologação, separar implementação/regras/UX, registrar dependências e validar contra o código/fluxo real.

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
    HOMOLOGACAO.md
```

Sistemas pequenos podem concentrar tudo no `README.md`. Diretrizes universais de visual e ajuda permanecem em `docs/` e não devem ser duplicadas.

## Ordem prevista

1. painel/dashboard do aluno;
2. painéis internos da equipe;
3. formulários vinculados, um de cada vez.
