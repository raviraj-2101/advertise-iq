const permissionSchema = require("../../models/superAdmin/permission.model");
const companySchema = require("../../models/customer/customerCompany.model");
const adminCompanySchema = require("../../models/superAdmin/superAdminCompany.model")
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;

exports.applyPermission = async (req, res) => {
  try {
    const { companyId, pages } = req.body;
    const convertedPages = pages?.map((item) => ({
      pageId: new ObjectId(item.pageId),
      allocatedActions: item.allocatedActions.map((actionId) => ({
        actionId: new ObjectId(actionId),
        status: true,
      })),
    }));
    let getCompany = await companySchema.findById({ _id: companyId });
    let getAdminCompany = await adminCompanySchema.findById({ _id: companyId });
    if (!getCompany && !getAdminCompany) {
      return res.status(203).send({
        message: "Company not found!",
        isSuccess: false,
      });
    }
    let getPermission = await permissionSchema.findOne({
      companyId,
    });
    if (!getPermission) {
      const createObj = {
        companyId: new ObjectId(companyId),
        pages: convertedPages,
        allocatedOn: new Date(),
      };
      const newPermission = await permissionSchema(createObj);
      newPermission.save();
      return res.status(200).send({
        message: "Permission apply successfully.",
        newPermission,
        isSuccess: true,
      });
    } else {
      pages?.map(item => {
        const existingPage = getPermission.pages.find(
          (page) => page.pageId == item.pageId
        );
        if (existingPage) {
          item.allocatedActions.forEach((newAction) => {
            const isActionAllocated = existingPage.allocatedActions.some(
              (existingAction) => existingAction.actionId == newAction
            );
            if (!isActionAllocated) {
              existingPage.allocatedActions.push({
                actionId: newAction,
                status: true,
              });
            }
          });
        } else {
          getPermission.pages.push(convertedPages);
        }
      })
      const updatedPermission = await getPermission.save();
      return res.status(200).send({
        message: "Permission updated successfully.",
        isSuccess: true,
        data: updatedPermission,
      });
    }
  } catch (error) {
    return res.status(203).send({
      message: "Something went wrong, please try again!",
      isSuccess: false,
      error: error.message,
    });
  }
};

exports.getAdminPermission = async (req, res) => {
  try {
    const companyId = req.user.company;
    const getCompanyPermission = await permissionSchema
      .findOne({
        companyId,
      })
      .populate("pages.pageId", { pageName: 1 })
      .populate("pages.allocatedActions.actionId", { actionType: 1 });
    if (!getCompanyPermission) {
      return res.status(203).send({
        message: "Permission not assign to this Company!",
        isSuccess: false,
      });
    }
    const transformedData = {
      companyId: getCompanyPermission.companyId,
      _id: getCompanyPermission._id,
      pages: getCompanyPermission.pages.map((page) => ({
        pageId: page.pageId._id,
        pageName: page.pageId.pageName,
        allocatedActions: page.allocatedActions.map((action) => ({
          actionId: action.actionId._id,
          actionType: action.actionId.actionType,
          status: action.status,
        })),
      })),
    };
    const getCompanyPackage = await companySchema
      .findById(companyId)
      .populate("packageId");
    return res.status(200).send({
      message: "Permission get successfully.",
      isSuccess: true,
      data: transformedData,
      campaignType: getCompanyPackage
        ? getCompanyPackage.packageId.campaignTypes
        : [],
    });
  } catch (error) {
    return res.status(203).send({
      message: "Something went wrong, please try again!",
      isSuccess: false,
      error: error.message,
    });
  }
};

exports.getPermissionByCompany = async (req, res) => {
  try {
    const companyId = req.params.companyId;
    const getCompanyPermission = await permissionSchema
      .findOne({
        companyId,
      }).lean()
      .populate("pages.pageId", { pageName: 1 })
      .populate("pages.allocatedActions.actionId", { actionType: 1 });
    let transformedData;
    if (getCompanyPermission) {
      transformedData = {
        companyId: getCompanyPermission.companyId,
        _id: getCompanyPermission._id,
        createdAt: getCompanyPermission.createdAt,
        updatedAt: getCompanyPermission.updatedAt,
        pages: getCompanyPermission.pages.map((page) => ({
          pageId: page.pageId._id,
          pageName: page.pageId.pageName,
          allocatedOn: page.allocatedOn,
          allocatedActions: page.allocatedActions.map((action) => ({
            actionId: action.actionId._id,
            actionType: action.actionId.actionType,
            status: action.status,
          })),
        })),
      };
    }
    return res.status(200).send({
      message: "Permission get successfully.",
      isSuccess: true,
      data: transformedData ? transformedData : [],
    });
  } catch (error) {
    return res.status(203).send({
      message: "Something went wrong, please try again!",
      isSuccess: false,
      error: error.message,
    });
  }
};

exports.updateCompanyPermission = async (req, res) => {
  try {
    const { companyId, pageId, actionId, status } = req.body;
    const getCompanyPermission = await permissionSchema.findOne({
      companyId: companyId,
    });
    if (!getCompanyPermission) {
      return res.status(203).send({
        message: "Permission not assign to this Company!",
        isSuccess: false,
      });
    }
    const pageToUpdate = getCompanyPermission.pages.find(
      (page) => page.pageId == pageId
    );
    if (!pageToUpdate) {
      return res.status(203).send({
        message: "Page not found!",
        isSuccess: false,
      });
    }
    const actionToUpdate = pageToUpdate.allocatedActions.find(
      (action) => action.actionId == actionId
    );
    if (!actionToUpdate) {
      return res.status(203).send({
        message: "Action not found!",
        isSuccess: false,
      });
    }
    actionToUpdate.status = status;
    await getCompanyPermission.save();
    return res.status(200).send({
      message: "Permission updated successfully.",
      isSuccess: true,
      data: getCompanyPermission,
    });
  } catch (error) {
    return res.status(203).send({
      message: "Something went wrong, please try again!",
      isSuccess: false,
      error: error.message,
    });
  }
};

exports.removeCompanyPagePermission = async (req, res) => {
  try {
    const { companyId, pageId } = req.body;
    const getCompanyPermission = await permissionSchema.findOne({
      companyId: companyId,
    });
    if (!getCompanyPermission) {
      return res.status(203).send({
        message: "Permission not assign to this Company!",
        isSuccess: false,
      });
    }
    const pageToUpdate = getCompanyPermission.pages.find(
      (page) => page.pageId == pageId
    );
    if (!pageToUpdate) {
      return res.status(203).send({
        message: "Page not found!",
        isSuccess: false,
      });
    }
    const updatedPermission = await permissionSchema.findByIdAndUpdate(
      getCompanyPermission._id,
      {
        $pull: { pages: { pageId: pageId } },
      },
      { new: true }
    );

    if (!updatedPermission) {
      return res.status(203).send({
        message: "Permission id not found!",
        isSuccess: false,
      });
    }
    return res.status(200).send({
      message: "Page removed successfully.",
      isSuccess: true,
      data: updatedPermission,
    });
  } catch (error) {
    return res.status(203).send({
      message: "Something went wrong, please try again!",
      isSuccess: false,
      error: error.message,
    });
  }
};
