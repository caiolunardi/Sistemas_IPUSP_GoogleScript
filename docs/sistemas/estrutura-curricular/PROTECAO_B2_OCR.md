# Proteção B2: leituras do OCR que tornam incerta uma disciplina ou um requisito

**Estado:** versão **1.13.0**, preparada em 23/10/2026 num ramo próprio, com PR aberto e **sem merge**. Implementada e validada localmente; **não** foi implantada nem homologada no Google. Nenhum `clasp`, `/dev`, `/exec`, planilha ou dado foi tocado. Em `Codigo.gs`, só `VERSAO_SISTEMA` mudou ([notas da versão](../../../notas-de-versao/estrutura-curricular-v1.13.0.md)).

**Testes e CI:** a B2 entrou no `main` pelo PR #28 (merge `43a52d3`, 26/10/2026) sem as suítes na CI, porque o fluxo não mistura mudança de CI com mudança de sistema. Um PR próprio, só do `.github/workflows/ci.yml`, acrescenta `testar_protecao_ocr.js` e `mutacoes_protecao_ocr.js` ao job da Estrutura Curricular, que entra em "CI concluída" (§6). Até esse PR entrar no `main`, elas rodam só à mão. A rodada 39893033804, de uma versão anterior do PR #28 com os dois passos, registrou 43/43 e 14/14. O diagnóstico de fontes naturais (`diagnostico-fontes.yml`) é independente, não bloqueia e pode ficar vermelho.

**Validação:** só **sintética**. Ela usa as palavras do PDF sintético de `jupiter_sintetico.js` e o OCR real do PDF misto. Nenhum PDF real do Júpiter foi usado. A suíte mostra o que a regra faz nos casos testados. Ela não prova que a regra acerta em todo documento escaneado.

