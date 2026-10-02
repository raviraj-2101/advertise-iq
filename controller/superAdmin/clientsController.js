const customerSchema = require("../../models/customer/customer.User.model");
const billingSchema = require("./../../models/superAdmin/billing.model");
const customerCompanySchema = require("./../../models/customer/customerCompany.model");
const adminSchema = require("./../../models/superAdmin/superAdmin.User.model");
const moment = require("moment");
const nodemailer = require("nodemailer");
const ejs = require("ejs");
const billingPlanSchema = require('../../models/customer/customerBillingPlanModel');
const companySchema = require("../../models/customer/customerCompany.model");
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;

const clientUrl = process.env.CLIENT_URL;
const sendEmailId = process.env.email;
const password = process.env.password;
const host = process.env.host;

exports.deleteClient = async (req, res) => {
  try {
    const id = req.params.id;
    const { isDelete } = req.body;

    if (id) {
      const deleteUser = await customerSchema.findOneAndUpdate(
        { _id: id },
        {
          $set: {
            isDelete: isDelete,
            status: !isDelete
          },
        },
        {
          new: true,
        }
      );
      if (deleteUser) {

        await customerSchema.updateMany(
          { createdBy: id },
          { $set: { isDelete: isDelete, status: !isDelete } }
        );

        return res.status(200).send({
          message: "Client delete successfully",
          isSuccess: true,
        });
      } else {
        return res.status(400).send({
          message: "Something went wrong!",
          isSuccess: false,
        });
      }
    } else {
      return res.status(404).send({
        message: "Client not found!",
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

exports.InActiveClient = async (req, res) => {
  try {
    const id = req.params.id;
    const { isDelete } = req.body;

    if (id) {
      const deleteUser = await customerSchema.findOneAndUpdate(
        { _id: id },
        {
          $set: {
            isDelete: isDelete,
            status: !isDelete
          },
        },
        {
          new: true,
        }
      );
      if (deleteUser) {
        await customerSchema.updateMany(
          { createdBy: id },
          { $set: { isDelete: isDelete, status: !isDelete } }
        );

        return res.status(200).send({
          message: "Client In-Active successfully",
          isSuccess: true,
        });
      } else {
        return res.status(400).send({
          message: "Something went wrong!",
          isSuccess: false,
        });
      }
    } else {
      return res.status(404).send({
        message: "Client not found!",
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

exports.getClientsRequestList = async (req, res) => {
  try {
    let { perPage, pageNo } = req.body;

    pageNo = pageNo ? pageNo : 1;
    perPage = perPage ? perPage : 25;

    const clientRequestList = await customerCompanySchema.aggregate([
      {
        $match: {
          "isFirstTimePayer": true,
        }
      },
      {
        $lookup: {
          from: "customers",
          localField: "owner",
          foreignField: "_id",
          as: "result"
        }
      },
      {
        $lookup: {
          from: "billings",
          localField: "_id",
          foreignField: "company",
          as: "billingDetails",
          pipeline: [
            {
              $project: {
                planFrequency: 1,
                createdAt: 1,
              }
            },
            {
              $sort: {
                createdAt: -1
              }
            }
          ]
        }
      },
      {
        $project: {
          name: 1,
          isFreeTrailPurchased: 1,
          isPaymentConfirmed: 1,
          clientRequest: {
            $arrayElemAt: ["$result", 0]
          },
          billingDetail: {
            $arrayElemAt: ["$billingDetails", 0]
          }
        }
      },
      {
        $facet: {
          totalRecords: [
            { $count: "count" }
          ],
          clientList: [
            { $skip: (pageNo - 1) * perPage },
            { $limit: perPage },
            {
              $project: {
                name: 1,
                billingDetail: 1,
                isFreeTrailPurchased: 1,
                isPaymentConfirmed: 1,
                "clientRequest._id": 1,
                "clientRequest.firstName": 1,
                "clientRequest.lastName": 1,
                "clientRequest.email": 1,
                "clientRequest.company": 1,
                "clientRequest.mobileNumber": 1,
                "clientRequest.referenceCode": 1,
              }
            }
          ]
        }
      }
    ]);
    return res.status(200).send({
      message: "Clients request list fetched successfully..",
      clientRequestList: clientRequestList[0]?.clientList,
      totalRecords: clientRequestList[0]?.totalRecords[0]?.count,
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

exports.getClientList = async (req, res) => {
  try {
    let { perPage, pageNo } = req.body;

    pageNo = pageNo ? pageNo : 1;
    perPage = perPage ? perPage : 25;

    const clientList = await customerCompanySchema.aggregate([
      {
        $match: {
          $or: [
            {
              "isPlanActive": true
            },
            {
              "isPlanActive": false,
              "isFreeTrailPurchased": true,
              "isFirstTimePayer": false
            }
          ]
        }
      },
      {
        $lookup: {
          from: "customers",
          localField: "owner",
          foreignField: "_id",
          as: "result"
        }
      },
      {
        $project: {
          name: 1,
          subscriptionStartDate: 1,
          subscriptionEndDate: 1,
          nextPaymentDate: 1,
          subscriptionMetaData: 1,
          client: { $arrayElemAt: ["$result", 0] }
        }
      },
      // Using $facet to get paginated results and total count
      {
        $facet: {
          // Get the total count of matching records
          totalRecords: [
            { $count: "count" }
          ],
          // Get the paginated results
          clientList: [
            { $skip: (pageNo - 1) * perPage },
            { $limit: perPage },
            {
              $project: {
                name: 1,
                subscriptionStartDate: 1,
                subscriptionEndDate: 1,
                nextPaymentDate: 1,
                subscriptionMetaData: 1,
                "client._id": 1,
                "client.firstName": 1,
                "client.lastName": 1,
                "client.email": 1,
                "client.company": 1,
                "client.mobileNumber": 1,
                "client.status": 1,
                "client.referenceCode": 1,
              }
            }
          ]
        }
      }
    ])

    const client = clientList[0]?.clientList
    const totalRecords = clientList[0]?.totalRecords[0]?.count

    return res.status(200).send({
      message: "Client list fetched successfully",
      client,
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
};

exports.confirmClientPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const billingDetails = await billingSchema.findOne({ _id: id });
    const admin = await adminSchema.findOne({ _id: userId });
    const customer = await customerSchema.findOne({ _id: billingDetails.userId });
    const billingPlanDetail = await billingPlanSchema.findOne({ _id: billingDetails.planId });
    const company = await companySchema.findOne({ _id: customer.company })

    if (company?.isPlanActive)
      return res.status(400).json({
        success: false,
        message: 'This client request has been already approved.'
      });

    // update client payment status
    const currentBilling = await billingSchema.findOneAndUpdate(
      {
        _id: id,
      },
      {
        isConfirmed: true,
        subscriptionStartDate: new Date(),
        subscriptionEndDate: moment().add(billingPlanDetail.days, "days"),
        nextPaymentDate: moment().add(billingPlanDetail.days, 'days'),
        confirmedAt: new Date(),
        orderNumber: `OD-${uuidv4().replace(/-/g, '').substring(0, 6)}`,
      }
    );

    // update customer metadata
    const subscriptionMetaData = {
      subscriptionStartDate: new Date(),
      subscriptionEndDate: moment().add(billingPlanDetail.days, "days"),
      nextPaymentDate: moment().add(billingPlanDetail.days, 'days'),
      subscriptionMetaData: {
        planPrice: billingDetails.planPrice,
        planFrequency: billingDetails.planFrequency,
        planId: billingDetails.planId,
        purchaseConfimedAt: billingDetails.createdAt,
      },
    };

    await companySchema.findOneAndUpdate(
      {
        _id: company._id,
      },
      {
        $set: { isPlanActive: true, isFirstTimePayer: false, ...subscriptionMetaData, isPaymentConfirmed: true },
      }
    );

    if (billingDetails.planFrequency !== "Free Trial") {
      const nextBillingBody = {
        userId: currentBilling.userId,
        company: currentBilling.company,
        referenceCode: currentBilling.referenceCode,
        planPrice: currentBilling.planPrice,
        planId: billingPlanDetail._id,
        planFrequency: currentBilling.planFrequency,
        previousReference: currentBilling._id,
        subscriptionNumber: currentBilling.subscriptionNumber,
        subscriptionStartDate: new Date(),
        subscriptionEndDate: moment().add(billingPlanDetail.days, 'days'),
      }
      const createNextBilling = await billingSchema.create(nextBillingBody);

      if (createNextBilling) {
        currentBilling.nextReference = createNextBilling._id;
        await currentBilling.save();
      }
    }

    if (customer) {
      const transporter = nodemailer.createTransport({
        host: host,
        port: 587,
        secure: false,
        auth: {
          user: sendEmailId,
          pass: password,
        },
      });

      const emailBody = await ejs.renderFile(
        "./template/approvedRequestTemplate.ejs",
        { clientUrl, user: customer }
      );

      const sendEmail = await transporter.sendMail({
        from: `"FINANZ" <${sendEmailId}>`,
        to: customer.email,
        subject: `Payment Confirmation`,
        text: `Payment Confirmation`,
        html: emailBody,
      });

      if (sendEmail.accepted) {
        return res.status(200).send({
          message: "Client request has been successfully approved.",
          isSuccess: true,
        });
      } else {
        return res.status(500).send({
          message: "Something went wrong, please try again!",
          isSuccess: false,
        });
      }

    } else {
      return res.status(404).send({
        message: "Client not found!",
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

exports.paymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { confirm } = req.body;

    const company = await companySchema.findOne({ owner: id })
    const billingPlan = await billingSchema.findOne({ userId: id, isConfirmed: true }).sort({ createdAt: -1 });
    const billingRenewPlan = await billingSchema.findOne({ userId: id }).sort({ createdAt: -1 });
    const billingPlanDetail = await billingPlanSchema.findOne({ _id: billingRenewPlan.planId });

    if (!company)
      return res.status(404).send({
        message: "Client not found!",
        isSuccess: false
      })

    if (moment(company?.nextPaymentDate) > moment() && billingPlan?.isConfirmed && !confirm)
      return res.status(409).send({
        message: "The client already has an active plan and cannot renew it until it expires.",
        isSuccess: false
      })

    if (company && confirm) {
      const subscriptionMetaData = {
        subscriptionStartDate: billingPlan?.subscriptionStartDate && billingPlan.planFrequency !== "Trial" ? billingPlan?.subscriptionStartDate : new Date(),
        subscriptionEndDate: billingPlan?.subscriptionEndDate && billingPlan.planFrequency !== "Trial" ? billingPlan?.subscriptionEndDate : moment().add(1, "y"),
        nextPaymentDate: moment().add(billingPlanDetail.days, 'days'),
        subscriptionMetaData: {
          planPrice: billingRenewPlan?.planPrice,
          planFrequency: billingRenewPlan?.planFrequency,
          planId: billingRenewPlan?.planId,
          purchaseConfimedAt: billingRenewPlan?.createdAt,
        }
      };

      await companySchema.findOneAndUpdate(
        {
          _id: company._id,
        },
        {
          $set: { isPlanActive: true, ...subscriptionMetaData },
        }
      );

      const billingBody = {
        orderNumber: `OD-${uuidv4().replace(/-/g, '').substring(0, 6)}`,
        subscriptionStartDate: billingPlan?.subscriptionStartDate && billingPlan.planFrequency !== "Free Trial" ? billingPlan?.subscriptionStartDate : new Date(),
        subscriptionEndDate: billingPlan?.subscriptionEndDate && billingPlan.planFrequency !== "Free Trial" ? billingPlan?.subscriptionEndDate : moment().add(1, "y"),
        nextPaymentDate: moment().add(billingPlanDetail.days, 'days'),
        isConfirmed: true,
        confirmedAt: new Date(),
      }


      // update client payment status
      const currentBilling = await billingSchema.findOneAndUpdate(
        {
          _id: billingPlan?.nextReference ? billingPlan?.nextReference : billingPlan._id,
        },
        billingBody
      );

      const nextBillingBody = {
        userId: currentBilling.userId,
        company: currentBilling.company,
        referenceCode: currentBilling.referenceCode,
        planPrice: currentBilling.planPrice,
        planId: billingPlanDetail._id,
        planFrequency: currentBilling.planFrequency,
        previousReference: currentBilling._id,
        subscriptionNumber: currentBilling.subscriptionNumber,
        subscriptionStartDate: billingPlan?.subscriptionStartDate && billingPlan.planFrequency !== "Free Trial" ? billingPlan?.subscriptionStartDate : new Date(),
        subscriptionEndDate: billingPlan?.subscriptionEndDate && billingPlan.planFrequency !== "Free Trial" ? billingPlan?.subscriptionEndDate : moment().add(1, "y"),
        subscriptionEndDate: currentBilling?.subscriptionEndDate,
      }
      const createNextBilling = await billingSchema.create(nextBillingBody);

      if (createNextBilling) {
        currentBilling.nextReference = createNextBilling._id;
        await currentBilling.save();
      }

      return res.status(200).send({
        message: "Subscription renewed successfully.",
        isSuccess: true
      })

    } else {
      await companySchema.findOneAndUpdate(
        {
          _id: company._id,
        },
        {
          $set: { isPlanActive: false, isPaymentConfirmed: false },
        }
      );

      return res.status(200).send({
        message: "Subscription not renewed. Client is not approved or payment confirmation is missing.",
        isSuccess: true
      })
    }

  } catch (error) {
    return res.status(500).send({
      error: error.message,
      message: "Something went wrong, please try again!",
      isSuccess: false,
    });
  }
}

exports.getPaymentStatusList = async (req, res) => {
  try {
    let { perPage, pageNo, company, archive } = req.body;

    pageNo = pageNo ? pageNo : 1;
    perPage = perPage ? perPage : 25;

    let billigPipeline = { $match: {} }
    let companyQuery = { $match: {} }
    let billingDetailPipeline = { $match: {} }
    let companyOrInitialMatch = { $match: {} }

    if (company && archive) {
      companyQuery = {
        $match: {
          _id: new ObjectId(company),
        }
      }
      billigPipeline = {
        $match: {
          company: new ObjectId(company),
          isConfirmed: true
        }
      }
      companyOrInitialMatch = {
        $match: {
          isFirstTimePayer: false
        }
      }
    }

    if ((!company && !archive) || (company && !archive)) {
      billingDetailPipeline = {
        $addFields: {
          billingDetail: { $arrayElemAt: ["$billingDetail", 0] }
        }
      }
    }

    if (!company && !archive) {
      companyOrInitialMatch = {
        $match: {
          isFirstTimePayer: false,
          "billingDetail.planFrequency": { $ne: "Free Trial" }
        }
      }
    }

    if (company && !archive) {
      companyOrInitialMatch = {
        $match: {
          isFirstTimePayer: false,
          "billingDetail.company": new ObjectId(company),
        }
      }
      billigPipeline = {
        $match: {
          isConfirmed: true
        }
      }
      companyQuery = {
        $match: {
          _id: new ObjectId(company),
        }
      }
    }

    if (!company && archive) {
      billigPipeline = {
        $match: {
          isConfirmed: true
        }
      }
      companyOrInitialMatch = {
        $match: {
          isFirstTimePayer: false
        }
      }
    }

    // Perform the aggregation query
    const clientList = await customerCompanySchema.aggregate([
      companyQuery,
      {
        $lookup: {
          from: "billings",
          localField: "_id",
          foreignField: "company",
          as: "billingDetail",
          pipeline: [
            {
              $sort: {
                createdAt: -1
              }
            },
            billigPipeline,
          ]
        }
      },
      billingDetailPipeline,
      companyOrInitialMatch,
      {
        $lookup: {
          from: "customers",
          localField: "owner",
          foreignField: "_id",
          as: "result",
        }
      },
      {
        $project: {
          name: 1,
          subscriptionStartDate: 1,
          subscriptionEndDate: 1,
          nextPaymentDate: 1,
          subscriptionMetaData: 1,
          client: { $arrayElemAt: ["$result", 0] },
          billingDetail: 1
        }
      },
      // Using $facet to get paginated results and total count
      {
        $facet: {
          // Get the total count of matching records
          totalRecords: [
            { $count: "count" }
          ],
          // Get the paginated results
          clientList: [
            { $skip: (pageNo - 1) * perPage },
            { $limit: perPage },
            {
              $project: {
                name: 1,
                billingDetail: 1,
                subscriptionStartDate: 1,
                subscriptionEndDate: 1,
                nextPaymentDate: 1,
                subscriptionMetaData: 1,
                "client._id": 1,
                "client.firstName": 1,
                "client.lastName": 1,
                "client.email": 1,
                "client.company": 1,
                "client.mobileNumber": 1,
                "client.status": 1,
                "client.referenceCode": 1,
              }
            }
          ]
        }
      }
    ]);

    const client = clientList[0]?.clientList;
    const totalRecords = clientList[0]?.totalRecords[0]?.count;

    return res.status(200).send({
      message: "Client list fetched successfully",
      client,
      totalRecords,
      isDisabled: company || archive ? true : false,
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