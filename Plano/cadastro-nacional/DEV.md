# Cadastro Nacional UNISOL — Documento técnico de retomada

Status: **em validação com UNISOL Brasil, nada foi codado ainda**. Não existe repo,
Supabase nem deploy para este projeto. Este documento existe para que uma sessão futura
retome sem precisar reouvir a explicação toda.

## Fontes primárias (ler antes de propor qualquer schema)

- `plano/Diagnostico/FORMULARIO DIAGNOSTICO ECOUNI.docx` — instrumento de campo, 18 seções
  + 2 anexos, elaborado a partir do Plano de Trabalho do CooperaMais (Chamamento 02/2024,
  MDA). Sugestão de Anderson (diretor UNISOL Brasil). Para ler: `textutil -convert txt
  -stdout "arquivo.docx"` (macOS) — é a forma mais rápida de extrair texto sem abrir o
  Word.
- `plano/Diagnostico/referencial de análise EES.pdf` — Referencial Brasileiro para Análise
  de EES (DIEESE + UNISOL Brasil, 2014), 94 páginas. Sugestão de Arildo (presidente UNISOL
  Brasil). Framework conceitual do qual o formulário acima é a tradução operacional —
  mapeamento seção-a-seção já feito, não precisa refazer (ver "Relação entre os dois
  documentos" abaixo).
- `plano/Anexo_2_Compatibilidade_de_Precos_Final_assinado.pdf` — Anexo 2 do Termo de
  Fomento MDA. Confirma: proponente UNISOL Brasil, projeto oficial "EcoUni Redes
  Solidárias", Transferegov 058321/2025, R$ 7.599.083,29, 5 bases regionais.

## Contexto do projeto (CooperaMais)

- Luciano é Coordenador Geral. Proponente: UNISOL Brasil (Arildo). Coexecutoras: UNISOL SP
  (Isnaldo, regional Sudeste), UNISOL BA (Anne, regional Nordeste), UNISOL RS (Nelsa,
  regional Sul). Centro-Oeste e Norte ficam com a própria UNISOL Brasil.
- 152 empreendimentos, 5 regiões, 24 meses, recurso só de custeio.
- Kickoff (2026-08-15) definiu 12 etapas; as etapas 5, 8, 9 e 10 (elaboração do
  instrumento de diagnóstico, aplicação, sistematização, planos territoriais) dependem
  deste cadastro.

## Por que isto é um sistema à parte — não módulo do EcoUni nem do COAF 4.0

- **EcoUni** (`ecouni-dashboard`) modela `fornecedor` = quem vende pro CND. Assume 1
  empreendimento → 1 contexto comercial.
- **COAF 4.0** (`coaf-dashboard`) modela `coaf` = 1 cooperativa gerida por dentro (mono-
  tenant hoje, `SELECT id FROM coafs LIMIT 1`). Assume 1 instância → 1 empreendimento.
- **Cadastro Nacional UNISOL**: UNISOL Brasil tem ~1000 empreendimentos afiliados no
  total, distribuídos por vários projetos (CooperaMais é um deles). Um empreendimento
  pode estar em mais de um projeto ao mesmo tempo → relação **N:N empreendimento:projeto**
  que nem EcoUni nem COAF 4.0 conseguem representar. Daí ser sistema separado.
- Decisão confirmada por Luciano (2026-08-15): **app/repo separado**, não módulo dentro de
  outro app.

## Schema mínimo (validado na conversa, não implementado)

```
empreendimentos        -- os ~1000, únicos: nome, cnpj, região, uf, município
projetos                -- CooperaMais e demais projetos UNISOL
empreendimento_projeto  -- N:N: empreendimento_id, projeto_id, status, data_entrada
diagnosticos            -- resposta ao formulário, vinculado a empreendimento_id +
                           projeto_id (contexto de quando/por que foi coletado)
```

Reaproveitar nomenclatura do COAF 4.0 (`coaf-dashboard/lib/supabase.ts`, tabela `coafs`)
onde a entidade for a mesma — evita reescrita na migração futura.

## Achado importante sobre o formulário

O Formulário de Diagnóstico captura **contagens agregadas de pessoas** (seção 3: total,
mulheres, jovens por categoria), não roster individual com CPF. Diagnóstico é no nível do
**empreendimento**, não do agricultor. Cadastro nominal de agricultor continua sendo
escopo do COAF 4.0 (`agricultores_familiares`) — **não confirmado formalmente com Luciano
se isso é definitivo ou só para o MVP.**

## Princípios de produto já definidos

1. **Preservar 100% dos campos do formulário.** Nenhum campo é cortado — cada um já
   passou por validação institucional (é tradução do Referencial DIEESE/UNISOL, não
   invenção nossa) e dado não coletado numa visita não é recuperável depois. O que resolve
   o cansaço da aplicação não é reduzir o formulário, é faseá-lo (ver abaixo).
2. **Campos SELECT/categóricos são prioridade de v1** — é o que a diretoria quer de fato:
   filtro e contagem ("dos 1000, quantos no CooperaMais, quantos na Bahia, quantos são
   mulheres"). BI simples sobre facetas, não relatório narrativo.
3. **Campos de texto livre não bloqueiam v1** — guardar como estão, é matéria-prima futura
   para IA (correlação, geração de relatório/descrição de projeto). Explicitamente F2.
4. **Diagnóstico é fluxo de técnico em visitas, não form único.** Aplicação em 3 visitas
   (ver `EXPLICACAO.md` para o detalhamento e o porquê de cada uma). Schema precisa de
   status/etapa (rascunho → visita 1 → visita 2 → visita 3 → completo), não INSERT único.

## Governança de dados — decisão pendente de execução

Definido: ownership do **Supabase** (não do código/hosting) é o que garante segurança
institucional. Plano: criar uma Organization no Supabase com um e-mail institucional da
UNISOL Brasil como Owner/Admin desde o início — não exige que Luciano acesse caixa de
entrada alheia, é a própria UNISOL cuidando do próprio login. Código (Next.js) pode
continuar na infraestrutura de Luciano (Vercel) porque é descartável/reconstruível; dado
não é. Ver `EXPLICACAO.md` para a versão em linguagem simples desta explicação.

**Pendente:** nenhuma infraestrutura foi criada. Próximo passo depois da validação com
Arildo/Anderson/Anne é decidir quem na UNISOL será o e-mail Owner da organização Supabase.

## Estado desta decisão

Nada foi implementado. Este documento e `EXPLICACAO.md` foram escritos para validação
institucional antes de qualquer código. Ver memória `cadastro_nacional_unisol.md` para o
histórico completo da conversa que gerou essas decisões.
