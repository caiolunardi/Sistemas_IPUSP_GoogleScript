# Instalação e atualização — formulário 2.0

Nenhum passo abaixo foi executado. Cada um depende de ordem expressa do responsável ([fluxo de mudanças](../../../governanca/FLUXO_DE_MUDANCAS.md)). Nenhum ID entra neste documento.

## 1. Projetos

| Ambiente | Projeto no Google | Propriedades do script |
|---|---|---|
| Produção | `GRADIP · Formulário de Abertura de Habilitações · PRODUÇÃO` (o projeto da 1.0) | `ID_INDEX_SPREADSHEET_ID`; **sem** `AMBIENTE` |
| Homologação | `GRADIP · Formulário de Abertura de Habilitações · HOMOLOGAÇÃO` (criado pelo responsável em 05/11/2026; propriedades e código ainda não conferidos) | `ID_INDEX_SPREADSHEET_ID` e `AMBIENTE = homologacao` |

O vínculo pasta ↔ projeto fica só no `.clasp.json` do computador ([DEVELOPMENT_LOCAL.md](../../../../DEVELOPMENT_LOCAL.md)).

## 2. `ID_INDEX`

| Chave | Produção | Homologação |
|---|---|---|
| `PLANILHA_ALUNOS` | já existe | cópia com o CSV [formulario-alunos.csv](../dados-ficticios/formulario-alunos.csv) |
| `ABERTURA_HABILITACOES` | já existe (a mesma do Gerenciador) | já preenchida na coluna `Homologação` (informado em 05/11/2026). Antes do primeiro envio, conferir que a linha 1 da aba `Respostas ao formulário 2` tem o título da C igual ao de [formulario-respostas-ao-formulario-2.csv](../dados-ficticios/formulario-respostas-ao-formulario-2.csv); se a cópia veio do CSV do Gerenciador, a C1 está vazia e o formulário recusa os envios |
| `PERIODOS` | já existe | cópia com [formulario-periodos.csv](../dados-ficticios/formulario-periodos.csv) |

## 3. Arquivos

Os 11 arquivos de `src/` (o `.claspignore` deixa de fora os testes). Na produção, os arquivos da 1.0 (`Backend.gs`, `SolicitacaoApp.html`) **saem** do projeto: com `clasp push`, só ficam os arquivos de `src/`. Antes, faça `clasp pull` numa pasta separada como cópia de segurança.

## 4. Implantação

1. Rodar `diagnosticarConfiguracao` no editor. Todas as linhas `OK`, inclusive "Esquema da aba".
2. Implantar → Gerenciar implantações → editar a implantação existente (mantém o `/exec`) → Nova versão.
3. "Executar como": **eu**; "Quem pode acessar": qualquer pessoa da USP. O manifesto já pede isso.
4. Autorizar os escopos novos: planilhas, e-mail (recibo) e cache.
5. Abrir o `/exec` com uma conta de aluno de teste e enviar um pedido; conferir a linha na planilha e no Gerenciador.

## 5. Voltar atrás

Implantar → Gerenciar implantações → editar → escolher a versão anterior (a 1.0). Os pedidos gravados pela 2.0 continuam legíveis pela 1.0 e pelo Gerenciador: as colunas são as mesmas. A configuração de execução e acesso é a mesma nas duas versões.
