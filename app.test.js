/* eslint-disable comma-dangle */
/* eslint-disable no-undef */
/* eslint-disable quotes */
/* eslint-disable linebreak-style */

const joi = require("joi");
const { jest, expect } = require("@jest/globals");
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");
const { v4 } = require("uuid");
const models = require("./models");
const { creditAccount, debitAccount } = require("./helpers/transactions");

dotenv.config();

describe("createUser", () => {});

// Creates a new user with valid username and password
it("should create a new user with valid username and password", async () => {
  // Arrange
  const username = "testuser";
  const password = "testpassword";

  // Act
  const result = await createUser(username, password);

  // Assert
  expect(result.success).toBe(true);
  expect(result.message).toBe("User account created");
});

// Hashes the password before storing it
it("should hash the password before storing it", () => {
  // Mock the necessary dependencies
  jest.mock("bcrypt");
  jest.mock("./models");

  // Set up the mock values
  const username = "testuser";
  const password = "testpassword";
  const hashedPassword = "hashedpassword";
  const user = { id: 1 };

  // Mock the bcrypt.hashSync function to return the hashed password
  bcrypt.hashSync.mockReturnValue(hashedPassword);

  // Mock the models.users.create function to return the user object
  models.users.create.mockResolvedValue(user);

  // Call the createUser function
  const result = createUser(username, password);

  // Check that the bcrypt.hashSync function was called with the correct arguments
  expect(bcrypt.hashSync).toHaveBeenCalledWith(password, expect.any(String));

  // Check that the models.users.create function was called with the correct arguments
  expect(models.users.create).toHaveBeenCalledWith(
    {
      username,
      password: hashedPassword,
    },
    {
      transaction: expect.any(Object),
    }
  );

  // Check that the result is as expected
  expect(result).toEqual({
    success: true,
    message: "User account created",
  });
});

// Creates a new account with a balance of 5000000 for the new user
it("should create a new account with a balance of 5000000", async () => {
  // Arrange
  const username = "testuser";
  const password = "testpassword";

  const mockTransaction = jest.fn();
  const mockFindOne = jest.fn().mockResolvedValue(null);
  const mockCreate = jest.fn().mockResolvedValue({ id: 1 });
  const mockHashSync = jest.fn().mockReturnValue("hashedPassword");
  const mockCommit = jest.fn();
  const mockRollback = jest.fn();

  models.sequelize = {
    transaction: jest.fn().mockReturnValue(mockTransaction),
  };

  models.users = {
    findOne: mockFindOne,
    create: mockCreate,
  };

  models.accounts = {
    create: jest.fn(),
  };

  bcrypt.hashSync = mockHashSync;

  mockTransaction.mockReturnValue({
    commit: mockCommit,
    rollback: mockRollback,
  });

  // Act
  const result = await createUser(username, password);

  // Assert
  expect(models.sequelize.transaction).toHaveBeenCalledTimes(1);
  expect(joi.object).toHaveBeenCalledWith({
    username: joi.string().required(),
    password: joi.string().required(),
  });
  expect(joi.object().validate).toHaveBeenCalledWith({ username, password });
  expect(mockFindOne).toHaveBeenCalledWith(
    { where: { username } },
    { transaction: mockTransaction }
  );
  expect(mockCreate).toHaveBeenCalledWith(
    {
      username,
      password: "hashedPassword",
    },
    { transaction: mockTransaction }
  );
  expect(models.accounts.create).toHaveBeenCalledWith(
    {
      user_id: 1,
      balance: 5000000,
    },
    { transaction: mockTransaction }
  );
  expect(mockCommit).toHaveBeenCalledTimes(1);
  expect(result).toEqual({
    success: true,
    message: "User account created",
  });
});

describe("deposit", () => {});

// Deposit amount to account successfully
it("should deposit amount to account successfully when valid account_id and amount are provided", async () => {
  // Mock the input values
  const account_id = 123;
  const amount = 100;

  // Mock the validation result
  const validation = {
    error: null,
  };
  const validateMock = jest.spyOn(joi, "object").mockReturnValueOnce(joi);
  validateMock.mockReturnValueOnce(validation);

  // Mock the creditAccount function
  const creditAccountMock = jest
    .spyOn(models, "creditAccount")
    .mockResolvedValueOnce({
      success: true,
      message: "deposit successful",
    });

  // Mock the transaction functions
  const transactionMock = jest
    .spyOn(models.sequelize, "transaction")
    .mockResolvedValueOnce({});

  // Call the deposit function
  const result = await deposit(account_id, amount);

  // Assertions
  expect(validateMock).toHaveBeenCalledWith({ account_id, amount });
  expect(creditAccountMock).toHaveBeenCalledWith({
    account_id,
    amount,
    purpose: "deposit",
    t: expect.any(Object),
  });
  expect(transactionMock).toHaveBeenCalled();
  expect(result).toEqual({
    success: true,
    message: "deposit successful",
  });
});

