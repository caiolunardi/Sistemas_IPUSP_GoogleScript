# Repositório público

Desde outubro de 2026 este repositório é (ou está sendo preparado para ser) **público**. Tudo o que está nele, **inclusive o histórico de commits e os pull requests**, pode ser lido por qualquer pessoa. Este documento diz o que pode e o que não pode entrar, e registra a revisão feita antes da abertura.

## O que pode entrar

- Código-fonte dos Web Apps, com IDs trocados por chaves de configuração.
- Documentação funcional, manuais, Central de Ajuda e decisões de projeto.
- Testes e capturas de tela **com dados fictícios** (`ana@usp.br`, nº USP `9000001`, disciplinas `TST0101`, cursos `99999` etc.).
- Contatos institucionais já divulgados ao público: `gradip@usp.br`, o número do WhatsApp do Serviço de Graduação.
- Endereços `/exec` de páginas **feitas para os alunos** e divulgadas a eles (formulários do Painel de Solicitações, grade horária). Eles já aparecem para qualquer aluno e não concedem acesso por si: cada formulário confere o login.

## O que não pode entrar

- Credenciais de qualquer tipo (senha, token, chave, service account).
- IDs reais de planilhas, pastas, formulários, projetos ou implantações internas, inclusive os de homologação.
- Endereços `/exec` de **ferramentas da equipe** (painel dos servidores, gerenciadores, Comunidade IPUSP, Estrutura Curricular). Eles ficam em Script Properties; ver [Painel dos servidores](../sistemas/painel-servidores/DADOS_E_SEGURANCA.md#3-recursos-externos).
- Nome, nº USP, e-mail, histórico ou pedido de qualquer pessoa real, inclusive em prints, logs, fixtures e mensagens de commit.
- Exportações de planilhas (CSV, XLSX, PDF) com dados reais, inclusive do Júpiter.

## Antes de cada commit

1. Rode o [checklist de segurança](SECURITY_CHECKLIST.md).
2. Procure no que vai entrar: `AKfyc`, `docs.google.com/spreadsheets/d/`, `drive.google.com`, sequências longas de letras e números (IDs), `@usp.br` diferente dos e-mails fictícios e números de 7 a 8 dígitos que não sejam códigos de disciplina.
3. Abra cada print novo e confira que não há e-mail, nome ou nº USP reais.

Se algo sensível já tiver sido enviado, siga [INCIDENTES.md](INCIDENTES.md). Apagar o arquivo num commit novo **não** remove o conteúdo do histórico.

## Revisão de 20/10/2026 (antes de abrir o repositório)

Revisados os arquivos do `main`, os 57 commits de todos os ramos, os 50 prints e os 7 pull requests.

| Item | Situação |
|---|---|
| Credenciais, tokens, chaves | Nenhum encontrado, em nenhum commit. |
| IDs de planilhas do Drive | Nenhum, em nenhum commit (sempre chaves `ID_INDEX` ou marcadores `CONFIGURAR_*`). |
| Dados pessoais de alunos ou servidores | Nenhum. Nomes, e-mails e números dos testes e prints são fictícios. |
| Prints | Todos gerados pelos testes locais, com dados fictícios. |
| URLs `/exec` dos formulários dos alunos | Mantidas (destinos divulgados aos alunos). |
| URLs `/exec` das 9 ferramentas da equipe | **Retiradas do `main`** (Painel dos servidores passa a ler `URLS_SISTEMAS_EQUIPE`). **Continuam no histórico** (commits de 13/10 a 19/10/2026). |
| Pasta do Drive da identidade visual IPUSP | Mantida em `assets/ipusp/README.md`: é a fonte institucional da marca, compartilhada por link. |
| E-mail de autor dos commits | Commits do responsável aparecem com um e-mail pessoal nos metadados do Git. |

### Como neutralizar as URLs antigas sem reescrever o histórico

Uma URL `/exec` deixa de funcionar quando a implantação é **arquivada**. Para cada ferramenta da equipe cuja URL esteve no Git:

1. No projeto Apps Script, **Implantar → Nova implantação → App da Web**, com as mesmas opções.
2. Atualize a chave correspondente em `URLS_SISTEMAS_EQUIPE` no projeto do Painel dos servidores e confira o card.
3. **Implantar → Gerenciar implantações**, selecione a implantação antiga e **Arquivar**.

A alternativa é reescrever o histórico do Git (por exemplo com `git filter-repo`) e forçar o push, o que muda todos os hashes de commit e exige que todo clone seja refeito. Arquivar as implantações resolve o risco na origem e vale mesmo que alguém já tenha copiado o histórico.

### O que a revisão não resolve

Tornar o repositório público não muda quem consegue abrir cada sistema, mas deixa o funcionamento de cada um à vista. Os pontos abaixo já estavam registrados para decisão e ficam mais urgentes:

- **Painel dos servidores** aceita acesso anônimo e não confere quem chama as funções de gravação (períodos dos formulários e Regras Curriculares). Ver [seção 4](../sistemas/painel-servidores/DADOS_E_SEGURANCA.md#4-web-app).
- **Comunidade IPUSP** envia o cadastro completo a quem abre a página, sem conferir a leitura no servidor. Ver [seção 4](../sistemas/busca-alunos/DADOS_E_SEGURANCA.md#4-web-app).
