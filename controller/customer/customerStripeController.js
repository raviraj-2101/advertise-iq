const stripe = require('stripe')(process.env.STRIPE_SECRET);
const endpointSecret = process.env.WEBHOOK_SECRET;
const companySchema = require('./../../models/customer/customerCompany.model');
const billingSchema = require("./../../models/superAdmin/billing.model");
const billingPlanSchema = require('./../../models/customer/customerBillingPlanModel');
const customerSchema = require('./../../models/customer/customer.User.model');
const { v4: uuidv4 } = require('uuid');
const moment = require("moment");

// Create a customer with name and address
exports.createCustomerStripe = async (req, res) => {
    const { email, paymentMethodId, name, metaData } = req.body;

    try {
        // Create a customer with required information
        const customer = await stripe.customers.create({
            email: email,
            payment_method: paymentMethodId,
            name: name, // Add customer name
            "address": {
                "line1": "456 Elm St",
                "line2": "Apt 101",
                "city": "Berlin",
                "state": "Berlin",
                "postal_code": "10115",
                "country": "DE"
            },
            invoice_settings: { default_payment_method: paymentMethodId },
            metadata: metaData
        });

        await await customerSchema.findOneAndUpdate({ _id: metaData.userId }, { customerId: customer.id });

        return res.status(200).send({ message: "Stripe Customer Created successfully.", isSuccess: true, customerId: customer.id })
    } catch (error) {
        return res.status(500).send({
            error: error.message,
            message: "Something went wrong, please try again!",
            isSuccess: false,
        });
    }
};

// exports.createCustomerStripeSubscription = async (req, res) => {
//     const { customerId, priceId, metaData, isAutoPayment } = req.body;  // priceId is required for creating a subscription

//     try {
//         // Create a subscription for the customer
//         const subscription = await stripe.subscriptions.create({
//             customer: customerId,
//             items: [{ price: priceId }],
//             expand: ['latest_invoice.payment_intent'],  // This will allow us to get the clientSecret
//             metadata: metaData,  // Add metadata here
//         });

//         const clientSecret = subscription.latest_invoice.payment_intent.client_secret;

//         return res.status(200).send({ message: "Client Secret Created successfully.", isSuccess: true, clientSecret })
//     } catch (error) {
//         return res.status(500).send({
//             error: error.message,
//             message: "Something went wrong, please try again!",
//             isSuccess: false,
//         });
//     }
// };

// exports.createCustomerStripeSubscription = async (req, res) => {
//     const { customerId, priceId, metaData, isAutoPayment } = req.body;

//     try {
//         // Build subscription options based on isAutoPayment
//         let subscriptionOptions = {
//             customer: customerId,
//             items: [{ price: priceId }],
//             metadata: metaData, // Store custom metadata
//         };

//         if (!JSON.parse(isAutoPayment)) {
//             // Manual Payment Configuration
//             subscriptionOptions.collection_method = 'send_invoice'; // Sends an invoice
//             subscriptionOptions.days_until_due = 7; // Invoice payment is due in 7 days
//         } else {
//             // Auto-Payment Configuration
//             subscriptionOptions.collection_method = 'charge_automatically'; // Automatically charge the payment method
//             subscriptionOptions.expand = ['latest_invoice.payment_intent'];
//         }

//         console.log("🚀 ~ exports.createCustomerStripeSubscription= ~ subscriptionOptions:", subscriptionOptions)
//         // Step 1: Create Subscription
//         const subscription = await stripe.subscriptions.create(subscriptionOptions);

//         let response = { message: "Subscription created successfully.", isSuccess: true };

//         if (!JSON.parse(isAutoPayment)) {
//             // Handle Manual Payment Flow
//             if (subscription.latest_invoice) {
//                 let latestInvoice = await stripe.invoices.retrieve(subscription.latest_invoice);

//                 // Finalize the draft invoice for manual payment
//                 if (latestInvoice.status === 'draft') {
//                     latestInvoice = await stripe.invoices.finalizeInvoice(latestInvoice.id);
//                 }

//                 // Send the invoice to the customer
//                 await stripe.invoices.sendInvoice(latestInvoice.id);

//                 // If a PaymentIntent exists, retrieve it for the frontend
//                 if (latestInvoice.payment_intent) {
//                     const paymentIntent = await stripe.paymentIntents.retrieve(latestInvoice.payment_intent);
//                     response.clientSecret = paymentIntent.client_secret;
//                 } else {
//                     return res.status(400).send({
//                         message: "PaymentIntent not found for manual payment.",
//                         isSuccess: false,
//                     });
//                 }
//             }
//         } else {
//             // Auto-Payment Flow: Retrieve Client Secret
//             if (subscription.latest_invoice && subscription.latest_invoice.payment_intent) {
//                 response.clientSecret = subscription.latest_invoice.payment_intent.client_secret;
//             }
//         }