describe("withdraw", () => {});

// Withdrawal of valid amount from valid account
it("should withdraw valid amount from valid account", async () => {
  // Mock the necessary dependencies
  const mockDebitAccount = jest.fn().mockReturnValue({ success: true });
  const mockTransaction = jest
    .fn()
    .mockReturnValue({ commit: jest.fn(), rollback: jest.fn() });
  jest.mock("./helpers/transactions", () => ({
    debitAccount: mockDebitAccount,
  }));
  jest.mock("./models", () => ({
    sequelize: {
      transaction: mockTransaction,
    },
  }));

  // Call the withdraw function with valid account_id and amount
  const result = await withdraw(12345, 100);

  // Assertions
  expect(mockDebitAccount).toHaveBeenCalledWith({
    account_id: 12345,
    amount: 100,
    purpose: "withdrawal",
    t: expect.any(Object),
  });
  expect(mockTransaction).toHaveBeenCalled();
  expect(result).toEqual({
    success: true,
    message: "withdrawal successful",
  });
});

// Withdrawal of maximum amount from valid account
it("should withdraw maximum amount from valid account", async () => {
  // Mock the necessary dependencies
  const mockDebitAccount = jest.fn().mockReturnValue({ success: true });
  const mockTransaction = jest
    .fn()
    .mockReturnValue({ commit: jest.fn(), rollback: jest.fn() });
  jest.mock("./helpers/transactions", () => ({
    debitAccount: mockDebitAccount,
  }));
  jest.mock("./models", () => ({
    sequelize: {
      transaction: mockTransaction,
    },
  }));

  // Call the withdraw function
  const result = await withdraw(123, 1000);

  // Assertions
  expect(mockDebitAccount).toHaveBeenCalledWith({
    account_id: 123,
    amount: 1000,
    purpose: "withdrawal",
    t: expect.any(Object),
  });
  expect(mockTransaction).toHaveBeenCalled();
  expect(result).toEqual({
    success: true,
    message: "withdrawal successful",
  });
});

// Withdrawal of minimum amount from valid account
it("should withdraw minimum amount from valid account", async () => {
  // Mock the necessary dependencies
  const mockDebitAccount = jest.fn().mockReturnValue({ success: true });
  const mockTransaction = jest
    .fn()
    .mockReturnValue({ commit: jest.fn(), rollback: jest.fn() });
  jest.mock("./helpers/transactions", () => ({
    debitAccount: mockDebitAccount,
  }));
  jest.mock("./models", () => ({
    sequelize: {
      transaction: mockTransaction,
    },
  }));

  // Call the withdraw function
  const result = await withdraw(123, 1);

  // Assertions
  expect(mockDebitAccount).toHaveBeenCalledWith({
    account_id: 123,
    amount: 1,
    purpose: "withdrawal",
    t: expect.any(Object),
  });
  expect(mockTransaction).toHaveBeenCalled();
  expect(result).toEqual({
    success: true,
    message: "withdrawal successful",
  });
});

// Withdrawal of amount greater than account balance
it("should return an error message when withdrawing an amount greater than the account balance", async () => {
  // Mock the debitAccount function to return a failure result
  const debitAccountMock = jest
    .fn()
    .mockReturnValue({ success: false, error: "Insufficient funds" });
  jest.mock("./helpers/transactions", () => ({
    debitAccount: debitAccountMock,
  }));

  // Mock the models.sequelize.transaction function to return a transaction object
  const transactionMock = jest.fn().mockResolvedValue({});
  jest.mock("./models", () => ({
    sequelize: {
      transaction: transactionMock,
    },
  }));

  // Call the withdraw function with an account_id and an amount greater than the account balance
  const result = await withdraw(123, 1000);

  // Verify that the debitAccount function is called with the correct parameters
  expect(debitAccountMock).toHaveBeenCalledWith({
    account_id: 123,
    amount: 1000,
    purpose: "withdrawal",
    t: {},
  });

  // Verify that the transaction is rolled back
  expect(transactionMock).toHaveBeenCalledWith("rollback");

  // Verify that the result is a failure with the correct error message
  expect(result).toEqual({
    success: false,
    error: "Insufficient funds",
  });
});

