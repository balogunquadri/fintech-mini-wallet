/* eslint-disable comma-dangle */
/* eslint-disable no-undef */
/* eslint-disable quotes */
/* eslint-disable max-len */
/* eslint-disable linebreak-style */

const axios = require("axios").default;
const dotenv = require("dotenv");
const { creditAccount } = require("./helpers/transactions");
const {
  processInitialCardCharge,
  completeSuccessfulCharge,
  chargeCardWithAuthorization,
} = require("./card");
const models = require("./models");

dotenv.config();

const PAYSTACK_BASE_URL = "https://api.paystack.co/charge";

describe("processInitialCardCharge", () => {});

// eslint-disable-next-line max-len
// Returns an object with success, message, and data properties when chargeResult.data.status is 'success'
it("should return an object with success, message, and data properties when chargeResult.data.status is 'success'", () => {
  const chargeResult = {
    data: {
      status: "success",
      reference: "1234567890",
    },
  };

  const expectedResult = {
    success: true,
    message: chargeResult.data.status,
    data: {
      shouldCreditAccount: true,
      reference: chargeResult.data.reference,
    },
  };

  const result = processInitialCardCharge(chargeResult);

  expect(result).toEqual(expectedResult);
});

// Returns an object with success, message, and data properties when chargeResult.data.status is not 'success'
it("should return an object with success, message, and data properties when chargeResult.data.status is ! success", () => {
  const chargeResult = {
    data: {
      status: "failed",
      reference: "1234567890",
    },
  };

  const result = processInitialCardCharge(chargeResult);

  expect(result).toEqual({
    success: true,
    message: chargeResult.data.status,
    data: {
      shouldCreditAccount: false,
      reference: chargeResult.data.reference,
    },
  });
});

// Returns an object with success, message, and data properties when chargeResult is null or undefined
it("should return an object with success, message, and data properties when chargeResult is null or undefined", () => {
  const chargeResult = null;
  const expectedResult = {
    success: true,
    message: null,
    data: {
      shouldCreditAccount: false,
      reference: null,
    },
  };

  const result = processInitialCardCharge(chargeResult);

  expect(result).toEqual(expectedResult);
});

// Returns an object with success, message, and data properties when chargeResult.data is null or undefined
it("should return an object with success, message, and data properties when chargeResult.data is null or undefined", () => {
  const chargeResult = {
    data: null,
  };

  const result = processInitialCardCharge(chargeResult);

  expect(result).toEqual({
    success: true,
    message: null,
    data: {
      shouldCreditAccount: false,
      reference: null,
    },
  });
});

// Returns an object with success, message, and data properties when chargeResult.data.reference is null or undefined
it("should return an object with success, message, and data properties when chargeResult.data.reference is null or undefined", () => {
  const chargeResult = {
    data: {
      status: "success",
      reference: null,
    },
  };

  const result = processInitialCardCharge(chargeResult);

  expect(result).toEqual({
    success: true,
    message: chargeResult.data.status,
    data: {
      shouldCreditAccount: false,
      reference: chargeResult.data.reference,
    },
  });
});

// Returns an object with success, message, and data properties when chargeResult.data.status is not a string
it("should return an object with success, message, and data properties when chargeResult.data.status is not a string", () => {
  const chargeResult = {
    data: {
      status: 200,
      reference: "1234567890",
    },
  };

  const result = processInitialCardCharge(chargeResult);

  expect(result).toEqual({
    success: true,
    message: 200,
    data: {
      shouldCreditAccount: false,
      reference: "1234567890",
    },
  });
});

// Returns an object with success, message, and data properties when chargeResult.data.reference is not a string
it("should return an object with success, message, and data properties when chargeResult.data.reference is not a string", () => {
  const chargeResult = {
    data: {
      status: "success",
      reference: 12345,
    },
  };

  const result = processInitialCardCharge(chargeResult);

  expect(result).toEqual({
    success: true,
    message: chargeResult.data.status,
    data: {
      shouldCreditAccount: true,
      reference: chargeResult.data.reference,
    },
  });
});

describe("submitOtp", () => {});

// Successfully submit OTP and complete charge
it("should submit OTP and complete charge successfully", async () => {
  // Mock the necessary data
  const reference = "mock_reference";
  const otp = "123456";

  // Mock the transaction data
  const transaction = {
    external_reference: reference,
    last_response: "pending",
    account_id: "mock_account_id",
    amount: 1000,
  };
  models.card_transactions.findOne.mockResolvedValue(transaction);

  // Mock the successful charge response
  const chargeResponse = {
    data: {
      data: {
        status: "success",
        message: "Charge successful",
      },
    },
  };
  axios.post.mockResolvedValue(chargeResponse);

  // Mock the completeSuccessfulCharge function
  const creditResult = {
    success: true,
  };
  completeSuccessfulCharge.mockResolvedValue(creditResult);

  // Call the submitOtp function
  const result = await submitOtp({ reference, otp });

  // Assertions
  expect(models.card_transactions.findOne).toHaveBeenCalledWith({
    where: { external_reference: reference },
  });
  expect(axios.post).toHaveBeenCalledWith(
    `${PAYSTACK_BASE_URL}/submit_otp`,
    { reference, otp },
    {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    }
  );
  expect(completeSuccessfulCharge).toHaveBeenCalledWith({
    accountId: transaction.account_id,
    reference,
    amount: transaction.amount,
  });
  expect(result).toEqual({
    success: true,
    message: "Charge successful",
    shouldCreditAccount: true,
  });
});

