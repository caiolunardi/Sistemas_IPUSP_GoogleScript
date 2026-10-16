# Gerenciador de Ofícios e Modelos — ideia em desenvolvimento

> **Estado: ideia em desenvolvimento (16/10/2026).** Não há código nem implantação. Este arquivo reúne o que já foi conversado para não perder nada na hora de desenvolver. Tudo aqui pode mudar; as decisões abertas estão na seção 9.

Exemplos com números, assuntos e nomes fictícios. Nada de dado real (destinatários, conteúdo de ofícios, IDs de pasta ou planilha) entra neste repositório.

## 1. Problema

Hoje o controle numérico dos ofícios é uma planilha com uma aba por órgão emissor e por ano desde 2018 (Comissão de Graduação, Serviço de Graduação e CoC da Licenciatura). Funciona, mas é fácil se perder. Uma primeira leitura (16/10/2026) mostrou:

- **O número do ofício é a linha da planilha.** Por isso há linhas vazias reservadas, abas inteiras pré-numeradas sem uso e um bloco copiado várias vezes numa mesma aba.
- **Número formal digitado à mão** (`Of.CG/NNN/IP/DDMMAAAA`), só em parte das linhas e às vezes descolado do Nº da linha. Já houve dois ofícios com o mesmo número formal.
- **Datas e assuntos arrastados** pelo preenchimento automático da planilha (datas futuras, semestres que não existem).
- **Destino em texto livre:** cerca de 110 grafias diferentes para os mesmos órgãos (ex.: `DRH`, `DRH-USP`, `DRH/USP`), e o mesmo docente escrito de jeitos diferentes.
- **Cabeçalhos e nomes de aba sem padrão** (cabeçalho na linha 3, 4 ou 7; `SG` virou `SVGRAD`; `CoC`/`COC`).
- **Nenhum vínculo com o arquivo:** a planilha não aponta para o Doc nem para o PDF enviado, nem diz se o ofício foi enviado, respondido ou cancelado.

## 2. A ideia em uma frase

Quem vai emitir um ofício escolhe o órgão, o modelo e o destino; o app reserva o próximo número, cria o Google Doc já preenchido na pasta certa do Drive, gera o PDF e deixa um **rascunho de e-mail no Gmail** para revisar e enviar. Tudo fica registrado numa linha só.

## 3. Funcionalidades previstas

1. **Numeração automática e travada** por órgão e ano (`LockService`), gerando o número formal no padrão já usado. Sem duplicar nem pular; número nunca é reaproveitado.
2. **Base única** com colunas de órgão e ano, no lugar de uma aba por ano. A planilha antiga entra como histórico.
3. **Cadastro de destinos e destinatários** com lista suspensa, no lugar do texto livre.
4. **Emissão em lote:** um mesmo ofício para vários destinos (ex.: os quatro departamentos) gera um número e um Doc por destino, ligados pelo mesmo lote.
5. **Modelos de ofício** (grade horária, estrutura curricular, relatório PEEG, substituição na CG, indicação de membros…) que criam o Doc preenchido com número, data, destinatário e campos próprios.
6. **Modelo a partir de um ofício antigo:** escolher um ofício já emitido no Drive; o app copia para `_Modelos/` (convertendo `.docx` para Google Doc) e a pessoa marca os trechos variáveis, que viram marcadores. O app sugere os candidatos óbvios (número, data, destinatário).
7. **E-mail em rascunho:** cada modelo de ofício tem um modelo de e-mail (assunto e corpo com os mesmos marcadores). Ao gerar o ofício, o app cria um rascunho no Gmail com o PDF anexado e o destinatário do cadastro. **O app nunca envia sozinho:** a pessoa revisa e clica em Enviar. No lote, um rascunho por destino.
8. **Drive organizado sozinho:** pastas por órgão e ano criadas na primeira vez que forem necessárias, com nome de arquivo padronizado e links do Doc e do PDF no registro.
9. **Situação do ofício:** Rascunho, Enviado, Respondido ou Cancelado. Número cancelado fica registrado com motivo, em vez de virar linha vazia.
10. **Busca e filtros** por assunto, destino, órgão, período e situação, com alertas para ofício sem PDF ou parado em Rascunho.
11. **Migração do histórico** com tabela de equivalência de destinos conferida antes de aplicar.

