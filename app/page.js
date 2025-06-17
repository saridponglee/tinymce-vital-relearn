import Link from 'next/link'
import { supabase } from '../lib/supabase'

// Server Component - fetch data directly
async function getLatestArticles() {
  try {
    const { data: articles, error } = await supabase
      .from('articles')
      .select('id, title, slug, meta_description, featured_image, published_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(6)

    if (error) {
      console.error('Error fetching articles:', error)
      return []
    }

    return articles || []
  } catch (error) {
    console.error('Error in getLatestArticles:', error)
    return []
  }
}

export default async function HomePage() {
  const latestArticles = await getLatestArticles()

  return (
    <div className="min-h-screen">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold text-gray-900">
                My Blog
              </Link>
            </div>
            <div className="flex space-x-4">
              <Link 
                href="/articles"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                บทความทั้งหมด
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            ยินดีต้อนรับสู่ My Blog
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            แหล่งรวมความรู้ เทคนิค และประสบการณ์ที่น่าสนใจ
            อัปเดตเนื้อหาใหม่ ๆ อย่างต่อเนื่อง
          </p>
          <Link
            href="/articles"
            className="inline-block px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            เริ่มอ่านบทความ
          </Link>
        </div>
      </div>

      {/* Latest Articles Section */}
      <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            บทความล่าสุด
          </h2>
          <p className="text-lg text-gray-600">
            บทความใหม่ที่อัปเดตล่าสุด
          </p>
        </div>

        {latestArticles.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white rounded-lg shadow-sm p-12">
              <p className="text-gray-500 text-lg mb-4">ยังไม่มีบทความ</p>
              <p className="text-gray-400">บทความจะปรากฏที่นี่เมื่อมีการเผยแพร่จากระบบ Editor</p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {latestArticles.map((article) => (
                <article key={article.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200">
                  {article.featured_image && (
                    <div className="aspect-w-16 aspect-h-9 bg-gray-200">
                      <img 
                        src={article.featured_image} 
                        alt={article.title}
                        className="w-full h-48 object-cover"
                      />
                    </div>
                  )}
                  
                  <div className="p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">
                      <Link 
                        href={`/articles/${article.slug}`}
                        className="hover:text-blue-600 transition-colors duration-200"
                      >
                        {article.title}
                      </Link>
                    </h3>
                    
                    {article.meta_description && (
                      <p className="text-gray-600 mb-4">
                        {article.meta_description}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <time dateTime={article.published_at}>
                        {new Date(article.published_at).toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </time>
                      <Link 
                        href={`/articles/${article.slug}`}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        อ่านต่อ →
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="text-center mt-12">
              <Link
                href="/articles"
                className="inline-block px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors duration-200"
              >
                ดูบทความทั้งหมด
              </Link>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="text-center text-gray-500">
            <p>&copy; 2025 My Blog. สร้างด้วย Next.js และ Supabase</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

// Metadata สำหรับ SEO
export const metadata = {
  title: 'My Blog - หน้าแรก',
  description: 'บล็อกสำหรับแชร์ความรู้และประสบการณ์',
} 