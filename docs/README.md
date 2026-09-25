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

## 3. Sistemas específicos — incorporação gradual

Pasta `sistemas/`. Cada sistema será documentado a partir do código/fluxo homologado.

Ordem planejada:
1. painel/dashboard do aluno;
2. dashboards/painéis da equipe;
3. formulários e módulos associados, um por vez;
4. integrações compartilhadas quando existirem.

## Regra de separação

Uma regra vive no nível mais alto em que seja realmente universal. Ex.: cor do Dark Mode → visual comum; comportamento do FAQ → ajuda comum; significado de um status → sistema específico; regra de submissão → formulário específico.
