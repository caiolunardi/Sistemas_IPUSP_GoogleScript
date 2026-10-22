# Núcleo da auditoria

`Auditoria.gs` é o núcleo comum da auditoria dos sistemas da equipe: selo encadeado, antes e depois, recusa da alteração quando a planilha da auditoria não abre, conferência de integridade, consolidação diária e preparação da planilha.

Cada sistema auditado tem uma cópia **byte-idêntica** em `sistemas/<sistema>/src/Auditoria.gs`, conferida pela CI (`ferramentas/verificar_copias_shared.js`). O que é específico de cada sistema fica no arquivo de configuração dele (`AUDITORIA_CONFIG`).

| Sistema | Configuração |
|---|---|
| Painel de Sistemas dos servidores | `sistemas/painel-servidores/src/AuditoriaPainel.gs` |
| Gerenciador de Abertura de Habilitações | `sistemas/abertura-habilitacoes/gerenciador/src/AuditoriaHabilitacoes.gs` |

Para mudar o núcleo: mude aqui, copie para todos os sistemas da tabela, rode os testes de auditoria de cada um e suba a versão de cada sistema. Como levar a outro sistema: [`docs/auditoria/MODELO.md`](../../docs/auditoria/MODELO.md).
