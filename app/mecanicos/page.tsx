// app/mecanicos/page.tsx
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
  Switch,
  Tooltip,
  DatePicker,
  Typography,
  Spin,
  Alert,
  Select,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  SearchOutlined,
  UserOutlined,
  ToolOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  DollarOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import api from '@/lib/api';
import MecanicoForm from '@/components/MecanicoForm';
import AppLayout from '@/components/AppLayout';
import dayjs from 'dayjs';

const { Search } = Input;
const { RangePicker } = DatePicker;
const { Title, Text } = Typography;
const { Option } = Select;

export default function MecanicosPage() {
  const [mecanicos, setMecanicos] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [open, setOpen] = useState(false);
  const [openReporte, setOpenReporte] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [selectedMecanico, setSelectedMecanico] = useState<any>(null);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingReporte, setLoadingReporte] = useState(false);
  const [reporteData, setReporteData] = useState<any>(null);
  const [fechaRange, setFechaRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('month'),
    dayjs().endOf('day'),
  ]);
  const [serviciosList, setServiciosList] = useState<any[]>([]);
  const [selectedServicio, setSelectedServicio] = useState<string>('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [mecanicosRes, statsRes, serviciosRes] = await Promise.all([
        api.get('/mecanicos', { params: { search: searchText } }),
        api.get('/mecanicos/estadisticas'),
        api.get('/servicios?activo=true')
      ]);
      setMecanicos(mecanicosRes.data);
      setStats(statsRes.data);
      
      // Filtrar servicios y buscar "mano de obra"
      const servicios = serviciosRes.data || [];
      setServiciosList(servicios);
      
      // Buscar automáticamente "mano de obra" en los servicios
      const manoDeObraServicio = servicios.find((s: any) => 
        s.nombre.toLowerCase().includes('mano') || 
        s.nombre.toLowerCase().includes('obra') ||
        s.nombre.toLowerCase().includes('mano de obra') ||
        s.nombre.toLowerCase().includes('labor')
      );
      
      if (manoDeObraServicio) {
        setSelectedServicio(manoDeObraServicio.nombre);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      message.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchText]);

  const createMecanico = async (values: any) => {
    try {
      await api.post('/mecanicos', values);
      message.success('Mecánico creado exitosamente');
      setOpen(false);
      loadData();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al crear mecánico');
    }
  };

  const updateMecanico = async (values: any) => {
    try {
      await api.put(`/mecanicos/${editing.id}`, values);
      message.success('Mecánico actualizado exitosamente');
      setEditing(null);
      setOpen(false);
      loadData();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al actualizar mecánico');
    }
  };

  const deleteMecanico = async (id: number) => {
    try {
      await api.delete(`/mecanicos/${id}`);
      message.success('Mecánico eliminado exitosamente');
      loadData();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al eliminar mecánico');
    }
  };

  const toggleStatus = async (id: number, currentStatus: boolean) => {
    try {
      await api.patch(`/mecanicos/${id}/toggle-status`);
      message.success(`Mecánico ${currentStatus ? 'desactivado' : 'activado'} exitosamente`);
      loadData();
    } catch (error) {
      message.error('Error al cambiar estado');
    }
  };

  const cargarReporteManoDeObra = async () => {
    if (!selectedMecanico) return;
    
    setLoadingReporte(true);
    try {
      const params = {
        mecanicoId: selectedMecanico.id,
        fechaInicio: fechaRange[0].format('YYYY-MM-DD'),
        fechaFin: fechaRange[1].format('YYYY-MM-DD'),
        servicioNombre: selectedServicio
      };
      
      const res = await api.get('/facturas/reporte/mano-obra', { params });
      setReporteData(res.data);
    } catch (error: any) {
      console.error('Error cargando reporte:', error);
      message.error(error.response?.data?.message || 'Error al cargar el reporte');
      setReporteData(null);
    } finally {
      setLoadingReporte(false);
    }
  };

  const openReporteModal = (mecanico: any) => {
    setSelectedMecanico(mecanico);
    setOpenReporte(true);
    setReporteData(null);
  };

  const columns = [
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      render: (text: string, record: any) => (
        <div>
          <strong>{text}</strong>
          {!record.activo && (
            <Tag color="red" style={{ marginLeft: 8, fontSize: '10px' }}>
              INACTIVO
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Especialidad',
      dataIndex: 'especialidad',
      render: (value: string) =>
        value ? (
          <Tag color="blue" icon={<ToolOutlined />}>
            {value}
          </Tag>
        ) : (
          <Tag color="default">Sin especialidad</Tag>
        ),
    },
    {
      title: 'Contacto',
      render: (record: any) => (
        <div>
          {record.telefono && <div>📞 {record.telefono}</div>}
          {record.email && (
            <div style={{ fontSize: '12px', color: '#666' }}>
              ✉️ {record.email}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'activo',
      render: (activo: boolean, record: any) => (
        <Switch
          checked={activo}
          checkedChildren={<EyeOutlined />}
          unCheckedChildren={<EyeInvisibleOutlined />}
          onChange={() => toggleStatus(record.id, activo)}
        />
      ),
    },
    {
      title: 'Acciones',
      width: 180,
      render: (_: any, record: any) => (
        <Space>
          <Tooltip title="Ver reporte de mano de obra">
            <Button
              type="text"
              icon={<DollarOutlined />}
              onClick={() => openReporteModal(record)}
              disabled={!record.activo}
            />
          </Tooltip>
          
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
            title="¿Eliminar mecánico?"
            description="Esta acción no se puede deshacer"
            onConfirm={() => deleteMecanico(record.id)}
            okText="Sí"
            cancelText="No"
            disabled={record.ordenesCount > 0}
          >
            <Tooltip 
              title={record.ordenesCount > 0 ? "No se puede eliminar, tiene órdenes asociadas" : "Eliminar"}
            >
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                disabled={record.ordenesCount > 0}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <AppLayout title="Mecánicos">
      {/* Estadísticas */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Mecánicos"
              value={stats.total || 0}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Activos"
              value={stats.activos || 0}
              valueStyle={{ color: '#3f8600' }}
              prefix={<EyeOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Inactivos"
              value={stats.inactivos || 0}
              valueStyle={{ color: '#cf1322' }}
              prefix={<EyeInvisibleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Especialidades"
              value={stats.especialidades?.length || 0}
              prefix={<ToolOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Barra de búsqueda y acciones */}
      <Card style={{ marginBottom: 20 }}>
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Search
              placeholder="Buscar por nombre, especialidad o teléfono..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onSearch={loadData}
              allowClear
            />
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              Nuevo Mecánico
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Tabla de mecánicos */}
      <Table
        rowKey="id"
        columns={columns}
        dataSource={mecanicos}
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} mecánicos`,
        }}
        rowClassName={(record) => (!record.activo ? 'row-inactive' : '')}
      />

      {/* Modal del formulario */}
      <Modal
        open={open}
        title={editing ? 'Editar Mecánico' : 'Nuevo Mecánico'}
        footer={null}
        onCancel={() => {
          setOpen(false);
          setEditing(null);
        }}
        destroyOnClose
        width={600}
      >
        <MecanicoForm
          initialValues={editing}
          onSubmit={editing ? updateMecanico : createMecanico}
        />
      </Modal>

      {/* Modal de reporte de mano de obra */}
      <Modal
        open={openReporte}
        title={
          <Space>
            <DollarOutlined />
            <span>Reporte de Mano de Obra - {selectedMecanico?.nombre}</span>
          </Space>
        }
        footer={null}
        onCancel={() => {
          setOpenReporte(false);
          setSelectedMecanico(null);
          setReporteData(null);
        }}
        width={700}
        destroyOnClose
      >
        {selectedMecanico && (
          <>
            <Card size="small" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={12}>
                  <div style={{ marginBottom: 8 }}>
                    <Text strong>Mecánico: </Text>
                    <Text>{selectedMecanico.nombre}</Text>
                  </div>
                  {selectedMecanico.especialidad && (
                    <div>
                      <Text strong>Especialidad: </Text>
                      <Text>{selectedMecanico.especialidad}</Text>
                    </div>
                  )}
                </Col>
                <Col span={12}>
                  <div style={{ marginBottom: 8 }}>
                    <Text strong>Estado: </Text>
                    <Tag color={selectedMecanico.activo ? 'green' : 'red'}>
                      {selectedMecanico.activo ? 'ACTIVO' : 'INACTIVO'}
                    </Tag>
                  </div>
                  {selectedMecanico.telefono && (
                    <div>
                      <Text strong>Teléfono: </Text>
                      <Text>{selectedMecanico.telefono}</Text>
                    </div>
                  )}
                </Col>
              </Row>
            </Card>

            <Card size="small" style={{ marginBottom: 16 }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text strong>Seleccionar Servicio:</Text>
                  <Select
                    style={{ width: '100%', marginTop: 8 }}
                    placeholder="Buscar servicio de mano de obra..."
                    showSearch
                    optionFilterProp="children"
                    value={selectedServicio}
                    onChange={setSelectedServicio}
                    filterOption={(input, option) =>
                      String(option?.children ?? '').toLowerCase().includes(String(input).toLowerCase())
                    }
                  >
                    {serviciosList.map((servicio: any) => (
                      <Option key={servicio.id} value={servicio.nombre}>
                        {servicio.nombre} - ${servicio.precio}
                      </Option>
                    ))}
                  </Select>
                </div>

                <div>
                  <Text strong>Rango de Fechas:</Text>
                  <RangePicker
                    style={{ width: '100%', marginTop: 8 }}
                    value={fechaRange}
                    onChange={(dates) => {
                      if (dates) {
                        setFechaRange([dates[0]!, dates[1]!]);
                      }
                    }}
                    format="DD/MM/YYYY"
                    allowClear={false}
                  />
                </div>

                <Button
                  type="primary"
                  icon={<CalendarOutlined />}
                  onClick={cargarReporteManoDeObra}
                  loading={loadingReporte}
                  disabled={!selectedServicio}
                  block
                >
                  Generar Reporte
                </Button>
              </Space>
            </Card>

            {loadingReporte ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <Spin size="large" />
                <div style={{ marginTop: 16 }}>Cargando reporte...</div>
              </div>
            ) : reporteData ? (
              <Card 
                title={
                  <Space>
                    <DollarOutlined />
                    <span>Resultados del Reporte</span>
                  </Space>
                }
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Alert
                    message={
                      <div>
                        <Text strong>Servicio analizado: </Text>
                        <Text>{selectedServicio}</Text>
                      </div>
                    }
                    type="info"
                    showIcon
                  />

                  <Row gutter={16}>
                    <Col span={12}>
                      <Card size="small">
                        <Statistic
                          title="Total Facturado"
                          value={reporteData.total_facturado || 0}
                          prefix="$"
                          valueStyle={{ 
                            color: reporteData.total_facturado > 0 ? '#3f8600' : '#cf1322',
                            fontSize: '24px'
                          }}
                          precision={2}
                        />
                      </Card>
                    </Col>
                    <Col span={12}>
                      <Card size="small">
                        <Statistic
                          title="Cantidad de Facturas"
                          value={reporteData.cantidad_facturas || 0}
                          prefix="#"
                          valueStyle={{ fontSize: '24px' }}
                        />
                      </Card>
                    </Col>
                  </Row>

                  {reporteData.facturas && reporteData.facturas.length > 0 && (
                    <>
                      <Title level={5} style={{ marginTop: 16 }}>
                        Detalle de Facturas ({reporteData.facturas.length})
                      </Title>
                      <Table
                        size="small"
                        dataSource={reporteData.facturas}
                        pagination={{ pageSize: 5 }}
                        rowKey="id"
                        columns={[
                          {
                            title: 'Factura',
                            dataIndex: 'factura_id',
                            render: (id) => `#${id}`,
                          },
                          {
                            title: 'Fecha',
                            dataIndex: 'fecha',
                            render: (fecha) => dayjs(fecha).format('DD/MM/YYYY HH:mm'),
                          },
                          {
                            title: 'Cliente',
                            dataIndex: 'cliente_nombre',
                          },
                          {
                            title: 'Cantidad',
                            dataIndex: 'cantidad',
                            align: 'center',
                          },
                          {
                            title: 'Precio Unit.',
                            dataIndex: 'precio_unitario',
                            render: (precio) => `$${Number(precio).toFixed(2)}`,
                            align: 'right',
                          },
                          {
                            title: 'Subtotal',
                            render: (record) => (
                              <Text strong>
                                ${(record.cantidad * record.precio_unitario).toFixed(2)}
                              </Text>
                            ),
                            align: 'right',
                          },
                          {
                            title: 'Estado Pago',
                            dataIndex: 'estado_pago',
                            render: (estado) => (
                              <Tag color={estado === 'PAGA' ? 'green' : 'orange'}>
                                {estado === 'PAGA' ? 'PAGADA' : 'NO PAGA'}
                              </Tag>
                            ),
                          },
                        ]}
                      />
                    </>
                  )}

                  {(!reporteData.facturas || reporteData.facturas.length === 0) && (
                    <Alert
                      message="No se encontraron facturas con este servicio en el rango de fechas seleccionado"
                      type="warning"
                      showIcon
                    />
                  )}
                </Space>
              </Card>
            ) : (
              <Alert
                message="Seleccione un servicio y rango de fechas, luego haga clic en 'Generar Reporte'"
                type="info"
                showIcon
              />
            )}
          </>
        )}
      </Modal>
    </AppLayout>
  );
}