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

O catálogo lista todos os sistemas já incorporados (painéis dos alunos e dos servidores, Grade Horária visual, Estrutura Curricular, Comunidade IPUSP, formulários de exclusão e trancamento) com o estado de cada um.

Guias para quem chega de fora:
- [Arquitetura geral](ARQUITETURA_GERAL.md) e [glossário](GLOSSARIO.md);
- [Como participar](../CONTRIBUTING.md) e [roteiro de atualização da documentação](ATUALIZAR_DOCUMENTACAO.md);
- [Verificação automática (CI)](CI.md);
- [Desenvolvimento local com clasp](../DEVELOPMENT_LOCAL.md): Git e clasp, `.claspignore`, segurança e princípios de arquitetura;
- [Versões e Releases](VERSOES.md);
- [Implantação](IMPLANTACAO.md): do commit aprovado ao Apps Script, conferência do código no Google e volta atrás;
- [Como reaproveitar um sistema em outro setor](COMO_REAPROVEITAR.md);
- [Ambiente de homologação](sistemas/AMBIENTE_DE_HOMOLOGACAO.md);
- [Repositório público](seguranca/REPOSITORIO_PUBLICO.md): o que pode e o que não pode entrar;
- [Auditoria](auditoria/README.md): o que os sistemas registram e o [modelo](auditoria/MODELO.md) para auditar um sistema novo.

Ordem de incorporação:
1. painéis/dashboards;
2. sistemas internos da equipe;
3. formulários e módulos associados, um por vez;
4. integrações compartilhadas quando existirem.

## Regra de separação

Uma regra vive no nível mais alto em que seja realmente universal. Ex.: cor do Dark Mode → visual comum; comportamento do FAQ → ajuda comum; segredo/classificação de dados → segurança comum; significado de um status → sistema específico; regra de submissão → formulário específico.
