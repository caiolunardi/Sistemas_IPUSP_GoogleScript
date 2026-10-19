# Manual de operação — 1.10.0

Referência de uso da Estrutura Curricular e Grade Horária. As regras detalhadas estão em [REGRAS.md](REGRAS.md); a ajuda incorporada ao app está documentada em [AJUDA.md](AJUDA.md). Este manual descreve a fonte do Git, sem presumir que ela já esteja implantada.

## Acesso e navegação

Entre com a conta institucional autorizada. O papel vem da aba `ESTRUTURA_CURRICULAR` da planilha de permissões: `ADMINISTRADOR` consulta e altera; `LEITOR` consulta a estrutura e a auditoria. Estar no domínio ou ser dono da planilha não concede automaticamente acesso. O cache de permissões pode levar até um minuto para refletir uma alteração.

O app abre sempre com **Menu lateral**. Em **Modo de navegação**, escolha **Abas** para colocar as mesmas opções nas barras horizontais. A troca conserva seção, etapa, consulta, filtros, seleções e rascunhos; não recarrega dados nem salva nada. Ao recarregar a página, o menu lateral volta. Até 900 px, o menu fica acima do conteúdo e oferece **Recolher menu / Mostrar menu**, sem cobrir a página.

São três níveis: **Seções do sistema** (Estrutura/Auditoria), **Preparação da grade** (quatro etapas, somente administrador e com base carregada) e **Consultas da estrutura** (Disciplinas/Currículos/Importações na etapa 1). As abas das seis partes da prévia continuam próximas da prévia. Os ícones acompanham os rótulos; números das etapas e contagens permanecem visíveis.

Tab chega ao conjunto de opções. No menu lateral, ↑/↓ percorrem e ativam opções; nas barras horizontais, ←/→. Home/End vão à primeira/última. **Aparência** oferece Sistema, Claro e Escuro. Sistema acompanha o sistema operacional; Claro/Escuro são guardados somente no navegador em `gradip-theme`. Movimento reduzido desativa elevação e animação.

## Primeiro acesso e importação

Na primeira abertura por um administrador, o servidor cria ou repara as abas da base com cabeçalhos, formatos e notas. Leitores não fazem essa preparação. A base e o índice devem estar configurados e acessíveis à conta executora; veja [Instalação](INSTALACAO_E_ATUALIZACAO.md).

No Júpiter, obtenha **Grade Curricular**. O CSV é a fonte preferida dos nomes completos, números e vínculos. O PDF complementa versão, extensão, grupos de requisitos e informações do currículo. Selecionar CSV e PDF juntos continua sendo **duas importações**, CSV primeiro e PDF depois; o PDF pode ser lido em segundo plano.

1. Escolha o arquivo em **Importar arquivo**.
2. Aguarde a leitura no navegador. PDF com texto usa essa camada; sem texto usa OCR.
3. Confira avisos e dados lidos. OCR pode exigir revisão dos valores e páginas indicados.
4. Leia a prévia do servidor: alterações, complementos, divergências e bloqueios.
5. Confirme depois da conferência. O servidor revalida pacote, prévia e base antes de ativar.
6. Aguarde o resultado. Com os dois arquivos, prossiga para o PDF depois de concluído o CSV.

O arquivo bruto permanece no navegador. O servidor recebe dados extraídos; na inclusão por unidade recebe o texto do CSV. Não há upload do PDF para reconhecimento no Drive. OCR exige conferência; campos não confirmados não podem substituir silenciosamente a base.

CSV completo define as habilitações do arquivo. PDF do currículo ativo funciona como complemento; PDF de currículo ainda ausente pode ser completo. Currículo mais antigo ou outro curso pode bloquear a gravação. Veja [CSV_X_PDF.md](CSV_X_PDF.md).

## Etapa 1 — Estrutura curricular

Em **Disciplinas**, busque por código/nome e combine filtros. A busca ignora acentos e caixa. Ordene ou baixe CSV; abra a ficha para consultar créditos, cargas, habilitações, oferta, requisitos, observações e histórico.

Administradores podem corrigir campos. Essas correções ficam em **Ajustes manuais**, separadas do Júpiter. **Observações** da estrutura ficam na coluna do catálogo e são exibidas aos usuários autorizados. Salvar e adicionar à grade têm resultados próprios: uma parte pode ficar salva quando a outra não termina. Leia o resultado, em vez de pressupor reversão de tudo.

Excluir retira a disciplina das listas usuais e da grade, conservando os dados oficiais para restauração. Administradores localizam excluídas pelo filtro de situação. Marcar uma caixa é seleção local, não adição efetiva à grade.

Ao substituir currículo, uma oferta ajustada pode apresentar vínculos **a revisar**. Confira a associação antes de mudar a oferta; o descarte exige confirmação. **Voltar aos dados do Júpiter** restaura valores oficiais conforme as regras atuais, incluindo a oferta.

**Período ideal** é semestre do curso. **Semestre de oferecimento** é semestre do ano (1º, 2º ou ambos). A paridade do período é a origem padrão do oferecimento, que pode ter ajuste operacional.

Em **Currículos**, consulte habilitações vigentes e estruturas anteriores. Em **Importações**, consulte registros e alterações. O painel recebe as 30 importações e 600 alterações mais recentes; esses limites de tela não apagam o histórico das planilhas.

