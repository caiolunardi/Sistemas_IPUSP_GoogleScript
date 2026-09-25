# Google Workspace e Apps Script — modelo de acesso seguro

## 1. ID de arquivo não concede acesso

Conhecer o ID de uma planilha/pasta/arquivo do Google Drive não concede, por si só, permissão para abri-lo ou editá-lo. Em compartilhamento `Restrito`, apenas pessoas autorizadas podem acessar.

Referência Google Drive: https://support.google.com/drive/answer/2494822?hl=pt-br

Mesmo assim, IDs reais são classificados neste repositório como **informação operacional interna**: não dependemos de `security by obscurity`, mas também não divulgamos infraestrutura sem necessidade.

## 2. Compartilhamento é a fronteira de acesso do Drive

Para recursos com dados pessoais:
- usar `Restrito` por padrão;
- conceder acesso apenas a quem precisa;
- revisar editores/comentadores/leitores;
- evitar `Qualquer pessoa com o link`;
- revisar herança de permissões de pastas;
- usar acesso limitado quando aplicável.

Referência: https://support.google.com/drive/answer/14254362?hl=pt-BR

## 3. Web App pode ter mais privilégio que o usuário

Apps Script Web Apps podem executar como o usuário que acessa ou como o usuário que fez a implantação. Quando executa como o implantador, o backend pode acessar recursos com as permissões desse implantador mesmo que o usuário final não tenha acesso direto à planilha.

Referência: https://developers.google.com/apps-script/guides/web?hl=pt-br

Consequência: **a segurança não pode depender da permissão direta da planilha**. Funções server-side precisam validar entradas, perfil, estado, período e autorização conforme o fluxo real.

## 4. Não expor funções privilegiadas genericamente

Evitar endpoints/funções que aceitem IDs arbitrários de arquivos, linhas, usuários ou operações sem validação. O cliente não é fonte confiável de autorização.

## 5. Princípio do menor privilégio

Para cada sistema, documentar:
- quem pode abrir o Web App;
- `executeAs`/identidade efetiva;
- recursos de Drive/Sheets necessários;
- quem é editor desses recursos;
- quais operações o backend pode executar.

Não ampliar permissão apenas para contornar erro de acesso.

## 6. Recursos públicos

Uma URL/ID pode ser documentada quando o próprio recurso foi deliberadamente criado para acesso público. Essa decisão deve ser explícita; não inferir publicidade pelo fato de a URL estar no frontend.

## 7. Planilhas e pastas

Na documentação de cada sistema usar nomes lógicos:
```text
PLANILHA_PRINCIPAL -> configurada por SPREADSHEET_ID
PASTA_ANEXOS       -> configurada por DRIVE_ROOT_FOLDER_ID
```

e não o identificador real.
