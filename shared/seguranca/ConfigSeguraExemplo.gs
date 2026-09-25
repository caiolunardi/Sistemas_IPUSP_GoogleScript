/**
 * GRADIP — exemplo de leitura de configuração fora do código versionado.
 *
 * IMPORTANTE:
 * - este arquivo contém somente nomes de propriedades;
 * - nunca adicione valores reais de produção aqui;
 * - não registre o valor da propriedade em logs/erros.
 */
function getRequiredScriptProperty_(name) {
  const value = PropertiesService.getScriptProperties().getProperty(name);
  if (!value) {
    throw new Error('Configuração obrigatória ausente: ' + name);
  }
  return value;
}

function getGradipConfigExample_() {
  return {
    spreadsheetId: getRequiredScriptProperty_('SPREADSHEET_ID'),
    driveRootFolderId: getRequiredScriptProperty_('DRIVE_ROOT_FOLDER_ID'),
  };
}
