
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { PurchaseOrder, Supplier } from './data';
import { Timestamp } from 'firebase/firestore';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

async function getBase64FromUrl(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Network response was not ok, status: ${response.status}`);
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
      console.error("Error fetching logo:", error);
      return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
  }
}


const getDate = (date: Date | Timestamp) =>
  date instanceof Timestamp ? date.toDate() : date;

const sanitizeFileName = (name: string) =>
  name.replace(/[^a-zA-Z0-9-_]/g, '_');

export async function generatePurchaseOrderPDF(order: PurchaseOrder, supplier: Supplier, orderIndex: number) {
  if (!order || !supplier || !order.items) {
    throw new Error('Datos de la orden o proveedor incompletos');
  }

  const COLORS = {
    primary: '#2980b9',
    secondary: '#7f8c8d',
    text: '#34495e',
    lightGray: '#ecf0f1',
    white: '#ffffff',
  };
  const LINE_HEIGHT = 7;

  const logoUrl = '/logopdf.jpg';
  const logoBase64 = await getBase64FromUrl(logoUrl);

  const doc = new jsPDF();
  const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = margin;

  doc.addImage(logoBase64, 'JPEG', margin, y, 20, 20);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(COLORS.text);
  doc.text('SOLICITUD DE COTIZACIÓN', pageWidth / 2, y + 15, { align: 'center' });
  y += 25;
  
  doc.setDrawColor(COLORS.lightGray);
  doc.setLineWidth(0.2);
  doc.line(margin, y, pageWidth - margin, y);
  y += LINE_HEIGHT;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Constructora Ferro Activa y CIA. Ltda.', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text('RUT: 76.040.151-K', margin, y += LINE_HEIGHT - 2);
  doc.text('Tucapel 578, Los Ángeles', margin, y += LINE_HEIGHT - 2);
  
  const orderDate = getDate(order.createdAt || new Date());
  doc.setFont('helvetica', 'bold');
  doc.text('SOLICITUD N°:', pageWidth - margin, y - (LINE_HEIGHT * 2) + 2, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(String(orderIndex).padStart(3, '0'), pageWidth - margin, y - LINE_HEIGHT + 2, { align: 'right' });
  
  doc.setFont('helvetica', 'bold');
  doc.text('FECHA:', pageWidth - margin, y + 2, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(orderDate.toLocaleDateString('es-CL'), pageWidth - margin, y + LINE_HEIGHT - 1, { align: 'right' });

  y += LINE_HEIGHT * 2;
  doc.line(margin, y, pageWidth - margin, y);
  y += LINE_HEIGHT;

  doc.setFont('helvetica', 'bold');
  doc.text('PROVEEDOR:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(supplier.name, margin + 30, y);

  doc.setFont('helvetica', 'bold');
  doc.text('OBRA:', pageWidth / 2, y);
  doc.setFont('helvetica', 'normal');
  doc.text('"File 721" - La Serena', pageWidth / 2 + 15, y);

  y += LINE_HEIGHT;
  if(supplier.address) doc.text(supplier.address, margin + 30, y);
  doc.text('Av. 18 de Septiembre N° 5543', pageWidth / 2 + 15, y);

  y += LINE_HEIGHT;
  doc.setLineWidth(0.5);
  doc.setDrawColor(COLORS.secondary);
  doc.line(margin, y, pageWidth - margin, y);
  y += LINE_HEIGHT;

  const tableColumn = ['Ítem', 'Material', 'Unidad', 'Cantidad'];
  const tableRows = order.items.map((item, index) => [
    index + 1,
    item.materialName || 'Sin nombre',
    item.unit || 'Sin unidad',
    item.totalQuantity ? item.totalQuantity.toLocaleString('es-CL') : '0',
  ]);

  doc.autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: y,
    theme: 'grid',
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontStyle: 'bold',
      halign: 'center',
    },
    styles: {
      fontSize: 9,
      cellPadding: 2,
      lineColor: [200, 200, 200],
      lineWidth: 0.1,
    },
    columnStyles: {
        0: { halign: 'center', cellWidth: 15 },
        2: { halign: 'center', cellWidth: 20 },
        3: { halign: 'right', cellWidth: 25 },
    }
  });

  y = (doc as any).lastAutoTable.finalY + 15;

  const signatureY = pageHeight - 50;
  y = Math.max(y, signatureY - 10);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setDrawColor(COLORS.text);
  doc.line(pageWidth / 2 - 40, signatureY, pageWidth / 2 + 40, signatureY);
  doc.text('Firma Autorizada', pageWidth / 2, signatureY + 5, { align: 'center' });
  
  doc.setFontSize(8);
  doc.setTextColor(COLORS.secondary);
  doc.text(`Página 1 de 1`, pageWidth - margin, pageHeight - 10, { align: 'right' });
  doc.text(`Documento generado el ${new Date().toLocaleString('es-CL')}`, margin, pageHeight - 10);
  
  // Footer centrado con enlace
  const developedByText = 'desarrollado por ';
  const linkText = 'teolabs.app';
  const fullText = developedByText + linkText;
  const textWidth = doc.getTextWidth(fullText);
  const textX = (pageWidth - textWidth) / 2;
  doc.text(developedByText, textX, pageHeight - 10);
  doc.textWithLink(linkText, textX + doc.getTextWidth(developedByText), pageHeight - 10, { url: 'https://teolabs.app' });


  const safeFilename = `Solicitud_Cotizacion_${String(orderIndex).padStart(3, '0')}_${orderDate.toISOString().split('T')[0]}.pdf`;
  doc.save(safeFilename);
}
