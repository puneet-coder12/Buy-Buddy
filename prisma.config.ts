import 'dotenv/config'
import { defineConfig } from 'prisma/config'
import { prisma } from '@/lib/prisma'

export default defineConfig({
  schema: 'prisma/schema.prisma',

  datasource: {
    url: process.env.DIRECT_URL,
  },
})
