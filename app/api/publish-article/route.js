import { supabase } from '../../../lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { articleId } = await request.json()

    // ดึงข้อมูลบทความจาก Supabase
    const { data: article, error } = await supabase
      .from('articles')
      .select('*')
      .eq('id', articleId)
      .single()

    if (error) throw error

    // เรียกใช้ Vercel Deploy Hook ของ website ปลายทาง
    const deployHookUrl = process.env.TARGET_SITE_DEPLOY_HOOK
    
    await fetch(deployHookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        article: article,
        trigger: 'article_published'
      })
    })

    return NextResponse.json({ 
      message: 'Article published successfully',
      articleId 
    })
  } catch (error) {
    console.error('Error publishing article:', error)
    return NextResponse.json({ message: 'Error publishing article' }, { status: 500 })
  }
} 