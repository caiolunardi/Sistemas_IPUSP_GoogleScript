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

- [Painel de Solicitações dos alunos](painel-solicitacoes/README.md) — interface v1.2 aceita em 25/09/2026; fonte v1.3 com menu lateral e [contagem de créditos](painel-solicitacoes/CONTAGEM_DE_CREDITOS.md), não implantada; [código sanitizado](../../sistemas/painel-solicitacoes/README.md); [evidências e limites](painel-solicitacoes/HOMOLOGACAO.md); [segurança e configuração](painel-solicitacoes/DADOS_E_SEGURANCA.md).
- [Estrutura Curricular e Grade Horária 1.10.0](estrutura-curricular/README.md) — fonte sobre a baseline 1.9.3 auditada; [manual](estrutura-curricular/MANUAL_OPERACAO.md), [instalação](estrutura-curricular/INSTALACAO_E_ATUALIZACAO.md), [arquitetura](estrutura-curricular/ARQUITETURA.md), [segurança](estrutura-curricular/DADOS_E_SEGURANCA.md) e [verificação local](estrutura-curricular/VERIFICACAO_1_10_0.md). Sidebar e abas usam os mesmos controles. A nova versão ainda precisa de homologação no Google.

- [Painel de Sistemas dos servidores](painel-servidores/README.md) — fonte recebida em 13/10/2026 com tema GRADIP, menu lateral/abas, card Pessoas do IPUSP e Central de Ajuda; [manual e instalação](painel-servidores/MANUAL_OPERACAO.md), [ajuda](painel-servidores/AJUDA.md), [segurança](painel-servidores/DADOS_E_SEGURANCA.md) e [homologação](painel-servidores/HOMOLOGACAO.md). Verificado localmente; implantação no Google pendente. Acesso anônimo sem autorização no backend registrado para decisão.

## Ordem prevista

1. painéis e dashboards;
2. sistemas internos da equipe;
3. formulários vinculados, um de cada vez.
