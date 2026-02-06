'use client';

import {
  Form,
  Select,
  Button,
  Card,
  InputNumber,
  Table,
  Divider,
  message,
  Input,
  Row,
  Col,
  Modal,
  Space,
  Tooltip,
  Tabs,
  Tag,
  Alert,
} from 'antd';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import {
  PlusOutlined,
  CloseOutlined,
  ShoppingOutlined,
  ToolOutlined,
  InfoCircleOutlined,
  UserOutlined,
} from '@ant-design/icons';

const { TextArea } = Input;
const { Option } = Select;
const { TabPane } = Tabs;

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

interface Producto {
  id: number;
  nombre: string;
  precio: number;
  stock: number;
  referencia?: string;
  categoria?: string;
}

interface Servicio {
  id: number;
  nombre: string;
  precio: number;
  duracionMinutos: number;
  categoria?: string;
  descripcion?: string;
  requiereRepuestos: boolean;
  esActivo: boolean;
}

interface Mecanico {
  id: number;
  nombre: string;
  activo?: boolean;  // ✅ Agregar esta propiedad
  especialidad?: string;
  telefono?: string;
}

interface ItemDetalle {
  id?: number;
  productoId?: number;
  servicioId?: number;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  tipo?: 'PRODUCTO' | 'SERVICIO' | 'OTRO';
  duracionMinutos?: number;
}

interface OrdenFormProps {
  clientes: Cliente[];
  vehiculos: Vehiculo[];
  mecanicos: Mecanico[];
  initialValues?: any;
  ordenId?: number;
  onClienteCreado?: (cliente: Cliente) => void;
  onVehiculoCreado?: (vehiculo: Vehiculo) => void;
  onSubmit: () => void;
}

