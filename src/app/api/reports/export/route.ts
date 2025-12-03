
import { NextResponse } from "next/server";
import ExcelJS from "exceljs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { data, columns } = body;

    if (!data || !columns) {
      return new NextResponse("Datos o columnas faltantes", { status: 400 });
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Reporte");

    sheet.columns = columns;

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern:'solid',
      fgColor:{argb:'FF1e40af'}
    };

    sheet.addRows(data);
    
    // Autoajustar columnas
    sheet.columns.forEach((column) => {
        if (column.eachCell && column.header) {
            let maxLength = column.header.length < 10 ? 10 : column.header.length;
            column.eachCell({ includeEmpty: true }, (cell) => {
                const columnLength = cell.value ? cell.value.toString().length : 10;
                if (columnLength > maxLength) {
                    maxLength = columnLength;
                }
            });
            column.width = maxLength + 4;
        }
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename=reporte_solicitudes.xlsx",
      },
    });
  } catch (error) {
    console.error("Error generating excel file:", error);
    return new NextResponse("Error al generar el archivo Excel", { status: 500 });
  }
}
