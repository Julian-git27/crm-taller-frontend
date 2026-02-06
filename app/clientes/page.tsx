'use client';

import { useEffect, useState, useMemo } from 'react';
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
  Badge,
  Select,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  SearchOutlined,
  PhoneOutlined,
  MailOutlined,
  IdcardOutlined,
  EnvironmentOutlined,
  FilterOutlined,
  ReloadOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import api from '@/lib/api';
import ClienteForm from '@/components/ClienteForm';
import AppLayout from '@/components/AppLayout';

const { Search } = Input;
const { Option } = Select;

// Definir el tipo para las columnas
interface Cliente {
  id: number;
  nombre: string;
  identificacion?: string;
  email: string;
  telefono?: string;
  telefono2?: string;
  municipio?: string;
  direccion?: string;
  created_at: string;
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [municipioFilter, setMunicipioFilter] = useState<string>('');
  
  // Estadísticas
  const stats = useMemo(() => {
    const total = clientes.length;
    const conTelefono = clientes.filter(c => c.telefono).length;
    const conDireccion = clientes.filter(c => c.direccion).length;
    const municipiosUnicos = [...new Set(clientes.map(c => c.municipio).filter(Boolean))].length;
    
    return { total, conTelefono, conDireccion, municipiosUnicos };
  }, [clientes]);

  const municipios = useMemo(() => {
    return [...new Set(clientes.map(c => c.municipio).filter(Boolean))].sort() as string[];
  }, [clientes]);

