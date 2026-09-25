# Minimização, dados de teste, logs e screenshots

## 1. Fixtures nunca vêm da produção

Não copiar linhas reais de Sheets, PDFs, e-mails, históricos ou formulários para testes versionados.

Usar dados sintéticos claramente fictícios:
```text
ALUNO EXEMPLO
NUSP_TESTE_001
usuario.teste@example.invalid
PROTOCOLO_TESTE_001
```

Evitar CPFs aleatórios que possam coincidir com pessoa real. Preferir placeholders explicitamente inválidos ou campos abstratos.

## 2. Screenshots

Antes de colocar imagem no GitHub ou enviar para agente externo:
- ocultar nomes;
- Nº USP;
- CPF;
- e-mails;
- telefones;
- protocolos;
- conteúdo acadêmico individual;
- IDs internos e URLs privadas quando não necessários.

Recortar a área também pode ser melhor que borrar.

## 3. Logs

Não usar `Logger.log(objetoCompleto)`/`console.log(payload)` em produção quando o objeto contém dados pessoais.

Preferir logs mínimos:
```text
requestId=abc123 status=VALIDACAO_FALHOU etapa=periodo
```

Quando for necessário correlacionar eventos, preferir identificador técnico/protocolo não diretamente identificável no log, desde que isso realmente reduza exposição.

## 4. Hash não significa anonimização automática

Trocar CPF/Nº USP por hash pode ser pseudonimização, não necessariamente anonimização, especialmente se houver possibilidade de correlação/reidentificação. Não rotular dado como anônimo apenas porque foi hasheado.

## 5. Mensagens de erro

A mensagem para o usuário deve conter orientação, não dump técnico. Não mostrar stack trace, IDs, caminhos, conteúdo de células ou exceções do Google.

## 6. Agentes de código e IA

Ao usar Claude, Cursor ou outro agente:
- enviar somente o mínimo necessário;
- remover dados pessoais reais;
- remover segredos/credenciais;
- substituir IDs de produção quando eles não forem necessários à tarefa;
- não colar exports de planilha/histórico/e-mail reais apenas para dar contexto;
- usar ferramentas/ambientes conforme as regras institucionais aplicáveis.

O fato de um chat, projeto ou repositório ser privado não elimina o princípio de minimização.

## 7. Documentação de sistema

Diagramas e exemplos usam entidades genéricas (`Aluno`, `Servidor`, `Solicitação`) e nomes lógicos de recursos, não registros reais.
