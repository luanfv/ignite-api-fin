const express = require('express');
const { v4: uuidv4 } = require('uuid');

// Start service

const app = express();

app.use(express.json());

const customers = [];

// Middlewares

function verifyIfExistsAccountCPF(request, response, next) {
  const { cpf } = request.headers;

  const customer = customers.find((customer) => customer.cpf === cpf);

  if (!customer) {
    return response.status(404).json({ error: 'Customer not found!' });
  }

  request.customer = customer;

  return next();
}

// Functions

function getBalance(statement) {
  const balance = statement.reduce((acc, operation) => {
    switch (operation.type) {
      case 'credit':
        return acc + operation.amount;

      case 'debit':
        return acc - operation.amount;

      default:
        return 0;
    }
  }, 0);

  return balance;
}

// Routes

app.get('/account', verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;

  return response.json(customer);
});

app.get('/statement', verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;

  return response.json(customer.statement);
});

app.get('/statement/date', verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;
  const { date } = request.query;

  const dateFormat = new Date(`${date} 00:00`);

  const statement = customer.statement.filter((statement) =>
    statement.created_at.toDateString() === new Date(dateFormat).toDateString()
  );

  return response.json(statement);
});

app.get('/balance', verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;

  const balance = getBalance(customer.statement);

  return response.json(balance);
});

app.post('/account', (request, response) => {
  const { cpf, name } = request.body;

  const cpfExists = customers.find((customer) => customer.cpf === cpf);

  if (cpfExists) {
    return response.status(400).json({ error: 'CPF already exists!' });
  }

  const id = uuidv4();
  const account = {
    cpf,
    name,
    id,
    statement: [],
  };

  customers.push(account);

  return response.status(201).json(account);
});

app.post('/deposit', verifyIfExistsAccountCPF, (request, response) => {
  const { description, amount } = request.body;
  const { customer } = request;

  const stateOperation = {
    description,
    amount,
    created_at: new Date(),
    type: 'credit',
  };

  customer.statement.push(stateOperation);

  return response.status(201).json(stateOperation);
});

app.post('/withdraw', verifyIfExistsAccountCPF, (request, response) => {
  const { amount } = request.body;
  const { customer } = request;

  const balance = getBalance(customer.statement);

  if (balance < amount) {
    return response.status(400).json({ error: 'Insufficient funds!' });
  }

  const stateOperation = {
    amount,
    created_at: new Date(),
    type: 'debit',
  };

  customer.statement.push(stateOperation);

  return response.status(201).json(stateOperation);
});

app.put('/account', verifyIfExistsAccountCPF, (request, response) => {
  const { name } = request.body;
  const { customer } = request;

  customer.name = name;

  return response.status(201).json(name);
});

app.delete('/account', verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;

  customers.splice(customer, 1);

  return response.status(200).json(customers);
});

app.listen(3333);
