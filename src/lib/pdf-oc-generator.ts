
// lib/pdf-oc-generator.ts
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// Helper para obtener el logo y manejar errores
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
    // Devuelve una imagen transparente de 1x1 pixel como fallback
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
  }
}

interface OCItem {
  item: number;
  code: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  netValue: number;
}

interface OCData {
  ocNumber: string;
  date: Date;
  supplierName: string;
  supplierRut: string;
  supplierAddress: string;
  supplierContact: string;
  supplierEmail: string;
  project: string;
  file: string;
  items: OCItem[];
  totalNet: number;
  paymentTerms: string;
  createdByName: string;
  cotizacion?: string; // Nuevo campo opcional
}

export async function generateOCPDF(data: OCData): Promise<{ blob: Blob; filename: string }> {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = 10;

  // --- Constants for layout ---
  const FONT_NORMAL = "helvetica";
  const FONT_BOLD = "helvetica";
  const PRIMARY_TEXT_COLOR = "#000000";
  const LOGO_URL = "/logopdf.jpg";

  // --- HEADER ---
  doc.setFont(FONT_BOLD, "bold");
  doc.setFontSize(10);
  doc.setTextColor(PRIMARY_TEXT_COLOR);
  doc.text("INMOBILIARIA FERROACTIVA", margin, y);
  y += 4;
  doc.setFont(FONT_NORMAL, "normal");
  doc.text("RUT: 76.040.151-K", margin, y);
  
  // --- LOGO ---
  try {
    const logoBase64 = await getBase64FromUrl(LOGO_URL);
    doc.addImage(logoBase64, "JPEG", pageWidth - margin - 45, y - 8, 40, 15);
  } catch (e) {
    console.warn("Logo no cargado", e);
  }
  y += 5;

  // --- TITLE ---
  doc.setFont(FONT_BOLD, "bold");
  doc.setFontSize(16);
  doc.rect(margin, y, pageWidth - margin * 2, 10);
  doc.text("ORDEN DE COMPRA", pageWidth / 2, y + 7, { align: "center" });
  y += 15;

  // --- OC INFO ---
  doc.setFontSize(10);
  doc.text("FECHA:", margin, y);
  doc.setFont(FONT_NORMAL, "normal");
  doc.text(format(data.date, "dd-MM-yyyy"), margin + 18, y);

  const rightBlockX = pageWidth - margin - 60;
  doc.setFont(FONT_BOLD, "bold");
  doc.text("O.C.N°:", rightBlockX, y);
  doc.setFont(FONT_NORMAL, "normal");
  doc.text(data.ocNumber, rightBlockX + 15, y);
  
  if (data.cotizacion) {
      y += 5;
      doc.rect(rightBlockX, y, 60, 15);
      doc.setFont(FONT_BOLD, "bold");
      doc.text("Cotización", rightBlockX + 30, y + 6, { align: 'center' });
      doc.setFont(FONT_NORMAL, "normal");
      doc.text(data.cotizacion, rightBlockX + 30, y + 12, { align: 'center' });
  }
  y += 15;
  

  // --- SUPPLIER & PROJECT INFO ---
  const boxHeight = 40;
  doc.rect(margin, y, pageWidth - margin * 2, boxHeight);
  
  // Supplier details
  let lineY = y + 6;
  const labelX = margin + 3;
  const valueX = margin + 25;
  doc.setFontSize(9);
  doc.setFont(FONT_NORMAL, 'bold');
  doc.text("RAZON SOCIAL", labelX, lineY);
  doc.setFont(FONT_NORMAL, 'normal');
  doc.text(`: ${data.supplierName}`, valueX, lineY);
  lineY += 5;
  doc.setFont(FONT_NORMAL, 'bold');
  doc.text("RUT", labelX, lineY);
  doc.setFont(FONT_NORMAL, 'normal');
  doc.text(`: ${data.supplierRut}`, valueX, lineY);
  lineY += 5;
  doc.setFont(FONT_NORMAL, 'bold');
  doc.text("AT", labelX, lineY);
  doc.setFont(FONT_NORMAL, 'normal');
  doc.text(`: ${data.createdByName}`, valueX, lineY);
  lineY += 5;
  doc.setFont(FONT_NORMAL, 'bold');
  doc.text("Direccion", labelX, lineY);
  doc.setFont(FONT_NORMAL, 'normal');
  doc.text(`: ${data.supplierAddress}`, valueX, lineY);
  lineY += 5;
  doc.setFont(FONT_NORMAL, 'bold');
  doc.text("GIRO", labelX, lineY);
  doc.setFont(FONT_NORMAL, 'normal');
  doc.text(": 0", valueX, lineY);
  lineY += 5;
  doc.setFont(FONT_NORMAL, 'bold');
  doc.text("Fono", labelX, lineY);
  doc.setFont(FONT_NORMAL, 'normal');
  doc.text(`: ${data.supplierContact}`, valueX, lineY);
  lineY += 5;
  doc.setFont(FONT_NORMAL, 'bold');
  doc.text("email", labelX, lineY);
  doc.setFont(FONT_NORMAL, 'normal');
  doc.text(`: ${data.supplierEmail}`, valueX, lineY);
  
  y += boxHeight + 2;

  // Project details
  const projectBoxHeight = 15;
  doc.rect(margin, y, pageWidth - margin * 2, projectBoxHeight);
  lineY = y + 6;
  doc.setFont(FONT_NORMAL, 'bold');
  doc.text("PROYECTO :", labelX, lineY);
  doc.setFont(FONT_NORMAL, 'normal');
  doc.text(data.project, valueX, lineY);
  lineY += 5;
  doc.setFont(FONT_NORMAL, 'bold');
  doc.text("File :", labelX, lineY);
  doc.setFont(FONT_NORMAL, 'normal');
  doc.text(data.file, valueX, lineY);
  y += projectBoxHeight + 5;

  // --- ITEMS TABLE ---
  autoTable(doc, {
    startY: y,
    head: [["ITEM", "CÓDIGO", "ARTICULO/DESCRIPCIÓN", "UNIDAD", "CANTIDAD", "P.UNITARIO", "VALOR NETO"]],
    body: data.items.map((item) => [
      item.item,
      item.code,
      item.description,
      item.unit,
      item.quantity,
      `$${item.unitPrice.toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `$${item.netValue.toLocaleString("es-CL")}`,
    ]),
    theme: "grid",
    headStyles: { fillColor: [52, 73, 94], textColor: 255, fontStyle: "bold" },
    styles: { fontSize: 8, cellPadding: 2, lineWidth: 0.1 },
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      1: { cellWidth: 18 },
      3: { halign: "center", cellWidth: 15 },
      4: { halign: "center", cellWidth: 18 },
      5: { halign: "right", cellWidth: 22 },
      6: { halign: "right", cellWidth: 25 },
    },
    didDrawCell: (hookData) => {
        if (hookData.section === 'head') {
            hookData.cell.styles.fillColor = [52, 73, 94];
        }
    }
  });

  let finalY = (doc as any).lastAutoTable.finalY;

  // --- TOTALS ---
  doc.setFontSize(11);
  doc.setFont(FONT_BOLD, "bold");
  const totalNetoX = pageWidth - margin - 55;
  doc.text("TOTAL NETO", totalNetoX, finalY + 8);
  doc.text(`$${data.totalNet.toLocaleString("es-CL")}`, totalNetoX + 50, finalY + 8, { align: "right" });
  finalY += 12;

  // --- BILLING AND PAYMENT INFO ---
  const infoBoxStartY = finalY + 5;
  doc.rect(margin, infoBoxStartY, pageWidth - margin * 2, 28);
  
  let infoY = infoBoxStartY + 5;
  doc.setFontSize(9);
  doc.setFont(FONT_BOLD, 'bold');
  doc.text("DATOS DE FACTURACION:", margin + 2, infoY);
  infoY += 5;
  doc.setFont(FONT_NORMAL, 'normal');
  doc.text("RAZON SOCIAL: FERROACTIVA LTDA.", margin + 5, infoY);
  doc.text("Fono: 975 698 724", margin + 110, infoY);
  infoY += 5;
  doc.text("RUT: 76.040.151-K", margin + 5, infoY);
  doc.text("cmoralesarq@gmail.com", margin + 110, infoY);
  infoY += 5;
  doc.text("DIRECCION: Tucapel 578 Los Angeles", margin + 5, infoY);
  infoY += 5;
  doc.text("GIRO: Construccion", margin + 5, infoY);
  infoY += 3;
  
  doc.line(margin, infoY, pageWidth - margin, infoY); // separator line
  infoY += 5;

  doc.setFont(FONT_BOLD, 'bold');
  doc.text(`CONDICIONES DE PAGO: ${data.paymentTerms || "30 días"}`, margin + 2, infoY);
  finalY = infoBoxStartY + 30;

  // --- SIGNATURES ---
  const sigY = finalY + 5;
  doc.rect(margin, sigY, pageWidth - margin * 2, 25);
  doc.line(margin + (pageWidth - margin*2)/2, sigY, margin + (pageWidth - margin*2)/2, sigY + 25);
  
  doc.setFontSize(8);
  doc.text("Carolina Morales Aguilera", margin + 45, sigY + 15, { align: 'center' });
  doc.setFont(FONT_BOLD, 'bold');
  doc.text("Jefe de Administración y Finanzas", margin + 45, sigY + 18, { align: 'center' });
  doc.text("CONSTRUCTORA FERROACTIVA LTDA.", margin + 45, sigY + 21, { align: 'center' });
  
  doc.text(data.supplierName, pageWidth - margin - 45, sigY + 21, { align: 'center' });
  finalY = sigY + 25;

  // --- FOOTER ---
  const footerY = doc.internal.pageSize.getHeight() - 10;
  doc.setFontSize(7);
  doc.setTextColor("#888");
  doc.text("Duble Almeida 34443 depto 127, Ñuñoa, Santiago fono: (02) 894 34 28 mail: constructorahmg@gmail.com", margin, footerY);
  doc.text("1 de 1", pageWidth - margin, footerY, { align: 'right' });


  // --- Generate Blob ---
  const pdfBlob = doc.output("blob");
  const filename = `OC_${data.ocNumber.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;

  return { blob: pdfBlob, filename };
}
