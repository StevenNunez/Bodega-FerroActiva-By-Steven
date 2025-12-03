"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/modules/auth/useAuth";
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
import { useToast } from "@/modules/core/hooks/use-toast";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/modules/core/lib/firebase";

enum LoginState {
  LOGIN,
  REGISTER_INVITED,
}

export default function LoginPage() {
  const router = useRouter();
  const { login, user, authLoading } = useAuth();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { toast } = useToast();
  const [loginState, setLoginState] = React.useState<LoginState>(LoginState.LOGIN);

  React.useEffect(() => {
    if (!authLoading && user) {
      router.push("/dashboard");
    }
  }, [user, authLoading, router]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ variant: 'destructive', title: 'Error', description: 'Por favor, completa todos los campos.' });
      return;
    }
    setIsSubmitting(true);
    try {
      await login(email, password);
      // The useEffect above will handle redirection on successful login
    } catch (error: any) {
        if (error.code === 'auth/invited-user-no-account') {
          setLoginState(LoginState.REGISTER_INVITED);
          toast({
            title: "Bienvenido, has sido invitado",
            description: "Por favor, crea una contraseña para activar tu cuenta.",
          });
        } else if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
          toast({ variant: 'destructive', title: 'Error de inicio de sesión', description: "El correo electrónico o la contraseña son incorrectos." });
        } else {
            console.error("Login Error:", error);
            toast({ variant: 'destructive', title: 'Error de inicio de sesión', description: "Ocurrió un error inesperado." });
        }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ variant: 'destructive', title: 'Error', description: 'Las contraseñas no coinciden.' });
      return;
    }
    setIsSubmitting(true);
    try {
      // Create the auth user
      await createUserWithEmailAndPassword(auth, email, password);
      // The onAuthStateChanged listener in the provider will handle the rest
      toast({
        title: "¡Cuenta Activada!",
        description: "Iniciando sesión con tu nueva cuenta.",
      });
      // Let the main auth listener handle the redirect
    } catch (error: any) {
      let errorMessage = "No se pudo crear la cuenta.";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Este correo ya tiene una cuenta activa. Intenta iniciar sesión.';
      }
      toast({ variant: 'destructive', title: 'Error de Registro', description: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  // If auth is loading, or user is already logged in, the DashboardLayout will show a loader.
  // This page should just render its content.
  if (authLoading || user) {
    return null; // Render nothing, the layout will handle the loader/redirect
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-sm border-border">
        {loginState === LoginState.LOGIN && (
          <form onSubmit={handleLoginSubmit}>
            <CardHeader className="text-center">
              <Image src="/logo.png" alt="Logo Constructora" width={100} height={100} className="mx-auto" />
              <CardTitle className="text-2xl font-bold pt-4">Control de Bodega</CardTitle>
              <CardDescription>Inicia sesión para gestionar el inventario.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input id="email" type="email" placeholder="usuario@constructora.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isSubmitting} />
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
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={isSubmitting} />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isSubmitting || !email || !password}>
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Ingresando...</> : "Ingresar"}
              </Button>
            </CardFooter>
          </form>
        )}

        {loginState === LoginState.REGISTER_INVITED && (
          <form onSubmit={handleRegisterSubmit}>
            <CardHeader className="text-center">
              <Image src="/logo.png" alt="Logo Constructora" width={100} height={100} className="mx-auto" />
              <CardTitle className="text-2xl font-bold pt-4">Activa Tu Cuenta</CardTitle>
              <CardDescription>Estás a un paso. Crea tu contraseña para el correo <span className="font-bold text-primary">{email}</span>.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reg-password">Nueva Contraseña</Label>
                <Input id="reg-password" type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} disabled={isSubmitting} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-confirm-password">Confirmar Contraseña</Label>
                <Input id="reg-confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={isSubmitting} />
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-4">
              <Button type="submit" className="w-full" disabled={isSubmitting || !password || !confirmPassword}>
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Activando...</> : "Activar y Entrar"}
              </Button>
              <Button variant="link" onClick={() => setLoginState(LoginState.LOGIN)}>Volver a inicio de sesión</Button>
            </CardFooter>
          </form>
        )}
      </Card>
    </main>
  );
}
