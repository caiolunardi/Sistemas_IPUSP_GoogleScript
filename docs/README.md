# Documentação — Sistemas IPUSP em Google Apps Script

Este diretório organiza a documentação em camadas para servir tanto à manutenção quanto à apresentação institucional.

## 1. Fundação visual — concluída

- `UX_DESIGN_SYSTEM.md` — identidade visual e princípios.
- `UX_COMPONENT_RECIPES.md` — padrões de componentes.
- `THEME_IMPLEMENTATION.md` — Light/Dark/System.
- `UX_CHECKLIST.md` — homologação visual.

## 2. Ajuda, guia e FAQ — concluída

Pasta `ajuda/`: Central de Ajuda, busca, navegação, atalhos, FAQ, problemas comuns, ajuda contextual, acessibilidade, segurança, Light/Dark e checklist.

O conteúdo concreto de cada sistema não fica na camada universal.

## 3. Segurança, privacidade e LGPD — concluída

Pasta `seguranca/`: classificação de dados, configuração segura, Sheets/Drive/Apps Script, minimização, dados de teste, incidentes e checklist.

A diretriz é técnica e alinhada à LGPD/estrutura da USP; não substitui a Política de Proteção de Dados institucional nem análise do EPDI/Encarregado quando necessária.

## 4. Sistemas específicos — incorporação gradual

Pasta `sistemas/`. Consulte também o [catálogo geral](SISTEMAS.md).

- [Painel de Solicitações dos alunos](sistemas/painel-solicitacoes/README.md): documentação da UI v1.2 aceita e fonte Apps Script versionada;
- [Estrutura Curricular e Grade Horária](sistemas/estrutura-curricular/README.md): documentação da versão 1.8.0, incluindo arquitetura, fluxos, regras, dados/segurança, homologação, histórico e incidentes. O código foi recebido, mas será promovido como baseline somente após auditoria independente.

Ordem de incorporação:
1. painéis/dashboards;
2. sistemas internos da equipe;
3. formulários e módulos associados, um por vez;
4. integrações compartilhadas quando existirem.

## Regra de separação

Uma regra vive no nível mais alto em que seja realmente universal. Ex.: cor do Dark Mode → visual comum; comportamento do FAQ → ajuda comum; segredo/classificação de dados → segurança comum; significado de um status → sistema específico; regra de submissão → formulário específico.
