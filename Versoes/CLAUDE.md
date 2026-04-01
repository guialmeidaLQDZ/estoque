# CLAUDE.md — Contexto do Projeto Liquidz

> Este arquivo é lido automaticamente pelo Claude Code ao abrir esta pasta.
> Mantenha-o atualizado a cada nova feature ou decisão de arquitetura.

---

## Identidade do Projeto

Sistema de rastreabilidade total de movimentações de estoque da **Liquidz**, cobrindo 5 Centros de Distribuição (CDs).  
Responsável: **Guilherme**

---

## Stack

| Camada | Tecnologia |
|---|---|
| Front-end / UI | Google AppSheet **Core** (incluso no Google Workspace da Liquidz) |
| Banco de dados | Google Sheets (planilha Master + 5 planilhas de CD) |
| Automação / back-end | Google Apps Script (GAS) |
| Gestão de tarefas | ClickUp (API v2) |
| Geração de arquivos | Drive REST API via `UrlFetchApp` |

---

## IDs e Credenciais

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
| Token API | `pk_112031875_MRHK2KV5GC8TNZYDTZIFOYNXMBBRMYKM` |
| List ID — Financeiro / NF | `901324926196` |
| List ID — Eventos | `901312037051` |
| Assignee — Fernanda Falchetto | `105990268` |
| Assignee — Hélio | `111907761` |
| Assignee — Larissa Morais | `111932998` — `larissa.morais@liquidz.com.br` |

### Drive

| Recurso | ID |
|---|---|
| Pasta de output PDFs | `1sto_HdDLsdqtk39d2dvfgmXBURUb1Yuy` |

### Apps Script

| Recurso | ID |
|---|---|
| Script ID (projeto GAS) | `1_Y5TgUAOWM7SuiBpD6Xhba52ko3-ITCmzS860jwFIfV54QmnCCKW_VYf` |
| Deploy via clasp | `cd Versoes && clasp push` (rootDir em `.clasp.json` aponta para a versão atual) |

---

## Arquivos do Projeto

| Arquivo | Função |
|---|---|
| `Consolidacao.gs` | Puxa saldos dos 5 CDs → `BASE_PRODUTOS` (trigger horário) |
| `Distribuicao.gs` | Despacha movimentações aprovadas para os CDs (trigger 5 min) |
| `Financeiro.gs` | Agrupa por evento, cria tarefas NF no ClickUp (trigger 15 min) |
| `PDFEventos.gs` | Gera PDFs de itens do evento, upload via Drive REST API |
| `EventosClickup.gs` | Cria/atualiza cards de eventos no ClickUp (lista Eventos, trigger 5 min) |
| `Exportar - Appsheet.gs` | Utilitário: exporta estrutura do AppSheet para aba LOG_API (manual) |

---

## Pipeline Principal (fluxo de status)

```
AppSheet (aprovação)
  → HISTORICO_MOVIMENTACAO (K: PENDENTE)
  → [aprovador clica] → K: APROVADO
  → distribuirMovimentacoes [5 min] → K: ENVIADO → grava nos CDs
  → processarFinanceiroEClickUp [15 min] → L: PROCESSADO → tarefa ClickUp

consolidarSaldosCDs [horário] → BASE_PRODUTOS
```

---

## Regras Críticas — NUNCA IGNORAR

1. **Drive REST API obrigatório** — `DriveApp` e `DocumentApp` são bloqueados pelo Workspace da Liquidz. Toda operação de Drive usa `UrlFetchApp` + `ScriptApp.getOAuthToken()` + `supportsAllDrives=true`.

2. **`getActiveSpreadsheet()` proibido em triggers** — sempre `SpreadsheetApp.openById("...")`.

3. **Inserção de linhas** — `insertRowAfter(n)` apenas. `insertRowsAfter(n, 200)` causa deslocamento de 200 linhas por execução.