## Etapa 2 — Disciplinas para outros cursos

Use **Lista de disciplinas por unidade**, do Júpiter, em CSV, para conferir e incluir os códigos escolhidos. O servidor refaz a prévia e confere assinatura e seleção. Também há cadastro manual.

Esses registros têm identidade própria, separados do catálogo curricular. Edite oferecimento, unidade/curso atendidos e campos disponíveis. Confirme explicitamente a inclusão na grade quando necessário. Importar a estrutura curricular não apaga esses cadastros.

## Etapa 3 — Lista para a grade horária

Reúna os itens da grade. Confira selos e contagens para distinguir caixa marcada, disciplina adicionada e excluída. Use ações explícitas de adicionar/remover. Lotes podem ficar pendentes; o app registra o pedido e confere item por item antes de declarar conclusão.

## Etapa 4 — Prévia e envio

Escolha semestre/ano. Confira PSA, PSC, PSE, PST, Interdepartamentais e Outras Unidades. A oferta principal da estrutura segue Psicólogo → Bacharelado → Licenciatura; ajustes válidos são aplicados. Disciplinas para outros cursos não recebem artificialmente tipo/período do currículo de Psicologia.

**Enviar Grade para Preenchimento** abre a conferência das linhas que o servidor enviaria, com contagens e assinatura. Alterar dados efetivamente enviados exige nova conferência, mesmo com contagens iguais. Alternar sidebar/abas não modifica esse conteúdo.

O envio mantém a planilha das secretarias como arquivo fixo. Antes de apagar nela, copia o arquivo inteiro para backups e registra a cópia no índice. Atualiza **B4:S999** das seis abas, grava código/nome/tipo/período/créditos e fórmulas do fim, e renomeia para o semestre escolhido. O preenchimento anterior de docentes, dias, horários, vagas, salas e observações em B:S sai da planilha ativa e fica na cópia. Linhas 1–3, colunas T em diante e outras abas são preservadas conforme o contrato.

Reenvio é permitido e gera nova cópia; linhas manuais das secretarias na faixa substituída devem ser tratadas depois do envio definitivo. **Cadastrar nova grade** é outro comando: reinicia a base curricular mediante `APAGAR`, sem backup automático dessa base. Não é necessário para trocar navegação.

## Secretarias e auditoria

Secretarias preenchem a planilha operacional. O projeto vinculado usa `Validacoes.gs` para modalidade Prática e conflitos de Eletiva/Livre com Obrigatória. Horário de Fim é fórmula em M. O Web App independente instala os acionadores de auditoria de edição e abertura.

Em **Auditoria da grade**, admin/leitor escolhem semestre e consultam andamento por departamento, não oferecidas, aberturas, edições, linha do tempo e histórico por disciplina. O painel não entrega link para a auditoria crua. Semestres antigos têm auditoria; o preenchimento final não é reconstruído automaticamente do backup.

(1.11.2/1.11.3) A auditoria mostra uma seção por vez: escolha Preenchimento, Panorama, Não serão oferecidas, Quem abre e edita ou Edições no submenu abaixo de "Auditoria da grade" (no modo Abas, na barra acima do conteúdo).

(1.11.0) Cada pessoa aparece com o nome em destaque e, embaixo, o setor (servidores), "Docente" ou "Aluno(a)" e o e-mail. O nome vem dos cadastros `SERVIDORES`, `PLANILHA_DOCENTES` e `PLANILHA_ALUNOS`, nessa ordem; o nome achado fica em cache por até 10 minutos (1.11.1: "não cadastrado" não fica, então quem acabou de ser incluído aparece ao recarregar). **"Pessoa não cadastrada com acesso"**, com selo "Atenção", indica e-mail fora dos três cadastros: confira quem é e se deveria ter acesso à planilha das secretarias. **"Nome não verificado"**, com o aviso "Nomes incompletos" no topo, indica que um cadastro não abriu: rode `diagnosticarNomesAuditoria` e confira a chave no `ID_INDEX` e o acesso de leitura da conta do Web App.

## Ajuda, janelas e falhas

**Ajuda** e **?** abrem a Central estática com busca/FAQ, inclusive se os dados falharem. Feche por Fechar, Escape ou clique no fundo; o foco retorna ao destino seguro. Janelas operacionais mantêm fechamento por controles explícitos. Ajuda não descarta rascunhos nem confirma operações.

| Situação | Conduta |
|---|---|
| Permissão negada | conferir conta e lista; trocar layout não concede acesso |
| Importação sem resposta | verificar pelo identificador da operação; manifesto determina ativação |
| Salvamento/lote pendente | concluir e conferir; descarte não desfaz o já confirmado |
| Painel pede recarga | recarregar e conferir persistência/pedidos pendentes |
| Prévia de envio desatualizada | conferir de novo; não reutilizar confirmação antiga |
| Envio incompleto | a cópia pode existir e os dados estar nas seis abas; outras etapas podem não ter terminado |
| Falha de fórmula/renomeação/acionador | verificar resultado e diagnósticos reais antes de liberar às secretarias |

**Dados iguais à prévia nas seis abas não provam que todo o envio terminou.** Fórmulas ou renomeação podem falhar depois. A ajuda 1.9.3 conserva: “a cópia de segurança foi feita, mas nem todas as etapas do envio foram concluídas”.
