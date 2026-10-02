const billingPlanSchema = require("../../models/customer/customerBillingPlanModel");
const customerSchema = require("../../models/customer/customer.User.model");
const { bankDetails } = require("../../common/helper.js");
const billingSchema = require("../../models/superAdmin/billing.model");
const moment = require('moment');
const companySchema = require("../../models/customer/customerCompany.model");
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;

exports.getBillingPlan = async (req, res) => {
  const { planType } = req.body
  try {
    let billingType = []
    if (planType) {
      billingType = [planType, "Trial"]
    } else {
      return res.status(400).send({
        message: "PlanType is Required",
        isSuccess: false,
      })
    }
    const billingPlanList = await billingPlanSchema.aggregate([
      {
        $sort: {
          order: 1
        }
      },
      {
        $match: {
          planType: { $in: billingType }
        }
      }
    ]);

    return res.status(200).send({
      message: "Billing Plan fetched successfully..",
      billingPlanList,
      isSuccess: true,
    });
  } catch (error) {
    return res.status(500).send({
      error: error.message,
      message: "Something went wrong, please try again!",
      isSuccess: false,
    });
  }
};

exports.getBillingStatus = async (req, res) => {
  try {
    const userId = req.user._id;
    const customer = await customerSchema.findOne({ _id: userId })
    const company = await companySchema.findOne({ _id: customer?.company })
    const adminCustomer = await customerSchema.findOne({ _id: company?.owner })
    const adminCustomerBillingPlan = await billingSchema.find({ userId: adminCustomer?._id }).sort({ createdAt: -1 });

    let updateCompany;


    if (moment(company?.nextPaymentDate) < moment()) {
      let updateCompanyDetail = {};
      if (company?.subscriptionMetaData?.planFrequency === "Trial") {
        updateCompanyDetail = { isFreeTrailExpired: true, isPlanActive: false }
      } else {
        updateCompanyDetail = { isPlanActive: false, isPaymentConfirmed: false }
      }
      updateCompany = await companySchema.findOneAndUpdate(
        {
          _id: company._id,
        },
        {
          $set: updateCompanyDetail,
        }
      );
    }

    if (adminCustomerBillingPlan.length) {
      const isConfirmed = adminCustomerBillingPlan[0]?.isConfirmed

      return res.status(200).send({
        message: "Billing details fetched successfully..",
        isPaymentAvailable: true,
        isConfirmed,
        isSuccess: true,
        isFreeTrailPurchased: updateCompany ? updateCompany?.isFreeTrailPurchased : company?.isFreeTrailPurchased,
        isPaymentConfirmed: updateCompany ? updateCompany?.isPaymentConfirmed : company?.isPaymentConfirmed,
        isFreeTrailExpired: updateCompany ? updateCompany?.isFreeTrailExpired : company?.isFreeTrailExpired,
        isPlanActive: updateCompany ? updateCompany?.isPlanActive : company?.isPlanActive,
        planName: updateCompany ? updateCompany?.subscriptionMetaData?.planFrequency : company?.subscriptionMetaData?.planFrequency,
      });
    } else {
      return res.status(200).send({
        message: "Billing details fetched successfully..",
        isPaymentAvailable: false,
        isConfirmed: false,
        isSuccess: true,
        isFreeTrailPurchased: updateCompany ? updateCompany?.isFreeTrailPurchased : company?.isFreeTrailPurchased,
        isPaymentConfirmed: updateCompany ? updateCompany?.isPaymentConfirmed : company?.isPaymentConfirmed,
        isFreeTrailExpired: updateCompany ? updateCompany?.isFreeTrailExpired : company?.isFreeTrailExpired,
        isPlanActive: updateCompany ? updateCompany?.isPlanActive : company?.isPlanActive,
        planName: updateCompany ? updateCompany?.subscriptionMetaData?.planFrequency : company?.subscriptionMetaData?.planFrequency,
      });
    }
  } catch (error) {
    return res.status(500).send({
      error: error.message,
      message: "Something went wrong, please try again!",
      isSuccess: false,
    });
  }
};

exports.getPaymentDetail = async (req, res) => {
  try {
    const userId = req.user._id;
    console.log(userId)
    const customer = await customerSchema.findOne({ _id: userId });

    const responseBody = {
      ...bankDetails,
      referenceCode: customer.referenceCode,
    };

    return res.status(200).send({
      message: "Billing Plan fetched successfully..",
      paymentDetail: responseBody,
      isSuccess: true,
    });
  } catch (error) {
    return res.status(500).send({
      error: error.message,
      message: "Something went wrong, please try again!",
      isSuccess: false,
    });
  }
};

