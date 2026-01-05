
"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CheckCircle, HardHat, Building, Home } from "lucide-react";
import { useAuth } from "@/modules/auth/useAuth";
import { useEffect } from "react";
import { useRouter } from "next/navigation";


export default function LandingPage() {
    const { user, authLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && user) {
            router.replace('/dashboard');
        }
    }, [user, authLoading, router]);

  return (
    <div className="flex min-h-screen flex-col items-center bg-background text-foreground">
        {/* Header */}
        <header className="w-full px-8 py-4 flex justify-between items-center border-b">
             <div className="flex items-center gap-3">
                <Image
                    src="/logo.png"
                    alt="Logo Constructora"
                    width={40}
                    height={40}
                />
                <span className="font-bold text-xl tracking-tight">FerroActiva</span>
            </div>
            <div className="flex items-center gap-4">
                 <Button variant="ghost" asChild>
                    <Link href="/login">Iniciar Sesión</Link>
                </Button>
                <Button asChild>
                    <Link href="/login?action=register">
                        Registrarse <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </div>
        </header>

      

       <footer className="mt-12 mb-6 text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Teo Labs. Todos los derechos reservados.</p>
            <p className="mt-1">Una App desarrollada por <a href="https://teolabs.app" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary/80 hover:underline">teolabs.app</a></p>
        </footer>
    </div>
  );
}