//         // Respond with success
//         return res.status(200).send(response);
//     } catch (error) {
//         // Handle errors
//         return res.status(500).send({
//             error: error.message,
//             message: "Something went wrong, please try again.",
//             isSuccess: false,
//         });
//     }
// };

exports.createCustomerStripeSubscription = async (req, res) => {
    const { customerId, priceId, metaData, isAutoPayment } = req.body;

    try {
        // Prepare subscription data
        let subscriptionData = {
            customer: customerId,
            items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            metadata: metaData || {},
        };

        // Determine collection method
        if (JSON.parse(isAutoPayment)) {
            subscriptionData.expand = ['latest_invoice.payment_intent']
        } else {
            subscriptionData.collection_method = "send_invoice";
            subscriptionData.days_until_due = 7;
        }

        // Step 1: Create the subscription
        const subscription = await stripe.subscriptions.create(subscriptionData);

        // Prepare the response object
        let response = {
            message: "Subscription created successfully.",
            isSuccess: true,
            subscriptionId: subscription.id,
        };

        if (!JSON.parse(isAutoPayment)) {
            console.log("🚀 ~ exports.createCustomerStripeSubscription= ~ !JSON.parse(isAutoPayment):", !JSON.parse(isAutoPayment))
            // Handle Manual Payment Flow
            if (subscription.latest_invoice) {
                let latestInvoice = await stripe.invoices.retrieve(subscription.latest_invoice);

                // Finalize the draft invoice for manual payment
                if (latestInvoice.status === 'draft') {
                    latestInvoice = await stripe.invoices.finalizeInvoice(latestInvoice.id);
                }

                // Send the invoice to the customer
                await stripe.invoices.sendInvoice(latestInvoice.id);

                // If a PaymentIntent exists, retrieve it for the frontend
                if (latestInvoice.payment_intent) {
                    const paymentIntent = await stripe.paymentIntents.retrieve(latestInvoice.payment_intent);
                    response.clientSecret = paymentIntent.client_secret;
                } else {
                    return res.status(400).send({
                        message: "PaymentIntent not found for manual payment.",
                        isSuccess: false,
                    });
                }
            }
        } else {
            // Auto-Payment Flow: Retrieve Client Secret
            if (subscription.latest_invoice && subscription.latest_invoice.payment_intent) {
                response.clientSecret = subscription.latest_invoice.payment_intent.client_secret;
            }
        }

        // Step 4: Send the response
        return res.status(200).send(response);
    } catch (error) {
        // Handle any errors
        console.error("Error creating subscription:", error.message);
        return res.status(500).send({
            error: error.message,
            message: "Something went wrong, please try again.",
            isSuccess: false,
        });
    }
};

