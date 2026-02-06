// components/servicios/ServicioForm.tsx
'use client';

import {
  Form,
  Input,
  InputNumber,
  Button,
  Card,
  Select,
  Switch,
  Col,
  Row,
} from 'antd';
import { useEffect } from 'react';

const { Option } = Select;
const { TextArea } = Input;

export default function ServicioForm({
  initialValues,
  onSubmit,
}: {
  initialValues?: any;
  onSubmit: (values: any) => void;
}) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue({
        ...initialValues,
        precio: initialValues.precio ? Number(initialValues.precio) : 0,
        duracionMinutos: initialValues.duracionMinutos ? Number(initialValues.duracionMinutos) : 60,
      });
    } else {
      form.resetFields();
    }
  }, [initialValues, form]);

  const onFinish = (values: any) => {
    const cleanedValues = {
      nombre: values.nombre?.trim(),
      descripcion: values.descripcion?.trim() || null,
      categoria: values.categoria?.trim() || null,
      precio: Number(values.precio || 0),
      duracionMinutos: Number(values.duracionMinutos || 60),
      requiereRepuestos: values.requiereRepuestos || false,
      observaciones: values.observaciones?.trim() || null,
      esActivo: values.esActivo !== undefined ? values.esActivo : true,
    };
    
    onSubmit(cleanedValues);
  };

  return (
    <Card bordered={false}>
      <Form
        layout="vertical"
        form={form}
        initialValues={{
          duracionMinutos: 60,
          esActivo: true,
          requiereRepuestos: false,
          ...initialValues
        }}
        onFinish={onFinish}
      >
        <Form.Item
          label="Nombre del Servicio"
          name="nombre"
          rules={[
            { required: true, message: 'El nombre es obligatorio' },
            { min: 3, message: 'Mínimo 3 caracteres' },
            { max: 100, message: 'Máximo 100 caracteres' },
          ]}
        >
          <Input placeholder="Ej: Cambio de Aceite, Alineación, Revisión General" />
        </Form.Item>

        <Form.Item
          label="Categoría"
          name="categoria"
          rules={[{ max: 50, message: 'Máximo 50 caracteres' }]}
        >
          <Select placeholder="Seleccione una categoría" allowClear>
            <Option value="MANTENIMIENTO">Mantenimiento</Option>
            <Option value="REPARACION">Reparación</Option>
            <Option value="DIAGNOSTICO">Diagnóstico</Option>
            <Option value="ELECTRICO">Eléctrico</Option>
            <Option value="MECANICO">Mecánico</Option>
            <Option value="SUSPENSION">Suspensión</Option>
            <Option value="FRENOS">Frenos</Option>
            <Option value="TRANSMISION">Transmisión</Option>
            <Option value="OTROS">Otros</Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="Descripción"
          name="descripcion"
          rules={[{ max: 500, message: 'Máximo 500 caracteres' }]}
        >
          <TextArea
            rows={3}
            placeholder="Descripción detallada del servicio"
            maxLength={500}
            showCount
          />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Precio ($)"
              name="precio"
              rules={[
                { required: true, message: 'Ingrese el precio' },
                { type: 'number', min: 0, message: 'El precio debe ser mayor o igual a 0' },
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                step={0.01}
                precision={2}
                formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value) => (value ? Number(value.replace(/\$\s?|(,*)/g, '')) : 0) as any}
                placeholder="0.00"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Duración (minutos)"
              name="duracionMinutos"
              rules={[
                { required: true, message: 'Ingrese la duración' },
                { type: 'number', min: 5, message: 'Mínimo 5 minutos' },
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={5}
                step={15}
                placeholder="60"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Activo"
              name="esActivo"
              valuePropName="checked"
            >
              <Switch 
                checkedChildren="Sí" 
                unCheckedChildren="No" 
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Requiere Repuestos"
              name="requiereRepuestos"
              valuePropName="checked"
              help="¿Este servicio necesita repuestos?"
            >
              <Switch 
                checkedChildren="Sí" 
                unCheckedChildren="No" 
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="Observaciones"
          name="observaciones"
          rules={[{ max: 500, message: 'Máximo 500 caracteres' }]}
        >
          <TextArea
            rows={2}
            placeholder="Notas adicionales o instrucciones especiales"
            maxLength={500}
            showCount
          />
        </Form.Item>

        <Button type="primary" htmlType="submit" block size="large">
          {initialValues ? 'Actualizar Servicio' : 'Crear Servicio'}
        </Button>
      </Form>
    </Card>
  );
}