# Regras principais — Estrutura Curricular e Grade Horária

## Fonte oficial

O Júpiter continua sendo a fonte oficial. Ajustes locais são sobreposições operacionais e sobrevivem a novas importações.

## CSV e PDF

- CSV = fonte principal para nomes, números, oferta e requisitos.
- PDF = complemento para versão, EXT, relações `ou`, requisito fraco e Informações Básicas.
- PDF do mesmo currículo em uso entra como complemento e não redefine o que o CSV já fixou.

## OCR

A conferência usa contas do relatório: total de créditos, carga horária, subtotais, totais e consenso entre habilitações. Coerência aritmética não é tratada como prova absoluta.

## Revisão humana

Valores que só o PDF fornece e que serão gravados aparecem em revisão com página de origem. No OCR, todas as páginas exigidas devem ter sido entregues ao navegador da operação antes da confirmação.

## Período ideal x semestre de oferecimento

- período ideal = semestre do curso;
- semestre de oferecimento = 1º, 2º ou ambos no ano.

Sem semestre de oferecimento em vigor, a disciplina não entra na grade daquele semestre.

## Ajustes e exclusão

Campo sem ajuste significa usar o Júpiter. Voltar ao valor oficial elimina o ajuste. A chave do ajuste continua ligada à disciplina original. Excluir é soft delete e reversível.

## Disciplinas para outros cursos

Código deve ser único entre estrutura, excluídas e lista de outros cursos. Itens entram inicialmente fora da grade.

## Seleção da grade

Marcar na tela não grava. A persistência ocorre por ação explícita. Item já adicionado fica marcado/travado.

## Abas da prévia

PSA/PSC/PSE/PST pelo prefixo; 470… em Interdepartamentais; demais em Outras Unidades.

## Divergência entre habilitações

Prioridade no envio: Psicólogo → Bacharelado → Licenciatura. Disciplinas para outros cursos vão com Tipo e Semestre Ideal em branco.

## Ordem da grade

Obrigatórias → Eletivas → Livres → sem tipo; depois semestre ideal e código.

## Colunas controladas

O envio grava C Código, D Nome, E Tipo, I Semestre Ideal, J Créditos Aula e M Horário de Fim; limpa B4:S999 das seis abas e preserva áreas fora do intervalo documentado.

## Horário de fim

Início + créditos-aula, com 1 crédito = 1 hora. A fórmula aceita hora ou texto, devolve `HH:mm` em texto e respeita o separador da localidade.

## Reenvio

É permitido, cria outro backup, preserva a auditoria do semestre e substitui novamente o preenchimento atual.

## Auditoria

Edição simples pode registrar anterior/novo; colagens têm limitações do evento; mudanças feitas por scripts e alterações apenas de formato não são capturadas como edição de usuário. Eventos do sistema são registrados explicitamente.

## Não oferecidas

`Será oferecida = NÃO` aparece como `Aguardando Justificativa`. A justificativa é externa ao sistema.

## Grades anteriores

O painel navega pelas auditorias anteriores, mas ainda não reconstrói o preenchimento final a partir da cópia.
