// @ts-nocheck
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

type Prato = {
  id: number
  nome: string
  sku: string
  tamanho: string
  peso_final: number
  categoria_prato: string | null
}

type PratoComponente = {
  id: number
  prato_id: number
  componente_id: number
  quantidade_final: number | string
  unidade: string | null
  ordem: number | string
  componentes: {
    id: number
    nome: string
    rendimento_final: number | string | null
    unidade_rendimento: string | null
  } | null
}

type ComponenteIngrediente = {
  id: number
  componente_id: number
  ingrediente_id: number
  quantidade: number | string
  unidade: string | null
  ingredientes: {
    id: number
    nome: string
  } | null
}

type IngredienteInfo = {
  id: number
  nome: string
  unidade_base: string | null
  preco: number | string | null
  unidade_preco: string | null
}

type LinhaIngrediente = {
  ingredienteId: number
  nome: string
  quantidade: number
  unidade: string | null
  preco: number | null
  unidadePreco: string | null
  custo: number
}

type LinhaComponente = {
  componenteId: number
  nome: string
  custoTotal: number
  ingredientes: LinhaIngrediente[]
}

type FoodCostPrato = {
  prato: Prato
  componentes: LinhaComponente[]
  custoTotal: number
}

const CORES_CATEGORIA: Record<string, { bg: string; textoPrincipal: string; textoSecundario: string }> = {
  'Pratos principais': { bg: '#bbf7d0', textoPrincipal: '#14532d', textoSecundario: '#166534' },
  'Pratos leves':      { bg: '#dcfce7', textoPrincipal: '#14532d', textoSecundario: '#166534' },
  'Pequenos almoços':  { bg: '#fef9c3', textoPrincipal: '#713f12', textoSecundario: '#854d0e' },
  'Doces':             { bg: '#ffedd5', textoPrincipal: '#7c2d12', textoSecundario: '#9a3412' },
  'Sumos':             { bg: '#dbeafe', textoPrincipal: '#1e3a8a', textoSecundario: '#1e40af' },
}

function obterCoresCategoria(categoria: string | null) {
  if (!categoria) return { bg: '#f3f4f6', textoPrincipal: '#111827', textoSecundario: '#6b7280' }
  return CORES_CATEGORIA[categoria] || { bg: '#f3f4f6', textoPrincipal: '#111827', textoSecundario: '#6b7280' }
}

