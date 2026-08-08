-- ============================================================
-- SISTEMA ECOUNI — Camada diferencial (plugada no Bling v3)
-- Tudo que o Bling não faz: disponibilidade prospectiva,
-- agentes WhatsApp, consolidação de grupos, cardápio semanal.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- PRODUTOS
-- ────────────────────────────────────────────────────────────

CREATE TABLE ecouni_produtos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome            TEXT NOT NULL,
  categoria       TEXT NOT NULL CHECK (categoria IN ('folhosa','legume','fruta','grao','processado','outro')),
  tipo_estoque    TEXT NOT NULL CHECK (tipo_estoque IN ('prospectivo','fisico')),
  -- prospectivo = hortifruti (chega e sai no mesmo dia)
  -- fisico      = processados (palete no galpão)
  unidade         TEXT NOT NULL DEFAULT 'cx', -- cx, pacote, kg, unidade
  itens_por_unidade INTEGER, -- ex: 10 pacotes por cx
  bling_produto_id TEXT, -- referência no Bling
  disponivel      BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- PREÇOS (variam por canal e por semana)
-- ────────────────────────────────────────────────────────────

CREATE TABLE ecouni_precos (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  produto_id  UUID REFERENCES ecouni_produtos(id) ON DELETE CASCADE,
  semana_ref  DATE NOT NULL, -- segunda-feira da semana
  canal       TEXT NOT NULL CHECK (canal IN ('atacado','ecouni')),
  preco       NUMERIC(10,2) NOT NULL,
  UNIQUE (produto_id, semana_ref, canal)
);

-- ────────────────────────────────────────────────────────────
-- FORNECEDORES (cooperativas)
-- Cadastro master no Bling — aqui guardamos referência + dados operacionais
-- ────────────────────────────────────────────────────────────

