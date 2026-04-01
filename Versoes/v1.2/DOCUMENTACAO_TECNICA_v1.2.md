# Documentação Técnica — Gestão de Estoque / NF
## Versão 1.2

> **Status:** Estável
> **Data:** Março 2026
> **Responsável:** Guilherme — Liquidz

---

## Changelog v1.2

| Feature | Descrição | Arquivos alterados |
|---|---|---|
| FEAT-08 | Fluxo Trade Clientes: NF atribuída à Larissa (`111932998`) em vez da Fernanda | `Financeiro.gs` |

### Detalhe da implementação (FEAT-08)

- Adicionadas constantes `LARISSA_ID_FIN = 111932998` e `TRADE_EVENTO_FIN = "Trade Clientes"`
- Em `processarFinanceiroEClickUp()`: antes de chamar `_criarTarefaClickUp`, determina o assignee:
  ```js
  const assigneeId = (nome === TRADE_EVENTO_FIN) ? LARISSA_ID_FIN : FERNANDA_ID_FIN;
  ```
- `_criarTarefaClickUp()` recebe `assigneeId` como parâmetro (era hardcoded `FERNANDA_ID_FIN`)

---

## Changelog v1.1

| Bug | Descrição | Arquivos corrigidos |
|---|---|---|
| BUG-01 | `getActiveSpreadsheet()` substituído por `openById()` | `Consolidacao.gs`, `EventosClickup.gs`, `PDFEventos.gs`, `sincronizarUsuariosClickUp()` em `Financeiro.gs` |
| — | IDs de planilha centralizados em `Ambiente.gs` via `getIdPlanilha()` | `Ambiente.gs` (novo), todos os `.gs` |

---

## Backlog atualizado

### Bugs

| ID | Descrição | Status |
|---|---|---|
| BUG-01 | `getActiveSpreadsheet()` em triggers | ✅ Corrigido em v1.1 |
| BUG-02 | `getNextDataCell()` instável | ✅ Corrigido em produção (v7.8) |
| BUG-03 | `SpreadsheetApp.flush()` dentro de loops | ✅ Corrigido em produção |

### Features

| ID | Descrição | Status | Camada |
|---|---|---|---|
| FEAT-05 | Dashboard | Congelada | AppSheet |
| FEAT-06 | Alerta de Estoque Mínimo | Pendente | GAS + MailApp |
| FEAT-07 | Relatório de Custo por Evento | Aguardando definição de centro de custos | GAS + Sheets |
| FEAT-08 | Fluxo Trade Clientes — NF atribuída à Larissa | ✅ Implementado em v1.2 | GAS (`Financeiro.gs`) |
| FEAT-09 | Campo Justificativa na solicitação | Pendente | AppSheet |
| FEAT-10 | Gráfico de impacto na tela de aprovação | Pendente | AppSheet |
| FEAT-11 | Email do solicitante na tela de aprovação | Pendente | AppSheet |

---

Para o restante da documentação (infraestrutura, estrutura de abas, regras críticas), ver `DOCUMENTACAO_TECNICA_v1.0.md` — sem alterações nesta versão.
