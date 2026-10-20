# Como reaproveitar um sistema em outro setor

Este guia é para quem quer usar um dos sistemas deste repositório (ou parte dele) em outro setor da USP. Ele não substitui o manual de cada sistema: o passo a passo exato de instalação está no `MANUAL_OPERACAO.md` ou no README da pasta `sistemas/<sistema>/`.

Antes de começar, combine o reaproveitamento com o Serviço de Graduação do IPUSP: o repositório ainda não tem licença definida (ver [README](../README.md#licença)).

## 1. Entenda como os sistemas são montados

O mapa completo das planilhas e a ordem de montagem estão na [arquitetura geral](ARQUITETURA_GERAL.md).

- **Cada sistema é um projeto Apps Script independente**, publicado como Web App (`/exec`). Não há servidor próprio nem banco de dados: os dados ficam em planilhas do Google.
- **O código não tem nenhum ID de planilha.** Cada projeto guarda em **Propriedades do script** só o ID de uma planilha mestre, o `ID_INDEX`. Nela, cada linha liga uma **chave** (por exemplo `PERIODOS`, `DISCIPLINAS`, `EXCLUSAO_DISCIPLINAS`) ao ID da planilha correspondente, com uma coluna para produção (`ID de Produção`) e outra para testes (`Homologação`).
- **A interface é HTML/CSS/JS nativo**, com o tema GRADIP (`shared/GradipTema.html`) e a Central de Ajuda (`shared/ajuda/`). Nada depende de biblioteca externa.
- **Quem pode usar** é decidido em dois lugares: na implantação ("Quem pode acessar", normalmente "qualquer pessoa da USP") e no próprio código, que confere o login antes de ler ou gravar. O `DADOS_E_SEGURANCA.md` de cada sistema diz o que já está garantido no código e o que ainda depende da configuração.

## 2. Monte as suas planilhas

1. Crie a sua planilha `ID_INDEX`, com as colunas `Chave`, `Tipo`, `ID de Produção` e `Homologação` na primeira aba.
2. Para cada chave que o sistema usa (lista no `DADOS_E_SEGURANCA.md` e no manual), crie a planilha com **os mesmos títulos de coluna e nomes de aba** descritos na documentação. O código localiza as colunas pelo título.
3. Cole o ID de cada planilha na linha da chave.
4. Compartilhe as planilhas só com quem precisa. Quando o Web App "executa como" a conta que implanta, os alunos não precisam (e não devem) ter acesso às planilhas.

## 3. Crie o projeto e copie o código

1. Em [script.google.com](https://script.google.com), crie um projeto novo.
2. Copie os arquivos de `sistemas/<sistema>/src/` (ou `formulario/src/`), com os mesmos nomes e sem extensão no editor. Arquivos `.html` viram arquivos HTML; `.gs`, arquivos de script.
3. Em **Configurações do projeto → Propriedades do script**, crie `ID_INDEX_SPREADSHEET_ID` com o ID da sua planilha mestre, além das outras propriedades que o manual do sistema pedir.
4. Troque os textos que são do IPUSP (nome do serviço, e-mail de contato, regras do formulário). Eles estão no HTML e nas mensagens de e-mail do `.gs`; a Central de Ajuda fica no arquivo `*Ajuda.html`.
5. Se o sistema tiver a função `diagnosticarConfiguracao`, rode-a no editor: ela confere as chaves sem mostrar os IDs.

## 4. Teste antes de publicar

1. Rode os testes locais da pasta `testes/` do sistema (instruções no README dela). Eles usam só dados fictícios.
2. Monte um ambiente de homologação, como descrito em [`sistemas/AMBIENTE_DE_HOMOLOGACAO.md`](sistemas/AMBIENTE_DE_HOMOLOGACAO.md): uma cópia do projeto com a propriedade `AMBIENTE = homologacao`, que grava em cópias vazias das planilhas.
3. Siga o `HOMOLOGACAO.md` do sistema para saber o que conferir.

## 5. Publique

**Implantar → Nova implantação → App da Web.** Use as mesmas opções descritas no manual do sistema ("Executar como" e "Quem pode acessar"). Nas atualizações, edite a implantação existente e escolha "Nova versão", para manter o mesmo endereço.

## Cuidados

- **Nunca** coloque no seu repositório IDs reais, endereços `/exec` internos, e-mails ou dados de alunos. Siga [`seguranca/REPOSITORIO_PUBLICO.md`](seguranca/REPOSITORIO_PUBLICO.md) e o [checklist de segurança](seguranca/SECURITY_CHECKLIST.md).
- Prints para documentação só com dados fictícios: a tela do `/exec` mostra o e-mail de quem está logado.
- Base legal e prazo de guarda dos dados de cada formulário precisam ser definidos pelo seu setor; este repositório marca esses pontos como `A VALIDAR INSTITUCIONALMENTE`.
