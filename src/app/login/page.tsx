
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAppState, useAuth } from "@/contexts/app-provider";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Warehouse, Loader2, AlertTriangle, Sparkles } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { UserRole } from "@/lib/data";

const SeedingCard = () => {
    const { seedInitialData } = useAppState();
    const [isSeeding, setIsSeeding] = React.useState(false);

    const handleSeed = async () => {
        setIsSeeding(true);
        try {
            await seedInitialData();
            // The onSnapshot listener will update the state automatically,
            // and the component will re-render.
        } catch(e) {
            console.error("Failed to seed data", e);
            // Here you could show a toast to the user
        } finally {
            setIsSeeding(false);
        }
    };

    return (
        <Card className="w-full max-w-sm border-primary/50">
            <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl font-bold">¡Primeros Pasos!</CardTitle>
                <CardDescription>
                    Parece que tu base de datos está vacía. ¡Creemos algunos datos de prueba para empezar!
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-center text-muted-foreground">
                    Esto creará usuarios, materiales y herramientas de ejemplo para que puedas probar la aplicación.
                </p>
            </CardContent>
            <CardFooter>
                 <Button
                    className="w-full"
                    onClick={handleSeed}
                    disabled={isSeeding}
                >
                    {isSeeding ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Creando datos...</> : "Crear Datos Iniciales"}
                </Button>
            </CardFooter>
        </Card>
    );
};


export default function LoginPage() {
  const router = useRouter();
  const { login, user, authLoading } = useAuth();
  const { users, error: appError, loading: appLoading } = useAppState();
  const [selectedUserId, setSelectedUserId] = React.useState<string>("");
  const [isLoggingIn, setIsLoggingIn] = React.useState(false);

  React.useEffect(() => {
    if (!authLoading && user) {
      router.push("/dashboard");
    }
  }, [user, authLoading, router]);

  const handleLogin = async () => {
    if (!selectedUserId) return;
    setIsLoggingIn(true);
    try {
      await login(selectedUserId);
    } catch (error) {
      console.error("Login failed:", error);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const getRoleDisplayName = (role: UserRole) => {
    switch (role) {
        case 'admin': return 'Administrador';
        case 'supervisor': return 'Supervisor';
        case 'worker': return 'Colaborador';
        case 'operations': return 'Jefe de Operaciones';
        default: return 'Usuario';
    }
  }
  
  if (authLoading || appLoading) {
    return (
       <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground mt-4">Cargando datos de la bodega...</p>
      </main>
    )
  }

  if (appError) {
     return (
       <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
         <Alert variant="destructive" className="max-w-md">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error de Conexión</AlertTitle>
            <AlertDescription>
                {appError}
            </AlertDescription>
         </Alert>
       </main>
     )
  }
  
  if (users.length === 0 && !appLoading) {
      return (
         <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
            <SeedingCard />
         </main>
      )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-sm border-border">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Warehouse className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Control de Bodega</CardTitle>
          <CardDescription>
            Inicia sesión para gestionar el inventario.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user-select">Selecciona tu usuario</Label>
            <Select
              value={selectedUserId}
              onValueChange={setSelectedUserId}
              disabled={isLoggingIn || users.length === 0}
            >
              <SelectTrigger id="user-select" className="w-full">
                <SelectValue placeholder={users.length > 0 ? "Selecciona un usuario" : "No hay usuarios..."} />
              </SelectTrigger>
              <SelectContent>
                {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                       <span className="font-medium">{user.name}</span>
                       <span className="text-muted-foreground ml-2 capitalize">({getRoleDisplayName(user.role)})</span>
                    </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            className="w-full"
            onClick={handleLogin}
            disabled={isLoggingIn || !selectedUserId || users.length === 0}
          >
            {isLoggingIn ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Ingresando...</> : "Ingresar"}
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
