import { test, expect } from '@playwright/test'

test.describe('Courier Flow - E2E', () => {
  test('Courier registration wizard complete flow', async ({ page }) => {
    await page.goto('/auth')
    await page.click('[data-testid="register-tab"]')
    await page.selectOption('[data-testid="role-select"]', 'courier')
    
    // Dados básicos
    await page.fill('[data-testid="email-input"]', 'newcourier@test.com')
    await page.fill('[data-testid="password-input"]', 'TremBao2024!Test')
    await page.fill('[data-testid="full-name-input"]', 'João da Silva')
    await page.fill('[data-testid="phone-input"]', '(11) 99999-9999')
    await page.click('[data-testid="register-button"]')
    
    // Wizard de onboarding
    await expect(page.locator('[data-testid="wizard-personal-data"]')).toBeVisible()
    
    // Step 1: Dados pessoais
    await page.fill('[data-testid="cpf-input"]', '123.456.789-00')
    await page.fill('[data-testid="birth-date"]', '1990-01-01')
    await page.fill('[data-testid="address-street"]', 'Rua Teste, 123')
    await page.fill('[data-testid="address-city"]', 'Goiânia')
    await page.selectOption('[data-testid="address-state"]', 'GO')
    await page.fill('[data-testid="address-zipcode"]', '74000-000')
    await page.click('[data-testid="next-step"]')
    
    // Step 2: Documentos pessoais
    await expect(page.locator('[data-testid="wizard-personal-docs"]')).toBeVisible()
    
    // Mock upload de CNH
    await page.setInputFiles('[data-testid="cnh-upload"]', 'test-files/cnh-mock.jpg')
    await page.fill('[data-testid="cnh-number"]', '12345678901')
    await page.fill('[data-testid="cnh-valid-until"]', '2030-12-31')
    await page.click('[data-testid="next-step"]')
    
    // Step 3: Dados do veículo
    await expect(page.locator('[data-testid="wizard-vehicle-data"]')).toBeVisible()
    
    await page.selectOption('[data-testid="vehicle-type"]', 'MOTORCYCLE')
    await page.fill('[data-testid="vehicle-brand"]', 'Honda')
    await page.fill('[data-testid="vehicle-model"]', 'CG 160')
    await page.fill('[data-testid="vehicle-year"]', '2020')
    await page.fill('[data-testid="vehicle-plate"]', 'ABC-1234')
    await page.click('[data-testid="next-step"]')
    
    // Step 4: Documentos do veículo
    await expect(page.locator('[data-testid="wizard-vehicle-docs"]')).toBeVisible()
    
    await page.setInputFiles('[data-testid="crlv-upload"]', 'test-files/crlv-mock.jpg')
    await page.fill('[data-testid="crlv-valid-until"]', '2025-12-31')
    await page.click('[data-testid="next-step"]')
    
    // Step 5: Selfie
    await expect(page.locator('[data-testid="wizard-selfie"]')).toBeVisible()
    
    await page.setInputFiles('[data-testid="selfie-upload"]', 'test-files/selfie-mock.jpg')
    await page.click('[data-testid="next-step"]')
    
    // Step 6: Dados de pagamento
    await expect(page.locator('[data-testid="wizard-payment"]')).toBeVisible()
    
    await page.selectOption('[data-testid="pix-key-type"]', 'CPF')
    await page.fill('[data-testid="pix-key"]', '123.456.789-00')
    await page.click('[data-testid="next-step"]')
    
    // Step 7: Revisão e envio
    await expect(page.locator('[data-testid="wizard-review"]')).toBeVisible()
    
    await page.check('[data-testid="terms-agreement"]')
    await page.click('[data-testid="submit-application"]')
    
    // Confirmação
    await expect(page.locator('[data-testid="application-submitted"]')).toBeVisible()
    await expect(page.locator('[data-testid="success-message"]')).toContainText(
      'Sua solicitação foi enviada para análise'
    )
  })

  test('Approved courier can go online/offline', async ({ page }) => {
    // Login como courier aprovado
    await page.goto('/auth')
    await page.fill('[data-testid="email-input"]', 'courier1@trembao.test')
    await page.fill('[data-testid="password-input"]', 'TremBao2024!Test')
    await page.click('[data-testid="login-button"]')
    
    await expect(page).toHaveURL('/courier')
    
    // Verificar status offline inicial
    await expect(page.locator('[data-testid="status-indicator"]')).toContainText('Offline')
    
    // Ir online
    await page.click('[data-testid="go-online-button"]')
    
    // Verificar permissão de localização (mock)
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'geolocation', {
        value: {
          getCurrentPosition: (success: Function) => {
            success({
              coords: { latitude: -16.6799, longitude: -49.2553 }
            })
          }
        }
      })
    })
    
    await expect(page.locator('[data-testid="status-indicator"]')).toContainText('Online')
    await expect(page.locator('[data-testid="go-offline-button"]')).toBeVisible()
    
    // Ir offline
    await page.click('[data-testid="go-offline-button"]')
    await expect(page.locator('[data-testid="status-indicator"]')).toContainText('Offline')
  })

  test('Courier can accept dispatch offer', async ({ page }) => {
    // Setup: courier já online
    await page.goto('/auth')
    await page.fill('[data-testid="email-input"]', 'courier1@trembao.test')
    await page.fill('[data-testid="password-input"]', 'TremBao2024!Test')  
    await page.click('[data-testid="login-button"]')
    
    await page.click('[data-testid="go-online-button"]')
    
    // Simular oferta recebida
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('dispatch-offer', {
        detail: {
          order_id: 'test-order-123',
          distance_km: 2.5,
          eta_minutes: 15,
          estimated_earnings_cents: 800,
          expires_at: new Date(Date.now() + 30000).toISOString()
        }
      }))
    })
    
    // Verificar modal de oferta
    await expect(page.locator('[data-testid="dispatch-offer-modal"]')).toBeVisible()
    await expect(page.locator('[data-testid="offer-distance"]')).toContainText('2.5 km')
    await expect(page.locator('[data-testid="offer-earnings"]')).toContainText('R$ 8,00')
    await expect(page.locator('[data-testid="offer-countdown"]')).toBeVisible()
    
    // Aceitar oferta
    await page.click('[data-testid="accept-offer"]')
    
    // Verificar confirmação
    await expect(page.locator('[data-testid="offer-accepted"]')).toBeVisible()
    
    // Verificar que aparece na lista de pedidos ativos
    await expect(page.locator('[data-testid="active-order"]')).toContainText('test-order-123')
  })

  test('Courier can reject dispatch offer', async ({ page }) => {
    await page.goto('/auth')
    await page.fill('[data-testid="email-input"]', 'courier2@trembao.test')
    await page.fill('[data-testid="password-input"]', 'TremBao2024!Test')
    await page.click('[data-testid="login-button"]')
    
    await page.click('[data-testid="go-online-button"]')
    
    // Simular oferta
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('dispatch-offer', {
        detail: {
          order_id: 'test-order-456',
          distance_km: 8.2, // Distância maior
          eta_minutes: 35,
          estimated_earnings_cents: 1200,
          expires_at: new Date(Date.now() + 30000).toISOString()
        }
      }))
    })
    
    await expect(page.locator('[data-testid="dispatch-offer-modal"]')).toBeVisible()
    
    // Rejeitar oferta
    await page.click('[data-testid="reject-offer"]')
    
    // Verificar que modal foi fechado
    await expect(page.locator('[data-testid="dispatch-offer-modal"]')).not.toBeVisible()
    
    // Verificar que courier ainda está online mas sem pedidos
    await expect(page.locator('[data-testid="status-indicator"]')).toContainText('Online')
    await expect(page.locator('[data-testid="no-active-orders"]')).toBeVisible()
  })

  test('Courier delivery flow with PoD', async ({ page }) => {
    // Setup: courier com pedido ativo
    await page.goto('/auth')
    await page.fill('[data-testid="email-input"]', 'courier1@trembao.test')
    await page.fill('[data-testid="password-input"]', 'TremBao2024!Test')
    await page.click('[data-testid="login-button"]')
    
    // Mock: pedido já atribuído
    await page.evaluate(() => {
      localStorage.setItem('activeOrder', JSON.stringify({
        id: 'test-order-789',
        status: 'OUT_FOR_DELIVERY',
        restaurant: { name: 'Restaurante Teste', address: 'Rua A, 123' },
        customer: { name: 'Cliente Teste', address: 'Rua B, 456' },
        items: [{ name: 'Pizza Margherita', quantity: 1 }],
        proof_of_delivery_type: 'OTP'
      }))
    })
    
    await page.reload()
    
    // Verificar pedido ativo
    await expect(page.locator('[data-testid="active-order"]')).toBeVisible()
    await expect(page.locator('[data-testid="order-status"]')).toContainText('A caminho')
    
    // Navegar para tela de entrega
    await page.click('[data-testid="view-order-details"]')
    
    // Verificar informações do pedido
    await expect(page.locator('[data-testid="customer-name"]')).toContainText('Cliente Teste')
    await expect(page.locator('[data-testid="delivery-address"]')).toContainText('Rua B, 456')
    
    // Marcar como chegou ao destino
    await page.click('[data-testid="arrived-at-destination"]')
    
    // PoD - OTP
    await expect(page.locator('[data-testid="pod-otp"]')).toBeVisible()
    await page.fill('[data-testid="otp-input"]', '1234')
    await page.click('[data-testid="confirm-delivery"]')
    
    // Verificar entrega confirmada
    await expect(page.locator('[data-testid="delivery-completed"]')).toBeVisible()
    await expect(page.locator('[data-testid="earnings-summary"]')).toContainText('R$')
    
    // Voltar para modo disponível
    await page.click('[data-testid="back-to-available"]')
    await expect(page.locator('[data-testid="status-indicator"]')).toContainText('Online')
  })

  test('Courier earnings tracking', async ({ page }) => {
    await page.goto('/auth')
    await page.fill('[data-testid="email-input"]', 'courier1@trembao.test')
    await page.fill('[data-testid="password-input"]', 'TremBao2024!Test')
    await page.click('[data-testid="login-button"]')
    
    // Navegar para earnings
    await page.click('[data-testid="earnings-tab"]')
    
    // Verificar resumo do dia
    await expect(page.locator('[data-testid="today-earnings"]')).toBeVisible()
    await expect(page.locator('[data-testid="deliveries-count"]')).toBeVisible()
    await expect(page.locator('[data-testid="avg-per-delivery"]')).toBeVisible()
    
    // Verificar histórico
    await expect(page.locator('[data-testid="earnings-history"]')).toBeVisible()
    
    // Testar filtros
    await page.selectOption('[data-testid="period-filter"]', 'week')
    await page.click('[data-testid="apply-filter"]')
    
    await expect(page.locator('[data-testid="weekly-chart"]')).toBeVisible()
    
    // Verificar detalhes por tipo
    await expect(page.locator('[data-testid="base-earnings"]')).toBeVisible()
    await expect(page.locator('[data-testid="bonus-earnings"]')).toBeVisible()
    await expect(page.locator('[data-testid="surge-earnings"]')).toBeVisible()
  })

  test('Courier offline capabilities', async ({ page }) => {
    await page.goto('/auth')
    await page.fill('[data-testid="email-input"]', 'courier1@trembao.test')
    await page.fill('[data-testid="password-input"]', 'TremBao2024!Test')
    await page.click('[data-testid="login-button"]')
    
    // Simular perda de conectividade
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      })
      window.dispatchEvent(new Event('offline'))
    })
    
    // Verificar indicador offline
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible()
    
    // Tentar ações offline - devem ser enfileiradas
    await page.click('[data-testid="mark-order-received"]') // Se houver pedido ativo
    
    // Verificar que ação foi enfileirada
    await expect(page.locator('[data-testid="pending-actions"]')).toContainText('1')
    
    // Simular reconexão
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      })
      window.dispatchEvent(new Event('online'))
    })
    
    // Verificar que ações foram sincronizadas
    await expect(page.locator('[data-testid="offline-indicator"]')).not.toBeVisible()
    await expect(page.locator('[data-testid="sync-success"]')).toBeVisible()
  })

  test('Battery optimization warnings', async ({ page }) => {
    await page.goto('/auth')
    await page.fill('[data-testid="email-input"]', 'courier1@trembao.test')
    await page.fill('[data-testid="password-input"]', 'TremBao2024!Test')
    await page.click('[data-testid="login-button"]')
    
    // Simular bateria baixa
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'getBattery', {
        value: () => Promise.resolve({
          level: 0.10, // 10%
          charging: false
        })
      })
    })
    
    await page.click('[data-testid="go-online-button"]')
    
    // Verificar warning de bateria baixa
    await expect(page.locator('[data-testid="low-battery-warning"]')).toBeVisible()
    await expect(page.locator('[data-testid="battery-warning"]')).toContainText('10%')
    
    // Sistema deve sugerir modo economia
    await expect(page.locator('[data-testid="battery-saver-suggestion"]')).toBeVisible()
  })
})