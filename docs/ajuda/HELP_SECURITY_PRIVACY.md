# Segurança, privacidade e limites de exposição

## 1. Regra geral

Tudo na Central de Ajuda deve ser tratado como informação visível ao público daquela aplicação. HTML oculto/modal fechado não é conteúdo privado.

## 2. Não expor

Salvo necessidade aprovada, não incluir IDs de planilha/Drive/implantação, URLs administrativas/privadas, chaves/tokens, e-mails internos não destinados ao atendimento, nomes de funções/abas/colunas usados só na implementação, stack traces ou mensagens cruas de exceção.

## 3. Dados pessoais

A ajuda estática não embute dados do usuário. Exemplos, screenshots e FAQs não usam nomes, nº USP, CPF, e-mails ou protocolos reais.

## 4. Ajuda não é autorização

O backend continua validando período, perfil, elegibilidade, dados, permissões e consistência. Nunca enfraquecer validação porque a orientação está clara no frontend.

## 5. Links

Incluir apenas links necessários, estáveis e apropriados ao público. Não expor recursos internos por conveniência do desenvolvedor.

## 6. Atendimento

Usar canais institucionais aprovados. Se o canal mudar, atualizar ajuda e demais pontos da interface na mesma rodada.

## 7. Erros

Não revelar detalhes técnicos desnecessários. Orientar tentativa/encaminhamento em vez de expor função, planilha ou exceção.

## 8. Sistemas internos

Ajuda da equipe pode descrever regras operacionais e estados necessários ao trabalho, mas segue as mesmas regras de segredo, privacidade e minimização técnica.
