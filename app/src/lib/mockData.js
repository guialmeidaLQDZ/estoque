export const mockEstoque = [
  { sku: 'LQZ-001', nome: 'Hydra Limão 500ml', escritorio: 120, rio: 85, galpaoEventos: 200, galpaoVarejo: 150, rioVarejo: 95, total: 650, ultimaAtualizacao: '2026-03-30T14:22:00' },
  { sku: 'LQZ-002', nome: 'Hydra Morango 500ml', escritorio: 45, rio: 30, galpaoEventos: 80, galpaoVarejo: 60, rioVarejo: 25, total: 240, ultimaAtualizacao: '2026-03-30T14:22:00' },
  { sku: 'LQZ-003', nome: 'Hydra Manga 500ml', escritorio: 18, rio: 12, galpaoEventos: 40, galpaoVarejo: 35, rioVarejo: 8, total: 113, ultimaAtualizacao: '2026-03-29T10:15:00' },
  { sku: 'LQZ-004', nome: 'Hydra Melancia 500ml', escritorio: 200, rio: 150, galpaoEventos: 300, galpaoVarejo: 250, rioVarejo: 180, total: 1080, ultimaAtualizacao: '2026-03-30T09:00:00' },
  { sku: 'LQZ-005', nome: 'Hydra Uva 500ml', escritorio: 8, rio: 5, galpaoEventos: 15, galpaoVarejo: 10, rioVarejo: 3, total: 41, ultimaAtualizacao: '2026-03-28T16:45:00' },
  { sku: 'LQZ-006', nome: 'Pack 6 Limão', escritorio: 50, rio: 40, galpaoEventos: 100, galpaoVarejo: 80, rioVarejo: 45, total: 315, ultimaAtualizacao: '2026-03-30T14:22:00' },
  { sku: 'LQZ-007', nome: 'Pack 6 Morango', escritorio: 22, rio: 18, galpaoEventos: 45, galpaoVarejo: 35, rioVarejo: 12, total: 132, ultimaAtualizacao: '2026-03-29T11:30:00' },
  { sku: 'LQZ-008', nome: 'Caixa 24 Limão', escritorio: 15, rio: 10, galpaoEventos: 30, galpaoVarejo: 25, rioVarejo: 8, total: 88, ultimaAtualizacao: '2026-03-30T08:00:00' },
]

export const mockHistorico = [
  { timestamp: '2026-03-31T09:15:00', data: '2026-03-31', sku: 'LQZ-001', nome: 'Hydra Limão 500ml', quantidade: 50, tipo: 'Entrada', cd: 'Galpão Eventos', evento: 'Festival Verão RJ', statusLogistica: 'APROVADO', statusFinanceiro: '' },
  { timestamp: '2026-03-31T08:30:00', data: '2026-03-31', sku: 'LQZ-002', nome: 'Hydra Morango 500ml', quantidade: 30, tipo: 'Saída', cd: 'Rio', evento: 'Festival Verão RJ', statusLogistica: 'ENVIADO', statusFinanceiro: 'PROCESSADO' },
  { timestamp: '2026-03-30T17:20:00', data: '2026-03-30', sku: 'LQZ-004', nome: 'Hydra Melancia 500ml', quantidade: 100, tipo: 'Entrada', cd: 'Galpão Varejo', evento: '', statusLogistica: 'APROVADO', statusFinanceiro: '' },
  { timestamp: '2026-03-30T14:45:00', data: '2026-03-30', sku: 'LQZ-006', nome: 'Pack 6 Limão', quantidade: 20, tipo: 'Saída', cd: 'Escritório', evento: 'Evento Corporativo SP', statusLogistica: 'PENDENTE', statusFinanceiro: '' },
  { timestamp: '2026-03-30T11:00:00', data: '2026-03-30', sku: 'LQZ-003', nome: 'Hydra Manga 500ml', quantidade: 15, tipo: 'Entrada', cd: 'Rio Varejo', evento: '', statusLogistica: 'APROVADO', statusFinanceiro: 'PROCESSADO' },
  { timestamp: '2026-03-29T16:30:00', data: '2026-03-29', sku: 'LQZ-005', nome: 'Hydra Uva 500ml', quantidade: 5, tipo: 'Saída', cd: 'Rio', evento: 'Festival Verão RJ', statusLogistica: 'ENVIADO', statusFinanceiro: '' },
  { timestamp: '2026-03-29T10:15:00', data: '2026-03-29', sku: 'LQZ-007', nome: 'Pack 6 Morango', quantidade: 40, tipo: 'Entrada', cd: 'Galpão Eventos', evento: '', statusLogistica: 'APROVADO', statusFinanceiro: '' },
  { timestamp: '2026-03-28T15:00:00', data: '2026-03-28', sku: 'LQZ-008', nome: 'Caixa 24 Limão', quantidade: 10, tipo: 'Saída', cd: 'Escritório', evento: 'Evento Corporativo SP', statusLogistica: 'PROCESSADO', statusFinanceiro: 'PROCESSADO' },
  { timestamp: '2026-03-28T09:30:00', data: '2026-03-28', sku: 'LQZ-001', nome: 'Hydra Limão 500ml', quantidade: 200, tipo: 'Entrada', cd: 'Galpão Eventos', evento: '', statusLogistica: 'APROVADO', statusFinanceiro: '' },
  { timestamp: '2026-03-27T14:00:00', data: '2026-03-27', sku: 'LQZ-004', nome: 'Hydra Melancia 500ml', quantidade: 75, tipo: 'Saída', cd: 'Rio Varejo', evento: 'Pop-up Rio Norte', statusLogistica: 'ENVIADO', statusFinanceiro: 'PROCESSADO' },
]

