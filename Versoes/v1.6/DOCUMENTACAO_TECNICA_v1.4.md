# Documentação Técnica — Gestão de Estoque / NF
## Versão 1.3

> **Status:** Estável
> **Data:** Março 2026
> **Responsável:** Guilherme — Liquidz

---

## Changelog v1.3

| Feature | Descrição | Arquivos alterados |
|---|---|---|
| FEAT-04 | PDF redesenhado com brand guidelines Liquidz | `PDFEventos.gs` |

### Detalhe visual (FEAT-04)

- **Header**: fundo preto, "LIQUIDZ" em branco (Arial Black), subtítulo em verde `#9BDB20`
- **Barra de acento**: 5px verde `#9BDB20` abaixo do header
- **Bloco de informações**: fundo branco com borda esquerda verde, labels em cinza uppercase
- **Tabela — cabeçalho**: fundo preto, texto branco, uppercase
- **Tabela — categorias** (color coding mantido):
  - Bonificado: header cinza `#808080` / linhas `#E6E6E6`
  - Vendido: header verde `#9BDB20` (texto preto) / linhas `#EBF8D2`
  - Infra/Retorno: header azul `#1a6a9a` / linhas `#D6EAF8` (funcional, sem equivalente no brand)
- **Linha subtotal**: off-white `#F8F6F3`, texto cinza itálico
- **Total Geral**: fundo preto, texto verde `#9BDB20`, borda superior verde
- **Footer**: texto `#BAB9B6`, centralizado
- Layout 100% baseado em `<table>` (sem flex/grid — compatível com exportação HTML→Doc→PDF)

---

## Changelog v1.2

| Feature | Descrição | Arquivos alterados |
|---|---|---|
| FEAT-08 | Fluxo Trade Clientes: NF atribuída à Larissa (`111932998`) em vez da Fernanda | `Financeiro.gs` |

## Changelog v1.1

| Bug | Descrição | Arquivos corrigidos |
|---|---|---|
| BUG-01 | `getActiveSpreadsheet()` substituído por `openById()` | `Consolidacao.gs`, `EventosClickup.gs`, `PDFEventos.gs`, `sincronizarUsuariosClickUp()` em `Financeiro.gs` |
| — | IDs centralizados em `Ambiente.gs` via `getIdPlanilha()` | `Ambiente.gs` (novo), todos os `.gs` |

---

## Backlog atualizado

### Features

| ID | Descrição | Status | Camada |
|---|---|---|---|
| FEAT-04 | PDF redesenhado com brand guidelines | ✅ Implementado em v1.3 | GAS |
| FEAT-05 | Dashboard | Congelada | AppSheet |
| FEAT-06 | Alerta de Estoque Mínimo | ❄️ Congelada | GAS + MailApp |
| FEAT-07 | Relatório de Custo por Evento | Aguardando definição de centro de custos | GAS + Sheets |
| FEAT-08 | Fluxo Trade Clientes — NF atribuída à Larissa | ✅ Implementado em v1.2 | GAS |
| FEAT-09 | Campo Justificativa na solicitação | Pendente | AppSheet |
| FEAT-10 | Gráfico de impacto na tela de aprovação | Pendente | AppSheet |
| FEAT-11 | Email do solicitante na tela de aprovação | Pendente | AppSheet |

---

Para infraestrutura, estrutura de abas e regras críticas, ver `DOCUMENTACAO_TECNICA_v1.0.md`.
