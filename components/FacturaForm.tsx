'use client';

import { Form, Select, Button, Card, Descriptions, Divider, Alert, Tag, Radio, Space } from 'antd';
import { useState, useEffect } from 'react';

export default function FacturaForm({
  ordenes,
  onSubmit,
}: {
  ordenes: any[];
  onSubmit: (values: any) => void;
}) {
  const [form] = Form.useForm();
  const [ordenSeleccionada, setOrdenSeleccionada] = useState<any>(null);
  const [ordenesFiltradas, setOrdenesFiltradas] = useState<any[]>([]);
  const [estadoPagoInicial, setEstadoPagoInicial] = useState<'PAGA' | 'NO_PAGA'>('NO_PAGA');

  // Filtrar solo órdenes TERMINADAS (por si acaso)
  useEffect(() => {
    const terminadas = ordenes.filter(orden => orden.estado === 'TERMINADA');
    setOrdenesFiltradas(terminadas);
    
    if (terminadas.length === 0) {
      console.warn('No hay órdenes TERMINADAS disponibles para facturar');
    }
  }, [ordenes]);

  const onOrdenChange = (ordenId: number) => {
    const orden = ordenesFiltradas.find(o => o.id === ordenId);
    
    if (orden && orden.estado !== 'TERMINADA') {
      console.warn('Orden no está TERMINADA:', orden.estado);
      return;
    }
    
    setOrdenSeleccionada(orden);
    form.setFieldValue('ordenId', ordenId);
  };

  // Función segura para formatear fecha
  const formatDate = (dateValue: any): string => {
    if (!dateValue) return 'N/A';
    
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        return 'Fecha inválida';
      }
      
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Error';
    }
  };

  // Función segura para precios
  const formatPrice = (price: any): string => {
    if (price === null || price === undefined || price === '') {
      return '$0.00';
    }
    
    try {
      const num = Number(price);
      if (isNaN(num)) {
        return '$0.00';
      }
      
      return `$${num.toLocaleString('es-ES', { 
        minimumFractionDigits: 2,
        maximumFractionDigits: 2 
      })}`;
    } catch {
      return '$0.00';
    }
  };

  if (ordenesFiltradas.length === 0) {
    return (
      <Card bordered={false}>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Alert
            message="Sin órdenes disponibles"
            description="No hay órdenes con estado TERMINADA para facturar."
            type="warning"
            showIcon
          />
        </div>
      </Card>
    );
  }

  return (
    <Card bordered={false}>
      {ordenes.length !== ordenesFiltradas.length && (
        <Alert
          message={`Mostrando ${ordenesFiltradas.length} de ${ordenes.length} órdenes (solo TERMINADAS)`}
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      
      <Form
        layout="vertical"
        form={form}
        initialValues={{
          estado_pago: 'NO_PAGA'
        }}
        onFinish={(values) => {
          if (ordenSeleccionada) {
            onSubmit({
              ...values,
              total: ordenSeleccionada.total || 0,
              clienteId: ordenSeleccionada.cliente?.id,
              vehiculoId: ordenSeleccionada.vehiculo?.id,
            });
          }
        }}
      >
        <Form.Item
          label="Orden de Servicio"
          name="ordenId"
          rules={[{ required: true, message: 'Seleccione una orden' }]}
        >
          <Select 
            placeholder="Buscar orden TERMINADA..."
            onChange={onOrdenChange}
            showSearch
            filterOption={(input, option) => {
              const optionText = String(option?.children || '');
              return optionText.toLowerCase().indexOf(input.toLowerCase()) >= 0;
            }}
            optionFilterProp="children"
            size="large"
          >
            {ordenesFiltradas.map((o) => (
              <Select.Option key={o.id} value={o.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <strong>Orden #{o.id}</strong> - {o.vehiculo?.placa || 'Sin placa'}
                  </div>
                  <div>
                    <Tag color="green">TERMINADA</Tag>
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  Cliente: {o.cliente?.nombre || 'Sin cliente'} | Total: {formatPrice(o.total)}
                </div>
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {ordenSeleccionada && (
          <>
            <Divider>Detalles de la Orden</Divider>
            
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Cliente">
                {ordenSeleccionada.cliente?.nombre || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Vehículo">
                {ordenSeleccionada.vehiculo?.marca || ''} {ordenSeleccionada.vehiculo?.modelo || ''} - {ordenSeleccionada.vehiculo?.placa || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Mecánico">
                {ordenSeleccionada.mecanico?.nombre || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Estado">
                <Tag color="green">{ordenSeleccionada.estado}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Total Orden">
                <strong>{formatPrice(ordenSeleccionada.total)}</strong>
              </Descriptions.Item>
              <Descriptions.Item label="Fecha Orden">
                {formatDate(ordenSeleccionada.fecha_ingreso)}
              </Descriptions.Item>
              {ordenSeleccionada.observaciones && (
                <Descriptions.Item label="Observaciones">
                  {ordenSeleccionada.observaciones}
                </Descriptions.Item>
              )}
            </Descriptions>

            <div style={{ margin: '16px 0' }}>
              <strong>Detalles del servicio:</strong>
              {ordenSeleccionada.detalles?.length > 0 ? (
                <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                  {ordenSeleccionada.detalles.map((d: any, index: number) => (
                    <li key={index}>
                      {d.descripcion || 'Sin descripción'} - {formatPrice(d.precio_unitario)} x {d.cantidad || 1}
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ marginTop: 8, color: '#999', fontStyle: 'italic' }}>
                  No hay detalles de servicio
                </p>
              )}
            </div>
          </>
        )}

        <Form.Item
          label="Método de Pago"
          name="metodo_pago"
          rules={[{ required: true, message: 'Seleccione método de pago' }]}
        >
          <Select placeholder="Seleccione método de pago" size="large">
            <Select.Option value="EFECTIVO">💵 Efectivo</Select.Option>
            <Select.Option value="TARJETA_CREDITO">💳 Tarjeta de Crédito</Select.Option>
            <Select.Option value="TARJETA_DEBITO">💳 Tarjeta de Débito</Select.Option>
            <Select.Option value="TRANSFERENCIA">🏦 Transferencia Bancaria</Select.Option>
            <Select.Option value="CHEQUE">📄 Cheque</Select.Option>
            <Select.Option value="OTRO">📝 Otro</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="Estado de Pago Inicial"
          name="estado_pago"
          rules={[{ required: true, message: 'Seleccione estado de pago' }]}
        >
          <Radio.Group 
            onChange={(e) => setEstadoPagoInicial(e.target.value)}
            value={estadoPagoInicial}
            style={{ width: '100%' }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Radio value="NO_PAGA" style={{ width: '100%', padding: '12px', border: '1px solid #d9d9d9', borderRadius: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Tag color="red">NO PAGA</Tag>
                  <span style={{ color: '#666' }}>Factura pendiente de pago (recomendado)</span>
                </div>
              </Radio>
              <Radio value="PAGA" style={{ width: '100%', padding: '12px', border: '1px solid #d9d9d9', borderRadius: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Tag color="green">PAGA</Tag>
                  <span style={{ color: '#666' }}>Factura pagada al momento de creación</span>
                </div>
              </Radio>
            </Space>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          label="Notas adicionales (opcional)"
          name="notas"
        >
          <textarea 
            rows={3} 
            style={{ width: '100%', padding: '12px', border: '1px solid #d9d9d9', borderRadius: '6px' }}
            placeholder="Notas adicionales para la factura..."
          />
        </Form.Item>

        <Button 
          type="primary" 
          htmlType="submit" 
          block 
          size="large"
          disabled={!ordenSeleccionada}
          style={{ 
            height: '48px', 
            fontSize: '16px',
            background: estadoPagoInicial === 'PAGA' ? '#52c41a' : undefined,
            borderColor: estadoPagoInicial === 'PAGA' ? '#52c41a' : undefined
          }}
        >
          {estadoPagoInicial === 'PAGA' ? '✅ ' : '📄 '}
          {estadoPagoInicial === 'PAGA' ? 'Generar Factura Pagada' : 'Generar Factura'}
        </Button>
      </Form>
    </Card>
  );
}