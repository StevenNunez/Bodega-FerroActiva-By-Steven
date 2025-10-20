
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { SafetyInspection, User } from './data';
import { Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

const COLORS = {
  primary: '#2980b9',
  secondary: '#7f8c8d',
  text: '#34495e',
  lightGray: '#ecf0f1',
  white: '#ffffff',
  green: '#27ae60',
  red: '#c0392b',
};
const LINE_HEIGHT = 7;
const MARGIN = 15;

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
        console.error("Error fetching image for PDF:", error);
        return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    }
}

const formatDate = (date: Date | Timestamp | undefined | null, includeTime = false) => {
    if (!date) return 'N/A';
    const jsDate = date instanceof Timestamp ? date.toDate() : date;
    const formatString = includeTime ? "d 'de' MMMM, yyyy HH:mm" : "d 'de' MMMM, yyyy";
    return format(jsDate, formatString, { locale: es });
};

function addHeader(doc: jsPDF, inspection: SafetyInspection) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(COLORS.text);
    doc.text('INFORME DE INSPECCIÓN DE SEGURIDAD', doc.internal.pageSize.getWidth() / 2, MARGIN, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setTextColor(COLORS.primary);
    doc.text(`Obra: ${inspection.work}`, doc.internal.pageSize.getWidth() / 2, MARGIN + LINE_HEIGHT, { align: 'center' });
}

function addInspectionInfo(doc: jsPDF, inspection: SafetyInspection, supervisor: User, apr: User) {
    let y = MARGIN + 2 * LINE_HEIGHT + 10;
    
    const info = [
        ['Reportado por:', apr.name || 'N/A', 'Fecha Reporte:', formatDate(inspection.createdAt)],
        ['Asignado a:', supervisor.name || 'N/A', 'Plazo Cierre:', formatDate(inspection.deadline)],
        ['Ubicación:', inspection.location || 'N/A', 'Estado:', inspection.status.toUpperCase()],
    ];

    doc.autoTable({
        body: info,
        startY: y,
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 1 },
        columnStyles: { 
            0: { fontStyle: 'bold' },
            2: { fontStyle: 'bold' },
        },
    });

    return (doc as any).lastAutoTable.finalY + LINE_HEIGHT;
}

async function addSection(doc: jsPDF, y: number, title: string, content: string | null | undefined, photos?: string[]) {
    const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
    let currentY = y;

    if (currentY > 240) {
        doc.addPage();
        currentY = MARGIN;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(COLORS.lightGray);
    doc.rect(MARGIN, currentY - 5, pageWidth - MARGIN * 2, 8, 'F');
    doc.setTextColor(COLORS.text);
    doc.text(title, MARGIN + 2, currentY);
    currentY += LINE_HEIGHT + 2;
    
    if (content) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(content, MARGIN, currentY, { maxWidth: pageWidth - MARGIN * 2 });
        currentY += (doc.splitTextToSize(content, pageWidth - MARGIN * 2).length * 4) + 5;
    }

    if (photos && photos.length > 0) {
        currentY += 2;
        let x = MARGIN;
        for (const photoUrl of photos) {
            if (x > pageWidth - MARGIN - 60) {
                x = MARGIN;
                currentY += 65;
            }
            if (currentY > pageHeight - MARGIN - 60) {
                doc.addPage();
                currentY = MARGIN;
            }
            const photoBase64 = await getBase64FromUrl(photoUrl);
            doc.addImage(photoBase64, 'JPEG', x, currentY, 60, 45);
            x += 65;
        }
        currentY += 50;
    }
    
    return currentY + 5;
}

async function addSignatures(doc: jsPDF, y: number, inspection: SafetyInspection, supervisor: User, apr: User) {
    const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
    let currentY = y;

    if (currentY > 200) {
        doc.addPage();
        currentY = MARGIN;
    }

    const addSignatureBlock = async (title: string, signatureDataUrl: string | null | undefined, name: string | null | undefined, date: Date | Timestamp | null | undefined, xPos: number) => {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(title, xPos + 40, currentY, { align: 'center' });

        const signatureHeight = 30;
        const signatureWidth = 80;
        
        if (signatureDataUrl) {
             const signatureBase64 = await getBase64FromUrl(signatureDataUrl);
             doc.addImage(signatureBase64, 'PNG', xPos, currentY + 5, signatureWidth, signatureHeight);
        } else {
            doc.rect(xPos, currentY + 5, signatureWidth, signatureHeight, 'S');
            doc.setFontSize(8);
            doc.setTextColor(COLORS.secondary);
            doc.text('Sin Firma', xPos + signatureWidth/2, currentY + 20, { align: 'center'});
            doc.setTextColor(COLORS.text);
        }
        
        doc.line(xPos, currentY + signatureHeight + 8, xPos + signatureWidth, currentY + signatureHeight + 8);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(name || 'N/A', xPos + signatureWidth/2, currentY + signatureHeight + 13, { align: 'center'});
        doc.text(formatDate(date, true), xPos + signatureWidth/2, currentY + signatureHeight + 18, { align: 'center'});
    };
    
    currentY += 10;
    await addSignatureBlock('Firma Ejecutor (Cierre)', inspection.completionSignature, supervisor.name, inspection.completedAt, MARGIN);
    await addSignatureBlock('Firma Revisor (APR)', inspection.reviewedBy?.signature, apr.name, inspection.reviewedBy?.date, pageWidth - MARGIN - 80);
}

export async function generateInspectionPDF(inspection: SafetyInspection, supervisor: User, apr: User) {
    if (!inspection) throw new Error("Datos de la inspección incompletos.");
    
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();

    addHeader(doc, inspection);
    let y = addInspectionInfo(doc, inspection, supervisor, apr);
    
    y = await addSection(doc, y, 'Parte 1: Observación', inspection.description, inspection.evidencePhotos);
    y = await addSection(doc, y, 'Plan de Acción Sugerido', inspection.actionPlan);
    y = await addSection(doc, y, 'Parte 2: Cierre de la Observación', inspection.completionNotes, inspection.completionPhotos);
    
    if (inspection.status === 'rejected' && inspection.rejectionNotes) {
        y = await addSection(doc, y, 'Notas de Rechazo (Revisor)', inspection.rejectionNotes);
    }
    
    await addSignatures(doc, y, inspection, supervisor, apr);

    doc.setFontSize(8);
    doc.setTextColor(COLORS.secondary);
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width - MARGIN, pageHeight - 10, { align: 'right' });
    }

    const safeFilename = `Inspeccion_${inspection.work.replace(/[^a-zA-Z0-9]/g, '_')}_${formatDate(inspection.createdAt)}.pdf`;
    doc.save(safeFilename);
}