4. **Última linha** — `getLastRow()`. `getNextDataCell()` é instável.

5. **`SpreadsheetApp.flush()` dentro de loops** — evitar. Causa timeout em lotes grandes.

6. **Estilos HTML** — sempre 100% inline. Conversão HTML→Doc remove classes CSS.

7. **Scripts sempre integrais** — nunca entregar funções parciais. O arquivo inteiro deve ser funcional e sem placeholders.

8. **`LockService`** — usar em toda função com trigger de tempo para evitar execuções concorrentes.

---

## Estrutura da Planilha Master

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
| K | STATUS LOGÍSTICA | `PENDENTE` → `APROVADO` → `ENVIADO` |
| L | STATUS FINANCEIRO | vazio → `PROCESSADO` |
| M | LOG_ERRO | uso interno do Distribuicao.gs — não exibido no AppSheet |

### `BASE_PRODUTOS`

Colunas: SKU, Nome, Saldo Escritório, Saldo Rio, Saldo Galpão Eventos, Saldo Galpão Varejo, Saldo Rio Varejo, Total, Última Atualização.

### Outras abas relevantes

`SOLICITACOES_HEADER`, `SOLICITACOES_ITENS`, `SOLICITACOES_PDF`, `EVENTOS_ATIVOS`, `RESUMO_FINANCEIRO`

### `USERS`

Colunas: email, nome, area, ID_CLICKUP

---

## CDs — Mapeamento

| CD | Tipo | Aba destino | Col Descrição | nomeNoDropdown |
|---|---|---|---|---|
| Escritório | `padrao` | `Lançamentos` | H | `Escritório` |
| Rio | `rio_especifico` | `Lançamentos` | E | `Rio` |
| Galpão Varejo | `padrao` | `Lançamentos` | H | `Storage Varejo` |
| Galpão Eventos | `padrao` | `Lançamentos` | H | `Storage Eventos` |
| Rio Varejo | `agregado` | `CONTROLE` | H | `Rio Varejo` |

Aba de saldo na consolidação (tentadas em ordem):
- Escritório / Rio / Galpão Varejo: `Dash` → `CONTROLE` → `CONTROLE ` (com espaço)
- Galpão Eventos: `Dash` → `CONTAGEM ATUALIZADA GOODSTORAGE` → `CONTROLE` → `CONTROLE `
- Rio Varejo: `Dash` **apenas** (CONTROLE contém saídas, não saldo). Dados começam na linha 4 (3 linhas de header).

---

## Times que usam o sistema

- **Eventos / Financeiro** — fluxo original
- **Trade** — entrou em 2026. Envia itens como bonificação para parceiros. Trabalha com um evento fixo anual chamado **"Trade Clientes"** (ativo o ano todo). Um membro do próprio time aprova os pedidos.

---

## Backlog de Features

| ID | Descrição | Status | Camada |
|---|---|---|---|
| FEAT-04 | PDF — Itens do Evento *(palavra "romaneio" é banida)* | Pendente | GAS + Drive API |
| FEAT-05 | Dashboard | ❄️ Congelada | AppSheet |
| FEAT-06 | Alerta de Estoque Mínimo | Pendente | GAS + MailApp |
| FEAT-07 | Relatório de Custo por Evento | ⏳ Aguardando definição de centro de custos | GAS + Sheets |
| FEAT-08 | Fluxo Trade Clientes — NF atribuída à Larissa (`111932998`) em vez da Fernanda | ✅ Implementado em v1.2 | GAS |
| FEAT-09 | Campo Justificativa — texto livre na solicitação (header do pedido) | Pendente | AppSheet |
| FEAT-10 | Impacto no estoque na tela de aprovação — coluna real `Impacto_Estoque` em SOLICITACOES_ITENS, calculada por GAS após cada consolidarSaldosCDs() | ✅ Implementado em v1.5 | GAS |
| FEAT-11 | Email do solicitante visível na tela de aprovação | Pendente | AppSheet |