export const mockSolicitacoes = [
  {
    id: 'SOL-20260329-143022',
    timestamp: '2026-03-29T14:30:22',
    solicitante: 'Isabela Souza',
    email: 'isabela@liquidz.com.br',
    cd: 'Galpão Eventos',
    evento: 'Festival Verão RJ',
    status: 'PENDENTE',
    justificativa: 'Reposição urgente para evento de fim de semana. Estoque atual insuficiente.',
    aprovador: '',
    dataAprovacao: '',
    comentarioAprovacao: '',
    itens: [
      { sku: 'LQZ-001', nome: 'Hydra Limão 500ml', quantidade: 100, tipo: 'Entrada', impactoEstoque: '+100' },
      { sku: 'LQZ-002', nome: 'Hydra Morango 500ml', quantidade: 50, tipo: 'Entrada', impactoEstoque: '+50' },
    ]
  },
  {
    id: 'SOL-20260330-090155',
    timestamp: '2026-03-30T09:01:55',
    solicitante: 'Nathallia Ferreira',
    email: 'nathallia@liquidz.com.br',
    cd: 'Rio',
    evento: 'Pop-up Rio Norte',
    status: 'PENDENTE',
    justificativa: 'Necessidade de reposição para pop-up store do final de março.',
    aprovador: '',
    dataAprovacao: '',
    comentarioAprovacao: '',
    itens: [
      { sku: 'LQZ-004', nome: 'Hydra Melancia 500ml', quantidade: 60, tipo: 'Entrada', impactoEstoque: '+60' },
      { sku: 'LQZ-006', nome: 'Pack 6 Limão', quantidade: 30, tipo: 'Entrada', impactoEstoque: '+30' },
      { sku: 'LQZ-005', nome: 'Hydra Uva 500ml', quantidade: 20, tipo: 'Entrada', impactoEstoque: '+20' },
    ]
  },
  {
    id: 'SOL-20260327-112233',
    timestamp: '2026-03-27T11:22:33',
    solicitante: 'Guilherme Almeida',
    email: 'guilherme.almeida@liquidz.com.br',
    cd: 'Escritório',
    evento: 'Evento Corporativo SP',
    status: 'APROVADO',
    justificativa: 'Evento corporativo para clientes B2B.',
    aprovador: 'Guilherme Almeida',
    dataAprovacao: '2026-03-27T15:00:00',
    comentarioAprovacao: 'Aprovado conforme planejamento.',
    itens: [
      { sku: 'LQZ-008', nome: 'Caixa 24 Limão', quantidade: 10, tipo: 'Saída', impactoEstoque: '-10' },
    ]
  },
  {
    id: 'SOL-20260325-093045',
    timestamp: '2026-03-25T09:30:45',
    solicitante: 'Isabela Souza',
    email: 'isabela@liquidz.com.br',
    cd: 'Rio Varejo',
    evento: '',
    status: 'ENVIADO',
    justificativa: 'Reposição padrão de estoque para loja Rio Varejo.',
    aprovador: 'Guilherme Almeida',
    dataAprovacao: '2026-03-25T14:00:00',
    comentarioAprovacao: '',
    itens: [
      { sku: 'LQZ-001', nome: 'Hydra Limão 500ml', quantidade: 80, tipo: 'Entrada', impactoEstoque: '+80' },
      { sku: 'LQZ-003', nome: 'Hydra Manga 500ml', quantidade: 40, tipo: 'Entrada', impactoEstoque: '+40' },
    ]
  },
  {
    id: 'SOL-20260322-163300',
    timestamp: '2026-03-22T16:33:00',
    solicitante: 'Nathallia Ferreira',
    email: 'nathallia@liquidz.com.br',
    cd: 'Galpão Varejo',
    evento: '',
    status: 'REJEITADO',
    justificativa: 'Solicitar 500 unidades de LQZ-007 para estoque.',
    aprovador: 'Guilherme Almeida',
    dataAprovacao: '2026-03-23T09:00:00',
    comentarioAprovacao: 'Quantidade acima do limite permitido. Reduzir pedido.',
    itens: [
      { sku: 'LQZ-007', nome: 'Pack 6 Morango', quantidade: 500, tipo: 'Entrada', impactoEstoque: '+500' },
    ]
  },
]

