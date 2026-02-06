'use client';

import { Form, Input } from 'antd';

export default function ClienteFormMini() {
  return (
    <>
      <Form.Item
        label="Nombre del Cliente"
        name={['clienteNuevo', 'nombre']}
        rules={[{ required: true, message: 'Ingrese el nombre' }]}
      >
        <Input />
      </Form.Item>

      <Form.Item
        label="Email"
        name={['clienteNuevo', 'email']}
        rules={[{ type: 'email', required: true }]}
      >
        <Input />
      </Form.Item>

      <Form.Item
        label="Teléfono"
        name={['clienteNuevo', 'telefono']}
      >
        <Input />
      </Form.Item>
    </>
  );
}
