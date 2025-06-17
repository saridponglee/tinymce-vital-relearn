import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

async function getArticle(slug) {
  try {
    const { data: article, error } = await supabase
      .from('articles')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .single()

    if (error || !article) {
      return null
    }

    return article
  } catch (error) {
    console.error('Error fetching article:', error)
    return null
  }
}

export default async function ArticlePage({ params }) {
  const article = await getArticle(params.slug)

  if (!article) {
    notFound()
  }

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="text-2xl font-bold text-gray-900">
              My Blog
            </Link>
            <div className="flex space-x-4">
              <Link 
                href="/articles"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                บทความทั้งหมด
              </Link>
              <Link 
                href="/"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                หน้าแรก
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <article className="bg-white rounded-lg shadow-sm p-8">
          <header className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              {article.title}
            </h1>
            
            <div className="flex items-center text-gray-600 text-sm mb-6">
              <time dateTime={article.published_at}>
                เผยแพร่เมื่อ: {new Date(article.published_at).toLocaleDateString('th-TH', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </time>
            </div>

            {article.featured_image && (
              <div className="mb-8">
                <img 
                  src={article.featured_image} 
                  alt={article.title}
                  className="w-full h-64 object-cover rounded-lg shadow-sm"
                />
              </div>
            )}
          </header>
          
          <div 
            className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-blue-600 hover:prose-a:text-blue-800"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />

          <footer className="mt-12 pt-8 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                อัปเดตล่าสุด: {new Date(article.updated_at).toLocaleDateString('th-TH')}
              </div>
              <Link
                href="/articles"
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                ← กลับไปดูบทความอื่น
              </Link>
            </div>
          </footer>
        </article>
      </div>
    </div>
  )
}

// Generate metadata for SEO
export async function generateMetadata({ params }) {
  const article = await getArticle(params.slug)

  if (!article) {
    return {
      title: 'ไม่พบบทความ',
    }
  }

  return {
    title: article.title,
    description: article.meta_description,
    openGraph: {
      title: article.title,
      description: article.meta_description,
      images: article.featured_image ? [article.featured_image] : [],
    },
  }
}

// Generate static params for static generation
export async function generateStaticParams() {
  try {
    const { data: articles } = await supabase
      .from('articles')
      .select('slug')
      .eq('status', 'published')

    return articles?.map((article) => ({
      slug: article.slug,
    })) || []
  } catch (error) {
    console.error('Error generating static params:', error)
    return []
  }
} 