## 4. Configuração (ID_INDEX)

| Chave | O que é | Estado |
|---|---|---|
| `OFICIOS` | pasta raiz do Drive dos ofícios | **criada pelo usuário em 16/10/2026** |
| `OFICIOS_REGISTRO` | planilha do registro | sugestão de nome; ainda não existe |

Segue o padrão dos outros sistemas: planilha `ID_INDEX` localizada pela propriedade de script `ID_INDEX_SPREADSHEET_ID`, ambiente de homologação pela coluna `Homologação` (pasta e planilha de teste, para nunca gastar número real em teste), tema GRADIP claro/escuro, Central de Ajuda e `diagnosticarConfiguracao()`.

## 5. Pastas no Drive (dentro de `OFICIOS`)

```text
OFICIOS/
├── _Modelos/        Google Docs com marcadores {{NUMERO}}, {{DATA_EXTENSO}}, {{DESTINATARIO}}…
├── _Historico/      cópia da planilha antiga, só leitura
├── CG/
│   └── 2026/
│       ├── Of.CG-029-2026 – Assunto – Destino      (Google Doc)
│       └── Of.CG-029-2026 – Assunto – Destino.pdf
├── SVGRAD/
│   └── 2026/
└── CoC/
    └── 2026/
```

## 6. Planilha `OFICIOS_REGISTRO`

| Aba | Uma linha por | Para quê |
|---|---|---|
| OFICIOS | ofício emitido | registro principal |
| ORGAOS | órgão emissor | CG, SVGRAD, CoC: prefixo, assinante padrão, ativo |
| DESTINOS | destino | sigla, nome, unidade, destinatário atual, cargo, e-mail |
| MODELOS | modelo | nome, órgão, Doc modelo, campos que pede, assunto padrão, modelo de e-mail |
| CONTADORES | órgão × ano | último número usado, lido e gravado com trava |
| HISTORICO | alteração | quem fez o quê e quando |
| LEIA-ME | — | o que é cada coluna |

Colunas da aba OFICIOS (rascunho):

| Coluna | Exemplo fictício | Observação |
|---|---|---|
| `oficio_id` | `of_3f2a…` | `of_` + UUID, nunca muda (mesma convenção `prefixo_uuid` dos outros apps) |
| `orgao` | CG | da aba ORGAOS |
| `ano` | 2026 | |
| `sequencial` | 29 | gerado pelo contador, nunca digitado |
| `numero_formal` | Of.CG/029/IP/16102026 | montado pelo app |
| `data_emissao` | 16/10/2026 | |
| `assunto` | Grade Horária 1º semestre de 2027 | |
| `modelo_id` | `grade_horaria` | vazio quando é ofício livre |
| `destino_id` | `dest_xxx` | da aba DESTINOS |
| `destinatario` | Prof. Fulano de Tal (Chefia) | sugerido pelo cadastro |
| `lote_id` | `lote_…` | liga ofícios gerados juntos |
| `situacao` | Rascunho / Enviado / Respondido / Cancelado / Histórico | |
| `data_envio` | | |
| `link_doc`, `link_pdf`, `rascunho_gmail_id` | | |
| `observacoes` | | |
| `criado_por`, `criado_em` | | e-mail institucional e data |

## 7. Fluxos

