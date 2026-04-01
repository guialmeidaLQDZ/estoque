import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

const ALLOWED_DOMAIN = 'liquidz.com.br'

async function isAdmin(email) {
  const GAS_URL = process.env.GAS_WEB_APP_URL
  if (!GAS_URL) return false
  try {
    const res = await fetch(`${GAS_URL}?action=checkAdmin&email=${encodeURIComponent(email)}`)
    const data = await res.json()
    return data.success && data.data?.isAdmin === true
  } catch {
    return false
  }
}

export default NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      return user.email?.endsWith(`@${ALLOWED_DOMAIN}`) ?? false
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = (await isAdmin(user.email)) ? 'admin' : 'user'
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role
      }
      return session
    },
  },
  pages: {
    error: '/acesso-negado',
  },
  secret: process.env.NEXTAUTH_SECRET,
})
