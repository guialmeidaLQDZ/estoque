# Documentação Técnica — Gestão de Estoque / NF
## Versão 1.0 — Baseline Definitivo

> **Status:** Estável em produção
> **Data de corte:** Março 2026
> **Responsável:** Guilherme — Liquidz

---

## 1. Visão Geral

Sistema de rastreabilidade total de movimentações de estoque da Liquidz, cobrindo 5 Centros de Distribuição (CDs). O fluxo é controlado por status progressivos:

```
AppSheet (aprovação)
  → HISTORICO_MOVIMENTACAO (K: PENDENTE)
  → [aprovador] → K: APROVADO
  → distribuirMovimentacoes [5 min] → K: ENVIADO → grava nos CDs
  → processarFinanceiroEClickUp [15 min] → L: PROCESSADO → tarefa ClickUp
  → processarEventosClickUp [5 min] → card ClickUp (lista Eventos)
  → gerarPDFEventos [manual ou trigger] → PDF no Drive → subtarefa Hélio

consolidarSaldosCDs [horário] → BASE_PRODUTOS
```

---

## 2. Infraestrutura — IDs e Credenciais

### Planilhas

| Recurso | ID |
|---|---|
| Planilha Master | `1yCK8TlPShu9QwNd5O9pg3izDAHwgxpov1zMgDGC17n4` |
| Planilha de Setup | `1B6QBQC6dCkIj44EAn0v5fIHAgzLvluC5F7W2dvv_N7k` |
| CD — Escritório | `1fawv-GbiImQRW-oN8pULm3XLGn6AhH3EdLTTozw9lFg` |
| CD — Rio | `1svu-oT0FaNozATlfC0XBq-gPrw3kVWeRknKJadVME_Q` |
| CD — Galpão Eventos | `1ufZB7k-Qm4_j-GRsrsG-0LPtOu3iaFSfq8Jr-J_Ipnw` |
| CD — Galpão Varejo | `1r7ZmcH-5Bl5NzHCiijyfgJboHSpHHGuDDDJByUA6Btg` |
| CD — Rio Varejo | `1tj4RFEufuo8U7piexJkpIQb4UFXjGeCvxiKUecpgxh4` |

### ClickUp

| Recurso | Valor |
|---|---|
| Token | Armazenado via `PropertiesService` (chave: `CLICKUP_TOKEN`) |
| List ID — Financeiro / NF | `901324926196` |
| List ID — Eventos | `901312037051` |
| Assignee — Fernanda Falchetto | `105990268` |
| Assignee — Hélio | `111907761` |
| Assignee — Larissa Morais | `111932998` |

### Drive

| Recurso | ID |
|---|---|
| Pasta de output PDFs | `1sto_HdDLsdqtk39d2dvfgmXBURUb1Yuy` |

### AppSheet

| Recurso | Valor |
|---|---|
| App ID | `022805f5-2701-4d30-b703-8ae69ae97b28` |
| API Key | Armazenado via `PropertiesService` (chave: `APPSHEET_API_KEY`) |

---

## 3. Scripts — Inventário completo

| Arquivo | Função principal | Trigger | Status |
|---|---|---|---|
| `Consolidacao.gs` | Puxa saldos dos 5 CDs → `BASE_PRODUTOS` | Horário | Ativo |
| `Distribuicao.gs` | Despacha movimentações `APROVADO` para os CDs | 5 min | Ativo |
| `Financeiro.gs` | Agrupa por evento, cria tarefas NF no ClickUp | 15 min | Ativo |
| `EventosClickup.gs` | Cria/atualiza cards de eventos no ClickUp (lista Eventos) | 5 min | Ativo |
| `PDFEventos.gs` | Gera PDFs de itens do evento, salva no Drive | Manual / trigger | Ativo |
| `Exportar - Appsheet.gs` | Exporta estrutura do AppSheet para aba LOG_API | Manual | Utilitário |

---

## 4. Estrutura da Planilha Master

### `HISTORICO_MOVIMENTACAO`

| Col | Campo | Valores |
|---|---|---|
| A | Timestamp | |
| B | Data | |
| C | SKU | |
| D | Nome do produto | |
| E | Quantidade | |
| F | Tipo | `Entrada` / `Saída` |
| G | CD / Local | deve bater com `nomeNoDropdown` |
| H | — | |
| I | — | |
| J | Nome do Evento | usado para agrupamento fiscal |
| K | STATUS LOGÍSTICA | `PENDENTE` → `APROVADO` → `ENVIADO` / `ERRO` |
| L | STATUS FINANCEIRO | vazio → `PROCESSADO` |
| M | LOG_ERRO | preenchido automaticamente em caso de falha |

### `BASE_PRODUTOS`

Colunas: SKU, Nome, Saldo Escritório, Saldo Rio, Saldo Galpão Eventos, Saldo Galpão Varejo, Saldo Rio Varejo, Total, Última Atualização.

### `RESUMO_FINANCEIRO`

