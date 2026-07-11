import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer, type Server } from 'node:http'
import { relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export function createStaticPreviewServer(root_dir: string): Server {
  const resolved_root_dir = resolve(root_dir)
  const not_found_page_path = resolve(resolved_root_dir, '404.html')

  return createServer(async (request, response) => {
    if (!request.url) {
      await serveNotFound(not_found_page_path, response)
      return
    }

    const request_url = new URL(request.url, 'http://127.0.0.1')
    let pathname: string

    try {
      pathname = decodeURIComponent(request_url.pathname)
    }
    catch {
      await serveNotFound(not_found_page_path, response)
      return
    }

    const target_path = resolve(resolved_root_dir, `.${pathname}`)
    if (relative(resolved_root_dir, target_path).startsWith('..')) {
      await serveNotFound(not_found_page_path, response)
      return
    }

    let target_stat
    try {
      target_stat = await stat(target_path)
    }
    catch {
      await serveNotFound(not_found_page_path, response)
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
      await serveNotFound(not_found_page_path, response)
      return
    }

    serveFile(target_path, response)
  })
}

function serveFile(file_path: string, response: import('node:http').ServerResponse, status = 200) {
  const stream = createReadStream(file_path)

  stream.once('error', () => writeNotFound(response))
  response.writeHead(status, { 'content-type': getContentType(file_path) })
  stream.pipe(response)
}

// 對齊正式 static host（GitHub Pages / Cloudflare Pages）的行為：未知路由回傳 generate
// 產出的 404.html，讓 preview E2E 能看到與正式站相同的 not-found 頁。
async function serveNotFound(not_found_page_path: string, response: import('node:http').ServerResponse) {
  try {
    const page_stat = await stat(not_found_page_path)
    if (page_stat.isFile()) {
      serveFile(not_found_page_path, response, 404)
      return
    }
  }
  catch {
    // 404.html 不存在（尚未 generate）時退回純文字。
  }

  writeNotFound(response)
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
