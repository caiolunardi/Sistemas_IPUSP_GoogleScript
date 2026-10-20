# Como participar

Este repositório é público para que a comunidade do IPUSP e outras unidades da USP possam **auditar**, **sugerir** e **contribuir**. Todas as formas abaixo são bem-vindas, inclusive com a ajuda de agentes de IA.

Antes de tudo, leia o [glossário](docs/GLOSSARIO.md) e a [arquitetura geral](docs/ARQUITETURA_GERAL.md): elas explicam como os sistemas se ligam.

## Regra que vale para tudo

**Nada de dado real.** Nenhum nome, nº USP, e-mail ou pedido de pessoa real, nenhum ID de planilha ou pasta, nenhuma URL `/exec` de ferramenta da equipe, nenhuma credencial. Isso vale para código, testes, prints, issues, comentários e mensagens de commit. Use os dados fictícios de sempre (`ana@usp.br`, `9000001`, `TST0101`). Detalhes em [Repositório público](docs/seguranca/REPOSITORIO_PUBLICO.md).

Achou uma falha de segurança ou um dado exposto? **Não abra issue**: siga o [`SECURITY.md`](SECURITY.md).

## Auditar

- Comece pelo [catálogo](docs/SISTEMAS.md). Para cada sistema, o `DADOS_E_SEGURANCA.md` diz que dados ele lê, grava e mostra, quem pode acessar e o que está pendente de decisão (`A VALIDAR`).
- O `HOMOLOGACAO.md` de cada sistema diz o que já foi testado, onde e com que resultado. As pastas `evidencias/` guardam prints e saídas dos testes.
- Para conferir sozinho, rode os testes locais (abaixo).

Uma divergência entre a documentação e o código é um achado. Abra uma issue do tipo **Erro ou divergência**.

## Sugerir

Abra uma issue do tipo **Sugestão**. Diga qual sistema, quem usaria (alunos, equipe, secretarias, docentes) e que problema resolve. Não precisa saber programar.

## Contribuir com código ou documentação

1. Faça um **fork** do repositório e crie um ramo.
2. Leia as regras do [`CLAUDE.md`](CLAUDE.md). Elas valem para pessoas e agentes: padrão visual GRADIP, Central de Ajuda, segurança e escopo das mudanças.
3. Altere **um sistema por vez**. Mantenha o backend igual numa mudança só visual.
4. Rode os testes do sistema que você mexeu.
5. Atualize a documentação seguindo o [roteiro de atualização](docs/ATUALIZAR_DOCUMENTACAO.md): arquivos do sistema e, conforme o caso, catálogo, mapa das chaves, glossário e Central de Ajuda.
6. Abra um **pull request**, preenchendo o modelo.

O mantenedor revisa, aceita no `main` e leva a mudança ao Google. **Um merge no Git não muda nenhum sistema em uso**: os arquivos são copiados para o projeto Apps Script e publicados numa nova versão, depois da homologação. Cada versão de sistema vira uma tag e uma Release no GitHub ([versões](docs/VERSOES.md)).

No repositório principal, o único ramo permanente é o `main`. Um pull request aceito é incorporado com merge (não squash), e o ramo dele é apagado. Um pull request parado que ficou para trás em relação ao `main` é incorporado em parte ou fechado, com um comentário dizendo o que entrou e em que versão (como o #5, em 20/10/2026).

### Sistema novo

Siga [`docs/sistemas/README.md`](docs/sistemas/README.md): pasta `sistemas/<nome>/src` para o código, `docs/sistemas/<nome>/` para a documentação, configuração pelo `ID_INDEX` e por Script Properties, `DADOS_E_SEGURANCA.md` a partir do [modelo](docs/seguranca/SYSTEM_SECURITY_TEMPLATE.md) e ambiente de homologação.

## Testes locais

A cada push e pull request, o GitHub roda estes testes e a varredura de dados sensíveis sozinho ([verificação automática](docs/CI.md)). Um pull request com ✗ não é aceito.

Cada sistema tem `testes/README.md` com os comandos. Em geral:

```bash
cd sistemas/<sistema>/testes        # ou sistemas/<sistema>/formulario/testes
node testar_backend.js              # Apps Script simulado, dados sintéticos
node testar_navegador.js            # tela em Chromium (precisa do Playwright)
```

Requisitos: Node.js (verificado com a versão 22) e, para os testes de tela, `npm install -g playwright` com o Chromium. Nenhum teste acessa planilhas reais ou a internet. Algumas suítes da Estrutura Curricular pedem exportações do Júpiter, que não estão no repositório; elas avisam isso ao rodar.

## Usando agentes de IA

O [`CLAUDE.md`](CLAUDE.md) é a instrução para agentes (Claude Code, Cursor, Copilot e outros). O [`AGENTS.md`](AGENTS.md) aponta para ele. Ao pedir uma mudança a um agente:

- não cole dados reais no pedido (planilhas, prints do `/exec`, e-mails de alunos);
- peça que ele leia os documentos que o `CLAUDE.md` lista antes de mexer na interface ou na segurança;
- revise o resultado como revisaria o de uma pessoa: rode os testes e confira a documentação.

## Dúvidas

Sobre os sistemas e o repositório: abra uma issue. Sobre pedidos de alunos: Serviço de Graduação do IPUSP, `gradip@usp.br`.
