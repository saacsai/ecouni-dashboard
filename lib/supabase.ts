import { createClient } from '@supabase/supabase-js'

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export function getSupabase() {
  return createClient(url, anon)
}

export function getSupabaseAdmin() {
  return createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// ─── Enums ───────────────────────────────────────────────────────────────────

export type CategoriaProduto   = 'folhosa' | 'legume' | 'fruta' | 'grao' | 'processado' | 'outro'
export type TipoEstoque        = 'prospectivo' | 'fisico'
export type CanalPreco         = 'atacado' | 'ecouni'
export type StatusDisponib     = 'informado' | 'pedido_feito' | 'confirmado' | 'entregue'
export type StatusCiclo        = 'aberto' | 'fechado' | 'consolidado' | 'entregue'
export type StatusPedido       = 'pendente' | 'aguardando_pix' | 'pago' | 'cancelado'
export type StatusConsignacao  = 'pendente' | 'parcial' | 'encerrado'
export type StatusVendaAtacado = 'pendente' | 'faturado' | 'pago'
export type TipoMovimento      = 'entrada' | 'saida_atacado' | 'saida_ecouni' | 'ajuste'
export type Perfil             = 'admin' | 'gestor' | 'analista' | 'operador'

// ─── Entidades ────────────────────────────────────────────────────────────────

export interface Produto {
  id: string
  nome: string
  categoria: CategoriaProduto
  tipo_estoque: TipoEstoque
  unidade: string
  itens_por_unidade: number | null
  gramas_ref_min: number | null
  gramas_ref_max: number | null
  link_saiba_mais: string | null
  bling_produto_id: string | null
  disponivel: boolean
  created_at: string
}

export interface Preco {
  id: string
  produto_id: string
  semana_ref: string
  canal: CanalPreco
  preco: number
}

export interface Fornecedor {
  id: string
  nome: string
  cnpj_cpf: string | null
  whatsapp: string
  contato_nome: string | null
  email: string | null
  municipio: string | null
  uf: string | null
  tipos_produto: string[] | null
  inscricao_estadual: string | null
  numero_caf: string | null
  bling_fornecedor_id: string | null
  distancia_ceagesp_km: number | null
  token_portal: string | null
  ativo: boolean
  created_at: string
}

export interface FornecedorProduto {
  id: string
  fornecedor_id: string
  produto_id: string
  ativo: boolean
  created_at: string
  // joins
  ecouni_produtos?: Produto
  ecouni_fornecedores?: Fornecedor
}

export interface Disponibilidade {
  id: string
  fornecedor_id: string
  produto_id: string
  semana_ref: string
  quantidade_cx: number
  qtd_atacado: number
  qtd_ecouni: number
  status: StatusDisponib
  data_entrega: string | null
  observacao: string | null
  created_at: string
  // joins
  ecouni_produtos?: Produto
  ecouni_fornecedores?: Fornecedor
}

export interface Cardapio {
  id: string
  semana_ref: string
  disponibilidade_id: string
  produto_id: string
  quantidade_cx: number
  ativo: boolean
  // joins
  ecouni_produtos?: Produto
  ecouni_disponibilidade?: Disponibilidade
}

export interface EstoqueFisico {
  id: string
  produto_id: string
  quantidade: number
  updated_at: string
  ecouni_produtos?: Produto
}

export interface EstoqueMovimento {
  id: string
  produto_id: string
  tipo: TipoMovimento
  quantidade: number
  referencia_id: string | null
  created_at: string
}

export interface Grupo {
  id: string
  nome: string
  endereco_entrega: string | null
  municipio: string | null
  contato_nome: string | null
  contato_whatsapp: string | null
  contato_email: string | null
  dias_pedido: string[] | null
  horario_pedido_limite: string | null
  dia_retirada: string | null
  horario_retirada_inicio: string | null
  horario_retirada_fim: string | null
  pedido_minimo: number | null
  tempo_montagem_min: number
  status_formacao: 'em_formacao' | 'formado'
  qtd_participantes_estimada: number | null
  ativo: boolean
  created_at: string
}

export interface Participante {
  id: string
  grupo_id: string
  nome: string
  whatsapp: string
  cpf: string | null
  email: string | null
  bling_cliente_id: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  assinante: boolean
  token_portal: string | null
  preferencias_nunca: string[]
  ativo: boolean
  created_at: string
  // joins
  ecouni_grupos?: Grupo
}

/** @deprecated usar Participante */
export type Funcionario = Participante

export interface Ciclo {
  id: string
  grupo_id: string
  semana_ref: string
  status: StatusCiclo
  data_cardapio: string | null
  data_fechamento: string | null
  data_entrega: string | null
  veiculo_sugerido: string | null
  total_caixas: number
  valor_frete: number | null
  plus_montagem: number | null
  observacao: string | null
  created_at: string
  // joins
  ecouni_grupos?: Grupo
}

export interface Pedido {
  id: string
  ciclo_id: string
  funcionario_id: string
  status: StatusPedido
  valor_total: number
  valor_minimo: number
  slot_retirada: string | null
  pix_codigo: string | null
  pago_em: string | null
  bling_pedido_id: string | null
  bling_nf_id: string | null
  nf_emitida_em: string | null
  created_at: string
  // joins
  ecouni_funcionarios?: Funcionario
  ecouni_pedidos_itens?: PedidoItem[]
}

export interface PedidoItem {
  id: string
  pedido_id: string
  produto_id: string
  quantidade: number
  preco_unitario: number
  substituto_de: string | null
  // joins
  ecouni_produtos?: Produto
}

export interface Consignacao {
  id: string
  ciclo_id: string
  produto_id: string
  quantidade: number
  vendido: number
  devolvido: number
  status: StatusConsignacao
  bling_nf_id: string | null
  created_at: string
  // joins
  ecouni_produtos?: Produto
}

export interface VendaAtacado {
  id: string
  disponibilidade_id: string
  produto_id: string
  semana_ref: string
  bling_cliente_id: string
  quantidade_cx: number
  preco_unitario: number
  valor_total: number
  data_venda: string | null
  bling_pedido_id: string | null
  bling_nf_id: string | null
  status: StatusVendaAtacado
  created_at: string
  // joins
  ecouni_produtos?: Produto
}

export interface Usuario {
  id: string
  nome: string
  email: string
  perfil: Perfil
  ativo: boolean
  created_at: string
}
