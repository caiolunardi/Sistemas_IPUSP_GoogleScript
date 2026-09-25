# Resposta a incidentes e exposição acidental

Este documento define um fluxo técnico inicial. A decisão formal sobre comunicação institucional, titulares e ANPD cabe às instâncias responsáveis da USP.

## 1. O que tratar como incidente/suspeita

Exemplos:
- segredo ou token commitado;
- planilha/pasta compartilhada além do necessário;
- dado pessoal em Git, issue, screenshot ou log;
- Web App permitindo acesso/alteração indevida;
- envio de dado para destinatário incorreto;
- credencial exposta em HTML/client-side;
- perda, alteração ou exclusão indevida de dados;
- suspeita de acesso não autorizado.

## 2. Primeiras ações

1. **Conter** — interromper nova exposição sem destruir evidência.
2. **Segredo exposto** — revogar/rotacionar o segredo imediatamente; não confiar em apagar commit.
3. **Recurso Drive** — restringir compartilhamento/permissões se isso puder ser feito com segurança.
4. **Web App vulnerável** — desabilitar/restringir implantação ou função afetada quando necessário.
5. **Preservar evidências** — registrar horário, sistema, recurso, tipo de dado, escopo conhecido e ações tomadas.
6. **Escalar internamente** — comunicar a liderança/responsável e o canal institucional de proteção de dados aplicável.

## 3. USP/EPDI

O EPDI informa como atribuição comunicar imediatamente ao Encarregado sobre suspeita ou ocorrência efetiva de incidente e orientar medidas de mitigação.

Referência: https://sites.usp.br/lgpd/escritorio/

Contato institucional do Encarregado/EPDI deve ser consultado na página oficial vigente: https://sites.usp.br/lgpd/encarregado-contato/

## 4. ANPD

A LGPD, art. 48, prevê comunicação de incidente que possa acarretar risco ou dano relevante. O Regulamento de Comunicação de Incidente de Segurança (Resolução CD/ANPD nº 15/2024) disciplina critérios, conteúdo, prazo e registro.

A página atual da ANPD informa prazo de três dias úteis para comunicação pelo controlador nos casos sujeitos à obrigação, ressalvada legislação específica. **Desenvolvedor não deve decidir isoladamente se o incidente é comunicável nem iniciar comunicação externa em nome da USP sem autorização institucional. Escalar imediatamente permite que a instituição avalie o prazo.**

Referência: https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis

## 5. Git: remover não é revogar

Se credencial foi commitada:
- rotacionar/revogar primeiro;
- remover do código atual;
- avaliar limpeza de histórico Git;
- revisar forks/clones/CI/artifacts;
- documentar o ocorrido conforme fluxo institucional.

Se dado pessoal foi commitado, não reescrever histórico às cegas antes de alinhar contenção, preservação de evidência e orientação institucional.

## 6. Pós-incidente

Registrar causa raiz, dados/recursos afetados, janela temporal, contenção, correções, necessidade de rotação, permissões revistas, testes de regressão e ação preventiva.
