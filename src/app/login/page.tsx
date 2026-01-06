
"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
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
import { Loader2, User } from "lucide-react";
import { useToast } from "@/modules/core/hooks/use-toast";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/modules/core/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { Separator } from "@/components/ui/separator";

enum FormState {
  LOGIN,
  REGISTER,
}

function LoginWrapper() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, user, authLoading } = useAuth();
  
  const initialAction = searchParams.get('action');
  const initialPlan = searchParams.get('plan');
  
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formState, setFormState] = React.useState<FormState>(initialAction === 'register' ? FormState.REGISTER : FormState.LOGIN);
  
  const { toast } = useToast();

  React.useEffect(() => {
    if (!authLoading && user) {
      router.push("/dashboard");
    }
  }, [user, authLoading, router]);
  
  const createUserDocument = async (authUser: any, isDemo = false, plan = 'basic') => {
      const qrCode = `USER-${authUser.uid}`;
      const userDocRef = doc(db, "users", authUser.uid);
      await setDoc(userDocRef, {
          id: authUser.uid,
          name: isDemo ? "Usuario Demo" : email.split('@')[0],
          email: authUser.email,
          role: isDemo ? 'admin' : 'admin', // Demo user is admin of their own tenant
          tenantId: authUser.uid, // Each new user gets their own tenant
          qrCode: qrCode,
          isDemoUser: isDemo,
      });

      const tenantDocRef = doc(db, "tenants", authUser.uid);
      await setDoc(tenantDocRef, {
        id: authUser.uid,
        tenantId: authUser.uid,
        name: isDemo ? `Empresa Demo` : `${email.split('@')[0]}'s Company`,
        plan: isDemo ? 'pro' : (plan || 'basic'),
        createdAt: new Date(),
      });
  }

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ variant: 'destructive', title: 'Error', description: 'Por favor, completa todos los campos.' });
      return;
    }
    setIsSubmitting(true);
    try {
      await login(email, password);
      // The useEffect above will handle redirection
    } catch (error: any) {
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
          toast({ variant: 'destructive', title: 'Error de inicio de sesión', description: "El correo electrónico o la contraseña son incorrectos." });
        } else {
            console.error("Login Error:", error);
            toast({ variant: 'destructive', title: 'Error de inicio de sesión', description: "Ocurrió un error inesperado." });
        }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuestLogin = async () => {
    setIsSubmitting(true);
    const demoEmail = 'demo@ferroactiva.cl';
    const demoPassword = 'demodemo';
    
    try {
      await login(demoEmail, demoPassword);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        // User doesn't exist, let's create it
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, demoEmail, demoPassword);
          await createUserDocument(userCredential.user, true, 'pro');
          // Now, try logging in again
          await login(demoEmail, demoPassword);
           toast({ title: '¡Modo Demo Activado!', description: 'Hemos creado un usuario de demostración para ti.' });
        } catch (creationError: any) {
          toast({ variant: 'destructive', title: 'Error Crítico', description: `No se pudo crear ni acceder al modo demo. ${creationError.message}` });
        }
      } else {
        toast({ variant: 'destructive', title: 'Error Modo Demo', description: 'No se pudo iniciar sesión como invitado.' });
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
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await createUserDocument(userCredential.user, false, initialPlan || 'basic');

      toast({
        title: "¡Cuenta Creada!",
        description: "Tu cuenta ha sido creada. Ahora puedes iniciar sesión.",
      });
      
      router.push('/login');

    } catch (error: any) {
      let errorMessage = "No se pudo crear la cuenta.";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Este correo ya tiene una cuenta activa. Intenta iniciar sesión.';
        setFormState(FormState.LOGIN);
      }
      toast({ variant: 'destructive', title: 'Error de Registro', description: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };


  if (authLoading || user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  const renderContent = () => {
    switch (formState) {
        case FormState.LOGIN:
            return (
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
                    <CardFooter className="flex flex-col gap-4">
                    <Button type="submit" className="w-full" disabled={isSubmitting || !email || !password}>
                        {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Ingresando...</> : "Ingresar"}
                    </Button>
                    <div className="relative w-full">
                        <Separator />
                        <span className="absolute left-1/2 -translate-x-1/2 -top-2 bg-card px-2 text-xs text-muted-foreground">O</span>
                    </div>
                    <Button type="button" variant="outline" className="w-full" onClick={handleGuestLogin} disabled={isSubmitting}>
                        <User className="mr-2 h-4 w-4" /> Entrar como Invitado
                    </Button>
                     <p className="text-center text-sm text-muted-foreground">
                        ¿No tienes una cuenta?{" "}
                        <Button variant="link" type="button" className="p-0 h-auto" onClick={() => setFormState(FormState.REGISTER)}>
                            Regístrate aquí
                        </Button>
                    </p>
                    </CardFooter>
                </form>
            );
        
        case FormState.REGISTER:
             return (
                <form onSubmit={handleRegisterSubmit}>
                    <CardHeader className="text-center">
                    <Image src="/logo.png" alt="Logo Constructora" width={100} height={100} className="mx-auto" />
                    <CardTitle className="text-2xl font-bold pt-4">Crear una Cuenta</CardTitle>
                    <CardDescription>
                        Bienvenido. Completa tus datos para registrarte.
                        {initialPlan && <p className="font-bold text-primary mt-2">Plan Seleccionado: {initialPlan.charAt(0).toUpperCase() + initialPlan.slice(1)}</p>}
                    </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                          <Label htmlFor="reg-email">Correo Electrónico</Label>
                          <Input id="reg-email" type="email" placeholder="tu@correo.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isSubmitting} />
                      </div>
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
                    <Button type="submit" className="w-full" disabled={isSubmitting || !email || !password || !confirmPassword}>
                        {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creando cuenta...</> : "Crear Cuenta"}
                    </Button>
                    <p className="text-center text-sm text-muted-foreground">
                        ¿Ya tienes una cuenta?{" "}
                        <Button variant="link" type="button" className="p-0 h-auto" onClick={() => setFormState(FormState.LOGIN)}>
                           Inicia sesión
                        </Button>
                    </p>
                    </CardFooter>
                </form>
             );
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-sm border-border">
          {renderContent()}
      </Card>
    </main>
  );
}


export default function LoginPage() {
  return (
    <React.Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <LoginWrapper />
    </React.Suspense>
  );
}
