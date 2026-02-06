'use client';

import { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Card,
  Tag,
  Space,
  Modal,
  message,
  Tooltip,
  Input,
  Form,
  Select,
  InputNumber,
  Row,
  Col,
  Typography,
  Divider,
  Spin,
  Popconfirm,
  Alert,
} from 'antd';
import type { ColumnType } from 'antd/es/table';
import {
  FilePdfOutlined,
  EyeOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  PlusOutlined,
  ShoppingOutlined,
  ApiOutlined,
  DeleteOutlined,
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { exportOrdenPDF } from '@/lib/pdfOrden';

const { TextArea } = Input;
const { Text } = Typography;

// Interfaces actualizadas según tu backend
interface Cliente {
  id: number;
  nombre: string;
  email?: string;
  telefono?: string;
  identificacion?: string;
}

interface Vehiculo {
  id: number;
  placa: string;
  marca: string;
  modelo: string;
  anio?: number;
  cliente?: Cliente;
}

interface Mecanico {
  id: number;
  nombre: string;
  especialidad?: string;
  activo?: boolean;
}

interface Servicio {
  id: number;
  nombre: string;
  precio: number;
  descripcion?: string;
  tiempo_estimado?: number;
  categoria?: string;
  activo?: boolean;
  esActivo?: boolean;
}

interface Producto {
  id: number;
  nombre: string;
  precio: number;
  stock?: number;
  codigo?: string;
  categoria?: string;
  activo?: boolean;
}

interface Detalle {
  id: number;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  tipo: 'PRODUCTO' | 'SERVICIO' | 'OTRO';
  producto?: Producto;
  servicio?: Servicio;
  productoId?: number;
  servicioId?: number;
  subtotal?: number;
}

interface Orden {
  id: number;
  estado: 'RECIBIDA' | 'EN_PROCESO' | 'TERMINADA' | 'FACTURADA' | 'CANCELADA';
  total: number;
  observaciones?: string;
  fecha_ingreso: string;
  fecha_creacion?: string;
  created_at?: string;
  cliente: Cliente;
  vehiculo: Vehiculo;
  mecanico: Mecanico;
  detalles: Detalle[]; // Tu backend usa 'detalles' no separados
}

export default function MiTrabajoPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Orden | null>(null);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [form] = Form.useForm();
  
  // Estados para edición inline
  const [editandoDetalleId, setEditandoDetalleId] = useState<number | null>(null);
  const [nuevaCantidad, setNuevaCantidad] = useState<number>(1);
  
  // Estados para agregar nuevos productos
  const [nuevoProductoId, setNuevoProductoId] = useState<number | null>(null);
  const [cantidadNuevoProducto, setCantidadNuevoProducto] = useState<number>(1);

  useEffect(() => {
    // Verificar autenticación
    if (!authLoading && (!isAuthenticated || !user)) {
      router.replace('/login');
      return;
    }

    // Verificar que sea mecánico
    if (user && user.rol !== 'MECANICO') {
      router.replace('/dashboard');
      return;
    }

    // Cargar datos si es mecánico
    if (user?.rol === 'MECANICO') {
      cargarMisOrdenes();
      cargarProductosDisponibles();
    }
  }, [user, authLoading, isAuthenticated, router]);

  // 🔧 USAR EL ENDPOINT CORRECTO: /ordenes-servicio/mis-ordenes
  const cargarMisOrdenes = async () => {
  // Verificar que el usuario tenga el rol correcto y mecanicoId
  if (!user || user.rol !== 'MECANICO') {
    console.warn('Usuario no es mecánico o no está autenticado');
    setOrdenes([]);
    return;
  }
  
  if (!user.mecanicoId) {
    console.warn('Usuario no tiene mecanicoId asignado');
    message.warning('No tienes un ID de mecánico asignado. Contacta al administrador.');
    setOrdenes([]);
    return;
  }
  
  setLoading(true);
  try {
    console.log('Cargando órdenes para mecánico:', user.mecanicoId);
    
    // Primero intentar con el endpoint específico
    const res = await api.get('/ordenes-servicio/mis-ordenes');
    
    // Filtrar para excluir órdenes FACTURADAS
    const ordenesFiltradas = res.data.filter(
      (o: Orden) => o.estado !== 'FACTURADA'
    );
    
    console.log('Órdenes cargadas:', ordenesFiltradas.length);
    setOrdenes(ordenesFiltradas);
    
  } catch (error: any) {
    console.error('Error detallado cargando mis órdenes:', error);
    
    // Si falla el endpoint específico, intentar con el endpoint general
    try {
      console.log('Intentando con endpoint general...');
      const res = await api.get('/ordenes-servicio');
      
      // Filtrar manualmente las órdenes del mecánico
      const ordenesFiltradas = res.data.filter(
        (o: Orden) => 
          o.mecanico?.id === user.mecanicoId && 
          o.estado !== 'FACTURADA'
      );
      
      console.log('Órdenes cargadas (general):', ordenesFiltradas.length);
      setOrdenes(ordenesFiltradas);
      
    } catch (generalError: any) {
      console.error('Error con endpoint general:', generalError);
      
      // Si ambos fallan, mostrar un mensaje más específico
      if (error.response?.status === 400) {
        message.error('Error de autenticación. Por favor, inicia sesión nuevamente.');
      } else if (error.response?.status === 401 || error.response?.status === 403) {
        message.error('No tienes permiso para ver estas órdenes.');
      } else {
        message.error('Error cargando órdenes. Verifica tu conexión.');
      }
      
      setOrdenes([]);
    }
  } finally {
    setLoading(false);
  }
};

  const cargarProductosDisponibles = async () => {
    try {
      // Solo cargar productos con stock > 0
      const res = await api.get('/productos?stock=gt:0');
      setProductos(res.data);
    } catch {
      message.error('Error cargando productos disponibles');
    }
  };

  const cambiarEstado = async (id: number, estado: string) => {
    try {
      await api.patch(`/ordenes-servicio/${id}/estado`, { estado });
      message.success(`Orden ${id} → ${estado}`);
      cargarMisOrdenes();
    } catch {
      message.error('Error cambiando estado');
    }
  };

  const abrirOrden = async (id: number) => {
    try {
      const res = await api.get(`/ordenes-servicio/${id}`);
      console.log('Orden cargada:', res.data);
      setEditing(res.data);
      form.setFieldsValue({
        observaciones: res.data.observaciones || '',
      });
      setOpen(true);
    } catch {
      message.error('Error cargando orden');
    }
  };

  // 🔧 AGREGAR PRODUCTO USANDO EL ENDPOINT PARA MECÁNICOS
  const agregarProducto = async () => {
    if (!editing || !nuevoProductoId) return;
    
    try {
      const productoSeleccionado = productos.find(p => p.id === nuevoProductoId);
      if (!productoSeleccionado) {
        message.error('Producto no encontrado');
        return;
      }

      // Verificar stock
      if ((productoSeleccionado.stock || 0) < cantidadNuevoProducto) {
        message.error(`Stock insuficiente. Disponible: ${productoSeleccionado.stock}`);
        return;
      }

      // Crear array con todos los detalles actuales + el nuevo
      const detallesActuales = editing.detalles || [];
      const nuevosDetalles = [
        ...detallesActuales.map(d => ({
          descripcion: d.descripcion,
          cantidad: d.cantidad,
          precio_unitario: d.precio_unitario,
          tipo: d.tipo,
          productoId: d.producto?.id || d.productoId,
          servicioId: d.servicio?.id || d.servicioId
        })),
        {
          descripcion: productoSeleccionado.nombre,
          cantidad: cantidadNuevoProducto,
          precio_unitario: productoSeleccionado.precio, // 🔒 Precio del catálogo
          tipo: 'PRODUCTO' as const,
          productoId: nuevoProductoId,
          servicioId: undefined
        }
      ];

      // 🔧 USAR EL ENDPOINT CORRECTO: PUT /ordenes-servicio/{id}/detalles-mecanico
      await api.put(`/ordenes-servicio/${editing.id}/detalles-mecanico`, nuevosDetalles);
      
      message.success('Producto agregado a la orden');
      
      // Recargar la orden
      const res = await api.get(`/ordenes-servicio/${editing.id}`);
      setEditing(res.data);
      
      // Recargar productos disponibles
      cargarProductosDisponibles();
      
      // Limpiar campos
      setNuevoProductoId(null);
      setCantidadNuevoProducto(1);
    } catch (error: any) {
      console.error('Error agregando producto:', error);
      if (error.response?.status === 403) {
        message.error('No tienes permiso para modificar esta orden');
      } else {
        message.error(error.response?.data?.message || 'Error agregando producto');
      }
    }
  };

  // 🔧 ELIMINAR DETALLE (SOLO PRODUCTOS PERMITIDOS)
  const eliminarDetalle = async (detalleId: number) => {
    if (!editing) return;
    
    try {
      // Obtener el detalle a eliminar
      const detalleAEliminar = editing.detalles.find(d => d.id === detalleId);
      if (!detalleAEliminar) {
        message.error('Detalle no encontrado');
        return;
      }
      
      // Filtrar el detalle a eliminar
      const detallesActualizados = (editing.detalles || [])
        .filter(d => d.id !== detalleId)
        .map(d => ({
          descripcion: d.descripcion,
          cantidad: d.cantidad,
          precio_unitario: d.precio_unitario,
          tipo: d.tipo,
          productoId: d.producto?.id || d.productoId,
          servicioId: d.servicio?.id || d.servicioId
        }));

      // 🔧 USAR EL ENDPOINT CORRECTO
      await api.put(`/ordenes-servicio/${editing.id}/detalles-mecanico`, detallesActualizados);
      
      message.success('Producto eliminado de la orden');
      
      // Recargar la orden
      const res = await api.get(`/ordenes-servicio/${editing.id}`);
      setEditing(res.data);
      
      // Recargar productos disponibles
      cargarProductosDisponibles();
    } catch (error: any) {
      if (error.response?.status === 403) {
        message.error('No tienes permiso para eliminar este item');
      } else {
        message.error(error.response?.data?.message || 'Error eliminando item');
      }
    }
  };

  // 🔧 ACTUALIZAR CANTIDAD DE DETALLE (SOLO PRODUCTOS)
  const actualizarCantidadDetalle = async (detalleId: number) => {
    if (!editing || editandoDetalleId === null) return;
    
    try {
      // Obtener el detalle actual
      const detalleActual = editing.detalles.find(d => d.id === detalleId);
      if (!detalleActual) {
        message.error('Detalle no encontrado');
        return;
      }
      
      // Verificar que es un producto
      if (detalleActual.tipo !== 'PRODUCTO') {
        message.error('Solo puedes modificar la cantidad de productos');
        return;
      }

      // Verificar stock si es un producto
      if (detalleActual.productoId) {
        const producto = productos.find(p => p.id === detalleActual.productoId);
        if (producto && (producto.stock || 0) < nuevaCantidad) {
          message.error(`Stock insuficiente. Disponible: ${producto.stock}`);
          return;
        }
      }

      // Crear array con todos los detalles actualizados
      const detallesActualizados = (editing.detalles || []).map(d => {
        if (d.id === detalleId) {
          return {
            descripcion: d.descripcion,
            cantidad: nuevaCantidad,
            precio_unitario: d.precio_unitario, // 🔒 Precio NO cambia
            tipo: d.tipo,
            productoId: d.producto?.id || d.productoId,
            servicioId: d.servicio?.id || d.servicioId
          };
        }
        return {
          descripcion: d.descripcion,
          cantidad: d.cantidad,
          precio_unitario: d.precio_unitario,
          tipo: d.tipo,
          productoId: d.producto?.id || d.productoId,
          servicioId: d.servicio?.id || d.servicioId
        };
      });

      // 🔧 USAR EL ENDPOINT CORRECTO
      await api.put(`/ordenes-servicio/${editing.id}/detalles-mecanico`, detallesActualizados);
      
      message.success('Cantidad actualizada');
      
      // Recargar la orden
      const res = await api.get(`/ordenes-servicio/${editing.id}`);
      setEditing(res.data);
      setEditandoDetalleId(null);
      
      // Recargar productos disponibles
      cargarProductosDisponibles();
    } catch (error: any) {
      if (error.response?.status === 403) {
        message.error('No tienes permiso para modificar este item');
      } else {
        message.error(error.response?.data?.message || 'Error actualizando cantidad');
      }
    }
  };

  const handleSubmit = async (values: any) => {
  if (!editing) return;

  try {
    await api.patch(`/ordenes-servicio/${editing.id}/observaciones`, {
      observaciones: values.observaciones || null
    });
    
    // Solución para el Problema 2: Usa message.success correctamente
    message.success('Observaciones actualizadas');
    
    setOpen(false);
    setEditing(null);
    cargarMisOrdenes();
  } catch (error: any) {
    if (error.response?.status === 400) {
      message.error('Error de validación: ' + JSON.stringify(error.response.data.message));
    } else {
      message.error(error.response?.data?.message || 'Error al actualizar orden');
    }
  }
};

  const exportPDF = async (orden: Orden) => {
    try {
      const res = await api.get(`/ordenes-servicio/${orden.id}`);
      exportOrdenPDF(res.data);
    } catch {
      message.error('Error generando PDF');
    }
  };

  const obtenerFechaOrden = (orden: Orden) => {
    return orden.fecha_ingreso || orden.fecha_creacion || orden.created_at || 'Sin fecha';
  };

  // Filtrar detalles por tipo
  const getDetallesProductos = (orden: Orden) => {
    return (orden.detalles || []).filter(d => d.tipo === 'PRODUCTO');
  };

  const getDetallesServicios = (orden: Orden) => {
    return (orden.detalles || []).filter(d => d.tipo === 'SERVICIO');
  };

  const columns: ColumnType<Orden>[] = [
    {
      title: 'Orden',
      dataIndex: 'id',
      render: (id: number) => <Tag color="blue">#{id}</Tag>,
    },
    {
      title: 'Cliente',
      render: (_: any, r: Orden) => r.cliente?.nombre || 'Sin cliente',
    },
    {
      title: 'Vehículo',
      render: (_: any, r: Orden) => (
        <div>
          <div><strong>{r.vehiculo?.placa || 'Sin placa'}</strong></div>
          <small>{r.vehiculo?.marca || ''} {r.vehiculo?.modelo || ''}</small>
        </div>
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      render: (estado: string) => {
        const colors: Record<string, string> = {
          'RECIBIDA': 'blue',
          'EN_PROCESO': 'orange',
          'TERMINADA': 'green',
          'FACTURADA': 'purple',
          'CANCELADA': 'red'
        };
        return <Tag color={colors[estado] || 'default'}>{estado.replace('_', ' ')}</Tag>;
      },
    },
    {
      title: 'Total',
      dataIndex: 'total',
      render: (total: any) => `$${Number(total || 0).toFixed(2)}`,
      align: 'right' as const,
    },
    {
      title: 'Fecha',
      render: (_: any, r: Orden) => {
        const fecha = obtenerFechaOrden(r);
        return fecha ? new Date(fecha).toLocaleDateString('es-ES') : 'Sin fecha';
      },
    },
    {
      title: 'Acciones',
      render: (_: any, r: Orden) => (
        <Space>
          <Tooltip title="Ver / Editar">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => abrirOrden(r.id)}
            />
          </Tooltip>

          {r.estado === 'RECIBIDA' && (
            <Tooltip title="Iniciar trabajo">
              <Button
                type="text"
                icon={<PlayCircleOutlined style={{ color: '#1890ff' }} />}
                onClick={() => cambiarEstado(r.id, 'EN_PROCESO')}
              />
            </Tooltip>
          )}

          {r.estado === 'EN_PROCESO' && (
            <Tooltip title="Marcar como terminada">
              <Button
                type="text"
                icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                onClick={() => cambiarEstado(r.id, 'TERMINADA')}
              />
            </Tooltip>
          )}

          <Tooltip title="Exportar PDF">
            <Button
              type="text"
              icon={<FilePdfOutlined style={{ color: '#ff4d4f' }} />}
              onClick={() => exportPDF(r)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // Mostrar loading mientras se verifica autenticación
  if (authLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '50vh' 
      }}>
        <Spin size="large" />
      </div>
    );
  }

  // Si no es mecánico, no mostrar nada
  if (!user || user.rol !== 'MECANICO') {
    return null;
  }

  return (
    <Card 
      title={
        <Space>
          <span>🛠️ Mi Trabajo</span>
          {user.nombreMecanico ? (
            <Tag color="green">{user.nombreMecanico}</Tag>
          ) : (
            <Tag color="blue">Mecánico #{user.mecanicoId}</Tag>
          )}
        </Space>
      }
      extra={
        <Button 
          type="primary" 
          onClick={cargarMisOrdenes}
          loading={loading}
        >
          Actualizar
        </Button>
      }
    >
      {ordenes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          {loading ? (
            <Spin size="large" />
          ) : (
            <>
              <div style={{ fontSize: '18px', color: '#999', marginBottom: '16px' }}>
                No tienes órdenes asignadas
              </div>
              <Button type="primary" onClick={cargarMisOrdenes}>
                Recargar
              </Button>
            </>
          )}
        </div>
      ) : (
        <Table
          loading={loading}
          rowKey="id"
          dataSource={ordenes}
          pagination={{ pageSize: 10 }}
          columns={columns}
        />
      )}

      {/* Modal para ver/editar orden */}
      <Modal
        open={open}
        title={`Orden #${editing?.id} - ${editing?.vehiculo?.placa}`}
        footer={null}
        onCancel={() => {
          setOpen(false);
          setEditing(null);
          setEditandoDetalleId(null);
          setNuevoProductoId(null);
          setCantidadNuevoProducto(1);
          form.resetFields();
        }}
        width={1000}
        destroyOnClose={true}
      >
        {editing && (
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{
              observaciones: editing.observaciones || ''
            }}
          >
            {/* Información de la orden */}
            <Card size="small" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={8}>
                  <div><Text strong>Cliente:</Text> {editing.cliente?.nombre || 'Sin cliente'}</div>
                  {editing.cliente?.telefono && (
                    <div><Text strong>Teléfono:</Text> {editing.cliente.telefono}</div>
                  )}
                </Col>
                <Col span={8}>
                  <div><Text strong>Vehículo:</Text> {editing.vehiculo?.marca} {editing.vehiculo?.modelo}</div>
                  <div><Text strong>Placa:</Text> {editing.vehiculo?.placa}</div>
                </Col>
                <Col span={8}>
                  <div><Text strong>Estado:</Text> 
                    <Tag style={{ marginLeft: 8 }} color={
                      editing.estado === 'RECIBIDA' ? 'blue' :
                      editing.estado === 'EN_PROCESO' ? 'orange' :
                      editing.estado === 'TERMINADA' ? 'green' : 'default'
                    }>
                      {editing.estado.replace('_', ' ')}
                    </Tag>
                  </div>
                  <div><Text strong>Total:</Text> ${Number(editing.total || 0).toFixed(2)}</div>
                  <div><Text strong>Fecha:</Text> {obtenerFechaOrden(editing) ? new Date(obtenerFechaOrden(editing)).toLocaleDateString('es-ES') : 'Sin fecha'}</div>
                </Col>
              </Row>
            </Card>

            {/* Observaciones */}
            <Form.Item
              label="Observaciones"
              name="observaciones"
            >
              <TextArea rows={3} placeholder="Agregar observaciones..." />
            </Form.Item>

            {/* Alerta informativa */}
            <Alert
              message="Nota importante"
              description="Como mecánico, solo puedes agregar y eliminar productos. Los servicios y sus precios deben ser gestionados por el administrador."
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />

            {/* Productos existentes */}
            {getDetallesProductos(editing).length > 0 && (
              <>
                <Divider>
                  <ShoppingOutlined /> Productos ({getDetallesProductos(editing).length})
                </Divider>
                
                <Table
                  size="small"
                  dataSource={getDetallesProductos(editing)}
                  pagination={false}
                  columns={[
                    { 
                      title: 'Producto', 
                      dataIndex: 'descripcion',
                      render: (text, record) => (
                        <div>
                          <div>{text}</div>
                          {record.producto?.codigo && (
                            <small style={{ color: '#666', fontSize: '10px' }}>
                              Código: {record.producto.codigo}
                            </small>
                          )}
                        </div>
                      )
                    },
                    { 
                      title: 'Cantidad', 
                      align: 'center' as const,
                      render: (_, record) => {
                        if (editandoDetalleId === record.id) {
                          return (
                            <Space size="small">
                              <InputNumber
                                size="small"
                                min={1}
                                value={nuevaCantidad}
                                onChange={(value) => {
                                  if (value === null) {
                                    setNuevaCantidad(1);
                                  } else {
                                    setNuevaCantidad(value);
                                  }
                                }}
                                style={{ width: 70 }}
                              />
                              <Button
                                type="text"
                                size="small"
                                icon={<SaveOutlined />}
                                onClick={() => actualizarCantidadDetalle(record.id)}
                              />
                              <Button
                                type="text"
                                size="small"
                                icon={<CloseOutlined />}
                                onClick={() => setEditandoDetalleId(null)}
                              />
                            </Space>
                          );
                        }
                        return (
                          <Space>
                            <span>{record.cantidad}</span>
                            {editing.estado !== 'FACTURADA' && (
                              <Button
                                type="text"
                                size="small"
                                icon={<EditOutlined />}
                                onClick={() => {
                                  setEditandoDetalleId(record.id);
                                  setNuevaCantidad(record.cantidad);
                                }}
                              />
                            )}
                          </Space>
                        );
                      }
                    },
                    { 
                      title: 'Precio Unit.', 
                      dataIndex: 'precio_unitario',
                      render: (precio) => (
                        <div style={{ 
                          color: '#52c41a', 
                          fontWeight: 'bold',
                          textAlign: 'right'
                        }}>
                          ${Number(precio).toFixed(2)}
                        </div>
                      ),
                      align: 'right' as const
                    },
                    { 
                      title: 'Subtotal', 
                      render: (_, record) => `$${(record.cantidad * record.precio_unitario).toFixed(2)}`,
                      align: 'right' as const
                    },
                    ...(editing.estado !== 'FACTURADA' ? [
                      {
                        title: 'Acción',
                          render: (_: any, record: Detalle) =>  (
                          <Popconfirm
                            title="¿Eliminar este producto de la orden?"
                            onConfirm={() => eliminarDetalle(record.id)}
                            okText="Sí"
                            cancelText="No"
                          >
                            <Button 
                              type="text" 
                              danger 
                              size="small" 
                              icon={<DeleteOutlined />}
                            />
                          </Popconfirm>
                        ),
                        width: 80,
                      }
                    ] : [])
                  ]}
                />
              </>
            )}

            {/* Servicios existentes (SOLO LECTURA) */}
            {getDetallesServicios(editing).length > 0 && (
              <>
                <Divider>
                  <ApiOutlined /> Servicios ({getDetallesServicios(editing).length})
                </Divider>
                
                <Alert
                  message="Solo lectura"
                  description="Los servicios ya fueron definidos por el administrador. No puedes modificarlos."
                  type="warning"
                  showIcon
                  style={{ marginBottom: 8 }}
                />
                
                <Table
                  size="small"
                  dataSource={getDetallesServicios(editing)}
                  pagination={false}
                  columns={[
                    { title: 'Servicio', dataIndex: 'descripcion' },
                    { 
                      title: 'Cantidad', 
                      align: 'center' as const,
                      render: (_, record) => <span>{record.cantidad}</span>
                    },
                    { 
                      title: 'Precio Unit.', 
                      dataIndex: 'precio_unitario',
                      render: (precio) => (
                        <div style={{ 
                          color: '#1890ff', 
                          fontWeight: 'bold',
                          textAlign: 'right'
                        }}>
                          ${Number(precio).toFixed(2)}
                        </div>
                      ),
                      align: 'right' as const
                    },
                    { 
                      title: 'Subtotal', 
                      render: (_, record) => `$${(record.cantidad * record.precio_unitario).toFixed(2)}`,
                      align: 'right' as const
                    }
                  ]}
                />
              </>
            )}

            {/* Agregar nuevo producto (solo si no está FACTURADA) */}
            {editing.estado !== 'FACTURADA' && (
              <>
                <Divider >Agregar Nuevo Producto</Divider>
                <Row gutter={16} align="middle" style={{ marginBottom: 16 }}>
                  <Col span={12}>
                    <Select
                      placeholder="Seleccionar producto"
                      style={{ width: '100%' }}
                      value={nuevoProductoId}
                      onChange={(value) => setNuevoProductoId(value)}
                      options={productos
                        .filter(p => (p.stock || 0) > 0)
                        .map(p => ({
                          value: p.id,
                          label: `${p.nombre} - $${p.precio}${p.stock ? ` (Stock: ${p.stock})` : ''}`
                        }))
                      }
                      showSearch
                      filterOption={(input, option) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                    />
                  </Col>
                  <Col span={4}>
                    <InputNumber 
                      placeholder="Cantidad" 
                      min={1}
                      value={cantidadNuevoProducto}
                      onChange={(value) => {
                        if (value === null) {
                          setCantidadNuevoProducto(1);
                        } else {
                          setCantidadNuevoProducto(value);
                        }
                      }}
                      style={{ width: '100%' }}
                    />
                  </Col>
                  <Col span={4}>
                    <Button
                      type="primary"
                      onClick={agregarProducto}
                      disabled={!nuevoProductoId || cantidadNuevoProducto <= 0}
                    >
                      Agregar
                    </Button>
                  </Col>
                </Row>
              </>
            )}

            {/* Resumen de total */}
            <Divider />
            <Row justify="end">
              <Col>
                <div style={{ textAlign: 'right' }}>
                  <Text strong style={{ fontSize: '16px' }}>
                    Total de la Orden: ${Number(editing.total || 0).toFixed(2)}
                  </Text>
                </div>
              </Col>
            </Row>

            {/* Botones de acción */}
            <Divider />
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">
                  Guardar Observaciones
                </Button>
                <Button 
                  onClick={() => {
                    setOpen(false);
                    setEditing(null);
                    setEditandoDetalleId(null);
                  }}
                >
                  Cerrar
                </Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </Card>
  );
}