import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const tiktokToken = Deno.env.get('TIKTOK_ACCESS_TOKEN')
    if (!tiktokToken) throw new Error('TIKTOK_ACCESS_TOKEN не настроен')

    const authHeader = req.headers.get('Authorization') || ''
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } })

    const admin = createClient(supabaseUrl, serviceKey)
    const fields = 'id,title,video_description,create_time,share_url,embed_link,width,height,duration'
    let cursor: number | undefined = undefined
    let hasMore = true
    const all: any[] = []

    while (hasMore) {
      const body: Record<string, unknown> = { max_count: 20 }
      if (cursor) body.cursor = cursor
      const r = await fetch(`https://open.tiktokapis.com/v2/video/list/?fields=${encodeURIComponent(fields)}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tiktokToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
      const json = await r.json()
      if (!r.ok || json?.error?.code && json.error.code !== 'ok') {
        throw new Error(json?.error?.message || `TikTok API ${r.status}`)
      }
      const videos = json?.data?.videos || []
      all.push(...videos)
      hasMore = Boolean(json?.data?.has_more)
      cursor = json?.data?.cursor
      if (!cursor || all.length > 5000) hasMore = false
    }

    const { data: existing } = await admin.from('visuals').select('url').eq('platform', 'tiktok')
    const seen = new Set((existing || []).map((x: any) => x.url))
    const rows = all
      .map((v: any, i: number) => ({
        platform: 'tiktok',
        url: v.share_url || (v.id ? `https://www.tiktok.com/player/v1/${v.id}` : ''),
        title: v.title || v.video_description || 'TikTok',
        preview_url: null,
        sort_order: i,
        published: true,
      }))
      .filter((v: any) => v.url && !seen.has(v.url))

    if (rows.length) {
      const { error } = await admin.from('visuals').insert(rows)
      if (error) throw error
    }

    return new Response(JSON.stringify({ ok: true, found: all.length, added: rows.length, skipped: all.length - rows.length }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
