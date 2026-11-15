'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

const PRINTER_URL = 'https://impressora.f4fmeals.com/print'

// Logo da empresa (igual ao usado nas etiquetas da cozinha)
const LOGO_ZPL =
  '^FO320,500^GFA,1770,1770,15,,:::::::::::::::::gG03JF,I07LF8I01FFC0MF8,I0MFCI03FFC1MF8,I0MFCI03FFE1MF8,I0MFCI07FFC1MF8,:I0MFCI0IFC1MF8,:I0MFCI0IFE1MF8,I0MFC001IFE1MF8,:I0MF8003IFE1MF8,I0IFM03IFE1IF,I0IFM03IFE1FFE,I0IFM07IFE1FFE,I0IFM07IFE1IF,I0IFM0JFE1IF,:I0IFL01JFE1IF,I07FFL01JFE1IF,I0IFL01JFE1IF,I0IFL03JFE1IF,:I0IFL07JFE1IF,I07FFL07FEFFE1IF,I07FFL0FFCFFE1IF,:I07FFL0FF8FFE1IF,I07FFK01FF8FFE1IF,:I07FFK03FF0FFE1IF,:I07FFK03FE0FFE1IF,I07FFK07FE0FFE1IF,:I07FFK0FFC0FFE1IF,:I07FFJ01FF80FFE1IF,::I07FFJ03FF00FFE1IF,:I07FFJ07FE00FFE1IF,::I07FFJ0FFC00FFE1IF,:I07FFI01FFC00FFE1KF8,I07JFC1TFC,:::::::::I07FFN01FFE1KF,I07FFO0FFE0IF,I07FFO0FFE1IF,:::::::I07FFO0FFE0IF,I07FFO0FFE1IF,I07FFO0FFC0FFE,,:::V07OF8,I07gHFC,::::I07IFC2,,:::::::::::::::::^FS'

type IngredienteAberto = {
  id: number
  nome: string
  validade_apos_abertura_dias: number | null
}

function dataFormatada(d: Date) {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

function calcularDatas(dias: number) {
  const abertura = new Date()
  const validade = new Date()
  validade.setDate(validade.getDate() + dias)
  return { abertura: dataFormatada(abertura), validade: dataFormatada(validade) }
}

function gerarZPLProdutoAberto(nome: string, dataAbertura: string, dataValidade: string) {
  const esc = (s: string) => (s || '').replace(/[\^~\\]/g, '')
  return `^XA
^CI28
^LH0,0
^CF0,34
^FO20,55^FB408,4,8,L^FD${esc(nome)}^FS
^FO20,300^GB408,2,2^FS
^CF0,28
^FO20,320^FDAberto: ${esc(dataAbertura)}^FS
^CF0,38
^FO20,375^FDValidade: ${esc(dataValidade)}^FS
${LOGO_ZPL}
^XZ`
}

async function enviarZPL(zpl: string) {
  const resposta = await fetch(PRINTER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ zpl }),
  })
  if (!resposta.ok) throw new Error('Erro ao enviar etiqueta')
}

const estiloLabel: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  color: '#6b7280',
  marginBottom: '6px',
  fontWeight: 500,
}

