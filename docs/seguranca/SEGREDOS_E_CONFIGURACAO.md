# Segredos e configuração de produção

## 1. Regra principal

Valores que variam por ambiente ou identificam recursos de produção não devem ficar espalhados no código versionado.

Preferir chaves lógicas:
```text
SPREADSHEET_ID
DRIVE_ROOT_FOLDER_ID
FORM_ID
FINANCEIRO_EMAIL
PUBLIC_FORM_URL
```

e manter o valor real fora do Git.

## 2. Apps Script — Script Properties

Para identificadores operacionais e configuração server-side, a opção padrão é `PropertiesService.getScriptProperties()`.

Exemplo de leitura:
```javascript
function getRequiredScriptProperty_(name) {
  const value = PropertiesService.getScriptProperties().getProperty(name);
  if (!value) {
    throw new Error('Configuração obrigatória ausente: ' + name);
  }
  return value;
}

const spreadsheetId = getRequiredScriptProperty_('SPREADSHEET_ID');
```

**Nunca logar o valor da propriedade em mensagem de erro.**

Documentação oficial: https://developers.google.com/apps-script/guides/properties?hl=pt-br

## 3. Limite do Script Properties

Script Properties mantém valores fora do Git e é adequado para configuração compartilhada pelo script, mas **não deve ser tratado como um cofre de alta segurança nem como barreira contra editores autorizados do projeto**. A documentação do Google define esse armazenamento como acessível no escopo do script aos usuários do script.

Credenciais de alto valor devem seguir o mecanismo institucional aprovado para aquele caso. Se não houver orientação definida, registrar `A VALIDAR` e não improvisar um segredo no código.

## 4. Nunca enviar segredo ao cliente

Qualquer valor inserido no HTML/JavaScript entregue ao navegador deve ser considerado visível ao usuário.

Não colocar segredos em:
- `<script>`;
- atributos `data-*`;
- campos hidden;
- comentários HTML;
- respostas de `google.script.run`;
- mensagens de erro;
- source maps ou blobs client-side.

## 5. Arquivos de configuração

Não versionar `.env`, credenciais JSON, private keys ou arquivos equivalentes. O repositório central possui `.gitignore` preventivo, mas ignore não substitui revisão.

## 6. Exemplos e setup

Pode existir arquivo `*.example` com **placeholders**, por exemplo:
```text
SPREADSHEET_ID=<CONFIGURAR_NO_APPS_SCRIPT>
DRIVE_ROOT_FOLDER_ID=<CONFIGURAR_NO_APPS_SCRIPT>
```

Nunca criar um script de setup versionado contendo os valores reais `setProperty('SPREADSHEET_ID', '1AbC...')`.

## 7. Rotação

Segredos comprometidos devem ser revogados/rotacionados. Apagar o valor do último commit não é suficiente, pois o histórico Git pode continuar contendo-o.
