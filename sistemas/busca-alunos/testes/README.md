# Testes locais — Comunidade IPUSP (antiga Busca de Alunos)

Não copie esta pasta para o Apps Script. Os testes não acessam planilhas reais nem a internet e usam apenas dados sintéticos (nomes inventados de alunos, docentes, servidores e setores, números `9000000+`, e-mails `@exemplo.invalid`).

| Script | O que confere |
|---|---|
| `testar_backend.js` | `Codigo.gs` com `SpreadsheetApp`/`PropertiesService`/`HtmlService`/`Session`/`LockService`/`Utilities` simulados: lista da comunidade (três cadastros pelo título, `tipo` pelo TIPO ou pela regra antiga, cadastro indisponível sem derrubar os outros), fichas e gravação de docentes e servidores, lista de alunos (campos, `linha`, `ingresso`, sem `ID da Pasta`), títulos de coluna, configuração do índice, ficha (colunas, somente leitura, fórmulas, permissão de edição, linha conferida), gravação (só o que mudou, tipo numérico, conflito, validações, limites, trava), PDF (escape, nome, limites), diagnóstico e ausência de logs com dados. Desde a v1.4 a conferência de perfil é trocada por um ADMINISTRADOR fixo nesta suíte (a regra de negócio não muda); a autorização é testada em `testar_acesso.js`. |
| `testar_acesso.js` | v1.4, autorização no servidor, com `PessoasAcesso.gs` de verdade. Testes negativos: toda função pública chamada diretamente sem e-mail, com conta fora da lista, perfil vazio ou desconhecido, linha com coringa e o e-mail do implantador → recusada **sem abrir nenhum cadastro**; lista de acesso indisponível (planilha, aba, colunas, chave) → todos recusados; LEITOR salvando → recusado sem gravar, mesmo sendo editor da planilha; ADMINISTRADOR que não é editor → recusado; e-mail enviado pela página ignorado; `doGet` sem acesso → página de aviso. Também: e-mail repetido vale o menor perfil, cache de 60 s, homologação lendo a coluna `Homologação` sem cair para a produção, `AMBIENTE` inválido, diagnóstico só para ADMINISTRADOR e registros de execução sem e-mail. Contra o `Codigo.gs` do `main` (v1.3), 68 dos 75 casos falham. |
| `testar_fila_cadastro.js` | (v1.5) Fila de cadastro dos pedidos de colação, com `PessoasFilaCadastro.gs` de verdade: o que entra na fila, última versão, RG fora da página, candidatos, LEITOR sem abrir nada, vincular (com e sem troca de e-mail), criar (recusas, formatos, `DUPLICIDADE` depois de gravar), rejeitar, segunda decisão e versão nova recusadas, trava ocupada, aba ausente, registro de execução sem dados pessoais. |
| `testar_navegador.js` | Página montada com os `include_` resolvidos e um backend simulado no navegador, em Chromium: busca, destaque, limite 60, erro; selos Aluno/Docente/Servidor/Setor, busca pelo setor, aviso de cadastro indisponível; nº USP copiável (API e método alternativo, mensagem de 3 s); fichas de docente (Prof./Profª.) e servidor (TIPO); filtro por ano/semestre de ingresso; exportação CSV e PDF (downloads reais); ficha do aluno (abrir, editar, salvar, validação, foco, ESC, conta sem permissão); três modos de tema, persistência e mudança do sistema com a página aberta; marcas; contraste (texto ≥ 4,5:1, borda do campo ≥ 3:1); Central de Ajuda; 360/390/480/768 px sem rolagem horizontal e com alvos ≥ 44 px; (v1.4) página de quem não tem acesso nos três modos de tema e em 360 a 1280 px, com contraste e sem nenhum dado. |

```bash
node testar_backend.js
node testar_acesso.js
node testar_fila_cadastro.js
node testar_navegador.js   # requer Playwright com Chromium
```

O PNG externo da marca USP é substituído por um retângulo de mesmo tamanho durante o teste, para não depender da rede. Capturas de tela vão para a pasta temporária do sistema e não são versionadas.
