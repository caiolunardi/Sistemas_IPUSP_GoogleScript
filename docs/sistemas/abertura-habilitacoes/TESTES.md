# Testes e resultados — Gerenciador de Abertura de Habilitações 2.0

Código dos testes: [`sistemas/abertura-habilitacoes/gerenciador/testes/`](../../../sistemas/abertura-habilitacoes/gerenciador/testes/README.md). Nenhum teste acessa planilhas reais, envia e-mail ou usa a internet; todos os dados são sintéticos.

## 1. Resultados (22/10/2026, versão 2.1, Node 22, Playwright 1.56 com Chromium)

| Suíte | Casos | Resultado |
|---|---|---|
| `testar_backend.js` | 105 | 105 ok, 0 falha |
| `testar_equivalencia.js` | 27 (13 afirmam diferenças intencionais; 1 confere a condição para voltar à 1.0) | 27 ok, 0 falha |
| `testar_navegador.js` | 314 verificações | 314 ok, 0 falha |

Na revisão de 21/10/2026 (correções da auditoria), cada teste novo foi conferido também contra uma versão propositalmente errada do código (impressão digital só com as contagens; confirmação do e-mail sem conferir a reserva; leitura de versão da 1.0; recuperação sem as outras linhas do mesmo ID): em todas, os testes correspondentes falharam.

Também rodados: `ferramentas/verificar_publicacao.js` (nenhum ID, segredo ou dado pessoal nos arquivos do repositório) e `ferramentas/verificar_copias_shared.js` (cópias de `shared/` idênticas). As três suítes entram na CI pelas linhas acrescentadas às matrizes "Servidor" e "Tela" de `.github/workflows/ci.yml` (commit separado, autorizado pelo responsável). O resultado da CI fica no PR.

A simulação das abas representa fórmulas: uma célula marcada como fórmula devolve o valor calculado em `getValues` e perde a fórmula em qualquer escrita, como no Sheets. Os testes de migração conferem que nenhuma fórmula fora do plano é substituída; a versão do código que regravava as colunas inteiras falha em cinco deles.

## 2. Como os serviços do Google são simulados

[`simulacao.js`](../../../sistemas/abertura-habilitacoes/gerenciador/testes/simulacao.js) carrega os `.gs` num contexto `vm` novo **a cada chamada** (como uma execução nova do Apps Script) e simula `SpreadsheetApp` (abas em memória que contam leituras e escritas, registram se a escrita foi feita com a trava e podem falhar sob comando), `LockService` (trava que pode estar ocupada; o teste confere que toda chamada solta a trava), `CacheService`, `PropertiesService`, `Session`, `MailApp` (caixa de saída em memória, falha sob comando, gancho para simular outra sessão durante o envio), `Utilities` e `HtmlService`. A aba `2021 - 2022` simulada lança erro em qualquer gravação.

Toda resposta é conferida contra `Date` escondido (que faria a página receber `null`).

## 3. O que cada suíte cobre

**Servidor** (`testar_backend.js`): configuração e falha fechada (9 casos), acesso e página (8), listas, detalhe e estrutura (8), busca e aba histórica (5), relatórios (1), salvamento e e-mail (27, incluindo a confirmação só sobre a própria reserva), contrato da Versão (5), preparar pedido (2), migração (18, incluindo linhas trocadas, alteradas e substituídas com as mesmas contagens, gravação só das células do plano com fórmulas preservadas, colunas ausentes, só títulos a criar e falhas no meio da gravação), recuperação de um pedido (7), registros sem dados pessoais (1), desempenho com 3.000 linhas (1). Lista completa no início do arquivo e na saída do comando.

**Equivalência** (`testar_equivalencia.js`): a 1.0 sanitizada e a 2.0 rodam sobre **cópias idênticas** das mesmas planilhas, com o mesmo usuário, relógio e caixa de saída, e os resultados são comparados campo a campo (listas, detalhe, busca, relatórios) ou célula a célula e e-mail a e-mail (salvar). Cada diferença intencional é um caso próprio, que afirma o comportamento da 1.0 **e** o da 2.0:

| Caso | 1.0 | 2.0 |
|---|---|---|
| já avisado | grava observações e recusa | recusa sem gravar |
| sem e-mail | grava observações e recusa | recusa sem gravar |
| concluído salvo de novo | troca a data de conclusão | mantém |
| versão omitida | salva sem conferir | recusa |
| ID repetido/fora do formato | clicável | marcado, sem ação |
| abrir a página | grava IDs | não grava |
| busca sem acento, data em texto | não acha / não ordena | acha e ordena |
| reserva nos concluídos | mostra como aviso | não mostra |
| observações > 2.000 | corta | recusa |
| reserva alterada durante o envio | grava a data por cima | não grava; `RESERVA_ALTERADA` |
| versão malformada na planilha | lê como 1 e salva | marca e recusa |
| migração com versão malformada | troca `0` e texto por 1 | preserva e informa |
| migração e as outras linhas | regrava as duas colunas inteiras (fórmulas viram valores) | grava só as células do plano |

O caso "volta à 1.0…" roda a 1.0 sobre a planilha deixada pela 2.0 depois da migração e da recuperação e confere que a primeira visita não grava nada; sobre a planilha sem esse preparo, a mesma visita reescreve as colunas.

**Navegador** (`testar_navegador.js`): a página real com os `include_` resolvidos, em Chromium, com `google.script.run` simulado. Temas claro e escuro; menu lateral e abas (ARIA, setas, Home/End); carregamento sob demanda e reaproveitamento por 60 s; texto com HTML tratado como texto; cartões sem ação; busca; detalhe (foco preso, Esc, foco devolvido, rolagem travada); confirmação antes do e-mail; reenvio; e-mail que falhou; e-mail sem registro; conflito com o texto mantido; clique duplo; respostas nula, malformada e fora de ordem; erros com e sem código; preparar pedido; concluídos; histórico só consulta; relatórios; Central de Ajuda (seções, busca, FAQ, ajuda por cima do detalhe, todo gatilho apontando para seção existente); perfil LEITOR; homologação; larguras 360/390/480/768/1024/1280 px sem rolagem horizontal e alvos de 44 px; contraste ≥ 4,5:1; página sem acesso; console sem dados pessoais.

## 4. Medidas de desempenho (simuladas)

Planilha sintética de 3.000 linhas, uma execução:

| Função | Aberturas da planilha | `getValues` na aba atual | `getValue` | `setValue` |
|---|---|---|---|---|
| `obterPendentes` | 1 | 1 | 0 | 0 |
| `obterConcluidosRecentes` | 1 | 1 | 0 | 0 |
| `buscarHistorico` | 1 | 1 | 0 | 0 |
| `obterRelatorio` | 1 | 1 | 0 | 0 |
| `salvarPedido` (concluir + avisar) | 1 | 2 (uma em cada trava) | 0 | 7 |

Os tempos medidos no Node (dezenas de milissegundos) não dizem nada sobre o Google; o que se mede aqui é o número de chamadas, que é o que pesa no Apps Script.

## 5. Limitações

- Nenhum teste roda no Google: identidade com "Executar como: eu", cotas, tempo real de leitura, escopos e o comportamento do `google.script.run` real só são conferidos na [homologação](HOMOLOGACAO.md).
- A planilha real não foi vista: os títulos usados nos testes são os do código da 1.0.
- A trava simulada não reproduz concorrência real entre execuções; os testes de concorrência simulam a outra sessão por ganchos no meio do envio.
- A marca USP externa é trocada por um retângulo durante o teste de navegador (sem rede).
