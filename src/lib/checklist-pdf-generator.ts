
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { AssignedChecklist, User } from './data';
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

function addHeader(doc: jsPDF, checklist: AssignedChecklist) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(COLORS.text);
    doc.text('INFORME DE CHECKLIST DE SEGURIDAD', doc.internal.pageSize.getWidth() / 2, MARGIN, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setTextColor(COLORS.primary);
    doc.text(checklist.templateTitle, doc.internal.pageSize.getWidth() / 2, MARGIN + LINE_HEIGHT, { align: 'center' });
}

function addChecklistInfo(doc: jsPDF, checklist: AssignedChecklist, supervisor?: User, apr?: User) {
    let y = MARGIN + 2 * LINE_HEIGHT + 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Obra/Proyecto:', MARGIN, y);
    doc.setFont('helvetica', 'normal');
    doc.text(checklist.work, MARGIN + 40, y);

    doc.setFont('helvetica', 'bold');
    doc.text('Fecha Completado:', MARGIN, y += LINE_HEIGHT);
    doc.setFont('helvetica', 'normal');
    doc.text(formatDate(checklist.completedAt, true), MARGIN + 40, y);

    doc.setFont('helvetica', 'bold');
    doc.text('Realizado por:', MARGIN, y += LINE_HEIGHT);
    doc.setFont('helvetica', 'normal');
    doc.text(supervisor?.name || 'No especificado', MARGIN + 40, y);

    doc.setFont('helvetica', 'bold');
    doc.text('Revisado por:', MARGIN, y += LINE_HEIGHT);
    doc.setFont('helvetica', 'normal');
    doc.text(apr?.name || (checklist.reviewedBy?.name || 'Pendiente'), MARGIN + 40, y);

    doc.setFont('helvetica', 'bold');
    doc.text('Estado:', MARGIN, y += LINE_HEIGHT);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(checklist.status === 'approved' ? COLORS.green : checklist.status === 'rejected' ? COLORS.red : COLORS.text);
    doc.text(checklist.status.toUpperCase(), MARGIN + 40, y);
    doc.setTextColor(COLORS.text);

    return y + LINE_HEIGHT * 2;
}

export async function generateChecklistPDF(checklist: AssignedChecklist, users: User[], supervisor?: User, apr?: User) {
    if (!checklist) throw new Error("Datos del checklist incompletos.");
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();

    addHeader(doc, checklist);
    let y = addChecklistInfo(doc, checklist, supervisor, apr);
    
    // --- Checklist Items ---
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Ítems Verificados', MARGIN, y);
    y += LINE_HEIGHT;

    const tableColumn = ['#', 'Elemento', 'Respuesta', 'Responsable', 'Fecha Cumpl.'];
    const tableRows = checklist.items.map((item, index) => {
        const respuesta = item.yes ? 'Sí' : item.no ? 'No' : 'N/A';
        const responsable = users.find(u => u.id === item.responsibleUserId)?.name || 'N/A';
        return [
            index + 1,
            item.element,
            respuesta,
            responsable,
            formatDate(item.completionDate)
        ];
    });

    doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: y,
        theme: 'grid',
        headStyles: { fillColor: COLORS.primary, textColor: COLORS.white },
        styles: { fontSize: 9 },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 15, halign: 'center' },
            3: { cellWidth: 30, halign: 'center' },
            4: { cellWidth: 25, halign: 'center' },
        }
    });
    y = (doc as any).lastAutoTable.finalY + 10;
    
    // --- Sections for Observations ---
    const addSection = (title: string, content: string | null | undefined) => {
        if (y > 240) doc.addPage();
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(title, MARGIN, y);
        y += LINE_HEIGHT;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(content || 'Sin observaciones.', MARGIN, y, { maxWidth: pageWidth - MARGIN * 2 });
        y += (doc.splitTextToSize(content || 'Sin observaciones.', pageWidth - MARGIN * 2).length * 4) + LINE_HEIGHT;
    };
    
    addSection('Observaciones del Supervisor', checklist.observations);
    if(checklist.status === 'rejected') {
        addSection('Notas de Rechazo (APR)', checklist.rejectionNotes);
    }
    
    // --- Evidence Photos ---
    if (checklist.evidencePhotos && checklist.evidencePhotos.length > 0) {
        if (y > 200) doc.addPage();
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Evidencia Fotográfica', MARGIN, y);
        y += LINE_HEIGHT;
        
        let x = MARGIN;
        for (const photoDataUrl of checklist.evidencePhotos) {
            if (x > pageWidth - MARGIN - 60) {
                x = MARGIN;
                y += 65;
            }
            if (y > pageHeight - MARGIN - 60) {
                doc.addPage();
                y = MARGIN;
            }
            doc.addImage(photoDataUrl, 'PNG', x, y, 60, 60);
            x += 65;
        }
        y += 70;
    }
    
    // --- Signatures ---
    if (y > 220) doc.addPage();
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Firmas', MARGIN, y);
    y += LINE_HEIGHT;

    const signatureWidth = 80;
    const signatureHeight = 40;
    
    const addSignature = async (title: string, signatureDataUrl: string | null | undefined, name: string | null | undefined, date: Date | Timestamp | null | undefined) => {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(title, x, y);
        y += LINE_HEIGHT - 2;

        if (signatureDataUrl) {
            doc.addImage(signatureDataUrl, 'PNG', x, y, signatureWidth, signatureHeight);
        } else {
            doc.rect(x, y, signatureWidth, signatureHeight, 'S');
            doc.setFontSize(8);
            doc.setTextColor(COLORS.secondary);
            doc.text('Sin Firma', x + signatureWidth/2, y + signatureHeight/2, { align: 'center'});
            doc.setTextColor(COLORS.text);
        }
        y += signatureHeight + 5;
        doc.line(x, y, x + signatureWidth, y);
        doc.setFontSize(9);
        doc.text(name || 'N/A', x + signatureWidth/2, y + 5, { align: 'center'});
        doc.text(formatDate(date, true), x + signatureWidth/2, y + 10, { align: 'center'});
    };

    let x = MARGIN;
    await addSignature('Realizado por:', checklist.performedBy?.signature, supervisor?.name, checklist.completedAt);
    
    x = pageWidth - MARGIN - signatureWidth;
    await addSignature('Revisado por (APR):', checklist.reviewedBy?.signature, apr?.name, checklist.reviewedBy?.date);

    const safeFilename = `Checklist_${checklist.templateTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${formatDate(checklist.createdAt)}.pdf`;
    doc.save(safeFilename);
}
