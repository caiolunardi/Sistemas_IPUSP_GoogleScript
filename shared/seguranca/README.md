# Padrões compartilhados de configuração segura

Esta pasta contém exemplos **sem valores de produção** para novos Web Apps.

## `ConfigSeguraExemplo.gs`

Helper mínimo para ler configuração obrigatória via `Script Properties` sem colocar IDs no código ou em logs.

Uso recomendado: copiar/adaptar apenas se o projeto ainda não tiver mecanismo equivalente. Não duplicar helpers em sistemas estáveis.

## Limites

- Script Properties serve para retirar configuração do Git;
- não é um cofre contra editores autorizados do projeto;
- segredo de alto valor deve seguir mecanismo institucional aprovado;
- valores reais são configurados no ambiente, nunca neste repositório.
