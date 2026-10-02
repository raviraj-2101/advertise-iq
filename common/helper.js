const jwt = require("jsonwebtoken");
const configAdsSchema = require("../models/config/configAds.model")
const permissionSchema = require("../models/superAdmin/permission.model")
const profileSchema = require("../models/config/profiles.model")
const cronJobSchedularSchema = require("../models/cronJobSchedular.model")
const sellerConfigAdsSchema = require("../models/sellerPartner/configAd.model")
require("dotenv").config();

exports.customerPlan = [
  {
    planName: "Premium",
    planType: "Yearly",
    features: [
      "Invoice balance",
      "Liabilities balance",
      "Account overview",
      "Sales planning",
      "Liquidity balance",
      "Project and offer overview",
      "Guarantees",
      "Project calculation",
      "Fixed cost overview",
      "Master data",
      "API to your accounting software",
      "API to your accounts",
    ],
    price: 5999,
    defaultPrice: 6999,
    days: 365,
    order: 5
  },
  {
    planName: "Premium",
    planType: "Monthly",
    features: [
      "Invoice balance",
      "Liabilities balance",
      "Account overview",
      "Sales planning",
      "Liquidity balance",
      "Project and offer overview",
      "Guarantees",
      "Project calculation",
      "Fixed cost overview",
      "Master data",
      "API to your accounting software",
      "API to your accounts",
    ],
    price: 549,
    defaultPrice: 649,
    days: 30,
    order: 5
  },
  {
    planName: "Professional",
    planType: "Yearly",
    features: [
      "Invoice balance",
      "Liabilities balance",
      "Account overview",
      "Sales planning",
      "Liquidity balance",
      "Project and offer overview",
      "Guarantees",
      "Project calculation",
      "Fixed cost overview",
      "Master data",
      "API to your accounting software",
      "API to your accounts",
    ],
    price: 5999,
    defaultPrice: 6999,
    days: 365,
    order: 4
  },
  {
    planName: "Professional",
    planType: "Monthly",
    features: [
      "Invoice balance",
      "Liabilities balance",
      "Account overview",
      "Sales planning",
      "Liquidity balance",
      "Project and offer overview",
      "Guarantees",
      "Project calculation",
      "Fixed cost overview",
      "Master data",
      "API to your accounting software",
      "API to your accounts",
    ],
    price: 549,
    defaultPrice: 649,
    days: 30,
    order: 4
  },
  {
    planName: "Business",
    planType: "Yearly",
    features: [
      "Invoice balance",
      "Liabilities balance",
      "Account overview",
      "Sales planning",
      "Liquidity balance",
      "Project and offer overview",
      "Guarantees",
      "Project calculation",
      "Fixed cost overview",
      "Master data",
      "API to your accounting software",
      "API to your accounts",
    ],
    price: 5999,
    defaultPrice: 6999,
    days: 365,
    order: 3
  },
  {
    planName: "Business",
    planType: "Monthly",
    features: [
      "Invoice balance",
      "Liabilities balance",
      "Account overview",
      "Sales planning",
      "Liquidity balance",
      "Project and offer overview",
      "Guarantees",
      "Project calculation",
      "Fixed cost overview",
      "Master data",
      "API to your accounting software",
      "API to your accounts",
    ],
    price: 549,
    defaultPrice: 649,
    days: 30,
    order: 3
  },
  {
    planName: "Starter",
    planType: "Yearly",
    features: [
      "Invoice balance",
      "Liabilities balance",
      "Account overview",
      "Sales planning",
      "Liquidity balance",
      "Project and offer overview",
      "Guarantees",
      "Project calculation",
      "Fixed cost overview",
      "Master data",
      "API to your accounting software",
      "API to your accounts",
    ],
    price: 5999,
    defaultPrice: 6999,
    days: 365,
    order: 2
  },
  {
    planName: "Starter",
    planType: "Monthly",
    features: [
      "Invoice balance",
      "Liabilities balance",
      "Account overview",
      "Sales planning",
      "Liquidity balance",
      "Project and offer overview",
      "Guarantees",
      "Project calculation",
      "Fixed cost overview",
      "Master data",
      "API to your accounting software",
      "API to your accounts",
    ],
    price: 549,
    defaultPrice: 649,
    days: 30,
    order: 2
  },
  {
    planName: "Trial",
    planType: "Trial",
    features: [
      "Invoice balance",
      "Liabilities balance",
      "Account overview",
      "Sales planning",
      "Liquidity balance",
      "Project and offer overview",
      "Guarantees",
      "Project calculation",
      "Fixed cost overview",
      "Master data",
      "API to your accounting software",
      "API to your accounts",
    ],
    price: 0,
    defaultPrice: 0,
    days: 14,
    order: 1
  }
]