export const mockEventos = [
  {
    nome: 'Festival Verão RJ',
    dataInicio: '2026-04-05',
    dataFim: '2026-04-07',
    status: 'ATIVO',
    cd: 'Galpão Eventos',
    responsavel: 'Nathallia Ferreira',
    observacoes: 'Grande evento de verão na Barra da Tijuca. Espera-se público de 5.000 pessoas por dia.',
  },
  {
    nome: 'Pop-up Rio Norte',
    dataInicio: '2026-04-10',
    dataFim: '2026-04-12',
    status: 'ATIVO',
    cd: 'Rio',
    responsavel: 'Isabela Souza',
    observacoes: 'Pop-up store no Shopping Norte. Foco em varejo direto ao consumidor.',
  },
  {
    nome: 'Evento Corporativo SP',
    dataInicio: '2026-04-20',
    dataFim: '2026-04-20',
    status: 'ATIVO',
    cd: 'Escritório',
    responsavel: 'Guilherme Almeida',
    observacoes: 'Apresentação de produtos para clientes B2B em São Paulo.',
  },
  {
    nome: 'Carnaval SP 2026',
    dataInicio: '2026-02-28',
    dataFim: '2026-03-04',
    status: 'ENCERRADO',
    cd: 'Galpão Eventos',
    responsavel: 'Nathallia Ferreira',
    observacoes: 'Evento encerrado com sucesso. Total de 1.200 unidades movimentadas.',
  },
]

export const mockFinanceiro = [
  {
    evento: 'Festival Verão RJ',
    periodo: 'Abr 2026',
    totalItens: 150,
    valorTotal: 4500.00,
    responsavel: 'Nathallia Ferreira',
    statusNF: 'PENDENTE',
    idTarefaClickup: 'CU-12345',
  },
  {
    evento: 'Pop-up Rio Norte',
    periodo: 'Abr 2026',
    totalItens: 110,
    valorTotal: 3300.00,
    responsavel: 'Isabela Souza',
    statusNF: 'PENDENTE',
    idTarefaClickup: 'CU-12346',
  },
  {
    evento: 'Evento Corporativo SP',
    periodo: 'Mar 2026',
    totalItens: 30,
    valorTotal: 1200.00,
    responsavel: 'Guilherme Almeida',
    statusNF: 'PROCESSADO',
    idTarefaClickup: 'CU-12340',
  },
  {
    evento: 'Carnaval SP 2026',
    periodo: 'Fev/Mar 2026',
    totalItens: 1200,
    valorTotal: 38400.00,
    responsavel: 'Nathallia Ferreira',
    statusNF: 'PROCESSADO',
    idTarefaClickup: 'CU-12310',
  },
]
