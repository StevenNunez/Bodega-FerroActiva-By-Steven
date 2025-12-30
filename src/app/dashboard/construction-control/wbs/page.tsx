'use client';

import React, { useMemo, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { useAuth, useAppState } from '@/modules/core/contexts/app-provider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  History,
  FolderTree,
  Send,
  Search,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { WorkItem, ProgressLog } from '@/modules/core/lib/data';
import { CreateWorkItemForm } from '@/components/operations/create-work-item-form';
import { RegisterProgressForm } from '@/components/operations/register-progress-form';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useToast } from '@/modules/core/hooks/use-toast';

type TreeWorkItem = WorkItem & { children: TreeWorkItem[] };

const buildTree = (items: WorkItem[]): TreeWorkItem[] => {
  const itemMap = new Map<string, TreeWorkItem>();
  const roots: TreeWorkItem[] = [];

  items.forEach(item => {
    itemMap.set(item.id, { ...item, children: [] });
  });

  items.forEach(item => {
    const node = itemMap.get(item.id)!;
    if (item.parentId && itemMap.has(item.parentId)) {
      itemMap.get(item.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortRecursive = (nodes: TreeWorkItem[]) => {
    nodes.sort((a, b) => a.path.localeCompare(b.path));
    nodes.forEach(n => sortRecursive(n.children));
  };

  sortRecursive(roots);
  return roots;
};


const WorkItemNode = ({
  node,
  workItems, // Recibe la lista completa para buscar la data más fresca
  level = 0,
  onSelect,
  selectedId,
}: {
  node: TreeWorkItem;
  workItems: WorkItem[];
  level?: number;
  onSelect: (item: WorkItem) => void;
  selectedId: string | null;
}) => {
  const [isExpanded, setIsExpanded] = useState(level < 2);
  const hasChildren = node.children.length > 0;

  // Busca el item más actualizado desde el estado global que pasamos como prop
  const currentItem = useMemo(() => {
    return workItems?.find(item => item.id === node.id) || node;
  }, [workItems, node.id]);
  
  const progress = currentItem.progress || 0;

  return (
    <div style={{ paddingLeft: `${level * 1}rem` }} className="space-y-1">
      <div
        onClick={() => onSelect(currentItem)}
        className={cn(
          'flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer transition-colors group',
          selectedId === node.id
            ? 'bg-primary/20'
            : 'hover:bg-muted/50'
        )}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-0.5 rounded-md hover:bg-muted-foreground/10"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        ) : (
          <div className="w-5" />
        )}
        <div className="flex-grow truncate flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground w-16 shrink-0 group-hover:text-primary transition-colors">
            {node.path}
            </span>
            <div className="flex-grow truncate">
                <p className="truncate text-sm font-medium">{node.name}</p>
                 <Progress value={progress} className="h-1 mt-1 bg-muted/50" />
            </div>
        </div>
        <span className={cn(
            "text-xs font-mono rounded px-2 py-1",
            progress >= 100 ? "bg-green-100 text-green-700 font-bold" : "bg-muted/80"
        )}>
          {progress.toFixed(2)}%
        </span>
      </div>
      {hasChildren && isExpanded && (
        <div className="pl-3">
          {node.children.map((child) => (
            <WorkItemNode
              key={child.id}
              node={child}
              workItems={workItems} // Pasa la lista completa hacia abajo
              level={level + 1}
              onSelect={onSelect}
              selectedId={selectedId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const WorkItemTree = ({ workItems, onSelect, selectedId }: { workItems: WorkItem[], onSelect: (item: WorkItem) => void, selectedId: string | null }) => {
    const tree = useMemo(() => buildTree(workItems || []), [workItems]);

    return (
        <ScrollArea className="h-[500px] border rounded-md">
            <div className="p-2 space-y-1">
                {tree.map((node) => (
                    <WorkItemNode
                        key={node.id}
                        node={node}
                        workItems={workItems}
                        onSelect={onSelect}
                        selectedId={selectedId}
                    />
                ))}
            </div>
        </ScrollArea>
    );
};


export default function ConstructionWBSPage() {
  const { can } = useAuth();
  const { workItems, isLoading, progressLogs, submitForQualityReview } = useAppState();
  const [selectedItem, setSelectedItem] = useState<WorkItem | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmittingProtocol, setIsSubmittingProtocol] = useState(false);
  const { toast } = useToast();

  const filteredItems = useMemo(() => {
    if (!workItems) return [];
    if (!searchTerm) return workItems;
    const lowerTerm = searchTerm.toLowerCase();
    
    // Si hay búsqueda, aplanamos el árbol para mostrar solo coincidencias
    return workItems.filter(item => 
        item.name.toLowerCase().includes(lowerTerm) ||
        item.path.toLowerCase().includes(lowerTerm)
    );
  }, [workItems, searchTerm]);

  const tree = useMemo(() => buildTree(filteredItems), [filteredItems]);


  const selectedItemLogs = useMemo(() => {
    if (!selectedItem || !progressLogs) return [];
    return progressLogs
      .filter((log: ProgressLog) => log.workItemId === selectedItem.id)
      .sort((a, b) => {
        const dateA = a.date instanceof Timestamp ? a.date.toDate() : new Date(a.date);
        const dateB = b.date instanceof Timestamp ? b.date.toDate() : new Date(b.date);
        return dateB.getTime() - dateA.getTime();
      });
  }, [selectedItem, progressLogs]);

  if (!can('module_construction_control:view')) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Acceso Denegado</AlertTitle>
        <AlertDescription>
          No tienes los permisos necesarios para acceder a este módulo.
        </AlertDescription>
      </Alert>
    );
  }
  
  const handleSendToProtocol = async () => {
    if (!selectedItem) return;
    setIsSubmittingProtocol(true);
    try {
        await submitForQualityReview(selectedItem.id); 
        toast({
            title: 'Enviado a Protocolo',
            description: `La partida "${selectedItem.name}" ha sido enviada para revisión de calidad.`
        });
    } catch(error: any) {
        toast({
            variant: 'destructive',
            title: 'Error al Enviar',
            description: error.message || 'No se pudo enviar la partida a revisión.'
        });
    } finally {
        setIsSubmittingProtocol(false);
    }
  };


  const formatDate = (date: Date | Timestamp | undefined) => {
    if (!date) return 'N/A';
    const jsDate = date instanceof Timestamp ? date.toDate() : date;
    return format(jsDate, "d 'de' MMMM, yyyy", { locale: es });
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Partidas de Obra (EDT)"
        description="Gestiona la estructura de desglose del trabajo y registra el avance físico."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Columna Izquierda: Estructura y Creación */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2"><FolderTree className="h-5 w-5 text-primary"/> Estructura de la Obra (EDT)</CardTitle>
               <div className="relative pt-2">
                  <Search className="absolute left-2.5 top-4 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Buscar partida por nombre o código..." 
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (filteredItems || []).length > 0 ? (
                <WorkItemTree
                    workItems={filteredItems || []}
                    onSelect={setSelectedItem}
                    selectedId={selectedItem?.id || null}
                />
              ) : (
                <p className="text-muted-foreground text-center py-10">
                  No hay estructura de obra definida.
                </p>
              )}
            </CardContent>
          </Card>

          {can('construction_control:edit_structure') && (
            <Card>
              <CardHeader>
                <CardTitle>Añadir Partida/Actividad</CardTitle>
                <CardDescription>
                  Construye la estructura de desglose de la obra.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CreateWorkItemForm workItems={workItems || []} />
              </CardContent>
            </Card>
          )}

        </div>

        {/* Columna Derecha: Detalle y Avance */}
        <div className="lg:col-span-2 sticky top-8">
          <Card className="min-h-[70vh]">
            <CardHeader>
              <CardTitle>Detalle y Avance</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col">
              {selectedItem ? (
                <div className="w-full space-y-6 flex-1 flex flex-col">
                    <div>
                        <h3 className="text-lg font-semibold text-primary">{selectedItem.name}</h3>
                        <p className="text-sm text-muted-foreground">Ruta: {selectedItem.path}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 border p-4 rounded-lg">
                        <p><strong>Unidad:</strong> {selectedItem.unit}</p>
                        <p><strong>Cantidad:</strong> {selectedItem.quantity.toLocaleString()}</p>
                        <p><strong>Precio Unitario:</strong> ${selectedItem.unitPrice.toLocaleString()}</p>
                        <p><strong>Costo Total:</strong> ${(selectedItem.quantity * selectedItem.unitPrice).toLocaleString()}</p>
                    </div>
                    
                    { selectedItem.progress < 100 && selectedItem.status !== 'pending-quality-review' ? (
                       <RegisterProgressForm workItem={selectedItem} />
                    ) : (
                        <div className="py-4">
                            {selectedItem.status === 'pending-quality-review' ? (
                                 <Alert className="bg-blue-50 border-blue-200 text-blue-800 [&>svg]:text-blue-600">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>Pendiente de Revisión</AlertTitle>
                                    <AlertDescription>
                                        Esta partida ya fue enviada a Calidad y está esperando aprobación.
                                    </AlertDescription>
                                </Alert>
                            ) : (
                                <>
                                 <Alert className="bg-green-50 border-green-200 text-green-800 [&>svg]:text-green-600">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>Partida Completada</AlertTitle>
                                    <AlertDescription>
                                        Esta partida ha alcanzado el 100% de su avance.
                                    </AlertDescription>
                                </Alert>
                                <div className="mt-4 text-center">
                                    <Button onClick={handleSendToProtocol} disabled={isSubmittingProtocol}>
                                        {isSubmittingProtocol ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4" />}
                                        Enviar a Revisión de Calidad
                                    </Button>
                                </div>
                                </>
                            )}
                        </div>
                    )}


                    <Card className="mt-6 flex-1 flex flex-col">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2"><History className="h-5 w-5"/> Historial de Avances</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-hidden">
                          <ScrollArea className="h-full max-h-60">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Fecha</TableHead>
                                  <TableHead className="text-right">Cantidad</TableHead>
                                  <TableHead>Usuario</TableHead>
                                  <TableHead>Observaciones</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {selectedItemLogs.length > 0 ? (
                                  selectedItemLogs.map(log => (
                                    <TableRow key={log.id}>
                                      <TableCell>{formatDate(log.date)}</TableCell>
                                      <TableCell className="text-right font-mono">{log.quantity.toLocaleString()}</TableCell>
                                      <TableCell>{log.userName}</TableCell>
                                      <TableCell className="text-xs text-muted-foreground">{log.observations}</TableCell>
                                    </TableRow>
                                  ))
                                ) : (
                                  <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                                      No hay registros de avance para esta partida.
                                    </TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center min-h-[40vh]">
                    <p className="text-muted-foreground text-center">
                    Selecciona un ítem de la estructura para ver sus detalles y
                    registrar el avance.
                    </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
