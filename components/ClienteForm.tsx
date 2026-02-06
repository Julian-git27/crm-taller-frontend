'use client';

import { Form, Input, Button, Card, Row, Col, Select } from 'antd';
import { useEffect } from 'react';

const { Option } = Select;

const municipiosColombia = [
  'Medellín','Bello' , 'Bogotá', 'Cali', 'Barranquilla', 'Cartagena',
  'Cúcuta', 'Bucaramanga', 'Pereira', 'Santa Marta', 'Manizales',
  'Ibagué', 'Villavicencio', 'Pasto', 'Montería', 'Valledupar',
  'Neiva', 'Armenia', 'Sincelejo', 'Popayán', 'Tunja'
];

export default function ClienteForm({
  initialValues,
  onSubmit,
}: {
  initialValues?: any;
  onSubmit: (values: any) => void;
}) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue(initialValues);
    } else {
      form.resetFields();
    }
  }, [initialValues, form]);

  const onFinish = (values: any) => {
    const cleanedValues = {
      nombre: values.nombre?.trim(),
      identificacion: values.identificacion?.trim() || null,
      email: values.email?.trim(),
      telefono: values.telefono?.trim() || null,
      telefono2: values.telefono2?.trim() || null,
      direccion: values.direccion?.trim() || null,
      municipio: values.municipio || null,
    };
    
    onSubmit(cleanedValues);
  };

  return (
    <Card bordered={false} style={{ padding: '8px 0' }}>
      <Form
        layout="vertical"
        form={form}
        onFinish={onFinish}
        autoComplete="off"
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Nombre Completo"
              name="nombre"
              rules={[
                { required: true, message: 'Ingrese el nombre' },
                { min: 3, message: 'Mínimo 3 caracteres' },
              ]}
            >
              <Input 
                placeholder="Ej: Juan Pérez García" 
                size="middle"
              />
            </Form.Item>
          </Col>
          
          <Col span={12}>
            <Form.Item
              label="Identificación"
              name="identificacion"
              rules={[
                { required: true, message: 'Ingrese identificación' },
                { pattern: /^[0-9]{7,15}$/, message: 'Solo números, 7-15 dígitos' }
              ]}
              extra="NIT o Cédula"
            >
              <Input 
                placeholder="Ej: 1234567890" 
                size="middle"
                maxLength={15}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, message: 'Ingrese el email' },
                { type: 'email', message: 'Email inválido' },
              ]}
            >
              <Input 
                placeholder="correo@ejemplo.com" 
                size="middle"
                type="email"
              />
            </Form.Item>
          </Col>
          
          <Col span={12}>
            <Form.Item
              label="Municipio"
              name="municipio"
            >
              <Select
                placeholder="Seleccione municipio"
                allowClear
                showSearch
                filterOption={(input, option) =>
                  String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
              >
                {municipiosColombia.map(mun => (
                  <Option key={mun} value={mun} label={mun}>
                    {mun}
                  </Option>
                ))}
                <Option value="OTRO">Otro</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Teléfono Principal"
              name="telefono"
              rules={[
                { pattern: /^[0-9]{7,10}$/, message: 'Número inválido' }
              ]}
            >
              <Input 
                placeholder="3001234567" 
                size="middle"
                maxLength={10}
              />
            </Form.Item>
          </Col>
          
          <Col span={12}>
            <Form.Item
              label="Teléfono Secundario"
              name="telefono2"
              rules={[
                { pattern: /^[0-9]{7,10}$/, message: 'Número inválido' }
              ]}
            >
              <Input 
                placeholder="6012345678" 
                size="middle"
                maxLength={10}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="Dirección Completa"
          name="direccion"
          rules={[{ max: 200, message: 'Máximo 200 caracteres' }]}
          extra="Calle, carrera, número, barrio"
        >
          <Input.TextArea 
            rows={2} 
            placeholder="Ej: Calle 123 #45-67, Barrio El Poblado"
            maxLength={200}
            showCount
            style={{ resize: 'none' }}
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
          <Button 
            type="primary" 
            htmlType="submit" 
            block 
            size="large"
            style={{ height: '40px', fontWeight: 'bold' }}
          >
            {initialValues ? 'ACTUALIZAR CLIENTE' : 'CREAR CLIENTE'}
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}