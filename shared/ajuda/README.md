# Implementação compartilhada da Central de Ajuda

Referência genérica para novos Web Apps.

## Arquivos
- `GradipAjudaTemplate.html` — estrutura semântica de exemplo.
- `GradipAjudaEstilos.html` — modal, busca, navegação e FAQ.
- `GradipAjudaUI.html` — abertura, busca, FAQ, foco, ESC e scroll lock.

## Uso

Copiar/renomear para `<Sistema>Ajuda.html`, `<Sistema>AjudaEstilos.html` e `<Sistema>AjudaUI.html`; substituir o conteúdo do template; manter o contrato `data-*`; adaptar estilo apenas quando necessário; evitar alterar o JS genérico sem motivo funcional.

Sistemas existentes não precisam ser renomeados.

## Dependência visual

Os estilos usam tokens `--gradip-*` quando disponíveis, com fallbacks para não quebrar sistemas ainda não migrados.

## Conteúdo

O template contém texto demonstrativo marcado. Não publicar sem substituir e validar informações de domínio.
