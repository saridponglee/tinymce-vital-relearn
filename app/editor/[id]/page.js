'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

export default function ArticleEditor({ params }) {
  const router = useRouter()
  const { id } = params
  const isNewArticle = id === 'new'

  const [article, setArticle] = useState({
    title: '',
    content: '',
    slug: '',
    status: 'draft',
    featured_image: '',
    meta_description: '',
    tags: []
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // โหลดข้อมูลบทความถ้าไม่ใช่บทความใหม่
  useEffect(() => {
    if (!isNewArticle && id) {
      loadArticle(id)
    }
  }, [id, isNewArticle])

  const loadArticle = async (articleId) => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('id', articleId)
        .single()

      if (error) throw error
      setArticle(data)
    } catch (error) {
      console.error('Error loading article:', error)
      alert('เกิดข้อผิดพลาดในการโหลดบทความ')
    } finally {
      setLoading(false)
    }
  }

  // ฟังก์ชันสำหรับบันทึกบทความ
  const saveArticle = async (isDraft = true) => {
    setSaving(true)
    try {
      const articleData = {
        ...article,
        status: isDraft ? 'draft' : 'published',
        updated_at: new Date().toISOString()
      }

      if (!isDraft) {
        articleData.published_at = new Date().toISOString()
      }

      let result
      if (isNewArticle) {
        // สร้างบทความใหม่
        const { data: userData } = await supabase.auth.getUser()
        articleData.author_id = userData.user?.id

        result = await supabase
          .from('articles')
          .insert([articleData])
          .select()
          .single()
      } else {
        // อัปเดตบทความเดิม
        result = await supabase
          .from('articles')
          .update(articleData)
          .eq('id', id)
          .select()
          .single()
      }

      if (result.error) throw result.error

      setArticle(result.data)
      
      if (!isDraft) {
        // เรียกใช้ webhook สำหรับเผยแพร่บทความ
        await triggerPublishWebhook(result.data.id)
      }

      alert(isDraft ? 'บันทึกร่างสำเร็จ' : 'เผยแพร่บทความสำเร็จ')

      if (isNewArticle) {
        router.push(`/editor/${result.data.id}`)
      }
    } catch (error) {
      console.error('Error saving article:', error)
      alert('เกิดข้อผิดพลาดในการบันทึก')
    } finally {
      setSaving(false)
    }
  }

  // ฟังก์ชันสำหรับเรียก publish webhook
  const triggerPublishWebhook = async (articleId) => {
    try {
      await fetch('/api/publish-article', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ articleId }),
      })
    } catch (error) {
      console.error('Error triggering publish webhook:', error)
    }
  }

  // สร้าง slug อัตโนมัติจากชื่อบทความ
  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-')
  }

  if (loading) return <div>กำลังโหลด...</div>

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">
        {isNewArticle ? 'สร้างบทความใหม่' : 'แก้ไขบทความ'}
      </h1>

      <div className="space-y-6">
        {/* ชื่อบทความ */}
        <div>
          <label className="block text-sm font-medium mb-2">ชื่อบทความ</label>
          <input
            type="text"
            value={article.title}
            onChange={(e) => {
              const title = e.target.value
              setArticle({
                ...article,
                title,
                slug: generateSlug(title)
              })
            }}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="ใส่ชื่อบทความ"
          />
        </div>

        {/* Slug */}
        <div>
          <label className="block text-sm font-medium mb-2">Slug (URL)</label>
          <input
            type="text"
            value={article.slug}
            onChange={(e) => setArticle({...article, slug: e.target.value})}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="url-slug"
          />
        </div>

        {/* Meta Description */}
        <div>
          <label className="block text-sm font-medium mb-2">Meta Description</label>
          <textarea
            value={article.meta_description}
            onChange={(e) => setArticle({...article, meta_description: e.target.value})}
            className="w-full px-3 py-2 border rounded-md"
            rows="3"
            placeholder="คำอธิบายสำหรับ SEO"
          />
        </div>

        {/* Content Editor */}
        <div>
          <label className="block text-sm font-medium mb-2">เนื้อหาบทความ</label>
          <textarea
            value={article.content}
            onChange={(e) => setArticle({...article, content: e.target.value})}
            className="w-full px-3 py-2 border rounded-md"
            rows="15"
            placeholder="เนื้อหาบทความ"
          />
        </div>

        {/* ปุ่มบันทึกและเผยแพร่ */}
        <div className="flex gap-4">
          <button
            onClick={() => saveArticle(true)}
            disabled={saving}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:opacity-50"
          >
            {saving ? 'กำลังบันทึก...' : 'บันทึกร่าง'}
          </button>
          <button
            onClick={() => saveArticle(false)}
            disabled={saving}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            {saving ? 'กำลังเผยแพร่...' : 'เผยแพร่บทความ'}
          </button>
        </div>
      </div>
    </div>
  )
} 