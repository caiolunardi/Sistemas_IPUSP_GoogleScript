# Testes locais — Gerenciador de Colação de Grau e Diplomas

Não copie esta pasta para o Apps Script. Os testes não acessam planilhas reais, não enviam e-mail e não usam a internet: os serviços do Apps Script são simulados em [`simulacao.js`](simulacao.js) (planilhas em memória, `getActiveSpreadsheet` falha de propósito para provar que o projeto é autônomo) e os dados são fictícios (nomes inventados, e-mails do domínio reservado `.invalid`, IDs que não têm formato de ID do Google).

| Script | O que confere |
|---|---|
| `testar_acesso.js` | Planilha aberta pelo `ID_INDEX` (produção e coluna Homologação), lista de acesso (títulos conferidos, e-mail inválido, coringa e perfil desconhecido ignorados, duplicado vale o menor, cache), toda função pública negada sem e-mail ou fora da lista **antes** de abrir a planilha de diplomas, LEITOR só consulta, ADMINISTRADOR grava, `doGet` sem acesso (página sem dados), correção de Registro ID só para ADMINISTRADOR, identificação (nome, observação, e-mail quando não há nome), prefixo de homologação no título. |
| `testar_historico.js` | Roda `rodarTestesHistorico` (a suíte própria do módulo de histórico) como ADMINISTRADOR. Duas verificações dependem da planilha real de Regras Curriculares e falham também na linha de base `35e621e`; o script as aceita pelo nome e falha em qualquer outra. |
| `testar_integridade.js` | (4.0.1) Exclusão nunca leva a pasta do aluno nem o "ID da Pasta" da central (inclusive com outra colação sem cache de pasta e em lote); inclusão manual: duplicidade de Nº USP + colação recusada, coluna ausente sem gravação parcial, linha gravada numa chamada só, conferência depois de gravar (linha sobrescrita, Registro ID repetido); pasta: Nº USP repetido na central para tudo, autocadastro simultâneo em outro sistema, pasta gravada por outro sistema no meio da criação, linha que muda de posição, cadastro que some; nenhum dado pessoal no registro de execução. |
| `testar_navegador.js` | Página com os `include_` resolvidos e `google.script.run` simulado, em Chromium: tema Sistema/Claro/Escuro (preferência exibida, persistência, mudança do sistema com a página aberta, marca por tema), identificação centralizada sem saudação, faixa de homologação, LEITOR (sem botões que gravam, campos só de leitura, aviso de somente consulta), página sem acesso, contraste ≥ 4,5:1, larguras 360/390/480/768/1280 px sem rolagem horizontal. |

```bash
node testar_acesso.js
node testar_historico.js
node testar_integridade.js
node testar_navegador.js      # requer Playwright com Chromium
EVIDENCIAS=../../../docs/sistemas/emissao-diplomas/evidencias/4.0.0 node testar_navegador.js   # grava as capturas
```

Resultados da 4.0.1 (06/11/2026): `testar_integridade.js` 21 ok; as outras três suítes iguais às da 4.0.0. Contra o código da 4.0.0 (`4792667`), a mesma suíte dá 5 ok e 16 falhas: cada falha é um defeito que a 4.0.1 corrige.

Resultados de 06/11/2026 (versão 4.0.0): 39 ok (acesso; inclui consultas de LEITOR sem nenhuma gravação e a migração de Registro ID gravando só as duas colunas), 484 de 486 verificações da suíte de histórico (as 2 aceitas acima), 21 ok (navegador; 06/11: área de upload do LEITOR e marca centralizada na janela de espera). A biblioteca pdf.js, que vem de CDN, é substituída por um esboço no teste de navegador.
