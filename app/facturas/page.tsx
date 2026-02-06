'use client';

import { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Modal,
  message,
  Space,
  Tag,
  Popconfirm,
  Input,
  Row,
  Col,
  Card,
  Select,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  FilePdfOutlined,
  DeleteOutlined,
  SearchOutlined,
  FilterOutlined,
  CheckOutlined,
  CloseOutlined,
  ReloadOutlined,
  PrinterOutlined,
  BarcodeOutlined,
  EditOutlined,
  UserOutlined,
  MailOutlined,
  CarOutlined,
} from '@ant-design/icons';
import api from '@/lib/api';
import AppLayout from '@/components/AppLayout';
import FacturaForm from '@/components/FacturaForm';
import EnviarFacturaCorreoModal from '@/components/EnviarFacturaCorreoModal';
import { exportFacturaPDF } from '@/lib/pdfFactura';
import FacturaIndependienteForm from '@/components/FacturaIndependienteForm';
import { exportFacturaSimplificada, exportFacturaTicketTermico } from '@/lib/pdfFacturaSimplificada';
import EditarFacturaForm from '@/components/EditarFacturaForm';

const { Search } = Input;
const { Option } = Select;

// Interfaz para factura
interface Factura {
  id: number;
  total: number;
  metodo_pago: string;
  estado_pago: 'PAGA' | 'NO_PAGA';
  pagado_at: string | null;
  notas: string | null;
  fecha: string;
  cliente: {
    id: number;
    nombre: string;
    email?: string;
    telefono?: string;
  };
  orden?: {
    id: number;
    vehiculo?: {
      placa: string;
      marca?: string;
      modelo?: string;
    };
    mecanico?: {
      id: number;
      nombre: string;
      especialidad?: string;
    } | null;
  } | null;
  vehiculo?: {  // ✅ AÑADIR ESTA PROPIEDAD para vehículo directo
    id: number;
    placa: string;
    marca?: string;
    modelo?: string;
    cliente?: {
      id: number;
      nombre: string;
    };
  } | null;
  mecanico?: {
    id: number;
    nombre: string;
    especialidad?: string;
  } | null;
  detalles: any[];
  // Campos de helper desde el backend
  tieneVehiculoDirecto?: boolean;
  tieneVehiculoOrden?: boolean;
}

