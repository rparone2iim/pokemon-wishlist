import { describe, expect, it } from 'vitest'
import { TEST_DATABASE_URL } from './db.js'

// Le gestionnaire Lambda reçoit des événements API Gateway (API HTTP, format 2.0)
process.env.DATABASE_URL = TEST_DATABASE_URL
process.env.CORS_ORIGIN = 'https://front.example'
const { handler } = await import('../src/lambda.js')

function event(
  method: string,
  path: string,
  headers: Record<string, string> = {},
) {
  return {
    version: '2.0',
    routeKey: '$default',
    rawPath: path,
    rawQueryString: '',
    headers: { host: 'api.example', ...headers },
    requestContext: {
      accountId: '123456789012',
      apiId: 'api',
      domainName: 'api.example',
      domainPrefix: 'api',
      http: {
        method,
        path,
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'vitest',
      },
      requestId: 'test',
      routeKey: '$default',
      stage: '$default',
      time: '03/Nov/2026:12:00:00 +0000',
      timeEpoch: 0,
    },
    isBase64Encoded: false,
  }
}

type Result = {
  statusCode: number
  headers: Record<string, string>
  body: string
}
const invoke = (e: ReturnType<typeof event>) =>
  // @ts-expect-error : un contexte Lambda minimal suffit pour Hono
  handler(e, {}) as Promise<Result>

describe('gestionnaire AWS Lambda', () => {
  it('GET /health renvoie 200 via un événement API Gateway', async () => {
    const res = await invoke(event('GET', '/health'))

    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body)).toEqual({
      status: 'ok',
      service: 'pokewishlist-api',
      version: 'dev',
    })
  })

  it('GET /wishlist lit la base PostgreSQL', async () => {
    const res = await invoke(event('GET', '/wishlist'))

    expect(res.statusCode).toBe(200)
    expect(Array.isArray(JSON.parse(res.body))).toBe(true)
  })

  it('autorise le front configuré dans CORS_ORIGIN', async () => {
    const res = await invoke(
      event('GET', '/health', { origin: 'https://front.example' }),
    )

    expect(res.headers['access-control-allow-origin']).toBe(
      'https://front.example',
    )
  })

  it('traduit les erreurs selon Accept-Language', async () => {
    const res = await invoke(
      event('GET', '/nimporte-quoi', { 'accept-language': 'fr' }),
    )

    expect(res.statusCode).toBe(404)
    expect(JSON.parse(res.body)).toEqual({ error: 'Route introuvable' })
  })
})
