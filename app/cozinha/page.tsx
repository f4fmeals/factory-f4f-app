// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

type ProducaoAtiva = {
  id: number
  nome_semana: string
  data_inicio: string
}

type DetalheProducao = {
  id: number
  quantidade: number
  pratos: {
    id: number
    nome: string
    sku: string
    tamanho: string
    peso_final?: number
    prioridade_embalamento?: number | null
    categoria_prato?: string | null
  } | null
}

type PratoComponente = {
  id: number
  prato_id: number
  componente_id: number
  quantidade_final: number | string
  unidade: string | null
  posicao_embalagem: string | null
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
  ingredientes: { id: number; nome: string } | null
}

type TarefaPreparacao = {
  id: number
  componente_ingrediente_id: number
  ordem: number
  tarefa: string
  observacoes: string | null
}

type TarefaConfeccao = {
  id: number
  componente_id: number
  ordem: number
  tarefa: string
  observacoes: string | null
}

type TarefaFinalizacao = {
  id: number
  componente_id: number
  ordem: number
  tarefa: string
  observacoes: string | null
}

type Registo = {
  id?: string
  concluido: boolean
  quantidade_final: number | null
  temperatura_confeccao: number | null
  temperatura_abatimento: number | null
  extras: boolean | null
  quantidade_extras: number | null
  impressao_etiqueta: boolean
}

type RegistoEmbalamento = {
  id?: string
  concluido: boolean
  extras: boolean | null
  extrasPorTamanho: Record<number, number>
  etiquetasImpressas: boolean
}

type SecaoAtiva = 'preparacao' | 'confeccao' | 'finalizacao' | 'embalamento'

const ORDEM_TAMANHO: Record<string, number> = { m: 1, l: 2, xl: 3 }
function ordemTamanho(t: string) { return ORDEM_TAMANHO[t?.toLowerCase()] ?? 99 }

const ORDEM_CATEGORIAS = ['Pratos principais', 'Pratos leves', 'Pequenos almoços', 'Doces', 'Unidoses', 'Sumos']

const CORES_CATEGORIA: Record<string, { bg: string; texto: string; borda: string }> = {
  'Pratos principais': { bg: '#bbf7d0', texto: '#14532d', borda: '#86efac' },
  'Pratos leves': { bg: '#dcfce7', texto: '#14532d', borda: '#86efac' },
  'Pequenos almoços': { bg: '#fef9c3', texto: '#713f12', borda: '#fde047' },
  'Doces': { bg: '#ffedd5', texto: '#7c2d12', borda: '#fdba74' },
  'Unidoses': { bg: '#f3e8ff', texto: '#581c87', borda: '#d8b4fe' },
  'Sumos': { bg: '#dbeafe', texto: '#1e3a8a', borda: '#93c5fd' },
}
function coresCategoria(cat: string | null | undefined) {
  if (!cat) return { bg: '#f3f4f6', texto: '#111827', borda: '#d1d5db' }
  return CORES_CATEGORIA[cat] || { bg: '#f3f4f6', texto: '#111827', borda: '#d1d5db' }
}