// Return success message and shouldCreditAccount flag
it("should return success message and shouldCreditAccount flag when charge status is success", async () => {
  const reference = "1234567890";
  const otp = "123456";
  const transaction = {
    external_reference: reference,
    last_response: "pending",
    account_id: "account123",
    amount: 1000,
  };
  const chargeData = {
    data: {
      status: "success",
      message: "Charge successful",
    },
  };

  models.card_transactions.findOne.mockResolvedValueOnce(transaction);
  axios.post.mockResolvedValueOnce(chargeData);
  models.card_transactions.update.mockResolvedValueOnce();

  const result = await submitOtp({ reference, otp });

  expect(result).toEqual({
    success: true,
    message: "Charge successful",
    shouldCreditAccount: true,
  });
  expect(models.card_transactions.findOne).toHaveBeenCalledWith({
    where: { external_reference: reference },
  });
  expect(axios.post).toHaveBeenCalledWith(
    `${PAYSTACK_BASE_URL}/submit_otp`,
    {
      reference,
      otp,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    }
  );
  expect(models.card_transactions.update).toHaveBeenCalledWith(
    { last_response: "success" },
    { where: { external_reference: reference } }
  );
  expect(completeSuccessfulCharge).toHaveBeenCalledWith({
    accountId: transaction.account_id,
    reference,
    amount: transaction.amount,
  });
});

// Transaction not found
it("should return an error when the transaction is not found", async () => {
  // Arrange
  const reference = "1234567890";
  const otp = "123456";

  // Act
  const result = await submitOtp({ reference, otp });

  // Assert
  expect(result.success).toBe(false);
  expect(result.error).toBe("Transaction not found");
});

// Transaction already succeeded
it("should return an object with success as false and error as 'Transaction already succeeded' when the transaction has already succeeded", async () => {
  const reference = "1234567890";
  const otp = "123456";
  const transaction = {
    last_response: "success",
    account_id: "account123",
    amount: 1000,
  };
  models.card_transactions.findOne = jest.fn().mockResolvedValue(transaction);

  const result = await submitOtp({ reference, otp });

  expect(result).toEqual({
    success: false,
    error: "Transaction already succeeded",
  });
});

// Rollback transaction if creditAccount fails
it("should rollback transaction if creditAccount fails", async () => {
  const reference = "123456789";
  const otp = "123456";

  const mockTransaction = {
    account_id: "account123",
    amount: 1000,
    last_response: "pending",
  };

  const mockCharge = {
    data: {
      data: {
        status: "failed",
        message: "Charge failed",
      },
    },
  };

  models.card_transactions.findOne = jest
    .fn()
    .mockResolvedValue(mockTransaction);
  axios.post = jest.fn().mockResolvedValue(mockCharge);
  models.card_transactions.update = jest.fn();

  const result = await submitOtp({ reference, otp });

  expect(models.card_transactions.findOne).toHaveBeenCalledWith({
    where: { external_reference: reference },
  });
  expect(models.card_transactions.update).toHaveBeenCalledWith(
    { last_response: "failed" },
    { where: { external_reference: reference } }
  );
  expect(result).toEqual({
    success: true,
    message: "Charge failed",
    data: {
      shouldCreditAccount: false,
      reference,
    },
  });
});

// Pass metadata with external_reference to creditAccount
it("should pass metadata with external_reference to creditAccount when charge is successful", async () => {
  const reference = "123456789";
  const otp = "123456";

  const transaction = {
    account_id: "account123",
    external_reference: reference,
    amount: 1000,
    last_response: "pending",
  };

  const charge = {
    data: {
      data: {
        status: "success",
        message: "Charge successful",
      },
    },
  };

  const creditResult = {
    success: true,
    error: null,
  };

  models.card_transactions.findOne.mockResolvedValueOnce(transaction);
  axios.post.mockResolvedValueOnce(charge);
  models.card_transactions.update.mockResolvedValueOnce();
  creditAccount.mockResolvedValueOnce(creditResult);

  const result = await submitOtp({ reference, otp });

  expect(models.card_transactions.findOne).toHaveBeenCalledWith({
    where: { external_reference: reference },
  });
  expect(models.card_transactions.update).toHaveBeenCalledWith(
    { last_response: charge.data.data.status },
    { where: { external_reference: reference } }
  );
  expect(creditAccount).toHaveBeenCalledWith({
    account_id: transaction.account_id,
    amount: transaction.amount,
    purpose: "card_funding",
    t: expect.anything(),
    metadata: {
      external_reference: reference,
    },
  });
  expect(result).toEqual({
    success: true,
    message: "Charge successful",
    shouldCreditAccount: true,
  });
});

describe("submitPhone", () => {});