export default function OrdenForm({
  clientes,
  vehiculos,
  mecanicos,
  initialValues,
  ordenId,
  onClienteCreado,
  onVehiculoCreado,
  onSubmit,
}: OrdenFormProps) {
  const [form] = Form.useForm();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [items, setItems] = useState<ItemDetalle[]>([]);
  const [vehiculosFiltrados, setVehiculosFiltrados] = useState<Vehiculo[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('productos');
  
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [showVehiculoModal, setShowVehiculoModal] = useState(false);
  const [nuevoClienteForm] = Form.useForm();
  const [nuevoVehiculoForm] = Form.useForm();
  
  const [nuevoCliente, setNuevoCliente] = useState<Partial<Cliente>>({
    nombre: '',
    identificacion: '',
    telefono: '',
    email: '',
  });

  const [nuevoVehiculo, setNuevoVehiculo] = useState<Partial<Vehiculo>>({
    placa: '',
    marca: '',
    modelo: '',
  });

  // ✅ Filtrar solo mecánicos activos
  const mecanicosActivos = mecanicos.filter(mecanico => mecanico.activo !== false);
  const hayMecanicosActivos = mecanicosActivos.length > 0;

  useEffect(() => {
    const cargarItems = async () => {
      try {
        const [productosRes, serviciosRes] = await Promise.all([
          api.get('/productos'),
          api.get('/servicios?includeInactive=false'),
        ]);
        
        const productosConvertidos = productosRes.data.map((p: any) => ({
          ...p,
          id: Number(p.id) || 0,
          precio: Number(p.precio) || 0,
          stock: Number(p.stock) || 0,
        }));
        
        const serviciosConvertidos = serviciosRes.data.map((s: any) => ({
          ...s,
          id: Number(s.id) || 0,
          precio: Number(s.precio) || 0,
          duracionMinutos: Number(s.duracionMinutos) || 60,
        }));
        
        setProductos(productosConvertidos);
        setServicios(serviciosConvertidos);
      } catch (error) {
        message.error('Error al cargar productos y servicios');
      }
    };
    
    cargarItems();
  }, []);

  useEffect(() => {
    form.resetFields();
    setItems([]);
    setVehiculosFiltrados([]);
    
    if (!initialValues) return;

    setTimeout(() => {
      form.setFieldsValue({
        clienteId: initialValues.cliente?.id,
        vehiculoId: initialValues.vehiculo?.id,
        mecanicoId: initialValues.mecanico?.id,
        observaciones: initialValues.observaciones,
      });

      if (initialValues.cliente?.id) {
        const vehiculosCliente = vehiculos.filter(
          v => v.cliente.id === initialValues.cliente.id
        );
        setVehiculosFiltrados(vehiculosCliente);
      }

      if (initialValues.detalles && Array.isArray(initialValues.detalles)) {
        const detallesFormateados = initialValues.detalles.map((d: any) => {
          let tipo: 'PRODUCTO' | 'SERVICIO' | 'OTRO' = 'OTRO';
          
          if (d.producto) tipo = 'PRODUCTO';
          else if (d.servicio) tipo = 'SERVICIO';
          else if (d.tipo) tipo = d.tipo;
          
          return {
            id: d.id,
            productoId: d.producto?.id,
            servicioId: d.servicio?.id,
            descripcion: d.descripcion || d.producto?.nombre || d.servicio?.nombre || '',
            cantidad: Number(d.cantidad) || 1,
            precio_unitario: Number(d.precio_unitario) || 0,
            tipo: tipo,
            duracionMinutos: d.servicio?.duracionMinutos || 60,
          };
        });
        
        setItems(detallesFormateados);
      }
    }, 100);
  }, [initialValues, vehiculos, form]);

  const onClienteChange = (clienteId: number) => {
    const clienteSeleccionado = clientes.find(c => c.id === clienteId);
    if (clienteSeleccionado) {
      setVehiculosFiltrados(
        vehiculos.filter((v) => v.cliente.id === clienteId),
      );
      form.setFieldValue('vehiculoId', undefined);
    }
  };

  const agregarProducto = (productoId: number) => {
    const producto = productos.find(p => p.id === productoId);
    if (!producto) return;

    if (producto.stock <= 0) {
      message.warning(`Producto ${producto.nombre} sin stock disponible`);
      return;
    }

    const existe = items.find(item => item.productoId === productoId);
    if (existe) {
      setItems(items.map(item => 
        item.productoId === productoId 
          ? { ...item, cantidad: item.cantidad + 1 }
          : item
      ));
      message.info(`Cantidad de ${producto.nombre} incrementada a ${existe.cantidad + 1}`);
    } else {
      setItems(prev => [
        ...prev,
        {
          productoId: producto.id,
          descripcion: producto.nombre,
          cantidad: 1,
          precio_unitario: Number(producto.precio) || 0,
          tipo: 'PRODUCTO',
        },
      ]);
    }
  };

  const agregarServicio = (servicioId: number) => {
    const servicio = servicios.find(s => s.id === servicioId);
    if (!servicio) return;

    if (!servicio.esActivo) {
      message.warning(`El servicio ${servicio.nombre} no está disponible`);
      return;
    }

    const existe = items.find(item => item.servicioId === servicioId);
    if (existe) {
      setItems(items.map(item => 
        item.servicioId === servicioId 
          ? { ...item, cantidad: item.cantidad + 1 }
          : item
      ));
      message.info(`Cantidad de ${servicio.nombre} incrementada a ${existe.cantidad + 1}`);
    } else {
      setItems(prev => [
        ...prev,
        {
          servicioId: servicio.id,
          descripcion: servicio.nombre,
          cantidad: 1,
          precio_unitario: Number(servicio.precio) || 0,
          tipo: 'SERVICIO',
          duracionMinutos: servicio.duracionMinutos,
        },
      ]);
    }
  };

  const agregarItemManual = () => {
    setItems(prev => [
      ...prev,
      {
        descripcion: 'Mano de obra',
        cantidad: 1,
        precio_unitario: 0,
        tipo: 'OTRO',
      },
    ]);
  };

  const eliminarItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const actualizarCantidad = (index: number, cantidad: number) => {
    const newItems = [...items];
    newItems[index].cantidad = cantidad;
    setItems(newItems);
  };

  const actualizarPrecio = (index: number, precio: number) => {
    const newItems = [...items];
    newItems[index].precio_unitario = precio;
    setItems(newItems);
  };

  const actualizarDescripcion = (index: number, descripcion: string) => {
    const newItems = [...items];
    newItems[index].descripcion = descripcion;
    setItems(newItems);
  };

  const total = items.reduce(
    (sum, item) => sum + (item.cantidad * item.precio_unitario),
    0
  );

  const duracionTotal = items.reduce((sum, item) => {
    if (item.tipo === 'SERVICIO' && item.duracionMinutos) {
      return sum + (item.cantidad * item.duracionMinutos);
    }
    return sum;
  }, 0);

  const formatDuracion = (minutos: number) => {
    if (minutos >= 60) {
      const horas = Math.floor(minutos / 60);
      const mins = minutos % 60;
      return mins > 0 ? `${horas}h ${mins}m` : `${horas}h`;
    }
    return `${minutos}m`;
  };

  const submit = async (values: any) => {
    setLoading(true);
    
    try {
      if (items.length === 0) {
        message.warning('Debe agregar al menos un item a la orden');
        setLoading(false);
        return;
      }
      
      if (!values.clienteId || !values.vehiculoId || !values.mecanicoId) {
        message.warning('Complete todos los campos obligatorios');
        setLoading(false);
        return;
      }
      
      // ✅ Verificar que el mecánico seleccionado esté activo
      const mecanicoSeleccionado = mecanicos.find(m => m.id === Number(values.mecanicoId));
      if (mecanicoSeleccionado && mecanicoSeleccionado.activo === false) {
        message.error('El mecánico seleccionado está inactivo. Seleccione otro mecánico.');
        setLoading(false);
        return;
      }
      
      const ordenPayload = {
        clienteId: Number(values.clienteId),
        vehiculoId: Number(values.vehiculoId),
        mecanicoId: Number(values.mecanicoId),
        observaciones: values.observaciones || null,
      };
      
      let ordenIdActual = ordenId;

      if (ordenIdActual) {
        await api.put(`/ordenes-servicio/${ordenIdActual}`, ordenPayload);
      } else {
        const res = await api.post('/ordenes-servicio', ordenPayload);
        ordenIdActual = res.data.id;
      }

      const detallesPayload = items.map((item) => {
        const payload: any = {
          descripcion: item.descripcion.trim(),
          cantidad: Number(item.cantidad),
          precio_unitario: Number(item.precio_unitario),
        };
        
        if (item.tipo) {
          payload.tipo = item.tipo;
        }
        
        if (item.productoId && item.productoId > 0) {
          payload.productoId = Number(item.productoId);
        }
        
        if (item.servicioId && item.servicioId > 0) {
          payload.servicioId = Number(item.servicioId);
        }
        
        return payload;
      });

      await api.put(
        `/ordenes-servicio/${ordenIdActual}/detalles-todos`,
        detallesPayload
      );

      const mensaje = ordenId ? 
        `Orden #${ordenId} actualizada correctamente` : 
        `Orden #${ordenIdActual} creada correctamente`;
      
      message.success(mensaje);

      await new Promise(resolve => setTimeout(resolve, 300));
      
      onSubmit();
      
    } catch (error: any) {
      if (error.response) {
        if (error.response.status === 400) {
          message.error(`Error de validación: ${JSON.stringify(error.response.data.message)}`);
        } else if (error.response.status === 404) {
          message.error('Recurso no encontrado. Recarga la página e intenta nuevamente.');
        } else {
          message.error(`Error del servidor: ${error.response.status} - ${error.response.data.message}`);
        }
      } else if (error.request) {
        message.error('No se pudo conectar al servidor. Verifica tu conexión.');
      } else {
        message.error('Error inesperado: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const crearClienteRapido = async () => {
    try {
      const res = await api.post('/clientes', nuevoCliente);
      const clienteCreado = res.data;
      
      message.success('Cliente creado exitosamente');
      setShowClienteModal(false);
      
      if (onClienteCreado) {
        onClienteCreado(clienteCreado);
      }
      
      form.setFieldValue('clienteId', clienteCreado.id);
      
      nuevoClienteForm.resetFields();
      setNuevoCliente({
        nombre: '',
        identificacion: '',
        telefono: '',
        email: '',
      });
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al crear cliente');
    }
  };

  const crearVehiculoRapido = async () => {
    const clienteId = form.getFieldValue('clienteId');
    
    if (!clienteId) {
      message.error('Primero seleccione un cliente');
      return;
    }

    try {
      const vehiculoData = {
        ...nuevoVehiculo,
        clienteId,
      };
      
      const res = await api.post('/vehiculos', vehiculoData);
      const vehiculoCreado = res.data;
      
      message.success('Vehículo creado exitosamente');
      setShowVehiculoModal(false);
      
      if (onVehiculoCreado) {
        onVehiculoCreado(vehiculoCreado);
      }
      
      setVehiculosFiltrados(prev => [...prev, vehiculoCreado]);
      form.setFieldValue('vehiculoId', vehiculoCreado.id);
      
      nuevoVehiculoForm.resetFields();
      setNuevoVehiculo({
        placa: '',
        marca: '',
        modelo: '',
      });
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al crear vehículo');
    }
  };

  const renderItemIcon = (tipo: string) => {
    switch (tipo) {
      case 'PRODUCTO':
        return <ShoppingOutlined style={{ color: '#1890ff' }} />;
      case 'SERVICIO':
        return <ToolOutlined style={{ color: '#52c41a' }} />;
      default:
        return <InfoCircleOutlined style={{ color: '#fa8c16' }} />;
    }
  };

  const renderItemTag = (tipo: string) => {
    const config: Record<string, { color: string; text: string }> = {
      PRODUCTO: { color: 'blue', text: 'Producto' },
      SERVICIO: { color: 'green', text: 'Servicio' },
      OTRO: { color: 'orange', text: 'Otro' },
    };
    
    const { color, text } = config[tipo] || config.OTRO;
    return <Tag color={color}>{text}</Tag>;
  };

  return (
    <>
      <Card bordered={false}>
        <Form layout="vertical" form={form} onFinish={submit}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item 
                name="clienteId" 
                label="Cliente" 
                rules={[{ required: true, message: 'Seleccione un cliente' }]}
              >
                <Select
                  placeholder="Buscar cliente..."
                  showSearch
                  filterOption={(input, option) => {
                    const label = option?.label as string || '';
                    return label.toLowerCase().includes(input.toLowerCase());
                  }}
                  onChange={onClienteChange}
                  dropdownRender={(menu) => (
                    <>
                      {menu}
                      <Divider style={{ margin: '8px 0' }} />
                      <Button 
                        type="link" 
                        icon={<PlusOutlined />} 
                        onClick={() => setShowClienteModal(true)}
                        block
                      >
                        Crear nuevo cliente
                      </Button>
                    </>
                  )}
                >
                  {clientes.map((c) => (
                    <Option 
                      key={c.id} 
                      value={c.id}
                      label={`${c.nombre} ${c.identificacion ? `(${c.identificacion})` : ''}`}
                    >
                      <div>
                        <div style={{ fontWeight: '500' }}>{c.nombre}</div>
                        {c.identificacion && (
                          <div style={{ fontSize: '11px', color: '#666' }}>
                            {c.identificacion}
                          </div>
                        )}
                        {c.telefono && (
                          <div style={{ fontSize: '11px', color: '#666' }}>
                            📞 {c.telefono}
                          </div>
                        )}
                      </div>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            
            <Col span={8}>
              <Form.Item 
                name="vehiculoId" 
                label="Vehículo" 
                rules={[{ required: true, message: 'Seleccione un vehículo' }]}
              >
                <Select
                  placeholder="Seleccione vehículo"
                  disabled={!form.getFieldValue('clienteId')}
                  dropdownRender={(menu) => (
                    <>
                      {menu}
                      <Divider style={{ margin: '8px 0' }} />
                      <Button 
                        type="link" 
                        icon={<PlusOutlined />}
                        onClick={() => setShowVehiculoModal(true)}
                        disabled={!form.getFieldValue('clienteId')}
                        block
                      >
                        Crear nuevo vehículo
                      </Button>
                    </>
                  )}
                >
                  {vehiculosFiltrados.map((v) => (
                    <Option key={v.id} value={v.id}>
                      <div>
                        <div style={{ fontWeight: '500' }}>
                          🚗 {v.placa} - {v.marca} {v.modelo}
                        </div>
                        <div style={{ fontSize: '11px', color: '#666' }}>
                          Cliente: {v.cliente.nombre}
                        </div>
                      </div>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item 
                name="mecanicoId" 
                label="Mecánico" 
                rules={[{ required: true, message: 'Seleccione un mecánico' }]}
                help={!hayMecanicosActivos && "No hay mecánicos activos disponibles. Active al menos un mecánico."}
              >
                <Select 
                  placeholder={hayMecanicosActivos ? "Seleccione mecánico" : "No hay mecánicos activos"}
                  optionFilterProp="children"
                  showSearch
                  filterOption={(input, option) =>
                    String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  disabled={!hayMecanicosActivos}
                >
                  {mecanicosActivos.map((m) => (
                    <Option key={m.id} value={m.id}>
                      <div>
                        <div style={{ fontWeight: '500' }}>
                          <UserOutlined style={{ marginRight: 8, color: '#52c41a' }} />
                          {m.nombre}
                        </div>
                        {m.especialidad && (
                          <div style={{ fontSize: '11px', color: '#666' }}>
                            🛠️ {m.especialidad}
                          </div>
                        )}
                        {m.telefono && (
                          <div style={{ fontSize: '11px', color: '#666' }}>
                            📞 {m.telefono}
                          </div>
                        )}
                      </div>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              
              {!hayMecanicosActivos && (
                <Alert
                  message="Atención"
                  description="No hay mecánicos activos en el sistema. Active al menos un mecánico antes de crear una orden."
                  type="warning"
                  showIcon
                  style={{ marginTop: 8 }}
                />
              )}
            </Col>
          </Row>

          <Form.Item name="observaciones" label="Observaciones">
            <TextArea rows={3} placeholder="Descripción del trabajo a realizar..." />
          </Form.Item>

          <Card 
            title="Agregar Items a la Orden" 
            size="small"
            style={{ marginBottom: 16 }}
          >
            <Tabs activeKey={activeTab} onChange={setActiveTab}>
              <TabPane 
                tab={
                  <span>
                    <ShoppingOutlined />
                    Productos
                  </span>
                } 
                key="productos"
              >
                <Select
                  placeholder="Buscar producto..."
                  onSelect={agregarProducto}
                  style={{ width: '100%' }}
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={productos.map(p => ({
                    value: p.id,
                    label: `${p.nombre} - $${Number(p.precio).toFixed(2)} (Stock: ${p.stock})`,
                  }))}
                />
              </TabPane>
              
              <TabPane 
                tab={
                  <span>
                    <ToolOutlined />
                    Servicios
                  </span>
                } 
                key="servicios"
              >
                <Select
                  placeholder="Buscar servicio..."
                  onSelect={agregarServicio}
                  style={{ width: '100%' }}
                  showSearch
                  filterOption={(input, option) =>
                    String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={servicios.map(s => ({
                    value: s.id,
                    label: `${s.nombre} - $${Number(s.precio).toFixed(2)} (${formatDuracion(s.duracionMinutos)})`,
                    disabled: !s.esActivo,
                  }))}
                />
              </TabPane>
            </Tabs>
            
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <Button 
                type="dashed" 
                onClick={agregarItemManual}
                icon={<PlusOutlined />}
              >
                Agregar item manual (mano de obra, etc.)
              </Button>
            </div>
          </Card>

          <Card title="Items de la Orden" size="small">
            <div style={{ marginBottom: 8 }}>
              <Space>
                <Tag color="blue">{items.filter(i => i.tipo === 'PRODUCTO').length} productos</Tag>
                <Tag color="green">{items.filter(i => i.tipo === 'SERVICIO').length} servicios</Tag>
                {duracionTotal > 0 && (
                  <Tag color="purple">Duración total: {formatDuracion(duracionTotal)}</Tag>
                )}
              </Space>
            </div>
            
            <Table
              size="small"
              rowKey={(_, i) => i!.toString()}
              columns={[
                { 
                  title: 'Tipo', 
                  width: 100,
                  render: (_, record) => (
                    <div style={{ textAlign: 'center' }}>
                      {renderItemIcon(record.tipo || 'OTRO')}
                      <div style={{ fontSize: '10px', marginTop: 2 }}>
                        {renderItemTag(record.tipo || 'OTRO')}
                      </div>
                    </div>
                  ),
                },
                { 
                  title: 'Descripción', 
                  dataIndex: 'descripcion',
                  width: '30%',
                  render: (value, record, index) => (
                    <Input
                      value={value}
                      onChange={(e) => actualizarDescripcion(index, e.target.value)}
                      placeholder="Descripción del item"
                    />
                  ),
                },
                { 
                  title: 'Cantidad', 
                  dataIndex: 'cantidad',
                  width: 100,
                  render: (value, record, index) => (
                    <InputNumber
                      min={1}
                      value={value}
                      onChange={(newValue) => actualizarCantidad(index, newValue || 1)}
                      style={{ width: '100%' }}
                    />
                  ),
                },
                { 
                  title: 'Precio Unit.', 
                  dataIndex: 'precio_unitario',
                  width: 120,
                  render: (value, record, index) => (
                    <InputNumber
                      min={0}
                      value={value}
                      onChange={(newValue) => actualizarPrecio(index, newValue || 0)}
                      style={{ width: '100%' }}
                      formatter={val => `$ ${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={val => Number(val!.replace(/\$\s?|(,*)/g, ''))}
                    />
                  ),
                },
                {
                  title: 'Duración',
                  width: 100,
                  render: (_, record) => {
                    if (record.tipo === 'SERVICIO' && record.duracionMinutos) {
                      return formatDuracion(record.duracionMinutos * record.cantidad);
                    }
                    return '-';
                  },
                },
                {
                  title: 'Subtotal',
                  width: 120,
                  render: (_, record) => {
                    const subtotal = Number(record.cantidad) * Number(record.precio_unitario);
                    return (
                      <div style={{ fontWeight: 'bold', color: '#1890ff' }}>
                        ${subtotal.toFixed(2)}
                      </div>
                    );
                  },
                },
                {
                  title: '',
                  width: 60,
                  render: (_: any, __: any, i: number) => (
                    <Tooltip title="Eliminar">
                      <Button 
                        danger 
                        size="small" 
                        icon={<CloseOutlined />}
                        onClick={() => eliminarItem(i)}
                      />
                    </Tooltip>
                  ),
                },
              ]}
              dataSource={items}
              pagination={false}
              scroll={{ x: 900 }}
              locale={{
                emptyText: 'No hay items en la orden. Agregue productos o servicios.'
              }}
            />
          </Card>

          <Divider />
          
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={12}>
              <Card size="small" title="Resumen de la Orden">
                <div style={{ fontSize: '12px' }}>
                  <div><strong>Total Items:</strong> {items.length}</div>
                  <div><strong>Productos:</strong> {items.filter(i => i.tipo === 'PRODUCTO').length}</div>
                  <div><strong>Servicios:</strong> {items.filter(i => i.tipo === 'SERVICIO').length}</div>
                  {duracionTotal > 0 && (
                    <div><strong>Tiempo estimado:</strong> {formatDuracion(duracionTotal)}</div>
                  )}
                </div>
              </Card>
            </Col>
            <Col span={12}>
              <div style={{ 
                background: '#0f0e0e', 
                padding: '20px', 
                borderRadius: '8px',
                textAlign: 'right',
                border: '1px solid #d9d9d9'
              }}>
                <div style={{ 
                  fontSize: '24px', 
                  fontWeight: 'bold',
                  color: '#e10600'
                }}>
                  Total: ${total.toFixed(2)}
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
                  {items.length} item{items.length !== 1 ? 's' : ''}
                </div>
              </div>
            </Col>
          </Row>

          <Button 
            type="primary" 
            htmlType="submit" 
            block 
            size="large"
            loading={loading}
            style={{ marginTop: 8 }}
            disabled={!hayMecanicosActivos}  // ✅ Deshabilitar si no hay mecánicos activos
          >
            {initialValues?.id ? 'ACTUALIZAR ORDEN' : 'CREAR ORDEN'}
          </Button>
          
          {!hayMecanicosActivos && (
            <Alert
              message="No se puede crear la orden"
              description="No hay mecánicos activos disponibles. Active al menos un mecánico en la sección de mecánicos."
              type="error"
              showIcon
              style={{ marginTop: 16 }}
            />
          )}
        </Form>
      </Card>

      <Modal
        title="Crear Cliente Rápido"
        open={showClienteModal}
        onCancel={() => setShowClienteModal(false)}
        footer={[
          <Button key="cancel" onClick={() => setShowClienteModal(false)}>
            Cancelar
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            onClick={crearClienteRapido}
            loading={loading}
          >
            Crear y Seleccionar
          </Button>,
        ]}
        width={500}
      >
        <Form layout="vertical" form={nuevoClienteForm}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Nombre"
                rules={[{ required: true, message: 'Ingrese el nombre' }]}
              >
                <Input
                  value={nuevoCliente.nombre}
                  onChange={(e) => setNuevoCliente({...nuevoCliente, nombre: e.target.value})}
                  placeholder="Juan Pérez"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Identificación"
                rules={[{ required: true, message: 'Ingrese identificación' }]}
              >
                <Input
                  value={nuevoCliente.identificacion}
                  onChange={(e) => setNuevoCliente({...nuevoCliente, identificacion: e.target.value})}
                  placeholder="1234567890"
                />
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Teléfono">
                <Input
                  value={nuevoCliente.telefono}
                  onChange={(e) => setNuevoCliente({...nuevoCliente, telefono: e.target.value})}
                  placeholder="3001234567"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Email"
                rules={[{ type: 'email', message: 'Email inválido' }]}
              >
                <Input
                  value={nuevoCliente.email}
                  onChange={(e) => setNuevoCliente({...nuevoCliente, email: e.target.value})}
                  placeholder="correo@ejemplo.com"
                  type="email"
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        title="Crear Vehículo Rápido"
        open={showVehiculoModal}
        onCancel={() => setShowVehiculoModal(false)}
        footer={[
          <Button key="cancel" onClick={() => setShowVehiculoModal(false)}>
            Cancelar
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            onClick={crearVehiculoRapido}
            loading={loading}
          >
            Crear y Seleccionar
          </Button>,
        ]}
        width={500}
      >
        <Form layout="vertical" form={nuevoVehiculoForm}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Placa"
                rules={[{ required: true, message: 'Ingrese la placa' }]}
              >
                <Input
                  value={nuevoVehiculo.placa}
                  onChange={(e) => setNuevoVehiculo({...nuevoVehiculo, placa: e.target.value.toUpperCase()})}
                  placeholder="ABC123"
                  maxLength={6}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Marca"
                rules={[{ required: true, message: 'Ingrese la marca' }]}
              >
                <Input
                  value={nuevoVehiculo.marca}
                  onChange={(e) => setNuevoVehiculo({...nuevoVehiculo, marca: e.target.value})}
                  placeholder="Toyota"
                />
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item
            label="Modelo"
            rules={[{ required: true, message: 'Ingrese el modelo' }]}
          >
            <Input
              value={nuevoVehiculo.modelo}
              onChange={(e) => setNuevoVehiculo({...nuevoVehiculo, modelo: e.target.value})}
              placeholder="Corolla"
            />
          </Form.Item>
          
          <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: '4px', marginBottom: '16px' }}>
            <strong>Cliente seleccionado:</strong>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {clientes.find(c => c.id === form.getFieldValue('clienteId'))?.nombre}
            </div>
          </div>
        </Form>
      </Modal>
    </>
  );
}