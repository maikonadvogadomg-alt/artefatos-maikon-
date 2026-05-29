import { useGetDashboardStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FolderOpen, Calendar, FileText, Loader2, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { data: stats, isLoading, isError } = useGetDashboardStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-full text-destructive">
        Erro ao carregar estatísticas do dashboard. Verifique sua conexão com o banco de dados.
      </div>
    );
  }

  const cards = [
    { title: "Total de Clientes", value: stats?.totalClientes || 0, icon: Users, color: "text-yellow-400", href: "/clientes" },
    { title: "Total de Processos", value: stats?.totalProcessos || 0, icon: FolderOpen, color: "text-primary", href: "/processos" },
    { title: "Audiências Hoje", value: stats?.audienciasHoje || 0, icon: Calendar, color: "text-orange-500", href: "/audiencias" },
    { title: "Prazos Vencendo", value: stats?.prazosVencendo || 0, icon: FileText, color: "text-destructive", href: "/documentos" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-foreground">Dashboard</h2>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card, idx) => (
          <Card key={idx} className="bg-card border-border hover:border-primary/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground mb-4">{card.value}</div>
              <Link href={card.href}>
                <Button variant="ghost" className="w-full justify-between text-xs text-muted-foreground hover:text-primary">
                  Ver detalhes <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Acesso Rápido</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Link href="/assistente">
              <Button className="w-full justify-start btn-action" size="lg">
                <FileText className="w-5 h-5 mr-2" />
                Abrir Assistente de Texto IA
              </Button>
            </Link>
            <Link href="/clientes">
              <Button className="w-full justify-start" variant="outline" size="lg">
                <Users className="w-5 h-5 mr-2" />
                Cadastrar Novo Cliente
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
