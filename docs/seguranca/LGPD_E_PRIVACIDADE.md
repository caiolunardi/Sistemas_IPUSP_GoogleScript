# LGPD e privacidade — base da diretriz técnica

## 1. Escopo

A LGPD (Lei nº 13.709/2018) se aplica ao tratamento de dados pessoais, inclusive em meios digitais. Esta diretriz adota como referências técnicas os princípios de finalidade, adequação, necessidade, segurança, prevenção e responsabilização/prestação de contas do art. 6º, além das regras de segurança e boas práticas dos arts. 46 a 50.

Fonte legal: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm

## 2. Princípios traduzidos para engenharia

### Finalidade e adequação
O sistema deve tratar dados para finalidades institucionais definidas. Não reaproveitar informação coletada para uma função em outra funcionalidade incompatível sem validação institucional.

### Necessidade
Coletar, transportar, exibir, registrar e documentar apenas o mínimo necessário. A existência de um campo na planilha não significa que toda tela ou log precise recebê-lo.

### Segurança e prevenção
Aplicar controles técnicos e administrativos contra acesso não autorizado, perda, alteração, comunicação ou tratamento inadequado. A proteção começa na concepção, não apenas depois do deploy.

### Responsabilização e prestação de contas
Decisões relevantes devem ser demonstráveis: documentação, checklists, revisão de permissões, histórico de commits e registros de incidentes ajudam a comprovar governança.

## 3. Contexto USP

A USP possui estrutura institucional própria de proteção de dados. O EPDI dá suporte à Universidade enquanto Controladora e supervisiona medidas de segurança; o CGGDI auxilia a governança; a USP também mantém Encarregado pelo Tratamento de Dados Pessoais.

Referências institucionais:
- EPDI: https://sites.usp.br/lgpd/escritorio/
- CGGDI: https://sites.usp.br/lgpd/comite-gestor-de-governanca-de-dados-e-informacoes/
- Encarregado: https://sites.usp.br/lgpd/encarregado-pelo-tratamento-de-dados-pessoais/
- Portaria GR nº 7.839/2022: https://leginf.usp.br/?portaria=portaria-gr-no-7839-de-21-de-novembro-de-2022

## 4. Esta documentação não define base legal

O repositório pode documentar **qual dado é tratado e para qual finalidade técnica/operacional**, mas não deve inventar a hipótese legal da LGPD. Quando a base legal, retenção, compartilhamento ou publicação não estiverem formalmente definidos, registrar `A VALIDAR INSTITUCIONALMENTE`.

## 5. Dados pessoais x dados pessoais sensíveis

Identificadores como nome, e-mail, CPF e Nº USP são dados pessoais quando relacionados a pessoa identificada/identificável. Isso não significa que todo identificador seja `dado pessoal sensível` na definição jurídica da LGPD.

A categoria legal de dado pessoal sensível inclui, entre outros, dados sobre saúde, origem racial/étnica, convicção religiosa, opinião política, filiação sindical, vida sexual e dados genéticos/biométricos vinculados a uma pessoa.

Nos sistemas acadêmicos, informações como histórico, notas, solicitações e situação acadêmica podem não ser `sensíveis` no sentido técnico do art. 5º, II, mas continuam sendo dados pessoais e podem exigir **alta restrição institucional**.

## 6. Privacy by design

Antes de implementar uma funcionalidade, perguntar:
1. precisamos realmente desse dado?
2. ele precisa chegar ao navegador?
3. ele precisa aparecer na tela?
4. ele precisa entrar no log?
5. ele precisa persistir?
6. quem precisa acessar?
7. qual é a forma segura de testar?

Se a resposta for não, eliminar o tratamento desnecessário.

## 7. Transparência não é exposição

Transparência para o titular não significa publicar infraestrutura, IDs internos, dados de terceiros ou detalhes que aumentem superfície de ataque. Informações técnicas devem ser proporcionais à finalidade da comunicação.