exports.paymentConfirmation = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;
    const { isFreeTrailPurchased } = req.body;
    console.log(userId)
    const customer = await customerSchema.findOne({ _id: userId });
    const company = await companySchema.findOne({ _id: customer.company });
    const billingPlan = await billingPlanSchema.findOne({ _id: id });
    const lastBillingPlan = await billingSchema.findOne({ userId: userId, isConfirmed: true }).sort({ createdAt: -1 })

    // When Free trial already purchase
    if (company?.isFreeTrailPurchased && billingPlan.planName === "Free Trial") {
      return res.status(409).send({
        message: 'You has already used the free trial subscription.',
        isSuccess: false,
      });
    }

    // When plan already running
    if (moment(company?.nextPaymentDate) > moment()) {
      return res.status(409).send({
        message: 'You have already purchased a plan.',
        isSuccess: false,
      });
    }

    if (customer) {
      if (isFreeTrailPurchased) {
        await companySchema.findOneAndUpdate(
          { _id: customer.company },
          { isFreeTrailPurchased: isFreeTrailPurchased }
        )
      }

      await companySchema.findOneAndUpdate(
        { _id: company._id },
        { isPaymentConfirmed: true }
      );

      const billingBody = {
        userId: customer._id,
        company: customer.company,
        referenceCode: customer.referenceCode,
        planPrice: billingPlan.price,
        planId: billingPlan._id,
        planFrequency: billingPlan.planName,
        previousReference: lastBillingPlan ? lastBillingPlan._id : null,
        subscriptionNumber: `SN-${uuidv4().replace(/-/g, '').substring(0, 6)}`
      };
      const newPlan = await billingSchema.create(billingBody);

      if (lastBillingPlan) {
        lastBillingPlan.nextReference = newPlan._id;
        await lastBillingPlan.save();
      }

      return res.status(200).send({
        message: "Payment confirmed successfully",
        isSuccess: true,
      });

    } else {
      return res.status(404).send({
        message: "Customer not found!",
        isSuccess: false,
      });
    }
  } catch (error) {
    return res.status(500).send({
      error: error.message,
      message: "Something went wrong, please try again!",
      isSuccess: false,
    });
  }
};

exports.getSubscription = async (req, res) => {
  try {
    let { perPage, pageNo } = req.body;

    pageNo = pageNo ? pageNo : 1;
    perPage = perPage ? perPage : 25;
    const subscriptionList = await billingSchema.aggregate([
      {
        $match: {
          userId: new ObjectId(req.user._id)
        }
      },
      {
        $group: {
          _id: '$subscriptionNumber',
          subscription: { $first: '$$ROOT' }
        }
      },
      {
        $facet: {
          // Get the total count of matching records
          totalRecords: [
            { $count: "count" }
          ],
          // Get the paginated results
          subscriptionList: [
            { $skip: (pageNo - 1) * perPage },
            { $limit: perPage },
            {
              $project: {
                subscription: 1,
              }
            }
          ]
        }
      }
    ]);

    const subscription = subscriptionList[0]?.subscriptionList;
    const totalRecords = subscriptionList[0]?.totalRecords[0]?.count;

    return res.status(200).send({
      message: "Billing Plan fetched successfully..",
      subscription,
      totalRecords,
      isSuccess: true,
    });
  } catch (error) {
    return res.status(500).send({
      error: error.message,
      message: "Something went wrong, please try again!",
      isSuccess: false,
    });
  }
}

exports.getHistory = async (req, res) => {
  try {
    let { perPage, pageNo } = req.body;

    pageNo = pageNo ? pageNo : 1;
    perPage = perPage ? perPage : 25;
    const historyList = await billingSchema.aggregate([
      {
        $match: {
          userId: new ObjectId(req.user._id),
          orderNumber: { $ne: null }
        }
      },
      {
        $facet: {
          // Get the total count of matching records
          totalRecords: [
            { $count: "count" }
          ],
          // Get the paginated results
          historyList: [
            { $skip: (pageNo - 1) * perPage },
            { $limit: perPage },
          ]
        }
      }
    ]);

    const history = historyList[0]?.historyList;
    const totalRecords = historyList[0]?.totalRecords[0]?.count;

    return res.status(200).send({
      message: "Billing Plan fetched successfully..",
      history,
      totalRecords,
      isSuccess: true,
    });
  } catch (error) {
    return res.status(500).send({
      error: error.message,
      message: "Something went wrong, please try again!",
      isSuccess: false,
    });
  }
}