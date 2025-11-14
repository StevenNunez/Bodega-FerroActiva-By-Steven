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
} from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/modules/core/contexts/app-provider";
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
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-lg border-border text-center">
        <CardHeader>
           <Image
              src="/logo.png"
              alt="Logo Constructora"
              width={120}
              height={120}
              className="mx-auto"
            />
          <CardTitle className="text-4xl font-bold tracking-tight pt-4">
            Bodega APP
          </CardTitle>
          <CardDescription className="text-xl pt-2 font-medium text-muted-foreground">
            Constructora FerroActiva
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Inicia sesión para gestionar el inventario de herramientas y materiales.
          </p>
          <div className="mt-8">
            <Button asChild size="lg">
              <Link href="/login">
                Ir al Login
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
       <footer className="mt-8 text-center text-sm text-muted-foreground">
            <p>desarrollado por stvn</p>
        </footer>
    </main>
  );
}
