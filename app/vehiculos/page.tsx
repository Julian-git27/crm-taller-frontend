'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Table,
  Button,
  Modal,
  Popconfirm,
  message,
  Space,
  Input,
  Row,
  Col,
  Card,
  Statistic,
  Tooltip,
  Tag,
  Select,
  DatePicker,
  Dropdown,
  MenuProps,
  Typography,
  Badge,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  SearchOutlined,
  CarOutlined,
  UserOutlined,
  DashboardOutlined,
  AlertOutlined,
  CalendarOutlined,
  FilterOutlined,
  ReloadOutlined,
  SafetyOutlined,
  ToolOutlined,
  ExclamationCircleOutlined,
  MailOutlined,
  MoreOutlined,
  NotificationOutlined,
  SendOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import api from '@/lib/api';
import VehiculoForm from '@/components/VehiculoForm';
import AppLayout from '@/components/AppLayout';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Search } = Input;
const { Option } = Select;
const { Text } = Typography;

// Definir el tipo para los vehículos
interface Vehiculo {
  id: number;
  placa: string;
  marca: string;
  modelo: string;
  anio?: number;
  cilindrajo?: number;
  color?: string;
  kilometraje?: number;
  fecha_vencimiento_soat?: string;
  fecha_vencimiento_tecnomecanica?: string;
  activo: boolean;
  cliente: {
    id: number;
    nombre: string;
    identificacion?: string;
    email?: string;
  };
}

