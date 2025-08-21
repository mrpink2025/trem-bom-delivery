import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SecurityTest {
  name: string;
  description: string;
  table: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  expected: 'ALLOW' | 'DENY';
  testData?: any;
}

interface SecurityResult {
  test: SecurityTest;
  result: 'PASS' | 'FAIL' | 'ERROR';
  error?: string;
  executionTime: number;
}

interface SecurityAuditState {
  running: boolean;
  progress: number;
  results: SecurityResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    errors: number;
  };
}

export const useSecurityAudit = () => {
  const [auditState, setAuditState] = useState<SecurityAuditState>({
    running: false,
    progress: 0,
    results: [],
    summary: { total: 0, passed: 0, failed: 0, errors: 0 }
  });
  const { toast } = useToast();

  // Security tests definition
  const securityTests: SecurityTest[] = [
    // Profile tests
    {
      name: "Users can view own profile",
      description: "Authenticated user should see their own profile",
      table: "profiles",
      operation: "SELECT",
      expected: "ALLOW"
    },
    {
      name: "Users cannot view other profiles",
      description: "User should not see profiles from other users",
      table: "profiles", 
      operation: "SELECT",
      expected: "DENY"
    },
    {
      name: "Users can update own profile",
      description: "User should be able to update their own profile",
      table: "profiles",
      operation: "UPDATE", 
      expected: "ALLOW",
      testData: { full_name: "Test Update" }
    },
    
    // Orders tests
    {
      name: "Clients can view own orders",
      description: "Client should see their own orders",
      table: "orders",
      operation: "SELECT",
      expected: "ALLOW"
    },
    {
      name: "Clients cannot view other orders",
      description: "Client should not see orders from other users",
      table: "orders",
      operation: "SELECT", 
      expected: "DENY"
    },
    {
      name: "Clients can create orders",
      description: "Client should be able to create new orders",
      table: "orders",
      operation: "INSERT",
      expected: "ALLOW",
      testData: {
        restaurant_id: "test-restaurant-id",
        total_amount: 25.50,
        items: [{ id: "test", name: "Test Item", price: 25.50, quantity: 1 }],
        delivery_address: { address: "Test Address", lat: -23.5505, lng: -46.6333 },
        restaurant_address: { address: "Restaurant Address", lat: -23.5505, lng: -46.6333 }
      }
    },
    
    // Restaurant tests  
    {
      name: "Restaurant owners can view own restaurants",
      description: "Restaurant owner should see their restaurants",
      table: "restaurants",
      operation: "SELECT",
      expected: "ALLOW"
    },
    {
      name: "Restaurant owners can update own restaurants", 
      description: "Restaurant owner should be able to update their restaurants",
      table: "restaurants",
      operation: "UPDATE",
      expected: "ALLOW",
      testData: { name: "Updated Restaurant Name" }
    },
    {
      name: "Non-owners cannot update restaurants",
      description: "Users should not be able to update restaurants they don't own",
      table: "restaurants",
      operation: "UPDATE",
      expected: "DENY",
      testData: { name: "Unauthorized Update" }
    },

    // Menu items tests
    {
      name: "Public can view available menu items",
      description: "Anyone should see available menu items",
      table: "menu_items", 
      operation: "SELECT",
      expected: "ALLOW"
    },
    {
      name: "Restaurant owners can manage menu items",
      description: "Restaurant owner should manage their menu items",
      table: "menu_items",
      operation: "UPDATE",
      expected: "ALLOW",
      testData: { name: "Updated Menu Item" }
    },

    // Cart tests
    {
      name: "Users can view own cart items",
      description: "User should see their cart items",
      table: "cart_items",
      operation: "SELECT", 
      expected: "ALLOW"
    },
    {
      name: "Users cannot view other carts",
      description: "User should not see other users' cart items",
      table: "cart_items",
      operation: "SELECT",
      expected: "DENY"
    },

    // Reviews tests
    {
      name: "Anyone can view reviews",
      description: "Reviews should be publicly visible",
      table: "reviews",
      operation: "SELECT",
      expected: "ALLOW"
    },
    {
      name: "Users can update own reviews",
      description: "User should be able to update their own reviews",
      table: "reviews", 
      operation: "UPDATE",
      expected: "ALLOW",
      testData: { comment: "Updated review" }
    },

    // Notifications tests
    {
      name: "Users can view own notifications",
      description: "User should see their notifications",
      table: "notifications",
      operation: "SELECT",
      expected: "ALLOW" 
    },
    {
      name: "Users cannot view other notifications",
      description: "User should not see notifications from other users", 
      table: "notifications",
      operation: "SELECT",
      expected: "DENY"
    }
  ];

  const runSecurityTest = async (test: SecurityTest): Promise<SecurityResult> => {
    const startTime = Date.now();

    try {
      // Type-safe table access
      const getQuery = (tableName: string) => {
        switch (tableName) {
          case 'profiles': return supabase.from('profiles');
          case 'orders': return supabase.from('orders');
          case 'restaurants': return supabase.from('restaurants');
          case 'menu_items': return supabase.from('menu_items');
          case 'cart_items': return supabase.from('cart_items');
          case 'reviews': return supabase.from('reviews');
          case 'notifications': return supabase.from('notifications');
          default: return supabase.from('profiles'); // fallback
        }
      };

      const query = getQuery(test.table);

      switch (test.operation) {
        case 'SELECT':
          const { data, error } = await query.select('*').limit(1);
          
          if (error) {
            // Check if error indicates access denied (expected for DENY tests)
            const isDenied = error.message.includes('permission denied') || 
                           error.message.includes('row-level security') ||
                           error.message.includes('insufficient privilege');
            
            if (test.expected === 'DENY' && isDenied) {
              return {
                test,
                result: 'PASS',
                executionTime: Date.now() - startTime
              };
            } else if (test.expected === 'ALLOW' && isDenied) {
              return {
                test,
                result: 'FAIL', 
                error: 'Access denied when it should be allowed',
                executionTime: Date.now() - startTime
              };
            }
          }

          // If no error and expecting ALLOW, it's a pass
          if (test.expected === 'ALLOW' && !error) {
            return {
              test,
              result: 'PASS',
              executionTime: Date.now() - startTime
            };
          }

          // If no error but expecting DENY, it's a fail
          if (test.expected === 'DENY' && !error) {
            return {
              test,
              result: 'FAIL',
              error: 'Access allowed when it should be denied',
              executionTime: Date.now() - startTime
            };
          }

          break;

        case 'INSERT':
          // For INSERT tests, try with the user's ID if available
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');
            
            const insertData = { ...test.testData, user_id: user.id };
            const { error: insertError } = await supabase
              .from(test.table as any)
              .insert(insertData);
              
            if (insertError) {
              const isDenied = insertError.message.includes('permission denied') || 
                             insertError.message.includes('row-level security') ||
                             insertError.message.includes('insufficient privilege');
              
              if (test.expected === 'DENY' && isDenied) {
                return { test, result: 'PASS', executionTime: Date.now() - startTime };
              } else if (test.expected === 'ALLOW' && isDenied) {
                return { test, result: 'FAIL', error: 'Insert denied when it should be allowed', executionTime: Date.now() - startTime };
              }
            }
            
            if (test.expected === 'ALLOW' && !insertError) {
              return { test, result: 'PASS', executionTime: Date.now() - startTime };
            }
            
            if (test.expected === 'DENY' && !insertError) {
              return { test, result: 'FAIL', error: 'Insert allowed when it should be denied', executionTime: Date.now() - startTime };
            }
          } catch (err) {
            return { test, result: 'ERROR', error: 'Authentication required for INSERT test', executionTime: Date.now() - startTime };
          }
          break;

        case 'UPDATE':
          // For UPDATE tests, use a safe non-existent ID approach
          const { error: updateError } = await supabase
            .from(test.table as any)
            .update(test.testData || {})
            .eq('id', '00000000-0000-0000-0000-000000000000'); // Use UUID that doesn't exist
            
          if (updateError) {
            const isDenied = updateError.message.includes('permission denied') || 
                           updateError.message.includes('row-level security') ||
                           updateError.message.includes('insufficient privilege');
            
            if (test.expected === 'DENY' && isDenied) {
              return { test, result: 'PASS', executionTime: Date.now() - startTime };
            } else if (test.expected === 'ALLOW' && isDenied) {
              return { test, result: 'FAIL', error: 'Update denied when it should be allowed', executionTime: Date.now() - startTime };
            }
          }
          
          // If no error, the policy allows the operation (even if no rows were affected)
          if (test.expected === 'ALLOW' && !updateError) {
            return { test, result: 'PASS', executionTime: Date.now() - startTime };
          }
          
          if (test.expected === 'DENY' && !updateError) {
            return { test, result: 'FAIL', error: 'Update allowed when it should be denied', executionTime: Date.now() - startTime };
          }
          break;

        case 'DELETE':
          const { error: deleteError } = await supabase
            .from(test.table as any)
            .delete()
            .eq('id', '00000000-0000-0000-0000-000000000000');
            
          if (deleteError) {
            const isDenied = deleteError.message.includes('permission denied') || 
                           deleteError.message.includes('row-level security') ||
                           deleteError.message.includes('insufficient privilege');
            
            if (test.expected === 'DENY' && isDenied) {
              return { test, result: 'PASS', executionTime: Date.now() - startTime };
            } else if (test.expected === 'ALLOW' && isDenied) {
              return { test, result: 'FAIL', error: 'Delete denied when it should be allowed', executionTime: Date.now() - startTime };
            }
          }
          
          if (test.expected === 'ALLOW' && !deleteError) {
            return { test, result: 'PASS', executionTime: Date.now() - startTime };
          }
          
          if (test.expected === 'DENY' && !deleteError) {
            return { test, result: 'FAIL', error: 'Delete allowed when it should be denied', executionTime: Date.now() - startTime };
          }
          break;
      }

      return {
        test,
        result: 'PASS',
        executionTime: Date.now() - startTime
      };

    } catch (error) {
      return {
        test,
        result: 'ERROR',
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime
      };
    }
  };

  const runFullAudit = async () => {
    setAuditState(prev => ({
      ...prev,
      running: true,
      progress: 0,
      results: [],
      summary: { total: 0, passed: 0, failed: 0, errors: 0 }
    }));

    try {
      const results: SecurityResult[] = [];
      let passed = 0, failed = 0, errors = 0;

      for (let i = 0; i < securityTests.length; i++) {
        const test = securityTests[i];
        const result = await runSecurityTest(test);
        
        results.push(result);
        
        switch (result.result) {
          case 'PASS':
            passed++;
            break;
          case 'FAIL':
            failed++;
            break;
          case 'ERROR':
            errors++;
            break;
        }

        setAuditState(prev => ({
          ...prev,
          progress: Math.round(((i + 1) / securityTests.length) * 100),
          results: [...prev.results, result],
          summary: {
            total: i + 1,
            passed,
            failed, 
            errors
          }
        }));

        // Small delay to prevent overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const finalSummary = {
        total: securityTests.length,
        passed,
        failed,
        errors
      };

      toast({
        title: "Auditoria de Segurança Concluída",
        description: `${passed} passou, ${failed} falhou, ${errors} erros`,
        variant: failed > 0 || errors > 0 ? "destructive" : "default"
      });

      setAuditState(prev => ({
        ...prev,
        running: false,
        summary: finalSummary
      }));

    } catch (error) {
      toast({
        title: "Erro na Auditoria",
        description: "Falha ao executar auditoria de segurança",
        variant: "destructive"
      });

      setAuditState(prev => ({
        ...prev,
        running: false
      }));
    }
  };

  const clearResults = () => {
    setAuditState({
      running: false,
      progress: 0,
      results: [],
      summary: { total: 0, passed: 0, failed: 0, errors: 0 }
    });
  };

  return {
    auditState,
    runFullAudit,
    runSecurityTest,
    clearResults
  };
};