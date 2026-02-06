'use client';

import AppLayout from '@/components/AppLayout';
import { Row, Col, Card, Statistic, Tag, Table, Button, DatePicker, Space, Select, message, Input, Badge, Spin } from 'antd';
import {
  DollarOutlined,
  FileTextOutlined,
  UserOutlined,
  CarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DownloadOutlined,
  SearchOutlined,
  PlusOutlined,
  ShoppingOutlined,
  TeamOutlined,
  ProductOutlined,
  FileExcelOutlined,
  CalendarOutlined,
  ReloadOutlined,
  UnorderedListOutlined,
  FileDoneOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import api from '@/lib/api';
import { exportToExcel } from '@/lib/excelExport';

const { RangePicker } = DatePicker;
const { Option } = Select;

export default function DashboardPage() {
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>([
    dayjs().startOf('day'),
    dayjs().endOf('day'),
  ]);
  const [timeRange, setTimeRange] = useState<string>('today');
  const [searchOrdenes, setSearchOrdenes] = useState<string>('');
  const [searchClientes, setSearchClientes] = useState<string>('');
  const [searchFacturas, setSearchFacturas] = useState<string>('');
  const [exportLoading, setExportLoading] = useState<string>('');
  const [facturasData, setFacturasData] = useState<any[]>([]);
  const [loadingFacturas, setLoadingFacturas] = useState(false);
  const [userRol, setUserRol] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Verificar autenticación y rol
  useEffect(() => {
    const token = localStorage.getItem('token');
    const rol = localStorage.getItem('rol');
    
    if (!token) {
      router.replace('/login');
      return;
    }
    
    setUserRol(rol);
    setAuthLoading(false);
  }, [router]);

  // Cargar datos solo si está autorizado
  useEffect(() => {
    if (userRol === 'VENDEDOR' && !authLoading) {
      const autorizado = localStorage.getItem('dashboard_autorizado') === 'true';
      if (autorizado) {
        loadDashboardData();
        loadFacturasIntervalo();
      }
      // Si no está autorizado, el AppLayout mostrará el modal
    }
  }, [dateRange, timeRange, userRol, authLoading]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      let params: any = {};
      
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.startDate = dateRange[0].format('YYYY-MM-DD');
        params.endDate = dateRange[1].format('YYYY-MM-DD');
      }

      const response = await api.get('/dashboard/dashboard-completo', { params });
      setDashboardData(response.data);
    } catch (error: any) {
      console.error('Error loading dashboard:', error);
      
      if (error.response?.status === 401) {
        localStorage.clear();
        router.replace('/login');
      } else if (error.response?.status === 403) {
        message.error('No tiene permiso para acceder al dashboard');
      } else {
        message.error('Error al cargar datos del dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadFacturasIntervalo = async () => {
    setLoadingFacturas(true);
    try {
      let params: any = {};
      
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.startDate = dateRange[0].format('YYYY-MM-DD');
        params.endDate = dateRange[1].format('YYYY-MM-DD');
      }

      const response = await api.get('/dashboard/exportar-facturas', { params });
      setFacturasData(response.data || []);
    } catch (error: any) {
      console.error('Error cargando facturas:', error);
      if (error.response?.status === 401) {
        localStorage.clear();
        router.replace('/login');
      }
    } finally {
      setLoadingFacturas(false);
    }
  };

  const handleTimeRangeChange = (value: string) => {
    const now = dayjs();
    let newRange: [dayjs.Dayjs, dayjs.Dayjs];
    
    switch (value) {
      case 'today':
        newRange = [now.startOf('day'), now.endOf('day')];
        break;
      case 'week':
        newRange = [now.startOf('week'), now.endOf('week')];
        break;
      case 'month':
        newRange = [now.startOf('month'), now.endOf('month')];
        break;
      case 'year':
        newRange = [now.startOf('year'), now.endOf('year')];
        break;
      default:
        newRange = [now.startOf('day'), now.endOf('day')];
    }
    
    setTimeRange(value);
    setDateRange(newRange);
  };

  const handleDateRangeChange = (dates: any) => {
    if (dates && dates[0] && dates[1]) {
      setDateRange(dates);
      setTimeRange('custom');
    } else {
      setDateRange([dayjs().startOf('day'), dayjs().endOf('day')]);
      setTimeRange('today');
    }
  };

  // 🔧 FUNCIONES DE EXPORTACIÓN
  const handleExportFacturas = async () => {
    setExportLoading('facturas');
    try {
      if (!dateRange || !dateRange[0] || !dateRange[1]) {
        message.warning('Seleccione un rango de fechas para exportar facturas');
        return;
      }

      const response = await api.get('/dashboard/exportar-facturas', {
        params: {
          startDate: dateRange[0].format('YYYY-MM-DD'),
          endDate: dateRange[1].format('YYYY-MM-DD'),
        }
      });

      const facturas = response.data || [];
      
      if (facturas.length === 0) {
        message.warning('No hay facturas para exportar en el periodo seleccionado');
        return;
      }

      const datosParaExportar = facturas.map((factura: any) => ({
        'ID Factura': factura.id,
        'Fecha': dayjs(factura.fecha).format('DD/MM/YYYY'),
        'Estado Pago': factura.estado_pago === 'PAGA' ? 'PAGADA' : 'NO PAGADA',
        'Cliente': factura.cliente?.nombre || 'N/A',
        'Identificación': factura.cliente?.identificacion || 'N/A',
        'Vehículo': factura.orden?.vehiculo?.placa || 'N/A',
        'Marca': factura.orden?.vehiculo?.marca || 'N/A',
        'Modelo': factura.orden?.vehiculo?.modelo || 'N/A',
        'Total': factura.total || 0,
        'Método Pago': factura.metodo_pago || 'N/A',
        'Fecha Pago': factura.pagado_at ? dayjs(factura.pagado_at).format('DD/MM/YYYY HH:mm') : 'N/A',
        'Notas': factura.notas || '',
      }));

      const filename = `facturas_${dateRange[0].format('YYYY-MM-DD')}_al_${dateRange[1].format('YYYY-MM-DD')}`;
      exportToExcel(datosParaExportar, filename, 'Facturas');
      
      message.success(`${facturas.length} facturas exportadas exitosamente`);
    } catch (error) {
      console.error('Error exportando facturas:', error);
      message.error('Error al exportar facturas');
    } finally {
      setExportLoading('');
    }
  };

  const handleExportInventario = async () => {
    setExportLoading('inventario');
    try {
      const response = await api.get('/dashboard/exportar-inventario');
      const productos = response.data || [];
      
      if (productos.length === 0) {
        message.warning('No hay productos en el inventario');
        return;
      }

      const datosParaExportar = productos.map((producto: any) => ({
        'ID': producto.id,
        'Nombre': producto.nombre,
        'Referencia': producto.referencia || '',
        'Categoría': producto.categoria || '',
        'Precio': producto.precio || 0,
        'Stock Actual': producto.stock || 0,
        'Stock Mínimo': producto.stock_minimo || 0,
        'Creado': producto.created_at ? dayjs(producto.created_at).format('DD/MM/YYYY HH:mm') : 'N/A',
      }));

      exportToExcel(datosParaExportar, 'inventario_completo', 'Inventario');
      message.success(`${productos.length} productos exportados exitosamente`);
    } catch (error) {
      console.error('Error exportando inventario:', error);
      message.error('Error al exportar inventario');
    } finally {
      setExportLoading('');
    }
  };

  const handleExportClientes = async () => {
    setExportLoading('clientes');
    try {
      const response = await api.get('/dashboard/exportar-clientes');
      const clientes = response.data || [];
      
      if (clientes.length === 0) {
        message.warning('No hay clientes registrados');
        return;
      }

      const datosParaExportar = clientes.map((cliente: any) => {
        // Extraer vehículos de diferentes posibles estructuras
        let vehiculosArray = [];
        
        // Caso 1: vehiculos como array
        if (Array.isArray(cliente.vehiculos)) {
          vehiculosArray = cliente.vehiculos;
        }
        // Caso 2: vehiculos_data como string JSON
        else if (cliente.vehiculos_data) {
          try {
            const parsed = JSON.parse(cliente.vehiculos_data);
            if (Array.isArray(parsed)) {
              vehiculosArray = parsed;
            }
          } catch (e) {
            console.warn('Error parseando vehiculos_data:', e);
          }
        }
        // Caso 3: vehiculo como objeto singular
        else if (cliente.vehiculo && typeof cliente.vehiculo === 'object') {
          vehiculosArray = [cliente.vehiculo];
        }

        // Formatear información de vehículos
        const totalVehiculos = vehiculosArray.length;
        let vehiculosInfo = 'Ninguno';
        
        if (totalVehiculos > 0) {
          vehiculosInfo = vehiculosArray
            .map((v: any) => {
              if (v && v.placa) {
                return `${v.placa} (${v.marca || ''} ${v.modelo || ''})`.trim();
              }
              return null;
            })
            .filter(Boolean)
            .join(', ');
        }

        return {
          'ID': cliente.id,
          'Nombre': cliente.nombre || '',
          'Identificación': cliente.identificacion || '',
          'Email': cliente.email || '',
          'Teléfono': cliente.telefono || '',
          'Teléfono 2': cliente.telefono2 || '',
          'Dirección': cliente.direccion || '',
          'Municipio': cliente.municipio || '',
          'Total Vehículos': totalVehiculos,
          'Vehículos': vehiculosInfo,
          'Fecha Registro': cliente.created_at ? dayjs(cliente.created_at).format('DD/MM/YYYY HH:mm') : 'N/A',
        };
      });

      exportToExcel(datosParaExportar, 'clientes_completo', 'Clientes');
      message.success(`${clientes.length} clientes exportados exitosamente`);
      
    } catch (error: any) {
      console.error('Error detallado:', error);
      message.error(`Error: ${error.response?.data?.message || error.message}`);
    } finally {
      setExportLoading('');
    }
  };

  // 🔍 FUNCIONES DE FILTRADO
  const filtrarOrdenes = () => {
    if (!dashboardData?.ordenesIntervalo) return [];
    
    if (!searchOrdenes) return dashboardData.ordenesIntervalo;
    
    const textoBusqueda = searchOrdenes.toLowerCase();
    return dashboardData.ordenesIntervalo.filter((orden: any) => {
      const clienteNombre = orden.cliente?.nombre?.toLowerCase() || '';
      const placaVehiculo = orden.vehiculo?.placa?.toLowerCase() || '';
      const idOrden = orden.id?.toString()?.toLowerCase() || '';
      const estadoOrden = orden.estado?.toLowerCase() || '';
      
      return (
        clienteNombre.includes(textoBusqueda) ||
        placaVehiculo.includes(textoBusqueda) ||
        idOrden.includes(textoBusqueda) ||
        estadoOrden.includes(textoBusqueda)
      );
    });
  };

  const filtrarClientesNuevos = () => {
    if (!dashboardData?.clientesNuevos) return [];
    
    if (!searchClientes) return dashboardData.clientesNuevos;
    
    const textoBusqueda = searchClientes.toLowerCase();
    return dashboardData.clientesNuevos.filter((cliente: any) => {
      const nombreCliente = cliente.nombre?.toLowerCase() || '';
      const identificacion = cliente.identificacion?.toLowerCase() || '';
      const telefono = cliente.telefono?.toLowerCase() || '';
      
      return (
        nombreCliente.includes(textoBusqueda) ||
        identificacion.includes(textoBusqueda) ||
        telefono.includes(textoBusqueda)
      );
    });
  };

  const filtrarFacturas = () => {
    if (!facturasData || facturasData.length === 0) return [];
    
    if (!searchFacturas) return facturasData;
    
    const textoBusqueda = searchFacturas.toLowerCase();
    return facturasData.filter((factura: any) => {
      const clienteNombre = factura.cliente?.nombre?.toLowerCase() || '';
      const placaVehiculo = factura.orden?.vehiculo?.placa?.toLowerCase() || '';
      const idFactura = factura.id?.toString()?.toLowerCase() || '';
      const estadoPago = factura.estado_pago?.toLowerCase() || '';
      const metodoPago = factura.metodo_pago?.toLowerCase() || '';
      
      return (
        clienteNombre.includes(textoBusqueda) ||
        placaVehiculo.includes(textoBusqueda) ||
        idFactura.includes(textoBusqueda) ||
        estadoPago.includes(textoBusqueda) ||
        metodoPago.includes(textoBusqueda)
      );
    });
  };

  // 📊 CALCULAR RESUMEN DE FACTURAS
  const calcularResumenFacturas = () => {
    if (!facturasData || facturasData.length === 0) {
      return {
        total: 0,
        pagadas: 0,
        pendientes: 0,
        totalPagado: 0,
        totalPendiente: 0
      };
    }

    const facturasPagadas = facturasData.filter(f => f.estado_pago === 'PAGA');
    const facturasPendientes = facturasData.filter(f => f.estado_pago === 'NO_PAGA');
    
    const totalPagado = facturasPagadas.reduce((sum, f) => sum + Number(f.total || 0), 0);
    const totalPendiente = facturasPendientes.reduce((sum, f) => sum + Number(f.total || 0), 0);

    return {
      total: facturasData.length,
      pagadas: facturasPagadas.length,
      pendientes: facturasPendientes.length,
      totalPagado,
      totalPendiente
    };
  };

  const resumenFacturas = calcularResumenFacturas();

  // 🎯 COLUMNAS PARA TABLAS
  const columnsOrdenes = [
    {
      title: '# Orden',
      dataIndex: 'id',
      key: 'id',
      render: (value: number) => <Tag color="blue">#{value}</Tag>,
      width: 100,
    },
    {
      title: 'Fecha',
      dataIndex: 'fecha_ingreso',
      key: 'fecha_ingreso',
      render: (value: string) => value ? dayjs(value).format('DD/MM/YYYY HH:mm') : 'N/A',
      width: 130,
    },
    {
      title: 'Cliente',
      render: (_: any, record: any) => record.cliente?.nombre || 'N/A',
      width: 150,
    },
    {
      title: 'Vehículo',
      render: (_: any, record: any) => record.vehiculo?.placa || 'N/A',
      width: 120,
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      render: (estado: string) => {
        const colors: any = {
          RECIBIDA: 'blue',
          EN_PROCESO: 'orange',
          TERMINADA: 'green',
          FACTURADA: 'purple',
        };
        const text = estado?.replace('_', ' ') || 'N/A';
        return <Tag color={colors[estado] || 'gray'}>{text}</Tag>;
      },
      width: 120,
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      render: (value: number) => (
        <strong style={{ color: '#e10600' }}>
          ${Number(value || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
        </strong>
      ),
      width: 120,
    },
    {
      title: 'Mecánico',
      render: (_: any, record: any) => record.mecanico?.nombre || 'N/A',
      width: 150,
    },
  ];

  const columnsFacturas = [
    {
      title: '# Factura',
      dataIndex: 'id',
      key: 'id',
      render: (value: number) => <Tag color="purple">#{value}</Tag>,
      width: 100,
    },
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      render: (value: string) => value ? dayjs(value).format('DD/MM/YYYY') : 'N/A',
      width: 110,
    },
    {
      title: 'Cliente',
      render: (_: any, record: any) => record.cliente?.nombre || 'N/A',
      width: 150,
    },
    {
      title: 'Vehículo',
      render: (_: any, record: any) => record.orden?.vehiculo?.placa || 'N/A',
      width: 120,
    },
    {
      title: 'Estado Pago',
      dataIndex: 'estado_pago',
      key: 'estado_pago',
      render: (estado: string) => {
        if (estado === 'PAGA') {
          return (
            <Badge 
              status="success" 
              text={
                <Tag color="green" icon={<CheckCircleOutlined />}>
                  PAGADA
                </Tag>
              } 
            />
          );
        } else {
          return (
            <Badge 
              status="warning" 
              text={
                <Tag color="orange" icon={<ClockCircleOutlined />}>
                  PENDIENTE
                </Tag>
              } 
            />
          );
        }
      },
      width: 130,
    },
    {
      title: 'Método Pago',
      dataIndex: 'metodo_pago',
      key: 'metodo_pago',
      render: (metodo: string) => {
        const metodos: any = {
          EFECTIVO: 'Efectivo',
          TARJETA: 'Tarjeta',
          TRANSFERENCIA: 'Transferencia',
          CHEQUE: 'Cheque',
          OTRO: 'Otro'
        };
        return <Tag color="blue">{metodos[metodo] || metodo}</Tag>;
      },
      width: 120,
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      render: (value: number) => (
        <strong style={{ 
          color: '#e10600',
          fontWeight: 'bold'
        }}>
          ${Number(value || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
        </strong>
      ),
      width: 120,
    },
    {
      title: 'Fecha Pago',
      dataIndex: 'pagado_at',
      key: 'pagado_at',
      render: (value: string) => value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '-',
      width: 140,
    },
  ];

  const columnsProductos = [
    {
      title: 'Producto',
      dataIndex: 'nombre',
      key: 'nombre',
    },
    {
      title: 'Referencia',
      dataIndex: 'referencia',
      key: 'referencia',
      render: (value: string) => value || '-',
    },
    {
      title: 'Cantidad Vendida',
      dataIndex: 'cantidad_vendida',
      key: 'cantidad_vendida',
      render: (value: number) => <strong>{value || 0}</strong>,
    },
    {
      title: 'Total Vendido',
      dataIndex: 'total_vendido',
      key: 'total_vendido',
      render: (value: number) => `$${Number(value || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}`,
    },
    {
      title: 'Stock Actual',
      dataIndex: 'stock_actual',
      key: 'stock_actual',
      render: (value: number) => (
        <Tag color={value < 5 ? 'red' : value < 10 ? 'orange' : 'green'}>
          {value || 0} unidades
        </Tag>
      ),
    },
  ];

  const columnsClientesPagos = [
    {
      title: 'Cliente',
      dataIndex: 'nombre',
      key: 'nombre',
    },
    {
      title: 'Identificación',
      dataIndex: 'identificacion',
      key: 'identificacion',
    },
    {
      title: 'Facturas Pagadas',
      dataIndex: 'total_facturas_pagadas',
      key: 'total_facturas_pagadas',
      render: (value: number) => <Tag color="green">{value}</Tag>,
    },
    {
      title: 'Total Pagado',
      dataIndex: 'total_pagado',
      key: 'total_pagado',
      render: (value: number) => (
        <strong style={{ color: '#52c41a' }}>
          ${Number(value || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
        </strong>
      ),
    },
  ];

  const columnsClientesNuevos = [
    {
      title: 'Cliente',
      dataIndex: 'nombre',
      key: 'nombre',
    },
    {
      title: 'Identificación',
      dataIndex: 'identificacion',
      key: 'identificacion',
    },
    {
      title: 'Teléfono',
      dataIndex: 'telefono',
      key: 'telefono',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (value: string) => value || '-',
    },
    {
      title: 'Fecha Registro',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (value: string) => value ? dayjs(value).format('DD/MM/YYYY HH:mm') : 'N/A',
    },
  ];

  // Calcular resumen del periodo
  const periodoText = dateRange && dateRange[0] && dateRange[1] 
    ? `${dateRange[0].format('DD/MM/YYYY')} - ${dateRange[1].format('DD/MM/YYYY')}`
    : 'Hoy';

  // Mostrar loading mientras verificamos autenticación
  if (authLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <Spin size="large" tip="Verificando acceso..." />
      </div>
    );
  }

  // Verificar si está autorizado para ver el dashboard
  const autorizado = localStorage.getItem('dashboard_autorizado') === 'true';
  
  // Si es VENDEDOR pero no está autorizado, mostrar mensaje
  if (userRol === 'VENDEDOR' && !autorizado) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '60px 20px',
        maxWidth: '500px',
        margin: '0 auto'
      }}>
        <LockOutlined style={{ fontSize: 64, color: '#fa541c', marginBottom: 24 }} />
        <h2>Dashboard Bloqueado</h2>
        <p style={{ color: '#999', marginBottom: 32 }}>
          Para acceder al Dashboard necesita ingresar la contraseña de administrador.
          El modal de verificación debería aparecer automáticamente.
        </p>
        <div style={{ 
          background: 'rgba(250, 84, 28, 0.1)', 
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '24px'
        }}>
          <p style={{ margin: 0, fontSize: '14px', color: '#fa541c' }}>
            <LockOutlined /> Si el modal no aparece, recargue la página o haga clic en "Dashboard" en el menú lateral.
          </p>
        </div>
        <Button 
          type="primary" 
          danger
          size="large"
          icon={<LockOutlined />}
          onClick={() => {
            // Forzar recarga para que el AppLayout muestre el modal
            window.location.reload();
          }}
          style={{ marginRight: '12px' }}
        >
          Recargar Página
        </Button>
        <Button 
          type="default"
          onClick={() => router.push('/clientes')}
        >
          Ir a Clientes
        </Button>
      </div>
    );
  }

  // Modifica el return para agregar indicador de rol
  return (
    <AppLayout title="Dashboard del Taller">
      {/* Indicador de autorización */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Tag color="blue" icon={<LockOutlined />}>
            Acceso: VENDEDOR
          </Tag>
          <Tag color="green" style={{ marginLeft: 8 }}>
            <CheckCircleOutlined /> Autorizado
          </Tag>
        </div>
        <div style={{ fontSize: '12px', color: '#666' }}>
          <CalendarOutlined /> {periodoText}
        </div>
      </div>

      {/* FILTROS SUPERIORES */}
      <Card style={{ marginBottom: 20 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>Periodo:</div>
            <Select
              value={timeRange}
              onChange={handleTimeRangeChange}
              style={{ width: '100%' }}
            >
              <Option value="today">Hoy</Option>
              <Option value="week">Esta semana</Option>
              <Option value="month">Este mes</Option>
              <Option value="year">Este año</Option>
            </Select>
          </Col>
          
          <Col xs={24} sm={12} md={6}>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>Rango personalizado:</div>
            <RangePicker
              value={dateRange}
              onChange={handleDateRangeChange}
              format="DD/MM/YYYY"
              style={{ width: '100%' }}
              allowClear
            />
          </Col>
          
          <Col xs={24} sm={12} md={6}>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>&nbsp;</div>
            <Button 
              type="primary" 
              icon={<ReloadOutlined />} 
              onClick={() => {
                loadDashboardData();
                loadFacturasIntervalo();
              }}
              loading={loading || loadingFacturas}
              style={{ width: '100%' }}
            >
              Actualizar Datos
            </Button>
          </Col>
          
          <Col xs={24} sm={12} md={6}>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>Exportaciones:</div>
            <Select
              placeholder="Seleccionar reporte"
              style={{ width: '100%' }}
              onSelect={(value: string) => {
                switch(value) {
                  case 'facturas':
                    handleExportFacturas();
                    break;
                  case 'inventario':
                    handleExportInventario();
                    break;
                  case 'clientes':
                    handleExportClientes();
                    break;
                }
              }}
              loading={!!exportLoading}
            >
              <Option value="facturas">
                <Space>
                  <FileTextOutlined />
                  Facturas del periodo
                </Space>
              </Option>
              <Option value="inventario">
                <Space>
                  <ProductOutlined />
                  Inventario completo
                </Space>
              </Option>
              <Option value="clientes">
                <Space>
                  <TeamOutlined />
                  Clientes registrados
                </Space>
              </Option>
            </Select>
          </Col>
        </Row>
      </Card>

      {/* KPIs PRINCIPALES */}
      <Row gutter={[16, 16]}>
        {/* TOTAL RECAUDADO */}
        <Col xs={24} sm={12} md={6}>
          <Card 
            hoverable 
            loading={loading}
            style={{ height: '100%' }}
          >
            <Statistic
              title="Total Recaudado"
              value={dashboardData?.totalRecaudado || 0}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#52c41a' }}
              suffix="$"
              precision={2}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
              <CheckCircleOutlined /> {dashboardData?.cantidadFacturasPagadas || 0} facturas pagadas
            </div>
          </Card>
        </Col>

        {/* PENDIENTE POR RECAUDAR */}
        <Col xs={24} sm={12} md={6}>
          <Card 
            hoverable 
            loading={loading}
            style={{ height: '100%' }}
          >
            <Statistic
              title="Pendiente por Recaudar"
              value={dashboardData?.totalPendiente || 0}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#fa8c16' }}
              suffix="$"
              precision={2}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
              <ClockCircleOutlined /> {dashboardData?.totalFacturasPendientes || 0} facturas pendientes
            </div>
          </Card>
        </Col>

        {/* TOTAL CLIENTES */}
        <Col xs={24} sm={12} md={6}>
          <Card 
            hoverable 
            loading={loading}
            style={{ height: '100%' }}
          >
            <Statistic
              title="Total Clientes"
              value={dashboardData?.totalClientes || 0}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
              <PlusOutlined /> {dashboardData?.totalClientesNuevos || 0} nuevos en el periodo
            </div>
          </Card>
        </Col>

        {/* TOTAL VEHÍCULOS */}
        <Col xs={24} sm={12} md={6}>
          <Card 
            hoverable 
            loading={loading}
            style={{ height: '100%' }}
          >
            <Statistic
              title="Total Vehículos"
              value={dashboardData?.totalVehiculos || 0}
              prefix={<CarOutlined />}
              valueStyle={{ color: '#13c2c2' }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
              <UnorderedListOutlined /> {dashboardData?.ordenesActivas || 0} órdenes activas
            </div>
          </Card>
        </Col>
      </Row>

      {/* RESUMEN DEL PERIODO */}
      <Row gutter={[16, 16]} style={{ marginTop: 20 }}>
        <Col span={24}>
          <Card 
            title={`Resumen del periodo: ${periodoText}`}
            loading={loading}
          >
            <Row gutter={[16, 16]}>
              <Col xs={12} sm={6}>
                <Statistic
                  title="Órdenes Creadas"
                  value={dashboardData?.totalOrdenesIntervalo || 0}
                  valueStyle={{ fontSize: 24 }}
                />
              </Col>
              <Col xs={12} sm={6}>
                <Statistic
                  title="Productos Vendidos"
                  value={dashboardData?.productosMasVendidos?.reduce((sum: number, p: any) => sum + (p.cantidad_vendida || 0), 0) || 0}
                  valueStyle={{ fontSize: 24 }}
                />
              </Col>
              <Col xs={12} sm={6}>
                <Statistic
                  title="Clientes con Pagos"
                  value={dashboardData?.clientesConMasPagos?.length || 0}
                  valueStyle={{ fontSize: 24 }}
                />
              </Col>
              <Col xs={12} sm={6}>
                <Statistic
                  title="Clientes Nuevos"
                  value={dashboardData?.totalClientesNuevos || 0}
                  valueStyle={{ fontSize: 24 }}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* NUEVA SECCIÓN: FACTURAS DEL INTERVALO */}
      <Row gutter={[16, 16]} style={{ marginTop: 20 }}>
        <Col span={24}>
          <Card
            title={
              <Space>
                <FileDoneOutlined />
                <span>Facturas del periodo</span>
                <Tag color="purple">{resumenFacturas.total}</Tag>
              </Space>
            }
            loading={loadingFacturas}
          >
            {/* RESUMEN DE FACTURAS */}
            <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
              <Col xs={24} sm={12} md={6}>
                <Card size="small" style={{ background: '#0a0a0a', borderColor: '#a4ee6b' }}>
                  <Statistic
                    title="Total Facturas"
                    value={resumenFacturas.total}
                    valueStyle={{ fontSize: 20 }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card size="small" style={{ background: '#0c0c0c', borderColor: 'rgb(212, 121, 121)' }}>
                  <Statistic
                    title="Pagadas"
                    value={resumenFacturas.pagadas}
                    valueStyle={{ fontSize: 20, color: '#52c41a' }}
                    prefix={<CheckCircleOutlined />}
                  />
                  <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                    ${resumenFacturas.totalPagado.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                  </div>
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card size="small" style={{ background: '#0c0c0c', borderColor: '#ffd591' }}>
                  <Statistic
                    title="Pendientes"
                    value={resumenFacturas.pendientes}
                    valueStyle={{ fontSize: 20, color: '#fa8c16' }}
                    prefix={<ClockCircleOutlined />}
                  />
                  <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                    ${resumenFacturas.totalPendiente.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                  </div>
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card size="small" style={{ background: '#0c0c0c', borderColor: '#ffccc7' }}>
                  <Statistic
                    title="Por Cobrar"
                    value={resumenFacturas.totalPendiente}
                    prefix={<DollarOutlined />}
                    valueStyle={{ fontSize: 20, color: '#ff4d4f' }}
                    suffix="$"
                    precision={2}
                  />
                </Card>
              </Col>
            </Row>

            {/* BUSCADOR Y TABLA */}
            <div style={{ marginBottom: 16 }}>
              <Input
                placeholder="Buscar facturas por: #factura, cliente, placa, estado..."
                prefix={<SearchOutlined />}
                value={searchFacturas}
                onChange={(e) => setSearchFacturas(e.target.value)}
                allowClear
                style={{ width: 400 }}
              />
            </div>
            
            {filtrarFacturas().length > 0 ? (
              <Table
                columns={columnsFacturas}
                dataSource={filtrarFacturas()}
                rowKey="id"
                pagination={{ 
                  pageSize: 5,
                  showSizeChanger: true,
                  showTotal: (total) => `${total} facturas encontradas`
                }}
                size="small"
                scroll={{ x: 1100 }}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
                {searchFacturas 
                  ? `No se encontraron facturas para "${searchFacturas}"`
                  : 'No hay facturas en el periodo seleccionado'}
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* ÓRDENES DE SERVICIO EN EL INTERVALO */}
      <Row gutter={[16, 16]} style={{ marginTop: 20 }}>
        <Col span={24}>
          <Card
            title={
              <Space>
                <FileTextOutlined />
                <span>Órdenes de Servicio del periodo</span>
                <Tag color="blue">{dashboardData?.totalOrdenesIntervalo || 0}</Tag>
              </Space>
            }
            loading={loading}
          >
            <div style={{ marginBottom: 16 }}>
              <Input
                placeholder="Buscar órdenes por: #orden, cliente, placa, estado..."
                prefix={<SearchOutlined />}
                value={searchOrdenes}
                onChange={(e) => setSearchOrdenes(e.target.value)}
                allowClear
                style={{ width: 400 }}
              />
            </div>
            
            {filtrarOrdenes().length > 0 ? (
              <Table
                columns={columnsOrdenes}
                dataSource={filtrarOrdenes()}
                rowKey="id"
                pagination={{ 
                  pageSize: 5,
                  showSizeChanger: true,
                  showTotal: (total) => `${total} órdenes encontradas`
                }}
                size="small"
                scroll={{ x: 1000 }}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
                {searchOrdenes 
                  ? `No se encontraron órdenes para "${searchOrdenes}"`
                  : 'No hay órdenes en el periodo seleccionado'}
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* PRODUCTOS MÁS VENDIDOS */}
      <Row gutter={[16, 16]} style={{ marginTop: 20 }}>
        <Col span={24}>
          <Card
            title={
              <Space>
                <ShoppingOutlined />
                <span>Productos Más Vendidos del periodo</span>
              </Space>
            }
            loading={loading}
          >
            {dashboardData?.productosMasVendidos?.length > 0 ? (
              <Table
                columns={columnsProductos}
                dataSource={dashboardData.productosMasVendidos}
                rowKey="id"
                pagination={{ pageSize: 5 }}
                size="small"
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                No hay ventas de productos en el periodo seleccionado
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* CLIENTES CON MÁS PAGOS Y CLIENTES NUEVOS */}
      <Row gutter={[16, 16]} style={{ marginTop: 20 }}>
        <Col xs={24} md={12}>
          <Card
            title={
              <Space>
                <TeamOutlined />
                <span>Clientes con más pagos</span>
              </Space>
            }
            loading={loading}
          >
            {dashboardData?.clientesConMasPagos?.length > 0 ? (
              <Table
                columns={columnsClientesPagos}
                dataSource={dashboardData.clientesConMasPagos.slice(0, 5)}
                rowKey="cliente_id"
                pagination={false}
                size="small"
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                No hay pagos de clientes en el periodo
              </div>
            )}
          </Card>
        </Col>

        {/* CLIENTES NUEVOS */}
        <Col xs={24} md={12}>
          <Card
            title={
              <Space>
                <UserOutlined />
                <span>Clientes Nuevos ({dashboardData?.totalClientesNuevos || 0})</span>
              </Space>
            }
            loading={loading}
          >
            <div style={{ marginBottom: 16 }}>
              <Input
                placeholder="Buscar clientes nuevos..."
                prefix={<SearchOutlined />}
                value={searchClientes}
                onChange={(e) => setSearchClientes(e.target.value)}
                allowClear
                style={{ width: '100%' }}
              />
            </div>
            
            {filtrarClientesNuevos().length > 0 ? (
              <Table
                columns={columnsClientesNuevos}
                dataSource={filtrarClientesNuevos()}
                rowKey="id"
                pagination={{ pageSize: 5 }}
                size="small"
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                {searchClientes 
                  ? `No se encontraron clientes para "${searchClientes}"`
                  : 'No hay clientes nuevos en el periodo'}
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* PANEL DE EXPORTACIÓN COMPLETA */}
      <Row gutter={[16, 16]} style={{ marginTop: 20, marginBottom: 20 }}>
        <Col span={24}>
          <Card title="Exportación de Reportes">
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8}>
                <Card hoverable style={{ height: '100%' }}>
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <FileExcelOutlined style={{ fontSize: 32, color: '#52c41a', marginBottom: 16 }} />
                    <h4>Facturas</h4>
                    <p style={{ color: '#666', marginBottom: 16 }}>
                      Exporte todas las facturas del periodo seleccionado
                    </p>
                    <Button 
                      type="primary" 
                      icon={<DownloadOutlined />}
                      onClick={handleExportFacturas}
                      loading={exportLoading === 'facturas'}
                      disabled={!dateRange || !dateRange[0] || !dateRange[1]}
                      style={{ width: '100%' }}
                    >
                      Exportar Facturas
                    </Button>
                    <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
                      {dateRange && dateRange[0] && dateRange[1] 
                        ? `Periodo: ${dateRange[0].format('DD/MM')} - ${dateRange[1].format('DD/MM')}`
                        : 'Seleccione un periodo'
                      }
                    </div>
                  </div>
                </Card>
              </Col>
              
              <Col xs={24} sm={8}>
                <Card hoverable style={{ height: '100%' }}>
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <ProductOutlined style={{ fontSize: 32, color: '#1890ff', marginBottom: 16 }} />
                    <h4>Inventario</h4>
                    <p style={{ color: '#666', marginBottom: 16 }}>
                      Exporte el inventario completo de productos
                    </p>
                    <Button 
                      type="primary" 
                      icon={<DownloadOutlined />}
                      onClick={handleExportInventario}
                      loading={exportLoading === 'inventario'}
                      style={{ width: '100%' }}
                    >
                      Exportar Inventario
                    </Button>
                    <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
                      Productos en stock
                    </div>
                  </div>
                </Card>
              </Col>
              
              <Col xs={24} sm={8}>
                <Card hoverable style={{ height: '100%' }}>
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <TeamOutlined style={{ fontSize: 32, color: '#722ed1', marginBottom: 16 }} />
                    <h4>Clientes</h4>
                    <p style={{ color: '#666', marginBottom: 16 }}>
                      Exporte todos los clientes registrados
                    </p>
                    <Button 
                      type="primary" 
                      icon={<DownloadOutlined />}
                      onClick={handleExportClientes}
                      loading={exportLoading === 'clientes'}
                      style={{ width: '100%' }}
                    >
                      Exportar Clientes
                    </Button>
                    <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
                      Base de datos completa
                    </div>
                  </div>
                </Card>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </AppLayout>
  );
}