  const loadClientes = async () => {
    setLoading(true);
    try {
      const res = await api.get('/clientes');
      setClientes(res.data);
    } catch (error) {
      console.error('Error cargando clientes:', error);
      message.error('Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClientes();
  }, []);

  const createCliente = async (values: any) => {
    try {
      await api.post('/clientes', values);
      message.success('Cliente creado exitosamente');
      setOpen(false);
      loadClientes();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al crear cliente');
    }
  };

  const updateCliente = async (values: any) => {
    try {
      await api.put(`/clientes/${editing?.id}`, values);
      message.success('Cliente actualizado exitosamente');
      setEditing(null);
      setOpen(false);
      loadClientes();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al actualizar cliente');
    }
  };

  const deleteCliente = async (id: number) => {
    try {
      await api.delete(`/clientes/${id}`);
      message.success('Cliente eliminado exitosamente');
      loadClientes();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al eliminar cliente');
    }
  };

  // Definir las columnas de la tabla
  const columns = [
    {
      title: 'IDENTIFICACIÓN',
      dataIndex: 'identificacion',
      width: 140,
      fixed: 'left' as const,
      render: (id: string) => (
        id 
          ? <div style={{ fontFamily: 'monospace', fontWeight: '600', color: '#1890ff' }}>{id}</div>
          : <Tag color="default" style={{ fontSize: '11px' }}>SIN ID</Tag>
      ),
      sorter: (a: Cliente, b: Cliente) => (a.identificacion || '').localeCompare(b.identificacion || ''),
    },
    {
      title: 'CLIENTE',
      render: (_: any, record: Cliente) => (
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{record.nombre}</div>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
            <MailOutlined style={{ marginRight: '4px', fontSize: '11px' }} />
            {record.email}
          </div>
        </div>
      ),
      sorter: (a: Cliente, b: Cliente) => a.nombre.localeCompare(b.nombre),
    },
    {
      title: 'CONTACTO',
      width: 160,
      render: (_: any, record: Cliente) => (
        <div>
          {record.telefono ? (
            <div style={{ fontSize: '12px' }}>
              <PhoneOutlined style={{ marginRight: '4px' }} />
              {record.telefono}
            </div>
          ) : (
            <Tag color="default" style={{ fontSize: '11px' }}>Sin teléfono</Tag>
          )}
          {record.telefono2 && (
            <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
              <PhoneOutlined style={{ marginRight: '4px' }} />
              {record.telefono2}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'UBICACIÓN',
      render: (_: any, record: Cliente) => (
        <div>
          {record.municipio ? (
            <div style={{ fontSize: '12px' }}>
              <EnvironmentOutlined style={{ marginRight: '4px' }} />
              {record.municipio}
            </div>
          ) : (
            <Tag color="default" style={{ fontSize: '11px' }}>Sin municipio</Tag>
          )}
          {record.direccion && (
            <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
              {record.direccion.length > 30 
                ? record.direccion.substring(0, 30) + '...'
                : record.direccion}
            </div>
          )}
        </div>
      ),
      filters: municipios.map(m => ({ text: m, value: m })),
      onFilter: (value: any, record: Cliente) => record.municipio === value,
    },
    {
      title: 'CREADO',
      dataIndex: 'created_at',
      width: 120,
      render: (date: string) => (
        <div style={{ fontSize: '11px', color: '#666' }}>
          {date ? new Date(date).toLocaleDateString('es-ES') : '-'}
        </div>
      ),
      sorter: (a: Cliente, b: Cliente) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    },
    {
      title: 'ACCIONES',
      width: 100,
      fixed: 'right' as const,
      render: (_: any, record: Cliente) => (
        <Space size="small">
          <Tooltip title="Ver/Editar">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined style={{ color: '#1890ff' }} />}
              onClick={() => {
                setEditing(record);
                setOpen(true);
              }}
            />
          </Tooltip>
          
          <Tooltip title="Eliminar">
            <Popconfirm
              title="¿Eliminar cliente?"
              description="Esta acción no se puede deshacer"
              onConfirm={() => deleteCliente(record.id)}
              okText="Sí, eliminar"
              cancelText="Cancelar"
              placement="left"
            >
              <Button
                type="text"
                danger
                size="small"
                icon={<DeleteOutlined />}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  // Filtrar clientes
  const clientesFiltrados = useMemo(() => {
    let filtered = clientes;
    
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(c => 
        c.nombre.toLowerCase().includes(searchLower) ||
        (c.identificacion && c.identificacion.includes(searchText)) ||
        c.email.toLowerCase().includes(searchLower) ||
        (c.telefono && c.telefono.includes(searchText)) ||
        (c.telefono2 && c.telefono2.includes(searchText)) ||
        (c.municipio && c.municipio.toLowerCase().includes(searchLower)) ||
        (c.direccion && c.direccion.toLowerCase().includes(searchLower))
      );
    }
    
    if (municipioFilter) {
      filtered = filtered.filter(c => c.municipio === municipioFilter);
    }
    
    return filtered;
  }, [clientes, searchText, municipioFilter]);

  const resetFilters = () => {
    setSearchText('');
    setMunicipioFilter('');
  };

  return (
    <AppLayout title="Gestión de Clientes">
      {/* Estadísticas */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Total Clientes"
              value={stats.total}
              valueStyle={{ color: '#1890ff' }}
              prefix={<IdcardOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Con Teléfono"
              value={stats.conTelefono}
              suffix={`/ ${stats.total}`}
              valueStyle={{ color: '#52c41a' }}
              prefix={<PhoneOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Municipios"
              value={stats.municipiosUnicos}
              valueStyle={{ color: '#722ed1' }}
              prefix={<EnvironmentOutlined />}
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
              Nuevo Cliente
            </Button>
          </Card>
        </Col>
      </Row>

      {/* Filtros y búsqueda */}
      <Card style={{ marginBottom: 20 }}>
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Search
              placeholder="Buscar por nombre, ID, email, teléfono..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              size="middle"
              style={{ width: '100%' }}
            />
          </Col>
          <Col>
            <Select
              placeholder="Filtrar por municipio"
              value={municipioFilter}
              onChange={setMunicipioFilter}
              allowClear
              style={{ width: 180 }}
              suffixIcon={<FilterOutlined />}
            >
              {municipios.map(mun => (
                <Option key={mun} value={mun}>{mun}</Option>
              ))}
            </Select>
          </Col>
          <Col>
            <Tooltip title="Refrescar">
              <Button
                onClick={loadClientes}
                loading={loading}
                icon={<ReloadOutlined />}
              />
            </Tooltip>
          </Col>
          {(searchText || municipioFilter) && (
            <Col>
              <Button onClick={resetFilters}>
                Limpiar filtros
              </Button>
            </Col>
          )}
        </Row>
      </Card>

      {/* Tabla de clientes */}
      <Card>
        <div style={{ marginBottom: 16, fontSize: '12px', color: '#666' }}>
          Mostrando {clientesFiltrados.length} de {clientes.length} clientes
        </div>
        
        <Table
          rowKey="id"
          columns={columns}
          dataSource={clientesFiltrados}
          loading={loading}
          size="middle"
          pagination={{ 
            pageSize: 15,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} clientes`,
          }}
          scroll={{ x: 1200 }}
          rowClassName={() => 'hover-row'}
          locale={{
            emptyText: 'No hay clientes registrados'
          }}
        />
      </Card>

      {/* Modal del formulario */}
      <Modal
        open={open}
        title={
          <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
            {editing ? 'EDITAR CLIENTE' : 'NUEVO CLIENTE'}
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
        <ClienteForm
          initialValues={editing}
          onSubmit={editing ? updateCliente : createCliente}
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
      `}</style>
    </AppLayout>
  );
}