exports.webhooks = async (req, res) => {
    try {
        const sigHeader = req.headers['stripe-signature'];
        const payload = req.body; // Raw payload as Buffer

        let event;

        // Verify the webhook signature
        try {
            event = stripe.webhooks.constructEvent(payload, sigHeader, endpointSecret);
        } catch (err) {
            console.error(`⚠️ Webhook signature verification failed: ${err.message}`);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        // Handle Stripe events
        switch (event.type) {
            case 'invoice.created':  // Handle open status when invoice is created
                const invoiceCreated = event.data.object;

                if (invoiceCreated) {
                    const { company, userId, planId } = invoiceCreated?.subscription_details?.metadata;

                    const userDetail = await customerSchema.findOne({ _id: userId });
                    if (!userDetail) {
                        return res.status(500).send({
                            message: "User not found!",
                            isSuccess: false,
                        });
                    }

                    const companyDetail = await companySchema.findOne({ _id: company });
                    const planDetail = await billingPlanSchema.findOne({ _id: planId });

                    if (!companyDetail || !planDetail) {
                        return res.status(500).send({
                            message: "Company or Plan details missing!",
                            isSuccess: false,
                        });
                    }

                    const lastBillingPlan = await billingSchema.findOne({ userId: userDetail._id, isConfirmed: true }).sort({ createdAt: -1 });

                    if (companyDetail?.isFirstTimePayer) {
                        await companySchema.findOneAndUpdate(
                            { _id: companyDetail._id },
                            { isPaymentConfirmed: true }
                        );

                        const billingBody = {
                            userId: userDetail._id,
                            company: companyDetail._id,
                            referenceCode: userDetail.referenceCode,
                            planPrice: planDetail.price,
                            planId: planDetail._id,
                            planFrequency: planDetail.planName,
                            previousReference: lastBillingPlan ? lastBillingPlan._id : null,
                            subscriptionNumber: invoiceCreated?.subscription
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
                    }
                }
                break;

            case 'invoice.payment_succeeded':  // Handle paid status after payment succeeds
                const invoicePaid = event.data.object;

                const subscription = await stripe.subscriptions.retrieve(invoicePaid.subscription);

                // current_period_end represents the timestamp for the next invoice date
                const nextInvoiceTimestamp = subscription.current_period_end;

                // Convert Unix timestamp to a readable date
                const nextInvoiceDate = new Date(nextInvoiceTimestamp * 1000);

                if (invoicePaid) {
                    const { company, userId, planId } = invoicePaid?.subscription_details?.metadata;
                    const userDetail = await customerSchema.findOne({ _id: userId });
                    const companyDetail = await companySchema.findOne({ _id: company });
                    const planDetail = await billingPlanSchema.findOne({ _id: planId });
                    const lastBillingPlan = await billingSchema.findOne({ userId: userDetail._id, isConfirmed: true }).sort({ createdAt: -1 });
                    const billingRenewPlan = await billingSchema.findOne({ userId: userDetail._id }).sort({ createdAt: -1 });

                    if (!userDetail || !companyDetail || !planDetail) {
                        return res.status(500).send({
                            message: "Required data missing",
                            isSuccess: false,
                        });
                    }

                    const subscriptionMetaData = {
                        subscriptionStartDate: new Date(),
                        subscriptionEndDate: nextInvoiceDate,
                        nextPaymentDate: nextInvoiceDate,
                        subscriptionMetaData: {
                            planPrice: billingRenewPlan?.planPrice,
                            planFrequency: billingRenewPlan?.planFrequency,
                            planId: billingRenewPlan?.planId,
                            purchaseConfimedAt: billingRenewPlan?.createdAt,
                        }
                    };

                    await companySchema.findOneAndUpdate(
                        { _id: company },
                        { $set: { isPlanActive: true, ...subscriptionMetaData, isFirstTimePayer: false, isPaymentConfirmed: true } },
                    );

                    const billingBody = {
                        orderNumber: `OD-${uuidv4().replace(/-/g, '').substring(0, 6)}`,
                        subscriptionStartDate: new Date(),
                        subscriptionEndDate: nextInvoiceDate,
                        nextPaymentDate: nextInvoiceDate,
                        isConfirmed: true,
                        confirmedAt: new Date(),
                    };

                    const currentBilling = await billingSchema.findOneAndUpdate(
                        { _id: lastBillingPlan?.nextReference ? lastBillingPlan?.nextReference : billingRenewPlan._id },
                        billingBody
                    );

                    const nextBillingBody = {
                        userId: currentBilling.userId,
                        company: currentBilling.company,
                        referenceCode: currentBilling.referenceCode,
                        planPrice: currentBilling.planPrice,
                        planId: planDetail._id,
                        planFrequency: currentBilling.planFrequency,
                        previousReference: currentBilling._id,
                        subscriptionNumber: currentBilling.subscriptionNumber
                    };

                    const createNextBilling = await billingSchema.create(nextBillingBody);

                    if (createNextBilling) {
                        currentBilling.nextReference = createNextBilling._id;
                        await currentBilling.save();
                    }

                    return res.status(200).send({
                        message: "Subscription renewed successfully.",
                        isSuccess: true,
                    });
                }
                break;

            case 'invoice.payment_failed':  // Handle failed payment
                const invoiceFailed = event.data.object;

                if (invoiceFailed) {
                    const { company } = invoiceFailed?.subscription_details?.metadata;
                    const companyDetail = await companySchema.findOne({ _id: company });

                    if (companyDetail) {
                        await companySchema.findOneAndUpdate(
                            { _id: companyDetail._id },
                            { $set: { isPlanActive: false, isPaymentConfirmed: false } }
                        );

                        return res.status(200).send({
                            message: "Subscription not renewed. Client is not approved or payment confirmation is missing.",
                            isSuccess: true,
                        });
                    }
                }
                break;

            default:
                console.log(`Unhandled event type: ${event.type}`);
                return res.status(400).send({
                    message: `Unhandled event type: ${event.type}`,
                    isSuccess: false,
                });
        }

        res.json({ received: true });
    } catch (error) {
        console.error(`Internal server error: ${error.message}`);
        return res.status(500).send({
            error: error.message,
            message: "Something went wrong, please try again!",
            isSuccess: false,
        });
    }
};
