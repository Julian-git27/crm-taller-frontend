'use client';

import {
  Form,
  Input,
  InputNumber,
  Button,
  Card,
  Select,
} from 'antd';
import { useEffect } from 'react';

const { Option } = Select;

export default function ProductoForm({
  initialValues,
  onSubmit,
}: {
  initialValues?: any;
  onSubmit: (values: any) => void;
}) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (initialValues) {
      // Asegurarse de que los valores numéricos sean números
      form.setFieldsValue({
        ...initialValues,
        precio: initialValues.precio ? Number(initialValues.precio) : 0,
        stock: initialValues.stock ? Number(initialValues.stock) : 0,
        stock_minimo: initialValues.stock_minimo ? Number(initialValues.stock_minimo) : 5,
      });
    } else {
      form.resetFields();
    }
  }, [initialValues, form]);

  const onFinish = (values: any) => {
    // Convertir valores numéricos y limpiar datos
    const cleanedValues = {
      nombre: values.nombre?.trim(),
      referencia: values.referencia?.trim() || null, // ✅ Esto es lo que faltaba
      categoria: values.categoria?.trim() || null,
      precio: Number(values.precio || 0),
      stock: Number(values.stock || 0),
      stock_minimo: Number(values.stock_minimo || 5),
    };
    
    onSubmit(cleanedValues);
  };

  return (
    <Card bordered={false}>
      <Form
        layout="vertical"
        form={form}
        initialValues={{
          stock_minimo: 5,
          ...initialValues
        }}
        onFinish={onFinish}
      >
        <Form.Item
          label="Código/Referencia"
          name="referencia"
          rules={[
            { max: 50, message: 'Máximo 50 caracteres' },
          ]}
          help="Código único del producto (SKU, código de barras)"
        >
          <Input placeholder="Ej: PROD-001, SKU12345" />
        </Form.Item>

        <Form.Item
          label="Nombre del Producto"
          name="nombre"
          rules={[
            { required: true, message: 'El nombre es obligatorio' },
            { min: 3, message: 'Mínimo 3 caracteres' },
            { max: 100, message: 'Máximo 100 caracteres' },
          ]}
        >
          <Input placeholder="Ej: Aceite 20W50, Filtro de Aire, Pastillas de Freno" />
        </Form.Item>

        <Form.Item
          label="Categoría"
          name="categoria"
          rules={[{ max: 50, message: 'Máximo 50 caracteres' }]}
        >
          <Select placeholder="Seleccione una categoría" allowClear>
            <Option value="LUBRICANTES">Lubricantes</Option>
            <Option value="FILTROS">Filtros</Option>
            <Option value="FRENOS">Frenos</Option>
            <Option value="MOTOR">Motor</Option>
            <Option value="ELECTRICO">Eléctrico</Option>
            <Option value="SUSPENSION">Suspensión</Option>
            <Option value="TRANSMISION">Transmisión</Option>
            <Option value="HERRAMIENTAS">Herramientas</Option>
            <Option value="OTROS">Otros</Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="Precio"
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

        <Form.Item
          label="Stock Disponible"
          name="stock"
          rules={[
            { required: true, message: 'Ingrese el stock' },
            { type: 'number', min: 0, message: 'El stock debe ser mayor o igual a 0' },
          ]}
        >
          <InputNumber
            style={{ width: '100%' }}
            min={0}
            placeholder="0"
          />
        </Form.Item>

        <Form.Item
          label="Stock Mínimo (alerta)"
          name="stock_minimo"
          rules={[
            { type: 'number', min: 0, message: 'El stock mínimo debe ser mayor o igual a 0' },
          ]}
          help="Recibirás alertas cuando el stock baje de este nivel"
        >
          <InputNumber
            style={{ width: '100%' }}
            min={0}
            placeholder="5"
          />
        </Form.Item>

        <Button type="primary" htmlType="submit" block size="large">
          {initialValues ? 'Actualizar Producto' : 'Crear Producto'}
        </Button>
      </Form>
    </Card>
  );
}