### Detalhes de implementação pendentes

**FEAT-09 (Justificativa):**
- Adicionar coluna `Justificativa` (LongText) na aba `SOLICITACOES_HEADER`
- Exibir no formulário de criação e na tela de aprovação

**FEAT-11 (Email na aprovação):**
- Virtual Column na tabela `SOLICITACOES_HEADER`:
  ```
  Nome: Email_Solicitante
  Tipo: Text
  Fórmula: LOOKUP([Solicitante], "USERS", "nome", "email")
  ```

**FEAT-10 (Gráfico):**
- A mais complexa. Requer acesso em tempo real à `BASE_PRODUTOS` para calcular saldo pós-aprovação.
- Pode exigir Virtual Column ou API intermediária no AppSheet.

---

## Decisões de Arquitetura já tomadas

- O bot AppSheet "Enviar Email para o Solicitante" foi **desabilitado** — substituído pela integração com ClickUp.
- O Google Doc template (`1B9gBr6QxLWwt7eyA5jx_j9OQorMVAYPEnetc3vWDvIA`) foi **desativado** — substituído pelo módulo ClickUp.
- PDF color coding: Infra/Retorno = azul · Bonificado = cinza · Vendido = verde.

---

## Versionamento

O projeto usa **versão única unificada** — todos os módulos sobem juntos.

| Versão | O que mudou |
|---|---|
| v1.0 | Baseline definitivo: 5 scripts em produção (Consolidacao v2.1, Distribuicao v7.8, Financeiro v4.0, EventosClickup v1.0, PDFEventos v2.1) |
| v1.1 | BUG-01 corrigido em Consolidacao, EventosClickup, PDFEventos e sincronizarUsuariosClickUp(); IDs centralizados em Ambiente.gs |
| v1.2 | FEAT-08: Trade Clientes → NF atribuída à Larissa em vez da Fernanda |
| v1.3 | FEAT-04: PDF redesenhado com identidade visual Liquidz (header preto, barra #9BDB20, color coding por categoria) |
| v1.4 | FEAT-09: coluna Justificativa em SOLICITACOES_HEADER; FEAT-11: Email_Solicitante via virtual column no AppSheet |
| v1.5 | FEAT-10: coluna real Impacto_Estoque em SOLICITACOES_ITENS — 🟢/🟡/🔴 calculado em atualizarImpactoEstoque() ao fim de consolidarSaldosCDs() |
| v1.6 | MAINT: token hardcoded removido de Financeiro.gs; TEMP doc PDF garantido deletado via finally; lock padronizado para tryLock em Distribuicao.gs; abas obsoletas BASE_BI_LIQUIDZ e ERROS_SISTEMA removidas |
| **v2.0** | **Migração de AppSheet → Next.js 14 (web app custom). Frontend em `app/` com 8 telas (Dashboard, Estoque, Aprovação, Solicitações, Eventos, Financeiro, Histórico). Backend GAS exposto via WebApp.gs (REST). Dados reais via GAS_WEB_APP_URL no .env.local. GAS e Sheets mantidos como backend.** |

### Convenção de pastas

```
Versoes/
  vX.Y/
    Consolidacao.gs
    Distribuicao.gs
    Financeiro.gs
    DOCUMENTACAO_TECNICA_vX.Y.md
```

### Regras de bump

- **patch (X.Y → X.Y+1):** bugfix ou ajuste sem nova feature
- **minor (X.Y → X+1.0):** nova feature entregue
- Cabeçalho de todos os arquivos deve refletir a versão do projeto, não a do módulo.

---

## Estilo de trabalho

- Sempre entregar scripts **completos** — sem trechos parciais, sem `// TODO`, sem placeholders.
- Quando múltiplos bugs existem, corrigir todos em um único passe.
- Não reexplicar coisas já estabelecidas no contexto.
