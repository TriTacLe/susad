/**
 * Generate public/preview.png for og:image.
 * Usage: npx tsx scripts/gen-og-image.ts
 * Requires dev server running on localhost:5173 (or starts one via npm run dev).
 */
import { chromium } from 'playwright'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const EXAMPLE = path.resolve(ROOT, 'examples/nettdetektivene.susad.json')
const OUT = path.resolve(ROOT, 'public/preview.png')

const W = 1200
const H = 630

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: W, height: H } })

  await page.goto('http://localhost:5173')
  await page.evaluate(() => localStorage.clear())
  await page.reload()

  // Load example via hidden file input
  const input = page.locator('input[type="file"]')
  await input.setInputFiles(EXAMPLE)

  // Wait for all items to render
  await page.waitForSelector('[data-item]')
  const count = await page.locator('[data-item]').count()
  if (count < 5) throw new Error(`Expected items, got ${count}`)

  // Fit diagram to screen so everything is visible
  const fitBtn = page.getByRole('button', { name: /^fit$|^tilpass$/i })
  if (await fitBtn.isVisible()) await fitBtn.click()

  // Brief pause for layout to settle
  await page.waitForTimeout(600)

  await page.screenshot({ path: OUT, clip: { x: 0, y: 0, width: W, height: H } })
  console.log(`Saved ${OUT}`)
  await browser.close()
}

main().catch((e) => { console.error(e); process.exit(1) })
