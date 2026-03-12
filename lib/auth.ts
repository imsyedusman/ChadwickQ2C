import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

// Validate required environment variables
if (!process.env.NEXTAUTH_SECRET) {
  const errorMsg = "❌ CRITICAL ERROR: NEXTAUTH_SECRET is missing from .env file.";
  console.error("\x1b[31m%s\x1b[0m", errorMsg);
  console.error("Please generate one using: openssl rand -base64 32");
  if (process.env.NODE_ENV === "production") {
    throw new Error(errorMsg);
  }
}

if (!process.env.NEXTAUTH_URL && process.env.NODE_ENV === "production") {
  const errorMsg = "❌ CRITICAL ERROR: NEXTAUTH_URL is missing for production.";
  console.error("\x1b[31m%s\x1b[0m", errorMsg);
  throw new Error(errorMsg);
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        const user = await (prisma as any).user.findUnique({
          where: { email: credentials.email },
          include: { 
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true
                  }
                }
              }
            },
            userPermissions: {
              include: {
                permission: true
              }
            }
          }
        });

        if (!user || !user.password) {
          throw new Error("User not found");
        }

        if (user.status === "DISABLED") {
          throw new Error("Account is disabled");
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);

        if (!isValid) {
          throw new Error("Invalid password");
        }

        // Return user object for JWT
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role?.name || "VIEWER",
          permissions: [
            ...((user as any).role?.rolePermissions.map((rp: any) => rp.permission.name) || []),
            ...(user as any).userPermissions.map((up: any) => up.permission.name)
          ],
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.permissions = (user as any).permissions;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user = {
          ...session.user,
          id: token.id as string,
          role: token.role as string,
          permissions: token.permissions as string[],
        } as any;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};

export default NextAuth(authOptions);
