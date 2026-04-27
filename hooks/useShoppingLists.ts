'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export type ShoppingList = {
  id: string
  user_id: string
  name: string
  date: string | null
  status: 'active' | 'completed' | 'archived'
  total_estimated: number | null
  notes: string | null
  created_at: string
}

export type ShoppingItem = {
  id: string
  user_id: string
  shopping_list_id: string
  name: string
  quantity: number | null
  unit: string | null
  category: string | null
  price_estimated: number | null
  is_checked: boolean
  barcode: string | null
  product_id: string | null
  created_at: string
}

export type NewShoppingItem = {
  name: string
  quantity?: number
  unit?: string
  category?: string
  price_estimated?: number
  barcode?: string
  product_id?: string
}

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export function useShoppingLists() {
  const [lists, setLists]   = useState<ShoppingList[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLists = useCallback(async () => {
    setLoading(true)
    const supabase = getSupabase()
    const { data } = await supabase
      .from('shopping_lists')
      .select('*')
      .neq('status', 'archived')
      .order('created_at', { ascending: false })
    setLists(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchLists() }, [fetchLists])

  async function createList(name: string): Promise<ShoppingList | null> {
    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data } = await supabase
      .from('shopping_lists')
      .insert({ name, user_id: user.id, status: 'active' })
      .select()
      .single()
    if (data) setLists(prev => [data, ...prev])
    return data
  }

  async function completeList(id: string) {
    const supabase = getSupabase()
    await supabase.from('shopping_lists').update({ status: 'completed' }).eq('id', id)
    setLists(prev => prev.filter(l => l.id !== id))
  }

  async function deleteList(id: string) {
    const supabase = getSupabase()
    await supabase.from('shopping_lists').delete().eq('id', id)
    setLists(prev => prev.filter(l => l.id !== id))
  }

  return { lists, loading, createList, completeList, deleteList, refetch: fetchLists }
}

export function useShoppingItems(listId: string | null) {
  const [items, setItems]     = useState<ShoppingItem[]>([])
  const [loading, setLoading] = useState(false)

  const fetchItems = useCallback(async () => {
    if (!listId) { setItems([]); return }
    setLoading(true)
    const supabase = getSupabase()
    const { data } = await supabase
      .from('shopping_items')
      .select('*')
      .eq('shopping_list_id', listId)
      .order('category', { ascending: true })
      .order('name', { ascending: true })
    setItems(data ?? [])
    setLoading(false)
  }, [listId])

  useEffect(() => { fetchItems() }, [fetchItems])

  async function addItem(item: NewShoppingItem): Promise<ShoppingItem | null> {
    if (!listId) return null
    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data } = await supabase
      .from('shopping_items')
      .insert({ ...item, shopping_list_id: listId, user_id: user.id, is_checked: false })
      .select()
      .single()
    if (data) setItems(prev => [...prev, data])
    return data
  }

  async function toggleItem(id: string, checked: boolean) {
    const supabase = getSupabase()
    await supabase.from('shopping_items').update({ is_checked: checked }).eq('id', id)
    setItems(prev => prev.map(i => i.id === id ? { ...i, is_checked: checked } : i))
  }

  async function removeItem(id: string) {
    const supabase = getSupabase()
    await supabase.from('shopping_items').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const checkedCount = items.filter(i => i.is_checked).length
  const totalEstimated = items.reduce((s, i) => s + ((i.price_estimated ?? 0) * (i.quantity ?? 1)), 0)

  // Group by category
  const byCategory = items.reduce<Record<string, ShoppingItem[]>>((acc, item) => {
    const cat = item.category ?? 'Autres'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  return { items, loading, addItem, toggleItem, removeItem, checkedCount, totalEstimated, byCategory }
}
