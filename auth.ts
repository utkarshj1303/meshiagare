import NextAuth, { type DefaultSession } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { kv } from '@vercel/kv'

declare module 'next-auth' {
  interface Session {
    user: {
      /** The user's id. */
      id: string
    } & DefaultSession['user']
  }
}

export const {
  handlers: { GET, POST },
  auth
} = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async jwt({ token, profile }) {
      if (profile) {

        token.id = profile.email // Google uses 'sub' as the user's unique identifier
        token.image = profile.picture

        const existingUser = await kv.get(`user:${profile.email}`)

        if (!existingUser) {
          await kv.set(`user:${profile.email}`, {
            id: profile.email,
            name: profile.name,
            image: token.image,
            isFirstLogin: true
          })
        } else {
          existingUser.image = token.image;
          await kv.set(`user:${profile.email}`, existingUser);
        }
      }
      return token
    },
    session: ({ session, token }) => {
      if (session?.user && token?.id) {
        session.user.id = String(token.id)
      }
      return session
    },
    authorized({ auth }) {
      return !!auth?.user
    }
  },
  pages: {
    signIn: '/sign-in'
  }
})

// import NextAuth, { type DefaultSession } from 'next-auth'
// import GitHub from 'next-auth/providers/github'
// import { kv } from '@vercel/kv'

// declare module 'next-auth' {
//   interface Session {
//     user: {
//       /** The user's id. */
//       id: string
//     } & DefaultSession['user']
//   }
// }

// export const {
//   handlers: { GET, POST },
//   auth
// } = NextAuth({
//   providers: [GitHub],
//   callbacks: {
//     async jwt({ token, profile }) {
//       if (profile) {
//         token.id = profile.email
//         token.image = profile.avatar_url || profile.picture

//         const existingUser = await kv.get(`user:${profile.email}`)

//         if (!existingUser) {
//           await kv.set(`user:${profile.email}`, {
//             id: profile.email,
//             name: profile.name,
//             image: token.image,
//           })
//         }
//       }
//       return token
//     },
//     session: ({ session, token }) => {
//       if (session?.user && token?.id) {
//         session.user.id = String(token.id)
//       }
//       return session
//     },
//     authorized({ auth }) {
//       return !!auth?.user // this ensures there is a logged in user for -every- request
//     }
//   },
//   pages: {
//     signIn: '/sign-in' // overrides the next-auth default signin page https://authjs.dev/guides/basics/pages
//   }
// })
