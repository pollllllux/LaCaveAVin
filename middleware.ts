import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Pages publiques (accessibles sans authentification)
  const publicPages = ['/login', '/auth/callback']
  const isPublicPage = publicPages.includes(pathname)

  // Vérifier l'authentification via Supabase
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Récupérer la session
  const { data: { user } } = await supabase.auth.getUser()

  // Redirection logic
  if (!user && !isPublicPage) {
    // Pas loggué + page protégée → login
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && pathname === '/login') {
    // Loggué + page login → home
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Matcher toutes les routes sauf les fichiers statiques et API
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
