# Template — DADOS_E_SEGURANCA.md de um sistema

> Copiar para a pasta do sistema e preencher a partir do código/ambiente real. **Nunca registrar valores reais de segredos, IDs internos ou dados pessoais.**

## 1. Escopo

- Sistema:
- Público: aluno / equipe / misto
- Ambiente: produção / homologação
- Responsável funcional:
- Última revisão:

## 2. Dados tratados

| Categoria | Exemplo abstrato | Finalidade | Origem | Destino | Persistência | Classe |
|---|---|---|---|---|---|---|
| Identificador acadêmico | Nº USP | A VALIDAR | A VALIDAR | A VALIDAR | A VALIDAR | Pessoal |

Não inserir registros reais.

## 3. Recursos externos

| Nome lógico | Tipo | Config key | Público? | Permissão esperada |
|---|---|---|---|---|
| PLANILHA_PRINCIPAL | Google Sheets | `SPREADSHEET_ID` | Não | Restrito |
| PASTA_ANEXOS | Google Drive | `DRIVE_ROOT_FOLDER_ID` | Não | Restrito |

**Não preencher IDs reais.**

## 4. Web App

- Quem pode acessar:
- Executa como: `USER_DEPLOYING` / `USER_ACCESSING` / A VALIDAR
- Autorização server-side:
- Dados enviados ao cliente:
- Operações privilegiadas:

## 5. Configuração

Listar somente chaves/configurações:
```text
SPREADSHEET_ID
DRIVE_ROOT_FOLDER_ID
OUTRA_CHAVE
```

Indicar onde são configuradas, sem valores.

## 6. Logs

- Eventos registrados:
- Identificadores registrados:
- Dados explicitamente proibidos em log:
- Estratégia de debug:

## 7. Compartilhamento e acesso

- Planilha:
- Pastas:
- Grupos/contas autorizados: descrever por papel, não por lista pessoal quando possível.
- Revisão de permissões:

## 8. Dados de teste

- Estratégia de fixtures sintéticas:
- Screenshots:
- Baseline de testes sem produção:

## 9. Pontos LGPD/institucionais

- Finalidades documentadas:
- Base legal: `A VALIDAR INSTITUCIONALMENTE` se não houver fonte formal.
- Retenção: `A VALIDAR INSTITUCIONALMENTE` se não houver fonte formal.
- Compartilhamentos externos:
- Dados sensíveis/alto impacto:

## 10. Incidentes

- Canal de escalonamento interno: usar referência institucional vigente, sem inventar contatos.
- Medidas imediatas específicas deste sistema:

## 11. Exceções

Registrar qualquer desvio das diretrizes comuns e sua justificativa.

## 12. Homologação

Anexar/registrar conclusão do `docs/seguranca/SECURITY_CHECKLIST.md`.
