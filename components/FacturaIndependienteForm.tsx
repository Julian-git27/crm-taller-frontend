'use client';

import { useState, useEffect } from 'react';
import {
  Form,
  Select,
  Button,
  Card,
  Input,
  InputNumber,
  Table,
  Space,
  Tag,
  Modal,
  Row,
  Col,
  Divider,
  Typography,
  message,
  Radio,
  Spin,
  Alert,
  Tabs,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  SearchOutlined,
  LoadingOutlined,
  UserOutlined,
  ShoppingOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import api from '@/lib/api';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;

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
  esActivo: boolean;
  descripcion?: string;
}

interface Cliente {
  telefono2: string;
  id: number;
  nombre: string;
  telefono?: string;
  email: string;
  identificacion?: string;
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
  especialidad?: string;
  telefono?: string;
  email?: string;
  activo: boolean;
}

interface FacturaDetalle {
  key: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  productoId?: number;
  servicioId?: number;
  tipo?: 'PRODUCTO' | 'SERVICIO' | 'OTRO';
}

export default function FacturaIndependienteForm({
  onSubmit,
  onCancel,
  mecanicos: mecanicosProp = [],
}: {
  onSubmit: (values: any) => void;
  onCancel: () => void;
  mecanicos?: Mecanico[];
}) {
  const [form] = Form.useForm();
  const [detalles, setDetalles] = useState<FacturaDetalle[]>([]);
  const [total, setTotal] = useState(0);
  const [modalItems, setModalItems] = useState(false);
  const [activeTab, setActiveTab] = useState<'productos' | 'servicios'>('productos');
  
  // Estados para carga
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [loadingServicios, setLoadingServicios] = useState(false);
  const [loadingVehiculos, setLoadingVehiculos] = useState(false);
  const [loadingMecanicos, setLoadingMecanicos] = useState(false);

  // Datos de búsqueda
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [mecanicos, setMecanicos] = useState<Mecanico[]>(mecanicosProp);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState<Vehiculo | null>(null);
  const [modoCliente, setModoCliente] = useState<'existente' | 'nuevo'>('existente');
  const [modoVehiculo, setModoVehiculo] = useState<'existente' | 'nuevo' | 'ninguno'>('existente');
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [busquedaMecanico, setBusquedaMecanico] = useState('');

  // Cargar productos, servicios y mecánicos al iniciar
  useEffect(() => {
    cargarProductos();
    cargarServicios();
    
    if (!mecanicosProp || mecanicosProp.length === 0) {
      cargarMecanicos();
    }
  }, []);

  // Buscar clientes con debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (modoCliente === 'existente') {
        cargarClientes(busquedaCliente);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [busquedaCliente, modoCliente]);

  // Buscar mecánicos con debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      cargarMecanicos(busquedaMecanico);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [busquedaMecanico]);

  const cargarServicios = async () => {
    setLoadingServicios(true);
    try {
      let serviciosData: Servicio[] = [];
      
      try {
        const res = await api.get('/servicios?activo=true');
        serviciosData = res.data;
      } catch (error) {
        console.warn('Endpoint /servicios?activo=true falló, intentando /servicios');
        try {
          const res = await api.get('/servicios');
          serviciosData = res.data;
        } catch (error2) {
          console.warn('Endpoint /servicios también falló');
          serviciosData = [];
        }
      }
      
      serviciosData = serviciosData.filter((s: Servicio) => s.esActivo !== false);
      serviciosData.sort((a: Servicio, b: Servicio) => a.nombre.localeCompare(b.nombre));
      setServicios(serviciosData);
      
    } catch (error) {
      console.error('Error cargando servicios:', error);
      setServicios([]);
    } finally {
      setLoadingServicios(false);
    }
  };

  const cargarMecanicos = async (busqueda?: string) => {
    setLoadingMecanicos(true);
    try {
      let url = '/mecanicos';
      if (busqueda && busqueda.trim() !== '') {
        url = `/mecanicos/buscar?q=${encodeURIComponent(busqueda)}`;
      }
      
      const res = await api.get(url);
      const mecanicosActivos = res.data.filter((m: Mecanico) => m.activo !== false);
      setMecanicos(mecanicosActivos);
    } catch (error) {
      console.error('Error cargando mecánicos:', error);
      setMecanicos([]);
    } finally {
      setLoadingMecanicos(false);
    }
  };

  const cargarClientes = async (busqueda?: string) => {
    if (modoCliente !== 'existente') return;
    
    setLoadingClientes(true);
    try {
      let url = '/clientes';
      if (busqueda && busqueda.trim() !== '') {
        url = `/clientes/buscar?q=${encodeURIComponent(busqueda)}`;
      }
      
      const res = await api.get(url);
      setClientes(res.data);
    } catch (error) {
      console.error('Error cargando clientes:', error);
      message.error('Error cargando clientes');
      setClientes([]);
    } finally {
      setLoadingClientes(false);
    }
  };

  const cargarProductos = async () => {
    setLoadingProductos(true);
    try {
      let productosData: Producto[] = [];
      
      try {
        const res = await api.get('/productos');
        productosData = res.data;
        productosData = productosData.filter((p: Producto) => p.stock > 0);
      } catch (error) {
        console.error('Error cargando productos:', error);
        message.error('Error cargando productos');
        productosData = [];
      }
      
      productosData.sort((a, b) => a.nombre.localeCompare(b.nombre));
      setProductos(productosData);
      
    } catch (error: any) {
      console.error('Error en cargarProductos:', error);
      setProductos([]);
    } finally {
      setLoadingProductos(false);
    }
  };

  const cargarVehiculosPorCliente = async (clienteId: number) => {
    if (modoVehiculo !== 'existente') return;
    
    setLoadingVehiculos(true);
    try {
      const res = await api.get(`/vehiculos/cliente/${clienteId}`);
      setVehiculos(res.data);
    } catch (error) {
      console.error('Error cargando vehículos:', error);
      message.error('Error cargando vehículos');
      setVehiculos([]);
    } finally {
      setLoadingVehiculos(false);
    }
  };

  // Calcular total
  useEffect(() => {
    const nuevoTotal = detalles.reduce(
      (sum, detalle) => sum + (detalle.precio_unitario * detalle.cantidad),
      0
    );
    setTotal(nuevoTotal);
    form.setFieldValue('total', nuevoTotal);
  }, [detalles, form]);

  // Manejar agregar detalle con tipo
  const agregarDetalle = (item?: Producto | Servicio, tipo: 'PRODUCTO' | 'SERVICIO' = 'PRODUCTO') => {
    const key = `detalle_${Date.now()}_${Math.random()}`;
    
    let descripcion = '';
    let precio = 0;
    let productoId: number | undefined = undefined;
    let servicioId: number | undefined = undefined;
    let cantidad = 1;

    if (tipo === 'PRODUCTO' && item && 'stock' in item) {
      descripcion = item.nombre;
      precio = item.precio;
      productoId = item.id;
    } else if (tipo === 'SERVICIO' && item && 'duracionMinutos' in item) {
      descripcion = item.nombre;
      precio = item.precio;
      servicioId = item.id;
      cantidad = 1;
    } else {
      descripcion = '';
      precio = 0;
      cantidad = 1;
    }

    const nuevoDetalle: FacturaDetalle = {
      key,
      descripcion,
      cantidad,
      precio_unitario: precio,
      productoId,
      servicioId,
      tipo,
    };
    
    setDetalles([...detalles, nuevoDetalle]);
    setModalItems(false);
  };

  const agregarDetalleManual = (tipo: 'PRODUCTO' | 'SERVICIO' | 'OTRO' = 'OTRO') => {
    const key = `detalle_${Date.now()}_${Math.random()}`;
    const nuevoDetalle: FacturaDetalle = {
      key,
      descripcion: '',
      cantidad: tipo === 'SERVICIO' ? 1 : 1,
      precio_unitario: 0,
      tipo,
    };
    
    setDetalles([...detalles, nuevoDetalle]);
  };

  const eliminarDetalle = (key: string) => {
    setDetalles(detalles.filter(d => d.key !== key));
  };

  const actualizarDetalle = (key: string, campo: string, valor: any) => {
    setDetalles(detalles.map(d => {
      if (d.key === key) {
        const updated = { ...d, [campo]: valor };
        
        if (campo === 'tipo' && valor === 'SERVICIO') {
          updated.cantidad = 1;
        }
        
        return updated;
      }
      return d;
    }));
  };

  // Columnas de la tabla de detalles - SIMPLIFICADAS
  const columnasDetalles = [
    {
      title: 'Tipo',
      width: 100,
      render: (_: any, record: FacturaDetalle) => {
        const tipo = record.tipo || (record.productoId ? 'PRODUCTO' : record.servicioId ? 'SERVICIO' : 'OTRO');
        
        const tipoIcon = tipo === 'PRODUCTO' ? (
          <ShoppingOutlined style={{ color: '#1890ff', marginRight: 4 }} />
        ) : tipo === 'SERVICIO' ? (
          <ToolOutlined style={{ color: '#52c41a', marginRight: 4 }} />
        ) : null;
        
        const tipoTag = tipo === 'PRODUCTO' ? (
          <Tag color="blue">Producto</Tag>
        ) : tipo === 'SERVICIO' ? (
          <Tag color="green">Servicio</Tag>
        ) : (
          <Tag color="gray">Manual</Tag>
        );
        
        return (
          <div style={{ textAlign: 'center' }}>
            {tipoIcon}
            {tipoTag}
          </div>
        );
      },
    },
    {
      title: 'Descripción',
      dataIndex: 'descripcion',
      render: (text: string, record: FacturaDetalle) => {
        const tipo = record.tipo || (record.productoId ? 'PRODUCTO' : record.servicioId ? 'SERVICIO' : 'OTRO');
        
        if ((record.productoId || record.servicioId) && text) {
          return (
            <div>
              <div style={{ fontWeight: '500' }}>{text}</div>
              <small style={{ color: '#666', fontSize: '11px' }}>
                {record.productoId ? 'Producto' : 'Servicio'} seleccionado
              </small>
            </div>
          );
        }
        
        return (
          <Input
            value={text}
            onChange={(e) => actualizarDetalle(record.key, 'descripcion', e.target.value)}
            placeholder="Descripción del servicio/producto"
            required
          />
        );
      },
    },
    {
      title: 'Cantidad',
      dataIndex: 'cantidad',
      width: 100,
      render: (cantidad: number, record: FacturaDetalle) => {
        const tipo = record.tipo || (record.productoId ? 'PRODUCTO' : record.servicioId ? 'SERVICIO' : 'OTRO');
        
        if (tipo === 'SERVICIO') {
          return (
            <Tooltip title="Los servicios siempre tienen cantidad 1">
              <InputNumber
                value={1}
                disabled
                style={{ width: '100%' }}
              />
            </Tooltip>
          );
        }
        
        if (tipo === 'PRODUCTO' && record.productoId) {
          const producto = productos.find(p => p.id === record.productoId);
          if (producto) {
            return (
              <div style={{ position: 'relative' }}>
                <InputNumber
                  min={1}
                  max={producto.stock}
                  value={cantidad}
                  onChange={(value) => {
                    const numValue = Number(value);
                    if (!isNaN(numValue) && numValue > 0 && numValue <= producto.stock) {
                      actualizarDetalle(record.key, 'cantidad', numValue);
                    }
                  }}
                  style={{ width: '100%' }}
                />
                {producto.stock < cantidad && (
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
        }
        
        return (
          <InputNumber
            min={1}
            value={cantidad}
            onChange={(value) => {
              const numValue = Number(value);
              if (!isNaN(numValue) && numValue > 0) {
                actualizarDetalle(record.key, 'cantidad', numValue);
              }
            }}
            style={{ width: '100%' }}
          />
        );
      },
    },
    {
      title: 'Precio Unit.',
      dataIndex: 'precio_unitario',
      width: 140,
      render: (precio: number, record: FacturaDetalle) => {
        const tipo = record.tipo || (record.productoId ? 'PRODUCTO' : record.servicioId ? 'SERVICIO' : 'OTRO');
        
        // ✅ SIEMPRE EDITABLE - sin controles extra
        return (
          <InputNumber
            min={0}
            value={precio}
            onChange={(value) => {
              const numValue = Number(value);
              if (!isNaN(numValue) && numValue >= 0) {
                actualizarDetalle(record.key, 'precio_unitario', numValue);
              }
            }}
            style={{ width: '100%' }}
            formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={value => parseFloat(value!.replace(/\$\s?|(,*)/g, ''))}
            step={0.01}
          />
        );
      },
    },
    {
      title: 'Info',
      width: 120,
      render: (_: any, record: FacturaDetalle) => {
        if (record.productoId) {
          const producto = productos.find(p => p.id === record.productoId);
          if (producto) {
            const tieneStockSuficiente = producto.stock >= record.cantidad;
            return (
              <Tooltip title={`Stock disponible: ${producto.stock}`}>
                <Tag color={tieneStockSuficiente ? 'green' : 'red'}>
                  Stock: {producto.stock}
                </Tag>
              </Tooltip>
            );
          }
          return 'N/A';
        }
        
        if (record.servicioId) {
          const servicio = servicios.find(s => s.id === record.servicioId);
          if (servicio) {
            return (
              <Tooltip title={servicio.descripcion || 'Servicio'}>
                <Tag color="green">
                  {servicio.duracionMinutos} min
                </Tag>
              </Tooltip>
            );
          }
          return 'N/A';
        }
        
        return <Tag color="gray">Manual</Tag>;
      },
    },
    {
      title: 'Subtotal',
      width: 120,
      render: (_: any, record: FacturaDetalle) => (
        <span style={{ fontWeight: 'bold' }}>
          ${(record.cantidad * record.precio_unitario).toLocaleString('es-ES', {
            minimumFractionDigits: 2,
          })}
        </span>
      ),
    },
    {
      title: 'Acciones',
      width: 80,
      render: (_: any, record: FacturaDetalle) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => eliminarDetalle(record.key)}
        />
      ),
    },
  ];

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      // Validar que no haya precios negativos
      const detallesConPreciosInvalidos = detalles.filter(d => 
        d.precio_unitario < 0 || isNaN(d.precio_unitario)
      );
      
      if (detallesConPreciosInvalidos.length > 0) {
        message.error('Todos los precios deben ser números válidos mayores o iguales a 0');
        return;
      }
      
      // Validar y preparar detalles
      const detallesValidados = detalles.map(d => {
        const tipo = d.tipo || (d.productoId ? 'PRODUCTO' : d.servicioId ? 'SERVICIO' : 'OTRO');
        const cantidad = Number(d.cantidad);
        const precio_unitario = Number(d.precio_unitario);
        
        if (isNaN(cantidad) || cantidad <= 0) {
          throw new Error(`La cantidad en "${d.descripcion}" debe ser mayor a 0`);
        }
        
        if (isNaN(precio_unitario) || precio_unitario < 0) {
          throw new Error(`El precio en "${d.descripcion}" debe ser un número válido mayor o igual a 0`);
        }
        
        if (tipo === 'SERVICIO' && cantidad !== 1) {
          throw new Error(`Los servicios deben tener cantidad 1 (en "${d.descripcion}")`);
        }
        
        if (tipo === 'PRODUCTO' && d.productoId) {
          const producto = productos.find(p => p.id === d.productoId);
          if (producto && cantidad > producto.stock) {
            throw new Error(`Stock insuficiente para "${d.descripcion}". Disponible: ${producto.stock}`);
          }
        }
        
        return {
          descripcion: d.descripcion.trim(),
          cantidad: cantidad,
          precio_unitario: precio_unitario,
          productoId: d.productoId || null,
          servicioId: d.servicioId || null,
          tipo: tipo,
        };
      });

      if (detallesValidados.length === 0) {
        message.error('Debe agregar al menos un item a la factura');
        return;
      }

      for (const detalle of detallesValidados) {
        if (!detalle.descripcion || detalle.descripcion.trim() === '') {
          message.error('Todos los items deben tener una descripción');
          return;
        }
      }

      // Preparar datos para enviar
      const facturaData: any = {
        metodo_pago: values.metodo_pago,
        estado_pago: values.estado_pago || 'NO_PAGA',
        notas: values.notas || '',
        detalles: detallesValidados,
      };

      if (values.mecanicoId) {
        facturaData.mecanicoId = Number(values.mecanicoId);
      }

      // Manejar cliente
      if (modoCliente === 'existente' && values.clienteId) {
        facturaData.clienteId = Number(values.clienteId);
      } else if (modoCliente === 'nuevo') {
        if (!values.nombreCliente || values.nombreCliente.trim() === '') {
          message.error('El nombre del cliente es requerido');
          return;
        }
        
        facturaData.nuevoCliente = {
          nombre: values.nombreCliente.trim(),
          telefono: values.telefonoCliente?.trim() || null,
          email: values.emailCliente?.trim() || null,
          identificacion: values.identificacionCliente?.trim() || null,
          direccion: values.direccionCliente?.trim() || null,
        };
      } else {
        message.error('Debe seleccionar o crear un cliente');
        return;
      }

      // Manejar vehículo
      if (modoVehiculo === 'existente' && values.vehiculoId) {
        facturaData.vehiculoId = Number(values.vehiculoId);
      } else if (modoVehiculo === 'nuevo') {
        if (!values.placaVehiculo || values.placaVehiculo.trim() === '') {
          message.error('La placa del vehículo es requerida');
          return;
        }
        
        facturaData.nuevoVehiculo = {
          placa: values.placaVehiculo.trim().toUpperCase(),
          marca: values.marcaVehiculo?.trim() || '',
          modelo: values.modeloVehiculo?.trim() || '',
          anio: values.anioVehiculo ? Number(values.anioVehiculo) : null,
          color: values.colorVehiculo?.trim() || null,
        };
      }

      console.log('Enviando datos:', facturaData);
      onSubmit(facturaData);
      
    } catch (error: any) {
      console.error('Error validando formulario:', error);
      
      if (error.message && error.message.includes('debe ser')) {
        message.error(error.message);
      } else if (error.errorFields) {
        message.error('Por favor complete todos los campos requeridos');
      } else {
        message.error('Error al procesar el formulario');
      }
    }
  };

  return (
    <>
      <Form form={form} layout="vertical">
        {/* Sección Cliente */}
        <Card title="Cliente" style={{ marginBottom: 16 }}>
          <Space orientation="horizontal" style={{ marginBottom: 16 }}>
            <Radio.Group
              value={modoCliente}
              onChange={(e) => setModoCliente(e.target.value)}
            >
              <Radio.Button value="existente">Cliente Existente</Radio.Button>
              <Radio.Button value="nuevo">Nuevo Cliente</Radio.Button>
            </Radio.Group>
          </Space>

          {modoCliente === 'existente' ? (
            <Form.Item
              name="clienteId"
              rules={[{ required: true, message: 'Seleccione un cliente' }]}
            >
              <Select
                placeholder="Buscar cliente..."
                showSearch
                filterOption={false}
                onSearch={setBusquedaCliente}
                onChange={(value) => {
                  const cliente = clientes.find(c => c.id === value);
                  setClienteSeleccionado(cliente || null);
                  if (cliente && modoVehiculo === 'existente') {
                    cargarVehiculosPorCliente(cliente.id);
                  }
                }}
                notFoundContent={
                  loadingClientes ? (
                    <div style={{ textAlign: 'center', padding: '10px' }}>
                      <Spin size="small" />
                      <div style={{ marginTop: 8 }}>Buscando clientes...</div>
                    </div>
                  ) : busquedaCliente ? (
                    `No se encontraron clientes con "${busquedaCliente}"`
                  ) : (
                    "Escriba para buscar clientes"
                  )
                }
                options={clientes.map(c => ({
                  value: c.id,
                  label: (
                    <div>
                      <div><strong>{c.nombre}</strong></div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {c.identificacion && `ID: ${c.identificacion} • `}
                        {c.telefono && `Tel: ${c.telefono}`}
                        {c.telefono2 && ` / ${c.telefono2}`}
                        {c.email && ` • ${c.email}`}
                      </div>
                    </div>
                  ),
                }))}
                suffixIcon={loadingClientes ? <LoadingOutlined /> : <SearchOutlined />}
              />
            </Form.Item>
          ) : (
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="nombreCliente"
                  label="Nombre"
                  rules={[{ required: true, message: 'Ingrese el nombre' }]}
                >
                  <Input placeholder="Nombre completo" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="telefonoCliente"
                  label="Teléfono"
                >
                  <Input placeholder="3001234567" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="emailCliente"
                  label="Email"
                  rules={[{ type: 'email', message: 'Email inválido' }]}
                >
                  <Input placeholder="cliente@email.com" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="identificacionCliente"
                  label="Identificación"
                >
                  <Input placeholder="Cédula/NIT" />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item
                  name="direccionCliente"
                  label="Dirección"
                >
                  <TextArea rows={2} placeholder="Dirección completa" />
                </Form.Item>
              </Col>
            </Row>
          )}
        </Card>

        {/* Sección Vehículo (Opcional) */}
        <Card title="Vehículo (Opcional)" style={{ marginBottom: 16 }}>
          <Space orientation="horizontal" style={{ marginBottom: 16 }}>
            <Radio.Group
              value={modoVehiculo}
              onChange={(e) => setModoVehiculo(e.target.value)}
            >
              <Radio.Button value="existente">Vehículo Existente</Radio.Button>
              <Radio.Button value="nuevo">Nuevo Vehículo</Radio.Button>
              <Radio.Button value="ninguno">Sin Vehículo</Radio.Button>
            </Radio.Group>
          </Space>

          {modoVehiculo === 'existente' && (
            <Form.Item name="vehiculoId">
              <Select
                placeholder="Seleccionar vehículo..."
                disabled={!clienteSeleccionado}
                options={vehiculos.map(v => ({
                  value: v.id,
                  label: `${v.placa} - ${v.marca} ${v.modelo}`,
                }))}
                onChange={(value) => {
                  const vehiculo = vehiculos.find(v => v.id === value);
                  setVehiculoSeleccionado(vehiculo || null);
                }}
              />
            </Form.Item>
          )}

          {modoVehiculo === 'nuevo' && (
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="placaVehiculo"
                  label="Placa"
                  rules={[{ required: true, message: 'Ingrese la placa' }]}
                >
                  <Input placeholder="ABC123" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="marcaVehiculo"
                  label="Marca"
                  rules={[{ required: true, message: 'Ingrese la marca' }]}
                >
                  <Input placeholder="Toyota" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="modeloVehiculo"
                  label="Modelo"
                  rules={[{ required: true, message: 'Ingrese el modelo' }]}
                >
                  <Input placeholder="Corolla" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="anioVehiculo" label="Año">
                  <InputNumber 
                    min={1900} 
                    max={new Date().getFullYear()} 
                    style={{ width: '100%' }} 
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="colorVehiculo" label="Color">
                  <Input placeholder="Rojo" />
                </Form.Item>
              </Col>
            </Row>
          )}
        </Card>

        <Card 
          title={
            <Space orientation="horizontal">
              <UserOutlined />
              <span>Mecánico Asignado (Opcional)</span>
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="mecanicoId"
                label="Seleccionar Mecánico"
                extra="Seleccione un mecánico si el servicio fue realizado por uno específico"
              >
                <Select
                  placeholder="Buscar mecánico por nombre, especialidad..."
                  showSearch
                  filterOption={false}
                  onSearch={setBusquedaMecanico}
                  allowClear
                  notFoundContent={
                    loadingMecanicos ? (
                      <div style={{ textAlign: 'center', padding: '10px' }}>
                        <Spin size="small" />
                        <div style={{ marginTop: 8 }}>Buscando mecánicos...</div>
                      </div>
                    ) : busquedaMecanico ? (
                      `No se encontraron mecánicos con "${busquedaMecanico}"`
                    ) : (
                      "Escriba para buscar mecánicos"
                    )
                  }
                  options={mecanicos
                    .filter(m => m.activo !== false)
                    .map(m => ({
                      value: m.id,
                      label: (
                        <div>
                          <div><strong>{m.nombre}</strong></div>
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            {m.especialidad && `Especialidad: ${m.especialidad} • `}
                            {m.telefono && `Tel: ${m.telefono}`}
                            {m.email && ` • Email: ${m.email}`}
                          </div>
                        </div>
                      ),
                    }))}
                  suffixIcon={loadingMecanicos ? <LoadingOutlined /> : <SearchOutlined />}
                />
              </Form.Item>
            </Col>
          </Row>
          
          {mecanicos.length === 0 && !loadingMecanicos && (
            <Alert
              message="No hay mecánicos disponibles"
              description="Puede generar la factura sin asignar un mecánico o crear mecánicos primero."
              type="warning"
              showIcon
              style={{ marginTop: 8 }}
            />
          )}
        </Card>

        {/* Sección Detalles - SIN CONTROLES EXTRA */}
        <Card 
          title={
            <Space orientation="horizontal">
              <span>Detalles de la Factura</span>
              <Tag color="blue">{detalles.length} items</Tag>
              <Tag color="green">Total: ${total.toLocaleString('es-ES')}</Tag>
            </Space>
          }
          style={{ marginBottom: 16 }}
          extra={
            <Space orientation="horizontal">
              <Button
                type="dashed"
                icon={<ShoppingOutlined />}
                onClick={() => {
                  setActiveTab('productos');
                  setModalItems(true);
                }}
              >
                Agregar Producto
              </Button>
              <Button
                type="dashed"
                icon={<ToolOutlined />}
                onClick={() => {
                  setActiveTab('servicios');
                  setModalItems(true);
                }}
              >
                Agregar Servicio
              </Button>
              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={() => agregarDetalleManual('OTRO')}
              >
                Agregar Manual
              </Button>
            </Space>
          }
        >
          
          <Table
            columns={columnasDetalles}
            dataSource={detalles}
            pagination={false}
            size="small"
            locale={{ emptyText: 'Agregue items a la factura' }}
            rowKey="key"
          />
          
          <Divider />
          
          <Row justify="end">
            <Col>
              <Title level={4} style={{ margin: 0 }}>
                Total: ${total.toLocaleString('es-ES', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Title>
            </Col>
          </Row>
        </Card>

        {/* Sección Pago */}
        <Card title="Información de Pago" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="metodo_pago"
                label="Método de Pago"
                rules={[{ required: true, message: 'Seleccione método de pago' }]}
              >
                <Select placeholder="Seleccione método">
                  <Option value="EFECTIVO">💵 Efectivo</Option>
                  <Option value="TARJETA_CREDITO">💳 Tarjeta Crédito</Option>
                  <Option value="TARJETA_DEBITO">💳 Tarjeta Débito</Option>
                  <Option value="TRANSFERENCIA">🏦 Transferencia</Option>
                  <Option value="CHEQUE">📄 Cheque</Option>
                  <Option value="OTRO">📝 Otro</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="estado_pago"
                label="Estado de Pago"
                initialValue="NO_PAGA"
              >
                <Select>
                  <Option value="NO_PAGA">❌ Pendiente de Pago</Option>
                  <Option value="PAGA">✅ Pagada</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="notas" label="Notas (Opcional)">
                <TextArea rows={3} placeholder="Notas adicionales para la factura..." />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Botones de acción */}
        <Row justify="end" gutter={16}>
          <Col>
            <Button onClick={onCancel} size="large">
              Cancelar
            </Button>
          </Col>
          <Col>
            <Button
              type="primary"
              onClick={handleSubmit}
              size="large"
              disabled={detalles.length === 0}
            >
              Generar Factura
            </Button>
          </Col>
        </Row>
      </Form>

      {/* Modal para seleccionar productos/servicios */}
      <Modal
        title={
          <Space orientation="horizontal">
            {activeTab === 'productos' ? <ShoppingOutlined /> : <ToolOutlined />}
            <span>Seleccionar {activeTab === 'productos' ? 'Productos' : 'Servicios'}</span>
          </Space>
        }
        open={modalItems}
        onCancel={() => setModalItems(false)}
        footer={null}
        width={800}
      >
        <Tabs activeKey={activeTab} onChange={(key) => setActiveTab(key as any)}>
          <TabPane 
            tab={
              <Space orientation="horizontal">
                <ShoppingOutlined />
                <span>Productos ({productos.length})</span>
              </Space>
            } 
            key="productos"
          >
            {loadingProductos ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <Spin size="large" />
                <div style={{ marginTop: 16 }}>Cargando productos...</div>
              </div>
            ) : productos.length === 0 ? (
              <Alert
                message="No hay productos disponibles"
                description="Verifique que existan productos con stock en el sistema."
                type="warning"
                showIcon
              />
            ) : (
              <Table
                dataSource={productos}
                columns={[
                  { title: 'Nombre', dataIndex: 'nombre' },
                  { title: 'Referencia', dataIndex: 'referencia' },
                  { title: 'Precio', dataIndex: 'precio', render: (v) => `$${v}` },
                  { title: 'Stock', dataIndex: 'stock' },
                  {
                    title: 'Acción',
                    render: (_, producto) => (
                      <Button
                        type="primary"
                        size="small"
                        onClick={() => agregarDetalle(producto, 'PRODUCTO')}
                        disabled={producto.stock <= 0}
                      >
                        Agregar
                      </Button>
                    ),
                  },
                ]}
                pagination={{ pageSize: 10 }}
                rowKey="id"
              />
            )}
          </TabPane>
          
          <TabPane 
            tab={
              <Space orientation="horizontal">
                <ToolOutlined />
                <span>Servicios ({servicios.length})</span>
              </Space>
            } 
            key="servicios"
          >
            {loadingServicios ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <Spin size="large" />
                <div style={{ marginTop: 16 }}>Cargando servicios...</div>
              </div>
            ) : servicios.length === 0 ? (
              <Alert
                message="No hay servicios disponibles"
                description="Verifique que existan servicios activos en el sistema."
                type="warning"
                showIcon
              />
            ) : (
              <Table
                dataSource={servicios}
                columns={[
                  { title: 'Nombre', dataIndex: 'nombre' },
                  { title: 'Descripción', dataIndex: 'descripcion' },
                  { title: 'Precio', dataIndex: 'precio', render: (v) => `$${v}` },
                  { title: 'Duración', dataIndex: 'duracionMinutos', render: (v) => `${v} min` },
                  {
                    title: 'Acción',
                    render: (_, servicio) => (
                      <Button
                        type="primary"
                        size="small"
                        onClick={() => agregarDetalle(servicio, 'SERVICIO')}
                      >
                        Agregar
                      </Button>
                    ),
                  },
                ]}
                pagination={{ pageSize: 10 }}
                rowKey="id"
              />
            )}
          </TabPane>
        </Tabs>
      </Modal>
    </>
  );
}