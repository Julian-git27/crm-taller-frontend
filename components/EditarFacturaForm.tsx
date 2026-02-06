'use client';

import { Form, Input, InputNumber, Button, Card, Table, Space, Tag, message, Modal, Select, AutoComplete, Tabs, Tooltip } from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined, CloseOutlined, SearchOutlined, ReloadOutlined, ShoppingOutlined, ToolOutlined } from '@ant-design/icons';
import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';

const { TextArea } = Input;
const { Option } = Select;
const { TabPane } = Tabs;

interface DetalleFactura {
  id?: number;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  productoId?: number | null;
  servicioId?: number | null;
  tipo?: 'PRODUCTO' | 'SERVICIO' | 'OTRO';
}

interface Producto {
  id: number;
  nombre: string;
  precio: number;
  stock: number;
  codigo?: string;
}

interface Servicio {
  id: number;
  nombre: string;
  precio: number;
  duracionMinutos: number;
  esActivo: boolean;
  descripcion?: string;
}

// ✅ CORREGIDO: Actualizar la interfaz Factura para que sea compatible
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
  };
  orden?: {
    id: number;
    vehiculo?: {
      placa: string;
      marca?: string;
      modelo?: string;
    };
    mecanico?: { // ✅ Añadir esta propiedad opcional
      id: number;
      nombre: string;
      especialidad?: string;
    } | null;
  } | null; // ✅ Hacer que pueda ser null
  vehiculo?: { // ✅ Añadir esta propiedad para vehículos directos
    id: number;
    placa: string;
    marca?: string;
    modelo?: string;
  } | null;
  mecanico?: { // ✅ Añadir esta propiedad para mecánicos directos
    id: number;
    nombre: string;
    especialidad?: string;
  } | null;
  detalles: any[];
  // Campos de helper desde el backend
  tieneVehiculoDirecto?: boolean;
  tieneVehiculoOrden?: boolean;
}

interface Props {
  factura: Factura;
  onSubmit: (values: any) => Promise<void>;
  onCancel: () => void;
  visible: boolean;
}

const METODOS_PAGO = [
  { value: 'EFECTIVO', label: '💵 Efectivo' },
  { value: 'TARJETA_CREDITO', label: '💳 Tarjeta de Crédito' },
  { value: 'TARJETA_DEBITO', label: '💳 Tarjeta de Débito' },
  { value: 'TRANSFERENCIA', label: '🏦 Transferencia Bancaria' },
  { value: 'CHEQUE', label: '📄 Cheque' },
  { value: 'OTRO', label: '📝 Otro' },
];

// ✅ NUEVO: Tipo unificado para opciones de AutoComplete
interface OpcionAutoComplete {
  value: string;
  label: string;
  producto?: Producto;
  servicio?: Servicio;
}

