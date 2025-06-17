import { supabase } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { articleId, title, slug, status, published_at, trigger } = req.body

    console.log('Received webhook:', { articleId, title, slug, status, trigger })

    // ตรวจสอบว่าเป็นการเผยแพร่บทความ
    if (status === 'published') {
      
      // 1. เรียกใช้ Deploy Hook ของ Target Website
      const deployHookUrl = process.env.TARGET_SITE_DEPLOY_HOOK
      if (deployHookUrl) {
        try {
          console.log('Calling deploy hook:', deployHookUrl)
          
          const deployResponse = await fetch(deployHookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              articleId,
              slug,
              trigger: 'webhook_published'
            })
          })

          console.log('Deploy hook response:', deployResponse.status)
        } catch (error) {
          console.error('Error calling deploy hook:', error)
        }
      }

      // 2. เรียกใช้ Revalidation API ของ Target Website
      const revalidationUrl = process.env.TARGET_SITE_REVALIDATION_URL
      const revalidationSecret = process.env.REVALIDATION_SECRET

      if (revalidationUrl && revalidationSecret) {
        try {
          console.log('Calling revalidation API:', revalidationUrl)
          
          const revalidationResponse = await fetch(`${revalidationUrl}?secret=${revalidationSecret}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              slug: slug,
              action: 'published',
              articleId: articleId
            })
          })

          console.log('Revalidation response:', revalidationResponse.status)
        } catch (error) {
          console.error('Error calling revalidation:', error)
        }
      }

      // 3. สามารถเพิ่มการแจ้งเตือนอื่น ๆ ได้ที่นี่
      // เช่น ส่งอีเมล, โพส์ท social media, แจ้งเตือน Slack, etc.

    }

    res.status(200).json({ 
      message: 'Webhook processed successfully',
      articleId,
      slug,
      status 
    })

  } catch (error) {
    console.error('Webhook error:', error)
    res.status(500).json({ 
      message: 'Webhook processing failed',
      error: error.message 
    })
  }
}