function PillConcluido({ label, onDesfazer }: { label: string; onDesfazer: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '99px', padding: '6px 12px', gap: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
        <span style={{ color: '#16a34a', fontSize: '13px', flexShrink: 0 }}>✓</span>
        <span style={{ fontSize: '13px', color: '#9ca3af', textDecoration: 'line-through', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      </div>
      <button onClick={onDesfazer}
        style={{ background: 'transparent', border: 'none', fontSize: '11px', color: '#6b7280', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, padding: '0 4px' }}>
        Desfazer
      </button>
    </div>
  )
}

export default function Cozinha() {
  const router = useRouter()
  const [aCarregar, setACarregar] = useState(true)
  const [nomeUtilizador, setNomeUtilizador] = useState('')
  const [seccoes, setSeccoes] = useState<string[]>([])
  const [producaoAtiva, setProducaoAtiva] = useState<ProducaoAtiva | null>(null)
  const [secaoAtiva, setSecaoAtiva] = useState<SecaoAtiva>('preparacao')
  const [categoriaEmbalamento, setCategoriaEmbalamento] = useState<string>('')
  const [mostrarPainelExtras, setMostrarPainelExtras] = useState(false)

  const [detalhes, setDetalhes] = useState<DetalheProducao[]>([])
  const [pratosComponentes, setPratosComponentes] = useState<PratoComponente[]>([])
  const [componentesIngredientes, setComponentesIngredientes] = useState<ComponenteIngrediente[]>([])
  const [tarefasPreparacao, setTarefasPreparacao] = useState<TarefaPreparacao[]>([])
  const [tarefasConfeccao, setTarefasConfeccao] = useState<TarefaConfeccao[]>([])
  const [tarefasFinalizacao, setTarefasFinalizacao] = useState<TarefaFinalizacao[]>([])
  const [registos, setRegistos] = useState<Record<string, Registo>>({})
  const [registosEmbalamento, setRegistosEmbalamento] = useState<Record<string, RegistoEmbalamento>>({})

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: perfil } = await supabase.from('perfis').select('nome, role, seccoes').eq('id', user.id).single()
      if (!perfil || !['gestor', 'cozinha'].includes(perfil.role)) { router.push('/'); return }
      setNomeUtilizador(perfil.nome)
      setSeccoes(perfil.seccoes || [])
      if (perfil.seccoes?.length > 0) setSecaoAtiva(perfil.seccoes[0] as SecaoAtiva)
      const { data: prod } = await supabase.from('producoes_semanais').select('id, nome_semana, data_inicio').eq('estado', 'ativo').single()
      if (!prod) { setACarregar(false); return }
      setProducaoAtiva(prod)
      await carregarDados(prod.id)
      setACarregar(false)
    }
    init()
  }, [])

  useEffect(() => {
    if (!producaoAtiva) return
    const channel = supabase.channel(`registos_cozinha_${producaoAtiva.id}_${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registos_producao' },
        (payload) => {
          const r = payload.new as any
          if (r.producao_semanal_id !== producaoAtiva.id) return

          if (r.setor === 'embalamento_grupo') {
            const chave = `emb|${r.referencia_id}`
            let extrasPorTamanho: Record<number, number> = {}
            try { if (r.quantidade_extras) extrasPorTamanho = JSON.parse(r.quantidade_extras) } catch {}
            setRegistosEmbalamento(prev => ({
              ...prev,
              [chave]: { id: r.id, concluido: r.concluido, extras: r.extras, extrasPorTamanho, etiquetasImpressas: r.observacoes === 'etiquetas_impressas' }
            }))
          } else {
            const chave = `${r.setor}|${r.referencia_id}`
            setRegistos(prev => ({ ...prev, [chave]: { id: r.id, concluido: r.concluido, quantidade_final: r.quantidade_final, temperatura_confeccao: r.temperatura_confeccao, temperatura_abatimento: r.temperatura_abatimento, extras: r.extras, quantidade_extras: r.quantidade_extras, impressao_etiqueta: r.impressao_etiqueta || false } }))
          }
        })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [producaoAtiva])

  async function carregarDados(producaoId: number) {
    const { data: det } = await supabase.from('producoes_semanais_itens')
      .select('id, quantidade, pratos (id, nome, sku, tamanho, peso_final, prioridade_embalamento, categoria_prato)')
      .eq('producao_semanal_id', producaoId).order('ordem', { ascending: true })
    const detalhesLista = (det || []) as DetalheProducao[]
    setDetalhes(detalhesLista)

    const pratoIds = detalhesLista.map(i => Number(i.pratos?.id)).filter(Boolean)
    if (!pratoIds.length) return

    const { data: pc } = await supabase.from('pratos_componentes')
      .select('id, prato_id, componente_id, quantidade_final, unidade, posicao_embalagem, ordem, componentes (id, nome, rendimento_final, unidade_rendimento)')
      .in('prato_id', pratoIds).order('ordem', { ascending: true })
    const pcLista = (pc || []) as PratoComponente[]
    setPratosComponentes(pcLista)

    const compIds = Array.from(new Set(pcLista.map(i => Number(i.componente_id))))
    const { data: ci } = await supabase.from('componente_ingredientes')
      .select('id, componente_id, ingrediente_id, quantidade, unidade, ingredientes (id, nome)')
      .in('componente_id', compIds.length ? compIds : [-1])
    setComponentesIngredientes((ci || []) as ComponenteIngrediente[])

    const ciIds = Array.from(new Set(((ci || []) as ComponenteIngrediente[]).map(i => Number(i.id))))
    const { data: tp } = await supabase.from('tarefas_preparacao_novo')
      .select('id, componente_ingrediente_id, ordem, tarefa, observacoes')
      .in('componente_ingrediente_id', ciIds.length ? ciIds : [-1]).order('ordem', { ascending: true })
    setTarefasPreparacao((tp || []) as TarefaPreparacao[])

    const { data: tc } = await supabase.from('tarefas_confeccao_novo')
      .select('id, componente_id, ordem, tarefa, observacoes')
      .in('componente_id', compIds.length ? compIds : [-1]).order('ordem', { ascending: true })
    setTarefasConfeccao((tc || []) as TarefaConfeccao[])

    const { data: tf } = await supabase.from('tarefas_finalizacao_novo')
      .select('id, componente_id, ordem, tarefa, observacoes')
      .in('componente_id', compIds.length ? compIds : [-1]).order('ordem', { ascending: true })
    setTarefasFinalizacao((tf || []) as TarefaFinalizacao[])

    const { data: reg } = await supabase.from('registos_producao').select('*').eq('producao_semanal_id', producaoId)
    if (reg) {
      const mapa: Record<string, Registo> = {}
      const mapaEmb: Record<string, RegistoEmbalamento> = {}
      reg.forEach((r: any) => {
        if (r.setor === 'embalamento_grupo') {
          const chave = `emb|${r.referencia_id}`
          let extrasPorTamanho: Record<number, number> = {}
          try { if (r.quantidade_extras) extrasPorTamanho = JSON.parse(r.quantidade_extras) } catch {}
          mapaEmb[chave] = { id: r.id, concluido: r.concluido, extras: r.extras, extrasPorTamanho, etiquetasImpressas: r.observacoes === 'etiquetas_impressas' }
        } else {
          mapa[`${r.setor}|${r.referencia_id}`] = { id: r.id, concluido: r.concluido, quantidade_final: r.quantidade_final, temperatura_confeccao: r.temperatura_confeccao, temperatura_abatimento: r.temperatura_abatimento, extras: r.extras, quantidade_extras: r.quantidade_extras, impressao_etiqueta: r.impressao_etiqueta || false }
        }
      })
      setRegistos(mapa)
      setRegistosEmbalamento(mapaEmb)
    }
  }

  // CORRIGIDO: usa upsert em vez de insert/update separados
  async function guardarRegisto(setor: string, referenciaId: number, dados: Partial<Registo>) {
    if (!producaoAtiva) return
    const chave = `${setor}|${referenciaId}`
    setRegistos(prev => ({ ...prev, [chave]: { ...prev[chave], ...dados } as Registo }))

    const { data } = await supabase
      .from('registos_producao')
      .upsert(
        {
          producao_semanal_id: producaoAtiva.id,
          setor,
          referencia_id: referenciaId,
          ...dados,
          atualizado_em: new Date().toISOString(),
        },
        { onConflict: 'producao_semanal_id,setor,referencia_id' }
      )
      .select()
      .single()

    if (data) {
      setRegistos(prev => ({ ...prev, [chave]: { ...prev[chave], id: data.id } as Registo }))
    }
  }

  // CORRIGIDO: usa upsert em vez de insert/update separados
  async function guardarRegistoEmbalamento(chaveGrupo: string, referenciaId: number, dados: Partial<RegistoEmbalamento>) {
    if (!producaoAtiva) return
    setRegistosEmbalamento(prev => ({ ...prev, [chaveGrupo]: { ...prev[chaveGrupo], ...dados } as RegistoEmbalamento }))

    const dadosDB: any = { atualizado_em: new Date().toISOString() }
    if ('concluido' in dados) dadosDB.concluido = dados.concluido
    if ('extras' in dados) dadosDB.extras = dados.extras
    if ('extrasPorTamanho' in dados) dadosDB.quantidade_extras = JSON.stringify(dados.extrasPorTamanho)
    if ('etiquetasImpressas' in dados) dadosDB.observacoes = dados.etiquetasImpressas ? 'etiquetas_impressas' : null

    const { data } = await supabase
      .from('registos_producao')
      .upsert(
        {
          producao_semanal_id: producaoAtiva.id,
          setor: 'embalamento_grupo',
          referencia_id: referenciaId,
          concluido: dados.concluido ?? registosEmbalamento[chaveGrupo]?.concluido ?? false,
          ...dadosDB,
        },
        { onConflict: 'producao_semanal_id,setor,referencia_id' }
      )
      .select()
      .single()

    if (data) {
      setRegistosEmbalamento(prev => ({ ...prev, [chaveGrupo]: { ...prev[chaveGrupo], id: data.id } as RegistoEmbalamento }))
    }
  }

  function imprimirEtiqueta(dados: { componenteDestino: string; pratoDestino: string; ingrediente: string; quantidade: string; data: string }, onImprimiu: () => void) {
    const conteudo = `
      <html>
      <head>
        <style>
          @page { size: 62mm 40mm; margin: 2mm; }
          body { font-family: Arial, sans-serif; font-size: 9px; margin: 0; padding: 2mm; width: 58mm; }
          .componente { font-size: 13px; font-weight: bold; margin-bottom: 2px; }
          .linha { display: flex; justify-content: space-between; margin-bottom: 1px; }
          .label { color: #666; }
          .valor { font-weight: bold; }
          .data { font-size: 8px; color: #888; margin-top: 3px; text-align: right; }
          hr { border: none; border-top: 0.5px solid #ccc; margin: 2px 0; }
        </style>
      </head>
      <body>
        <div class="componente">${dados.componenteDestino}</div>
        <hr/>
        <div class="linha"><span class="label">Ingrediente</span><span class="valor">${dados.ingrediente}</span></div>
        <div class="linha"><span class="label">Prato</span><span class="valor">${dados.pratoDestino}</span></div>
        <div class="linha"><span class="label">Quantidade</span><span class="valor">${dados.quantidade}</span></div>
        <div class="data">${dados.data}</div>
      </body>
      </html>
    `
    const janela = window.open('', '_blank', 'width=300,height=200')
    if (!janela) return
    janela.document.write(conteudo)
    janela.document.close()
    janela.focus()
    janela.print()
    setTimeout(() => {
      janela.close()
      onImprimiu()
    }, 500)
  }

  function parseNum(v: any) {
    const n = parseFloat(String(v || '').replace(',', '.'))
    return isNaN(n) ? 0 : n
  }

  function fatorUso(pc: PratoComponente) {
    const usado = parseNum(pc.quantidade_final)
    const rendimento = parseNum(pc.componentes?.rendimento_final)
    if (!usado || !rendimento) return 0
    return usado / rendimento
  }

  function fmtQtd(valor: number, unidade: string | null) {
    const u = (unidade || '').toLowerCase()
    if (u === 'g') return valor >= 1000 ? `${(valor / 1000).toFixed(2)} kg` : `${valor.toFixed(0)} g`
    if (u === 'kg') return `${valor.toFixed(2)} kg`
    if (u === 'ml') return valor >= 1000 ? `${(valor / 1000).toFixed(2)} l` : `${valor.toFixed(0)} ml`
    if (u === 'l') return `${valor.toFixed(2)} l`
    return `${valor.toFixed(2)}${unidade ? ` ${unidade}` : ''}`
  }

  function dataHoje() {
    const d = new Date()
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const secoesVisiveis: SecaoAtiva[] = seccoes.length > 0 ? (seccoes as SecaoAtiva[]) : ['preparacao', 'confeccao', 'finalizacao', 'embalamento']
  const labelSecao: Record<SecaoAtiva, string> = { preparacao: 'Preparação', confeccao: 'Confeção', finalizacao: 'Finalização', embalamento: 'Embalamento' }
  const estiloSliderValor = { fontSize: '14px', fontWeight: '500', minWidth: '60px', color: '#111827' }
  const estiloLabel = { fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }

  // ── Preparação ───────────────────────────────────────────────
  function renderPreparacao() {
    const grupos: Record<string, {
      ingredienteNome: string
      tarefas: { tarefaId: number; tarefa: string; observacoes: string | null; ordem: number; quantidade: number; unidade: string | null; componenteDestino: string; pratoDestino: string }[]
    }> = {}

    detalhes.forEach(item => {
      const pratoId = Number(item.pratos?.id)
      const pratoDestino = item.pratos?.nome || 'Prato'
      const doses = Number(item.quantidade || 0)
      pratosComponentes.filter(pc => Number(pc.prato_id) === pratoId).forEach(pc => {
        const componenteDestino = pc.componentes?.nome || 'Componente'
        componentesIngredientes.filter(ci => Number(ci.componente_id) === Number(pc.componente_id)).forEach(ci => {
          const tarefasCi = tarefasPreparacao.filter(t => Number(t.componente_ingrediente_id) === Number(ci.id))
          if (!tarefasCi.length) return
          const qtd = parseNum(ci.quantidade) * fatorUso(pc) * doses
          if (!qtd) return
          const nome = ci.ingredientes?.nome || 'Ingrediente'
          const chave = `${Number(ci.ingrediente_id)}|${nome}`
          if (!grupos[chave]) grupos[chave] = { ingredienteNome: nome, tarefas: [] }
          tarefasCi.forEach(t => {
            const idx = grupos[chave].tarefas.findIndex(x => x.tarefaId === t.id)
            if (idx >= 0) grupos[chave].tarefas[idx].quantidade += qtd
            else grupos[chave].tarefas.push({ tarefaId: t.id, tarefa: t.tarefa, observacoes: t.observacoes, ordem: Number(t.ordem), quantidade: qtd, unidade: ci.unidade, componenteDestino, pratoDestino })
          })
        })
      })
    })

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {Object.values(grupos).sort((a, b) => a.ingredienteNome.localeCompare(b.ingredienteNome)).map(grupo => (
          <div key={grupo.ingredienteNome}>
            <p style={{ fontSize: '13px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px solid #e5e7eb' }}>
              {grupo.ingredienteNome}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {grupo.tarefas.sort((a, b) => a.ordem - b.ordem).map(tarefa => {
                const chave = `preparacao|${tarefa.tarefaId}`
                const reg = registos[chave] || { concluido: false, impressao_etiqueta: false }
                const feita = reg.concluido || false
                const impressa = reg.impressao_etiqueta || false
                const colapsado = feita && impressa

                if (colapsado) {
                  return (
                    <PillConcluido
                      key={tarefa.tarefaId}
                      label={tarefa.tarefa}
                      onDesfazer={() => guardarRegisto('preparacao', tarefa.tarefaId, { concluido: false, impressao_etiqueta: false })}
                    />
                  )
                }

                return (
                  <div key={tarefa.tarefaId} style={{ background: feita ? '#f0fdf4' : '#fff', border: `1px solid ${feita ? '#86efac' : '#e5e7eb'}`, borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <p style={{ fontSize: '15px', fontWeight: '500', color: feita ? '#9ca3af' : '#111', textDecoration: feita ? 'line-through' : 'none', margin: '0 0 4px' }}>{tarefa.tarefa}</p>
                      <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 2px' }}>{fmtQtd(tarefa.quantidade, tarefa.unidade)}</p>
                      <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 1px' }}>→ {tarefa.componenteDestino}</p>
                      <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0 }}>{tarefa.pratoDestino}</p>
                      {tarefa.observacoes && <p style={{ fontSize: '11px', color: '#9ca3af', margin: '2px 0 0' }}>{tarefa.observacoes}</p>}
                    </div>
                    {!feita && (
                      <button onClick={() => guardarRegisto('preparacao', tarefa.tarefaId, { concluido: true })}
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', background: '#80c944', color: '#fff', fontSize: '15px', fontWeight: '500', cursor: 'pointer' }}>
                        Feito ✓
                      </button>
                    )}
                    {feita && !impressa && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <button
                          onClick={() => imprimirEtiqueta(
                            { componenteDestino: tarefa.componenteDestino, pratoDestino: tarefa.pratoDestino, ingrediente: grupo.ingredienteNome, quantidade: fmtQtd(tarefa.quantidade, tarefa.unidade), data: dataHoje() },
                            () => guardarRegisto('preparacao', tarefa.tarefaId, { impressao_etiqueta: true })
                          )}
                          style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>
                          🖨 Imprimir etiqueta
                        </button>
                        <button onClick={() => guardarRegisto('preparacao', tarefa.tarefaId, { concluido: false })}
                          style={{ width: '100%', padding: '8px', borderRadius: '8px', border: 'none', background: '#f3f4f6', color: '#6b7280', fontSize: '12px', cursor: 'pointer' }}>
                          Desfazer
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // ── Confeção ─────────────────────────────────────────────────
  function renderConfeccao() {
    const componentesMap: Record<string, { componenteId: number; componenteNome: string; quantidadeTotal: number; unidade: string | null; tarefas: TarefaConfeccao[] }> = {}
    detalhes.forEach(item => {
      const pratoId = Number(item.pratos?.id)
      const doses = Number(item.quantidade || 0)
      pratosComponentes.filter(pc => Number(pc.prato_id) === pratoId).forEach(pc => {
        const cId = Number(pc.componente_id)
        const cNome = pc.componentes?.nome || 'Componente'
        const qtd = parseNum(pc.quantidade_final) * doses
        const tarefasC = tarefasConfeccao.filter(t => Number(t.componente_id) === cId)
        if (!tarefasC.length) return
        const chave = String(cId)
        if (!componentesMap[chave]) componentesMap[chave] = { componenteId: cId, componenteNome: cNome, quantidadeTotal: 0, unidade: pc.unidade, tarefas: tarefasC }
        componentesMap[chave].quantidadeTotal += qtd
      })
    })

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
        {Object.values(componentesMap).map(comp => {
          const chave = `confeccao|${comp.componenteId}`
          const reg = registos[chave] || { concluido: false }
          const feito = reg.concluido || false
          const tempConf = reg.temperatura_confeccao ?? 75
          const tempAbat = reg.temperatura_abatimento ?? 6
          const confOk = tempConf >= 75
          const abatOk = tempAbat >= 2 && tempAbat <= 6

          if (feito) {
            return (
              <PillConcluido
                key={comp.componenteId}
                label={comp.componenteNome}
                onDesfazer={() => guardarRegisto('confeccao', comp.componenteId, { concluido: false })}
              />
            )
          }

          return (
            <div key={comp.componenteId} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <p style={{ fontSize: '16px', fontWeight: '500', color: '#111', margin: '0 0 2px' }}>{comp.componenteNome}</p>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>{fmtQtd(comp.quantidadeTotal, comp.unidade)}</p>
              </div>
              <div>
                <label style={estiloLabel}>Quantidade final</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input type="range" min="0" max="100" step="0.5" value={reg.quantidade_final ?? 0}
                    onChange={e => guardarRegisto('confeccao', comp.componenteId, { quantidade_final: parseFloat(e.target.value) })}
                    style={{ flex: 1, accentColor: '#111827' }} />
                  <span style={estiloSliderValor}>{Number(reg.quantidade_final ?? 0).toFixed(1)} kg</span>
                </div>
              </div>
              <div>
                <label style={estiloLabel}>
                  Temp. confeção — <span style={{ color: confOk ? '#16a34a' : '#dc2626', fontWeight: '500' }}>{confOk ? '✓ OK' : '⚠ Mín. 75°C'}</span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input type="range" min="-18" max="100" step="1" value={tempConf}
                    onChange={e => guardarRegisto('confeccao', comp.componenteId, { temperatura_confeccao: parseInt(e.target.value) })}
                    style={{ flex: 1, accentColor: '#111827' }} />
                  <span style={{ ...estiloSliderValor, color: confOk ? '#16a34a' : '#dc2626' }}>{tempConf}°C</span>
                </div>
              </div>
              <div>
                <label style={estiloLabel}>
                  Temp. abatimento — <span style={{ color: abatOk ? '#16a34a' : '#dc2626', fontWeight: '500' }}>{abatOk ? '✓ OK' : '⚠ Entre 2°C e 6°C'}</span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input type="range" min="-18" max="100" step="1" value={tempAbat}
                    onChange={e => guardarRegisto('confeccao', comp.componenteId, { temperatura_abatimento: parseInt(e.target.value) })}
                    style={{ flex: 1, accentColor: '#111827' }} />
                  <span style={{ ...estiloSliderValor, color: abatOk ? '#16a34a' : '#dc2626' }}>{tempAbat}°C</span>
                </div>
              </div>
              <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '10px' }}>
                <p style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Tarefas</p>
                {comp.tarefas.sort((a, b) => a.ordem - b.ordem).map(t => (
                  <p key={t.id} style={{ fontSize: '13px', color: '#374151', margin: '0 0 3px' }}>{t.ordem}. {t.tarefa}{t.observacoes ? ` — ${t.observacoes}` : ''}</p>
                ))}
              </div>
              <button onClick={() => guardarRegisto('confeccao', comp.componenteId, { concluido: true })}
                style={{ width: '100%', padding: '13px', borderRadius: '8px', border: 'none', background: '#80c944', color: '#fff', fontSize: '15px', fontWeight: '500', cursor: 'pointer' }}>
                Feito ✓
              </button>
            </div>
          )
        })}
      </div>
    )
  }

  // ── Finalização ──────────────────────────────────────────────
  function renderFinalizacao() {
    const pratosMap: Record<string, { pratoNome: string; tarefas: { tarefaId: number; tarefa: string; observacoes: string | null; ordem: number; componenteNome: string; quantidade: number; unidade: string | null }[] }> = {}
    detalhes.forEach(item => {
      const pratoId = Number(item.pratos?.id)
      const pratoNome = item.pratos?.nome || 'Prato'
      const doses = Number(item.quantidade || 0)
      const chave = pratoNome.trim().toLowerCase()
      pratosComponentes.filter(pc => Number(pc.prato_id) === pratoId).forEach(pc => {
        tarefasFinalizacao.filter(t => Number(t.componente_id) === Number(pc.componente_id)).forEach(t => {
          const qtd = parseNum(pc.quantidade_final) * doses
          if (!pratosMap[chave]) pratosMap[chave] = { pratoNome, tarefas: [] }
          const idx = pratosMap[chave].tarefas.findIndex(x => x.tarefaId === t.id)
          if (idx >= 0) pratosMap[chave].tarefas[idx].quantidade += qtd
          else pratosMap[chave].tarefas.push({ tarefaId: t.id, tarefa: t.tarefa, observacoes: t.observacoes, ordem: Number(t.ordem), componenteNome: pc.componentes?.nome || 'Componente', quantidade: qtd, unidade: pc.unidade })
        })
      })
    })

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {Object.values(pratosMap).filter(p => p.tarefas.length > 0).sort((a, b) => a.pratoNome.localeCompare(b.pratoNome)).map(prato => (
          <div key={prato.pratoNome}>
            <p style={{ fontSize: '13px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px solid #e5e7eb' }}>{prato.pratoNome}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              {prato.tarefas.sort((a, b) => a.ordem - b.ordem).map(tarefa => {
                const chave = `finalizacao|${tarefa.tarefaId}`
                const reg = registos[chave] || { concluido: false }
                const feita = reg.concluido || false

                if (feita) {
                  return (
                    <PillConcluido
                      key={tarefa.tarefaId}
                      label={tarefa.tarefa}
                      onDesfazer={() => guardarRegisto('finalizacao', tarefa.tarefaId, { concluido: false })}
                    />
                  )
                }

                return (
                  <div key={tarefa.tarefaId} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 2px' }}>{tarefa.componenteNome}</p>
                      <p style={{ fontSize: '15px', fontWeight: '500', color: '#111', margin: '0 0 2px' }}>{tarefa.tarefa}</p>
                      <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>{fmtQtd(tarefa.quantidade, tarefa.unidade)}{tarefa.observacoes ? ` · ${tarefa.observacoes}` : ''}</p>
                    </div>
                    <button onClick={() => guardarRegisto('finalizacao', tarefa.tarefaId, { concluido: true })}
                      style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', background: '#80c944', color: '#fff', fontSize: '15px', fontWeight: '500', cursor: 'pointer' }}>
                      Feito ✓
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // ── Embalamento ──────────────────────────────────────────────
  function renderEmbalamento() {
    const gruposNome: Record<string, { pratoNome: string; categoria: string | null; prioridade: number | null; itens: DetalheProducao[] }> = {}
    detalhes.forEach(item => {
      const nome = item.pratos?.nome || 'Prato'
      const chave = nome.trim().toLowerCase()
      if (!gruposNome[chave]) gruposNome[chave] = { pratoNome: nome, categoria: item.pratos?.categoria_prato || null, prioridade: item.pratos?.prioridade_embalamento ?? null, itens: [] }
      gruposNome[chave].itens.push(item)
    })
    Object.values(gruposNome).forEach(g => {
      g.itens.sort((a, b) => ordemTamanho(a.pratos?.tamanho || '') - ordemTamanho(b.pratos?.tamanho || ''))
    })

    const porCategoria: Record<string, typeof gruposNome[string][]> = {}
    Object.values(gruposNome).forEach(grupo => {
      const cat = grupo.categoria || 'Outros'
      if (!porCategoria[cat]) porCategoria[cat] = []
      porCategoria[cat].push(grupo)
    })

    const categorias = ORDEM_CATEGORIAS.filter(c => porCategoria[c]).concat(Object.keys(porCategoria).filter(c => !ORDEM_CATEGORIAS.includes(c)).sort())
    const catAtiva = categoriaEmbalamento || categorias[0] || ''
    const gruposDaCat = (porCategoria[catAtiva] || []).sort((a, b) => (a.prioridade ?? 999) - (b.prioridade ?? 999) || a.pratoNome.localeCompare(b.pratoNome))

    const todosExtras: { pratoNome: string; categoria: string | null; itens: { tamanho: string; sku: string; quantidade: number }[]; etiquetasImpressas: boolean; chaveGrupo: string; referenciaId: number }[] = []
    Object.values(gruposNome).forEach(grupo => {
      // CORRIGIDO: usa sempre o menor id para garantir consistência entre dispositivos
      const referenciaId = Math.min(...grupo.itens.map(i => i.id))
      const chaveGrupo = `emb|${referenciaId}`
      const reg = registosEmbalamento[chaveGrupo]
      if (reg?.extras === true) {
        todosExtras.push({ pratoNome: grupo.pratoNome, categoria: grupo.categoria, itens: grupo.itens.map(i => ({ tamanho: i.pratos?.tamanho?.toUpperCase() || '-', sku: i.pratos?.sku || '-', quantidade: reg.extrasPorTamanho?.[i.id] ?? 0 })), etiquetasImpressas: reg.etiquetasImpressas || false, chaveGrupo, referenciaId })
      }
    })

    return (
      <div style={{ position: 'relative' }}>
        {todosExtras.length > 0 && (
          <button onClick={() => setMostrarPainelExtras(true)}
            style={{ position: 'fixed', right: '20px', bottom: '24px', zIndex: 50, background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '12px', padding: '14px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
            Extras ({todosExtras.length})
          </button>
        )}

        {mostrarPainelExtras && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end' }}
            onClick={e => { if (e.target === e.currentTarget) setMostrarPainelExtras(false) }}>
            <div style={{ background: '#fff', width: '100%', maxWidth: '420px', height: '100vh', overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: '18px', fontWeight: '600', color: '#111', margin: 0 }}>Extras registados</p>
                <button onClick={() => setMostrarPainelExtras(false)} style={{ background: '#f3f4f6', border: 'none', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', color: '#374151', cursor: 'pointer' }}>Fechar</button>
              </div>
              {todosExtras.map(item => {
                const cores = coresCategoria(item.categoria)
                return (
                  <div key={item.pratoNome} style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div>
                        <span style={{ fontSize: '10px', background: cores.bg, color: cores.texto, padding: '2px 8px', borderRadius: '99px', fontWeight: '500', display: 'inline-block', marginBottom: '4px' }}>{item.categoria || 'Outros'}</span>
                        <p style={{ fontSize: '16px', fontWeight: '500', color: '#111', margin: 0 }}>{item.pratoNome}</p>
                      </div>
                      <button onClick={() => guardarRegistoEmbalamento(item.chaveGrupo, item.referenciaId, { etiquetasImpressas: !item.etiquetasImpressas })}
                        style={{ background: item.etiquetasImpressas ? '#f0fdf4' : '#f3f4f6', border: `1px solid ${item.etiquetasImpressas ? '#86efac' : '#e5e7eb'}`, borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: '500', color: item.etiquetasImpressas ? '#16a34a' : '#374151', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        {item.etiquetasImpressas ? '✓ Etiquetas impressas' : 'Etiquetas impressas'}
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {item.itens.filter(i => i.quantidade > 0).map(i => (
                        <div key={i.sku} style={{ display: 'flex', justifyContent: 'space-between', background: '#f9fafb', borderRadius: '6px', padding: '6px 10px' }}>
                          <span style={{ fontSize: '13px', color: '#374151', fontWeight: '500' }}>{i.tamanho} · {i.sku}</span>
                          <span style={{ fontSize: '13px', color: '#111827', fontWeight: '600' }}>{i.quantidade} extras</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div style={{ position: 'sticky', top: '97px', zIndex: 9, background: '#f9fafb', paddingBottom: '10px', borderBottom: '1px solid #e5e7eb', marginBottom: '14px' }}>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
            {categorias.map(cat => {
              const cores = coresCategoria(cat)
              const ativa = cat === catAtiva
              return (
                <button key={cat} onClick={() => setCategoriaEmbalamento(cat)}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: `1px solid ${ativa ? cores.borda : '#e5e7eb'}`, background: ativa ? cores.bg : '#fff', color: ativa ? cores.texto : '#6b7280', fontSize: '14px', fontWeight: ativa ? '500' : '400', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {cat}
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {gruposDaCat.map(grupo => {
            // CORRIGIDO: usa sempre o menor id para garantir consistência entre dispositivos
            const referenciaId = Math.min(...grupo.itens.map(i => i.id))
            const chaveGrupo = `emb|${referenciaId}`
            const reg = registosEmbalamento[chaveGrupo] || { concluido: false, extras: null, extrasPorTamanho: {}, etiquetasImpressas: false }
            const feito = reg.concluido || false
            const extrasRespondido = reg.extras !== null && reg.extras !== undefined
            const temExtras = reg.extras === true
            const colapsado = feito && extrasRespondido
            const cores = coresCategoria(grupo.categoria)

            if (colapsado) {
              return (
                <PillConcluido
                  key={grupo.pratoNome}
                  label={`${grupo.pratoNome}${reg.extras === true ? ` · Extras: ${grupo.itens.map(i => `${i.pratos?.tamanho?.toUpperCase()} ${reg.extrasPorTamanho?.[i.id] ?? 0}`).join(' ')}` : ' · Sem extras'}`}
                  onDesfazer={() => guardarRegistoEmbalamento(chaveGrupo, referenciaId, { concluido: false })}
                />
              )
            }

            return (
              <div key={grupo.pratoNome} style={{ background: feito ? '#f0fdf4' : '#fff', border: `1px solid ${feito ? '#86efac' : '#e5e7eb'}`, borderRadius: '12px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <span style={{ fontSize: '10px', background: cores.bg, color: cores.texto, padding: '2px 8px', borderRadius: '99px', fontWeight: '500', display: 'inline-block', marginBottom: '4px' }}>{grupo.categoria || 'Outros'}</span>
                    <p style={{ fontSize: '17px', fontWeight: '500', color: feito ? '#9ca3af' : '#111', margin: 0 }}>{grupo.pratoNome}</p>
                  </div>
                  <button onClick={() => guardarRegistoEmbalamento(chaveGrupo, referenciaId, { concluido: !feito })}
                    style={{ background: feito ? '#e5e7eb' : '#80c944', color: feito ? '#374151' : '#fff', border: 'none', borderRadius: '10px', padding: '12px 22px', fontSize: '15px', fontWeight: '500', cursor: 'pointer', whiteSpace: 'nowrap', marginLeft: '12px' }}>
                    {feito ? 'Desfazer' : 'Feito ✓'}
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                  {grupo.itens.map(item => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafb', borderRadius: '8px', padding: '8px 12px' }}>
                      <span style={{ fontSize: '14px', color: '#374151', fontWeight: '500' }}>{item.pratos?.tamanho?.toUpperCase()} · {item.pratos?.sku}</span>
                      <span style={{ fontSize: '13px', color: '#6b7280' }}>{item.quantidade} doses</span>
                    </div>
                  ))}
                </div>

                <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '12px' }}>
                  <p style={{ fontSize: '14px', color: '#374151', marginBottom: '8px' }}>Deu extras?</p>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: temExtras ? '12px' : 0 }}>
                    <button onClick={() => guardarRegistoEmbalamento(chaveGrupo, referenciaId, { extras: temExtras ? null : true })}
                      style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `2px solid ${temExtras ? '#80c944' : '#e5e7eb'}`, background: temExtras ? '#f0fdf4' : '#fff', fontSize: '14px', fontWeight: '500', color: temExtras ? '#16a34a' : '#374151', cursor: 'pointer' }}>
                      Sim
                    </button>
                    <button onClick={() => guardarRegistoEmbalamento(chaveGrupo, referenciaId, { extras: reg.extras === false ? null : false, extrasPorTamanho: {} })}
                      style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `2px solid ${reg.extras === false ? '#d1d5db' : '#e5e7eb'}`, background: reg.extras === false ? '#f9fafb' : '#fff', fontSize: '14px', fontWeight: '500', color: '#374151', cursor: 'pointer' }}>
                      Não
                    </button>
                  </div>
                  {temExtras && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                      {grupo.itens.map(item => {
                        const tamLabel = item.pratos?.tamanho?.toUpperCase() || '-'
                        const qtdExtra = reg.extrasPorTamanho?.[item.id] ?? 0
                        return (
                          <div key={item.id}>
                            <label style={estiloLabel}>Extras {tamLabel} · {item.pratos?.sku}</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <input type="range" min="0" max="50" step="1" value={qtdExtra}
                                onChange={e => {
                                  const novosExtras = { ...(reg.extrasPorTamanho || {}), [item.id]: parseInt(e.target.value) }
                                  guardarRegistoEmbalamento(chaveGrupo, referenciaId, { extrasPorTamanho: novosExtras })
                                }}
                                style={{ flex: 1, accentColor: '#111827' }} />
                              <span style={estiloSliderValor}>{qtdExtra}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (aCarregar) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
      <p style={{ color: '#6b7280', fontSize: '16px' }}>A carregar...</p>
    </div>
  )

  if (!producaoAtiva) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', gap: '16px' }}>
      <p style={{ fontSize: '18px', color: '#111' }}>Nenhum plano ativo de momento.</p>
      <p style={{ fontSize: '14px', color: '#6b7280' }}>Pede ao gestor para ativar um plano de produção.</p>
      <button onClick={() => router.push('/')} style={{ background: '#e5e7eb', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', color: '#374151' }}>← Voltar</button>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <div style={{ backgroundColor: '#fff', borderBottom: '1px solid #e5e7eb', padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
        <div>
          <p style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 2px', color: '#111' }}>{producaoAtiva.nome_semana}</p>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>{nomeUtilizador}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={() => router.push('/')} style={{ background: '#f3f4f6', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '13px', color: '#374151', cursor: 'pointer' }}>← Início</button>
          <button onClick={handleLogout} style={{ background: 'transparent', border: 'none', fontSize: '13px', color: '#6b7280', cursor: 'pointer' }}>Sair</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', padding: '10px 16px', overflowX: 'auto', background: '#fff', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: '57px', zIndex: 10 }}>
        {secoesVisiveis.map(s => (
          <button key={s} onClick={() => setSecaoAtiva(s)}
            style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: secaoAtiva === s ? '#80c944' : '#f3f4f6', color: secaoAtiva === s ? '#fff' : '#374151', fontSize: '15px', fontWeight: '500', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {labelSecao[s]}
          </button>
        ))}
      </div>

      <div style={{ padding: '16px', maxWidth: '900px', margin: '0 auto' }}>
        {secaoAtiva === 'preparacao' && renderPreparacao()}
        {secaoAtiva === 'confeccao' && renderConfeccao()}
        {secaoAtiva === 'finalizacao' && renderFinalizacao()}
        {secaoAtiva === 'embalamento' && renderEmbalamento()}
      </div>
    </div>
  )
}