// Rollback transaction on debit failure
it("should rollback transaction on debit failure", async () => {
  // Mock the debitAccount function to return a failure result
  const debitAccountMock = jest
    .fn()
    .mockReturnValue({ success: false, error: "debit failed" });
  jest.mock("./helpers/transactions", () => ({
    debitAccount: debitAccountMock,
  }));

  // Mock the sequelize transaction object
  const transactionMock = {
    rollback: jest.fn(),
    commit: jest.fn(),
  };
  const sequelizeMock = {
    transaction: jest.fn().mockResolvedValue(transactionMock),
  };
  jest.mock("./models", () => ({
    sequelize: sequelizeMock,
  }));

  // Call the withdraw function
  const result = await withdraw(1, 100);

  // Check if the debitAccount function was called with the correct parameters
  expect(debitAccountMock).toHaveBeenCalledWith({
    account_id: 1,
    amount: 100,
    purpose: "withdrawal",
    t: transactionMock,
  });

  // Check if the transaction.rollback method was called
  expect(transactionMock.rollback).toHaveBeenCalled();

  // Check if the result is as expected
  expect(result).toEqual({
    success: false,
    error: "debit failed",
  });
});

// Validate input schema
it("should return an error message when debitAccount is unsuccessful and transaction rollback is successful", async () => {
  const debitAccountMock = jest
    .spyOn(helpers, "debitAccount")
    .mockResolvedValue({ success: false, error: "insufficient funds" });
  const rollbackMock = jest
    .spyOn(models.sequelize, "transaction")
    .mockResolvedValue({
      commit: jest.fn().mockResolvedValue(),
      rollback: jest.fn().mockResolvedValue(),
    });
  const result = await withdraw(12345, 100);
  expect(result).toEqual({
    success: false,
    error: "insufficient funds",
  });
  debitAccountMock.mockRestore();
  rollbackMock.mockRestore();
});

describe("transfer", () => {});

// Transfer succeeds with valid input
it("should transfer funds successfully when given valid input", async () => {
  // Mock the necessary dependencies and setup the test data
  const sender_id = 1;
  const recipient_id = 2;
  const amount = 100;

  const schemaValidateMock = jest.spyOn(joi, "object").mockReturnValue({
    validate: jest.fn().mockReturnValue({ error: null }),
  });

  const hashArgumentsMock = jest
    .spyOn(hash, "hashArguments")
    .mockReturnValue("requestHash");

  const checkRedisHashMock = jest
    .spyOn(redis, "checkRedisHash")
    .mockResolvedValue({ success: true });

  const debitAccountMock = jest
    .spyOn(transactions, "debitAccount")
    .mockResolvedValue({ success: true });

  const creditAccountMock = jest
    .spyOn(transactions, "creditAccount")
    .mockResolvedValue({ success: true });

  const tCommitMock = jest
    .spyOn(models.sequelize, "transaction")
    .mockResolvedValue({ commit: jest.fn() });

  // Call the function under test
  const result = await transfer(sender_id, recipient_id, amount);

  // Assertions
  expect(schemaValidateMock).toHaveBeenCalledWith({
    sender_id,
    recipient_id,
    amount,
  });

  expect(hashArgumentsMock).toHaveBeenCalledWith(
    sender_id,
    recipient_id,
    amount
  );

  expect(checkRedisHashMock).toHaveBeenCalledWith(sender_id, "requestHash");

  expect(debitAccountMock).toHaveBeenCalledWith({
    amount,
    account_id: sender_id,
    purpose: "transfer",
    reference: expect.any(String),
    metadata: {
      recipient_id,
    },
    t: expect.any(Object),
  });

  expect(creditAccountMock).toHaveBeenCalledWith({
    amount,
    account_id: recipient_id,
    purpose: "transfer",
    reference: expect.any(String),
    metadata: {
      sender_id,
    },
    t: expect.any(Object),
  });

  expect(tCommitMock).toHaveBeenCalled();

  expect(result).toEqual({
    success: true,
    message: "transfer successful",
  });
});

