'use client';

import { Form, Input, Button, Card, Switch, message, Row, Col, Space, Alert, Tabs } from 'antd';
import { useEffect, useState } from 'react';

const { TextArea } = Input;
const { Password } = Input;

export default function MecanicoForm({
  initialValues,
  onSubmit,
}: {
  initialValues?: any;
  onSubmit: (values: any) => void;
}) {
  const [form] = Form.useForm();
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [activeTab, setActiveTab] = useState('datos');
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [hasUsuario, setHasUsuario] = useState(false);

  useEffect(() => {
    if (initialValues) {
      console.log('Initial values recibidos:', initialValues); // Para debug
      
      const formValues = {
        ...initialValues,
        // Extraer el username si existe el objeto usuario
        username: initialValues.usuario?.usuario || initialValues.usuario?.username || '',
      };
      
      console.log('Valores para el formulario:', formValues); // Para debug
      
      form.setFieldsValue(formValues);
      
      // Verificar si ya tiene usuario creado
      const tieneUsuario = !!(initialValues.usuario?.usuario || initialValues.usuario?.username);
      setHasUsuario(tieneUsuario);
      setShowPasswordFields(!tieneUsuario);
    } else {
      form.resetFields();
      setShowPasswordFields(true); // Mostrar para nuevo mecánico
      setHasUsuario(false);
    }
  }, [initialValues, form]);

  const onFinish = async (values: any) => {
    try {
      console.log('Valores del formulario:', values); // Para debug
      
      // Limpiar valores
      const cleanedValues = {
        ...values,
        telefono: values.telefono?.trim() || null,
        email: values.email?.trim() || null,
        direccion: values.direccion?.trim() || null,
        observaciones: values.observaciones?.trim() || null,
        especialidad: values.especialidad?.trim() || null,
      };

      // Si es edición y ya tiene usuario, pero dejamos el username vacío, usar el actual
      if (initialValues?.usuario && (!cleanedValues.username || cleanedValues.username.trim() === '')) {
        cleanedValues.username = initialValues.usuario.usuario || initialValues.usuario.username;
      }

      // Si es edición y NO estamos editando la contraseña, eliminar campos de contraseña
      if (initialValues && !isEditingPassword && !cleanedValues.password) {
        delete cleanedValues.password;
        delete cleanedValues.confirmPassword;
      }

      console.log('Valores limpios para enviar:', cleanedValues); // Para debug
      
      await onSubmit(cleanedValues);
    } catch (error) {
      console.error('Error en formulario:', error);
      message.error('Error al procesar el formulario');
    }
  };

  const validatePassword = (_: any, value: string) => {
    if (!value) {
      return Promise.resolve(); // Contraseña vacía es válida (no cambiar)
    }
    if (value.length < 6) {
      return Promise.reject(new Error('La contraseña debe tener al menos 6 caracteres'));
    }
    return Promise.resolve();
  };

  const validateConfirmPassword = ({ getFieldValue }: any) => ({
    validator(_: any, value: string) {
      const password = getFieldValue('password');
      // Si hay contraseña, validar que coincidan
      if (password && password !== value) {
        return Promise.reject(new Error('Las contraseñas no coinciden'));
      }
      return Promise.resolve();
    },
  });

  const handleEditPassword = () => {
    setIsEditingPassword(true);
    form.setFieldsValue({
      password: '',
      confirmPassword: '',
    });
  };

  const handleCancelEditPassword = () => {
    setIsEditingPassword(false);
    form.setFieldsValue({
      password: undefined,
      confirmPassword: undefined,
    });
  };

  // Obtener el nombre de usuario actual
  const getCurrentUsername = () => {
    if (!initialValues?.usuario) return '';
    return initialValues.usuario.usuario || initialValues.usuario.username || '';
  };

  return (
    <Card bordered={false}>
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        items={[
          {
            key: 'datos',
            label: 'Datos Personales',
            children: (
              <Form
                layout="vertical"
                form={form}
                initialValues={{
                  activo: true,
                  ...initialValues
                }}
                onFinish={onFinish}
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      label="Nombre Completo"
                      name="nombre"
                      rules={[
                        { required: true, message: 'El nombre es obligatorio' },
                        { min: 3, message: 'Mínimo 3 caracteres' },
                        { max: 100, message: 'Máximo 100 caracteres' },
                      ]}
                    >
                      <Input placeholder="Ej: Carlos Andrés Ramírez López" />
                    </Form.Item>
                  </Col>
                  
                  <Col span={12}>
                    <Form.Item
                      label="Especialidad"
                      name="especialidad"
                      rules={[{ max: 100, message: 'Máximo 100 caracteres' }]}
                    >
                      <Input placeholder="Ej: Frenos, Motor, Transmisión, Eléctrico" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      label="Teléfono"
                      name="telefono"
                      rules={[
                        { max: 20, message: 'Máximo 20 caracteres' },
                        {
                          pattern: /^[0-9\s\+\-\(\)]*$/,
                          message: 'Solo números, espacios, +, -, (,) permitidos'
                        }
                      ]}
                      normalize={(value) => value?.trim()}
                    >
                      <Input placeholder="Ej: 300 123 4567 o +57 300 123 4567" />
                    </Form.Item>
                  </Col>
                  
                  <Col span={12}>
                    <Form.Item
                      label="Email"
                      name="email"
                      rules={[
                        { type: 'email', message: 'Email inválido' },
                        { max: 100, message: 'Máximo 100 caracteres' }
                      ]}
                      normalize={(value) => value?.trim()}
                    >
                      <Input placeholder="Ej: mecanico@taller.com" />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  label="Dirección"
                  name="direccion"
                  rules={[{ max: 200, message: 'Máximo 200 caracteres' }]}
                  normalize={(value) => value?.trim()}
                >
                  <Input placeholder="Ej: Calle 123 #45-67, Ciudad" />
                </Form.Item>

                <Form.Item
                  label="Observaciones"
                  name="observaciones"
                  rules={[{ max: 500, message: 'Máximo 500 caracteres' }]}
                  normalize={(value) => value?.trim()}
                >
                  <TextArea 
                    rows={3} 
                    placeholder="Notas adicionales sobre el mecánico..." 
                  />
                </Form.Item>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      label="Estado"
                      name="activo"
                      valuePropName="checked"
                    >
                      <Switch 
                        checkedChildren="Activo" 
                        unCheckedChildren="Inactivo" 
                      />
                    </Form.Item>
                  </Col>
                  
                 
                </Row>
              </Form>
            ),
          },
          {
            key: 'usuario',
            label: 'Cuenta de Usuario',
            children: (
              <Form
                layout="vertical"
                form={form}
                onFinish={onFinish}
              >
                {hasUsuario ? (
                  <>
                    <Alert
                      message="Información actual del usuario"
                      description={
                        <div>
                          <p><strong>Usuario actual:</strong> {getCurrentUsername()}</p>
                          <p><strong>Rol:</strong> {initialValues.usuario.rol || 'MECANICO'}</p>
                          <p><strong>Estado:</strong> {initialValues.usuario.activo ? 'Activo' : 'Inactivo'}</p>
                        </div>
                      }
                      type="info"
                      showIcon
                      style={{ marginBottom: 16 }}
                    />

                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item
                          label="Nuevo nombre de usuario"
                          name="username"
                          rules={[
                            { required: false },
                            { min: 3, message: 'Mínimo 3 caracteres' },
                            { max: 50, message: 'Máximo 50 caracteres' },
                            {
                              pattern: /^[a-zA-Z0-9_]+$/,
                              message: 'Solo letras, números y guión bajo'
                            }
                          ]}
                          normalize={(value) => value?.trim()}
                          extra="Dejar vacío para mantener el actual"
                        >
                          <Input 
                            placeholder={getCurrentUsername()}
                            defaultValue={getCurrentUsername()}
                          />
                        </Form.Item>
                      </Col>
                    </Row>

                    {!isEditingPassword ? (
                      <Form.Item>
                        <Space>
                          <Button 
                            type="primary" 
                            onClick={handleEditPassword}
                          >
                            Cambiar Contraseña
                          </Button>
                          <Button 
                            type="default"
                            onClick={() => setActiveTab('datos')}
                          >
                            ← Volver a datos
                          </Button>
                        </Space>
                      </Form.Item>
                    ) : (
                      <>
                        <Alert
                          message="Cambiar contraseña"
                          description="Ingrese la nueva contraseña. Dejar vacío para mantener la actual."
                          type="warning"
                          showIcon
                          style={{ marginBottom: 16 }}
                        />
                        
                        <Row gutter={16}>
                          <Col span={12}>
                            <Form.Item
                              label="Nueva contraseña"
                              name="password"
                              rules={[
                                { required: false },
                                { validator: validatePassword }
                              ]}
                            >
                              <Password 
                                placeholder="Dejar vacío para no cambiar" 
                              />
                            </Form.Item>
                          </Col>
                          
                          <Col span={12}>
                            <Form.Item
                              label="Confirmar contraseña"
                              name="confirmPassword"
                              dependencies={['password']}
                              rules={[
                                { required: false },
                                validateConfirmPassword
                              ]}
                            >
                              <Password 
                                placeholder="Repita la nueva contraseña" 
                              />
                            </Form.Item>
                          </Col>
                        </Row>

                        <Form.Item>
                          <Space>
                            <Button 
                              type="default" 
                              onClick={handleCancelEditPassword}
                            >
                              Cancelar cambio
                            </Button>
                            <Button 
                              type="primary" 
                              onClick={() => {
                                // Validar contraseñas si se ingresaron
                                const password = form.getFieldValue('password');
                                const confirmPassword = form.getFieldValue('confirmPassword');
                                
                                if (password && password !== confirmPassword) {
                                  message.error('Las contraseñas no coinciden');
                                  return;
                                }
                                
                                form.submit();
                              }}
                            >
                              Guardar cambios
                            </Button>
                            <Button 
                              type="default"
                              onClick={() => setActiveTab('datos')}
                            >
                              ← Volver a datos
                            </Button>
                          </Space>
                        </Form.Item>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <Alert
                      message="Crear cuenta de usuario"
                      description="Configure los datos de acceso para el mecánico"
                      type="info"
                      showIcon
                      style={{ marginBottom: 16 }}
                    />
                    
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item
                          label="Nombre de usuario"
                          name="username"
                          rules={[
                            { required: true, message: 'El usuario es obligatorio' },
                            { min: 3, message: 'Mínimo 3 caracteres' },
                            { max: 50, message: 'Máximo 50 caracteres' },
                            {
                              pattern: /^[a-zA-Z0-9_]+$/,
                              message: 'Solo letras, números y guión bajo'
                            }
                          ]}
                          normalize={(value) => value?.trim()}
                        >
                          <Input placeholder="Ej: carlos.mecanico" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item
                          label="Contraseña"
                          name="password"
                          rules={[
                            { required: true, message: 'La contraseña es obligatoria' },
                            { validator: validatePassword }
                          ]}
                        >
                          <Password placeholder="Mínimo 6 caracteres" />
                        </Form.Item>
                      </Col>
                      
                      <Col span={12}>
                        <Form.Item
                          label="Confirmar contraseña"
                          name="confirmPassword"
                          dependencies={['password']}
                          rules={[
                            { required: true, message: 'Confirme la contraseña' },
                            validateConfirmPassword
                          ]}
                        >
                          <Password placeholder="Repita la contraseña" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Form.Item>
                      <Space>
                        <Button 
                          type="primary" 
                          onClick={() => form.submit()}
                        >
                          Crear Usuario
                        </Button>
                        <Button 
                          type="default"
                          onClick={() => setActiveTab('datos')}
                        >
                          ← Volver a datos
                        </Button>
                      </Space>
                    </Form.Item>
                  </>
                )}
              </Form>
            ),
          },
        ]}
      />

      <div style={{ textAlign: 'right', marginTop: 16 }}>
        <Button 
          type="primary" 
          size="large"
          onClick={() => form.submit()}
        >
          {initialValues ? 'Actualizar Mecánico' : 'Crear Mecánico'}
        </Button>
      </div>
    </Card>
  );
}