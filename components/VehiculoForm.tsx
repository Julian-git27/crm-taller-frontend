'use client';

import {
  Form,
  Input,
  Button,
  Select,
  InputNumber,
  Divider,
  Card,
  Modal,
  message,
  Row,
  Col,
  DatePicker,
  Space,
} from 'antd';
import api from '@/lib/api';
import { useEffect, useState } from 'react';
import dayjs from 'dayjs';

const coloresComunes = [
  'Blanco', 'Negro', 'Gris', 'Plateado', 'Azul', 'Rojo', 
  'Verde', 'Amarillo', 'Naranja', 'Marrón', 'Beige', 'Dorado'
];

export default function VehiculoForm({
  clientes: clientesProp,
  initialValues,
  onSubmit,
  onCancel, // Nueva prop para manejar el cierre
}: {
  clientes: any[];
  initialValues?: any;
  onSubmit: (values: any) => void;
  onCancel: () => void; // Nueva prop
}) {
  const [form] = Form.useForm();
  const [openCliente, setOpenCliente] = useState(false);
  const [clientes, setClientes] = useState<any[]>(clientesProp);

  // 🔄 sincronizar clientes cuando cambian
  useEffect(() => {
    setClientes(clientesProp);
  }, [clientesProp]);

  // 🔄 rellenar formulario al editar
  useEffect(() => {
    if (initialValues) {
      const values = {
        ...initialValues,
        clienteId: initialValues.cliente?.id,
        color: initialValues.color || '',
        kilometraje: initialValues.kilometraje || 0,
        fecha_vencimiento_soat: initialValues.fecha_vencimiento_soat 
          ? dayjs(initialValues.fecha_vencimiento_soat) 
          : null,
        fecha_vencimiento_tecnomecanica: initialValues.fecha_vencimiento_tecnomecanica 
          ? dayjs(initialValues.fecha_vencimiento_tecnomecanica) 
          : null,
      };
      form.setFieldsValue(values);
    } else {
      form.resetFields();
    }
  }, [initialValues, form]);

  // ✅ CREAR CLIENTE Y AGREGARLO AL SELECT
  const crearCliente = async (values: any) => {
    try {
      const res = await api.post('/clientes', values);
      const nuevoCliente = res.data;
      message.success('Cliente creado');
      setClientes((prev) => [...prev, nuevoCliente]);
      form.setFieldValue('clienteId', nuevoCliente.id);
      setOpenCliente(false);
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al crear cliente');
    }
  };

  const handleSubmit = async (values: any) => {
    // Formatear las fechas antes de enviar
    const formattedValues = {
      ...values,
      fecha_vencimiento_soat: values.fecha_vencimiento_soat 
        ? values.fecha_vencimiento_soat.format('YYYY-MM-DD')
        : null,
      fecha_vencimiento_tecnomecanica: values.fecha_vencimiento_tecnomecanica 
        ? values.fecha_vencimiento_tecnomecanica.format('YYYY-MM-DD')
        : null,
    };
    
    onSubmit(formattedValues);
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Card bordered={false}>
      <Form layout="vertical" form={form} onFinish={handleSubmit}>
        {/* CLIENTE */}
        <Form.Item
          label="Cliente"
          name="clienteId"
          rules={[{ required: true, message: 'Seleccione un cliente' }]}
        >
          <Select
            placeholder="Seleccione cliente"
            showSearch
            filterOption={(input, option) =>
              String(option?.children ?? '').toLowerCase().includes(input.toLowerCase())
            }
            dropdownRender={(menu) => (
              <>
                {menu}
                <Divider style={{ margin: '8px 0' }} />
                <Button type="link" onClick={() => setOpenCliente(true)} block>
                  + Crear nuevo cliente
                </Button>
              </>
            )}
          >
            {clientes.map((c) => (
              <Select.Option key={c.id} value={c.id}>
                {c.nombre} {c.identificacion ? `(${c.identificacion})` : ''}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            {/* PLACA */}
            <Form.Item
              label="Placa"
              name="placa"
              rules={[
                { required: true, message: 'Ingrese la placa' },
                { pattern: /^[A-Z0-9]{6,7}$/, message: 'Placa inválida' }
              ]}
            >
              <Input
                placeholder="ABC123"
                onChange={(e) =>
                  form.setFieldValue('placa', e.target.value.toUpperCase())
                }
                maxLength={7}
              />
            </Form.Item>
          </Col>
          
          <Col span={12}>
            {/* COLOR */}
            <Form.Item
              label="Color"
              name="color"
            >
              <Select
                placeholder="Seleccione color"
                allowClear
                showSearch
              >
                {coloresComunes.map(color => (
                  <Select.Option key={color} value={color}>
                    {color}
                  </Select.Option>
                ))}
                <Select.Option value="OTRO">Otro</Select.Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item 
              label="Marca" 
              name="marca" 
              rules={[{ required: true, message: 'Ingrese la marca' }]}
            >
              <Input placeholder="Ej: Toyota, Chevrolet, Ford" />
            </Form.Item>
          </Col>
          
          <Col span={12}>
            <Form.Item 
              label="Modelo" 
              name="modelo" 
              rules={[{ required: true, message: 'Ingrese el modelo' }]}
            >
              <Input placeholder="Ej: Corolla, Spark, Ranger" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="Año" name="anio">
              <InputNumber 
                style={{ width: '100%' }} 
                min={1900} 
                max={new Date().getFullYear() + 1}
                placeholder="2020"
              />
            </Form.Item>
          </Col>
          
          <Col span={8}>
            <Form.Item label="Cilindraje (cc)" name="cilindraje">
              <InputNumber 
                style={{ width: '100%' }} 
                min={0}
                placeholder="1600"
              />
            </Form.Item>
          </Col>
          
          <Col span={8}>
            <Form.Item label="Kilometraje" name="kilometraje">
              <InputNumber 
                style={{ width: '100%' }} 
                min={0}
                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value) => (value ? Number(value.replace(/\$\s?|(,*)/g, '')) : 0) as any}
                placeholder="50000"
              />
            </Form.Item>
          </Col>
        </Row>

        
        <Divider>Documentos del Vehículo</Divider>
        
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Vencimiento SOAT"
              name="fecha_vencimiento_soat"
            >
              <DatePicker
                style={{ width: '100%' }}
                placeholder="Seleccione fecha"
                format="DD/MM/YYYY"
              />
            </Form.Item>
          </Col>
          
          <Col span={12}>
            <Form.Item
              label="Vencimiento Tecnomecánica"
              name="fecha_vencimiento_tecnomecanica"
            >
              <DatePicker
                style={{ width: '100%' }}
                placeholder="Seleccione fecha"
                format="DD/MM/YYYY"
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item style={{ marginTop: 16 }}>
          <Space style={{ width: '100%', justifyContent: 'center' }}>
            <Button 
              type="default" 
              onClick={handleCancel}
            >
              Cancelar
            </Button>
            <Button type="primary" htmlType="submit" size="large">
              {initialValues ? 'ACTUALIZAR VEHÍCULO' : 'GUARDAR VEHÍCULO'}
            </Button>
          </Space>
        </Form.Item>
      </Form>

      {/* 🧍 SUBFORM CLIENTE */}
      <Modal
        open={openCliente}
        title="Nuevo Cliente"
        footer={null}
        onCancel={() => setOpenCliente(false)}
        destroyOnClose
        width={500}
      >
        <Form layout="vertical" onFinish={crearCliente}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Nombre"
                name="nombre"
                rules={[{ required: true, message: 'Ingrese el nombre' }]}
              >
                <Input />
              </Form.Item>
            </Col>
            
            <Col span={12}>
              <Form.Item
                label="Identificación"
                name="identificacion"
                rules={[{ required: true, message: 'Ingrese identificación' }]}
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="Email"
            name="email"
            rules={[{ required: true, type: 'email', message: 'Email inválido' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item label="Teléfono" name="telefono">
            <Input />
          </Form.Item>

          <Button type="primary" htmlType="submit" block>
            Crear Cliente
          </Button>
        </Form>
      </Modal>
    </Card>
  );
}