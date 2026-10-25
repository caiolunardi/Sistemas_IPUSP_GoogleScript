**Estrutura Curricular e Grade Horária** — versão 1.13.0 (sobre a 1.12.1). Proteção B2 da integridade acadêmica na leitura de PDFs escaneados (OCR).

Quando o PDF do Júpiter é lido pelo OCR, uma falha de leitura que torne incerta uma disciplina ou um requisito deixa de ser aceita em silêncio. Antes, uma disciplina com o código ilegível sumia e os requisitos dela iam para a disciplina anterior; um requisito ilegível também sumia. Agora:

- **Disciplina ilegível:** uma linha com jeito de disciplina cujo código o OCR não conseguiu ler vira erro, com a página e o texto lido. Os requisitos que vêm depois dela não são ligados a nenhuma outra disciplina.
- **Requisito ilegível ou sem disciplina:** "Requisito", "Requisito fraco" ou "Co-requisito" com o código ilegível, ou com o rótulo mal lido, vira erro. Um requisito que aparece sem uma disciplina reconhecida antes dele também vira erro. Nenhum requisito é inventado.
- **Importação bloqueada:** com qualquer um desses erros, "Ver o que vai mudar" fica desativado e o servidor recusa a gravação pelo bloqueio que já existia. Nada é gravado.
- **Somas que não fecham:** um subtotal ou total de seção que não confere com as disciplinas lidas vira aviso, com a página, o elemento, a coluna e os valores. Não bloqueia.
- **Linhas não reconhecidas:** a conferência mostra "Ver linhas do PDF não reconhecidas", com a página e o texto de cada linha. As que causaram erro vêm primeiro, marcadas "Erro:".
- **Modo texto preservado:** PDF com camada de texto e CSV continuam iguais. O pacote do modo texto é idêntico ao da 1.12.1 em todos os casos testados.

A Central de Ajuda tem três itens novos em "Conferência do PDF e OCR" e explica o que fazer com cada erro.

**Limitações:** três erros de OCR **não** são detectados:

- F3: o código da disciplina lido como outro código válido;
- F4: o código do requisito lido como outro código válido;
- F7: a linha "ou" perdida, que transforma uma alternativa em exigência.

Por isso a ajuda pede conferir a prévia mesmo sem avisos. A detecção roda no navegador, então não protege contra uma requisição manipulada. O servidor lê só os 100 primeiros avisos; os erros vêm primeiro para contornar isso.

**Validação:** só com PDFs sintéticos (dados inventados) e com o OCR real desses PDFs. **Nenhum PDF real do Júpiter foi usado.** A versão precisa de conferência com PDFs escaneados reais e de homologação no Google antes do uso institucional. As suítes da proteção (`testar_protecao_ocr.js` e `mutacoes_protecao_ocr.js`) estão no repositório e rodam manualmente; a inclusão delas na CI exigida fica para um PR próprio.

**No Apps Script:** trocar `LeitorPdf.html`, `PainelImportacao.html`, `EstruturaAjuda.html` e `Codigo.gs` (nele, só o número da versão muda). Nenhuma planilha, Script Property, gatilho ou permissão muda.

Implantação: ainda não implantada.

Esta Release marca o código do repositório; ela não atualiza o Apps Script. Quando a versão for publicada no Google, edite esta Release e registre a data.

Detalhes: [docs/sistemas/estrutura-curricular/PROTECAO_B2_OCR.md](https://github.com/caiolunardi/Sistemas_IPUSP_GoogleScript/blob/main/docs/sistemas/estrutura-curricular/PROTECAO_B2_OCR.md).
