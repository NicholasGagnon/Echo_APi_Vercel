import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/entier'],
      disallow: ['/account', '/api'],
    },
    sitemap: 'https://echosai.ca/sitemap.xml',
  }
}