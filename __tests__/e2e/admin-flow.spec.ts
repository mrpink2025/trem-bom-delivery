import { test, expect } from '@playwright/test'

test.describe('Admin Flow - E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Login como admin
    await page.goto('/auth')
    await page.fill('[data-testid="email-input"]', 'superadmin@trembao.test')
    await page.fill('[data-testid="password-input"]', 'TremBao2024!Test')
    await page.click('[data-testid="login-button"]')
    await expect(page).toHaveURL('/admin')
  })

  test('Admin can view dashboard with KPIs', async ({ page }) => {
    await expect(page.locator('[data-testid="total-orders-kpi"]')).toBeVisible()
    await expect(page.locator('[data-testid="total-revenue-kpi"]')).toBeVisible()
    await expect(page.locator('[data-testid="active-couriers-kpi"]')).toBeVisible()
    await expect(page.locator('[data-testid="cancel-rate-kpi"]')).toBeVisible()
  })

  test('Admin can approve pending courier', async ({ page }) => {
    await page.goto('/admin/couriers')
    
    // Filtrar por pendentes
    await page.selectOption('[data-testid="status-filter"]', 'UNDER_REVIEW')
    await page.waitForSelector('[data-testid="courier-card"]')
    
    // Clicar no primeiro courier pendente
    const firstCourier = page.locator('[data-testid="courier-card"]').first()
    await firstCourier.click()
    
    // Aprovar courier
    await page.click('[data-testid="approve-courier-button"]')
    await page.fill('[data-testid="approval-notes"]', 'Documentos validados - aprovado')
    await page.click('[data-testid="confirm-approval"]')
    
    // Verificar sucesso
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Courier aprovado com sucesso')
  })

  test('Admin can reject courier with reason', async ({ page }) => {
    await page.goto('/admin/couriers')
    
    await page.selectOption('[data-testid="status-filter"]', 'UNDER_REVIEW')
    await page.waitForSelector('[data-testid="courier-card"]')
    
    const firstCourier = page.locator('[data-testid="courier-card"]').first()
    await firstCourier.click()
    
    await page.click('[data-testid="reject-courier-button"]')
    await page.fill('[data-testid="rejection-reason"]', 'CNH vencida - necessário renovar')
    await page.click('[data-testid="confirm-rejection"]')
    
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Courier rejeitado')
  })

  test('Admin can suspend courier', async ({ page }) => {
    await page.goto('/admin/couriers')
    
    await page.selectOption('[data-testid="status-filter"]', 'APPROVED')
    await page.waitForSelector('[data-testid="courier-card"]')
    
    const firstCourier = page.locator('[data-testid="courier-card"]').first()
    await firstCourier.click()
    
    await page.click('[data-testid="suspend-courier-button"]')
    await page.fill('[data-testid="suspension-reason"]', 'Múltiplas reclamações de clientes')
    await page.click('[data-testid="confirm-suspension"]')
    
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Courier suspenso')
  })

  test('Admin can view audit logs', async ({ page }) => {
    await page.goto('/admin/audit')
    
    // Verificar se logs são carregados
    await expect(page.locator('[data-testid="audit-log-entry"]')).toHaveCount.greaterThan(0)
    
    // Testar filtros
    await page.selectOption('[data-testid="operation-filter"]', 'COURIER_APPROVED')
    await page.click('[data-testid="apply-filters"]')
    
    // Verificar se apenas logs de aprovação são mostrados
    const logEntries = page.locator('[data-testid="audit-log-entry"]')
    const count = await logEntries.count()
    
    for (let i = 0; i < count; i++) {
      await expect(logEntries.nth(i)).toContainText('COURIER_APPROVED')
    }
  })

  test('Admin can manage restaurant applications', async ({ page }) => {
    await page.goto('/admin/restaurants')
    
    await page.selectOption('[data-testid="status-filter"]', 'PENDING')
    await page.waitForSelector('[data-testid="restaurant-card"]')
    
    const pendingRestaurant = page.locator('[data-testid="restaurant-card"]').first()
    await pendingRestaurant.click()
    
    // Verificar documentos
    await expect(page.locator('[data-testid="document-cnpj"]')).toBeVisible()
    await expect(page.locator('[data-testid="document-license"]')).toBeVisible()
    
    // Aprovar restaurante
    await page.click('[data-testid="approve-restaurant-button"]')
    await page.click('[data-testid="confirm-approval"]')
    
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Restaurante aprovado')
  })

  test('Admin security - cannot access without proper role', async ({ page, context }) => {
    // Logout do admin atual
    await page.click('[data-testid="user-menu"]')
    await page.click('[data-testid="logout-button"]')
    
    // Login como usuário comum
    await page.fill('[data-testid="email-input"]', 'cliente.a@trembao.test')
    await page.fill('[data-testid="password-input"]', 'TremBao2024!Test')
    await page.click('[data-testid="login-button"]')
    
    // Tentar acessar área admin diretamente
    await page.goto('/admin')
    
    // Deve ser redirecionado ou ver erro de acesso negado
    await expect(page).not.toHaveURL('/admin')
    // OU
    await expect(page.locator('[data-testid="access-denied"]')).toBeVisible()
  })

  test('Admin can generate reports', async ({ page }) => {
    await page.goto('/admin/reports')
    
    // Selecionar período
    await page.fill('[data-testid="date-from"]', '2024-01-01')
    await page.fill('[data-testid="date-to"]', '2024-12-31')
    
    // Selecionar tipo de relatório
    await page.selectOption('[data-testid="report-type"]', 'kpi')
    
    // Gerar relatório
    await page.click('[data-testid="generate-report"]')
    
    // Verificar se dados são carregados
    await expect(page.locator('[data-testid="report-total-orders"]')).toBeVisible()
    await expect(page.locator('[data-testid="report-total-revenue"]')).toBeVisible()
    await expect(page.locator('[data-testid="report-cancel-rate"]')).toBeVisible()
    
    // Testar export
    const downloadPromise = page.waitForEvent('download')
    await page.click('[data-testid="export-csv"]')
    const download = await downloadPromise
    expect(download.suggestedFilename()).toContain('report')
  })

  test('Admin can moderate chat messages', async ({ page }) => {
    await page.goto('/admin/moderation')
    
    // Ver relatórios de mensagens
    await expect(page.locator('[data-testid="reported-message"]')).toHaveCount.greaterThan(0)
    
    const firstReport = page.locator('[data-testid="reported-message"]').first()
    await firstReport.click()
    
    // Opções de moderação
    await expect(page.locator('[data-testid="warn-user"]')).toBeVisible()
    await expect(page.locator('[data-testid="delete-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="suspend-user"]')).toBeVisible()
    
    // Deletar mensagem
    await page.click('[data-testid="delete-message"]')
    await page.fill('[data-testid="moderation-reason"]', 'Conteúdo inadequado')
    await page.click('[data-testid="confirm-delete"]')
    
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Mensagem removida')
  })

  test('Performance - admin dashboard loads within 2 seconds', async ({ page }) => {
    const startTime = Date.now()
    
    await page.goto('/admin')
    await expect(page.locator('[data-testid="dashboard-loaded"]')).toBeVisible()
    
    const loadTime = Date.now() - startTime
    expect(loadTime).toBeLessThan(2000) // 2 segundos
  })
})