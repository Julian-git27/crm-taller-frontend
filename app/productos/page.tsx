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
  Badge,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  SearchOutlined,
  ShoppingOutlined,
  WarningOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import api from '@/lib/api';
import ProductoForm from '@/components/ProductoForm';
import AppLayout from '@/components/AppLayout';

const { Search } = Input;

export default function ProductosPage() {
  const [productos, setProductos] = useState<any[]>([]);
  const [bajoStock, setBajoStock] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [productosRes, bajoStockRes] = await Promise.all([
        api.get('/productos'),
        api.get('/productos/bajo-stock'),
      ]);
      
      setProductos(productosRes.data);
      setBajoStock(bajoStockRes.data);
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

  const createProducto = async (values: any) => {
    try {
      await api.post('/productos', values);
      message.success('Producto creado exitosamente');
      setOpen(false);
      loadData();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al crear producto');
    }
  };

  const updateProducto = async (values: any) => {
    try {
      await api.put(`/productos/${editing.id}`, values);
      message.success('Producto actualizado exitosamente');
      setEditing(null);
      setOpen(false);
      loadData();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al actualizar producto');
    }
  };

  const deleteProducto = async (id: number) => {
    try {
      await api.delete(`/productos/${id}`);
      message.success('Producto eliminado exitosamente');
      loadData();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al eliminar producto');
    }
  };

  const stockTag = (stock: number, stockMinimo: number) => {
    if (stock <= 0) {
      return <Tag color="red" icon={<WarningOutlined />}>Sin stock</Tag>;
    }
    if (stock <= stockMinimo) {
      return <Tag color="orange" icon={<WarningOutlined />}>Bajo stock</Tag>;
    }
    return <Tag color="green" icon={<ShoppingOutlined />}>Disponible</Tag>;
  };

  const columns = [
    {
      
    title: 'Referencia',
    dataIndex: 'referencia',
    width: 120,
    render: (ref: string) => ref || <span style={{ color: '#ccc' }}>N/A</span>,
   },
    {
      title: 'Producto',
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
    },
    {
      title: 'Stock',
      dataIndex: 'stock',
      render: (stock: number, record: any) => (
        <Space>
          <Badge 
            count={stock} 
            showZero 
            color={stock <= 0 ? 'red' : stock <= record.stock_minimo ? 'orange' : 'green'}
          />
          {stockTag(stock, record.stock_minimo)}
        </Space>
      ),
      sorter: (a: any, b: any) => a.stock - b.stock,
    },
    {
      title: 'Stock Mínimo',
      dataIndex: 'stock_minimo',
      render: (v: number) => v || 5,
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
            title="¿Eliminar producto?"
            description="Esta acción no se puede deshacer"
            onConfirm={() => deleteProducto(record.id)}
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

  // Filtrar productos según búsqueda
  const productosFiltrados = searchText 
  ? productos.filter(p => 
      p.nombre.toLowerCase().includes(searchText.toLowerCase()) ||
      (p.referencia && p.referencia.toLowerCase().includes(searchText.toLowerCase())) ||
      (p.categoria && p.categoria.toLowerCase().includes(searchText.toLowerCase()))
    )
  : productos;
  return (
    <AppLayout title="Inventario de Productos">
      {/* Estadísticas */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Productos"
              value={productos.length}
              prefix={<ShoppingOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Bajo Stock"
              value={bajoStock.length}
              valueStyle={{ color: '#cf1322' }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Sin Stock"
              value={productos.filter(p => p.stock <= 0).length}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<WarningOutlined />}
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
                Nuevo Producto
              </Button>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Barra de búsqueda */}
      <Card style={{ marginBottom: 20 }}>
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Search
              placeholder="Buscar por nombre o categoría..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onSearch={loadData}
              allowClear
            />
          </Col>
          <Col>
            <Button onClick={loadData} loading={loading}>
              Actualizar
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Tabla de productos */}
      <Table
        rowKey="id"
        columns={columns}
        dataSource={productosFiltrados}
        loading={loading}
        pagination={{ 
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} productos`,
        }}
        scroll={{ x: 800 }}
        rowClassName={(record) => {
          if (record.stock <= 0) return 'row-no-stock';
          if (record.stock <= record.stock_minimo) return 'row-low-stock';
          return '';
        }}
      />

      {/* Alertas de bajo stock */}
      {bajoStock.length > 0 && (
        <Card 
          title="⚠️ Productos con Bajo Stock" 
          style={{ marginTop: 20, borderColor: '#ffa940' }}
        >
          <ul>
            {bajoStock.slice(0, 5).map((p: any) => (
              <li key={p.id}>
                <strong>{p.nombre}</strong> - Stock: {p.stock} (Mínimo: {p.stock_minimo})
              </li>
            ))}
          </ul>
          {bajoStock.length > 5 && (
            <div style={{ marginTop: 8, color: '#666', fontSize: '12px' }}>
              ... y {bajoStock.length - 5} más
            </div>
          )}
        </Card>
      )}

      {/* Modal del formulario */}
      <Modal
        open={open}
        title={editing ? 'Editar Producto' : 'Nuevo Producto'}
        footer={null}
        onCancel={() => {
          setOpen(false);
          setEditing(null);
        }}
        destroyOnClose
        width={600}
      >
        <ProductoForm
          initialValues={editing}
          onSubmit={editing ? updateProducto : createProducto}
        />
      </Modal>
    </AppLayout>
  );
}