import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

export async function POST(request) {
  try {
    // ตรวจสอบ secret token
    const url = new URL(request.url)
    const secret = url.searchParams.get('secret')
    
    if (secret !== process.env.REVALIDATION_SECRET) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const { slug, action, articleId } = body

    console.log('Revalidation request:', { slug, action, articleId })

    if (action === 'published' || action === 'updated') {
      // Revalidate หน้าที่เกี่ยวข้อง
      const pagesToRevalidate = ['/articles']
      
      if (slug) {
        pagesToRevalidate.push(`/articles/${slug}`)
      }

      // Revalidate หน้าแรกด้วย
      pagesToRevalidate.push('/')

      // Revalidate ทุกหน้า
      for (const path of pagesToRevalidate) {
        revalidatePath(path)
        console.log(`Revalidated: ${path}`)
      }
      
      console.log(`All pages revalidated for article: ${slug}`)
    }

    return NextResponse.json({ 
      revalidated: true, 
      message: 'Revalidation successful',
      pages: pagesToRevalidate
    })
    
  } catch (err) {
    console.error('Error during revalidation:', err)
    return NextResponse.json({ 
      message: 'Error revalidating',
      error: err.message 
    }, { status: 500 })
  }
} 