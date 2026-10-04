# Fluxos — Estrutura Curricular e Grade Horária

## Ponta a ponta

```text
Júpiter → leitura no navegador → prévia/validação → ESTRUTURA_CURRICULAR
→ preparação da grade → backup/envio → secretarias → auditoria → CG
```

## Importação

1. administrador seleciona CSV, PDF ou ambos;
2. o navegador lê o arquivo;
3. o servidor revalida o pacote;
4. a prévia mostra o impacto;
5. valores exclusivos do PDF podem exigir revisão humana;
6. a confirmação revalida assinatura e estado da base;
7. a gravação prepara cópias, ativa pelo manifesto e finaliza a arrumação.

CSV+PDF continuam sendo duas importações encadeadas: CSV primeiro; PDF complementar depois.

## Preparação da grade

### Etapa 1 — Estrutura curricular
Ajustes operacionais, Observações, exclusão/restauração e semestre de oferecimento.

### Etapa 2 — Disciplinas para outros cursos
Importação da Lista por unidade ou cadastro manual.

### Etapa 3 — Lista para a grade
Seleção local e persistência explícita por `Enviar para a Grade Horária`.

### Etapa 4 — Prévia
Escolha de semestre/ano e conferência das seis abas de destino.

## Envio

A ordem documentada é: reconstruir linhas e conferir contagens → validar recursos → criar backup → registrar backup → criar/reusar auditoria → limpar e gravar seis abas → renomear → conferir fórmula/eventos/acionadores.

Nada operacional é apagado antes da criação e registro do backup.

## Secretarias

As secretarias preenchem modalidade, oferecimento, docente, dia, início, vagas, observações e sala. `Validacoes.gs` trata modalidade `Prática` e conflito de Eletiva/Livre com Obrigatória do mesmo semestre ideal.

## Auditoria

Acionadores instaláveis de edição e abertura alimentam uma planilha por semestre, separada da planilha das secretarias.

## Comissão de Graduação

Para a grade atual, o painel apresenta não oferecidas, progresso por aba, tabela dos departamentos, gráficos de aberturas/edições, linha do tempo e histórico por disciplina.

Grades anteriores preservam auditoria, mas o preenchimento final ainda não é reconstruído automaticamente a partir do backup.

## Ciclo semestral

```text
importar → ajustar → incluir outros cursos → selecionar → prévia → enviar
→ secretarias preenchem → CG acompanha → próximo envio encerra o semestre
```

## Nova grade

`Cadastrar nova grade` exige digitar `APAGAR`, recria a base e não gera backup automático da base por decisão funcional registrada. O processo possui estado de retomada em metadado.