// Transfer succeeds with minimum amount
it("should transfer successfully with minimum amount", async () => {
  // Mock the necessary dependencies and setup the test data
  const sender_id = 1;
  const recipient_id = 2;
  const amount = 1;

  const schemaValidateMock = jest.spyOn(joi, "object").mockReturnValue({
    validate: jest.fn().mockReturnValue({ error: null }),
  });

  const hashArgumentsMock = jest
    .spyOn(hash, "hashArguments")
    .mockReturnValue("requestHash");

  const checkRedisHashMock = jest
    .spyOn(redis, "checkRedisHash")
    .mockResolvedValue({ success: true });

  const debitAccountMock = jest
    .spyOn(transactions, "debitAccount")
    .mockResolvedValue({ success: true });

  const creditAccountMock = jest
    .spyOn(transactions, "creditAccount")
    .mockResolvedValue({ success: true });

  const tCommitMock = jest
    .spyOn(models.sequelize, "transaction")
    .mockResolvedValue({ commit: jest.fn() });

  // Call the function under test
  const result = await transfer(sender_id, recipient_id, amount);

  // Assertions
  expect(schemaValidateMock).toHaveBeenCalledWith({
    sender_id,
    recipient_id,
    amount,
  });

  expect(hashArgumentsMock).toHaveBeenCalledWith(
    sender_id,
    recipient_id,
    amount
  );

  expect(checkRedisHashMock).toHaveBeenCalledWith(sender_id, "requestHash");

  expect(debitAccountMock).toHaveBeenCalledWith({
    amount,
    account_id: sender_id,
    purpose: "transfer",
    reference: expect.any(String),
    metadata: {
      recipient_id,
    },
    t: expect.any(Object),
  });

  expect(creditAccountMock).toHaveBeenCalledWith({
    amount,
    account_id: recipient_id,
    purpose: "transfer",
    reference: expect.any(String),
    metadata: {
      sender_id,
    },
    t: expect.any(Object),
  });

  expect(tCommitMock).toHaveBeenCalled();

  expect(result).toEqual({
    success: true,
    message: "transfer successful",
  });
});

// Transfer succeeds with maximum amount
it("should transfer the maximum amount successfully", async () => {
  // Mock the necessary dependencies and setup the test data
  const sender_id = 1;
  const recipient_id = 2;
  const amount = Number.MAX_SAFE_INTEGER;

  const schemaValidateMock = jest.spyOn(joi, "object").mockReturnValue({
    validate: jest.fn().mockReturnValue({ error: null }),
  });

  const hashArgumentsMock = jest
    .spyOn(hash, "hashArguments")
    .mockReturnValue("hash");

  const checkRedisHashMock = jest
    .spyOn(redis, "checkRedisHash")
    .mockResolvedValue({ success: true });

  const debitAccountMock = jest
    .spyOn(transactions, "debitAccount")
    .mockResolvedValue({ success: true });

  const creditAccountMock = jest
    .spyOn(transactions, "creditAccount")
    .mockResolvedValue({ success: true });

  const sequelizeTransactionMock = jest
    .spyOn(models.sequelize, "transaction")
    .mockResolvedValue({});

  const tCommitMock = jest.fn();
  const tRollbackMock = jest.fn();
  const tMock = { commit: tCommitMock, rollback: tRollbackMock };

  // Call the function under test
  const result = await transfer(sender_id, recipient_id, amount);

  // Assertions
  expect(schemaValidateMock).toHaveBeenCalledWith({
    sender_id,
    recipient_id,
    amount,
  });

  expect(hashArgumentsMock).toHaveBeenCalledWith(
    sender_id,
    recipient_id,
    amount
  );

  expect(checkRedisHashMock).toHaveBeenCalledWith(sender_id, "hash");

  expect(sequelizeTransactionMock).toHaveBeenCalled();

  expect(debitAccountMock).toHaveBeenCalledWith({
    amount,
    account_id: sender_id,
    purpose: "transfer",
    reference: expect.any(String),
    metadata: {
      recipient_id,
    },
    t: expect.any(Object),
  });

  expect(creditAccountMock).toHaveBeenCalledWith({
    amount,
    account_id: recipient_id,
    purpose: "transfer",
    reference: expect.any(String),
    metadata: {
      sender_id,
    },
    t: expect.any(Object),
  });

  expect(tCommitMock).toHaveBeenCalled();

  expect(result).toEqual({
    success: true,
    message: "transfer successful",
  });
});

