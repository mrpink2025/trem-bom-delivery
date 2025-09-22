import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>Política de Privacidade | Trem Bão Delivery</title>
        <meta name="description" content="Política de Privacidade do Trem Bão Delivery - Proteção de dados conforme LGPD" />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      
      <div className="min-h-screen bg-gradient-warm">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="mb-6 text-primary hover:text-primary/80 hover:bg-primary/10"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>

          <Card className="bg-card shadow-card border-0">
            <CardHeader className="text-center">
              <div className="flex items-center justify-center mb-4">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold text-primary">
                🔒 Política de Privacidade — Trem Bão Delivery
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Última atualização: {new Date().toLocaleDateString('pt-BR')}
              </p>
            </CardHeader>
            
            <CardContent className="prose prose-slate max-w-none">
              <div className="space-y-6 text-foreground">
                <div className="bg-accent/30 p-4 rounded-lg border border-accent/50">
                  <p className="text-base leading-relaxed mb-0">
                    O Trem Bão Delivery valoriza sua privacidade e cumpre a{' '}
                    <strong>Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD)</strong>.
                  </p>
                </div>

                <section>
                  <h2 className="text-xl font-semibold text-primary mb-3">1. Dados Coletados</h2>
                  <p className="text-base leading-relaxed mb-3">Podemos coletar:</p>
                  <ul className="list-disc pl-6 space-y-2 text-base leading-relaxed">
                    <li>Informações pessoais (nome, CPF, e-mail, telefone).</li>
                    <li>Informações de pagamento (cartão, PIX).</li>
                    <li>Dados de localização (para entregas).</li>
                    <li>Histórico de pedidos e preferências.</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-primary mb-3">2. Uso dos Dados</h2>
                  <p className="text-base leading-relaxed mb-3">Seus dados são utilizados para:</p>
                  <ul className="list-disc pl-6 space-y-2 text-base leading-relaxed">
                    <li>Processar pedidos e pagamentos.</li>
                    <li>Entregar produtos.</li>
                    <li>Melhorar a experiência na plataforma.</li>
                    <li>
                      Enviar comunicações (como status do pedido ou promoções).
                    </li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-primary mb-3">3. Compartilhamento</h2>
                  <p className="text-base leading-relaxed mb-3">Podemos compartilhar seus dados apenas com:</p>
                  <ul className="list-disc pl-6 space-y-2 text-base leading-relaxed">
                    <li>Estabelecimentos parceiros.</li>
                    <li>Entregadores.</li>
                    <li>Provedores de pagamento e serviços essenciais.</li>
                  </ul>
                  <div className="bg-green-50 p-3 rounded-lg border border-green-200 mt-3">
                    <p className="text-green-800 font-medium text-base mb-0">
                      ✅ Nunca vendemos suas informações a terceiros.
                    </p>
                  </div>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-primary mb-3">4. Segurança</h2>
                  <p className="text-base leading-relaxed">
                    Adotamos medidas técnicas e organizacionais para proteger seus dados, 
                    mas não podemos garantir segurança absoluta contra ataques externos.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-primary mb-3">5. Direitos do Usuário</h2>
                  <p className="text-base leading-relaxed mb-3">
                    De acordo com a <strong>LGPD</strong>, você pode:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-base leading-relaxed">
                    <li>Acessar seus dados.</li>
                    <li>Solicitar correção.</li>
                    <li>Solicitar exclusão.</li>
                    <li>Revogar consentimentos.</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-primary mb-3">6. Cookies</h2>
                  <p className="text-base leading-relaxed">
                    Utilizamos cookies para melhorar a navegação e personalizar sua experiência. 
                    Você pode desativar no navegador, mas algumas funções podem ser afetadas.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-primary mb-3">7. Alterações</h2>
                  <p className="text-base leading-relaxed">
                    Esta política pode ser alterada a qualquer momento, sendo a versão mais 
                    recente publicada no app/site.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-primary mb-3">8. Contato</h2>
                  <p className="text-base leading-relaxed">
                    Em caso de dúvidas sobre privacidade, entre em contato:
                  </p>
                  <div className="bg-primary/5 p-4 rounded-lg border border-primary/20 mt-3">
                    <p className="text-base font-medium text-center mb-0">
                      📧 contato@deliverytrembao.com.br
                    </p>
                  </div>
                </section>

                <div className="bg-accent/30 p-4 rounded-lg border border-accent/50 mt-8">
                  <p className="text-sm text-muted-foreground text-center mb-0">
                    <strong>LGPD Compliance:</strong> Este documento está em conformidade com a 
                    Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018).
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default PrivacyPolicy;