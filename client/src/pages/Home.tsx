import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import { BarChart3, Upload, ClipboardList, Search, Loader2 } from "lucide-react";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Card className="shadow-xl">
            <CardHeader className="text-center space-y-4 pb-8">
              {APP_LOGO && (
                <img src={APP_LOGO} alt={APP_TITLE} className="h-16 w-16 mx-auto rounded-lg" />
              )}
              <div>
                <h1 className="text-3xl font-bold">{APP_TITLE}</h1>
                <p className="text-muted-foreground mt-2">
                  Sistema de Controle de Produção
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Gerencie a produção, facilidade. Importe produtos, registre a produção diária e acompanhe relatórios em tempo real.
              </p>
              <Button
                onClick={() => {
                  const loginUrl = getLoginUrl();
                  if (loginUrl) {
                    window.location.href = loginUrl;
                  } else {
                    // Se OAuth não está configurado, navegar diretamente para o sistema
                    setLocation("/production");
                  }
                }}
                size="lg"
                className="w-full"
              >
                Entrar
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {APP_LOGO && <img src={APP_LOGO} alt={APP_TITLE} className="h-10 w-10 rounded" />}
              <div>
                <h1 className="text-2xl font-bold">{APP_TITLE}</h1>
                <p className="text-sm text-muted-foreground">Bem-vindo, {user?.name}!</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Import Products */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setLocation("/import")}>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Upload className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle>Importar Produtos</CardTitle>
              </div>
              <CardDescription>
                Importe produtos via arquivo Excel ou CSV
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Carregue um arquivo com os produtos da sua empresa. Suporta atualização de produtos existentes.
              </p>
            </CardContent>
          </Card>

          {/* Production Entry */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setLocation("/production")}>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <ClipboardList className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle>Lançamento de Produção</CardTitle>
              </div>
              <CardDescription>
                Registre a produção do dia em tempo real
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Busque produtos, registre quantidades e finalize o dia com um snapshot completo.
              </p>
            </CardContent>
          </Card>

          {/* Production Report */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setLocation("/report")}>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle>Relatório Diário</CardTitle>
              </div>
              <CardDescription>
                Consulte e exporte relatórios de produção
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Visualize dados de produção por data e exporte em CSV ou XLSX.
              </p>
            </CardContent>
          </Card>

          {/* Products Query */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setLocation("/products")}>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Search className="h-6 w-6 text-orange-600" />
                </div>
                <CardTitle>Consulta de Produtos</CardTitle>
              </div>
              <CardDescription>
                Busque e visualize informações dos produtos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Pesquise produtos por código ou descrição e visualize detalhes ampliados.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Features */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">✓</div>
            <h3 className="font-semibold mb-1">Busca Rápida</h3>
            <p className="text-sm text-muted-foreground">
              Busque produtos por código ou descrição em tempo real
            </p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">✓</div>
            <h3 className="font-semibold mb-1">Relatórios Completos</h3>
            <p className="text-sm text-muted-foreground">
              Exporte dados em CSV ou XLSX para análise
            </p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">✓</div>
            <h3 className="font-semibold mb-1">Sincronização</h3>
            <p className="text-sm text-muted-foreground">
              Dados sincronizados em tempo real entre dispositivos
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