export default function VehiculosPage() {
  
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Vehiculo | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [marcaFilter, setMarcaFilter] = useState('');
  const [soatFilter, setSoatFilter] = useState<string>('');
  const [enviandoRecordatorio, setEnviandoRecordatorio] = useState<number | null>(null);

  // Función para determinar el estado del SOAT
  const getSoatStatus = (fechaString?: string) => {
    if (!fechaString) return { color: 'default', text: 'Sin SOAT', tooltip: 'No hay fecha registrada', dias: 0 };
    
    const fecha = dayjs(fechaString);
    const hoy = dayjs();
    const diferenciaDias = fecha.diff(hoy, 'day');
    
    if (diferenciaDias < 0) {
      return { 
        color: 'error', 
        text: 'Vencido', 
        tooltip: `Vencido hace ${Math.abs(diferenciaDias)} días`,
        dias: diferenciaDias
      };
    } else if (diferenciaDias <= 7) {
      return { 
        color: 'warning', 
        text: 'Por vencer', 
        tooltip: `Vence en ${diferenciaDias} días`,
        dias: diferenciaDias
      };
    } else if (diferenciaDias <= 30) {
      return { 
        color: 'processing', 
        text: 'Vigente', 
        tooltip: `Vence en ${diferenciaDias} días`,
        dias: diferenciaDias
      };
    } else {
      return { 
        color: 'success', 
        text: 'Vigente', 
        tooltip: `Vence el ${fecha.format('DD/MM/YYYY')}`,
        dias: diferenciaDias
      };
    }
  };

  // Función para determinar el estado de la Tecnomecánica
  const getTecnoStatus = (fechaString?: string) => {
    if (!fechaString) return { color: 'default', text: 'Sin Tecno', tooltip: 'No hay fecha registrada', dias: 0 };
    
    const fecha = dayjs(fechaString);
    const hoy = dayjs();
    const diferenciaDias = fecha.diff(hoy, 'day');
    
    if (diferenciaDias < 0) {
      return { 
        color: 'error', 
        text: 'Vencida', 
        tooltip: `Vencida hace ${Math.abs(diferenciaDias)} días`,
        dias: diferenciaDias
      };
    } else if (diferenciaDias <= 7) {
      return { 
        color: 'warning', 
        text: 'Por vencer', 
        tooltip: `Vence en ${diferenciaDias} días`,
        dias: diferenciaDias
      };
    } else if (diferenciaDias <= 30) {
      return { 
        color: 'processing', 
        text: 'Vigente', 
        tooltip: `Vence en ${diferenciaDias} días`,
        dias: diferenciaDias
      };
    } else {
      return { 
        color: 'success', 
        text: 'Vigente', 
        tooltip: `Vence el ${fecha.format('DD/MM/YYYY')}`,
        dias: diferenciaDias
      };
    }
  };

  // Función para enviar recordatorio manual
  const enviarRecordatorio = async (vehiculoId: number, tipoDocumento: 'SOAT' | 'TECNOMECANICA') => {
    try {
      console.log('📨 Enviando recordatorio:', {
        vehiculoId,
        tipoDocumento,
        url: `/vehiculos-notificaciones/enviar-recordatorio/${vehiculoId}`
      });
      
      const body = {
        tipoDocumento: tipoDocumento
      };
      
      console.log('📦 Body a enviar:', body);
      
      const result = await api.post(
        `/vehiculos-notificaciones/enviar-recordatorio/${vehiculoId}`, 
        body
      );
      
      console.log('✅ Respuesta del servidor:', result.data);
      
      message.success(result.data.message || 'Recordatorio enviado exitosamente');
      return result.data;
    } catch (error: any) {
      console.error('❌ Error enviando recordatorio:', {
        error,
        response: error.response?.data,
        status: error.response?.status,
        vehiculoId,
        tipoDocumento
      });
      
      let errorMessage = 'Error al enviar recordatorio';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.status === 404) {
        errorMessage = 'Vehículo no encontrado';
      } else if (error.response?.status === 400) {
        errorMessage = 'Datos inválidos o faltantes';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      message.error(errorMessage);
      throw error;
    }
  };

  // Función para verificar todos los vencimientos
  const verificarTodosVencimientos = async () => {
    try {
      setLoading(true);
      const result = await api.get('/vehiculos-notificaciones/verificar-vencimientos');
      
      message.success(`Verificación completada: ${result.data.correosEnviados} correos enviados`);
      
      // Recargar datos para actualizar estadísticas
      await loadData();
      
      return result.data;
    } catch (error: any) {
      console.error('Error verificando vencimientos:', error);
      message.error('Error al verificar vencimientos');
    } finally {
      setLoading(false);
    }
  };

  // Menú desplegable para acciones adicionales
  const getMenuItems = (record: Vehiculo): MenuProps['items'] => [
    {
      key: 'enviar-soat',
      label: 'Enviar recordatorio SOAT',
      icon: <SafetyOutlined />,
      onClick: () => handleEnviarRecordatorio(record, 'SOAT'),
      disabled: !record.fecha_vencimiento_soat || !record.cliente?.email,
    },
    {
      key: 'enviar-tecno',
      label: 'Enviar recordatorio Tecnomecánica',
      icon: <ToolOutlined />,
      onClick: () => handleEnviarRecordatorio(record, 'TECNOMECANICA'),
      disabled: !record.fecha_vencimiento_tecnomecanica || !record.cliente?.email,
    },
    {
      type: 'divider',
    },
    {
      key: 'ver-detalle',
      label: 'Ver detalles de vencimientos',
      icon: <CalendarOutlined />,
      onClick: () => mostrarDetallesVencimientos(record),
    },
  ];

  const handleEnviarRecordatorio = async (vehiculo: Vehiculo, tipo: 'SOAT' | 'TECNOMECANICA') => {
  setEnviandoRecordatorio(vehiculo.id);
  
  Modal.confirm({
    title: `¿Enviar recordatorio de ${tipo}?`,
    icon: <InfoCircleOutlined />,
    content: (
      <div>
        <p>Se enviará un correo a: <strong>{vehiculo.cliente.email}</strong></p>
        <p>Vehículo: <strong>{vehiculo.placa} - {vehiculo.marca} {vehiculo.modelo}</strong></p>
        <p>Cliente: <strong>{vehiculo.cliente.nombre}</strong></p>
        {tipo === 'SOAT' && vehiculo.fecha_vencimiento_soat && (
          <p>
            Fecha de vencimiento: <strong>{dayjs(vehiculo.fecha_vencimiento_soat).format('DD/MM/YYYY')}</strong>
            {getSoatStatus(vehiculo.fecha_vencimiento_soat).dias < 0 && (
              <Tag color="error" style={{ marginLeft: 8 }}>
                VENCIDO
              </Tag>
            )}
          </p>
        )}
        {tipo === 'TECNOMECANICA' && vehiculo.fecha_vencimiento_tecnomecanica && (
          <p>
            Fecha de vencimiento: <strong>{dayjs(vehiculo.fecha_vencimiento_tecnomecanica).format('DD/MM/YYYY')}</strong>
            {getTecnoStatus(vehiculo.fecha_vencimiento_tecnomecanica).dias < 0 && (
              <Tag color="error" style={{ marginLeft: 8 }}>
                VENCIDA
              </Tag>
            )}
          </p>
        )}
      </div>
    ),
    okText: 'Enviar',
    cancelText: 'Cancelar',
    okButtonProps: {
      icon: <SendOutlined />,
      type: 'primary'
    },
    onOk: async () => {
      try {
        await enviarRecordatorio(vehiculo.id, tipo);
        return Promise.resolve();
      } catch (error) {
        // El error ya se maneja en la función enviarRecordatorio
        setEnviandoRecordatorio(null);
        return Promise.reject();
      }
    },
    onCancel: () => {
      setEnviandoRecordatorio(null);
    },
    afterClose: () => {
      // Esto se ejecuta después de que el modal se cierra completamente
      setEnviandoRecordatorio(null);
    }
  });
};

  const mostrarDetallesVencimientos = (vehiculo: Vehiculo) => {
    const soatStatus = getSoatStatus(vehiculo.fecha_vencimiento_soat);
    const tecnoStatus = getTecnoStatus(vehiculo.fecha_vencimiento_tecnomecanica);
    
    Modal.info({
      title: `Detalles de vencimientos - ${vehiculo.placa}`,
      width: 500,
      icon: <InfoCircleOutlined />,
      content: (
        <div>
          <Row gutter={16} style={{ marginBottom: 20 }}>
            <Col span={12}>
              <Card size="small" title="SOAT" style={{ height: '100%' }}>
                <div style={{ textAlign: 'center' }}>
                  <SafetyOutlined style={{ fontSize: 24, marginBottom: 10 }} />
                  <Tag color={soatStatus.color} style={{ display: 'block', marginBottom: 10 }}>
                    {soatStatus.text}
                  </Tag>
                  {vehiculo.fecha_vencimiento_soat ? (
                    <>
                      <div><strong>Fecha:</strong></div>
                      <div>{dayjs(vehiculo.fecha_vencimiento_soat).format('DD/MM/YYYY')}</div>
                      <div style={{ marginTop: 10 }}>
                        <Badge 
                          status={soatStatus.color === 'error' ? 'error' : 
                                 soatStatus.color === 'warning' ? 'warning' : 'success'} 
                          text={soatStatus.tooltip} 
                        />
                      </div>
                    </>
                  ) : (
                    <div style={{ color: '#999' }}>No registrada</div>
                  )}
                </div>
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small" title="Tecnomecánica" style={{ height: '100%' }}>
                <div style={{ textAlign: 'center' }}>
                  <ToolOutlined style={{ fontSize: 24, marginBottom: 10 }} />
                  <Tag color={tecnoStatus.color} style={{ display: 'block', marginBottom: 10 }}>
                    {tecnoStatus.text}
                  </Tag>
                  {vehiculo.fecha_vencimiento_tecnomecanica ? (
                    <>
                      <div><strong>Fecha:</strong></div>
                      <div>{dayjs(vehiculo.fecha_vencimiento_tecnomecanica).format('DD/MM/YYYY')}</div>
                      <div style={{ marginTop: 10 }}>
                        <Badge 
                          status={tecnoStatus.color === 'error' ? 'error' : 
                                 tecnoStatus.color === 'warning' ? 'warning' : 'success'} 
                          text={tecnoStatus.tooltip} 
                        />
                      </div>
                    </>
                  ) : (
                    <div style={{ color: '#999' }}>No registrada</div>
                  )}
                </div>
              </Card>
            </Col>
          </Row>
          
          <Card size="small" title="Información del cliente">
            <div>
              <p><strong>Nombre:</strong> {vehiculo.cliente.nombre}</p>
              <p><strong>Email:</strong> {vehiculo.cliente.email || 'No registrado'}</p>
              <p><strong>Identificación:</strong> {vehiculo.cliente.identificacion || 'No registrada'}</p>
            </div>
          </Card>
        </div>
      ),
    });
  };

  // Estadísticas
  const stats = useMemo(() => {
    const total = vehiculos.length;
    const soatPorVencer = vehiculos.filter(v => {
      if (!v.fecha_vencimiento_soat) return false;
      const fecha = dayjs(v.fecha_vencimiento_soat);
      const hoy = dayjs();
      const diferenciaDias = fecha.diff(hoy, 'day');
      return diferenciaDias <= 30 && diferenciaDias >= 0;
    }).length;
    
    const tecnoPorVencer = vehiculos.filter(v => {
      if (!v.fecha_vencimiento_tecnomecanica) return false;
      const fecha = dayjs(v.fecha_vencimiento_tecnomecanica);
      const hoy = dayjs();
      const diferenciaDias = fecha.diff(hoy, 'day');
      return diferenciaDias <= 30 && diferenciaDias >= 0;
    }).length;
    
    const soatVencidos = vehiculos.filter(v => {
      if (!v.fecha_vencimiento_soat) return false;
      return dayjs(v.fecha_vencimiento_soat).isBefore(dayjs(), 'day');
    }).length;
    
    const tecnoVencidos = vehiculos.filter(v => {
      if (!v.fecha_vencimiento_tecnomecanica) return false;
      return dayjs(v.fecha_vencimiento_tecnomecanica).isBefore(dayjs(), 'day');
    }).length;

    const sinEmail = vehiculos.filter(v => !v.cliente?.email).length;
    const sinSoat = vehiculos.filter(v => !v.fecha_vencimiento_soat).length;
    
    return { 
      total, 
      soatPorVencer, 
      tecnoPorVencer, 
      soatVencidos, 
      tecnoVencidos,
      sinEmail,
      sinSoat
    };
  }, [vehiculos]);

  const marcas = useMemo(() => {
    return [...new Set(vehiculos.map(v => v.marca).filter(Boolean))].sort();
  }, [vehiculos]);

  // 🔄 Cargar datos
  const loadData = async () => {
    setLoading(true);
    try {
      const [v, c] = await Promise.all([
        api.get('/vehiculos'),
        api.get('/clientes'),
      ]);
      setVehiculos(v.data);
      setClientes(c.data);
    } catch (error) {
      console.error('Error cargando datos:', error);
      message.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 🔍 Filtrar vehículos
  const vehiculosFiltrados = useMemo(() => {
    let filtered = vehiculos;
    
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(v =>
        v.placa.toLowerCase().includes(searchLower) ||
        (v.cliente?.nombre && v.cliente.nombre.toLowerCase().includes(searchLower)) ||
        v.marca.toLowerCase().includes(searchLower) ||
        v.modelo.toLowerCase().includes(searchLower) ||
        (v.color && v.color.toLowerCase().includes(searchLower))
      );
    }
    
    if (marcaFilter) {
      filtered = filtered.filter(v => v.marca === marcaFilter);
    }
    
    if (soatFilter) {
      const hoy = dayjs();
      filtered = filtered.filter(v => {
        if (!v.fecha_vencimiento_soat) return soatFilter === 'sin_fecha';
        
        const fecha = dayjs(v.fecha_vencimiento_soat);
        const diferenciaDias = fecha.diff(hoy, 'day');
        
        switch (soatFilter) {
          case 'vencido':
            return diferenciaDias < 0;
          case 'por_vencer':
            return diferenciaDias <= 30 && diferenciaDias >= 0;
          case 'vigente':
            return diferenciaDias > 30;
          case 'sin_fecha':
            return !v.fecha_vencimiento_soat;
          case 'sin_email':
            return !v.cliente?.email;
          default:
            return true;
        }
      });
    }
    
    return filtered;
  }, [vehiculos, search, marcaFilter, soatFilter]);

  // ➕ Crear
  const createVehiculo = async (values: any) => {
    try {
      await api.post('/vehiculos', values);
      message.success('Vehículo creado exitosamente');
      setOpen(false);
      loadData();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al crear vehículo');
    }
  };

  // ✏️ Editar
  const updateVehiculo = async (values: any) => {
    try {
      await api.put(`/vehiculos/${editing?.id}`, values);
      message.success('Vehículo actualizado exitosamente');
      setEditing(null);
      setOpen(false);
      loadData();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al actualizar vehículo');
    }
  };

  // 🗑️ Eliminar (baja lógica)
  const deleteVehiculo = async (id: number) => {
    try {
      await api.delete(`/vehiculos/${id}`);
      message.success('Vehículo eliminado exitosamente');
      loadData();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al eliminar vehículo');
    }
  };

  // Definir las columnas con el tipo correcto
  const columns: ColumnsType<Vehiculo> = [
    {
      title: 'PLACA',
      dataIndex: 'placa',
      width: 100,
      fixed: 'left',
      render: (placa: string) => (
        <Tag color="blue" style={{ fontWeight: 'bold', fontSize: '12px' }}>
          {placa}
        </Tag>
      ),
      sorter: (a, b) => a.placa.localeCompare(b.placa),
    },
    {
      title: 'VEHÍCULO',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{record.marca} {record.modelo}</div>
          <div style={{ fontSize: '11px', color: '#666' }}>
            {record.anio && <CalendarOutlined style={{ marginRight: '4px' }} />}
            {record.anio || 'Año N/A'} • 
            {record.cilindrajo ? ` ${record.cilindrajo}cc` : ''}
          </div>
        </div>
      ),
      sorter: (a, b) => `${a.marca} ${a.modelo}`.localeCompare(`${b.marca} ${b.modelo}`),
    },
    {
      title: 'COLOR',
      dataIndex: 'color',
      width: 100,
      render: (color: string) => (
        color ? (
          <div>
            <AlertOutlined style={{ marginRight: '4px', color: '#666' }} />
            {color}
          </div>
        ) : (
          <Tag color="default" style={{ fontSize: '11px' }}>Sin color</Tag>
        )
      ),
    },
    {
      title: 'KILOMETRAJE',
      dataIndex: 'kilometraje',
      width: 140,
      render: (km: number) => (
        <div style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
          <DashboardOutlined style={{ marginRight: '4px', color: '#666' }} />
          {km ? km.toLocaleString('es-ES') + ' km' : 'N/A'}
        </div>
      ),
      sorter: (a, b) => (a.kilometraje || 0) - (b.kilometraje || 0),
    },
    {
      title: 'SOAT',
      dataIndex: 'fecha_vencimiento_soat',
      width: 200,
      render: (fecha: string, record: Vehiculo) => {
        const status = getSoatStatus(fecha);
        const tieneEmail = !!record.cliente?.email;
        return (
          <Tooltip title={status.tooltip}>
            <div>
              <SafetyOutlined style={{ marginRight: '4px', color: '#666' }} />
              <Tag color={status.color} style={{ fontSize: '11px' }}>
                {status.text}
              </Tag>
              {!tieneEmail && (
                <Tooltip title="Cliente sin email registrado">
                  <ExclamationCircleOutlined 
                    style={{ 
                      marginLeft: 5, 
                      color: '#ff4d4f',
                      fontSize: '10px' 
                    }} 
                  />
                </Tooltip>
              )}
              {fecha && (
                <div style={{ fontSize: '11px', marginTop: '2px', color: '#666' }}>
                  {dayjs(fecha).format('DD/MM/YYYY')}
                </div>
              )}
            </div>
          </Tooltip>
        );
      },
      sorter: (a, b) => {
        const dateA = a.fecha_vencimiento_soat ? new Date(a.fecha_vencimiento_soat).getTime() : 0;
        const dateB = b.fecha_vencimiento_soat ? new Date(b.fecha_vencimiento_soat).getTime() : 0;
        return dateA - dateB;
      },
    },
    {
      title: 'TECNOMECÁNICA',
      dataIndex: 'fecha_vencimiento_tecnomecanica',
      width: 200,
      render: (fecha: string, record: Vehiculo) => {
        const status = getTecnoStatus(fecha);
        const tieneEmail = !!record.cliente?.email;
        return (
          <Tooltip title={status.tooltip}>
            <div>
              <ToolOutlined style={{ marginRight: '4px', color: '#666' }} />
              <Tag color={status.color} style={{ fontSize: '11px' }}>
                {status.text}
              </Tag>
              {!tieneEmail && (
                <Tooltip title="Cliente sin email registrado">
                  <ExclamationCircleOutlined 
                    style={{ 
                      marginLeft: 5, 
                      color: '#ff4d4f',
                      fontSize: '10px' 
                    }} 
                  />
                </Tooltip>
              )}
              {fecha && (
                <div style={{ fontSize: '11px', marginTop: '2px', color: '#666' }}>
                  {dayjs(fecha).format('DD/MM/YYYY')}
                </div>
              )}
            </div>
          </Tooltip>
        );
      },
      sorter: (a, b) => {
        const dateA = a.fecha_vencimiento_tecnomecanica ? new Date(a.fecha_vencimiento_tecnomecanica).getTime() : 0;
        const dateB = b.fecha_vencimiento_tecnomecanica ? new Date(b.fecha_vencimiento_tecnomecanica).getTime() : 0;
        return dateA - dateB;
      },
    },
    {
      title: 'CLIENTE',
      render: (_, record) => (
        <div>
          <div style={{ fontSize: '12px' }}>
            <UserOutlined style={{ marginRight: '4px' }} />
            {record.cliente?.nombre}
            {!record.cliente?.email && (
              <Tooltip title="Sin email registrado">
                <ExclamationCircleOutlined 
                  style={{ 
                    marginLeft: 5, 
                    color: '#ff4d4f',
                    fontSize: '10px' 
                  }} 
                />
              </Tooltip>
            )}
          </div>
          {record.cliente?.identificacion && (
            <div style={{ fontSize: '11px', color: '#666' }}>
              {record.cliente.identificacion}
            </div>
          )}
          {record.cliente?.email && (
            <div style={{ fontSize: '10px', color: '#1890ff' }}>
              ✉️ {record.cliente.email}
            </div>
          )}
        </div>
      ),
      sorter: (a, b) => (a.cliente?.nombre || '').localeCompare(b.cliente?.nombre || ''),
    },
    {
      title: 'NOTIFICAR',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small" direction="vertical">
          <Tooltip title="Enviar recordatorio SOAT">
            <Button
              type="text"
              size="small"
              icon={<SafetyOutlined />}
              onClick={() => handleEnviarRecordatorio(record, 'SOAT')}
              disabled={!record.fecha_vencimiento_soat || !record.cliente?.email}
              loading={enviandoRecordatorio === record.id}
              style={{ 
                color: record.fecha_vencimiento_soat && record.cliente?.email ? 
                  '#1890ff' : '#d9d9d9' 
              }}
            />
          </Tooltip>
          
          <Tooltip title="Enviar recordatorio Tecnomecánica">
            <Button
              type="text"
              size="small"
              icon={<ToolOutlined />}
              onClick={() => handleEnviarRecordatorio(record, 'TECNOMECANICA')}
              disabled={!record.fecha_vencimiento_tecnomecanica || !record.cliente?.email}
              loading={enviandoRecordatorio === record.id}
              style={{ 
                color: record.fecha_vencimiento_tecnomecanica && record.cliente?.email ? 
                  '#1890ff' : '#d9d9d9' 
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
    {
      title: 'ACCIONES',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Editar">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                setEditing(record);
                setOpen(true);
              }}
            />
          </Tooltip>
          
          <Popconfirm
            title="¿Eliminar vehículo?"
            description="Esta acción marcará el vehículo como inactivo"
            onConfirm={() => deleteVehiculo(record.id)}
            okText="Sí, eliminar"
            cancelText="Cancelar"
            placement="left"
          >
            <Tooltip title="Eliminar">
              <Button
                type="text"
                danger
                size="small"
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const resetFilters = () => {
    setSearch('');
    setMarcaFilter('');
    setSoatFilter('');
  };

  return (
    <AppLayout title="Gestión de Vehículos">
      {/* Estadísticas */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Total Vehículos"
              value={stats.total}
              valueStyle={{ color: '#1890ff' }}
              prefix={<CarOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="SOAT por vencer"
              value={stats.soatPorVencer}
              valueStyle={{ 
                color: stats.soatPorVencer > 0 ? '#faad14' : '#3f8600' 
              }}
              prefix={<ExclamationCircleOutlined />}
              suffix="/30 días"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="SOAT vencidos"
              value={stats.soatVencidos}
              valueStyle={{ 
                color: stats.soatVencidos > 0 ? '#cf1322' : '#3f8600' 
              }}
              prefix={<SafetyOutlined />}
            />
          </Card>
        </Col>
        
        <Col span={6}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
              style={{ width: '100%', height: '40px' }}
            >
              Nuevo Vehículo
            </Button>
          </Card>
        </Col>
      </Row>

      {/* Botón de verificación masiva */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={24}>
          <Card size="small">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Badge 
                  count={stats.sinEmail} 
                  style={{ backgroundColor: stats.sinEmail > 0 ? '#faad14' : '#52c41a' }}
                >
                  <Text type={stats.sinEmail > 0 ? "warning" : "success"}>
                    <ExclamationCircleOutlined style={{ marginRight: 8 }} />
                    {stats.sinEmail} cliente(s) sin email registrado
                  </Text>
                </Badge>
                {stats.sinSoat > 0 && (
                  <Text type="secondary" style={{ marginLeft: 16 }}>
                    <ExclamationCircleOutlined style={{ marginRight: 8 }} />
                    {stats.sinSoat} vehículo(s) sin fecha de SOAT
                  </Text>
                )}
              </div>
              <Button
                type="primary"
                icon={<NotificationOutlined />}
                onClick={verificarTodosVencimientos}
                loading={loading}
              >
                Verificar todos los vencimientos
              </Button>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Filtros y búsqueda */}
      <Card style={{ marginBottom: 20 }}>
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Search
              placeholder="Buscar por placa, cliente, marca, modelo..."
              prefix={<SearchOutlined />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
              size="middle"
              style={{ width: '100%' }}
            />
          </Col>
          <Col>
            <Select
              placeholder="Filtrar por marca"
              value={marcaFilter}
              onChange={setMarcaFilter}
              allowClear
              style={{ width: 150 }}
              suffixIcon={<FilterOutlined />}
            >
              {marcas.map(marca => (
                <Option key={marca} value={marca}>{marca}</Option>
              ))}
            </Select>
          </Col>
          <Col>
            <Select
              placeholder="Estado SOAT"
              value={soatFilter}
              onChange={setSoatFilter}
              allowClear
              style={{ width: 180 }}
            >
              <Option value="vigente">SOAT Vigente</Option>
              <Option value="por_vencer">SOAT por Vencer</Option>
              <Option value="vencido">SOAT Vencido</Option>
              <Option value="sin_fecha">Sin Fecha SOAT</Option>
              <Option value="sin_email">Cliente sin Email</Option>
            </Select>
          </Col>
          <Col>
            <Tooltip title="Refrescar">
              <Button
                onClick={loadData}
                loading={loading}
                icon={<ReloadOutlined />}
              />
            </Tooltip>
          </Col>
          {(search || marcaFilter || soatFilter) && (
            <Col>
              <Button onClick={resetFilters}>
                Limpiar filtros
              </Button>
            </Col>
          )}
        </Row>
      </Card>

      {/* Tabla de vehículos */}
      <Card>
        <div style={{ marginBottom: 16, fontSize: '12px', color: '#666' }}>
          Mostrando {vehiculosFiltrados.length} de {vehiculos.length} vehículos
          {stats.sinEmail > 0 && (
            <Tag color="warning" style={{ marginLeft: 10 }}>
              ⚠️ {stats.sinEmail} cliente(s) sin email
            </Tag>
          )}
        </div>
        
        <Table
          rowKey="id"
          columns={columns}
          dataSource={vehiculosFiltrados}
          loading={loading}
          size="middle"
          pagination={{ 
            pageSize: 15,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} vehículos`,
          }}
          scroll={{ x: 1600 }}
          rowClassName={(record) => {
            const soatStatus = getSoatStatus(record.fecha_vencimiento_soat);
            const tecnoStatus = getTecnoStatus(record.fecha_vencimiento_tecnomecanica);
            
            if (soatStatus.color === 'error' || tecnoStatus.color === 'error') {
              return 'vencido-row';
            } else if (soatStatus.color === 'warning' || tecnoStatus.color === 'warning') {
              return 'por-vencer-row';
            }
            return '';
          }}
          locale={{
            emptyText: 'No hay vehículos registrados'
          }}
        />
      </Card>

      {/* Modal del formulario */}
      <Modal
        open={open}
        title={
          <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
            {editing ? 'EDITAR VEHÍCULO' : 'NUEVO VEHÍCULO'}
          </div>
        }
        footer={null}
        onCancel={() => {
          setOpen(false);
          setEditing(null);
        }}
        destroyOnClose
        width={700}
        style={{ top: 20 }}
      >
        <VehiculoForm
          clientes={clientes}
          initialValues={editing}
          onSubmit={editing ? updateVehiculo : createVehiculo}
          onCancel={() => {
            setOpen(false);
            setEditing(null);
          }}
        />
      </Modal>

      {/* Estilos CSS adicionales */}
      <style jsx global>{`
        .hover-row:hover {
          background-color: #fafafa;
          cursor: pointer;
        }
        .ant-table-thead > tr > th {
          background-color: #f5f5f5;
          font-weight: 600;
        }
        .vencido-row {
          background-color: #fff1f0 !important;
        }
        .vencido-row:hover {
          background-color: #ffccc7 !important;
        }
        .por-vencer-row {
          background-color: #fff7e6 !important;
        }
        .por-vencer-row:hover {
          background-color: #ffe7ba !important;
        }
        .ant-tag-error {
          border-color: #ff4d4f;
          background: #fff1f0;
        }
        .ant-tag-warning {
          border-color: #faad14;
          background: #fff7e6;
        }
        .ant-tag-success {
          border-color: #52c41a;
          background: #f6ffed;
        }
      `}</style>
    </AppLayout>
  );
}