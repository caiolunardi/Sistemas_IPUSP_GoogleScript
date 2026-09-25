# Segurança, privacidade e LGPD — diretriz técnica GRADIP

Versão: 1.0 — 2026-09-25

Esta pasta define a linha de base técnica para segurança da informação, privacidade e proteção de dados nos Web Apps do Serviço de Graduação do IPUSP.

Ela foi escrita para orientar desenvolvimento, documentação, revisão de código e uso de agentes de código. **Não substitui a Política de Proteção de Dados da USP, orientações do Escritório de Proteção de Dados e Informações (EPDI), do Encarregado pelo Tratamento de Dados Pessoais, do Comitê Gestor de Governança de Dados e Informações (CGGDI), nem análise jurídica/institucional quando necessária.**

## Objetivos

- impedir que segredos, credenciais e dados pessoais sejam publicados em Git;
- reduzir exposição desnecessária de identificadores operacionais de produção;
- incorporar minimização e privacidade desde a concepção;
- padronizar configuração segura de Apps Script, Sheets e Drive;
- tornar revisões por Claude/Cursor mais seguras;
- estabelecer um procedimento claro para dados de teste, logs e incidentes;
- registrar evidências de boas práticas e governança.

## Princípios

1. **Mínimo necessário.** Se um dado não é necessário ao código, teste ou documento, ele não entra.
2. **Repositório não é cofre.** Nem repositório privado deve armazenar credenciais ou dados pessoais desnecessários.
3. **ID não é permissão, mas também não é documentação pública por padrão.** IDs de Sheets/Drive/Forms/deployments são identificadores operacionais e devem ser abstraídos.
4. **Autorização é validada no backend.** Não confiar em botão oculto, URL desconhecida, nome de função ou obscuridade.
5. **Dados reais não são fixtures.** Testes e screenshots usam dados sintéticos ou devidamente anonimizados.
6. **Logs também são tratamento de dados.** Não registrar objetos completos nem identificadores pessoais sem necessidade.
7. **Segurança desde a concepção.** A LGPD exige medidas técnicas e administrativas durante todo o ciclo do sistema.
8. **Incidente é escalado cedo.** Suspeita de exposição de dado pessoal ou segredo não é tratada informalmente.

## Documentos

- `LGPD_E_PRIVACIDADE.md` — fundamentos legais e institucionais.
- `CLASSIFICACAO_DE_DADOS.md` — classificação prática do que pode ou não ir ao Git.
- `SEGREDOS_E_CONFIGURACAO.md` — Script Properties, credenciais e configuração.
- `GOOGLE_WORKSPACE_E_APPS_SCRIPT.md` — Sheets, Drive, Web Apps e modelo de permissão.
- `MINIMIZACAO_E_DADOS_DE_TESTE.md` — redaction, fixtures, logs, screenshots e IA.
- `INCIDENTES.md` — resposta a vazamento/exposição.
- `SECURITY_CHECKLIST.md` — homologação.
- `SYSTEM_SECURITY_TEMPLATE.md` — modelo para documentar segurança de cada sistema sem registrar valores de produção.
- `REFERENCIAS.md` — fontes oficiais.

## Regra para os próximos sistemas

Todo sistema incorporado em `docs/sistemas/` deve possuir uma seção ou arquivo `DADOS_E_SEGURANCA.md` baseado em `SYSTEM_SECURITY_TEMPLATE.md`. Valores reais de produção não são registrados.
