import swaggerJSDoc from 'swagger-jsdoc';

export const openapi = swaggerJSDoc({
  definition: {
    openapi: '3.0.3',
    info: { title: 'METRICAST API', version: '1.0.0', description: 'Under the Balete Restaurant business intelligence API.' },
    servers: [{ url: '/api/v1', description: 'Current API' }],
    components: {
      securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
      schemas: {
        Error: { type: 'object', properties: { error: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' } } } } },
        User: { type: 'object', required: ['id', 'email', 'role'], properties: { id: { type: 'string', format: 'uuid' }, email: { type: 'string', format: 'email' }, firstName: { type: 'string' }, lastName: { type: 'string' }, role: { type: 'string', enum: ['ADMINISTRATOR', 'MANAGER', 'STAFF'] }, isActive: { type: 'boolean' } } },
        Category: { type: 'object', properties: { id: { type: 'string', format: 'uuid' }, name: { type: 'string' }, sourceKey: { type: 'string' } } },
        Product: { type: 'object', properties: { id: { type: 'string', format: 'uuid' }, categoryId: { type: 'string', format: 'uuid' }, name: { type: 'string' }, sourceKey: { type: 'string' }, currentPrice: { type: 'number' } } },
        Customer: { type: 'object', properties: { id: { type: 'string', format: 'uuid' }, email: { type: 'string' }, phone: { type: 'string' } } },
        Transaction: { type: 'object', properties: { id: { type: 'string', format: 'uuid' }, sourceTransactionId: { type: 'string' }, invoiceNo: { type: 'string' }, occurredAt: { type: 'string', format: 'date-time' }, netSales: { type: 'number' } } },
        Payment: { type: 'object', properties: { id: { type: 'string', format: 'uuid' }, transactionId: { type: 'string', format: 'uuid' }, paymentMethod: { type: 'string' }, amount: { type: 'number' } } }
      }
    },
    paths: {
      '/auth/login': { post: { tags: ['Authentication'], summary: 'Login', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', format: 'email' }, password: { type: 'string', format: 'password' } } } } } }, responses: { '200': { description: 'Authenticated.' }, '401': { description: 'Invalid credentials.' } } } },
      '/auth/refresh': { post: { tags: ['Authentication'], summary: 'Rotate a refresh token', responses: { '200': { description: 'New token pair.' } } } },
      '/auth/logout': { post: { tags: ['Authentication'], summary: 'Revoke a refresh token', responses: { '204': { description: 'Revoked.' } } } },
      '/users': { get: { tags: ['Users'], security: [{ bearerAuth: [] }], responses: { '200': { description: 'Users.' } } }, post: { tags: ['Users'], security: [{ bearerAuth: [] }], responses: { '201': { description: 'User created.' } } } },
      '/users/{id}': { parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], get: { tags: ['Users'], security: [{ bearerAuth: [] }], responses: { '200': { description: 'User.' } } }, patch: { tags: ['Users'], security: [{ bearerAuth: [] }], responses: { '200': { description: 'Updated.' } } }, delete: { tags: ['Users'], security: [{ bearerAuth: [] }], responses: { '204': { description: 'Deactivated.' } } } },
      '/categories': { get: { tags: ['Categories'], security: [{ bearerAuth: [] }], responses: { '200': { description: 'Categories.' } } }, post: { tags: ['Categories'], security: [{ bearerAuth: [] }], responses: { '201': { description: 'Created.' } } } },
      '/categories/{id}': { parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], get: { tags: ['Categories'], security: [{ bearerAuth: [] }], responses: { '200': { description: 'Category.' } } }, patch: { tags: ['Categories'], security: [{ bearerAuth: [] }], responses: { '200': { description: 'Updated.' } } }, delete: { tags: ['Categories'], security: [{ bearerAuth: [] }], responses: { '204': { description: 'Deleted.' } } } },
      '/products': { get: { tags: ['Products'], security: [{ bearerAuth: [] }], responses: { '200': { description: 'Products.' } } }, post: { tags: ['Products'], security: [{ bearerAuth: [] }], responses: { '201': { description: 'Created.' } } } },
      '/products/{id}': { parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], get: { tags: ['Products'], security: [{ bearerAuth: [] }], responses: { '200': { description: 'Product.' } } }, patch: { tags: ['Products'], security: [{ bearerAuth: [] }], responses: { '200': { description: 'Updated.' } } }, delete: { tags: ['Products'], security: [{ bearerAuth: [] }], responses: { '204': { description: 'Deleted.' } } } },
      '/customers': { get: { tags: ['Customers'], security: [{ bearerAuth: [] }], responses: { '200': { description: 'Customers.' } } }, post: { tags: ['Customers'], security: [{ bearerAuth: [] }], responses: { '201': { description: 'Created.' } } } },
      '/customers/{id}': { parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], get: { tags: ['Customers'], security: [{ bearerAuth: [] }], responses: { '200': { description: 'Customer.' } } }, patch: { tags: ['Customers'], security: [{ bearerAuth: [] }], responses: { '200': { description: 'Updated.' } } }, delete: { tags: ['Customers'], security: [{ bearerAuth: [] }], responses: { '204': { description: 'Deleted.' } } } },
      '/transactions': { get: { tags: ['Transactions'], security: [{ bearerAuth: [] }], responses: { '200': { description: 'Transactions.' } } }, post: { tags: ['Transactions'], security: [{ bearerAuth: [] }], responses: { '201': { description: 'Created.' } } } },
      '/transactions/{id}': { parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], get: { tags: ['Transactions'], security: [{ bearerAuth: [] }], responses: { '200': { description: 'Transaction.' } } }, patch: { tags: ['Transactions'], security: [{ bearerAuth: [] }], responses: { '200': { description: 'Updated.' } } }, delete: { tags: ['Transactions'], security: [{ bearerAuth: [] }], responses: { '204': { description: 'Soft-deleted.' } } } },
      '/payments': { get: { tags: ['Payments'], security: [{ bearerAuth: [] }], responses: { '200': { description: 'Payments.' } } }, post: { tags: ['Payments'], security: [{ bearerAuth: [] }], responses: { '201': { description: 'Created.' } } } },
      '/payments/{id}': { parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], get: { tags: ['Payments'], security: [{ bearerAuth: [] }], responses: { '200': { description: 'Payment.' } } }, patch: { tags: ['Payments'], security: [{ bearerAuth: [] }], responses: { '200': { description: 'Updated.' } } }, delete: { tags: ['Payments'], security: [{ bearerAuth: [] }], responses: { '204': { description: 'Deleted.' } } } }
    }
  },
  apis: []
});
