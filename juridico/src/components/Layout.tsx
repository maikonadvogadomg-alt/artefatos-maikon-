import { Link, useLocation } from "wouter";
import { Scale, LayoutDashboard, Users, FolderOpen, Calendar, FileText, Settings, Menu, BookTemplate, Sparkles, BookOpen, Bot } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(true);

  const navItems = [
    { href: "/juridico-pro", icon: Sparkles, label: "Jurídico Pro" },
    { href: "/assistente", icon: Scale, label: "Assistente" },
    { href: "/iara", icon: Bot, label: "Iara" },
    { href: "/guia", icon: BookOpen, label: "Manual" },
    { href: "/", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/clientes", icon: Users, label: "Clientes" },
    { href: "/processos", icon: FolderOpen, label: "Processos" },
    { href: "/audiencias", icon: Calendar, label: "Audiências" },
    { href: "/documentos", icon: FileText, label: "Documentos" },
    { href: "/templates", icon: BookTemplate, label: "Templates" },
    { href: "/configuracoes", icon: Settings, label: "Configurações" },
  ];

  return (
    <div className="flex h-[100dvh] w-full bg-background text-foreground overflow-hidden">
      <aside className={`${isOpen ? "w-64" : "w-16"} transition-all duration-300 border-r border-border bg-sidebar flex flex-col shrink-0`}>
        <div className="p-4 flex items-center justify-between border-b border-border h-16 shrink-0">
          {isOpen && <span className="font-bold text-primary flex items-center gap-2"><Scale className="w-5 h-5"/> Assistente</span>}
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)} className="text-muted-foreground hover:text-foreground">
            <Menu className="w-5 h-5" />
          </Button>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 flex flex-col gap-2 px-2">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}>
                <item.icon className={`w-5 h-5 shrink-0 ${isActive ? "text-primary" : ""}`} />
                {isOpen && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>
      
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-2">
            <Scale className="w-6 h-6 text-primary" />
            <h1 className="font-bold text-lg text-primary truncate hidden sm:block">Assistente Jurídico</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="px-3 py-1 rounded bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider">Pro</span>
            <Link href="/configuracoes">
              <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-primary">
                <Settings className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </header>
        <div className="flex-1 overflow-auto bg-background">
          <div className="h-full p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