Origem: [diagnóstico e proposta do PR #26](ETAPA4_TESTES_MISTOS.md) (casos F1–F8 de `testes/investigar_requisitos_ocr.js`). Antes da B2, uma disciplina com o código ilegível sumia em silêncio e os requisitos dela iam para a disciplina anterior (F1, F2). Um requisito ilegível também sumia em silêncio (F5, F6).

## 1. O princípio

Uma falha de OCR que torne incerta a identificação de uma disciplina, ou a associação de um requisito, não é aceita em silêncio como dado acadêmico confiável. Vira **erro**, com a página e o texto lido. Documentos legítimos não são bloqueados só por terem títulos, rodapés, quebras de página ou linhas que o leitor não reconhece. Essas linhas ficam visíveis para conferência, sem bloquear.

## 2. O que mudou (só no navegador)

| Arquivo | Mudança |
|---|---|
| `src/LeitorPdf.html` | detecções D1, D2 e D3 (só no OCR); invalidação de `est.ultima` depois de D1; aviso das contas que não fecham (D5); erros antes dos avisos no pacote; linhas suspeitas no topo da lista de não reconhecidas |
| `src/PainelImportacao.html` | caixa da conferência como aviso quando, no OCR, subtotal ou total de seção não fecha; lista recolhível "Ver linhas do PDF não reconhecidas" (D6); botão "?" para a ajuda nos erros do OCR |
| `src/EstruturaAjuda.html` | três itens novos em "Conferência do PDF e OCR" e uma referência em "Quando a importação não pode ser gravada" |

Fora isso, só `VERSAO_SISTEMA` em `Codigo.gs` (1.12.1 → 1.13.0). Arquivos que **não** mudaram: `Importacao.gs` e os demais `.gs`, `LeitorComum.html`, `LeitorCsv.html`, `LeitorPdfFontes.html` (PDF.js 6.4.299, Tesseract, modelo e workers), `PainelEstilos.html` e os outros sistemas. O modo texto (PDF com camada de texto) dá o mesmo pacote de antes, byte a byte, em todas as variações da suíte (§6).

## 3. Mensagens novas do leitor

Os códigos são internos. A tela mostra só a mensagem e o detalhe.

| Código | Nível | Quando | Mensagem (resumo) e detalhe |
|---|---|---|---|
| `PDF_OCR_DISCIPLINA_ILEGIVEL` | erro | D1, abaixo | "O OCR não conseguiu ler o código de N linha(s) que parecem ser de disciplina (página P)…"; detalhe: `Página P: «texto lido»` (até 20) |
| `PDF_OCR_REQUISITO_ILEGIVEL` | erro | D2 | "O OCR não conseguiu ler N linha(s) de requisito (página P). O requisito ficaria de fora…"; detalhe com o texto |
| `PDF_OCR_REQUISITO_SEM_DISCIPLINA` | erro | D3 | "N linha(s) de requisito apareceram sem uma disciplina reconhecida antes delas (página P). Elas não foram ligadas a nenhuma disciplina…" |
| `PDF_OCR_CONTAS_NAO_CONFEREM` | aviso | D5 | "N conta(s) do relatório não fecharam (subtotais ou totais de seção; página P)…"; detalhe: `Página P, Subtotal (Obrigatórias): carga horária: soma das disciplinas 255, impresso 330` |

As três mensagens de erro terminam com a orientação: conferir o PDF na página indicada e importar o CSV, um PDF com texto ou uma nova digitalização mais nítida. A página vai na **mensagem** porque o servidor guarda só a mensagem dos erros (até 500 caracteres; `Importacao.gs`, `validarPacote_`). O texto lido vai no detalhe, que a tela mostra escapado.

## 4. Os critérios

Todas as detecções valem **só no modo OCR** e só depois do cabeçalho da página. O brasão, o título e o ruído antes de "Curso:" continuam ignorados, como antes.

- **D1, disciplina ilegível.** Uma linha da grade não reconhecida, em que **nenhuma** regra anterior se aplicou (seção, subtotal, total, "ou", requisito, disciplina válida, linha só de números). Ela precisa ter um destes formatos:
  - o formato do relatório, "código(versão)", com o código de **6 a 9 caracteres** e **pelo menos 3 dígitos**. Por exemplo, `TSTO0301(1)` ou `TST0B01(1)`, em que o código não passa em `lerCodigo`;
  - sem os parênteses da versão: o primeiro "código" (6 a 9 caracteres, pelo menos 3 dígitos) seguido de **pelo menos 6 números nas colunas** da tabela.

  Não basta uma sequência de 6 a 9 caracteres. A suíte mostra que `XYZ2026 nota…` (sem números), `ABCDEF(1)` (sem dígitos), `AB123(4)` (curto), `CEP05508-030 (3)`, `Turma 2026-101 (2)` e `Resolução CoG 7734(2)` não são acusados. A mutação que retira a exigência de 3 dígitos reprova a suíte.

  O mesmo critério vale para a linha com jeito de disciplina que aparece numa página cujo cabeçalho das colunas não foi lido, depois de a tabela já ter sido vista numa página anterior. Antes, essa página toda era ignorada em silêncio.
- **D2, requisito ilegível.** Dois casos:
  - a linha é "Requisito/Requisito fraco/Co-requisito – …", mas o código depois do traço não é lido (F5). Em "Indicação de conjunto", cujo formato não aparece em nenhum relatório de exemplo, só é erro quando o que vem depois do traço tem jeito de código (pelo menos 3 dígitos); se não tiver, a linha fica só na lista, sem bloquear;
  - o rótulo foi mal lido, mas fica a até 30% de distância de edição de um desses rótulos, com no mínimo 1 caractere de folga. Além disso, depois do traço vem um "código(versão)" com pelo menos 3 dígitos (F6: `Reqmsito fraco - TST0301(1)`).

  Nenhum requisito é inventado ou reconstruído.
- **D3, requisito sem disciplina.** Requisito reconhecido sem disciplina aberta (`est.ultima` vazia). Ele **nunca** é ligado à disciplina anterior.
- **D4, autorrequisito.** **Não** bloqueia (hipótese H2 não validada). A suíte só imprime, como informação, quantos autorrequisitos aparecem nos casos F (hoje: nenhum, porque D1 impede o de F1).
- **D5, contas que não fecham.** No OCR, cada subtotal e cada total de seção que não fecha vira **aviso** (não erro), com a página, o elemento e a coluna. O aviso traz a soma das disciplinas e o valor impresso, ou diz que o número está ilegível. As contagens da conferência ("x de y subtotais…") não mudam. No painel, a caixa da conferência passa de informação para aviso e diz quantos subtotais e totais não fecharam. No modo texto, nada muda.
- **D6, linhas não reconhecidas.** "Ver linhas do PDF não reconhecidas (N; K com erro)" aparece sempre que houver alguma, nos dois modos e sem o limiar antigo de 15. A lista mostra a página e o texto (escapado, com quebra de linha longa), o total e "Mostrando 60 de N" quando cortada. As linhas de erro vêm primeiro, marcadas com "Erro:" e o motivo em português. O aviso antigo `PDF_LINHAS_NAO_RECONHECIDAS` (mais de 15) continua igual.

## 5. `est.ultima` (a disciplina aberta para os requisitos)

- Só **D1** a invalida (`est.ultima = null` e `pendenteOu = false`). É a evidência suficiente de que uma disciplina se perdeu entre a anterior e os requisitos seguintes.
- Continua valendo, como antes, nas quebras de página, nos subtotais, nos totais de seção e nos títulos e mudanças de seção. Continua sendo zerada só na troca de currículo, como antes.
- Por isso um requisito que continua no topo da página seguinte fica ligado à disciplina certa (teste "requisito que continua no topo da página seguinte").

## 6. Testes (sintéticos)

`testes/testar_protecao_ocr.js` (na CI, pelo PR do workflow) roda em três partes:

1. **Leitor.**
   - F1, F2, F5, F6 e F8 viram erro com a página e o texto, sem associação indevida e sem autorrequisito.
   - Em F5 e F6, a conferência completa (4/4, 2/2) não retira o bloqueio.
   - Falsos positivos sem erro:
     - modo texto;
     - requisito que continua na página seguinte;
     - brasão e texto decorativo antes do cabeçalho;
     - página de Informações Básicas com códigos no texto;
     - texto não acadêmico parecido com código;
     - rótulos legítimos (`Co-requisito`, `Indicação de conjunto`, `Requisito (f)`);
     - subtotais, totais e títulos.
   - D5 com página e valores. Erros antes dos avisos.
   - Com `DIR_SRC_ANTERIOR`: modo texto idêntico à fonte anterior.
2. **Servidor simulado** (`Importacao.gs` sem alteração).
   - Para cada caso, a prévia sai com `podeGravar = false` e os erros em `bloqueios`. A gravação é recusada com `BLOQUEADA` e as planilhas e propriedades ficam iguais (fotografia antes e depois).
   - Controle: C0 vai para a prévia sem bloqueio.
   - Com mais de 100 avisos, o erro, que o leitor põe primeiro, ainda bloqueia.
3. **Painel no Chromium.** A leitura do PDF é substituída pelas palavras sintéticas; o resto do painel é o real.
   - F1: caixa "O arquivo não pode ser importado" com a página e o texto, sem código interno. "Ver o que vai mudar" fica desativado e nenhuma chamada a `prepararImportacao` ou `confirmarImportacao` acontece. A conferência aparece como aviso e a lista mostra "Erro:".
   - Linha com HTML aparece escapada.
   - C0 continua chegando ao servidor.
   - Com F8 e a lista aberta, em 360 px (claro), 390 px (escuro), 480 px (claro) e 768 px (escuro): sem rolagem horizontal, e o resumo da lista tem alvo de pelo menos 44 px. A lista usa só classes e tokens que já existiam (`details.grupoMudancas`, `listaMudancas`, `alerta--aviso`); não há cor nova, e o erro é dito em texto ("Erro:"), não só por cor.

Total: 43 testes (44 com `DIR_SRC_ANTERIOR`, que compara o modo texto com a fonte anterior).

`testes/mutacoes_protecao_ocr.js` (na CI, pelo PR do workflow) aplica 14 mutações numa cópia de `src/` e exige que a suíte reprove em todas:

- desligar D1;
- não invalidar `est.ultima`;
- afrouxar o critério de dígitos;
- desligar D2 (código e rótulo);
- desligar D3;
- rebaixar o erro para aviso;
- tirar a ordem dos avisos;
- desligar D5;
- acusar suspeitas no modo texto;
- deixar o botão ativo;
- tirar a lista;
- não escapar o texto;
- servidor sem bloquear erros (só na cópia).

O OCR real do mesmo PDF continua coberto por `testar_pdf_misto_sintetico.js`: Tesseract no Chromium, dois cenários de fontes, PDF.js 3.11.174 e 6.4.299. A suíte exige o resultado acadêmico esperado **sem nenhum aviso** e passa com a B2. Isso é a evidência, só para esse PDF sintético, de que o ruído real do Tesseract não dispara D1, D2, D3 nem D5. (`testar_pdf_ocr_sintetico.js` testa só a leitura das palavras, sem o `LeitorPdfJupiter`.)

## 7. Limites (não detectados; não afirmar o contrário)

- **F3**: código lido como **outro código válido** (`TST0205` → `TST0206`). Não deixa marca: o código é válido e as contas fecham.
- **F4**: código do requisito lido como outro código válido (`TST0102` → `TST0182`).
- **F7**: linha "ou" perdida. A alternativa vira exigência ("e").
- Rótulo de requisito ilegível demais (mais de 30% de distância) ou sem o "código(versão)" depois do traço: fica só na lista de linhas não reconhecidas, sem erro.
- Linha de disciplina sem "(versão)" e com menos de 6 números lidos: fica só na lista.
- D5 pode gerar aviso em documentos corretos: o OCR costuma ler mal o "0" em negrito dos subtotais, e o subtotal ilegível entra no aviso mesmo quando o total da seção confere. É aviso, não bloqueia; a frequência com PDFs reais não foi medida.
- **H1** (nenhum requisito depois de Subtotal, Total ou seção sem disciplina), **H2** (sem autorrequisito) e **H3** (o ruído do OCR raramente imita "código(versão)" ou "Requisito - …") **não foram validadas** com relatórios reais. Por isso H1 e H2 **não** viraram bloqueios gerais. D3 só se apoia em `est.ultima` vazia; D4 é só informativo.
- A detecção roda **no navegador**. O servidor bloqueia porque recebe avisos de nível erro produzidos pelo navegador e não refaz a leitura do PDF. Por isso a B2 **não protege contra manipulação maliciosa da requisição**: protege contra a importação de um PDF mal lido pelo fluxo normal do painel.
- **Lacuna do servidor** (sem alteração nesta rodada): `validarPacote_` lê só os 100 primeiros avisos. A B2 contorna isso pondo os erros primeiro (no OCR). A suíte registra que um erro depois do 100º aviso não seria lido. Corrigir no servidor depende de autorização específica.
- A ajuda pede para conferir a prévia mesmo sem avisos, por causa de F3, F4 e F7.

## 8. Homologação

Falta a conferência com PDFs escaneados reais do Júpiter, sem copiar dados reais para o repositório, e a homologação no Google, que depende de autorização do responsável. Não há CSV novo em `dados-ficticios/`: a B2 não cria aba, coluna nem dado gravado. O material de homologação é o PDF sintético (`testes/jupiter_sintetico.js`, gerado por `testar_pdf_misto_sintetico.js` em `testes/saida/misto_sintetico.pdf`).

## 9. Pendências que dependem do responsável

- Versão 1.13.0 no `main` (PR #28), sem tag nem Release.
- Merge do PR do workflow que põe as duas suítes da B2 na CI exigida.
- Decidir se o servidor deve ler todos os erros, e não só os 100 primeiros avisos (`Importacao.gs`).
- B3 (segunda leitura das linhas suspeitas) e a Etapa 5 não foram iniciadas.