function CartaoIngrediente({
  ingrediente,
  onDefinido,
}: {
  ingrediente: IngredienteAberto
  onDefinido: (id: number, dias: number) => void
}) {
  const [copias, setCopias] = useState('1')
  const [diasManual, setDiasManual] = useState('')
  const [aProcessar, setAProcessar] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  const definido = ingrediente.validade_apos_abertura_dias != null
  const diasManualNum = Number(diasManual)
  const diasManualValido =
    diasManual.trim() !== '' && Number.isInteger(diasManualNum) && diasManualNum > 0
  const dias = definido ? (ingrediente.validade_apos_abertura_dias as number) : diasManualNum
  const diasValido = definido || diasManualValido

  const copiasNum = Math.max(1, Math.min(30, Math.floor(Number(copias) || 1)))
  const datas = diasValido ? calcularDatas(dias) : null

  async function imprimir() {
    setErro('')
    setSucesso('')
    if (!diasValido) {
      setErro('Indica um número de dias de validade válido.')
      return
    }
    setAProcessar(true)
    try {
      // Primeira vez que se define a validade: fica guardada no ingrediente
      if (!definido) {
        const { error } = await supabase
          .from('ingredientes')
          .update({ validade_apos_abertura_dias: diasManualNum })
          .eq('id', ingrediente.id)
        if (error) throw error
      }
      const d = calcularDatas(dias)
      const zpl = gerarZPLProdutoAberto(ingrediente.nome, d.abertura, d.validade)
      for (let i = 0; i < copiasNum; i++) {
        await enviarZPL(zpl)
      }
      if (!definido) onDefinido(ingrediente.id, diasManualNum)
      setSucesso(`Etiqueta enviada (${copiasNum}x).`)
    } catch {
      setErro('Não consegui imprimir.\nVerifica: PC ligado • servidor ativo • tablet na mesma rede.')
    } finally {
      setAProcessar(false)
    }
  }

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <p style={{ fontSize: '17px', fontWeight: 500, color: '#111', margin: 0 }}>{ingrediente.nome}</p>

      {definido ? (
        <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
          Validade após abertura: <strong>{ingrediente.validade_apos_abertura_dias} dias</strong>{' '}
          <span style={{ color: '#9ca3af' }}>(alterável apenas em Ingredientes)</span>
        </p>
      ) : (
        <div
          style={{
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '8px',
            padding: '10px 12px',
          }}
        >
          <p style={{ fontSize: '13px', color: '#92400e', margin: '0 0 8px' }}>
            ⚠ Este ingrediente ainda não tem validade após abertura definida. Escreve os dias — fica
            guardado e passa a só poder ser alterado em Ingredientes.
          </p>
          <label style={estiloLabel}>Validade após abertura (dias)</label>
          <input
            type="number"
            min="1"
            step="1"
            value={diasManual}
            onChange={(e) => setDiasManual(e.target.value)}
            placeholder="Ex: 5"
            style={{
              width: '120px',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              fontSize: '15px',
              background: '#fff',
              color: '#111827',
            }}
          />
        </div>
      )}

      {datas && (
        <div
          style={{
            display: 'flex',
            gap: '24px',
            fontSize: '14px',
            color: '#374151',
            background: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '10px 12px',
          }}
        >
          <span>
            Aberto: <strong>{datas.abertura}</strong>
          </span>
          <span>
            Validade: <strong style={{ color: '#16a34a' }}>{datas.validade}</strong>
          </span>
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <label style={estiloLabel}>Cópias</label>
          <input
            type="number"
            min="1"
            max="30"
            step="1"
            value={copias}
            onChange={(e) => setCopias(e.target.value)}
            style={{
              width: '80px',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              fontSize: '15px',
              background: '#fff',
              color: '#111827',
            }}
          />
        </div>

        <button
          onClick={imprimir}
          disabled={!diasValido || aProcessar}
          style={{
            flex: 1,
            minWidth: '180px',
            padding: '12px',
            borderRadius: '8px',
            border: 'none',
            background: !diasValido || aProcessar ? '#e5e7eb' : '#80c944',
            color: !diasValido || aProcessar ? '#9ca3af' : '#fff',
            fontSize: '15px',
            fontWeight: 500,
            cursor: !diasValido || aProcessar ? 'not-allowed' : 'pointer',
          }}
        >
          {aProcessar
            ? 'A processar...'
            : !diasValido
              ? 'Indica os dias de validade'
              : definido
                ? '🖨 Imprimir etiqueta'
                : '🖨 Guardar e imprimir'}
        </button>
      </div>

      {erro && (
        <p style={{ fontSize: '13px', color: '#dc2626', margin: 0, whiteSpace: 'pre-line' }}>{erro}</p>
      )}
      {sucesso && <p style={{ fontSize: '13px', color: '#16a34a', margin: 0 }}>{sucesso}</p>}
    </div>
  )
}

export default function ProdutosAbertosPage() {
  const router = useRouter()
  const [autorizado, setAutorizado] = useState(false)
  const [pesquisa, setPesquisa] = useState('')
  const [resultados, setResultados] = useState<IngredienteAberto[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function verificarAcesso() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      const { data: perfil } = await supabase
        .from('perfis')
        .select('role')
        .eq('id', user.id)
        .single()
      if (!perfil || !['gestor', 'cozinha'].includes(perfil.role)) {
        router.push('/')
        return
      }
      setAutorizado(true)
    }
    verificarAcesso()
  }, [router])

  useEffect(() => {
    const texto = pesquisa.trim()
    if (texto.length < 2) {
      setResultados([])
      setLoading(false)
      return
    }
    const timer = setTimeout(() => pesquisarIngredientes(texto), 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pesquisa])

  async function pesquisarIngredientes(termo: string) {
    setLoading(true)
    const { data, error } = await supabase
      .from('ingredientes')
      .select('id, nome, validade_apos_abertura_dias')
      .ilike('nome', `%${termo}%`)
      .order('nome', { ascending: true })
      .limit(30)
    if (error) {
      setResultados([])
    } else {
      setResultados((data as IngredienteAberto[]) || [])
    }
    setLoading(false)
  }

  function marcarDefinido(id: number, dias: number) {
    setResultados((prev) =>
      prev.map((r) => (r.id === id ? { ...r, validade_apos_abertura_dias: dias } : r))
    )
  }

  if (!autorizado) {
    return (
      <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
        A verificar acesso...
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <div
        style={{
          background: '#fff',
          borderBottom: '1px solid #e5e7eb',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 600, color: '#111', margin: 0 }}>🏷️ Produtos Abertos</h1>
          <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0' }}>
            Etiquetas de validade para produtos abertos
          </p>
        </div>
        <button
          onClick={() => router.push('/')}
          style={{ background: '#f3f4f6', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '13px', color: '#374151', cursor: 'pointer' }}
        >
          ← Início
        </button>
      </div>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '24px' }}>
        <input
          type="text"
          placeholder="Pesquisar ingrediente por nome..."
          value={pesquisa}
          onChange={(e) => setPesquisa(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 14px',
            borderRadius: '10px',
            border: '1px solid #d1d5db',
            fontSize: '15px',
            background: '#fff',
            color: '#111827',
            boxSizing: 'border-box',
            marginBottom: '20px',
          }}
        />

        {loading ? (
          <p style={{ color: '#6b7280', fontSize: '14px' }}>A pesquisar...</p>
        ) : pesquisa.trim().length < 2 ? (
          <p style={{ color: '#9ca3af', fontSize: '14px' }}>Escreve pelo menos 2 letras para pesquisar.</p>
        ) : resultados.length === 0 ? (
          <p style={{ color: '#9ca3af', fontSize: '14px' }}>Nenhum ingrediente encontrado.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {resultados.map((ing) => (
              <CartaoIngrediente key={ing.id} ingrediente={ing} onDefinido={marcarDefinido} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
