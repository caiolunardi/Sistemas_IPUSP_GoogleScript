# Classificação de dados e informações

Esta classificação é uma convenção de engenharia do repositório. Ela não substitui classificações jurídicas ou administrativas da USP.

## Nível 0 — Público

Pode ser versionado quando sua publicação é intencional.

Exemplos:
- textos públicos da interface;
- documentação de UX;
- links institucionais públicos;
- normas e regulamentos públicos;
- URL de formulário ou Web App **quando ela já é destinada ao público documentado**;
- e-mail institucional explicitamente publicado como canal de atendimento.

## Nível 1 — Interno operacional

Não é necessariamente segredo criptográfico nem dado pessoal, mas não deve ser exposto no Git sem necessidade.

Exemplos:
- `SPREADSHEET_ID`;
- `FOLDER_ID`;
- `FORM_ID`;
- `DOCUMENT_ID`;
- `SCRIPT_ID`;
- `DEPLOYMENT_ID`;
- URLs administrativas;
- nomes internos de recursos não públicos;
- estrutura operacional que só interessa à manutenção.

**Regra padrão:** documentar o nome lógico/config key, não o valor real.

## Nível 2 — Dado pessoal / restrito

Não versionar dados reais.

Exemplos:
- nome de aluno/servidor;
- Nº USP;
- CPF;
- e-mail pessoal ou institucional associado à pessoa;
- telefone;
- protocolo ligado ao titular;
- respostas de formulário;
- situação acadêmica;
- disciplinas/matrículas individualizadas;
- histórico, notas, créditos;
- conteúdo de e-mail relacionado a pessoa identificável.

## Nível 3 — Dado pessoal sensível ou dado de alto impacto

Tratamento exige cuidado reforçado. Não inserir em repositório, fixtures, screenshots, logs ou prompts de agente de código.

Exemplos legais de dados sensíveis: saúde, biometria, origem racial/étnica, religião, opinião política, filiação sindical, vida sexual, dado genético quando vinculado ao titular.

Também tratar como alto impacto, mesmo quando não enquadrado juridicamente como sensível: conjuntos extensos de histórico acadêmico, documentos digitalizados, bases com múltiplos identificadores e informações capazes de causar dano relevante em caso de exposição.

## Nível 4 — Segredo/credencial

**Nunca commit.**

Exemplos:
- senha;
- token OAuth;
- API key não pública;
- client secret;
- private key;
- credencial de service account;
- cookie/sessão;
- segredo de webhook;
- token pessoal do GitHub;
- backup contendo credenciais.

Se um segredo for commitado, tratá-lo como potencialmente comprometido mesmo em repositório privado e seguir `INCIDENTES.md`.

## Matriz rápida

| Item | Classe | Git | Forma recomendada |
|---|---|---|---|
| Nome de token/configuração (`SPREADSHEET_ID`) | Público/documentável | Sim | Documentar chave, sem valor |
| ID real da planilha | Interno operacional | Não por padrão | Script Properties |
| ID real de pasta Drive | Interno operacional | Não por padrão | Script Properties |
| URL pública já destinada ao aluno | Público | Sim | Documentar finalidade |
| Nome/Nº USP/CPF reais | Pessoal | Não | Dados de produção apenas |
| Histórico/notas de aluno | Pessoal de alta restrição | Não | Sistema autorizado |
| Dado de saúde/acessibilidade individual | Sensível/alto impacto | Não | Sistema autorizado |
| Token/API secret | Segredo | Nunca | Mecanismo seguro aprovado |

## Regra de dúvida

Se houver dúvida entre duas classes, adotar temporariamente a mais restritiva até validação.