1. **Novo ofício:** órgão → modelo (ou em branco) → destino(s) → campos do modelo → **Reservar número**. Com trava, o app pega o próximo número, cria o Doc a partir do modelo na pasta do órgão/ano e abre o Doc para revisão.
2. **Gerar PDF e rascunho:** depois da revisão do Doc, o app exporta o PDF para a mesma pasta e cria o rascunho no Gmail com o PDF anexado.
3. **Em lote:** mesmo fluxo com vários destinos; um número, um Doc, um PDF e um rascunho por destino.
4. **Finalizar:** marcar Enviado com a data (ou anexar o PDF assinado, se o envio exigir assinatura externa).
5. **Cancelar:** o número fica como Cancelado, com motivo.
6. **Consultar:** lista com busca, filtros e alertas.
7. **Gerenciar modelos e destinos:** cadastrar, editar e desativar; criar modelo a partir de ofício antigo.

## 8. Exemplo de modelo de e-mail (grade horária)

Baseado no e-mail real de encaminhamento do ofício da grade horária às chefias (16/10/2026), com marcadores no lugar dos dados:

```text
Assunto: [IMPORTANTE] Grade Horária do {{SEMESTRE}} – reunião em {{DATA_REUNIAO_CURTA}} e preenchimento até {{PRAZO_CURTO}}

Prezado(a) Professor(a) {{DESTINATARIO_NOME}}, boa tarde!

Encaminhamos em anexo o ofício {{NUMERO}}, com as orientações para o preenchimento
da Grade Horária do {{SEMESTRE}} pelo Departamento.

A grade pode ser consultada e preenchida pelo link abaixo:
{{LINK_GRADE}}

REUNIÃO DE ORIENTAÇÃO: {{DATA_REUNIAO_EXTENSO}}, às {{HORA_REUNIAO}}, na {{LOCAL_REUNIAO}}
Solicitamos a presença da Chefia e da Secretaria do Departamento nesta reunião presencial, ...

O prazo para o preenchimento dos horários das disciplinas e das demais informações é {{PRAZO_EXTENSO}}.

Ficamos à disposição para esclarecer eventuais dúvidas.
Agradecemos desde já.
Atenciosamente,
{{ASSINATURA}}
```

Blocos opcionais (como a reunião) podem ser ligados ou desligados por ofício.

## 9. Notas técnicas já levantadas

- **Rascunho:** `GmailApp.createDraft(destinatario, assunto, corpo, { htmlBody, attachments, cc, from })`. O rascunho aparece na conta que executa o script.
- **Remetente institucional:** para o rascunho sair como o endereço do Serviço de Graduação, o app precisa rodar na conta que tem esse endereço configurado como remetente (opção `from`, alias do Gmail).
- **Assinatura do Gmail** não entra automaticamente num rascunho criado por script; vai no modelo de e-mail (ou é lida via serviço avançado do Gmail, `sendAs`).
- **Conversão `.docx` → Google Doc** pelo serviço avançado do Drive; PDF por `getAs('application/pdf')`.
- **Marcadores** substituídos com `DocumentApp` (`replaceText`) numa cópia do modelo; o modelo nunca é editado na emissão.

## 10. Decisões abertas

1. Quem emite: só a equipe do Serviço de Graduação, ou presidentes da CG/CoC também?
2. "Interessado" × "Destino": na planilha antiga, "Interessado" é a pessoa que recebe e "Destino" é o órgão dela. Tratar assim?
3. A data no fim do número formal é a da reserva do número ou a do envio? SVGRAD e CoC seguem o mesmo formato?
4. Em que número cada contador de 2026 começa (a planilha antiga tem um número formal repetido na CG)?
5. Ofícios recebidos entram no app agora ou depois?
6. Assinatura: o PDF é assinado fora e só anexado, ou o PDF gerado do Doc já basta para envio?
7. Destinatários dos departamentos: puxar chefias da planilha da Comunidade IPUSP, ou cadastro próprio?
8. Conta que executa o app e envia os rascunhos (a do endereço institucional?).

## 11. Antes de começar o código

- Criar `DADOS_E_SEGURANCA.md` a partir de `docs/seguranca/SYSTEM_SECURITY_TEMPLATE.md`: o registro guarda nomes e e-mails de destinatários e conteúdo de ofícios.
- Fonte em `sistemas/gerenciador-oficios/` com o restante da estrutura sugerida em [`docs/sistemas/README.md`](../README.md).