export default function EditarFacturaForm({ factura, onSubmit, onCancel, visible }: Props) {
  const [form] = Form.useForm();
  const [detalles, setDetalles] = useState<DetalleFactura[]>([]);
  const [loading, setLoading] = useState(false);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [buscandoProductos, setBuscandoProductos] = useState(false);
  const [buscandoServicios, setBuscandoServicios] = useState(false);
  const [cargandoDatos, setCargandoDatos] = useState(false);
  const [opcionesProductos, setOpcionesProductos] = useState<OpcionAutoComplete[]>([]);
  const [opcionesServicios, setOpcionesServicios] = useState<OpcionAutoComplete[]>([]);
  const [activeTab, setActiveTab] = useState('productos');
  const isSubmitting = useRef(false);

  useEffect(() => {
    if (visible && factura) {
      cargarDatosFrescos();
    }
  }, [visible, factura]);

  // ✅ NUEVA FUNCIÓN: Obtener información del vehículo unificado
  const obtenerInfoVehiculo = (factura: Factura): string => {
    // Prioridad: vehículo directo de la factura
    if (factura.vehiculo) {
      const { placa, marca, modelo } = factura.vehiculo;
      let info = placa;
      if (marca) {
        info += ` (${marca}`;
        if (modelo) info += ` ${modelo}`;
        info += ')';
      }
      return info;
    }
    // Si no hay vehículo directo, buscar en la orden
    if (factura.orden?.vehiculo) {
      const { placa, marca, modelo } = factura.orden.vehiculo;
      let info = placa;
      if (marca) {
        info += ` (${marca}`;
        if (modelo) info += ` ${modelo}`;
        info += ')';
      }
      return info;
    }
    return 'Sin vehículo';
  };

  const cargarDatosFrescos = async () => {
    setCargandoDatos(true);
    try {
      await Promise.all([cargarProductos(), cargarServicios()]);
      
      const facturaRes = await api.get(`/facturas/${factura.id}?_=${Date.now()}`);
      const facturaFresca = facturaRes.data;
      
      form.setFieldsValue({
        metodo_pago: facturaFresca.metodo_pago,
        notas: facturaFresca.notas || '',
      });
      
      const detallesIniciales = facturaFresca.detalles?.map((d: any) => ({
        id: d.id,
        descripcion: d.descripcion,
        cantidad: Number(d.cantidad),
        precio_unitario: Number(d.precio_unitario),
        productoId: d.productoId !== undefined ? d.productoId : undefined,
        servicioId: d.servicioId !== undefined ? d.servicioId : undefined,
        tipo: d.productoId ? 'PRODUCTO' : d.servicioId ? 'SERVICIO' : 'OTRO'
      })) || [];
      
      setDetalles(detallesIniciales);
      
    } catch (error) {
      form.setFieldsValue({
        metodo_pago: factura.metodo_pago,
        notas: factura.notas || '',
      });
      
      const detallesIniciales = (factura.detalles || []).map(d => ({
        ...d,
        cantidad: Number(d.cantidad),
        precio_unitario: Number(d.precio_unitario),
        productoId: d.productoId !== undefined ? d.productoId : undefined,
        servicioId: d.servicioId !== undefined ? d.servicioId : undefined,
        tipo: d.productoId ? 'PRODUCTO' : d.servicioId ? 'SERVICIO' : 'OTRO'
      }));
      
      setDetalles(detallesIniciales);
      await Promise.all([cargarProductos(), cargarServicios()]);
      
    } finally {
      setCargandoDatos(false);
    }
  };

  const cargarProductos = async () => {
    try {
      setBuscandoProductos(true);
      const response = await api.get('/productos');
      setProductos(response.data);
      
      const opciones: OpcionAutoComplete[] = response.data.map((producto: Producto) => ({
        value: producto.id.toString(),
        label: `${producto.nombre} - $${producto.precio} (Stock: ${producto.stock})`,
        producto,
        servicio: undefined
      }));
      setOpcionesProductos(opciones);
      
    } catch (error) {
      message.error('Error al cargar productos');
    } finally {
      setBuscandoProductos(false);
    }
  };

  const cargarServicios = async () => {
    try {
      setBuscandoServicios(true);
      const response = await api.get('/servicios?includeInactive=false');
      setServicios(response.data);
      
      const opciones: OpcionAutoComplete[] = response.data.map((servicio: Servicio) => ({
        value: servicio.id.toString(),
        label: `${servicio.nombre} - $${servicio.precio} (${servicio.duracionMinutos} min)`,
        servicio,
        producto: undefined
      }));
      setOpcionesServicios(opciones);
      
    } catch (error) {
      message.error('Error al cargar servicios');
    } finally {
      setBuscandoServicios(false);
    }
  };

  const buscarProductos = async (valor: string) => {
    if (!valor.trim()) {
      const opciones: OpcionAutoComplete[] = productos.map(producto => ({
        value: producto.id.toString(),
        label: `${producto.nombre} - $${producto.precio} (Stock: ${producto.stock})`,
        producto,
        servicio: undefined
      }));
      setOpcionesProductos(opciones);
      return;
    }

    const filtrados = productos.filter(producto =>
      producto.nombre.toLowerCase().includes(valor.toLowerCase()) ||
      producto.codigo?.toLowerCase().includes(valor.toLowerCase())
    );

    const opciones: OpcionAutoComplete[] = filtrados.map(producto => ({
      value: producto.id.toString(),
      label: `${producto.nombre} - $${producto.precio} (Stock: ${producto.stock})`,
      producto,
      servicio: undefined
    }));
    setOpcionesProductos(opciones);
  };

  const buscarServicios = async (valor: string) => {
    if (!valor.trim()) {
      const opciones: OpcionAutoComplete[] = servicios.map(servicio => ({
        value: servicio.id.toString(),
        label: `${servicio.nombre} - $${servicio.precio} (${servicio.duracionMinutos} min)`,
        servicio,
        producto: undefined
      }));
      setOpcionesServicios(opciones);
      return;
    }

    const filtrados = servicios.filter(servicio =>
      servicio.nombre.toLowerCase().includes(valor.toLowerCase()) ||
      servicio.descripcion?.toLowerCase().includes(valor.toLowerCase())
    );

    const opciones: OpcionAutoComplete[] = filtrados.map(servicio => ({
      value: servicio.id.toString(),
      label: `${servicio.nombre} - $${servicio.precio} (${servicio.duracionMinutos} min)`,
      servicio,
      producto: undefined
    }));
    setOpcionesServicios(opciones);
  };

  const seleccionarProducto = (index: number, producto: Producto) => {
    const nuevosDetalles = [...detalles];
    nuevosDetalles[index] = {
      ...nuevosDetalles[index],
      descripcion: producto.nombre,
      precio_unitario: producto.precio,
      productoId: producto.id,
      servicioId: undefined,
      tipo: 'PRODUCTO'
    };
    
    setDetalles(nuevosDetalles);
  };

  const seleccionarServicio = (index: number, servicio: Servicio) => {
    const nuevosDetalles = [...detalles];
    nuevosDetalles[index] = {
      ...nuevosDetalles[index],
      descripcion: servicio.nombre,
      precio_unitario: servicio.precio,
      servicioId: servicio.id,
      productoId: undefined,
      tipo: 'SERVICIO',
      cantidad: 1
    };
    
    setDetalles(nuevosDetalles);
  };

  const addDetalle = (tipo: 'PRODUCTO' | 'SERVICIO' | 'OTRO' = 'PRODUCTO') => {
    setDetalles([...detalles, {
      descripcion: '',
      cantidad: 1,
      precio_unitario: 0,
      productoId: undefined,
      servicioId: undefined,
      tipo
    }]);
  };

  const removeDetalle = (index: number) => {
    const nuevosDetalles = [...detalles];
    nuevosDetalles.splice(index, 1);
    setDetalles(nuevosDetalles);
  };

  const updateDetalle = (index: number, field: string, value: any) => {
    const nuevosDetalles = [...detalles];
    const detalleActual = nuevosDetalles[index];
    
    if (field === 'cantidad' && detalleActual.tipo === 'SERVICIO') {
      nuevosDetalles[index] = { 
        ...detalleActual, 
        [field]: 1
      };
    } else {
      nuevosDetalles[index] = { ...detalleActual, [field]: value };
    }
    
    if (field === 'descripcion') {
      const productoSeleccionado = productos.find(p => 
        p.nombre.toLowerCase() === value.toLowerCase()
      );
      const servicioSeleccionado = servicios.find(s => 
        s.nombre.toLowerCase() === value.toLowerCase()
      );
      
      if (!productoSeleccionado && nuevosDetalles[index].productoId) {
        nuevosDetalles[index].productoId = undefined;
      }
      if (!servicioSeleccionado && nuevosDetalles[index].servicioId) {
        nuevosDetalles[index].servicioId = undefined;
      }
    }
    
    setDetalles(nuevosDetalles);
  };

  const calcularTotal = () => {
    return detalles.reduce((total, detalle) => {
      return total + (Number(detalle.cantidad || 0) * Number(detalle.precio_unitario || 0));
    }, 0);
  };

  const handleSubmit = async () => {
    if (isSubmitting.current || loading) {
      return;
    }
    
    try {
      const detallesInvalidos = detalles.filter(d => 
        !d.descripcion.trim() || 
        d.cantidad <= 0 || 
        d.precio_unitario <= 0
      );

      if (detallesInvalidos.length > 0) {
        message.error('Por favor, complete todos los detalles correctamente');
        return;
      }

      if (detalles.length === 0) {
        message.error('Debe agregar al menos un detalle');
        return;
      }

      isSubmitting.current = true;
      setLoading(true);
      
      const formValues = await form.validateFields();
      
      const detallesConIds = detalles.map(d => {
        let productoIdParaEnviar: number | null = null;
        let servicioIdParaEnviar: number | null = null;
        
        if (d.productoId !== undefined && d.productoId !== null) {
          productoIdParaEnviar = Number(d.productoId);
        }
        
        if (d.servicioId !== undefined && d.servicioId !== null) {
          servicioIdParaEnviar = Number(d.servicioId);
        }
        
        return {
          descripcion: d.descripcion,
          cantidad: Number(d.cantidad),
          precio_unitario: Number(d.precio_unitario),
          productoId: productoIdParaEnviar,
          servicioId: servicioIdParaEnviar,
          tipo: d.tipo
        };
      });
      
      const datosEnviar = {
        ...formValues,
        detalles: detallesConIds
      };

      await onSubmit(datosEnviar);
      
    } catch (error: any) {
      if (error.response?.data?.message) {
        message.error(`Error: ${error.response.data.message}`);
      } else {
        message.error('Error al actualizar la factura');
      }
      
      throw error;
      
    } finally {
      setLoading(false);
      isSubmitting.current = false;
    }
  };

  const renderTipoIcono = (tipo?: string) => {
    switch (tipo) {
      case 'PRODUCTO':
        return <ShoppingOutlined style={{ color: '#1890ff', marginRight: 4 }} />;
      case 'SERVICIO':
        return <ToolOutlined style={{ color: '#52c41a', marginRight: 4 }} />;
      default:
        return null;
    }
  };
 
  const renderTipoTag = (tipo?: string) => {
    switch (tipo) {
      case 'PRODUCTO':
        return <Tag color="blue">Producto</Tag>;
      case 'SERVICIO':
        return <Tag color="green">Servicio</Tag>;
      default:
        return <Tag color="gray">Manual</Tag>;
    }
  };

  const columns = [
    {
      title: 'Tipo',
      width: 100,
      render: (_: any, record: DetalleFactura) => (
        <div style={{ textAlign: 'center' }}>
          {renderTipoIcono(record.tipo)}
          {renderTipoTag(record.tipo)}
        </div>
      ),
    },
    {
      title: 'Descripción',
      dataIndex: 'descripcion',
      render: (text: string, record: DetalleFactura, index: number) => {
        const opciones = record.tipo === 'SERVICIO' ? opcionesServicios : opcionesProductos;
        const onSearch = record.tipo === 'SERVICIO' ? buscarServicios : buscarProductos;
        const placeholder = record.tipo === 'SERVICIO' 
          ? 'Buscar servicio o escribir descripción' 
          : 'Buscar producto o escribir descripción';
        const buscando = record.tipo === 'SERVICIO' ? buscandoServicios : buscandoProductos;
        
        return (
          <AutoComplete
            style={{ width: '100%' }}
            options={opciones}
            value={text}
            onChange={(value) => updateDetalle(index, 'descripcion', value)}
            onSearch={onSearch}
            onSelect={(value, option: OpcionAutoComplete) => {
              if (record.tipo === 'SERVICIO' && option.servicio) {
                seleccionarServicio(index, option.servicio);
              } else if (record.tipo === 'PRODUCTO' && option.producto) {
                seleccionarProducto(index, option.producto);
              }
            }}
            placeholder={placeholder}
            filterOption={false}
            notFoundContent={buscando ? 'Buscando...' : 'Sin resultados'}
            allowClear
          >
            <Input
              suffix={<SearchOutlined />}
              placeholder={placeholder}
            />
          </AutoComplete>
        );
      },
    },
    {
      title: 'Cantidad',
      dataIndex: 'cantidad',
      width: 100,
      render: (value: number, record: DetalleFactura, index: number) => {
        if (record.tipo === 'PRODUCTO' && record.productoId) {
          const producto = productos.find(p => p.id === record.productoId);
          const sinStockSuficiente = producto && record.cantidad > (producto.stock || 0);
          
          return (
            <div style={{ position: 'relative' }}>
              <InputNumber
                min={1}
                max={producto ? producto.stock : undefined}
                value={value}
                onChange={(val) => updateDetalle(index, 'cantidad', val)}
                style={{ width: '100%' }}
                disabled={sinStockSuficiente}
                status={sinStockSuficiente ? 'error' : undefined}
              />
              {sinStockSuficiente && producto && (
                <div style={{ 
                  fontSize: '10px', 
                  color: '#ff4d4f', 
                  marginTop: '2px',
                  textAlign: 'center'
                }}>
                  Máx: {producto.stock}
                </div>
              )}
            </div>
          );
        }
        
        return (
          <InputNumber
            min={1}
            value={value}
            onChange={(val) => updateDetalle(index, 'cantidad', val)}
            style={{ width: '100%' }}
          />
        );
      },
    },
    {
      title: 'Precio Unitario',
      dataIndex: 'precio_unitario',
      width: 120,
      render: (value: number, record: DetalleFactura, index: number) => (
        <InputNumber
          min={0}
          value={value}
          onChange={(val) => updateDetalle(index, 'precio_unitario', val)}
          style={{ width: '100%' }}
          formatter={value => `$${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          parser={value => parseFloat(value!.replace(/\$\s?|(,*)/g, ''))}
        />
      ),
    },
    {
      title: 'Info',
      width: 100,
      render: (text: string, record: DetalleFactura) => {
        if (record.tipo === 'PRODUCTO' && record.productoId) {
          const producto = productos.find(p => p.id === record.productoId);
          return producto ? (
            <Tooltip title={`Stock disponible: ${producto.stock}`}>
              <Tag color={producto.stock >= (record.cantidad || 0) ? 'green' : 'red'}>
                Stock: {producto.stock}
              </Tag>
            </Tooltip>
          ) : 'N/A';
        }
        if (record.tipo === 'SERVICIO' && record.servicioId) {
          const servicio = servicios.find(s => s.id === record.servicioId);
          return servicio ? (
            <Tag color="green">
              {servicio.duracionMinutos} min
            </Tag>
          ) : 'N/A';
        }
        return <Tag color="gray">Manual</Tag>;
      },
    },
    {
      title: 'Subtotal',
      width: 120,
      render: (text: string, record: DetalleFactura) => (
        <span style={{ fontWeight: 'bold' }}>
          ${((record.cantidad || 0) * (record.precio_unitario || 0)).toLocaleString('es-ES', {
            minimumFractionDigits: 2,
          })}
        </span>
      ),
    },
    {
      title: 'Acciones',
      width: 80,
      render: (text: string, record: DetalleFactura, index: number) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeDetalle(index)}
          disabled={detalles.length <= 1}
        />
      ),
    },
  ];

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>Editar Factura #{factura.id}</span>
          {cargandoDatos && <Tag color="processing">Cargando datos...</Tag>}
        </div>
      }
      open={visible}
      onCancel={onCancel}
      width={1300}
      footer={null}
      destroyOnClose
      afterClose={() => {
        isSubmitting.current = false;
        setLoading(false);
      }}
    >
      <Card 
        bordered={false}
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={cargarDatosFrescos}
            loading={cargandoDatos}
            size="small"
          >
            Refrescar datos
          </Button>
        }
      >
        {cargandoDatos ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '48px', color: '#1890ff', marginBottom: 16 }}>
              ⏳
            </div>
            <h3>Cargando datos frescos...</h3>
            <p style={{ color: '#666' }}>Obteniendo la información más reciente del servidor</p>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 16 }}>
              <Tag color="blue">Cliente: {factura.cliente.nombre}</Tag>
              <Tag color="green">Vehículo: {obtenerInfoVehiculo(factura)}</Tag>
              <Tag color={factura.estado_pago === 'PAGA' ? 'green' : 'red'}>
                Estado: {factura.estado_pago === 'PAGA' ? 'PAGADA' : 'NO PAGA'}
              </Tag>
              <Tag color="orange">
                Total Actual: ${calcularTotal().toLocaleString('es-ES', { minimumFractionDigits: 2 })}
              </Tag>
            </div>

            <Form form={form} layout="vertical">
              <Form.Item
                label="Método de Pago"
                name="metodo_pago"
                rules={[{ required: true, message: 'Seleccione método de pago' }]}
              >
                <Select 
                  placeholder="Seleccione método de pago" 
                  size="large"
                  showSearch
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {METODOS_PAGO.map(metodo => (
                    <Option key={metodo.value} value={metodo.value}>
                      {metodo.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item label="Notas" name="notas">
                <TextArea rows={3} placeholder="Notas adicionales..." />
              </Form.Item>

              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div>
                    <h4>Detalles de la Factura</h4>
                    <small style={{ color: '#666' }}>
                      Puede agregar productos o servicios del catálogo, o escribir descripciones manuales
                    </small>
                  </div>
                  <Space>
                    <Button 
                      type="dashed" 
                      icon={<ShoppingOutlined />}
                      onClick={() => addDetalle('PRODUCTO')}
                      disabled={loading}
                    >
                      Agregar Producto
                    </Button>
                    <Button 
                      type="dashed" 
                      icon={<ToolOutlined />}
                      onClick={() => addDetalle('SERVICIO')}
                      disabled={loading}
                    >
                      Agregar Servicio
                    </Button>
                  </Space>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <Tabs activeKey={activeTab} onChange={setActiveTab}>
                    <TabPane tab={
                      <span>
                        <ShoppingOutlined />
                        Productos ({productos.length})
                      </span>
                    } key="productos">
                      <Select
                        placeholder="Buscar producto para agregar rápidamente..."
                        style={{ width: '100%' }}
                        showSearch
                        onSearch={buscarProductos}
                        onChange={(value, option: any) => {
                          if (option.producto) {
                            addDetalle('PRODUCTO');
                            setTimeout(() => {
                              const lastIndex = detalles.length;
                              seleccionarProducto(lastIndex, option.producto);
                            }, 100);
                          }
                        }}
                        filterOption={false}
                        options={opcionesProductos}
                      />
                    </TabPane>
                    <TabPane tab={
                      <span>
                        <ToolOutlined />
                        Servicios ({servicios.length})
                      </span>
                    } key="servicios">
                      <Select
                        placeholder="Buscar servicio para agregar rápidamente..."
                        style={{ width: '100%' }}
                        showSearch
                        onSearch={buscarServicios}
                        onChange={(value, option: any) => {
                          if (option.servicio) {
                            addDetalle('SERVICIO');
                            setTimeout(() => {
                              const lastIndex = detalles.length;
                              seleccionarServicio(lastIndex, option.servicio);
                            }, 100);
                          }
                        }}
                        filterOption={false}
                        options={opcionesServicios}
                      />
                    </TabPane>
                  </Tabs>
                </div>

                <Table
                  dataSource={detalles}
                  columns={columns}
                  rowKey={(record, index) => `detalle-${index}-${record.descripcion || 'empty'}`}
                  pagination={false}
                  size="small"
                  scroll={{ x: 900 }}
                  locale={{
                    emptyText: 'No hay detalles. Agregue al menos uno.'
                  }}
                  summary={() => (
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={5}>
                        <strong>TOTAL:</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1}>
                        <strong style={{ color: '#e10600', fontSize: '1.1em' }}>
                          ${calcularTotal().toLocaleString('es-ES', {
                            minimumFractionDigits: 2,
                          })}
                        </strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={2} />
                    </Table.Summary.Row>
                  )}
                />
              </div>

              <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                <Button 
                  onClick={onCancel} 
                  icon={<CloseOutlined />}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button
                  type="primary"
                  loading={loading}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSubmit();
                  }}
                  icon={<SaveOutlined />}
                  size="large"
                  disabled={loading}
                >
                  {loading ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </Space>
            </Form>
          </>
        )}
      </Card>
    </Modal>
  );
}