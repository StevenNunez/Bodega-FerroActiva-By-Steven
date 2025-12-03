
"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { useAppState } from "@/modules/core/contexts/app-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, MoreHorizontal, Edit, Loader2, QrCode } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Tool as ToolType, ToolLog, User } from "@/modules/core/lib/data";
import { cn } from "@/lib/utils";
import { QRCodeSVG } from "qrcode.react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { EditToolForm } from "@/components/admin/edit-tool-form";
import { ToolCheckoutCard } from "@/components/admin/tool-checkout-card";
import { useToast } from "@/modules/core/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";


export default function AdminToolsPage() {
  const { users, toolLogs, tools, deleteTool, isLoading, can } = useAppState();
  const [editingTool, setEditingTool] = useState<ToolType | null>(null);
  const [toolSearchTerm, setToolSearchTerm] = useState("");
  const [toolStatusFilter, setToolStatusFilter] = useState<"all" | "Disponible" | "Ocupado">("all");
  const [toolPage, setToolPage] = useState(1);
  const itemsPerPage = 5;
  const { toast } = useToast();
  
  const canDeleteTools = can('tools:delete');

  const checkedOutTools = useMemo(() => new Map((toolLogs || []).filter((log: ToolLog) => log.returnDate === null).map((log: ToolLog) => [log.toolId, log])), [toolLogs]);

  const getToolCheckoutInfo = useMemo(() => {
    const workerMap = new Map((users || []).map((u: User) => [u.id, u.name]));
    return (toolId: string) => {
      const log: ToolLog | undefined = checkedOutTools.get(toolId);
      if (!log) return { status: "Disponible" as const, workerName: null };
      
      const workerName = workerMap.get(log.userId) ?? log.userName ?? "N/A";
      
      return { status: "Ocupado" as const, workerName };
    };
  }, [checkedOutTools, users]);

  const filteredTools = useMemo(() => {
    let filtered: ToolType[] = tools || [];
    if (toolSearchTerm) {
      filtered = filtered.filter(tool => 
        tool.name.toLowerCase().includes(toolSearchTerm.toLowerCase())
      );
    }
    if (toolStatusFilter !== "all") {
      filtered = filtered.filter((tool) => getToolCheckoutInfo(tool.id).status === toolStatusFilter);
    }
    return filtered;
  }, [tools, toolStatusFilter, getToolCheckoutInfo, toolSearchTerm]);

  const paginatedTools = filteredTools.slice((toolPage - 1) * itemsPerPage, toolPage * itemsPerPage);
  const totalToolPages = Math.ceil(filteredTools.length / itemsPerPage);


  const handleDeleteTool = async (toolId: string, toolName: string) => {
    try {
      await deleteTool(toolId);
      toast({
        title: "Herramienta Eliminada",
        description: `La herramienta ${toolName} ha sido eliminada correctamente.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error al eliminar",
        description: error instanceof Error ? error.message : "No se pudo eliminar la herramienta.",
      });
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Gestión de Herramientas" description="Administra el inventario y el ciclo de vida de las herramientas." />

      {editingTool && (
        <EditToolForm tool={editingTool} isOpen={!!editingTool} onClose={() => setEditingTool(null)} />
      )}

      <ToolCheckoutCard />

      <div className="grid grid-cols-1 gap-8">
        <div className="space-y-8">
          <Card className="!max-w-none">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <CardTitle>Inventario de Herramientas</CardTitle>
                    <CardDescription>Lista completa de todas las herramientas y su estado actual.</CardDescription>
                  </div>
                  <Button asChild>
                      <Link href="/dashboard/admin/tools/print-qrs">
                          <QrCode className="mr-2 h-4 w-4" />
                          Imprimir Códigos QR
                      </Link>
                  </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-6 space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    <Input 
                      placeholder="Buscar herramienta por nombre..."
                      value={toolSearchTerm}
                      onChange={(e) => setToolSearchTerm(e.target.value)}
                      className="flex-grow"
                    />
                    <div className="w-full sm:w-[180px]">
                      <Select
                        value={toolStatusFilter}
                        onValueChange={(value) => {
                          setToolStatusFilter(value as "all" | "Disponible" | "Ocupado");
                          setToolPage(1);
                        }}
                      >
                        <SelectTrigger id="tool-status-filter" aria-label="Filtrar por estado">
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="Disponible">Disponible</SelectItem>
                          <SelectItem value="Ocupado">Ocupado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                </div>
                <div className="relative overflow-x-auto max-w-full">
                  <div className="min-w-[800px]">
                    <Table>
                      <TableHeader className="sticky top-0 bg-card">
                        <TableRow>
                          <TableHead className="w-[200px]">Nombre</TableHead>
                          <TableHead className="w-[100px]">Código QR</TableHead>
                          <TableHead className="w-[150px]">Estado</TableHead>
                          <TableHead className="w-[200px]">En posesión de</TableHead>
                          <TableHead className="w-[150px] text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                                </TableCell>
                            </TableRow>
                        ) : paginatedTools.length > 0 ? (
                          paginatedTools.map((tool) => {
                            const checkoutInfo = getToolCheckoutInfo(tool.id);
                            return (
                              <TableRow key={tool.id}>
                                <TableCell className="font-medium max-w-[200px] truncate">{tool.name}</TableCell>
                                <TableCell>
                                  <div className="p-1 bg-white rounded-md w-fit">
                                    <QRCodeSVG value={tool.qrCode} size={40} />
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    className={cn(
                                      checkoutInfo.status === "Disponible" ? "bg-green-600 hover:bg-green-700" : "bg-orange-600 hover:bg-orange-700",
                                      "text-white"
                                    )}
                                  >
                                    {checkoutInfo.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {checkoutInfo.workerName ?? "---"}
                                </TableCell>
                                <TableCell className="text-right">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" className="h-8 w-8 p-0" aria-label={`Abrir menú para ${tool.name}`}>
                                        <span className="sr-only">Abrir menú</span>
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => setEditingTool(tool)}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        <span>Editar</span>
                                      </DropdownMenuItem>
                                      {canDeleteTools && (
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                            <DropdownMenuItem
                                                onSelect={(e) => e.preventDefault()}
                                                disabled={checkoutInfo.status !== "Disponible"}
                                                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                <span>Eliminar</span>
                                            </DropdownMenuItem>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>¿Estás seguro de eliminar {tool.name}?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                Esta acción no se puede deshacer. Se eliminará permanentemente la herramienta de la base de datos.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction
                                                className="bg-destructive hover:bg-destructive/90"
                                                onClick={() => handleDeleteTool(tool.id, tool.name)}
                                                >
                                                Sí, eliminar herramienta
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                              No se encontraron herramientas.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
                {totalToolPages > 1 && (
                  <div className="flex justify-between items-center mt-4 px-6 pb-6">
                    <Button
                      variant="outline"
                      disabled={toolPage === 1}
                      onClick={() => setToolPage((prev) => prev - 1)}
                      aria-label="Página anterior de herramientas"
                    >
                      Anterior
                    </Button>
                    <span>
                      Página {toolPage} de {totalToolPages}
                    </span>
                    <Button
                      variant="outline"
                      disabled={toolPage === totalToolPages}
                      onClick={() => setToolPage((prev) => prev + 1)}
                      aria-label="Página siguiente de herramientas"
                    >
                      Siguiente
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
