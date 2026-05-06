import { test, expect } from '@playwright/test'
import path from 'path'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('app loads, empty diagram renders', async ({ page }) => {
  await expect(page.locator('[role="img"]')).toBeVisible()
  // Main canvas SVG (1000x1000)
  await expect(page.locator('svg[width="1000"]')).toBeVisible()
  // System node visible
  await expect(page.locator('[data-system]')).toBeVisible()
})

test('add item via toolbar dialog', async ({ page }) => {
  // Default locale is 'no', so button reads "Legg til element"
  await page.getByRole('button', { name: /legg til element|add item/i }).first().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()

  // Dialog has ID, Code, and Label fields (all required)
  await dialog.locator('#item-id').fill('TEST1')
  await dialog.locator('#item-code').fill('TEST1')
  await dialog.locator('#item-label').fill('Test item')
  await dialog.locator('#item-sector').selectOption('social')
  await dialog.locator('#item-ring').selectOption('immediate')

  await dialog.getByRole('button', { name: /add item/i }).click()
  await expect(dialog).not.toBeVisible()

  await expect(page.locator('[data-item]')).toHaveCount(1)
  await expect(page.locator('[data-item]')).toContainText('TEST1')
})

test('add item via canvas bottom button', async ({ page }) => {
  // Bottom-center canvas add button - same label as toolbar
  const btns = page.getByRole('button', { name: /legg til element|add item/i })
  // There should be at least two (toolbar + canvas)
  const count = await btns.count()
  expect(count).toBeGreaterThanOrEqual(2)

  // Click the last one (canvas button is after toolbar button in DOM)
  await btns.last().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()

  // Close button in dialog
  await dialog.getByRole('button', { name: /cancel|avbryt/i }).click()
  await expect(dialog).not.toBeVisible()
})

test('import example file loads diagram', async ({ page }) => {
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles(path.resolve('./examples/myapp.susad.json'))

  await expect(page.locator('[data-item]')).toHaveCount(7)
  await expect(page.locator('[data-system]')).toContainText('MyApp')
})

test('select item shows inspector', async ({ page }) => {
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles(path.resolve('./examples/myapp.susad.json'))
  await expect(page.locator('[data-item]')).toHaveCount(7)

  await page.locator('[data-item]').first().click()
  // Inspector code input visible
  await expect(page.locator('#insp-code')).toBeVisible()
})

test('delete selected item with Delete key', async ({ page }) => {
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles(path.resolve('./examples/myapp.susad.json'))
  await expect(page.locator('[data-item]')).toHaveCount(7)

  await page.locator('[data-item]').first().click()
  await page.keyboard.press('Delete')
  await expect(page.locator('[data-item]')).toHaveCount(6)
})

test('undo restores deleted item', async ({ page }) => {
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles(path.resolve('./examples/myapp.susad.json'))
  await expect(page.locator('[data-item]')).toHaveCount(7)

  await page.locator('[data-item]').first().click()
  await page.keyboard.press('Delete')
  await expect(page.locator('[data-item]')).toHaveCount(6)

  await page.keyboard.press('Control+z')
  await expect(page.locator('[data-item]')).toHaveCount(7)
})

test('redo after undo', async ({ page }) => {
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles(path.resolve('./examples/myapp.susad.json'))
  await expect(page.locator('[data-item]')).toHaveCount(7)

  await page.locator('[data-item]').first().click()
  await page.keyboard.press('Delete')
  await page.keyboard.press('Control+z')
  await expect(page.locator('[data-item]')).toHaveCount(7)
  await page.keyboard.press('Control+y')
  await expect(page.locator('[data-item]')).toHaveCount(6)
})

test('locale toggle switches axis labels', async ({ page }) => {
  // Default locale is 'no', toggle button reads "EN"
  const toggleBtn = page.getByRole('button', { name: /^EN$|^NO$/ })
  await expect(toggleBtn).toBeVisible()

  const svgText = await page.locator('svg[width="1000"]').textContent()
  await toggleBtn.click()
  const svgTextAfter = await page.locator('svg[width="1000"]').textContent()
  expect(svgText).not.toEqual(svgTextAfter)
})

test('zoom in button increases zoom', async ({ page }) => {
  // World div has position:absolute style (from worldStyle computed)
  const worldDiv = page.locator('[role="img"] div[style*="position: absolute"]').first()
  await expect(worldDiv).toBeVisible()
  const styleBefore = await worldDiv.getAttribute('style')

  // Zoom in button: "Zoom inn" in Norwegian
  await page.getByRole('button', { name: /zoom in|zoom inn/i }).click()
  const styleAfter = await worldDiv.getAttribute('style')
  expect(styleBefore).not.toEqual(styleAfter)
})

