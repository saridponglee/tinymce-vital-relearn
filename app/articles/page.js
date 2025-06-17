import Link from 'next/link'
import { supabase } from '../../lib/supabase'

async function getAllArticles() {
  try {
    const { data: articles, error } = await supabase
      .from('articles')
      .select('id, title, slug, meta_description, featured_image, published_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false })

    if (error) {
      console.error('Error fetching articles:', error)
      return []
    }

    return articles || []
  } catch (error) {
    console.error('Error in getAllArticles:', error)
    return []
  }
}

export default async function ArticlesPage() {
  const articles = await getAllArticles()

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="text-2xl font-bold text-gray-900">
              My Blog
            </Link>
            <Link 
              href="/"
              className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              หน้าแรก
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            บทความทั้งหมด
          </h1>
          <p className="text-xl text-gray-600">
            รวมบทความน่าสนใจที่อัปเดตต่อเนื่อง
          </p>
        </div>
        
        {articles.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">ยังไม่มีบทความ</p>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <article key={article.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                {article.featured_image && (
                  <div className="aspect-w-16 aspect-h-9">
                    <img 
                      src={article.featured_image} 
                      alt={article.title}
                      className="w-full h-48 object-cover"
                    />
                  </div>
                )}
                
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">
                    <Link 
                      href={`/articles/${article.slug}`}
                      className="hover:text-blue-600 transition-colors"
                    >
                      {article.title}
                    </Link>
                  </h2>
                  
                  {article.meta_description && (
                    <p className="text-gray-600 mb-4">
                      {article.meta_description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <time dateTime={article.published_at}>
                      {new Date(article.published_at).toLocaleDateString('th-TH')}
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
        )}
      </div>
    </div>
  )
}

export const metadata = {
  title: 'บทความทั้งหมด - My Blog',
  description: 'รายการบทความทั้งหมดในเว็บไซต์',
} 