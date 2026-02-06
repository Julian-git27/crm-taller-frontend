// components/EnviarFacturaCorreoModal.tsx
import { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Button,
  Space,
  message,
  Typography,
  Card,
  Row,
  Col,
  Tag,
  Divider,
  Alert,
} from 'antd';
import { 
  MailOutlined, 
  UserOutlined, 
  EditOutlined, 
  SendOutlined,
  FilePdfOutlined,
  ReloadOutlined 
} from '@ant-design/icons';

const { TextArea } = Input;
const { Title, Text } = Typography;

interface EnviarFacturaCorreoModalProps {
  visible: boolean;
  onCancel: () => void;
  factura: any;
  onEnviar: (datos: {
    email: string;
    asunto: string;
    mensaje: string;
    copia?: string;
    pdfBase64?: string;
  }) => Promise<void>;
}

export default function EnviarFacturaCorreoModal({
  visible,
  onCancel,
  factura,
  onEnviar,
}: EnviarFacturaCorreoModalProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [mensajeEditado, setMensajeEditado] = useState(false);
  const [pdfBase64, setPdfBase64] = useState<string>('');

  // Plantilla base del correo
  const generarPlantilla = () => {
  if (!factura) return '';

  const fecha = new Date(factura.fecha || new Date());
  const fechaFormateada = fecha.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const estadoPago =
    factura.estado_pago === 'PAGA'
      ? '✅ PAGADA'
      : '⌛ PENDIENTE DE PAGO';

  return `
Estimado/a ${factura.cliente?.nombre || 'Cliente'},

Reciba un cordial saludo. Por medio del presente le hacemos llegar su factura correspondiente a los servicios y/o productos prestados en nuestro taller.

━━━━━━━━━━━━━━━━━━━━━━
📄 DATOS DE LA FACTURA
━━━━━━━━━━━━━━━━━━━━━━
• Número: ${factura.id}
• Fecha: ${fechaFormateada}
• Total: $${Number(factura.total || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
• Estado: ${estadoPago}
• Método de pago: ${factura.metodo_pago || 'No especificado'}

━━━━━━━━━━━━━━━━━━━━━━
👤 DATOS DEL CLIENTE
━━━━━━━━━━━━━━━━━━━━━━
• Nombre: ${factura.cliente?.nombre || 'N/A'}
${factura.cliente?.telefono ? `• Teléfono: ${factura.cliente.telefono}\n` : ''}${factura.cliente?.direccion ? `• Dirección: ${factura.cliente.direccion}\n` : ''}

━━━━━━━━━━━━━━━━━━━━━━
🚗 VEHÍCULO
━━━━━━━━━━━━━━━━━━━━━━
• ${factura.vehiculo?.placa || factura.orden?.vehiculo?.placa || 'No especificado'}

El archivo PDF adjunto contiene el detalle completo de los trabajos realizados, productos utilizados y valores correspondientes.

━━━━━━━━━━━━━━━━━━━━━━
💳 INFORMACIÓN DE PAGO
━━━━━━━━━━━━━━━━━━━━━━
• El pago puede realizarse directamente en nuestras instalaciones
• Medios aceptados: ${factura.metodo_pago || 'Efectivo, tarjeta de crédito/débito, transferencia'}
• Horario de atención: Lunes a Viernes de 8:00 a 18:00

Si tiene alguna inquietud, requiere una aclaración o desea confirmar su pago, estaremos atentos a atenderle.

Cordialmente,

Taller Mecánico Automotriz
Equipo de Facturación

──────────────────────
Este es un mensaje automático generado por nuestro sistema.
Por favor, no responda a este correo.
Para soporte o asistencia, comuníquese directamente con el taller.
`.trim();
};


  // Cargar PDF cuando se abre el modal
  useEffect(() => {
    if (visible && factura) {
      cargarPDF();
      
      form.setFieldsValue({
        email: factura.cliente?.email || '',
        asunto: `Factura #${factura.id} - Taller Mecánico Automotriz - ${new Date().toLocaleDateString('es-ES')}`,
        mensaje: generarPlantilla(),
        copia: '',
      });
      setMensajeEditado(false);
    }
  }, [visible, factura]);

  const cargarPDF = async () => {
    try {
      // Generar PDF (similar a tu función verDetalles)
      // Esto dependerá de cómo generas los PDFs actualmente
      const response = await fetch(`/api/facturas/${factura.id}/pdf`);
      const blob = await response.blob();
      const reader = new FileReader();
      
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setPdfBase64(base64.split(',')[1]); // Remover el prefijo data:application/pdf;base64,
      };
      
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('Error cargando PDF:', error);
      message.warning('No se pudo cargar el PDF, se enviará sin adjunto');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      
      await onEnviar({
        email: values.email,
        asunto: values.asunto,
        mensaje: values.mensaje,
        copia: values.copia || undefined,
        pdfBase64: pdfBase64 || undefined,
      });
      
      message.success('Correo enviado exitosamente');
      form.resetFields();
      onCancel();
    } catch (error) {
      console.error('Error al enviar:', error);
      message.error('Error al enviar el correo');
    } finally {
      setLoading(false);
    }
  };

  const handleMensajeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!mensajeEditado && e.target.value !== generarPlantilla()) {
      setMensajeEditado(true);
    }
  };

  const restaurarPlantilla = () => {
    form.setFieldValue('mensaje', generarPlantilla());
    setMensajeEditado(false);
    message.info('Plantilla restaurada');
  };

  const previewData = [
    { label: 'N° Factura', value: `#${factura?.id}` },
    { label: 'Fecha', value: new Date(factura?.fecha || new Date()).toLocaleDateString('es-ES') },
    { label: 'Cliente', value: factura?.cliente?.nombre || 'N/A' },
    { label: 'Total', value: `$${Number(factura?.total || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}` },
    { label: 'Estado', value: factura?.estado_pago === 'PAGA' ? 'Pagada' : 'Pendiente' },
    { label: 'Vehículo', value: factura?.orden?.vehiculo?.placa || factura?.orden?.vehiculo?.marca || 'N/A' },
  ];

  return (
    <Modal
      title={
        <Space>
          <MailOutlined style={{ color: '#1890ff' }} />
          <span style={{ fontSize: '18px', fontWeight: 500 }}>
            Enviar Factura por Correo
          </span>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={850}
      destroyOnClose
      style={{ top: 20 }}
    >
      <div style={{ marginBottom: 20 }}>
        <Alert
          message="Información importante"
          description="El PDF de la factura se adjuntará automáticamente al correo."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        
        <Card size="small" style={{ marginBottom: 16, borderLeft: '4px solid #1890ff' }}>
          <Row gutter={[16, 8]}>
            {previewData.map((item, index) => (
              <Col span={12} key={index}>
                <Space direction="vertical" size={0}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {item.label}
                  </Text>
                  <Text strong>
                    {item.value}
                  </Text>
                </Space>
              </Col>
            ))}
          </Row>
        </Card>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="email"
              label="Correo Destinatario"
              rules={[
                { required: true, message: 'Ingrese el correo electrónico' },
                { type: 'email', message: 'Correo electrónico inválido' },
              ]}
              extra="El correo del cliente está pre-cargado si está registrado"
            >
              <Input
                placeholder="ejemplo@correo.com"
                prefix={<MailOutlined />}
                size="large"
                allowClear
              />
            </Form.Item>
          </Col>
          
          <Col span={12}>
            <Form.Item
              name="copia"
              label="Copia (CC - Opcional)"
              extra="Para enviar copia a otra persona"
            >
              <Input
                placeholder="copia@correo.com"
                prefix={<MailOutlined />}
                size="large"
                allowClear
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="asunto"
          label="Asunto del Correo"
          rules={[{ required: true, message: 'Ingrese el asunto' }]}
          extra="El asunto aparece en la bandeja de entrada"
        >
          <Input
            placeholder="Asunto del correo..."
            size="large"
            allowClear
          />
        </Form.Item>

        <Form.Item
          name="mensaje"
          label={
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <span>Mensaje del Correo</span>
              {mensajeEditado && (
                <Button
                  type="link"
                  size="small"
                  icon={<ReloadOutlined />}
                  onClick={restaurarPlantilla}
                  style={{ fontSize: '12px' }}
                >
                  Restaurar plantilla original
                </Button>
              )}
            </Space>
          }
          rules={[{ required: true, message: 'Ingrese el mensaje' }]}
          extra="Puede personalizar el mensaje según sea necesario"
        >
          <TextArea
            rows={14}
            placeholder="Escriba el mensaje del correo..."
            onChange={handleMensajeChange}
            style={{ 
              fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
              whiteSpace: 'pre-wrap',
              fontSize: '14px',
              lineHeight: '1.6'
            }}
            allowClear
          />
        </Form.Item>

        <Divider />

        <Card 
          title={
            <Space>
              <FilePdfOutlined style={{ color: '#e10600' }} />
              <span>Archivo Adjunto</span>
            </Space>
          }
          size="small"
          style={{ marginBottom: 16 }}
        >
          <Row align="middle" gutter={16}>
            <Col>
              <FilePdfOutlined style={{ fontSize: '32px', color: '#e10600' }} />
            </Col>
            <Col flex="auto">
              <Space direction="vertical" size={0}>
                <Text strong>factura-{factura?.id}.pdf</Text>
                <Text type="secondary">Documento PDF • Se adjuntará automáticamente</Text>
                {pdfBase64 && (
                  <Text type="success" style={{ fontSize: '12px' }}>
                    ✅ PDF cargado correctamente
                  </Text>
                )}
              </Space>
            </Col>
            <Col>
              <Button
                type="link"
                icon={<ReloadOutlined />}
                onClick={cargarPDF}
                loading={loading}
              >
                Regenerar PDF
              </Button>
            </Col>
          </Row>
        </Card>

        <Form.Item style={{ marginBottom: 0 }}>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button 
              onClick={onCancel} 
              disabled={loading}
              size="large"
            >
              Cancelar
            </Button>
            <Button
              type="primary"
              icon={<SendOutlined />}
              htmlType="submit"
              loading={loading}
              size="large"
              style={{ minWidth: '150px' }}
            >
              {loading ? 'Enviando...' : 'Enviar Correo'}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}