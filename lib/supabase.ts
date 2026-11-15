import { createBrowserClient } from '@supabase/ssr'

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Busca todas as linhas em páginas de 1000 para ultrapassar o limite por defeito do Supabase.
// Sem isto, consultas sem .range() devolvem no máximo 1000 linhas e os registos
// ordenados depois da 1000.ª linha ficam de fora (ex.: pratos no fim do alfabeto).
export async function fetchAllPaginado<T = any>(
  table: string,
  columns: string,
  applyQuery: (q: any) => any = (q) => q
): Promise<T[]> {
  const pageSize = 1000
  let from = 0
  let todos: T[] = []
  while (true) {
    const { data, error } = await applyQuery(supabase.from(table).select(columns)).range(
      from,
      from + pageSize - 1
    )
    if (error) throw error
    if (!data || data.length === 0) break
    todos = todos.concat(data as T[])
    if (data.length < pageSize) break
    from += pageSize
  }
  return todos
}