// Transfer rolls back transaction on failure
it("should rollback transaction on failure", async () => {
  // Mock the necessary dependencies and setup the test data
  const sender_id = 1;
  const recipient_id = 2;
  const amount = 100;

  const schemaValidateMock = jest.spyOn(joi, "object").mockReturnValue({
    validate: jest.fn().mockReturnValue({ error: null }),
  });

  const hashArgumentsMock = jest
    .spyOn(hash, "hashArguments")
    .mockReturnValue("requestHash");

  const checkRedisHashMock = jest
    .spyOn(redis, "checkRedisHash")
    .mockResolvedValue({ success: true });

  const debitAccountMock = jest
    .spyOn(transactions, "debitAccount")
    .mockResolvedValue({ success: false });

  const creditAccountMock = jest
    .spyOn(transactions, "creditAccount")
    .mockResolvedValue({ success: true });

  const sequelizeTransactionMock = jest
    .spyOn(models.sequelize, "transaction")
    .mockResolvedValue({});

  const tCommitMock = jest.fn();
  const tRollbackMock = jest.fn();
  const t = {
    commit: tCommitMock,
    rollback: tRollbackMock,
  };
  sequelizeTransactionMock.mockResolvedValue(t);

  // Call the transfer function
  const result = await transfer(sender_id, recipient_id, amount);

  // Assertions
  expect(schemaValidateMock).toHaveBeenCalledWith({
    sender_id,
    recipient_id,
    amount,
  });

  expect(hashArgumentsMock).toHaveBeenCalledWith(
    sender_id,
    recipient_id,
    amount
  );

  expect(checkRedisHashMock).toHaveBeenCalledWith(sender_id, "requestHash");

  expect(debitAccountMock).toHaveBeenCalledWith({
    amount,
    account_id: sender_id,
    purpose: "transfer",
    reference: expect.any(String),
    metadata: {
      recipient_id,
    },
    t,
  });

  expect(creditAccountMock).not.toHaveBeenCalled();

  expect(tRollbackMock).toHaveBeenCalled();

  expect(result).toEqual({
    success: false,
    error: "internal server error",
  });
});

// Transfer debits sender account correctly
it("should debit the sender account correctly when transferring funds", async () => {
  // Mock the necessary dependencies and setup the test data
  const sender_id = 1;
  const recipient_id = 2;
  const amount = 100;

  const schemaValidateMock = jest.spyOn(joi, "object").mockReturnValue({
    validate: jest.fn().mockReturnValue({ error: null }),
  });

  const hashArgumentsMock = jest
    .spyOn(hash, "hashArguments")
    .mockReturnValue("requestHash");

  const checkRedisHashMock = jest
    .spyOn(redis, "checkRedisHash")
    .mockResolvedValue({ success: true });

  const debitAccountMock = jest
    .spyOn(transactions, "debitAccount")
    .mockResolvedValue({ success: true });

  const creditAccountMock = jest
    .spyOn(transactions, "creditAccount")
    .mockResolvedValue({ success: true });

  const sequelizeTransactionMock = jest
    .spyOn(models.sequelize, "transaction")
    .mockResolvedValue({});

  // Call the transfer function
  const result = await transfer(sender_id, recipient_id, amount);

  // Assertions
  expect(schemaValidateMock).toHaveBeenCalledWith({
    sender_id,
    recipient_id,
    amount,
  });

  expect(hashArgumentsMock).toHaveBeenCalledWith(
    sender_id,
    recipient_id,
    amount
  );

  expect(checkRedisHashMock).toHaveBeenCalledWith(sender_id, "requestHash");

  expect(sequelizeTransactionMock).toHaveBeenCalled();

  expect(debitAccountMock).toHaveBeenCalledWith({
    amount,
    account_id: sender_id,
    purpose: "transfer",
    reference: expect.any(String),
    metadata: {
      recipient_id,
    },
    t: expect.any(Object),
  });

  expect(creditAccountMock).toHaveBeenCalledWith({
    amount,
    account_id: recipient_id,
    purpose: "transfer",
    reference: expect.any(String),
    metadata: {
      sender_id,
    },
    t: expect.any(Object),
  });

  expect(result).toEqual({
    success: true,
    message: "transfer successful",
  });
});

