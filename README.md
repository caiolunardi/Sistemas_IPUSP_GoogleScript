# Sistemas IPUSP — Google Apps Script

Repositório central de referência e documentação dos Web Apps em Google Apps Script mantidos pelo Serviço de Graduação do Instituto de Psicologia da USP.

O objetivo é reduzir divergências entre projetos, registrar decisões de arquitetura/UX e fornecer uma base comum para novas implementações e atualizações.

## Diretrizes obrigatórias

Antes de alterar a interface de qualquer sistema, leia:

- `docs/UX_DESIGN_SYSTEM.md` — identidade visual, Light/Dark Mode, componentes, acessibilidade e responsividade.
- `docs/UX_COMPONENT_RECIPES.md` — receitas CSS/HTML de referência para componentes recorrentes.
- `docs/THEME_IMPLEMENTATION.md` — contrato técnico do tema e integração com Google Apps Script.
- `docs/UX_CHECKLIST.md` — checklist mínimo de homologação visual.
- `docs/ajuda/README.md` — arquitetura universal da Central de Ajuda, guias, busca, FAQ e suporte contextual.
- `docs/seguranca/README.md` — segurança, privacidade, LGPD, classificação de dados e configuração segura.
- `SECURITY.md` — política de reporte e resposta a exposição/vulnerabilidade.
- `docs/README.md` — índice da documentação e roteiro de incorporação dos sistemas.
- `CLAUDE.md` — instruções para agentes de código.

Base reutilizável:

- `shared/GradipTema.html` — tokens de tema + detecção da preferência do sistema + API de Claro/Escuro/Sistema.
- `shared/GradipTemaControle.html` — controle opcional e reutilizável de preferência `Sistema / Claro / Escuro`.
- `shared/ajuda/` — shell, estilos e comportamento de referência da Central de Ajuda.
- `shared/seguranca/` — exemplos de configuração segura sem valores de produção.
- `assets/ipusp/` — marca IPUSP para fundo claro e escuro, com registro de procedência.
- `assets/usp/` — variantes vetoriais da marca USP, com registro de procedência.

## Princípios

1. **Regra de negócio e UX são camadas separadas.** Mudança visual não deve alterar backend, planilha, e-mails, validações ou fluxo de dados.
2. **Tema padrão = Sistema.** O navegador segue `prefers-color-scheme`, salvo escolha explícita do usuário.
3. **Claro e Escuro são equivalentes funcionalmente.** Nenhuma ação, informação ou estado pode existir em apenas um tema.
4. **Identidade IPUSP preservada.** Não redesenhar, deformar ou aplicar filtros arbitrários à marca.
5. **Acessibilidade é requisito.** Contraste, foco, teclado, alvo de toque e semântica devem ser preservados.
6. **Mobile primeiro.** Validar ao menos 360, 390, 480, 768 px e desktop.
7. **Sem dependências desnecessárias.** O tema deve funcionar em HTML/CSS/JS nativos do Apps Script.
8. **Tokens antes de exceções.** Novos componentes devem consumir os tokens compartilhados; exceções específicas de um sistema precisam ser justificadas e documentadas.
9. **Ajuda é parte do produto.** Central de Ajuda, FAQ, solução de problemas e ajuda contextual seguem um contrato comum, mas o conteúdo deve refletir apenas regras reais de cada sistema.
10. **Documentação cresce por camadas.** Primeiro padrões comuns; depois dashboards e formulários, um sistema de cada vez, sempre a partir do código/fluxo efetivamente homologado.
11. **Privacidade e segurança por padrão.** Dados pessoais, credenciais e identificadores operacionais de produção não entram no repositório sem necessidade e validação explícita.
12. **Git não é cofre.** Repositório privado reduz exposição, mas não substitui controles de acesso, minimização, configuração segura e procedimentos institucionais.

## Organização da documentação

A documentação comum fica em `docs/` e os componentes reutilizáveis em `shared/`. Sistemas específicos serão incorporados gradualmente e terão documentação própria, sem misturar regras particulares com diretrizes universais.

Consulte `docs/README.md` para o mapa completo. O [Painel de Solicitações dos alunos v1.2](sistemas/painel-solicitacoes/README.md) já possui fonte Apps Script versionada, com a planilha de períodos resolvida pela chave `PERIODOS` no índice mestre `ID_INDEX`, e documentação de homologação.

Cada sistema poderá ter sua própria pasta conforme for incorporado ao repositório, por exemplo:

```text
sistemas/
  busp/
  diplomas/
  trancamento-parcial/
  painel-solicitacoes/
  ...
```

A documentação comum fica fora das pastas dos sistemas para servir de referência única.

## Fonte da identidade visual

Os ativos de marca usados aqui foram obtidos da pasta institucional compartilhada:

**Identidade Visual IPUSP | Aprovada pelo CTA de junho de 2024**

A procedência e as regras para uso dos arquivos estão documentadas em `assets/ipusp/README.md`.

---

Este repositório deve ser tratado como a referência de implementação dos sistemas IPUSP em Google Apps Script.
