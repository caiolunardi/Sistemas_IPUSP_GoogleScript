# Instruções para agentes de código

As instruções deste repositório ficam em [`CLAUDE.md`](CLAUDE.md) e valem para qualquer agente (Claude Code, Cursor, Copilot, Codex e outros). Leia esse arquivo antes de alterar qualquer coisa.

Em resumo:

- O repositório é **público, inclusive o histórico**. Nunca inclua dado pessoal real, ID de planilha ou pasta, URL `/exec` de ferramenta da equipe ou credencial. Ver [`docs/seguranca/REPOSITORIO_PUBLICO.md`](docs/seguranca/REPOSITORIO_PUBLICO.md).
- Siga o padrão visual GRADIP e a Central de Ajuda descritos em `docs/`.
- Uma mudança visual não altera o backend.
- Desenvolvimento local e clasp: [`DEVELOPMENT_LOCAL.md`](DEVELOPMENT_LOCAL.md). `.clasp.json` e o login do clasp nunca entram no Git; cada `src/` tem `.claspignore`; IDs ficam no `ID_INDEX` ou em Script Properties; interface em HTML/CSS/JS nativos, separada da regra de negócio nos `.gs`; nada de implantação sem ordem do responsável.
- Rode os testes do sistema alterado e atualize a documentação seguindo [`docs/ATUALIZAR_DOCUMENTACAO.md`](docs/ATUALIZAR_DOCUMENTACAO.md).
- Para entender as ligações entre sistemas: [`docs/ARQUITETURA_GERAL.md`](docs/ARQUITETURA_GERAL.md) e [`docs/GLOSSARIO.md`](docs/GLOSSARIO.md).
