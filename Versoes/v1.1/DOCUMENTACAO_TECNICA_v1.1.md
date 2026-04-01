# Documentação Técnica — Gestão de Estoque / NF
## Versão 1.1

> **Status:** Estável
> **Data:** Março 2026
> **Responsável:** Guilherme — Liquidz

---

## Changelog v1.1

| Bug | Descrição | Arquivos corrigidos |
|---|---|---|
| BUG-01 | `getActiveSpreadsheet()` substituído por `openById()` | `Consolidacao.gs`, `EventosClickup.gs`, `PDFEventos.gs`, `sincronizarUsuariosClickUp()` em `Financeiro.gs` |

Arquivos sem alteração nesta versão: `Distribuicao.gs` (já estava correto desde v7.8).

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
| FEAT-08 | Fluxo Trade Clientes — NF atribuída à Larissa | **Pendente — próxima versão (v1.2)** | GAS (`Financeiro.gs`) |
| FEAT-09 | Campo Justificativa na solicitação | Pendente | AppSheet |
| FEAT-10 | Gráfico de impacto na tela de aprovação | Pendente | AppSheet |
| FEAT-11 | Email do solicitante na tela de aprovação | Pendente | AppSheet |

---

Para o restante da documentação (infraestrutura, estrutura de abas, regras críticas), ver `DOCUMENTACAO_TECNICA_v1.0.md` — sem alterações nesta versão.