export default function FacturasPage() {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [ordenes, setOrdenes] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modalCambiarEstado, setModalCambiarEstado] = useState(false);
  const [facturaSeleccionada, setFacturaSeleccionada] = useState<Factura | null>(null);
  const [modalIndependiente, setModalIndependiente] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filtroMetodoPago, setFiltroMetodoPago] = useState<string>('TODAS');
  const [filtroEstadoPago, setFiltroEstadoPago] = useState<string>('TODAS');
  const [modalEditar, setModalEditar] = useState(false);
  const [facturaAEditar, setFacturaAEditar] = useState<Factura | null>(null);
  const [editando, setEditando] = useState(false);
  const [versionModal, setVersionModal] = useState(0);
  const [mecanicos, setMecanicos] = useState<any[]>([]);
  const [modalEnviarCorreo, setModalEnviarCorreo] = useState(false);
  const [facturaParaCorreo, setFacturaParaCorreo] = useState<Factura | null>(null);
  
  // Estados para el modal de contraseña (eliminación)
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [facturaAEliminar, setFacturaAEliminar] = useState<number | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  
  // Estados para el modal de contraseña (edición)
  const [passwordModalEditarOpen, setPasswordModalEditarOpen] = useState(false);
  const [adminPasswordEditar, setAdminPasswordEditar] = useState('');
  const [facturaAEditarConPassword, setFacturaAEditarConPassword] = useState<Factura | null>(null);
  const [confirmLoadingEditar, setConfirmLoadingEditar] = useState(false);

  // ✅ NUEVA FUNCIÓN: Obtener vehículo unificado
  const obtenerVehiculo = (factura: Factura): any => {
    // Prioridad: vehículo directo de la factura
    if (factura.vehiculo) {
      return {
        ...factura.vehiculo,
        origen: 'directo',
      };
    }
    // Si no hay vehículo directo, buscar en la orden
    if (factura.orden?.vehiculo) {
      return {
        ...factura.orden.vehiculo,
        origen: 'orden',
      };
    }
    return null;
  };

  // ✅ NUEVA FUNCIÓN: Obtener placa del vehículo
  const obtenerPlacaVehiculo = (factura: Factura): string => {
    const vehiculo = obtenerVehiculo(factura);
    return vehiculo?.placa || 'N/A';
  };

  // ✅ NUEVA FUNCIÓN: Obtener información completa del vehículo
  const obtenerInfoVehiculo = (factura: Factura): string => {
    const vehiculo = obtenerVehiculo(factura);
    if (!vehiculo) return 'N/A';
    
    const { placa, marca, modelo } = vehiculo;
    let info = placa;
    if (marca) {
      info += ` (${marca}`;
      if (modelo) info += ` ${modelo}`;
      info += ')';
    }
    return info;
  };

  // ✅ MODIFICAR: Función para obtener el nombre del mecánico
  const obtenerMecanico = (factura: Factura): string => {
    // Prioridad: mecánico directo de la factura
    if (factura.mecanico) {
      return factura.mecanico.nombre;
    }
    
    // Si no, buscar en la orden
    if (factura.orden?.mecanico) {
      return factura.orden.mecanico.nombre;
    }
    
    return 'N/A';
  };

  // ✅ MODIFICAR: Función para obtener la especialidad del mecánico
  const obtenerEspecialidadMecanico = (factura: Factura): string => {
    if (factura.mecanico?.especialidad) {
      return factura.mecanico.especialidad;
    }
    
    if (factura.orden?.mecanico?.especialidad) {
      return factura.orden.mecanico.especialidad;
    }
    
    return '';
  };

  // ✅ MODIFICAR: Función para cargar datos optimizada
  const loadData = async () => {
    setLoading(true);
    try {
      console.log('🔄 Cargando datos de facturas...');
      
      // Usar endpoint con relaciones actualizadas
      const [f, o, m] = await Promise.all([
        api.get('/facturas'), // El backend ya carga las relaciones necesarias
        api.get('/ordenes-servicio?estado=TERMINADA&_expand=cliente,vehiculo,mecanico,detalles,detalles.producto'),
        api.get('/mecanicos?activo=true'),
      ]);
      
      setOrdenes(o.data.filter((orden: any) => orden.estado === 'TERMINADA'));
      setFacturas(f.data);
      setMecanicos(m.data);
      
      console.log('📊 Datos cargados:');
      console.log('- Total facturas:', f.data.length);
      console.log('- Facturas con vehículo directo:', f.data.filter((fact: Factura) => fact.vehiculo).length);
      console.log('- Facturas con vehículo en orden:', f.data.filter((fact: Factura) => fact.orden?.vehiculo).length);
      console.log('- Mecánicos activos:', m.data.length);
      
      // Debug: Mostrar información de vehículos
      f.data.forEach((factura: Factura, index: number) => {
        const vehiculo = obtenerVehiculo(factura);
        if (vehiculo) {
          console.log(`Factura ${factura.id}: Placa: ${vehiculo.placa}, Origen: ${vehiculo.origen}`);
        }
      });
      
    } catch (error) {
      console.error('Error cargando datos:', error);
      message.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Función para refrescar una factura específica
  const refrescarFacturaEspecifica = async (facturaId: number): Promise<Factura | null> => {
    try {
      console.log(`🔄 Refrescando factura ${facturaId}...`);
      
      const response = await api.get(`/facturas/${facturaId}`);
      const facturaFresca = response.data;
      
      console.log(`✅ Factura ${facturaId} refrescada:`);
      console.log('  - Total:', facturaFresca.total);
      console.log('  - Mecánico:', obtenerMecanico(facturaFresca));
      console.log('  - Vehículo:', obtenerInfoVehiculo(facturaFresca));
      console.log('  - Tiene vehículo directo:', facturaFresca.tieneVehiculoDirecto);
      console.log('  - Tiene vehículo en orden:', facturaFresca.tieneVehiculoOrden);
      
      setFacturas(prev => prev.map(f => 
        f.id === facturaId ? facturaFresca : f
      ));
      
      return facturaFresca;
    } catch (error) {
      console.error(`❌ Error refrescando factura ${facturaId}:`, error);
      return null;
    }
  };

  // ✅ MODIFICAR: Función de filtrado para incluir búsqueda por placa
  const filtrarFacturas = () => {
    let filtradas = facturas;
    
    if (searchText) {
      const textoBusqueda = searchText.toLowerCase();
      filtradas = filtradas.filter(factura => {
        const clienteNombre = factura.cliente?.nombre?.toLowerCase() || '';
        const placaVehiculo = obtenerPlacaVehiculo(factura).toLowerCase();
        const idFactura = factura.id.toString();
        const mecanicoNombre = obtenerMecanico(factura).toLowerCase();
        const marcaModelo = obtenerInfoVehiculo(factura).toLowerCase();
        
        return (
          clienteNombre.includes(textoBusqueda) ||
          placaVehiculo.includes(textoBusqueda) ||
          idFactura.includes(textoBusqueda) ||
          textoBusqueda.includes(idFactura) ||
          mecanicoNombre.includes(textoBusqueda) ||
          marcaModelo.includes(textoBusqueda)
        );
      });
    }
    
    if (filtroMetodoPago !== 'TODAS') {
      filtradas = filtradas.filter(factura => factura.metodo_pago === filtroMetodoPago);
    }
    
    if (filtroEstadoPago !== 'TODAS') {
      filtradas = filtradas.filter(factura => factura.estado_pago === filtroEstadoPago);
    }
    
    return filtradas;
  };

  const facturasFiltradas = filtrarFacturas();

  const formatDate = (dateValue: any): string => {
    if (!dateValue) return 'N/A';
    
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        return 'Fecha inválida';
      }
      
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (error) {
      return 'Error';
    }
  };

  const formatDateTime = (dateValue: any): string => {
    if (!dateValue) return 'N/A';
    
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        return 'Fecha inválida';
      }
      
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return 'Error';
    }
  };

  const createFactura = async (values: any) => {
    try {
      await api.post('/facturas', values);
      message.success('Factura generada correctamente');
      setOpen(false);
      await loadData();
    } catch (error: any) {
      console.error('Error creando factura:', error);
      message.error(error.response?.data?.message || 'Error al generar factura');
    }
  };

  const verDetalles = async (
    facturaId: number,
    tipo: 'completa' | 'simplificada' | 'ticket' = 'completa'
  ) => {
    try {
      console.log(`📥 Obteniendo factura ${facturaId} FRESCA para exportar...`);
      
      const res = await api.get(`/facturas/${facturaId}`);
      const factura = res.data;

      console.log('📊 Datos FRESCOS para exportar:');
      console.log('- Total:', factura.total);
      console.log('- Mecánico:', obtenerMecanico(factura));
      console.log('- Vehículo:', obtenerInfoVehiculo(factura));
      
      factura.detalles = (factura.detalles || []).map((d: any) => ({
        ...d,
        cantidad: Number(d.cantidad),
        precio_unitario: Number(d.precio_unitario),
      }));

      if (!factura.detalles.length) {
        message.warning('La factura no tiene detalles para exportar');
        return;
      }

      setFacturas(prevFacturas => 
        prevFacturas.map(f => 
          f.id === facturaId ? factura : f
        )
      );

      // Preparar datos para PDF incluyendo vehículo unificado
      const facturaParaPDF = {
        ...factura,
        vehiculo: obtenerVehiculo(factura),
      };

      switch (tipo) {
        case 'simplificada':
          exportFacturaSimplificada(facturaParaPDF);
          break;
        case 'ticket':
          exportFacturaTicketTermico(facturaParaPDF);
          break;
        default:
          exportFacturaPDF(facturaParaPDF);
      }
    } catch (error) {
      console.error('Error generando PDF:', error);
      message.error('Error al generar PDF');
    }
  };

  // Función para enviar factura por correo
 const enviarFacturaCorreo = async (datos: {
  email: string;
  asunto: string;
  mensaje: string;
  copia?: string;
}) => {
  try {
    if (!facturaParaCorreo) return;
    
    // ✅ CORREGIDO: Usar el endpoint correcto para obtener el PDF
    const pdfResponse = await api.get(`/facturas/${facturaParaCorreo.id}/pdf`, {
      responseType: 'blob',
    });
    
    // Convertir PDF a base64
    const reader = new FileReader();
    const pdfBlob = new Blob([pdfResponse.data], { type: 'application/pdf' });
    
    const pdfBase64 = await new Promise((resolve) => {
      reader.onloadend = () => {
        const result = reader.result?.toString();
        // Extraer solo la parte base64
        const base64Part = result?.split(',')[1];
        resolve(base64Part || '');
      };
      reader.readAsDataURL(pdfBlob);
    });

    // Enviar correo con el PDF
    const response = await api.post(`/facturas/${facturaParaCorreo.id}/enviar-email`, {
      ...datos,
      pdfBase64,
    });
    
    message.success('Correo enviado exitosamente');
    setModalEnviarCorreo(false);
    
    // Mostrar confirmación
    Modal.success({
      title: '✅ Correo Enviado',
      content: (
        <div>
          <p>La factura ha sido enviada correctamente a:</p>
          <p><strong>{datos.email}</strong></p>
          {datos.copia && <p><strong>CC:</strong> {datos.copia}</p>}
          <p style={{ marginTop: 10, fontSize: '12px', color: '#666' }}>
            ID de seguimiento: {response.data.messageId}
          </p>
        </div>
      ),
      okText: 'Aceptar',
    });
    
  } catch (error: any) {
    console.error('Error enviando correo:', error);
    
    // Mejor mensaje de error
    if (error.response?.status === 404) {
      message.error('Endpoint para PDF no encontrado. Verifica el backend.');
    } else if (error.response?.status === 500) {
      message.error('Error del servidor al generar PDF');
    } else {
      message.error(error.response?.data?.message || 'Error al enviar correo');
    }
    
    throw error;
  }
};

  // Función para abrir el modal de correo
  const abrirModalCorreo = (factura: Factura) => {
    setFacturaParaCorreo(factura);
    setModalEnviarCorreo(true);
  };

  const verificarSiPuedeEditar = async (facturaId: number) => {
    try {
      const res = await api.get(`/facturas/${facturaId}/puede-editar`);
      return res.data;
    } catch (error) {
      console.error('Error verificando si puede editar:', error);
      return { puede_editar: false, motivo: 'Error al verificar' };
    }
  };

  // Función para validar contraseña para editar
  const validarPasswordEditar = async (facturaId: number, password: string): Promise<boolean> => {
    try {
      const response = await api.post(`/facturas/${facturaId}/validar-password`, {
        password,
        accion: 'EDITAR'
      });
      return response.data.valido;
    } catch (error: any) {
      console.error('Error validando contraseña:', error);
      message.error(error.response?.data?.message || 'Error al validar contraseña');
      return false;
    }
  };

  // Función para eliminar con contraseña
  const eliminarConPassword = async (facturaId: number, password: string): Promise<boolean> => {
    try {
      await api.delete(`/facturas/${facturaId}/secure`, {
        data: { password }
      });
      return true;
    } catch (error: any) {
      console.error('Error eliminando factura:', error);
      throw error;
    }
  };

  // Función para editar factura (ahora incluye validación de contraseña)
  const editarFactura = async (facturaId: number, datos: any) => {
    if (editando) {
      console.log('⏳ Ya se está editando, ignorando...');
      return null;
    }
    
    setEditando(true);
    console.log('🔄 Editando factura ID:', facturaId);
    
    try {
      const response = await api.put(`/facturas/${facturaId}/editar`, datos);
      console.log('✅ Datos enviados al backend');
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const facturaActualizada = await refrescarFacturaEspecifica(facturaId);
      
      if (!facturaActualizada) {
        throw new Error('No se pudo obtener la factura actualizada');
      }
      
      if (facturaAEditar?.id === facturaId) {
        console.log('🔄 Actualizando facturaAEditar con datos frescos');
        setFacturaAEditar(facturaActualizada);
      }
      
      setVersionModal(prev => prev + 1);
      
      message.success('Factura actualizada correctamente');
      return facturaActualizada;
      
    } catch (error: any) {
      console.error('❌ Error al editar factura:', error);
      message.error(error.response?.data?.message || 'Error al editar factura');
      throw error;
    } finally {
      setEditando(false);
    }
  };

  const cambiarEstadoPago = async (facturaId: number, nuevoEstado: 'PAGA' | 'NO_PAGA') => {
    try {
      await api.patch(`/facturas/${facturaId}/estado-pago`, {
        estado_pago: nuevoEstado,
      });
      
      message.success(
        nuevoEstado === 'PAGA' 
          ? 'Factura marcada como PAGADA ✅' 
          : 'Factura marcada como NO PAGA ❌'
      );
      
      setModalCambiarEstado(false);
      await loadData();
    } catch (error: any) {
      console.error('Error cambiando estado:', error);
      message.error(error.response?.data?.message || 'Error al cambiar estado de pago');
    }
  };

  // Eliminar factura - abre el modal de contraseña
  const eliminarFactura = (facturaId: number) => {
    if (editando) {
      message.warning('No se puede eliminar mientras se edita otra factura');
      return;
    }
    
    const factura = facturas.find(f => f.id === facturaId);
    if (!factura) return;
    
    if (factura.estado_pago === 'PAGA') {
      message.error('No se puede eliminar una factura pagada');
      return;
    }
    
    setFacturaAEliminar(facturaId);
    setAdminPassword('');
    setPasswordModalOpen(true);
  };

  // Función para abrir el modal de edición CON contraseña
  const abrirModalEdicionConPassword = async (factura: Factura) => {
    if (editando) {
      message.warning('Ya se está editando otra factura. Por favor, espere.');
      return;
    }
    
    const puedeEditar = await verificarSiPuedeEditar(factura.id);
    
    if (!puedeEditar.puede_editar) {
      message.warning(puedeEditar.motivo);
      return;
    }
    
    setFacturaAEditarConPassword(factura);
    setAdminPasswordEditar('');
    setPasswordModalEditarOpen(true);
  };

  // Función para proceder con la edición después de validar contraseña
  const procederConEdicion = async () => {
    if (!facturaAEditarConPassword) return;
    
    if (!adminPasswordEditar) {
      message.error('Ingrese la contraseña del administrador');
      return;
    }

    setConfirmLoadingEditar(true);
    try {
      // Validar contraseña
      const esValida = await validarPasswordEditar(
        facturaAEditarConPassword.id, 
        adminPasswordEditar
      );
      
      if (!esValida) {
        message.error('Contraseña incorrecta');
        setConfirmLoadingEditar(false);
        return;
      }
      
      // Si la contraseña es válida, cargar la factura fresca y abrir modal de edición
      console.log(`🔄 Cargando factura ${facturaAEditarConPassword.id} FRESCA para editar...`);
      
      const facturaFresca = await refrescarFacturaEspecifica(facturaAEditarConPassword.id);
      
      if (facturaFresca) {
        console.log('📊 Datos FRESCOS obtenidos:');
        console.log('- Mecánico:', obtenerMecanico(facturaFresca));
        console.log('- Vehículo:', obtenerInfoVehiculo(facturaFresca));
        
        setFacturaAEditar(facturaFresca);
        setModalEditar(true);
      } else {
        console.log('⚠️ Usando datos locales como fallback');
        setFacturaAEditar(facturaAEditarConPassword);
        setModalEditar(true);
      }
      
      // Cerrar modal de contraseña
      setPasswordModalEditarOpen(false);
      setFacturaAEditarConPassword(null);
      setAdminPasswordEditar('');
      
    } catch (error: any) {
      console.error('Error validando contraseña:', error);
      message.error(error.response?.data?.message || 'Error al validar contraseña');
    } finally {
      setConfirmLoadingEditar(false);
    }
  };

  const metodoPagoTag = (metodo: string) => {
    const colores: any = {
      EFECTIVO: 'green',
      TARJETA_CREDITO: 'blue',
      TARJETA_DEBITO: 'geekblue',
      TRANSFERENCIA: 'purple',
      CHEQUE: 'orange',
      OTRO: 'gray',
    };
    
    const textos: any = {
      EFECTIVO: 'Efectivo',
      TARJETA_CREDITO: 'Tarjeta Crédito',
      TARJETA_DEBITO: 'Tarjeta Débito',
      TRANSFERENCIA: 'Transferencia',
      CHEQUE: 'Cheque',
      OTRO: 'Otro',
    };
    
    return <Tag color={colores[metodo] || 'gray'}>{textos[metodo] || metodo}</Tag>;
  };

  const estadoPagoTag = (estado: 'PAGA' | 'NO_PAGA', fechaPago: string | null) => {
    const esPagada = estado === 'PAGA';
    
    return (
      <Space direction="vertical" size={0}>
        <Tag 
          color={esPagada ? 'green' : 'red'} 
          icon={esPagada ? <CheckOutlined /> : <CloseOutlined />}
          style={{ cursor: 'pointer', marginBottom: 4 }}
          onClick={(e) => {
            e.stopPropagation();
            const factura = facturas.find(f => f.estado_pago === estado);
            if (factura) {
              setFacturaSeleccionada(factura);
              setModalCambiarEstado(true);
            }
          }}
        >
          {esPagada ? 'PAGADA' : 'PENDIENTE'}
        </Tag>
        {esPagada && fechaPago && (
          <small style={{ color: '#666', fontSize: '11px' }}>
            {formatDateTime(fechaPago)}
          </small>
        )}
      </Space>
    );
  };

  // ✅ NUEVA FUNCIÓN: Renderizar información del vehículo con tooltip
  const renderVehiculo = (factura: Factura) => {
    const vehiculo = obtenerVehiculo(factura);
    const info = obtenerInfoVehiculo(factura);
    
    if (!vehiculo) {
      return (
        <Tag color="default" style={{ opacity: 0.6 }}>
          N/A
        </Tag>
      );
    }
    
    const tooltipContent = (
      <div>
        <div><strong>Vehículo</strong></div>
        <div>Placa: {vehiculo.placa}</div>
        {vehiculo.marca && <div>Marca: {vehiculo.marca}</div>}
        {vehiculo.modelo && <div>Modelo: {vehiculo.modelo}</div>}
        <div style={{ fontSize: '11px', color: '#666', marginTop: 4 }}>
          Origen: {vehiculo.origen === 'directo' ? 'Directo de la factura' : 'Desde orden'}
        </div>
      </div>
    );
    
    return (
      <Tooltip title={tooltipContent}>
        <Space size="small">
          <CarOutlined style={{ color: '#1890ff' }} />
          <span style={{ fontWeight: 500 }}>{info}</span>
          {vehiculo.origen === 'directo' && (
            <Tag color="blue" >D</Tag>
          )}
        </Space>
      </Tooltip>
    );
  };

  const columns = [
    {
      title: 'Factura #',
      dataIndex: 'id',
      sorter: (a: any, b: any) => a.id - b.id,
      render: (id: number) => <Tag color="blue">#{id}</Tag>,
      width: 100,
    },
    {
      title: 'Fecha',
      render: (_: any, r: Factura) => formatDate(r.fecha),
      sorter: (a: any, b: any) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime(),
      width: 120,
    },
    {
      title: 'Cliente',
      render: (_: any, r: Factura) => r.cliente?.nombre || 'N/A',
      width: 150,
    },
    {
      title: (
        <Space>
          <CarOutlined />
          <span>Vehículo</span>
        </Space>
      ),
      render: (_: any, r: Factura) => renderVehiculo(r),
      width: 180,
      filters: [
        { text: 'Con vehículo', value: 'CON_VEHICULO' },
        { text: 'Sin vehículo', value: 'SIN_VEHICULO' },
        { text: 'Vehículo directo', value: 'DIRECTO' },
        { text: 'Vehículo de orden', value: 'ORDEN' },
      ],
      onFilter: (value: any, record: Factura) => {
        const vehiculo = obtenerVehiculo(record);
        if (value === 'CON_VEHICULO') return !!vehiculo;
        if (value === 'SIN_VEHICULO') return !vehiculo;
        if (value === 'DIRECTO') return record.vehiculo !== null && record.vehiculo !== undefined;
        if (value === 'ORDEN') return record.orden?.vehiculo !== null && record.orden?.vehiculo !== undefined;
        return true;
      },
    },
    {
      title: (
        <Space>
          <UserOutlined />
          <span>Mecánico</span>
        </Space>
      ),
      width: 180,
      render: (_: any, r: Factura) => {
        const nombreMecanico = obtenerMecanico(r);
        const especialidad = obtenerEspecialidadMecanico(r);
        
        if (nombreMecanico === 'N/A') {
          return (
            <Tag color="default" style={{ opacity: 0.6 }}>
              N/A
            </Tag>
          );
        }
        
        return (
          <Tooltip 
            title={
              <div>
                <div><strong>Mecánico asignado</strong></div>
                {especialidad && <div>Especialidad: {especialidad}</div>}
                <div style={{ fontSize: '11px', color: '#666', marginTop: 4 }}>
                  {r.mecanico ? 'Asignado directamente' : 'Asignado desde orden'}
                </div>
              </div>
            }
          >
            <Space direction="vertical" size={0}>
              <div style={{ fontWeight: 500, color: '#1890ff' }}>{nombreMecanico}</div>
              {especialidad && (
                <small style={{ color: '#666', fontSize: '11px' }}>
                  {especialidad}
                </small>
              )}
            </Space>
          </Tooltip>
        );
      },
      filters: [
        { text: 'Con mecánico', value: 'CON_MECANICO' },
        { text: 'Sin mecánico', value: 'SIN_MECANICO' },
        { text: 'Mecánico directo', value: 'MEC_DIRECTO' },
        { text: 'Mecánico de orden', value: 'MEC_ORDEN' },
      ],
      onFilter: (value: any, record: Factura) => {
        if (value === 'CON_MECANICO') return obtenerMecanico(record) !== 'N/A';
        if (value === 'SIN_MECANICO') return obtenerMecanico(record) === 'N/A';
        if (value === 'MEC_DIRECTO') return record.mecanico !== null && record.mecanico !== undefined;
        if (value === 'MEC_ORDEN') return record.orden?.mecanico !== null && record.orden?.mecanico !== undefined;
        return true;
      },
    },
    {
      title: 'Método Pago',
      render: (_: any, r: Factura) => metodoPagoTag(r.metodo_pago),
      filters: [
        { text: 'Efectivo', value: 'EFECTIVO' },
        { text: 'Tarjeta Crédito', value: 'TARJETA_CREDITO' },
        { text: 'Tarjeta Débito', value: 'TARJETA_DEBITO' },
        { text: 'Transferencia', value: 'TRANSFERENCIA' },
        { text: 'Cheque', value: 'CHEQUE' },
        { text: 'Otro', value: 'OTRO' },
      ],
      onFilter: (value: any, record: Factura) => record.metodo_pago === value,
      width: 150,
    },
    {
      title: 'Estado Pago',
      render: (_: any, r: Factura) => estadoPagoTag(r.estado_pago, r.pagado_at),
      filters: [
        { text: '✅ PAGADAS', value: 'PAGA' },
        { text: '❌ PENDIENTES', value: 'NO_PAGA' },
      ],
      onFilter: (value: any, record: Factura) => record.estado_pago === value,
      width: 140,
    },
    {
      title: 'Total',
      dataIndex: 'total',
      render: (v: number) => (
        <strong style={{ color: '#e10600', fontSize: '1.1em' }}>
          ${Number(v || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
        </strong>
      ),
      sorter: (a: any, b: any) => (a.total || 0) - (b.total || 0),
      width: 120,
    },
    {
      title: 'Exportar',
      width: 200,
      render: (_: any, r: Factura) => (
        <Space size="small">
          <Tooltip title="Factura Completa">
            <Button
              type="text"
              icon={<FilePdfOutlined />}
              onClick={() => verDetalles(r.id, 'completa')}
              size="small"
              style={{ color: '#1890ff' }}
            />
          </Tooltip>
          
          <Tooltip title="Ticket Simplificado">
            <Button
              type="text"
              icon={<PrinterOutlined />}
              onClick={() => verDetalles(r.id, 'simplificada')}
              size="small"
              style={{ color: '#52c41a' }}
            />
          </Tooltip>
          
          <Tooltip title="Ticket Térmico">
            <Button
              type="text"
              icon={<BarcodeOutlined />}
              onClick={() => verDetalles(r.id, 'ticket')}
              size="small"
              style={{ color: '#722ed1' }}
            />
          </Tooltip>
          
          {/* Botón para enviar por correo */}
          <Tooltip title="Enviar por correo electrónico">
            <Button
              type="text"
              icon={<MailOutlined style={{ color: '#ff4d4f' }} />}
              onClick={() => abrirModalCorreo(r)}
              size="small"
            />
          </Tooltip>
        </Space>
      ),
    },
    {
      title: 'Acciones',
      width: 150,
      render: (_: any, r: Factura) => (
        <Space size="small">
          <Tooltip title="Editar factura">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => abrirModalEdicionConPassword(r)}
              size="small"
              style={{ color: '#1890ff' }}
              disabled={editando}
            />
          </Tooltip>
          <Tooltip title="Cambiar estado de pago">
            <Button
              type="text"
              icon={r.estado_pago === 'PAGA' ? <CloseOutlined /> : <CheckOutlined />}
              onClick={() => {
                setFacturaSeleccionada(r);
                setModalCambiarEstado(true);
              }}
              size="small"
              style={{ 
                color: r.estado_pago === 'PAGA' ? '#ff4d4f' : '#fa8c16' 
              }}
            />
          </Tooltip>
          
          {/* Popconfirm para eliminar */}
          <Popconfirm
            title={`${r.estado_pago === 'PAGA' ? 'No se puede eliminar una factura pagada' : '¿Eliminar esta factura?'}`}
            description={
              r.estado_pago === 'PAGA' 
                ? 'Las facturas pagadas no pueden ser eliminadas.' 
                : 'Esta acción abrirá un modal de confirmación con contraseña.'
            }
            onConfirm={() => eliminarFactura(r.id)}
            okText="Sí"
            cancelText="No"
            disabled={r.estado_pago === 'PAGA' || editando}
          >
            <Tooltip title={r.estado_pago === 'PAGA' ? 'No se puede eliminar factura pagada' : 'Eliminar'}>
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                size="small"
                disabled={r.estado_pago === 'PAGA' || editando}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <AppLayout title="Facturación">
      {/* Estadísticas */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={4}>
          <Card hoverable>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
                {facturas.length}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>Total Facturas</div>
            </div>
          </Card>
        </Col>
        <Col span={4}>
          <Card hoverable>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#52c41a' }}>
                {facturas.filter(f => f.estado_pago === 'PAGA').length}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>Pagadas</div>
            </div>
          </Card>
        </Col>
        <Col span={4}>
          <Card hoverable>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fa8c16' }}>
                {facturas.filter(f => f.estado_pago === 'NO_PAGA').length}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>Pendientes</div>
            </div>
          </Card>
        </Col>
        <Col span={4}>
          <Card hoverable>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#722ed1' }}>
                {facturas.filter(f => obtenerMecanico(f) !== 'N/A').length}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                <UserOutlined /> Con Mecánico
              </div>
            </div>
          </Card>
        </Col>
        <Col span={4}>
          <Card hoverable>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#13c2c2' }}>
                {facturas.filter(f => obtenerVehiculo(f) !== null).length}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                <CarOutlined /> Con Vehículo
              </div>
            </div>
          </Card>
        </Col>
        <Col span={4}>
          <Card hoverable>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#e10600' }}>
                ${facturas
                  .filter(f => f.estado_pago === 'PAGA')
                  .reduce((sum, f) => sum + Number(f.total || 0), 0)
                  .toLocaleString('es-ES', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>Total Recaudado</div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Barra de búsqueda y filtros */}
      <Card style={{ marginBottom: 20 }}>
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Search
              placeholder="Buscar por: #factura, cliente, placa, mecánico, marca..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              enterButton="Buscar"
              size="large"
            />
          </Col>
          <Col>
            <Select
              placeholder="Método de pago"
              value={filtroMetodoPago}
              onChange={setFiltroMetodoPago}
              style={{ width: 180 }}
              suffixIcon={<FilterOutlined />}
              allowClear
            >
              <Option value="TODAS">Todos los métodos</Option>
              <Option value="EFECTIVO">Efectivo</Option>
              <Option value="TARJETA_CREDITO">Tarjeta Crédito</Option>
              <Option value="TARJETA_DEBITO">Tarjeta Débito</Option>
              <Option value="TRANSFERENCIA">Transferencia</Option>
              <Option value="CHEQUE">Cheque</Option>
              <Option value="OTRO">Otro</Option>
            </Select>
          </Col>
          <Col>
            <Select
              placeholder="Estado de pago"
              value={filtroEstadoPago}
              onChange={setFiltroEstadoPago}
              style={{ width: 180 }}
              allowClear
            >
              <Option value="TODAS">Todos los estados</Option>
              <Option value="PAGA">✅ Pagadas</Option>
              <Option value="NO_PAGA">❌ Pendientes</Option>
            </Select>
          </Col>
          <Col>
            <Button 
              onClick={loadData} 
              loading={loading}
              icon={<ReloadOutlined />}
              disabled={editando}
            >
              Actualizar
            </Button>
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setOpen(true)}
              disabled={editando}
            >
              Nueva Factura
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setModalIndependiente(true)}
              style={{ marginLeft: 8 }}
              disabled={editando}
            >
              Factura Independiente
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Tabla de facturas */}
      <Card>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={facturasFiltradas}
          pagination={{ 
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} facturas`,
          }}
          loading={loading || editando}
          scroll={{ x: 1300 }}
          locale={{
            emptyText: searchText || filtroMetodoPago !== 'TODAS' || filtroEstadoPago !== 'TODAS'
              ? 'No se encontraron facturas con los filtros aplicados'
              : 'No hay facturas registradas'
          }}
          rowClassName={(record) => 
            record.estado_pago === 'PAGA' ? 'factura-pagada' : 'factura-pendiente'
          }
          summary={() => (
            facturasFiltradas.length > 0 ? (
              <Table.Summary.Row style={{ background: '#1a1818' }}>
                <Table.Summary.Cell index={0} colSpan={6}>
                  <strong>Total de facturas filtradas:</strong> {facturasFiltradas.length}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1}>
                  <strong style={{ color: '#e10600' }}>
                    ${facturasFiltradas
                      .reduce((sum, f) => sum + Number(f.total || 0), 0)
                      .toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                  </strong>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            ) : null
          )}
        />
      </Card>

      {/* Modal para nueva factura */}
      <Modal
        open={open}
        footer={null}
        onCancel={() => setOpen(false)}
        title="Generar Nueva Factura"
        destroyOnClose
        width={700}
      >
        {ordenes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: 16 }}>
              📄
            </div>
            <h3>No hay órdenes para facturar</h3>
            <p style={{ color: '#666', marginBottom: 24 }}>
              No existen órdenes con estado "TERMINADA" disponibles para facturar.
            </p>
            <Button type="primary" onClick={() => window.open('/ordenes', '_blank')}>
              Ir a Órdenes de Servicio
            </Button>
          </div>
        ) : (
          <FacturaForm
            ordenes={ordenes}
            onSubmit={createFactura}
          />
        )}
      </Modal>

      {/* Modal para factura independiente */}
      <Modal
        open={modalIndependiente}
        footer={null}
        onCancel={() => setModalIndependiente(false)}
        title="Factura Independiente"
        width={1200}
        destroyOnClose
      >
        <FacturaIndependienteForm
          mecanicos={mecanicos}
          onSubmit={async (values) => {
            try {
              await api.post('/facturas/independiente', values);
              message.success('Factura independiente creada exitosamente');
              setModalIndependiente(false);
              await loadData();
            } catch (error: any) {
              message.error(error.response?.data?.message || 'Error al crear factura');
            }
          }}
          onCancel={() => setModalIndependiente(false)}
        />
      </Modal>

      {/* Modal para cambiar estado de pago */}
      <Modal
        title={`Cambiar estado de pago - Factura #${facturaSeleccionada?.id}`}
        open={modalCambiarEstado}
        onCancel={() => setModalCambiarEstado(false)}
        footer={null}
        centered
      >
        {facturaSeleccionada && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ marginBottom: 24 }}>
              <p><strong>Cliente:</strong> {facturaSeleccionada.cliente?.nombre}</p>
              <p><strong>Vehículo:</strong> {obtenerInfoVehiculo(facturaSeleccionada)}</p>
              <p><strong>Mecánico:</strong> {obtenerMecanico(facturaSeleccionada)}</p>
              <p><strong>Total:</strong> ${Number(facturaSeleccionada.total || 0).toLocaleString()}</p>
              <p><strong>Estado actual:</strong> {
                facturaSeleccionada.estado_pago === 'PAGA' 
                  ? '✅ PAGADA' 
                  : '❌ PENDIENTE'
              }</p>
              {facturaSeleccionada.pagado_at && (
                <p><small>Pagada el: {formatDateTime(facturaSeleccionada.pagado_at)}</small></p>
              )}
            </div>
            
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              {facturaSeleccionada.estado_pago === 'NO_PAGA' ? (
                <Button
                  type="primary"
                  size="large"
                  icon={<CheckOutlined />}
                  onClick={() => cambiarEstadoPago(facturaSeleccionada.id, 'PAGA')}
                  block
                  style={{ 
                    background: '#52c41a',
                    borderColor: '#52c41a',
                    height: '48px',
                    fontSize: '16px'
                  }}
                >
                   MARCAR COMO PAGADA
                </Button>
              ) : (
                <Button
                  type="primary"
                  size="large"
                  icon={<CloseOutlined />}
                  onClick={() => cambiarEstadoPago(facturaSeleccionada.id, 'NO_PAGA')}
                  block
                  danger
                  style={{ 
                    height: '48px',
                    fontSize: '16px'
                  }}
                >
                   MARCAR COMO NO PAGA
                </Button>
              )}
              
              <Button
                onClick={() => setModalCambiarEstado(false)}
                block
                size="large"
              >
                Cancelar
              </Button>
            </Space>
          </div>
        )}
      </Modal>

      {/* Modal para editar factura */}
      {facturaAEditar && (
        <EditarFacturaForm
          key={`editar-factura-${facturaAEditar.id}-${versionModal}`}
          factura={facturaAEditar}
          visible={modalEditar}
          onCancel={() => {
            console.log('❌ Cancelando edición');
            setModalEditar(false);
            setFacturaAEditar(null);
          }}
          onSubmit={async (datos) => {
            console.log('📨 Enviando datos al backend');
            
            try {
              await editarFactura(facturaAEditar.id, datos);
              
              setModalEditar(false);
              setFacturaAEditar(null);
              
              setTimeout(() => {
                loadData();
              }, 500);
              
            } catch (error) {
              console.log('❌ Error, manteniendo modal abierto');
            }
          }}
        />
      )}

      {/* MODAL PARA ENVIAR CORREO */}
      <EnviarFacturaCorreoModal
        visible={modalEnviarCorreo}
        onCancel={() => setModalEnviarCorreo(false)}
        factura={facturaParaCorreo}
        onEnviar={enviarFacturaCorreo}
      />

      {/* Modal de confirmación con contraseña para ELIMINAR */}
      <Modal
        open={passwordModalOpen}
        title="Confirmación requerida para ELIMINAR"
        okText="Eliminar factura"
        okType="danger"
        cancelText="Cancelar"
        confirmLoading={confirmLoading}
        onCancel={() => {
          setPasswordModalOpen(false);
          setFacturaAEliminar(null);
          setAdminPassword('');
        }}
        onOk={async () => {
          if (!adminPassword) {
            message.error('Ingrese la contraseña del administrador');
            return;
          }

          if (!facturaAEliminar) {
            message.error('No hay factura seleccionada');
            return;
          }

          setConfirmLoading(true);
          try {
            await eliminarConPassword(facturaAEliminar, adminPassword);

            message.success(`Factura #${facturaAEliminar} eliminada`);
            setPasswordModalOpen(false);
            setFacturaAEliminar(null);
            setAdminPassword('');
            await loadData();
          } catch (error: any) {
            message.error(
              error.response?.data?.message || 'Contraseña incorrecta o error al eliminar'
            );
          } finally {
            setConfirmLoading(false);
          }
        }}
      >
        <p>
          Para eliminar esta factura debes ingresar la contraseña del
          <strong> administrador (admin)</strong>.
        </p>

        <Input.Password
          placeholder="Contraseña del administrador"
          value={adminPassword}
          onChange={(e) => setAdminPassword(e.target.value)}
          onPressEnter={(e) => {
            e.preventDefault();
            // Trigger the delete action on Enter key
            const okButton = document.querySelector('.ant-modal-confirm-btns .ant-btn-primary');
            if (okButton) {
              (okButton as HTMLElement).click();
            }
          }}
        />
      </Modal>

      {/* Modal de confirmación con contraseña para EDITAR */}
      <Modal
        open={passwordModalEditarOpen}
        title="Confirmación requerida para EDITAR"
        okText="Continuar con la edición"
        okType="primary"
        cancelText="Cancelar"
        confirmLoading={confirmLoadingEditar}
        onCancel={() => {
          setPasswordModalEditarOpen(false);
          setFacturaAEditarConPassword(null);
          setAdminPasswordEditar('');
        }}
        onOk={procederConEdicion}
      >
        <p>
          Para editar esta factura debes ingresar la contraseña del
          <strong> administrador (admin)</strong>.
        </p>

        <Input.Password
          placeholder="Contraseña del administrador"
          value={adminPasswordEditar}
          onChange={(e) => setAdminPasswordEditar(e.target.value)}
          onPressEnter={(e) => {
            e.preventDefault();
            procederConEdicion();
          }}
        />
      </Modal>

      {/* Estilos CSS adicionales */}
      <style jsx global>{`
        .factura-pagada {
          background-color: rgba(82, 196, 26, 0.05) !important;
        }
        .factura-pendiente {
          background-color: rgba(250, 140, 22, 0.05) !important;
        }
        .ant-table-row:hover {
          background-color: rgba(24, 144, 255, 0.04) !important;
        }
        .ant-tag-blue {
          margin: 0 2px;
          font-size: 11px;
          line-height: 16px;
          height: 16px;
        }
      `}</style>
    </AppLayout>
  );
}