
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { PurchaseOrder, Supplier } from './data';
import { Timestamp } from 'firebase/firestore';


// Extend the jsPDF interface to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

const getDate = (date: Date | Timestamp) => {
  return date instanceof Timestamp ? date.toDate() : date;
};

const sanitizeFileName = (id: string) => id.replace(/[^a-zA-Z0-9-_]/g, '_');

export function generatePurchaseOrderPDF(order: PurchaseOrder, supplier: Supplier) {
  if (!order || !supplier || !order.items) {
    throw new Error('Datos de la orden o proveedor incompletos');
  }

  const doc = new jsPDF();
  const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
  const margin = 15;

  try {
    doc.addImage(logoBase64, 'PNG', margin, margin, 30, 30);
  } catch (e) {
    console.error('Error al añadir la imagen al PDF:', e);
    doc.text('Logo no disponible', margin, margin + 15);
  }
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('Solicitud de Cotización', pageWidth / 2, 25, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Constructora Ferro Activa y CIA. Ltda.', pageWidth - margin, 35, { align: 'right' });
  doc.text('Tucapel 578 Los Angeles', pageWidth - margin, 40, { align: 'right' });
  doc.text('RUT: 76.040.151-K', pageWidth - margin, 45, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Obra: "File 721" - La Serena`, margin, 60);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Dirección de Obra: AV. 18 de Septiembre N 5543 - La Serena', margin, 66);

  doc.setFont('helvetica', 'bold');
  doc.text(`Solicitud N°: ${order.id}`, margin, 76);
  doc.setFont('helvetica', 'normal');
  const createdAt = getDate(order.createdAt || new Date());
  doc.text(`Fecha: ${createdAt.toLocaleDateString('es-CL')}`, margin, 82);

  let startY = 95;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`PROVEEDOR:`, margin, startY);
  doc.setFont('helvetica', 'normal');
  doc.text(supplier.name || 'No disponible', margin + 28, startY);
  startY += 10;
  
  const tableColumn = ['Material', 'Unidad', 'Cantidad'];
  const tableRows: (string | number)[][] = [];

  order.items.forEach(item => {
    const itemData = [
      item.materialName || 'Sin nombre',
      item.unit || 'Sin unidad',
      item.totalQuantity ? item.totalQuantity.toLocaleString('es-CL') : '0',
    ];
    tableRows.push(itemData);
  });

  if (tableRows.length === 0) {
    doc.text('No hay ítems en esta solicitud', margin, startY);
  } else {
    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY,
      theme: 'grid',
      headStyles: {
        fillColor: [244, 124, 54],
        textColor: 255,
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 10,
        cellPadding: 2.5,
        lineWidth: 0.1,
        lineColor: 200,
      },
    });
  }

  doc.setFontSize(8);
  doc.text(`Generado el ${new Date().toLocaleDateString('es-CL')}`, margin, pageHeight - 10);

  doc.save(`Solicitud_Cotizacion_${sanitizeFileName(order.id)}.pdf`);
}
