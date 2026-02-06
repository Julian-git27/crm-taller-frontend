// app/servicios/page.tsx
'use client';

import { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Modal,
  Popconfirm,
  message,
  Space,
  Tag,
  Input,
  Row,
  Col,
  Card,
  Statistic,
  Tooltip,
  Switch,
  Alert,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  SearchOutlined,
  ToolOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LockOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import ServicioForm from '@/components/ServicioForm';
import AppLayout from '@/components/AppLayout';

const { Search } = Input;

export default function ServiciosPage() {
  const router = useRouter();
  const [servicios, setServicios] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [userRol, setUserRol] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  // Verificar rol del usuario
  useEffect(() => {
    const rol = localStorage.getItem('rol');
    const token = localStorage.getItem('token');
    
    if (!token || !rol) {
      router.replace('/login');
      return;
    }
    
    if (rol !== 'VENDEDOR') {
      setAccessDenied(true);
      return;
    }
    
    setUserRol(rol);
    loadData();
  }, []);

  const loadData = async () => {
    if (userRol !== 'VENDEDOR') return;
    
    setLoading(true);
    try {
      const res = await api.get('/servicios', {
        params: { inactivos: includeInactive }
      });
      setServicios(res.data);
    } catch (error: any) {
      if (error.response?.status === 401) {
        router.replace('/login');
      } else if (error.response?.status === 403) {
        setAccessDenied(true);
      } else {
        console.error('Error cargando servicios:', error);
        message.error('Error al cargar los servicios');
      }
    } finally {
      setLoading(false);
    }
  };

  const createServicio = async (values: any) => {
    try {
      await api.post('/servicios', values);
      message.success('Servicio creado exitosamente');
      setOpen(false);
      loadData();
    } catch (error: any) {
      if (error.response?.status === 403) {
        message.error('No tiene permisos para crear servicios');
      } else {
        message.error(error.response?.data?.message || 'Error al crear servicio');
      }
    }
  };

  const updateServicio = async (values: any) => {
    try {
      await api.put(`/servicios/${editing.id}`, values);
      message.success('Servicio actualizado exitosamente');
      setEditing(null);
      setOpen(false);
      loadData();
    } catch (error: any) {
      if (error.response?.status === 403) {
        message.error('No tiene permisos para actualizar servicios');
      } else {
        message.error(error.response?.data?.message || 'Error al actualizar servicio');
      }
    }
  };

  const deleteServicio = async (id: number) => {
    try {
      await api.delete(`/servicios/${id}`);
      message.success('Servicio eliminado exitosamente');
      loadData();
    } catch (error: any) {
      if (error.response?.status === 403) {
        message.error('No tiene permisos para eliminar servicios');
      } else {
        message.error(error.response?.data?.message || 'Error al eliminar servicio');
      }
    }
  };

  const toggleActivo = async (id: number) => {
    try {
      await api.patch(`/servicios/${id}/toggle-activo`);
      setServicios(prev =>
        prev.map(s =>
          s.id === id ? { ...s, esActivo: !s.esActivo } : s
        )
      );
      message.success('Estado actualizado');
    } catch (error: any) {
      if (error.response?.status === 403) {
        message.error('No tiene permisos para cambiar estado');
      } else {
        message.error('Error al cambiar estado');
      }
    }
  };

  const formatDuracion = (minutos: number) => {
    if (minutos >= 60) {
      const horas = Math.floor(minutos / 60);
      const mins = minutos % 60;
      return mins > 0 ? `${horas}h ${mins}m` : `${horas}h`;
    }
    return `${minutos}m`;
  };

  const columns = [
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      render: (text: string, record: any) => (
        <div>
          <strong>{text}</strong>
          {record.categoria && (
            <div style={{ fontSize: '12px', color: '#666' }}>
              {record.categoria}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Precio',
      dataIndex: 'precio',
      render: (v: number) => (
        <strong style={{ color: '#e10600' }}>
          ${Number(v).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
        </strong>
      ),
      sorter: (a: any, b: any) => a.precio - b.precio,
    },
    {
      title: 'Duración',
      dataIndex: 'duracionMinutos',
      render: (minutos: number) => (
        <Tag icon={<ClockCircleOutlined />} color="blue">
          {formatDuracion(minutos)}
        </Tag>
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'esActivo',
      render: (activo: boolean, record: any) => (
        <Tooltip title="Click para cambiar estado">
          <Switch
            checked={activo}
            onChange={() => toggleActivo(record.id)}
            size="small"
          />
        </Tooltip>
      ),
    },
    {
      title: 'Repuestos',
      dataIndex: 'requiereRepuestos',
      render: (requiere: boolean) => (
        <Tag color={requiere ? 'orange' : 'default'}>
          {requiere ? 'Requiere' : 'No requiere'}
        </Tag>
      ),
    },
    {
      title: 'Acciones',
      width: 120,
      render: (_: any, record: any) => (
        <Space>
          <Tooltip title="Editar">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => {
                setEditing(record);
                setOpen(true);
              }}
            />
          </Tooltip>
          
          <Popconfirm
            title="¿Eliminar servicio?"
            description="Esta acción no se puede deshacer"
            onConfirm={() => deleteServicio(record.id)}
            okText="Sí"
            cancelText="No"
          >
            <Tooltip title="Eliminar">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Si no tiene acceso, mostrar mensaje
  if (accessDenied) {
    return (
      <AppLayout title="Acceso Denegado">
        <Card>
          <Alert
            message="Acceso Restringido"
            description={
              <div>
                <p>
                  <ExclamationCircleOutlined /> Solo los usuarios con rol <strong>VENDEDOR</strong> pueden acceder a esta página.
                </p>
                <p>
                  Tu rol actual es: <Tag color="red">{localStorage.getItem('rol') || 'No identificado'}</Tag>
                </p>
                <div style={{ marginTop: 20 }}>
                  <Button 
                    type="primary" 
                    onClick={() => router.push('/')}
                  >
                    Ir al Inicio
                  </Button>
                  <Button 
                    style={{ marginLeft: 10 }}
                    onClick={() => {
                      localStorage.clear();
                      router.push('/login');
                    }}
                  >
                    Cerrar Sesión
                  </Button>
                </div>
              </div>
            }
            type="error"
            showIcon
          />
        </Card>
      </AppLayout>
    );
  }

  // Mostrar loading mientras verificamos
  if (!userRol) {
    return (
      <AppLayout title="Cargando...">
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <p>Cargando...</p>
        </div>
      </AppLayout>
    );
  }

  // Filtrar servicios según búsqueda
  const serviciosFiltrados = searchText 
    ? servicios.filter(s => 
        s.nombre.toLowerCase().includes(searchText.toLowerCase()) ||
        (s.descripcion && s.descripcion.toLowerCase().includes(searchText.toLowerCase())) ||
        (s.categoria && s.categoria.toLowerCase().includes(searchText.toLowerCase()))
      )
    : servicios;

  const totalActivos = servicios.filter(s => s.esActivo).length;
  const totalConRepuestos = servicios.filter(s => s.requiereRepuestos).length;

  return (
    <AppLayout title="Gestión de Servicios">
      {/* Indicador de rol */}
      <div style={{ marginBottom: 16, textAlign: 'right' }}>
        <Tag color="blue" icon={<LockOutlined />}>
          Acceso: VENDEDOR
        </Tag>
      </div>

      {/* Estadísticas */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Servicios"
              value={servicios.length}
              prefix={<ToolOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Servicios Activos"
              value={totalActivos}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Con Repuestos"
              value={totalConRepuestos}
              valueStyle={{ color: '#fa8c16' }}
              prefix={<ToolOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditing(null);
                  setOpen(true);
                }}
                block
              >
                Nuevo Servicio
              </Button>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Barra de búsqueda y filtros */}
      <Card style={{ marginBottom: 20 }}>
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Search
              placeholder="Buscar por nombre, categoría o descripción..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              style={{ width: '100%' }}
            />
          </Col>
          <Col>
            <Space>
              <Tooltip title="Mostrar inactivos">
                <Switch
                  checked={includeInactive}
                  onChange={setIncludeInactive}
                  checkedChildren="Todos"
                  unCheckedChildren="Solo activos"
                />
              </Tooltip>
              <Button onClick={loadData} loading={loading}>
                Actualizar
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Tabla de servicios */}
      <Table
        rowKey="id"
        columns={columns}
        dataSource={serviciosFiltrados}
        loading={loading}
        pagination={{ 
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} servicios`,
        }}
        expandable={{
          expandedRowRender: (record) => (
            <div style={{ margin: 0, padding: '10px 50px', background: '#181717' }}>
              <p><strong>Descripción:</strong> {record.descripcion || 'No especificada'}</p>
              {record.observaciones && (
                <p><strong>Observaciones:</strong> {record.observaciones}</p>
              )}
            </div>
          ),
          rowExpandable: (record) => record.descripcion || record.observaciones,
        }}
        rowClassName={(record) => {
          if (!includeInactive && !record.esActivo) return 'row-inactive';
          if (record.requiereRepuestos) return 'row-requires-parts';
          return '';
        }}
      />

      {/* Modal del formulario */}
      <Modal
        open={open}
        title={editing ? 'Editar Servicio' : 'Nuevo Servicio'}
        footer={null}
        onCancel={() => {
          setOpen(false);
          setEditing(null);
        }}
        destroyOnClose
        width={700}
      >
        <ServicioForm
          initialValues={editing}
          onSubmit={editing ? updateServicio : createServicio}
        />
      </Modal>

      {/* Estilos CSS personalizados */}
      <style jsx global>{`
        .row-inactive {
          background-color: #1d1b1b;
          opacity: 0.7;
        }
        .row-inactive td {
          color: #999 !important;
        }
        .row-requires-parts {
          border-left: 4px solid #fa8c16;
        }
        .ant-table-row:hover {
          background-color: #070606 !important;
        }
      `}</style>
    </AppLayout>
  );
}