CREATE TABLE ecouni_fornecedores (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome             TEXT NOT NULL,
  whatsapp         TEXT NOT NULL, -- canal do agente fornecedores
  municipio        TEXT,
  uf               TEXT,
  bling_fornecedor_id TEXT, -- referência no Bling (cadastro lá)
  distancia_ceagesp_km INTEGER, -- define se consegue fazer entrega direta
  ativo            BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- DISPONIBILIDADE PROSPECTIVA
-- Cooperativa informa o que terá disponível (via WhatsApp → agente)
-- Pode ser informado com antecedência de várias semanas
-- ────────────────────────────────────────────────────────────

CREATE TABLE ecouni_disponibilidade (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fornecedor_id   UUID REFERENCES ecouni_fornecedores(id),
  produto_id      UUID REFERENCES ecouni_produtos(id),
  semana_ref      DATE NOT NULL, -- segunda-feira da semana de entrega
  quantidade_cx   INTEGER NOT NULL, -- total que a cooperativa terá disponível
  -- alocação por canal (definida pelo gestor ao fazer o pedido):
  qtd_atacado     INTEGER DEFAULT 0,
  qtd_ecouni      INTEGER DEFAULT 0,
  -- qtd_pnae fica fora do sistema (cooperativa controla à parte)
  status          TEXT DEFAULT 'informado' CHECK (status IN ('informado','pedido_feito','confirmado','entregue')),
  data_entrega    DATE, -- sexta-feira específica
  observacao      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (fornecedor_id, produto_id, semana_ref)
);

-- ────────────────────────────────────────────────────────────
-- CARDÁPIO SEMANAL
-- Subset da disponibilidade liberado para pedidos EcoUni
-- Criado quando gestor confirma disponibilidade com fornecedor
-- ────────────────────────────────────────────────────────────

CREATE TABLE ecouni_cardapio (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  semana_ref       DATE NOT NULL,
  disponibilidade_id UUID REFERENCES ecouni_disponibilidade(id),
  produto_id       UUID REFERENCES ecouni_produtos(id),
  quantidade_cx    INTEGER NOT NULL, -- qtd liberada para EcoUni (= disponibilidade.qtd_ecouni)
  ativo            BOOLEAN DEFAULT TRUE,
  UNIQUE (semana_ref, produto_id)
);

-- ────────────────────────────────────────────────────────────
-- ESTOQUE FÍSICO (processados)
-- Para produtos tipo_estoque = 'fisico'
-- ────────────────────────────────────────────────────────────

CREATE TABLE ecouni_estoque_fisico (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  produto_id  UUID REFERENCES ecouni_produtos(id),
  quantidade  INTEGER NOT NULL DEFAULT 0, -- em unidades (pacotes, cx...)
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ecouni_estoque_movimentos (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  produto_id  UUID REFERENCES ecouni_produtos(id),
  tipo        TEXT NOT NULL CHECK (tipo IN ('entrada','saida_atacado','saida_ecouni','ajuste')),
  quantidade  INTEGER NOT NULL,
  referencia_id TEXT, -- id do pedido ou venda que gerou o movimento
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- GRUPOS (clientes corporativos — ex: UNIFORJA)
-- Container logístico, não entidade fiscal
-- Cadastro master no Bling
-- ────────────────────────────────────────────────────────────

CREATE TABLE ecouni_grupos (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome              TEXT NOT NULL,
  endereco_entrega  TEXT,
  municipio         TEXT,
  contato_nome      TEXT,
  contato_whatsapp  TEXT,
  bling_cliente_id  TEXT, -- referência no Bling
  ativo             BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- FUNCIONÁRIOS (compradores individuais)
-- CPF obrigatório (para NF-e Consumidor Final)
-- Coletado pelo agente WhatsApp no primeiro pedido
-- ────────────────────────────────────────────────────────────

CREATE TABLE ecouni_funcionarios (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  grupo_id            UUID REFERENCES ecouni_grupos(id),
  nome                TEXT NOT NULL,
  whatsapp            TEXT NOT NULL,
  cpf                 TEXT, -- coletado no primeiro pedido
  preferencias_nunca  JSONB DEFAULT '[]', -- produto_ids que nunca quer
  ativo               BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- CICLOS (rodada semanal por grupo)
-- Uma Feira EcoUni = um ciclo por grupo por semana
-- ────────────────────────────────────────────────────────────

CREATE TABLE ecouni_ciclos (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  grupo_id         UUID REFERENCES ecouni_grupos(id),
  semana_ref       DATE NOT NULL,
  status           TEXT DEFAULT 'aberto' CHECK (status IN ('aberto','fechado','consolidado','entregue')),
  data_cardapio    DATE, -- segunda: agente envia cardápio
  data_fechamento  DATE, -- quarta: pedidos fecham
  data_entrega     DATE, -- sexta: entrega + montagem
  veiculo_sugerido TEXT, -- auto-calculado por total de caixas
  total_caixas     INTEGER DEFAULT 0,
  valor_frete      NUMERIC(10,2),
  plus_montagem    NUMERIC(10,2), -- pago ao agregado pela montagem
  observacao       TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (grupo_id, semana_ref)
);

-- ────────────────────────────────────────────────────────────
-- PEDIDOS (por funcionário por ciclo)
-- ────────────────────────────────────────────────────────────

CREATE TABLE ecouni_pedidos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ciclo_id        UUID REFERENCES ecouni_ciclos(id) ON DELETE CASCADE,
  funcionario_id  UUID REFERENCES ecouni_funcionarios(id),
  status          TEXT DEFAULT 'pendente' CHECK (status IN ('pendente','aguardando_pix','pago','cancelado')),
  valor_total     NUMERIC(10,2) DEFAULT 0,
  valor_minimo    NUMERIC(10,2) DEFAULT 100.00,
  slot_retirada   TEXT, -- ex: '14:00-15:00'
  pix_codigo      TEXT, -- código PIX gerado
  pago_em         TIMESTAMPTZ,
  bling_pedido_id TEXT, -- criado no Bling quando status = pago
  bling_nf_id     TEXT, -- preenchido quando NF emitida no Bling
  nf_emitida_em   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ecouni_pedidos_itens (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pedido_id        UUID REFERENCES ecouni_pedidos(id) ON DELETE CASCADE,
  produto_id       UUID REFERENCES ecouni_produtos(id),
  quantidade       INTEGER NOT NULL DEFAULT 1,
  preco_unitario   NUMERIC(10,2) NOT NULL, -- preço EcoUni da semana
  substituto_de    UUID REFERENCES ecouni_produtos(id) -- se houve substituição
);

-- ────────────────────────────────────────────────────────────
-- CONSIGNAÇÃO (buffer que sobe no caminhão além dos pedidos pagos)
-- Definido manualmente pelo gestor por produto por ciclo
-- NF só emitida quando vendido no spot
-- ────────────────────────────────────────────────────────────

CREATE TABLE ecouni_consignacao (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ciclo_id     UUID REFERENCES ecouni_ciclos(id),
  produto_id   UUID REFERENCES ecouni_produtos(id),
  quantidade   INTEGER NOT NULL, -- caixas/pacotes extras (1, 2, 3... sem quebrado)
  vendido      INTEGER DEFAULT 0, -- vendido no spot
  devolvido    INTEGER DEFAULT 0, -- voltou para o estoque/galpão
  status       TEXT DEFAULT 'pendente' CHECK (status IN ('pendente','parcial','encerrado')),
  bling_nf_id  TEXT, -- NF do que foi vendido (emitida no spot)
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (ciclo_id, produto_id)
);

-- ────────────────────────────────────────────────────────────
-- VENDAS ATACADO (CEAGESP — canal convencional)
-- Compradores cadastrados no Bling
-- ────────────────────────────────────────────────────────────

CREATE TABLE ecouni_vendas_atacado (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  disponibilidade_id UUID REFERENCES ecouni_disponibilidade(id),
  produto_id        UUID REFERENCES ecouni_produtos(id),
  semana_ref        DATE NOT NULL,
  bling_cliente_id  TEXT NOT NULL, -- comprador cadastrado no Bling
  quantidade_cx     INTEGER NOT NULL,
  preco_unitario    NUMERIC(10,2) NOT NULL,
  valor_total       NUMERIC(10,2) GENERATED ALWAYS AS (quantidade_cx * preco_unitario) STORED,
  data_venda        DATE,
  bling_pedido_id   TEXT, -- referência no Bling
  bling_nf_id       TEXT,
  status            TEXT DEFAULT 'pendente' CHECK (status IN ('pendente','faturado','pago')),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- VISÃO DO GESTOR (quinta-feira)
-- View que consolida disponibilidade vs vendido por produto/ciclo
-- ────────────────────────────────────────────────────────────

CREATE VIEW ecouni_visao_quinta AS
SELECT
  d.semana_ref,
  d.data_entrega,
  p.nome AS produto,
  p.categoria,
  f.nome AS fornecedor,
  d.qtd_ecouni AS disponivel_ecouni,
  COALESCE(SUM(pi.quantidade) FILTER (WHERE pe.status = 'pago'), 0) AS vendido_ecouni,
  d.qtd_ecouni - COALESCE(SUM(pi.quantidade) FILTER (WHERE pe.status = 'pago'), 0) AS saldo_ecouni,
  d.qtd_atacado AS disponivel_atacado,
  COALESCE(SUM(va.quantidade_cx), 0) AS vendido_atacado,
  d.qtd_atacado - COALESCE(SUM(va.quantidade_cx), 0) AS saldo_atacado
FROM ecouni_disponibilidade d
JOIN ecouni_produtos p ON p.id = d.produto_id
JOIN ecouni_fornecedores f ON f.id = d.fornecedor_id
LEFT JOIN ecouni_cardapio c ON c.disponibilidade_id = d.id
LEFT JOIN ecouni_pedidos_itens pi ON pi.produto_id = d.produto_id
LEFT JOIN ecouni_pedidos pe ON pe.id = pi.pedido_id
LEFT JOIN ecouni_ciclos ec ON ec.id = pe.ciclo_id AND ec.semana_ref = d.semana_ref
LEFT JOIN ecouni_vendas_atacado va ON va.disponibilidade_id = d.id
GROUP BY d.id, p.id, f.id;

-- ────────────────────────────────────────────────────────────
-- RLS
-- ────────────────────────────────────────────────────────────

ALTER TABLE ecouni_produtos           ENABLE ROW LEVEL SECURITY;
ALTER TABLE ecouni_precos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE ecouni_fornecedores       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ecouni_disponibilidade    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ecouni_cardapio           ENABLE ROW LEVEL SECURITY;
ALTER TABLE ecouni_estoque_fisico     ENABLE ROW LEVEL SECURITY;
ALTER TABLE ecouni_estoque_movimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ecouni_grupos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE ecouni_funcionarios       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ecouni_ciclos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE ecouni_pedidos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE ecouni_pedidos_itens      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ecouni_consignacao        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ecouni_vendas_atacado     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth" ON ecouni_produtos           FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth" ON ecouni_precos             FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth" ON ecouni_fornecedores       FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth" ON ecouni_disponibilidade    FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth" ON ecouni_cardapio           FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth" ON ecouni_estoque_fisico     FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth" ON ecouni_estoque_movimentos FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth" ON ecouni_grupos             FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth" ON ecouni_funcionarios       FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth" ON ecouni_ciclos             FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth" ON ecouni_pedidos            FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth" ON ecouni_pedidos_itens      FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth" ON ecouni_consignacao        FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth" ON ecouni_vendas_atacado     FOR ALL USING (auth.role() = 'authenticated');