// Successfully submits phone number and completes charge
it("should submit phone number and complete charge when transaction is found and not already succeeded", async () => {
  // Mock the necessary dependencies and data
  const reference = "123456789";
  const phone = "1234567890";
  const transaction = {
    external_reference: reference,
    last_response: null,
    account_id: "account123",
    amount: 100,
  };
  const chargeData = {
    data: {
      status: "success",
      message: "Charge successful",
    },
  };

  models.card_transactions.findOne = jest.fn().mockResolvedValue(transaction);
  axios.post = jest.fn().mockResolvedValue(chargeData);
  models.card_transactions.update = jest.fn();

  // Call the function under test
  const result = await submitPhone({ reference, phone });

  // Assertions
  expect(models.card_transactions.findOne).toHaveBeenCalledWith({
    where: { external_reference: reference },
  });
  expect(models.card_transactions.update).toHaveBeenCalledWith(
    { last_response: "success" },
    { where: { external_reference: reference } }
  );
  expect(axios.post).toHaveBeenCalledWith(
    `${PAYSTACK_BASE_URL}/submit_phone`,
    { reference, phone },
    { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
  );
  expect(models.card_transactions.update).toHaveBeenCalledWith(
    { last_response: chargeData.data.status },
    { where: { external_reference: reference } }
  );
  expect(result).toEqual({
    success: true,
    message: "Charge successful",
    shouldCreditAccount: true,
  });
});

// Updates last_response field in database for unsuccessful charge
it("should update last_response field in database for unsuccessful charge", async () => {
  // Mock the necessary dependencies and data
  const reference = "123456789";
  const phone = "1234567890";
  const transaction = {
    last_response: "pending",
    account_id: "account123",
    amount: 100,
  };
  const chargeData = {
    data: {
      status: "failed",
      message: "Charge failed",
    },
  };
  const expectedUpdate = { last_response: "failed" };

  models.card_transactions.findOne.mockResolvedValue(transaction);
  axios.post.mockResolvedValue(chargeData);
  models.card_transactions.update.mockResolvedValue();

  // Call the function
  const result = await submitPhone({ reference, phone });

  // Check the result
  expect(models.card_transactions.findOne).toHaveBeenCalledWith({
    where: { external_reference: reference },
  });
  expect(models.card_transactions.update).toHaveBeenCalledWith(expectedUpdate, {
    where: { external_reference: reference },
  });
  expect(result).toEqual({
    success: true,
    message: chargeData.data.message,
    data: {
      shouldCreditAccount: false,
      reference,
    },
  });
});

// Sends correct authorization header with Paystack secret key
it("should send correct authorization header with Paystack secret key", async () => {
  const axiosPostSpy = jest.spyOn(axios, "post");
  const reference = "123456789";
  const phone = "1234567890";

  await submitPhone({ reference, phone });

  expect(axiosPostSpy).toHaveBeenCalledWith(
    `${PAYSTACK_BASE_URL}/submit_phone`,
    { reference, phone },
    {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    }
  );
});

// Uses Paystack API endpoint to submit phone number
it("should return error response if an error occurs", async () => {
  const reference = "123456789";
  const phone = "1234567890";

  const error = new Error("Internal Server Error");
  error.response = {
    data: {
      message: "Internal Server Error",
    },
  };

  models.card_transactions.findOne.mockRejectedValueOnce(error);

  const result = await submitPhone({ reference, phone });

  expect(result).toEqual(error.response.data);
});

describe("chargeCardWithAuthorization", () => {});

// Successfully charge a card with authorization code
it("should successfully charge a card with authorization code", async () => {
  const authorization = "1234567890";
  const chargeData = {
    authorization_code: authorization,
    amount: 10000,
    email: "jack@jill.com",
  };
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  const expectedCharge = {
    success: true,
    data: "chargeData",
  };

  axios.post.mockResolvedValueOnce({ data: { data: "chargeData" } });

  const result = await chargeCardWithAuthorization(authorization);

  expect(axios.post).toHaveBeenCalledWith(PAYSTACK_BASE_URL, chargeData, {
    headers: {
      Authorization: `Bearer ${secretKey}`,
    },
  });
  expect(result).toEqual(expectedCharge);
});

// Return an object with success as true and charge data
it("should return an object with success as true and charge data", async () => {
  const authorization = "1234567890";
  const expectedCharge = {
    success: true,
    data: {
      id: "charge_1234567890",
      amount: 10000,
      email: "jack@jill.com",
    },
  };

  axios.post.mockResolvedValueOnce({ data: expectedCharge });

  const result = await chargeCardWithAuthorization(authorization);

  expect(result).toEqual(expectedCharge);
  expect(axios.post).toHaveBeenCalledWith(
    PAYSTACK_BASE_URL,
    {
      authorization_code: authorization,
      amount: 10000,
      email: "jack@jill.com",
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    }
  );
});

// Handle missing authorization code
it("should return an error when authorization code is missing", async () => {
  try {
    await chargeCardWithAuthorization(undefined);
  } catch (error) {
    expect(error.response.status).toBe(400);
    expect(error.response.data.error).toBe("Authorization code is required");
  }
});
