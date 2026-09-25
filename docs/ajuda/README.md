# Central de Ajuda GRADIP — visão geral

Versão: 1.0 — 2026-09-25

Esta pasta define o mecanismo universal de ajuda dos Web Apps do Serviço de Graduação do IPUSP. A Central de Ajuda é parte do produto: deve permitir que o usuário resolva tarefas, entenda mensagens e estados e encontre orientação sem precisar conhecer a arquitetura interna do sistema.

## O que é universal

- botão global `Ajuda` no cabeçalho, quando aplicável;
- modal/painel de ajuda sobre a aplicação;
- navegação por seções;
- busca local tolerante a acentos;
- atalhos para assuntos frequentes;
- problemas comuns;
- FAQ em acordeões;
- gatilhos contextuais próximos a campos, estados ou decisões complexas;
- abertura direta em uma seção específica;
- teclado, ESC, focus trap, retorno de foco e scroll lock;
- responsividade mobile;
- integração com Light/Dark Mode;
- comportamento de interface sem dependência do backend.

## O que muda em cada sistema

Somente as informações de domínio: tarefas, regras, condições, prazos, documentos, status, erros realmente possíveis, canais de atendimento e perguntas frequentes. Essas informações devem ser extraídas do sistema/documentação real. A camada universal **não inventa conteúdo**.

## Documentos

- `HELP_ARCHITECTURE.md` — arquitetura e responsabilidades.
- `HELP_CONTENT_MODEL.md` — modelo editorial e organização.
- `HELP_UX_ACCESSIBILITY.md` — comportamento visual, mobile e acessibilidade.
- `HELP_IMPLEMENTATION.md` — contrato HTML/CSS/JS e Apps Script.
- `HELP_SECURITY_PRIVACY.md` — limites de exposição e privacidade.
- `HELP_CHECKLIST.md` — homologação.

## Implementação de referência

Em `shared/ajuda/`:
- `GradipAjudaTemplate.html`;
- `GradipAjudaEstilos.html`;
- `GradipAjudaUI.html`.

Sistemas existentes podem preservar nomes como `PainelAjuda`, `BUSPAjuda` ou `DiplomasAjuda` desde que mantenham o contrato funcional.

## Princípio central

**A tela principal conduz a tarefa. A Central de Ajuda explica, orienta e resolve dúvidas.** Não transformar a interface principal em manual; não transformar a Central de Ajuda em documentação técnica.
