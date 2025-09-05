
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
}


export function generatePurchaseOrderPDF(order: PurchaseOrder, supplier: Supplier) {
  const doc = new jsPDF();
  const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();

  // 1. Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('Solicitud de Cotización', pageWidth / 2, 25, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Constructora Ferro Activa y CIA. Ltda.', pageWidth - 20, 35, { align: 'right' });
  doc.text('Tucapel 578 Los Angeles', pageWidth - 20, 40, { align: 'right' });
  doc.text('RUT: 76.040.151-K', pageWidth - 20, 45, { align: 'right' });

  // 2. Obra y Solicitud Info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Obra: "File 721" - La Serena`, 20, 60);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Dirección de Obra: AV. 18 de Septiembre N 5543 - La Serena', 20, 66);
  
  doc.setFont('helvetica', 'bold');
  doc.text(`Solicitud N°: ${order.id}`, 20, 76);
  doc.setFont('helvetica', 'normal');
  doc.text(`Fecha: ${getDate(order.createdAt).toLocaleDateString('es-CL')}`, 20, 82);

  // 3. Supplier Information Box
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('PROVEEDOR:', 20, 95);
  doc.setFont('helvetica', 'normal');

  const supplierBoxY = 98;
  const supplierBox = [
    `Razón Social: ${supplier.name}`,
    'Dirección no disponible',
    'Contacto: No disponible'
  ];
  doc.text(supplierBox, 22, supplierBoxY + 5);
  doc.rect(20, supplierBoxY, 120, 20); // Draw rectangle around supplier info


  // 4. Items Table
  const tableColumn = ["Material", "Unidad", "Cantidad"];
  const tableRows: (string | number)[][] = [];

  order.items.forEach(item => {
    const itemData = [
      item.materialName,
      item.unit,
      item.totalQuantity.toLocaleString('es-CL'),
    ];
    tableRows.push(itemData);
  });

  doc.autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: 125,
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
    }
  });

  // Save the PDF
  doc.save(`Solicitud_Cotizacion_${order.id}.pdf`);
}