Colunas: Data, Nome do Evento, Custo Total, Precisa NF (SIM/NÃO), Link ClickUp.

### Outras abas relevantes

`SOLICITACOES_HEADER`, `SOLICITACOES_ITENS`, `SOLICITACOES_PDF`, `EVENTOS_ATIVOS`, `USERS` (email, nome, area, ID_CLICKUP)

---

## 5. CDs — Mapeamento definitivo

| CD | Tipo | Aba destino | Col Descrição | nomeNoDropdown |
|---|---|---|---|---|
| Escritório | `padrao` | `Lançamentos` | H | `Escritório` |
| Rio | `rio_especifico` | `Lançamentos` | E | `Rio` |
| Galpão Varejo | `padrao` | `Lançamentos` | H | `Storage Varejo` |
| Galpão Eventos | `padrao` | `Lançamentos` | H | `Storage Eventos` |
| Rio Varejo | `agregado` | `CONTROLE` | H | `Rio Varejo` |

**Aba de saldo na consolidação (tentadas em ordem):**
- Escritório / Rio / Galpão Varejo: `Dash` → `CONTROLE` → `CONTROLE `
- Galpão Eventos: `Dash` → `CONTAGEM ATUALIZADA GOODSTORAGE` → `CONTROLE` → `CONTROLE `
- Rio Varejo: `Dash` apenas (CONTROLE contém saídas, não saldo). Dados começam na linha 4 (3 linhas de header).

---

## 6. Times que usam o sistema

- **Eventos / Financeiro** — fluxo original. NF atribuída à Fernanda.
- **Trade** — entrou em 2026. Evento fixo anual: **"Trade Clientes"**. NF deve ser atribuída à Larissa (`111932998`). *(FEAT-08 — pendente de implementação)*

---

## 7. Regras Críticas de Desenvolvimento

1. **Drive REST API obrigatório** — `DriveApp` e `DocumentApp` bloqueados pelo Workspace. Toda operação usa `UrlFetchApp` + `ScriptApp.getOAuthToken()` + `supportsAllDrives=true`.

2. **`getActiveSpreadsheet()` proibido em triggers** — sempre `SpreadsheetApp.openById("...")`.

3. **Inserção de linhas** — `insertRowAfter(n)` (singular). `insertRowsAfter(n, 200)` causa deslocamento por formatação herdada.

4. **Última linha** — `getLastRow()`. `getNextDataCell()` é instável.

5. **`SpreadsheetApp.flush()` dentro de loops** — proibido. Uma única chamada ao final da função.

6. **Estilos HTML** — sempre 100% inline. Conversão HTML→Doc remove classes CSS.

7. **Scripts sempre integrais** — nunca entregar funções parciais, sem `// TODO`, sem placeholders.

8. **`LockService`** — usar em toda função com trigger de tempo. Envolver o corpo em `try/finally` para garantir `releaseLock()` mesmo em erro.

9. **Token ClickUp** — armazenar via `PropertiesService`, nunca hardcoded. Usar `configurarToken()` para setup inicial.

---

## 8. Decisões Arquiteturais

- Bot AppSheet "Enviar Email para o Solicitante" → **desabilitado**, substituído pelo ClickUp.
- Google Doc template → **desativado**, substituído pelo módulo ClickUp.
- A palavra **"romaneio"** é banida. Usar "PDF — Itens do Evento".
- PDF color coding: Bonificado = cinza · Vendido = verde · Infra/Retorno = azul.

---

## 9. Backlog

### Bugs

| ID | Descrição | Arquivos afetados | Status |
|---|---|---|---|
| BUG-01 | `getActiveSpreadsheet()` em triggers | `Consolidacao.gs`, `EventosClickup.gs`, `PDFEventos.gs`, `sincronizarUsuariosClickUp()` em `Financeiro.gs` | **Pendente** |
| BUG-02 | `getNextDataCell()` instável | `Distribuicao.gs` | ✅ Corrigido em produção |
| BUG-03 | `SpreadsheetApp.flush()` dentro de loops | Todos | ✅ Corrigido em produção |

### Features

| ID | Descrição | Status | Camada |
|---|---|---|---|
| FEAT-04 | PDF — Itens do Evento | ✅ Implementado (`PDFEventos.gs` v2.1) | GAS + Drive API |
| FEAT-05 | Dashboard | Congelada | AppSheet |
| FEAT-06 | Alerta de Estoque Mínimo | Pendente | GAS + MailApp |
| FEAT-07 | Relatório de Custo por Evento | Aguardando definição de centro de custos | GAS + Sheets |
| FEAT-08 | Fluxo Trade Clientes — NF atribuída à Larissa | **Pendente** | GAS (`Financeiro.gs`) |
| FEAT-09 | Campo Justificativa na solicitação | Pendente | AppSheet |
| FEAT-10 | Gráfico de impacto na tela de aprovação | Pendente | AppSheet |
| FEAT-11 | Email do solicitante na tela de aprovação | Pendente | AppSheet |
