# Decisões e distinção entre legado e futuro

**Origem:** orientação expressa do responsável na conversa de 06/11/2026, complementada com observação dos dois arquivos fornecidos. Nenhum item desta página autoriza reescrita de código, substituição documental, alteração acadêmica ou implantação.

| ID | Tema | Decisão/requisito | Estado verificável |
| --- | --- | --- | --- |
| PCG-DEC-001 | Fronteira entre aplicativos | Formulário recebe e corrige pedidos e coleta documentos; Gerenciador trata etapas, análise, documentos e e-mails da equipe | **Regra de responsabilidade**; fluxo do Gerenciador versionado separadamente |
| PCG-DEC-002 | Documentos de colações anteriores | Futuro formulário deve detectar documentos anteriores e oferecer reutilização, atualização ou novo envio com escolha do aluno | **REQUISITO FUTURO**; o legado não faz isso |
| PCG-DEC-003 | Histórico e prova de cada pedido | Nenhuma nova solicitação deve apagar silenciosamente evidências de uma colação anterior; necessidade de proveniência/versionamento por solicitação | **REQUISITO FUTURO**, esquema e retenção a definir |
| PCG-DEC-004 | Documentação antes da reforma | Primeiro inventariar os códigos atuais e registrar responsabilidades, sem modificar os arquivos Apps Script | **ESCOPO DESTA RODADA** |
| PCG-DEC-005 | Segurança e privacidade | Não copiar código bruto com IDs/URLs operacionais ao Git público; publicar só documentação sanitizada até o preflight | **GATE DO REPOSITÓRIO** |
| PCG-DEC-006 | Contexto local | Preparar continuidade do formulário de maneira independente da do Gerenciador; sem ativação do manifesto global nem declaração de adoção sem revisão | **PROPOSTA**, ainda não ADOTADO |

## Questões que exigem decisão posterior

- Qual deve ser o formato de vínculo documento↔colação↔Registro ID? E quando uma versão pode ser descartada?
- A equipe deve aprovar reutilização de RG/certidão ou o aluno apenas indica a intenção de reutilizar?
- Como tratar documento ilegível, desatualizado ou com dados alterados?
- Qual estratégia de autorização permite ao aluno enviar seus documentos **sem** acesso direto aos dados de outros estudantes?
- Se a pessoa corrige pedido após início das etapas administrativas, quais campos podem mudar e quem é avisado?
- Como compatibilizar a versão 4.0 do Gerenciador com novos metadados e as diferentes convenções de nome de arquivo?

Até decisão explícita, nenhuma resposta presumida a essas questões deve aparecer como funcionalidade implementada. Consultar [pendências do aplicativo](../../../sistemas/pedido-colacao-grau/contexto/PENDENCIAS.md).
