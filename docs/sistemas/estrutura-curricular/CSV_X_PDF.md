# CSV x PDF do Júpiter

O sistema trata os dois formatos como fontes **complementares**.

## CSV — fonte principal

Fornece nomes completos, créditos/cargas, currículo, habilitação, tipo, período ideal, oferta e requisitos em formato estruturado.

Limites documentados: a relação lógica `e`/`ou` dos requisitos não vem completa e a versão da disciplina não aparece de modo uniforme.

## PDF — complemento

Acrescenta versão de disciplinas, EXT, requisitos alternativos, requisito fraco e Informações Básicas do currículo.

Limites: nomes podem aparecer truncados, o cabeçalho `Complemento` pode estar errado e o relatório pode vir sem camada de texto.

## PDF com texto

PDF.js extrai diretamente quando existe camada textual suficiente.

## PDF sem texto

O navegador usa Tesseract.js com modelo português. O OCR faz leitura da página e uma passada concentrada nos números; depois aplica correções contextuais e conferências aritméticas.

## Evidência x confiança

A UI distingue valor lido, corrigido, conferido e ainda sujeito a conferência humana. O sistema evita chamar de comprovado aquilo que apenas fecha matematicamente.

## CSV + PDF juntos

O CSV é gravado primeiro e o PDF segue como complemento. Continuam duas importações, cada uma com prévia e confirmação.

## Conjunto de referência descrito

O descritivo 1.8.0 registra 3 currículos, 183 disciplinas, 398 ofertas, 238 requisitos e PDF de 38 páginas como conjunto real de referência. Esses números serão confrontados com código/testes na auditoria independente.
