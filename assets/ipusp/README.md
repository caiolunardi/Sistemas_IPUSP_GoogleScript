# Marca IPUSP — ativos web

Esta pasta guarda versões vetoriais destinadas aos Web Apps do Serviço de Graduação.

## Procedência

Fonte institucional consultada:

**Identidade Visual IPUSP | Aprovada pelo CTA de junho de 2024**

Pasta compartilhada:
https://drive.google.com/drive/folders/12zkj_qpUVVBZlpDatPnqnG2vropxVr0T?usp=sharing

Arquivos relevantes existentes na fonte:
- `vetorLogoIPUSPreduz-azul-vetor.svg`
- `LogoIPUSPreduz-azul.png`
- `LogoIPUSPbranco.png`
- `LogoIPUSPazul-completo.png`
- `LogoIPUSPbranco-completo.png`

## Arquivos deste repositório

### logo-ipusp-azul.svg
Cópia vetorial da versão reduzida azul para uso em fundo claro.

A geometria vem do arquivo institucional `vetorLogoIPUSPreduz-azul-vetor.svg`.

O próprio SVG de origem usa preenchimento `#00509D`.

### logo-ipusp-branco.svg
Versão técnica vetorial negativa para Web, criada a partir da **mesma geometria** do SVG institucional azul e substituindo apenas o preenchimento azul por branco (`#FFFFFF`).

A pasta institucional contém `LogoIPUSPbranco.png`, que confirma a existência da versão negativa/branca da marca. Como a pasta compartilhada não apresentou um SVG branco reduzido equivalente, esta cópia mantém a geometria oficial e altera somente a cor para o uso previsto em fundo escuro.

Se futuramente for disponibilizado um SVG branco oficial, ele deve substituir esta versão técnica.

## Regras

- fundo claro → logo azul;
- fundo escuro → logo branca;
- não usar filtros CSS para transformar uma versão na outra;
- não deformar;
- não recortar internamente;
- não adicionar efeitos;
- não trocar a cor por tokens semânticos de status;
- preservar `viewBox`/proporção ou `width/height` proporcionalmente.

## Observação para Apps Script

Os arquivos no repositório são referência/cópia de trabalho. Cada Web App pode:
- hospedar os ativos em origem institucional estável;
- ou incorporar uma cópia aprovada no projeto/hospedagem adotada.

O tema deve trocar a variante da marca, não aplicar transformação visual na mesma imagem.
