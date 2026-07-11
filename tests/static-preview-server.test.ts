import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import { createStaticPreviewServer } from '../scripts/serve-static-output'

const server_roots: string[] = []
const servers: ReturnType<typeof createStaticPreviewServer>[] = []

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve, reject) => {
    server.close((error) => error === undefined ? resolve() : reject(error))
  })))
  await Promise.all(server_roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

describe('static preview server', () => {
  it('redirects directory routes to a trailing slash while preserving the query string', async () => {
    const root = await createStaticOutput()
    const server = createStaticPreviewServer(root)
    servers.push(server)
    await listen(server)
    const port = getPort(server)

    const response = await fetch(`http://127.0.0.1:${port}/search?q=Sharp`, { redirect: 'manual' })

    expect(response.status).toBe(308)
    expect(response.headers.get('location')).toBe('/search/?q=Sharp')
  })

  it('serves the directory index after the canonical redirect', async () => {
    const root = await createStaticOutput()
    const server = createStaticPreviewServer(root)
    servers.push(server)
    await listen(server)
    const port = getPort(server)

    const response = await fetch(`http://127.0.0.1:${port}/search/`)

    expect(response.status).toBe(200)
    await expect(response.text()).resolves.toContain('Search page')
  })

  it('serves the generated 404 page for an unknown route', async () => {
    const root = await createStaticOutput()
    const server = createStaticPreviewServer(root)
    servers.push(server)
    await listen(server)
    const port = getPort(server)

    const response = await fetch(`http://127.0.0.1:${port}/products/not-a-real-product`)

    expect(response.status).toBe(404)
    await expect(response.text()).resolves.toContain('Not found page')
  })
})

async function createStaticOutput() {
  const root = await mkdtemp(join(tmpdir(), 'dwselect-static-preview-'))
  server_roots.push(root)
  await mkdir(join(root, 'search'))
  await writeFile(join(root, 'search', 'index.html'), '<main>Search page</main>')
  await writeFile(join(root, '404.html'), '<main>Not found page</main>')
  return root
}

async function listen(server: ReturnType<typeof createStaticPreviewServer>) {
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject)
      resolve()
    })
  })
}

function getPort(server: ReturnType<typeof createStaticPreviewServer>) {
  const address = server.address()
  if (address === null || typeof address === 'string') {
    throw new Error('Static preview server did not bind a TCP port')
  }

  return address.port
}
