// lib/excelExport.ts
import * as XLSX from 'xlsx';
import api from '@/lib/api';

// Función auxiliar para descargar archivos
const downloadFile = (content: BlobPart, filename: string, mimeType: string) => {
  try {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    // Agregar al DOM, hacer click y remover
    document.body.appendChild(link);
    link.click();
    
    // Limpiar
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 100);
    
    return true;
  } catch (error) {
    console.error('Error en downloadFile:', error);
    return false;
  }
};

export const exportToExcel = (data: any[], filename: string, sheetName: string = 'Datos') => {
  try {
    if (!data || data.length === 0) {
      console.error('No hay datos para exportar');
      return false;
    }

    // Crear libro de Excel
    const workbook = XLSX.utils.book_new();
    
    // Convertir datos a hoja de cálculo
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Ajustar ancho de columnas
    const maxWidth = data.reduce((acc: number[], row) => {
      Object.keys(row).forEach((key, idx) => {
        const length = String(row[key] || '').length;
        if (!acc[idx] || length > acc[idx]) {
          acc[idx] = length;
        }
      });
      return acc;
    }, []);
    
    worksheet['!cols'] = maxWidth.map((w: number) => ({ 
      width: Math.min(Math.max(w, 10), 50) 
    }));
    
    // Agregar la hoja al libro
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    // Generar fecha para el nombre del archivo
    const hoy = new Date();
    const fecha = `${hoy.getFullYear()}-${(hoy.getMonth() + 1).toString().padStart(2, '0')}-${hoy.getDate().toString().padStart(2, '0')}`;
    const hora = `${hoy.getHours().toString().padStart(2, '0')}-${hoy.getMinutes().toString().padStart(2, '0')}`;
    
    // Generar archivo Excel usando write (no writeFile) y Blob
    const excelBuffer = XLSX.write(workbook, { 
      bookType: 'xlsx', 
      type: 'array' 
    });
    
    // Descargar usando Blob
    const finalFilename = `${filename}_${fecha}_${hora}.xlsx`;
    return downloadFile(excelBuffer, finalFilename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    return false;
  }
};

// Mantener exportToCSV igual (ya usa Blob)

// Modificar exportProductosFacturados para retornar el resultado
export const exportProductosFacturados = async (startDate?: string, endDate?: string) => {
  try {
    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    
    const response = await api.get('/dashboard/reporte-productos-facturados', { params });
    const data = response.data;
    
    if (!data || data.length === 0) {
      console.warn('No hay datos de productos facturados');
      return false;
    }
    
    // Formatear datos para Excel
    const datosFormateados = data.map((item: any) => ({
      'Código': item.codigo || 'N/A',
      'Producto': item.nombre_producto,
      'Categoría': item.categoria || 'N/A',
      'Marca': item.marca || 'N/A',
      'Precio Actual': parseFloat(item.precio_actual || 0),
      'Cantidad Vendida': parseInt(item.cantidad_vendida) || 0,
      'Precio Promedio Venta': parseFloat(item.precio_promedio_venta || 0),
      'Precio Mínimo': parseFloat(item.precio_minimo || 0),
      'Precio Máximo': parseFloat(item.precio_maximo || 0),
      'Total Vendido': parseFloat(item.total_vendido || 0),
      'Primera Venta': item.fecha_primer_venta?.split('T')[0] || 'N/A',
      'Última Venta': item.fecha_ultima_venta?.split('T')[0] || 'N/A',
      'Veces Facturado': parseInt(item.veces_facturado) || 0,
      'Clientes Únicos': parseInt(item.clientes_unicos) || 0,
      'Margen Promedio (%)': ((parseFloat(item.precio_promedio_venta || 0) - parseFloat(item.precio_actual || 0)) / parseFloat(item.precio_actual || 1)) * 100,
    }));
    
    // Retornar el resultado de exportToExcel
    return exportToExcel(datosFormateados, 'productos_facturados', 'Productos');
    
  } catch (error) {
    console.error('Error exporting productos facturados:', error);
    return false;
  }
};

// Modificar exportEstadisticasCompletas
export const exportEstadisticasCompletas = async (startDate: string, endDate: string) => {
  try {
    const response = await api.get('/dashboard/estadisticas-exportacion', {
      params: { startDate, endDate }
    });
    
    const data = response.data;
    const workbook = XLSX.utils.book_new();
    
    // Hoja 1: Productos Facturados
    if (data.productosFacturados && data.productosFacturados.length > 0) {
      const productosSheet = XLSX.utils.json_to_sheet(data.productosFacturados.map((p: any) => ({
        'Producto': p.nombre_producto,
        'Categoría': p.categoria,
        'Cantidad Vendida': parseInt(p.cantidad_vendida) || 0,
        'Precio Promedio': parseFloat(p.precio_promedio || 0),
        'Total Vendido': parseFloat(p.total_vendido || 0),
      })));
      XLSX.utils.book_append_sheet(workbook, productosSheet, 'Productos');
    }
    
    // Hoja 2: Ventas Diarias
    if (data.ventasDiarias && data.ventasDiarias.length > 0) {
      const ventasSheet = XLSX.utils.json_to_sheet(data.ventasDiarias.map((v: any) => ({
        'Fecha': v.fecha,
        'Total Facturas': parseInt(v.total_facturas) || 0,
        'Total Ventas': parseFloat(v.total_ventas || 0),
      })));
      XLSX.utils.book_append_sheet(workbook, ventasSheet, 'Ventas Diarias');
    }
    
    // Hoja 3: Métodos de Pago
    if (data.metodosPago && data.metodosPago.length > 0) {
      const pagosSheet = XLSX.utils.json_to_sheet(data.metodosPago.map((m: any) => ({
        'Método de Pago': m.metodo_pago,
        'Total Veces': parseInt(m.total_veces) || 0,
        'Total Monto': parseFloat(m.total_monto || 0),
      })));
      XLSX.utils.book_append_sheet(workbook, pagosSheet, 'Métodos de Pago');
    }
    
    // Hoja 4: Resumen
    const resumenData = [{
      'Periodo': `${startDate} a ${endDate}`,
      'Total Productos Vendidos': data.totalProductosVendidos || 0,
      'Total Ventas': parseFloat(data.totalVentasPeriodo || 0),
      'Total Facturas': data.totalFacturasPeriodo || 0,
      'Promedio por Factura': (parseFloat(data.totalVentasPeriodo || 0) / parseFloat(data.totalFacturasPeriodo || 1)),
    }];
    
    const resumenSheet = XLSX.utils.json_to_sheet(resumenData);
    XLSX.utils.book_append_sheet(workbook, resumenSheet, 'Resumen');
    
    // Generar fecha para el nombre del archivo
    const hoy = new Date();
    const fecha = `${hoy.getFullYear()}-${(hoy.getMonth() + 1).toString().padStart(2, '0')}-${hoy.getDate().toString().padStart(2, '0')}`;
    const hora = `${hoy.getHours().toString().padStart(2, '0')}-${hoy.getMinutes().toString().padStart(2, '0')}`;
    
    // Generar archivo Excel usando Blob
    const excelBuffer = XLSX.write(workbook, { 
      bookType: 'xlsx', 
      type: 'array' 
    });
    
    const finalFilename = `reporte_completo_${fecha}_${hora}.xlsx`;
    return downloadFile(excelBuffer, finalFilename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    
  } catch (error) {
    console.error('Error exporting estadísticas completas:', error);
    return false;
  }
};