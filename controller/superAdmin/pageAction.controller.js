const pageActionSchema = require("../../models/superAdmin/pageAction.model");

exports.createPageAction = async (req, res) => {
  try {
    const { pageId, actionType } = req.body;
    const escapedName = actionType
      .trim()
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const nameRegex = new RegExp("^" + escapedName + "$", "i");
    const findPage = await pageActionSchema.findOne({
      pageId,
      actionType: nameRegex,
    });
    if (findPage) {
      return res.status(203).send({
        message: "Page action is already existing!",
        isSuccess: false,
      });
    } else {
      const newPageAction = await pageActionSchema({
        pageId,
        actionType,
      });
      newPageAction.save();
      return res.status(200).send({
        message: "Page action created successfully.",
        newPageAction,
        isSuccess: true,
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