export default function FoodCostPage() {
  const router = useRouter()
  const [aCarregar, setACarregar] = useState(true)
  const [autorizado, setAutorizado] = useState(false)
  const [nomeUtilizador, setNomeUtilizador] = useState('')
  const [pratos, setPratos] = useState<Prato[]>([])
  const [pratosComponentes, setPratosComponentes] = useState<PratoComponente[]>([])
  const [componentesIngredientes, setComponentesIngredientes] = useState<ComponenteIngrediente[]>([])
  const [ingredientesInfo, setIngredientesInfo] = useState<IngredienteInfo[]>([])
  const [pesquisa, setPesquisa] = useState('')
  const [pratoExpandido, setPratoExpandido] = useState<number | null>(null)
  const [ordenacao, setOrdenacao] = useState<'nome' | 'custo_desc' | 'custo_asc'>('nome')
  const [custoOperacao, setCustoOperacao] = useState<string>('')
  const [refeicoes4Semanas, setRefeicoes4Semanas] = useState<string>('')
  const [aGuardarConfig, setAGuardarConfig] = useState(false)
  const [configGuardadaEm, setConfigGuardadaEm] = useState<string | null>(null)

  // ── Guard de acesso ────────────────────────────────────────
  useEffect(() => {
    async function verificarAcesso() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: perfil } = await supabase.from('perfis').select('nome, role').eq('id', user.id).single()
      if (!perfil || perfil.role !== 'gestor') {
        router.push('/')
        return
      }
      setNomeUtilizador(perfil.nome || '')
      setAutorizado(true)
      await carregarDados()
    }
    verificarAcesso()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function carregarDados() {
    setACarregar(true)

    const { data: pratosData } = await supabase
      .from('pratos')
      .select('id, nome, sku, tamanho, peso_final, categoria_prato')
      .order('nome', { ascending: true })
    const listaPratos = (pratosData as Prato[]) || []
    setPratos(listaPratos)

    if (listaPratos.length === 0) { setACarregar(false); return }

    const pratoIds = listaPratos.map((p) => p.id)
    const { data: pcData } = await supabase
      .from('pratos_componentes')
      .select(`id, prato_id, componente_id, quantidade_final, unidade, ordem,
               componentes (id, nome, rendimento_final, unidade_rendimento)`)
      .in('prato_id', pratoIds)
      .order('ordem', { ascending: true })
    const listaPC = (pcData as PratoComponente[]) || []
    setPratosComponentes(listaPC)

    const componenteIds = Array.from(new Set(listaPC.map((pc) => Number(pc.componente_id)).filter((id) => !isNaN(id))))
    const { data: ciData } = await supabase
      .from('componente_ingredientes')
      .select('id, componente_id, ingrediente_id, quantidade, unidade, ingredientes (id, nome)')
      .in('componente_id', componenteIds.length > 0 ? componenteIds : [-1])
    const listaCI = (ciData as ComponenteIngrediente[]) || []
    setComponentesIngredientes(listaCI)

    const ingredienteIds = Array.from(new Set(listaCI.map((ci) => Number(ci.ingrediente_id)).filter((id) => !isNaN(id))))
    const { data: ingData } = await supabase
      .from('ingredientes')
      .select('id, nome, unidade_base, preco, unidade_preco')
      .in('id', ingredienteIds.length > 0 ? ingredienteIds : [-1])
    setIngredientesInfo((ingData as IngredienteInfo[]) || [])

    const { data: configData } = await supabase
      .from('foodcost_config')
      .select('custo_operacao_4_semanas, refeicoes_4_semanas, atualizado_em')
      .eq('id', 1)
      .single()
    if (configData) {
      setCustoOperacao(configData.custo_operacao_4_semanas ? String(configData.custo_operacao_4_semanas) : '')
      setRefeicoes4Semanas(configData.refeicoes_4_semanas ? String(configData.refeicoes_4_semanas) : '')
      setConfigGuardadaEm(configData.atualizado_em || null)
    }

    setACarregar(false)
  }

  async function guardarConfigOperacao() {
    setAGuardarConfig(true)
    const custoNum = parseFloat(custoOperacao.replace(',', '.')) || 0
    const refeicoesNum = parseFloat(refeicoes4Semanas.replace(',', '.')) || 0
    const { data, error } = await supabase
      .from('foodcost_config')
      .update({
        custo_operacao_4_semanas: custoNum,
        refeicoes_4_semanas: refeicoesNum,
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', 1)
      .select()
      .single()
    if (error) {
      alert('Erro ao guardar configuração: ' + error.message)
      setAGuardarConfig(false)
      return
    }
    if (data) setConfigGuardadaEm(data.atualizado_em)
    setAGuardarConfig(false)
  }

  // ── Helpers ─────────────────────────────────────────────────
  function normalizarTexto(valor: string | null | undefined) {
    return String(valor || '').trim().toLowerCase()
  }

  function parseNumero(valor: number | string | null | undefined) {
    if (valor === null || valor === undefined || String(valor).trim() === '') return 0
    const numero = parseFloat(String(valor).replace(',', '.'))
    return isNaN(numero) ? 0 : numero
  }

  function formatarNumero(valor: number) { return Number(valor || 0).toFixed(2) }
  function formatarPreco(valor: number) { return `${formatarNumero(valor)} €` }

  function formatarQuantidade(valor: number, unidade: string | null) {
    const u = (unidade || '').toLowerCase()
    if (u === 'g') return valor >= 1000 ? `${(valor / 1000).toFixed(2)} kg` : `${valor.toFixed(0)} g`
    if (u === 'kg') return `${valor.toFixed(2)} kg`
    if (u === 'un') return `${valor.toFixed(2)} un`
    if (u === 'ml') return valor >= 1000 ? `${(valor / 1000).toFixed(2)} l` : `${valor.toFixed(0)} ml`
    if (u === 'l') return `${valor.toFixed(2)} l`
    return `${valor.toFixed(2)}${unidade ? ` ${unidade}` : ''}`
  }

  function converterQuantidadeParaUnidadePreco(quantidade: number, unidadeQuantidade: string | null, unidadePreco: string | null) {
    const uq = normalizarTexto(unidadeQuantidade); const up = normalizarTexto(unidadePreco)
    if (!quantidade || !uq || !up) return 0
    if (uq === up) return quantidade
    if (uq === 'g' && up === 'kg') return quantidade / 1000
    if (uq === 'kg' && up === 'g') return quantidade * 1000
    if (uq === 'ml' && up === 'l') return quantidade / 1000
    if (uq === 'l' && up === 'ml') return quantidade * 1000
    return 0
  }

  function calcularCustoIngrediente(quantidade: number, unidadeQuantidade: string | null, preco: number | null, unidadePreco: string | null) {
    if (preco === null || preco === undefined || !unidadePreco || !unidadeQuantidade) return 0
    const quantidadeConvertida = converterQuantidadeParaUnidadePreco(quantidade, unidadeQuantidade, unidadePreco)
    if (!quantidadeConvertida) return 0
    return quantidadeConvertida * preco
  }

  function obterFatorUsoComponente(pc: PratoComponente) {
    const usado = parseNumero(pc.quantidade_final)
    const rendimento = parseNumero(pc.componentes?.rendimento_final)
    if (!usado || !rendimento) return 0
    return usado / rendimento
  }

  function obterInfoIngredientePorId(ingredienteId?: number | string | null) {
    if (ingredienteId === undefined || ingredienteId === null) return undefined
    return ingredientesInfo.find((item) => Number(item.id) === Number(ingredienteId))
  }

  // ── Overhead por dose ───────────────────────────────────────
  const overheadPorDose = useMemo(() => {
    const custoNum = parseFloat(String(custoOperacao).replace(',', '.')) || 0
    const refeicoesNum = parseFloat(String(refeicoes4Semanas).replace(',', '.')) || 0
    if (!custoNum || !refeicoesNum) return 0
    return custoNum / refeicoesNum
  }, [custoOperacao, refeicoes4Semanas])

  // ── Cálculo do food cost por prato ──────────────────────────
  const foodCostPorPrato = useMemo<FoodCostPrato[]>(() => {
    return pratos.map((prato) => {
      const componentesDoPrato = pratosComponentes
        .filter((pc) => Number(pc.prato_id) === prato.id)
        .sort((a, b) => Number(a.ordem) - Number(b.ordem))

      const linhasComponentes: LinhaComponente[] = componentesDoPrato.map((pc) => {
        const fator = obterFatorUsoComponente(pc)
        const ingredientesDoComponente = componentesIngredientes.filter((ci) => Number(ci.componente_id) === Number(pc.componente_id))

        const linhasIng: LinhaIngrediente[] = ingredientesDoComponente.map((ci) => {
          const info = obterInfoIngredientePorId(ci.ingrediente_id)
          const nome = ci.ingredientes?.nome || info?.nome || 'Ingrediente'
          const unidade = ci.unidade || info?.unidade_base || null
          const preco = info?.preco === null || info?.preco === undefined ? null : parseNumero(info.preco)
          const unidadePreco = info?.unidade_preco || null
          const quantidadeBase = parseNumero(ci.quantidade)
          const quantidadeUsada = quantidadeBase * fator // por dose
          const custo = calcularCustoIngrediente(quantidadeUsada, unidade, preco, unidadePreco)
          return {
            ingredienteId: Number(ci.ingrediente_id),
            nome,
            quantidade: quantidadeUsada,
            unidade,
            preco,
            unidadePreco,
            custo,
          }
        }).sort((a, b) => b.custo - a.custo)

        const custoTotalComp = linhasIng.reduce((s, l) => s + l.custo, 0)

        return {
          componenteId: Number(pc.componente_id),
          nome: pc.componentes?.nome || 'Componente',
          custoTotal: custoTotalComp,
          ingredientes: linhasIng,
        }
      })

      const custoTotal = linhasComponentes.reduce((s, c) => s + c.custoTotal, 0)
      return { prato, componentes: linhasComponentes, custoTotal }
    })
  }, [pratos, pratosComponentes, componentesIngredientes, ingredientesInfo])

  // ── Filtragem e ordenação ───────────────────────────────────
  const pratosVisiveis = useMemo(() => {
    const termo = normalizarTexto(pesquisa)
    let lista = foodCostPorPrato
    if (termo.length >= 2) {
      lista = lista.filter((fc) =>
        normalizarTexto(fc.prato.nome).includes(termo) ||
        normalizarTexto(fc.prato.sku).includes(termo)
      )
    }
    if (ordenacao === 'custo_desc') lista = [...lista].sort((a, b) => (b.custoTotal + overheadPorDose) - (a.custoTotal + overheadPorDose))
    else if (ordenacao === 'custo_asc') lista = [...lista].sort((a, b) => (a.custoTotal + overheadPorDose) - (b.custoTotal + overheadPorDose))
    else lista = [...lista].sort((a, b) => a.prato.nome.localeCompare(b.prato.nome))
    return lista
  }, [foodCostPorPrato, pesquisa, ordenacao, overheadPorDose])

  // ── Render ─────────────────────────────────────────────────
  if (!autorizado) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>A verificar acesso...</p>
      </div>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#fff', color: '#111' }}>
      <div style={{ backgroundColor: '#f3f4f6', borderBottom: '1px solid #e5e7eb', padding: '6px 32px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {nomeUtilizador && <span style={{ color: '#6b7280', fontSize: '13px' }}>Olá, {nomeUtilizador}</span>}
          <button onClick={() => router.push('/')} style={{ background: '#fff', border: '1px solid #d1d5db', padding: '6px 14px', borderRadius: '8px', fontSize: '13px', color: '#374151', cursor: 'pointer' }}>← Início</button>
          <button onClick={handleLogout} style={{ backgroundColor: 'transparent', border: 'none', color: '#6b7280', fontSize: '13px', cursor: 'pointer' }}>Sair da sessão</button>
        </div>
      </div>

      <div style={{ padding: '32px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '700', margin: '0 0 4px' }}>💰 Food Cost</h1>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>Custo dos ingredientes por dose, calculado para cada prato.</p>
        </div>

        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px' }}>
          <p style={{ fontSize: '13px', fontWeight: '600', color: '#111', margin: '0 0 12px' }}>Custos de operação</p>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Custo total da operação em 4 semanas (€)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={custoOperacao}
                onChange={(e) => setCustoOperacao(e.target.value)}
                placeholder="ex: 12000"
                style={{ width: '100%', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', color: '#111', background: '#fff', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Refeições produzidas em 4 semanas</label>
              <input
                type="number"
                step="1"
                min="0"
                value={refeicoes4Semanas}
                onChange={(e) => setRefeicoes4Semanas(e.target.value)}
                placeholder="ex: 4000"
                style={{ width: '100%', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', color: '#111', background: '#fff', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ flex: '1 1 160px' }}>
              <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Overhead por dose</label>
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', padding: '8px 12px', borderRadius: '6px', fontSize: '15px', fontWeight: '700', color: overheadPorDose > 0 ? '#80c944' : '#9ca3af' }}>
                {overheadPorDose > 0 ? formatarPreco(overheadPorDose) : '—'}
              </div>
            </div>
            <button
              onClick={guardarConfigOperacao}
              disabled={aGuardarConfig}
              style={{ backgroundColor: '#80c944', color: '#fff', border: 'none', padding: '9px 20px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
            >
              {aGuardarConfig ? 'A guardar...' : 'Guardar'}
            </button>
          </div>
          {configGuardadaEm && (
            <p style={{ fontSize: '11px', color: '#9ca3af', margin: '10px 0 0' }}>
              Última atualização: {new Date(configGuardadaEm).toLocaleString('pt-PT')}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Pesquisar por nome ou SKU..."
            value={pesquisa}
            onChange={(e) => setPesquisa(e.target.value)}
            style={{ flex: '1 1 300px', maxWidth: '420px', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', color: '#111', background: '#fff' }}
          />
          <select
            value={ordenacao}
            onChange={(e) => setOrdenacao(e.target.value as any)}
            style={{ border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', color: '#111', background: '#fff' }}
          >
            <option value="nome">Ordenar: Nome (A→Z)</option>
            <option value="custo_desc">Ordenar: Custo (mais caro primeiro)</option>
            <option value="custo_asc">Ordenar: Custo (mais barato primeiro)</option>
          </select>
        </div>

        {aCarregar ? (
          <p style={{ color: '#6b7280' }}>A carregar dados...</p>
        ) : pratosVisiveis.length === 0 ? (
          <p style={{ color: '#6b7280' }}>Nenhum prato encontrado.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '12px' }}>
            {pratosVisiveis.map((fc) => {
              const cores = obterCoresCategoria(fc.prato.categoria_prato)
              const expandido = pratoExpandido === fc.prato.id
              const semPreco = fc.componentes.some((c) =>
                c.ingredientes.some((i) => i.preco === null || i.preco === undefined)
              )
              return (
                <div key={fc.prato.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
                  <div style={{ background: cores.bg, padding: '12px 14px' }}>
                    <p style={{ fontSize: '9px', color: cores.textoSecundario, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      {fc.prato.categoria_prato || 'Sem categoria'}
                    </p>
                    <p style={{ fontSize: '15px', color: cores.textoPrincipal, fontWeight: '600', margin: '0 0 2px' }}>{fc.prato.nome}</p>
                    <p style={{ fontSize: '11px', color: cores.textoSecundario, margin: 0 }}>{fc.prato.tamanho} · {fc.prato.sku}</p>
                  </div>

                  <div style={{ padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', gap: '8px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#6b7280', marginBottom: '2px' }}>
                          <span>Ingredientes</span>
                          <span style={{ color: '#111', fontWeight: '500' }}>{formatarPreco(fc.custoTotal)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>
                          <span>Overhead operação</span>
                          <span style={{ color: '#111', fontWeight: '500' }}>{overheadPorDose > 0 ? formatarPreco(overheadPorDose) : '—'}</span>
                        </div>
                        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <span style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Total por dose</span>
                          <span style={{ fontSize: '22px', fontWeight: '700', color: '#111' }}>{formatarPreco(fc.custoTotal + overheadPorDose)}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setPratoExpandido(expandido ? null : fc.prato.id)}
                        style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', color: '#374151', cursor: 'pointer', flexShrink: 0, alignSelf: 'flex-start' }}
                      >
                        {expandido ? 'Recolher ▴' : 'Detalhar ▾'}
                      </button>
                    </div>

                    {semPreco && (
                      <p style={{ fontSize: '11px', color: '#92400e', background: '#fffbeb', border: '1px solid #fcd34d', padding: '6px 8px', borderRadius: '6px', margin: '0 0 10px' }}>
                        ⚠ Há ingredientes sem preço definido — o custo está subestimado.
                      </p>
                    )}

                    {expandido && (
                      <div style={{ marginTop: '8px', borderTop: '1px solid #e5e7eb', paddingTop: '10px' }}>
                        {fc.componentes.length === 0 ? (
                          <p style={{ fontSize: '12px', color: '#9ca3af' }}>Este prato não tem componentes.</p>
                        ) : (
                          fc.componentes.map((comp) => {
                            const pct = fc.custoTotal > 0 ? (comp.custoTotal / fc.custoTotal) * 100 : 0
                            return (
                              <div key={comp.componenteId} style={{ marginBottom: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                                  <p style={{ fontSize: '13px', fontWeight: '600', margin: 0, color: '#111' }}>{comp.nome}</p>
                                  <p style={{ fontSize: '12px', fontWeight: '600', margin: 0, color: '#111' }}>
                                    {formatarPreco(comp.custoTotal)} <span style={{ color: '#9ca3af', fontWeight: '400' }}>({pct.toFixed(0)}%)</span>
                                  </p>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '8px', borderLeft: '2px solid #e5e7eb' }}>
                                  {comp.ingredientes.map((ing) => (
                                    <div key={ing.ingredienteId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#374151' }}>
                                      <span>
                                        {ing.nome} · {formatarQuantidade(ing.quantidade, ing.unidade)}
                                        {(ing.preco === null || ing.preco === undefined) && <span style={{ color: '#dc2626' }}> · sem preço</span>}
                                      </span>
                                      <span style={{ color: '#6b7280' }}>{formatarPreco(ing.custo)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )
                          })
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}