# Fluxos — Gerenciador de Abertura de Habilitações 2.0

Cada fluxo indica a função do servidor, o perfil exigido e o que é gravado. "Nada gravado" quer dizer: nenhuma célula da planilha muda.

## 1. Abrir a página (`doGet`)

1. O servidor lê o e-mail da sessão e a aba `GERENCIADOR_HABILITACOES`.
2. Sem e-mail, fora da lista, perfil vazio ou desconhecido, ou lista indisponível: página **sem acesso**, com o motivo em linguagem simples e nenhum dado.
3. Com acesso: a página recebe só o perfil, a versão e se é homologação. **Nada gravado** (na 1.0, a visita atribuía Registro ID e Versão).
4. A página abre em **Pendentes**, com menu lateral, e chama `obterPendentes`.

## 2. Listar pendentes (`obterPendentes`, LEITOR)

1. Uma leitura em lote da aba atual; conferência de estrutura (títulos repetidos, J/K deslocadas, colunas obrigatórias).
2. Pendente = linha com Nome e Situação (K) sem "conclu". Ordem alfabética (pt-BR).
3. Linha sem Registro ID, com ID fora do formato ou repetido: continua na lista, marcada, sem abrir.
4. A página filtra por nome ou Nº USP sem diferença de acentos e maiúsculas (filtro local, sem nova chamada).

## 3. Abrir um pedido (`obterDetalhe`, LEITOR)

1. A página manda o Registro ID; o servidor confere o formato, acha a linha e devolve os campos em texto.
2. ID ausente, repetido ou não encontrado: erro explicado; nada gravado.
3. Opções iniciais (como na 1.0): pendente → **Concluir** e **Avisar** marcados; concluído → **Concluir** marcado, **Avisar** desmarcado. Sem e-mail cadastrado, **Avisar** fica desativado.
4. LEITOR vê os dados, sem campo de observações editável nem botão de salvar.

## 4. Salvar (`salvarPedido`, ADMINISTRADOR)

```text
página ──(ID, Versão vista, {observacoes, concluirSolicitacao, avisarAluno, reenviar})──► servidor
  [trava 1]  confere Versão ─ diferente → CONFLITO_VERSAO (nada gravado)
             se avisar: reserva recente → ENVIO_EM_ANDAMENTO (nada gravado)
                        reserva velha/da 1.0 e sem reenviar → REENVIO_NECESSARIO/ENVIO_INTERROMPIDO
                        já avisado e sem reenviar → REENVIO_NECESSARIO/JA_AVISADO
                        e-mail vazio ou inválido → SEM_EMAIL (nada gravado)
             grava: Versão+1, J, (reserva ENVIANDO… data), K e Data de Conclusão
             flush, solta a trava
  sem aviso → SALVO / NAO_SOLICITADO
  [sem trava] MailApp.sendEmail
             falhou → desfaz a reserva (se ainda for a nossa) → SALVO / FALHOU
  [trava 2]  acha a linha de novo pelo ID, E-mail Enviado = agora, Versão+1
             ok → SALVO / ENVIADO
             falhou → SALVO / ENVIADO_SEM_REGISTRO (reserva com data fica)
```

Na página:

- antes de enviar e-mail, um diálogo pede confirmação ("Avisar Fulano por e-mail?"); reabrir um pedido concluído também pede;
- `REENVIO_NECESSARIO`: novo diálogo explica o motivo; confirmando, a página chama de novo com `reenviar: true`;
- `NAO_SOLICITADO` e `ENVIADO`: o detalhe fecha, aparece um aviso de sucesso e a lista da área é recarregada;
- `FALHOU`: o detalhe continua aberto com a mensagem; a Versão local é atualizada (o pedido foi salvo);
- `ENVIADO_SEM_REGISTRO`: o detalhe continua aberto, **Avisar** é desmarcado e a mensagem diz para não reenviar;
- `CONFLITO_VERSAO`: o texto digitado fica; o botão **Recarregar pedido** traz a Versão e as observações atuais (mostradas à parte) sem apagar o rascunho;
- botão de salvar desativado enquanto a chamada está em andamento (clique duplo não duplica).

## 5. Reabrir

É o mesmo `salvarPedido` com **Concluir** desmarcado num pedido concluído: K = `pendente`, Data de Conclusão anterior mantida (como na 1.0; decisão pendente). A página pede confirmação.

## 6. Concluídos e histórico (LEITOR)

- `obterConcluidosRecentes`: os 10 mais recentes da aba atual, por Data de Conclusão, senão pelo carimbo. Reserva de envio aparece como "sem confirmação de envio", nunca como data do aviso.
- `buscarHistorico(termo)`: nome, Nº USP ou e-mail, mínimo 2 caracteres (até 100), nas duas abas, sem diferença de acentos; ordem do mais novo ao mais antigo. Resultados da aba atual com ID único abrem o detalhe; os da aba `2021 - 2022` são só consulta.

## 7. Relatórios (`obterRelatorio`, LEITOR)

Total, por habilitação, por ano e por mês, somando as duas abas, mais "sem data" e o total por aba. Critérios em [REGRAS_E_CONTRATOS.md](REGRAS_E_CONTRATOS.md#4-relatórios).

## 8. Preparar pedido sem identificador (`atribuirIdentificador`, ADMINISTRADOR)

1. O cartão "Sem identificador" mostra **Preparar pedido** para ADMINISTRADOR.
2. A página manda a referência que recebeu na lista (linha, carimbo, Nº USP); o servidor confere, dentro da trava, que a linha ainda é a mesma e ainda não tem ID.
3. Grava um UUID novo e Versão 1 **só naquela linha**. Se as colunas Registro ID/Versão não existirem, recusa (`MIGRACAO_NECESSARIA`).
4. Planilha mudou: `REFERENCIA_DESATUALIZADA`, nada gravado.

## 9. Migração controlada (editor do Apps Script, ADMINISTRADOR)

Passo a passo em [MANUAL_OPERACAO.md](MANUAL_OPERACAO.md#4-migração-controlada-de-registro-id-e-versão).

1. `diagnosticarMigracaoRegistroId()`: só leitura; devolve contagens, números de linha (até 50 por tipo) e um código `MIGRAR-<sem ID>-<repetidos>-<versão inválida>-<colunas faltando>-<última linha>`.
2. Cópia de segurança da planilha; o responsável cria a Script Property `MIGRACAO_REGISTRO_ID_CONFIRMACAO` com o código.
3. `executarMigracaoRegistroId()`: dentro da trava, refaz o plano; se o código não bate (a planilha mudou), recusa sem gravar. Grava só as colunas Registro ID e Versão e apaga a propriedade. Rodar de novo: "nada a fazer".

## 10. Diagnósticos (editor)

- `diagnosticarConfiguracao()`: versão, ambiente, cada chave do `ID_INDEX` (nome da planilha, nunca o ID) e quantos administradores e leitores há. Aceita a conta dona do projeto mesmo fora da lista, para consertar uma lista quebrada.
- `diagnosticarPlanilha()` (ADMINISTRADOR): colunas encontradas, títulos de J e K, contagens por situação, reservas de envio e resumo da migração, sem nomes.
