const express = require("express");
const router = express.Router();

const authenticationRoutes = require("./authenticationRoute");
const customerUserRoutes = require("./customer/customerUserRoute");
const customerCompanyRoutes = require("./customer/customerCompanyRoute");
const customerProfileRoutes = require("./customer/customerProfileRoute");
const superAdminUserRoutes = require("./superAdmin/superAdminUserRoute");
const superAdminCompanyRoutes = require("./superAdmin/superAdminCompanyRoute");
const superAdminProfileRoutes = require("./superAdmin/superAdminProfileRoute");
const clientsRoutes = require("./superAdmin/clientsRoute");
const customerBillingPlanRoutes = require("./customer/customerBillingPlanRoute");
const configAdsRoutes = require("./configs/configAds.route");
const spTargetRoutes = require("./sp/spTarget.route");
const portfoliosRoutes = require("./sp/portfolio.route");
const campaignRoutes = require("./sp/spCampaign.route");
const placementRoutes = require("./sp/placementRoute");
const adGroupRoutes = require("./sp/adGroupRoute");
const keywordRoutes = require("./sp/keywordRoute");
const customerStripeRoutes = require("./customer/customerStripeRoute");
const productRoutes = require("./sp/productRoute");
const superAdminPageRoutes = require("./superAdmin/pages.route");
const superAdminPageActionsRoutes = require("./superAdmin/pageAction.route");
const superAdminPermissionsRoutes = require("./superAdmin/permission.route");
const sbCampaignRoutes = require("./sb/sbCampaign.route");
const sdCampaignRoutes = require("./sd/sdCampaign.route");
const sbPlacementRoutes = require("./sb/sbPlacement.route");
const sbAdGroupRoutes = require("./sb/sbAdGroup.route");
const sbKeywordRoutes = require("./sb/sbKeyword.route");
const sdAdGroupRoutes = require("./sd/sdAdGroup.route");
const cronJobRoutes = require("./cronJob.route");
const orderRoutes = require("./sellerPartner/orders.route");
const configRoutes = require("./sellerPartner/configAds.route");

router.use("/auth", authenticationRoutes);
router.use("/cron", cronJobRoutes);

router.use("/superAdmin", superAdminUserRoutes);
router.use("/client", clientsRoutes);
router.use("/superAdmin/company", superAdminCompanyRoutes);
router.use("/superAdmin/profile", superAdminProfileRoutes);
router.use("/superAdmin/page", superAdminPageRoutes);
router.use("/superAdmin/pageAction", superAdminPageActionsRoutes)
router.use("/superAdmin/permission", superAdminPermissionsRoutes)

router.use("/customer", customerUserRoutes);
router.use("/customer/company", customerCompanyRoutes);
router.use("/customer/profile", customerProfileRoutes);
router.use("/customer/billing", customerBillingPlanRoutes);
router.use("/customer/stripe", customerStripeRoutes);

router.use("/configAds", configAdsRoutes);
router.use("/targeting", spTargetRoutes);
router.use("/portfolio", portfoliosRoutes);
router.use("/campaign", campaignRoutes);

router.use("/sb/campaign", sbCampaignRoutes);
router.use("/sb/placement", sbPlacementRoutes);
router.use("/sb/adGroup", sbAdGroupRoutes);
router.use("/sb/keyword", sbKeywordRoutes);

router.use("/sd/campaign", sdCampaignRoutes);
router.use("/sd/adGroup", sdAdGroupRoutes);

router.use("/placement", placementRoutes);
router.use("/adGroup", adGroupRoutes);
router.use("/keyword", keywordRoutes);
router.use("/product", productRoutes);

router.use("/seller/order", orderRoutes);
router.use("/seller/config", configRoutes);


module.exports = router;
