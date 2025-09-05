
"use client";

import { PageHeader } from "@/components/page-header";
import { useAppState, useAuth } from "@/contexts/app-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench, Calendar, Loader2 } from "lucide-react";
import { Timestamp } from "firebase/firestore";

export default function WorkerPage() {
  const { user } = useAuth();
  const { toolLogs, tools, loading } = useAppState();

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const myCheckedOutTools = toolLogs.filter(
    (log) => log.workerId === user?.id && log.returnDate === null
  );

  const getDate = (date: Date | Timestamp | null | undefined) => {
      if (!date) return null;
      return date instanceof Timestamp ? date.toDate() : date;
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={`Bienvenido, ${user?.name}`}
        description="Aquí puedes ver las herramientas que tienes a tu cargo."
      />
      <Card>
        <CardHeader>
          <CardTitle>Herramientas en mi poder</CardTitle>
          <CardDescription>
            Actualmente tienes {myCheckedOutTools.length} herramienta(s) bajo tu
            responsabilidad.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {myCheckedOutTools.length > 0 ? (
            <ul className="space-y-3">
              {myCheckedOutTools.map((log) => {
                const tool = tools.find((t) => t.id === log.toolId);
                const checkoutDate = getDate(log.checkoutDate);
                return (
                  <li
                    key={log.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-lg border p-4 gap-2"
                  >
                    <div className="flex items-center gap-3">
                      <Wrench className="h-5 w-5 text-primary" />
                      <span className="font-semibold">{tool?.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2 sm:mt-0">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Retirado el:{" "}
                        {checkoutDate ? checkoutDate.toLocaleDateString() : 'Fecha no disponible'}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center">
                <Wrench className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">
                No tienes herramientas
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Cuando retires una herramienta de la bodega, aparecerá aquí.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}