// Transfer credits recipient account correctly
it("should credit recipient account correctly when transfer is successful", async () => {
  // Mock the necessary dependencies and setup the test data
  const sender_id = 1;
  const recipient_id = 2;
  const amount = 100;

  const schemaValidateMock = jest.spyOn(joi, "object").mockReturnValue({
    validate: jest.fn().mockReturnValue({ error: null }),
  });

  const hashArgumentsMock = jest
    .spyOn(hash, "hashArguments")
    .mockReturnValue("requestHash");

  const checkRedisHashMock = jest
    .spyOn(redis, "checkRedisHash")
    .mockResolvedValue({ success: true });

  const debitAccountMock = jest
    .spyOn(transactions, "debitAccount")
    .mockResolvedValue({ success: true });

  const creditAccountMock = jest
    .spyOn(transactions, "creditAccount")
    .mockResolvedValue({ success: true });

  const sequelizeTransactionMock = jest
    .spyOn(models.sequelize, "transaction")
    .mockResolvedValue({});

  const tCommitMock = jest.fn();
  const tRollbackMock = jest.fn();

  const tMock = {
    commit: tCommitMock,
    rollback: tRollbackMock,
  };

  // Call the transfer function
  const result = await transfer(sender_id, recipient_id, amount);

  // Assertions
  expect(schemaValidateMock).toHaveBeenCalledWith({
    sender_id,
    recipient_id,
    amount,
  });

  expect(hashArgumentsMock).toHaveBeenCalledWith(
    sender_id,
    recipient_id,
    amount
  );

  expect(checkRedisHashMock).toHaveBeenCalledWith(sender_id, "requestHash");

  expect(sequelizeTransactionMock).toHaveBeenCalled();

  expect(debitAccountMock).toHaveBeenCalledWith({
    amount,
    account_id: sender_id,
    purpose: "transfer",
    reference: expect.any(String),
    metadata: {
      recipient_id,
    },
    t: expect.any(Object),
  });

  expect(creditAccountMock).toHaveBeenCalledWith({
    amount,
    account_id: recipient_id,
    purpose: "transfer",
    reference: expect.any(String),
    metadata: {
      sender_id,
    },
    t: expect.any(Object),
  });

  expect(tCommitMock).toHaveBeenCalled();

  expect(result).toEqual({
    success: true,
    message: "transfer successful",
  });
});

describe("reverse", () => {});

// Reverses a single debit transaction successfully
it("should reverse a single debit transaction successfully", async () => {
  // Mock the necessary dependencies
  const mockTransaction = {
    reference: "transaction_reference",
    amount: 100,
    account_id: "account_id",
    txn_type: "debit",
  };
  const mockTransactions = [mockTransaction];
  const mockReversalResult = {
    success: true,
    message: "Reversal successful",
  };

  models.transactions.findAll.mockResolvedValue(mockTransactions);
  creditAccount.mockResolvedValue(mockReversalResult);

  // Call the reverse function
  const result = await reverse("transaction_reference");

  // Assertions
  expect(models.transactions.findAll).toHaveBeenCalledWith(
    {
      where: { reference: "transaction_reference" },
    },
    { transaction: expect.any(Object) }
  );
  expect(creditAccount).toHaveBeenCalledWith({
    amount: 100,
    account_id: "account_id",
    metadata: {
      originalReference: "transaction_reference",
    },
    purpose: "reversal",
    reference: expect.any(String),
    t: expect.any(Object),
  });
  expect(result).toEqual(mockReversalResult);
});

// Reverses multiple transactions successfully
it("should reverse multiple transactions successfully", async () => {
  // Mock the necessary dependencies
  const mockTransaction = {
    reference: "transaction_reference",
    amount: 100,
    account_id: "account_id",
    txn_type: "debit",
  };
  const mockTransactions = [mockTransaction, mockTransaction];
  const mockReversalResult = [{ success: true }, { success: true }];

  models.transactions.findAll = jest.fn().mockResolvedValue(mockTransactions);
  creditAccount.mockResolvedValue({ success: true });
  debitAccount.mockResolvedValue({ success: true });
  Promise.all = jest.fn().mockResolvedValue(mockReversalResult);

  // Call the reverse function
  const result = await reverse("transaction_reference");

  // Assertions
  expect(models.transactions.findAll).toHaveBeenCalledWith(
    {
      where: { reference: "transaction_reference" },
    },
    { transaction: expect.any(Object) }
  );
  expect(creditAccount).toHaveBeenCalledTimes(2);
  expect(debitAccount).toHaveBeenCalledTimes(0);
  expect(Promise.all).toHaveBeenCalledWith([
    creditAccount({
      amount: 100,
      account_id: "account_id",
      metadata: {
        originalReference: "transaction_reference",
      },
      purpose: "reversal",
      reference: expect.any(String),
      t: expect.any(Object),
    }),
    creditAccount({
      amount: 100,
      account_id: "account_id",
      metadata: {
        originalReference: "transaction_reference",
      },
      purpose: "reversal",
      reference: expect.any(String),
      t: expect.any(Object),
    }),
  ]);
  expect(result).toEqual({
    success: true,
    message: "Reversal successful",
  });
});
