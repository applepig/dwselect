import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer, type Server } from 'node:http'
import { relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export function createStaticPreviewServer(root_dir: string): Server {
  const resolved_root_dir = resolve(root_dir)

  return createServer(async (request, response) => {
    if (!request.url) {
      writeNotFound(response)
      return
    }

    const request_url = new URL(request.url, 'http://127.0.0.1')
    let pathname: string

    try {
      pathname = decodeURIComponent(request_url.pathname)
    }
    catch {
      writeNotFound(response)
      return
    }

    const target_path = resolve(resolved_root_dir, `.${pathname}`)
    if (relative(resolved_root_dir, target_path).startsWith('..')) {
      writeNotFound(response)
      return
    }

    let target_stat
    try {
      target_stat = await stat(target_path)
    }
    catch {
      writeNotFound(response)
      return
    }

    if (target_stat.isDirectory()) {
      if (!pathname.endsWith('/')) {
        response.writeHead(308, { location: `${pathname}/${request_url.search}` })
        response.end()
        return
      }

      serveFile(resolve(target_path, 'index.html'), response)
      return
    }

    if (!target_stat.isFile()) {
      writeNotFound(response)
      return
    }

    serveFile(target_path, response)
  })
}

function serveFile(file_path: string, response: import('node:http').ServerResponse) {
  const stream = createReadStream(file_path)

  stream.once('error', () => writeNotFound(response))
  response.writeHead(200, { 'content-type': getContentType(file_path) })
  stream.pipe(response)
}

function writeNotFound(response: import('node:http').ServerResponse) {
  if (!response.headersSent) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
  }

  response.end('Not Found')
}

function getContentType(file_path: string) {
  if (file_path.endsWith('.html')) {
    return 'text/html; charset=utf-8'
  }

  if (file_path.endsWith('.json')) {
    return 'application/json; charset=utf-8'
  }

  if (file_path.endsWith('.js') || file_path.endsWith('.mjs')) {
    return 'text/javascript; charset=utf-8'
  }

  if (file_path.endsWith('.css')) {
    return 'text/css; charset=utf-8'
  }

  return 'application/octet-stream'
}

function getPort() {
  const port = Number(process.env.STATIC_PREVIEW_PORT ?? '4173')
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('STATIC_PREVIEW_PORT must be an integer between 1 and 65535')
  }

  return port
}

function startStaticPreview() {
  const root_dir = process.env.STATIC_PREVIEW_ROOT ?? '.output/public'
  const port = getPort()
  const server = createStaticPreviewServer(root_dir)

  server.listen(port, '127.0.0.1', () => {
    console.log(`Static preview listening at http://127.0.0.1:${port}`)
  })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startStaticPreview()
}
