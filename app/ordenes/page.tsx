'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Table,
  Button,
  Modal,
  Tag,
  Space,
  message,
  Popconfirm,
  Input,
  Row,
  Col,
  Card,
  Statistic,
  Tooltip,
  Select,
  Spin,
} from 'antd';
import {
  PlusOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  FilePdfOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ToolOutlined,
  DollarOutlined,
  ReloadOutlined,
  FilterOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import api from '@/lib/api';
import AppLayout from '@/components/AppLayout';
import OrdenForm from '@/components/OrdenForm';
import { exportOrdenPDF } from '@/lib/pdfOrden';
import type { ColumnsType } from 'antd/es/table';

const { Search } = Input;
const { Option } = Select;

interface Cliente {
  id: number;
  nombre: string;
  identificacion?: string;
  telefono?: string;
  email: string;
}

interface Vehiculo {
  id: number;
  placa: string;
  marca: string;
  modelo: string;
  cliente: Cliente;
}

interface Mecanico {
  id: number;
  nombre: string;
}

interface Orden {
  id: number;
  cliente: Cliente;
  vehiculo: Vehiculo;
  mecanico: Mecanico;
  estado: string;
  total: number;
  created_at: string;
  detalles?: any[];
}

export default function OrdenesPage() {
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [mecanicos, setMecanicos] = useState<Mecanico[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Orden | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingLoading, setEditingLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [modalKey, setModalKey] = useState<string>('modal-' + Date.now());
  
  // ✅ CORREGIDO: Movido dentro del componente
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [ordenAEliminar, setOrdenAEliminar] = useState<number | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [o, c, v, m] = await Promise.all([
        api.get('/ordenes-servicio'),
        api.get('/clientes'),
        api.get('/vehiculos'),
        api.get('/mecanicos'),
      ]);

      const ordenesFormateadas = o.data
        .map((orden: any) => ({
          ...orden,
          total: Number(orden.total) || 0,
          created_at: orden.created_at || orden.fecha_ingreso,
        }))
        .sort((a: Orden, b: Orden) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

      setOrdenes(ordenesFormateadas);
      setClientes(c.data);
      setVehiculos(v.data);
      setMecanicos(m.data);
    } catch (error: any) {
      message.error(
        error.response?.data?.message || 
        'Error al cargar datos. Verifica la conexión.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const cambiarEstado = async (id: number, estado: string) => {
    try {
      await api.patch(`/ordenes-servicio/${id}/estado`, { estado });
      message.success(`Orden ${id} actualizada a ${estado}`);
      
      setOrdenes(prev => prev.map(orden => 
        orden.id === id ? { ...orden, estado } : orden
      ));
      
      setTimeout(() => loadData(), 500);
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al cambiar estado');
    }
  };

  const eliminarOrden = (id: number) => {
    setOrdenAEliminar(id);
    setAdminPassword('');
    setPasswordModalOpen(true);
  };

  const estadoTag = (estado: string) => {
    const map: Record<string, { color: string; label: string }> = {
      RECIBIDA: { color: 'blue', label: 'Recibida' },
      EN_PROCESO: { color: 'orange', label: 'En Proceso' },
      TERMINADA: { color: 'green', label: 'Terminada' },
      FACTURADA: { color: 'purple', label: 'Facturada' },
    };
    
    const config = map[estado] || { color: 'default', label: estado };
    return <Tag color={config.color}>{config.label}</Tag>;
  };

  const handleEditOrden = async (id: number) => {
    setEditingLoading(true);
    
    if (open) {
      setOpen(false);
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    try {
      const response = await api.get(`/ordenes-servicio/${id}`, {
        params: { t: Date.now() }
      });
      
      const ordenData = response.data;
      
      const ordenFormateada = {
        ...ordenData,
        total: Number(ordenData.total) || 0,
      };
      
      const newModalKey = `orden-${id}-${Date.now()}`;
      setModalKey(newModalKey);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      setEditing(ordenFormateada);
      setOpen(true);
      
    } catch (error) {
      message.error('Error al cargar la orden');
    } finally {
      setEditingLoading(false);
    }
  };

  const handleCloseModal = () => {
    setOpen(false);
    setTimeout(() => {
      setEditing(null);
      setModalKey('modal-' + Date.now());
    }, 300);
  };

  const refreshOrdenInTable = async (ordenId: number) => {
    try {
      const response = await api.get(`/ordenes-servicio/${ordenId}`, {
        params: { _: Date.now() }
      });
      
      const ordenActualizada = response.data;
      
      setOrdenes(prev => prev.map(orden => 
        orden.id === ordenId ? {
          ...ordenActualizada,
          total: Number(ordenActualizada.total) || 0,
        } : orden
      ));
    } catch (error) {
      // Silently fail
    }
  };

  const stats = useMemo(() => {
    const total = ordenes.length;
    const recibidas = ordenes.filter(o => o.estado === 'RECIBIDA').length;
    const enProceso = ordenes.filter(o => o.estado === 'EN_PROCESO').length;
    const totalIngresos = ordenes.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    
    return { total, recibidas, enProceso, totalIngresos };
  }, [ordenes]);

  const estados = ['RECIBIDA', 'EN_PROCESO', 'TERMINADA', 'FACTURADA'];

  const ordenesFiltradas = useMemo(() => {
    let filtered = [...ordenes];
    
    if (searchText) {
      const searchLower = searchText.toLowerCase().trim();
      filtered = filtered.filter(o => {
        const matchCliente = o.cliente.nombre.toLowerCase().includes(searchLower);
        const matchIdentificacion = o.cliente.identificacion?.toLowerCase().includes(searchLower);
        const matchPlaca = o.vehiculo.placa.toLowerCase().includes(searchLower);
        const matchMecanico = o.mecanico.nombre.toLowerCase().includes(searchLower);
        const matchId = o.id.toString().includes(searchText);
        
        return matchCliente || matchIdentificacion || matchPlaca || matchMecanico || matchId;
      });
    }
    
    if (estadoFilter) {
      filtered = filtered.filter(o => o.estado === estadoFilter);
    }
    
    return filtered;
  }, [ordenes, searchText, estadoFilter]);

  const columns: ColumnsType<Orden> = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 80,
      render: (id: number) => (
        <Tag color="blue" style={{ fontWeight: 'bold' }}>
          #{id}
        </Tag>
      ),
      sorter: (a, b) => a.id - b.id,
    },
    {
      title: 'CLIENTE',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '13px' }}>
            {record.cliente.nombre}
          </div>
          <div style={{ fontSize: '11px', color: '#666' }}>
            {record.cliente.identificacion || 'Sin identificación'}
          </div>
          {record.cliente.telefono && (
            <div style={{ fontSize: '11px', color: '#666' }}>
              📞 {record.cliente.telefono}
            </div>
          )}
        </div>
      ),
      sorter: (a, b) => a.cliente.nombre.localeCompare(b.cliente.nombre),
    },
    {
      title: 'VEHÍCULO',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '13px' }}>
            🚗 {record.vehiculo.placa}
          </div>
          <div style={{ fontSize: '11px', color: '#666' }}>
            {record.vehiculo.marca} {record.vehiculo.modelo}
          </div>
        </div>
      ),
      sorter: (a, b) => a.vehiculo.placa.localeCompare(b.vehiculo.placa),
    },
    {
      title: 'MECÁNICO',
      dataIndex: ['mecanico', 'nombre'],
      render: (nombre: string) => (
        <div style={{ fontSize: '12px' }}>
          <ToolOutlined style={{ marginRight: '4px', color: '#666' }} />
          {nombre}
        </div>
      ),
    },
    {
      title: 'ESTADO',
      dataIndex: 'estado',
      width: 120,
      render: (estado: string) => estadoTag(estado),
      filters: estados.map(e => ({ text: e, value: e })),
      onFilter: (value, record) => record.estado === value,
    },
    {
      title: 'TOTAL',
      dataIndex: 'total',
      width: 120,
      render: (total: number) => (
        <div style={{ fontWeight: 'bold', color: '#e10600', fontSize: '13px' }}>
          <DollarOutlined style={{ marginRight: '4px' }} />
          ${Number(total || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
        </div>
      ),
      sorter: (a, b) => (Number(a.total) || 0) - (Number(b.total) || 0),
    },
    {
      title: 'FECHA',
      dataIndex: 'created_at',
      width: 100,
      render: (date: string) => (
        <div style={{ fontSize: '11px' }}>
          {new Date(date).toLocaleDateString('es-ES')}
        </div>
      ),
      sorter: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    },
    {
      title: 'ACCIONES',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          {record.estado === 'RECIBIDA' && (
            <Tooltip title="Iniciar trabajo">
              <Button
                type="text"
                size="small"
                icon={<PlayCircleOutlined style={{ color: '#1890ff' }} />}
                onClick={() => cambiarEstado(record.id, 'EN_PROCESO')}
              />
            </Tooltip>
          )}

          {record.estado === 'EN_PROCESO' && (
            <Tooltip title="Marcar como terminado">
              <Button
                type="text"
                size="small"
                icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                onClick={() => cambiarEstado(record.id, 'TERMINADA')}
              />
            </Tooltip>
          )}

          {record.estado !== 'FACTURADA' && (
            <Tooltip title="Editar orden">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEditOrden(record.id)}
                loading={editingLoading && editing?.id === record.id}
                disabled={editingLoading}
              />
            </Tooltip>
          )}

          {record.estado === 'RECIBIDA' && (
            <Tooltip title="Eliminar orden">
              <Button
                type="text"
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={() => eliminarOrden(record.id)}
              />
            </Tooltip>
          )}

          <Tooltip title="Generar PDF">
            <Button
              type="text"
              size="small"
              icon={<FilePdfOutlined style={{ color: '#ff4d4f' }} />}
              onClick={async () => {
                try {
                  const res = await api.get(`/ordenes-servicio/${record.id}`);
                  exportOrdenPDF(res.data);
                } catch (error) {
                  message.error('Error al generar PDF');
                }
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const resetFilters = () => {
    setSearchText('');
    setEstadoFilter('');
  };

  return (
    <AppLayout title="Órdenes de Servicio">
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" hoverable>
            <Statistic
              title="Total Órdenes"
              value={stats.total}
              valueStyle={{ color: '#1890ff' }}
              prefix={<FilePdfOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" hoverable>
            <Statistic
              title="Recibidas"
              value={stats.recibidas}
              valueStyle={{ color: '#1890ff' }}
              prefix={<FilePdfOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" hoverable>
            <Statistic
              title="En Proceso"
              value={stats.enProceso}
              valueStyle={{ color: '#faad14' }}
              prefix={<ToolOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" hoverable>
            <Statistic
              title="Ingresos Totales"
              value={stats.totalIngresos}
              valueStyle={{ color: '#52c41a' }}
              prefix={<DollarOutlined />}
              formatter={(value) => `$${Number(value).toLocaleString('es-ES', { minimumFractionDigits: 2 })}`}
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginBottom: 20 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={10}>
            <Search
              placeholder="Buscar por ID, cliente, cédula, placa, mecánico..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              size="middle"
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={12} md={6}>
            <Select
              placeholder="Filtrar por estado"
              value={estadoFilter}
              onChange={setEstadoFilter}
              allowClear
              style={{ width: '100%' }}
              suffixIcon={<FilterOutlined />}
            >
              {estados.map(estado => (
                <Option key={estado} value={estado}>
                  {estadoTag(estado)}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={12} md={4}>
            <Tooltip title="Refrescar datos">
              <Button
                onClick={loadData}
                loading={loading}
                icon={<ReloadOutlined />}
                style={{ width: '100%' }}
              >
                {!loading && 'Actualizar'}
              </Button>
            </Tooltip>
          </Col>
          {(searchText || estadoFilter) && (
            <Col xs={24} md={4}>
              <Button onClick={resetFilters} style={{ width: '100%' }}>
                Limpiar filtros
              </Button>
            </Col>
          )}
          <Col xs={24} md={4}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setModalKey('nueva-orden-' + Date.now());
                setEditing(null);
                setOpen(true);
              }}
              style={{ width: '100%' }}
            >
              Nueva Orden
            </Button>
          </Col>
        </Row>
      </Card>

      <Card>
        <div style={{ marginBottom: 16, fontSize: '12px', color: '#666' }}>
          Mostrando {ordenesFiltradas.length} de {ordenes.length} órdenes
          {searchText && ` • Buscando: "${searchText}"`}
          {estadoFilter && ` • Estado: ${estadoFilter}`}
        </div>
        
        <Table
          rowKey="id"
          columns={columns}
          dataSource={ordenesFiltradas}
          loading={loading}
          size="middle"
          pagination={{ 
            pageSize: 15,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} órdenes`,
            position: ['bottomCenter'],
          }}
          scroll={{ x: 1300 }}
          rowClassName={(record) => {
            if (record.estado === 'RECIBIDA') return 'row-recibida';
            if (record.estado === 'EN_PROCESO') return 'row-en-proceso';
            if (record.estado === 'TERMINADA') return 'row-terminada';
            return '';
          }}
          locale={{
            emptyText: loading ? (
              <div style={{ padding: '40px 0' }}>
                <Spin size="large" />
                <div style={{ marginTop: 16 }}>Cargando órdenes...</div>
              </div>
            ) : (
              <div style={{ padding: '40px 0', color: '#999' }}>
                No hay órdenes registradas
                {searchText || estadoFilter ? ' con los filtros aplicados' : ''}
              </div>
            )
          }}
        />
      </Card>

      <Modal
        key={modalKey}
        open={open}
        onCancel={() => {
          setOpen(false);
          setTimeout(() => {
            setEditing(null);
            setModalKey(`modal-${Date.now()}`);
          }, 300);
        }}
        footer={null}
        title={
          <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
            {editing ? `EDITAR ORDEN #${editing.id}` : 'NUEVA ORDEN'}
            {editing && (
              <div style={{ fontSize: '12px', color: '#666', fontWeight: 'normal' }}>
                Total: ${Number(editing.total || 0).toFixed(2)} • 
                Items: {editing.detalles?.length || 0} • 
                Estado: {editing.estado}
              </div>
            )}
          </div>
        }
        destroyOnClose={true}
        width={1000}
        style={{ top: 20 }}
        maskClosable={false}
      >
        {editingLoading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>Cargando orden...</div>
          </div>
        ) : (
          <OrdenForm
            key={editing ? `form-edit-${editing.id}-${Date.now()}` : `form-new-${Date.now()}`}
            clientes={clientes}
            vehiculos={vehiculos}
            mecanicos={mecanicos}
            initialValues={editing}
            ordenId={editing?.id}
            onClienteCreado={(nuevoCliente: Cliente) => {
              setClientes(prev => [...prev, nuevoCliente]);
            }}
            onVehiculoCreado={(nuevoVehiculo: Vehiculo) => {
              setVehiculos(prev => [...prev, nuevoVehiculo]);
            }}
            onSubmit={async () => {
              if (editing?.id) {
                await refreshOrdenInTable(editing.id);
              }
              
              await loadData();
              handleCloseModal();
              message.success(editing ? 'Orden actualizada' : 'Orden creada');
            }}
          />
        )}
      </Modal>

      {/* Modal para confirmar eliminación con contraseña */}
      <Modal
        open={passwordModalOpen}
        title="Confirmación requerida"
        okText="Eliminar orden"
        okType="danger"
        cancelText="Cancelar"
        confirmLoading={confirmLoading}
        onCancel={() => setPasswordModalOpen(false)}
        onOk={async () => {
          if (!adminPassword) {
            message.error('Ingrese la contraseña del administrador');
            return;
          }

          if (!ordenAEliminar) {
            message.error('No hay orden seleccionada');
            return;
          }

          setConfirmLoading(true);
          try {
            // Verifica si tu backend tiene este endpoint
            await api.delete(
              `/ordenes-servicio/${ordenAEliminar}/secure`,
              {
                data: { password: adminPassword },
              }
            );

            message.success(`Orden #${ordenAEliminar} eliminada`);
            setOrdenes(prev => prev.filter(o => o.id !== ordenAEliminar));
            setPasswordModalOpen(false);
            loadData();
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
          Para eliminar esta orden debes ingresar la contraseña del
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

      <style jsx global>{`
        .hover-row:hover {
          background-color: #fafafa !important;
          cursor: pointer;
        }
        .ant-table-thead > tr > th {
          background-color: #f5f5f5;
          font-weight: 600;
          white-space: nowrap;
        }
        .row-recibida {
          border-left: 4px solid #1890ff;
        }
        .row-en-proceso {
          border-left: 4px solid #faad14;
        }
        .row-terminada {
          border-left: 4px solid #52c41a;
        }
        .ant-table-tbody > tr.ant-table-row:hover > td {
          background-color: #f0f7ff;
        }
        .ant-table-container {
          overflow-x: auto;
        }
      `}</style>
    </AppLayout>
  );
}