exports.bankDetails = {
  bankName: "Olinda Bank",
  reciversName: "Finanz controller GmbH",
  IBAN: "DE12 1001 0123 1348 1915 91",
  BIC: "QNTODEB2XXX",
}

exports.decryptToken = async (token) => {
  try {
    if (!token) throw new Error("Token is missing");
    const decoded = jwt.verify(token, process.env.secret); // Verify the token
    return decoded;
  } catch (error) {
    console.error("Error decrypting token:", error.message);
    return null; // Return null if token is invalid or expired
  }
};

exports.generateDynamicString = (firstName, lastName, mobileNumber) => {
  const firstChar = firstName.charAt(0);
  const randomNumber = Math.floor(Math.random() * 90) + 10;
  const lastChars = lastName.substring(0, 2);
  const lastDigit = mobileNumber.charAt(mobileNumber.length - 1);

  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const randomChars = Array.from({ length: 6 }, () => characters.charAt(Math.floor(Math.random() * characters?.length))).join('');

  const dynamicString = firstChar + randomNumber + lastChars + lastDigit + randomChars;

  return dynamicString;
}

// get amazon creadentials from config table 
exports.getAccessToken = async (companyId, res) => {
  const checkConfigAds = await configAdsSchema.findOne({ companyId });
  if (!checkConfigAds) {
    return res.status(401).send({ message: "Please required access token!" });
  }
  return checkConfigAds;
};

exports.cronGetSellerAccessToken = async (companyId) => {
  const checkConfigAds = await sellerConfigAdsSchema.findOne({ companyId });
  if (!checkConfigAds) {
    return console.log("Please required access token!");
  }
  return checkConfigAds;
};

// get config data bu companyId
exports.cronGetAccessToken = async (companyId) => {
  const checkConfigAds = await configAdsSchema.findOne({ companyId });
  if (!checkConfigAds) {
    console.log("Customer detail not found!")
    // return write_logs({
    //   message: "Customer detail not found!",
    //   log_type: "error",
    // });
  }
  return checkConfigAds;
};

exports.checkPermission = async (companyId, pageName, actionType, status) => {
  try {
    const permission = await permissionSchema
      .findOne({
        companyId,
      })
      .populate("pages.pageId", { pageName: 1 })
      .populate("pages.allocatedActions.actionId", { actionType: 1 });
    if (!permission) {
      return {
        isSuccess: false,
        message: "Permission not found for this customer.",
        hasPermission: false,
      };
    }
    let transformedData = {
      pages: permission.pages.map((page) => ({
        pageName: page.pageId.pageName,
        allocatedActions: page.allocatedActions.map((action) => ({
          actionId: action.actionId._id,
          actionType: action.actionId.actionType,
          status: action.status,
        })),
      })),
    };
    const matchingPage = transformedData.pages.find(
      (page) => page.pageName == pageName
    );
    if (!matchingPage) {
      return {
        isSuccess: false,
        message: `Permission not granted for the '${pageName}' page.`,
        hasPermission: false,
      };
    }
    const matchingAction = matchingPage.allocatedActions.find(
      (action) => action.actionType == actionType && action.status == status
    );
    if (!matchingAction) {
      return {
        isSuccess: false,
        message: `Permission not granted for the '${actionType}' action on the '${pageName}' page.`,
        hasPermission: false,
      };
    }
    return {
      isSuccess: true,
      message: "Permission granted.",
      hasPermission: true,
    };
  } catch (error) {
    return {
      isSuccess: false,
      message: "Something went wrong while checking permission.",
      error: error.message,
      hasPermission: false,
    };
  }
};

// Common pagination logic
exports.getPaginatedData = (data, pageNo, perPage) => {
  const startIndex = (pageNo - 1) * perPage;
  const endIndex = pageNo * perPage;
  const paginatedData = data.slice(startIndex, endIndex);
  return paginatedData;
}

exports.getProfile = async (companyId, profileId) => {
  const checkAccount = await profileSchema.findOne({
    companyId,
    profileId,
  });
  if (!checkAccount) {
    return console.log("Please connect your account!");
  }
  return checkAccount;
};

exports.cronCheckCustomerPermission = async (companyId, profileId, cronName) => {
  const checkCustomerPermission = await cronJobSchedularSchema.findOne(
    {
      companyId,
      profileId,
      cronName,
    },
    { isActive: 1, _id: 0 }
  );
  if (checkCustomerPermission && checkCustomerPermission.isActive) {
    return true;
  } else {
    return false;
  }
};