test('fit to screen button works', async ({ page }) => {
  // "Tilpass" in Norwegian, "Fit" in English
  const fitBtn = page.getByRole('button', { name: /^fit$|^tilpass$/i })
  await expect(fitBtn).toBeVisible()
  await fitBtn.click()
  await expect(page.locator('[role="img"]')).toBeVisible()
})

test('cleanup layout button works', async ({ page }) => {
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles(path.resolve('./examples/myapp.susad.json'))
  await expect(page.locator('[data-item]')).toHaveCount(7)

  // "Rydd opp" in Norwegian
  const cleanBtn = page.getByRole('button', { name: /rydd opp|clean up/i })
  await cleanBtn.click()
  await expect(page.locator('[data-item]')).toHaveCount(7)
})

test('connect mode: connect two items creates edge', async ({ page }) => {
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles(path.resolve('./examples/myapp.susad.json'))
  await expect(page.locator('[data-item]')).toHaveCount(7)

  // Select first item
  const items = page.locator('[data-item]')
  await items.first().click()

  // Connect button in inspector: "Connect (draw arrow)"
  await page.getByRole('button', { name: 'Connect (draw arrow)' }).click()

  // Connect mode banner
  await expect(page.getByRole('status')).toBeVisible()

  // Click second item as target
  await items.nth(1).click()
  await expect(page.getByRole('status')).not.toBeVisible()
})

test('Escape cancels connect mode', async ({ page }) => {
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles(path.resolve('./examples/myapp.susad.json'))
  await expect(page.locator('[data-item]')).toHaveCount(7)

  await page.locator('[data-item]').first().click()
  await page.getByRole('button', { name: 'Connect (draw arrow)' }).click()
  await expect(page.getByRole('status')).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(page.getByRole('status')).not.toBeVisible()
})

test('duplicate item with Ctrl+D', async ({ page }) => {
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles(path.resolve('./examples/myapp.susad.json'))
  await expect(page.locator('[data-item]')).toHaveCount(7)

  await page.locator('[data-item]').first().click()
  await page.keyboard.press('Control+d')
  await expect(page.locator('[data-item]')).toHaveCount(8)
})

test('arrow key nudges selected item', async ({ page }) => {
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles(path.resolve('./examples/myapp.susad.json'))
  await expect(page.locator('[data-item]')).toHaveCount(7)

  const item = page.locator('[data-item]').first()
  await item.click()
  const styleBefore = await item.getAttribute('style')

  await page.keyboard.press('ArrowRight')
  const styleAfter = await item.getAttribute('style')
  expect(styleBefore).not.toEqual(styleAfter)
})

test('new diagram confirm dialog appears when dirty', async ({ page }) => {
  // Add an item to make diagram dirty
  await page.getByRole('button', { name: /legg til element|add item/i }).first().click()
  const addDialog = page.getByRole('dialog')
  await addDialog.getByLabel(/code/i).fill('X1')
  await addDialog.getByLabel(/label/i).fill('x')
  await addDialog.getByRole('button', { name: /legg til|add/i }).click()
  await expect(addDialog).not.toBeVisible()

  // Click New ("Ny" in Norwegian)
  await page.getByRole('button', { name: /^ny$|^new$/i }).click()
  // Confirm dialog
  await expect(page.getByRole('dialog')).toBeVisible()
})

test('export SVG triggers download', async ({ page }) => {
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles(path.resolve('./examples/myapp.susad.json'))

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /svg/i }).click(),
  ])
  expect(download.suggestedFilename()).toMatch(/\.svg$/)
})

test('export PNG triggers download', async ({ page }) => {
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles(path.resolve('./examples/myapp.susad.json'))

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /png/i }).click(),
  ])
  expect(download.suggestedFilename()).toMatch(/\.png$/)
})

test('item list panel closes and reopens', async ({ page }) => {
  // Close the item list panel - use the item list aside specifically
  const itemListPanel = page.getByRole('complementary', { name: /item list|elementliste/i })
  const closeBtn = itemListPanel.getByRole('button', { name: /lukk panel|close panel/i })
  await expect(closeBtn).toBeVisible()
  await closeBtn.click()

  // Item list should be hidden; reopen button appears
  await expect(page.getByRole('button', { name: /item list|elementliste/i })).toBeVisible()
})
