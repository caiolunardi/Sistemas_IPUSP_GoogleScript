<!-- Não inclua dados reais, IDs de planilha, URLs /exec internas nem credenciais.
     Fluxo e classes de risco: docs/governanca/FLUXO_DE_MUDANCAS.md
     Cada afirmação aponta para uma evidência conferível. O que não foi feito ou testado, diga. -->

## Contexto

**Sistema:** <!-- pasta em sistemas/, ou "repositório" para governança, CI e documentação comum -->
**Problema ou motivo:**
**Antes → depois:**

## Escopo

**Arquivos e funções alterados:**
**Deliberadamente fora deste PR:**

## Risco

**Classe:** <!-- baixo | moderado | alto | crítico (ver docs/governanca/FLUXO_DE_MUDANCAS.md#3-classificação-de-risco) -->

- [ ] Muda comportamento para quem usa
- [ ] Muda o que é lido, gravado, mostrado, exportado ou registrado (dados)
- [ ] Muda autenticação, autorização ou permissões
- [ ] Exige migração, Script Property, gatilho, escopo ou chave nova no `ID_INDEX`
- [ ] Muda workflows, verificações ou regras do repositório

**Possíveis regressões e como foram afastadas:**

## Validação

**Comandos e resultados:** <!-- comando e a última linha da saída, ou link da rodada da CI -->
**Limitações:** <!-- o que os testes simulados não cobrem; o que só a homologação mostra -->
**Evidências:** <!-- prints em evidencias/, rodada da CI -->

## Operação

- **`clasp push`:** <!-- não / sim: pasta src/ e projeto (sem ID) -->
- **Implantação (nova versão no /exec):** <!-- não / sim, depois da homologação -->
- **Ação humana no Apps Script ou nas planilhas:**
- **Como voltar atrás:**

## Revisão

**Decisões que dependem do responsável:**
**Parecer de revisão independente:** <!-- link do comentário, ou "não exigido (classe baixa/moderada)" -->

**Documentação** ([roteiro](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/blob/main/docs/ATUALIZAR_DOCUMENTACAO.md)):
- [ ] README do sistema (versão e mudança)
- [ ] MANUAL_OPERACAO / AJUDA, se a tela ou o uso mudou
- [ ] DADOS_E_SEGURANCA, se mudou o que é lido, gravado ou mostrado
- [ ] HOMOLOGACAO (o que foi testado)
- [ ] Catálogo, ARQUITETURA_GERAL e GLOSSARIO, se entrou sistema, chave, planilha ou termo novo
- [ ] Conferi o [checklist do repositório público](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/blob/main/docs/seguranca/REPOSITORIO_PUBLICO.md#antes-de-cada-commit)

<!-- Um agente de IA não aprova o próprio PR. O merge é do responsável humano. -->
