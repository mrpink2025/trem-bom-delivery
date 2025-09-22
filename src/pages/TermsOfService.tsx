import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const TermsOfService = () => {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>Termos de Uso | Trem Bão Delivery</title>
        <meta name="description" content="Termos de Uso do Trem Bão Delivery - Conectando botecos e restaurantes locais" />
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
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold text-primary">
                📜 Termos de Uso — Trem Bão Delivery
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Última atualização: {new Date().toLocaleDateString('pt-BR')}
              </p>
            </CardHeader>
            
            <CardContent className="prose prose-slate max-w-none">
              <div className="space-y-6 text-foreground">
                <div className="bg-accent/30 p-4 rounded-lg border border-accent/50">
                  <p className="text-base leading-relaxed mb-0">
                    <strong>Bem-vindo ao Trem Bão Delivery!</strong>
                    <br />
                    Ao utilizar nosso aplicativo ou site, você concorda com os presentes Termos de Uso. 
                    Caso não concorde, pedimos que não utilize nossos serviços.
                  </p>
                </div>

                <section>
                  <h2 className="text-xl font-semibold text-primary mb-3">1. Objeto</h2>
                  <p className="text-base leading-relaxed">
                    O Trem Bão Delivery oferece uma plataforma digital que conecta usuários, 
                    estabelecimentos parceiros e entregadores para a realização de pedidos de 
                    produtos e serviços de delivery.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-primary mb-3">2. Cadastro e Conta</h2>
                  <ul className="list-disc pl-6 space-y-2 text-base leading-relaxed">
                    <li>O usuário deve fornecer informações verdadeiras, completas e atualizadas.</li>
                    <li>É proibido compartilhar sua conta ou usar dados falsos.</li>
                    <li>O Trem Bão pode suspender ou excluir contas em caso de irregularidades.</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-primary mb-3">3. Funcionamento da Plataforma</h2>
                  <ul className="list-disc pl-6 space-y-2 text-base leading-relaxed">
                    <li>
                      O Trem Bão atua como intermediador, não sendo responsável pela preparação 
                      dos produtos nem pela entrega final, que são de responsabilidade dos 
                      estabelecimentos e entregadores.
                    </li>
                    <li>Os prazos de entrega são estimativas informadas pelos parceiros.</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-primary mb-3">4. Pagamentos</h2>
                  <ul className="list-disc pl-6 space-y-2 text-base leading-relaxed">
                    <li>
                      O usuário poderá pagar via cartão de crédito, PIX ou outros métodos disponíveis.
                    </li>
                    <li>Taxas, valores e condições podem variar conforme cada parceiro.</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-primary mb-3">5. Responsabilidades</h2>
                  <ul className="list-disc pl-6 space-y-2 text-base leading-relaxed">
                    <li>O usuário é responsável pelo uso adequado da plataforma.</li>
                    <li>O estabelecimento é responsável pela qualidade dos produtos.</li>
                    <li>O entregador é responsável pela realização da entrega.</li>
                    <li>
                      O Trem Bão não se responsabiliza por prejuízos causados por terceiros 
                      (como falha do restaurante ou entregador).
                    </li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-primary mb-3">6. Proibições</h2>
                  <p className="text-base leading-relaxed mb-3">É proibido:</p>
                  <ul className="list-disc pl-6 space-y-2 text-base leading-relaxed">
                    <li>Utilizar a plataforma para atividades ilegais.</li>
                    <li>Manipular preços, avaliações ou sistema de entregas.</li>
                    <li>Violar direitos de terceiros ou da plataforma.</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-primary mb-3">7. Alterações</h2>
                  <p className="text-base leading-relaxed">
                    O Trem Bão poderá modificar estes Termos a qualquer momento. A versão 
                    atualizada sempre estará disponível no app/site.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-primary mb-3">8. Foro</h2>
                  <p className="text-base leading-relaxed">
                    Fica eleito o foro da comarca de Belo Horizonte/MG para dirimir quaisquer 
                    disputas oriundas destes Termos.
                  </p>
                </section>

                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20 mt-8">
                  <p className="text-sm text-muted-foreground text-center mb-0">
                    Para dúvidas sobre estes termos, entre em contato conosco através do 
                    email: contato@deliverytrembao.com.br
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

export default TermsOfService;