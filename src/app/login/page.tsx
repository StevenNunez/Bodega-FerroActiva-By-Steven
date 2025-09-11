
"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/app-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Warehouse, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const router = useRouter();
  const { login, user, authLoading } = useAuth();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isLoggingIn, setIsLoggingIn] = React.useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    if (!authLoading && user) {
      router.push("/dashboard");
    }
  }, [user, authLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
        toast({ variant: 'destructive', title: 'Error', description: 'Por favor, completa todos los campos.' });
        return;
    }
    setIsLoggingIn(true);
    try {
      await login(email, password);
      // The useEffect above will handle redirection on successful login
    } catch (error: any) {
       let errorMessage = "Ocurrió un error al iniciar sesión.";
       if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
           errorMessage = "El correo electrónico o la contraseña son incorrectos.";
       }
       toast({ variant: 'destructive', title: 'Error de inicio de sesión', description: errorMessage });
    } finally {
      setIsLoggingIn(false);
    }
  };
  
  if (authLoading) {
    return (
       <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground mt-4">Cargando sesión...</p>
      </main>
    )
  }
  
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-sm border-border">
        <CardHeader className="text-center">
           <Image
              src="/logo.png"
              alt="Logo Constructora"
              width={100}
              height={100}
              className="mx-auto"
            />
          <CardTitle className="text-2xl font-bold pt-4">Constructora FerroActiva</CardTitle>
          <CardDescription>
            Inicia sesión para gestionar el inventario.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input
                id="email"
                type="email"
                placeholder="usuario@constructora.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoggingIn}
                />
            </div>
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label htmlFor="password">Contraseña</Label>
                    <Button asChild variant="link" className="px-0 text-xs h-auto py-1 text-muted-foreground">
                        <Link href="/reset-password">
                            ¿Olvidaste tu contraseña?
                        </Link>
                    </Button>
                </div>
                <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoggingIn}
                />
            </div>
            </CardContent>
            <CardFooter>
            <Button
                type="submit"
                className="w-full"
                disabled={isLoggingIn || !email || !password}
            >
                {isLoggingIn ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Ingresando...</> : "Ingresar"}
            </Button>
            </CardFooter>
        </form>
      </Card>
    </main>
  );
}
